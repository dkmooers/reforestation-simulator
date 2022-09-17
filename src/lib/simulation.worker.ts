import { delay, last, random, sortBy, sum, take, times } from "lodash";
import type { Run, Scenario, Tree, TreeSpecies } from "../types";
import { createShadeMap, recalculateShadeMapWithTrees } from "./shadeMap";

let pauseQueue: Array<{
  fn: Function,
  args?: any
}> = []

let isPaused = false

let currentRunId = 0
let enableSelectiveHarvesting = true
let useFastShadeCalculation = true
let treeSpecies: TreeSpecies[] = []
let numYearsPerRun = 0
let yearlyCarbon = [0]
let yearlyTrees = [0]
let yearlyBiodiversity = [0]
let yearlyFood = [0]
let averageBiodiversity = 0
let sendLiveTreeUpdates = false

// 1 acre: 112x392 feet
// 1 hectare: 612x176 feet, or 418x258, or 490x220, or 328x328, 
const width = 392
const height = 112
const minReproductiveAge = 5 // to account for seedlings being a couple years old already when planted
const minCoppiceAge = 15
let growthMultiplier = 3 // decreasing this slows the simulation down dramatically because of an increased number of trees - to avoid this, we'd have to decrease the seeding rate in tandem
const seedScatterDistanceMultiplier = 4 // 2 is within the radius of the parent tree
const seedDensity = 0.5
const minFoodProducingCanopyRadius = 6 // feet

let deadTreeCarbon = 0
let foodTonsHarvested = 0

let scenario: Scenario
let deadTrees: Tree[] = []
let trees: Tree[] = []
let initialTrees: Tree[] = []
let year = 0

const shadeMap = createShadeMap(width, height)

onmessage = (msg) => {
  const { type, value } = msg.data
  if (type === 'runScenario') {
    reset()
    scenario = value.scenario
    currentRunId = value.id
    treeSpecies = value.treeSpecies
    numYearsPerRun = value.numYearsPerRun
    sendLiveTreeUpdates = value.sendLiveTreeUpdates
    enableSelectiveHarvesting = value.enableSelectiveHarvesting
    runScenario()
  } else if (type === 'resume') {
    isPaused = false
    pauseQueue?.forEach(({fn, args}) => fn(args))
    pauseQueue = []
  } else if (type === 'ping') {
    postMessage({ type: 'ready' })
    console.log('Worker ready! 👋');
  } else if (type === 'reset') {
    reset()
  } else if (type === 'pause') {
    console.log('paused')
    isPaused = true
  }
};

const getBiodiversity = () => {
  const numTrees = trees.length
  // TODO instead get biomass of each species for biodiversity calc
  const numTreesBySpecies = treeSpecies.map(species => {
    return trees.filter(tree => tree.speciesId === species.id).length
  })
  // divide each by nTrees
  const scaledTreesBySpecies = numTreesBySpecies.map(num => num / numTrees)
  // get ideal avg (1/nSpecies)
  const targetScaledNumTreesPerSpecies = 1 / treeSpecies.length
  // get variances from avg (abs)
  const absVariancesFromTarget = scaledTreesBySpecies.map(num => Math.abs(num - targetScaledNumTreesPerSpecies))
  // sum variances
  const sumOfVariancesFromTarget = sum(absVariancesFromTarget)
  // invert it => 1 / (sum + 1)
  const invertedSumOfVariances = 1 / (sumOfVariancesFromTarget + 1)
  // take it to an exponent (optional) to steepen the curve, and spread out values more (i.e. to weight biodiversity more strongly)
  const biodiversity = Math.pow(invertedSumOfVariances, 1.5)
  // const biodiversity = invertedSumOfVariances
  return biodiversity
}

// This is a placeholder carbon calculation for prototyping purposes - should be replaced at some point with a more physically accurate DBH-based calculation.
const getCarbonFromTree = (tree: Tree) => {
  return Math.pow(tree.radius, 3) * 0.75 / 2000 // multiply by empirical scalar to get in the ballpark of actual forest carbon sequestration rates, then convert to tons
}

const calculateCarbon = () => {
  let carbonSum = deadTreeCarbon
  trees.forEach(tree => {
    carbonSum += getCarbonFromTree(tree)
  })
  return carbonSum 
}

const getRandomTreeSpecies = () => {

  // we're basically making a comparator here to find which tree species probability bin this random number goes into,
  // where the bins are sized according to the species probabilities defined in the random scenario generation
  const speciesProbabilities = scenario.speciesProbabilities

  let runningTotal = 0
  const treeSpeciesRandomValueThresholds = speciesProbabilities.map(probability => {
    // each number is the cutoff for that tree species
    runningTotal += probability
    return runningTotal
  })

  // pick a random one
  let speciesIndexChosen: number | undefined

  const randomValue = Math.random()
  treeSpeciesRandomValueThresholds.forEach((threshold, index) => {
    if (speciesIndexChosen === undefined) {
      if (randomValue < threshold) {
        speciesIndexChosen = index
      }
    }
  })

  return treeSpecies[speciesIndexChosen ?? 0]
  // simple random species, same chance for each
  // return treeSpecies[Math.floor(Math.random() * treeSpecies.length)]
}

const getTreeSpeciesById = (id: string): TreeSpecies => {
  return treeSpecies.find(species => species.id === id) as TreeSpecies;
}

export const reset = (opts?: { initialTrees?: Tree[]} ) => {
  isPaused = false
  yearlyCarbon = []
  yearlyTrees = []
  yearlyBiodiversity = []
  averageBiodiversity = 0
  trees = opts?.initialTrees ?? []
  deadTrees = []
  initialTrees = []
  year = 0
  deadTreeCarbon = 0
  foodTonsHarvested = 0
}

// const msPerFrame = 33.33
const msPerFrame = 1
export const elapsedTime = 0

const calculateFitness = (): number => {
  averageBiodiversity = sum(yearlyBiodiversity) / yearlyBiodiversity.length
  const biodiversityTimesCarbonTons = averageBiodiversity * last(yearlyCarbon)
  const fitness = biodiversityTimesCarbonTons * Math.pow(foodTonsHarvested, 0.5) / 10
  // const biodiversityTimesCarbonTons = Math.pow(get(biodiversity), 2) * get(carbon) / 2000
  // const penaltyForTreesPlanted = Math.pow(get(scenario)?.numTrees / 100, 1/3) // cube root of (initial trees planted / 100)
  // const fitnessAdjustedForTreesPlanted = biodiversityTimesCarbonTons / penaltyForTreesPlanted
  // return Math.round(fitnessAdjustedForTreesPlanted) || 0
  return Math.round(fitness) || 0
}

const runScenario = () => {
  isPaused = false
  const newInitialTrees = addNRandomTrees(200)
  initialTrees = newInitialTrees
  stepNYears(numYearsPerRun);
  postMessage({type: 'success'})
}

const getAverageBiodiversity = () => {
  const averageBiodiversity = sum(yearlyBiodiversity) / yearlyBiodiversity.length
  return averageBiodiversity
}

export const stepOneYear = () => {
  year++
    
  if (enableSelectiveHarvesting) {
    selectivelyHarvestTrees()
  }
  harvestFood()

  if (!useFastShadeCalculation) {
    recalculateShadeMapWithTrees(shadeMap, trees)
  }

  calculateTreeHealth()
  propagateSeeds()

  const newCarbon = calculateCarbon()

  yearlyCarbon.push(newCarbon)
  yearlyTrees.push(trees.length)
  yearlyBiodiversity.push(getBiodiversity())
  yearlyFood.push(foodTonsHarvested)

  const updatedRun: Run = {
    // trees,
    trees: sendLiveTreeUpdates ? trees : [],
    // trees: [],
    deadTrees: [],
    initialTrees: [],
    id: currentRunId,
    yearlyData: getYearlyData(),
    carbon: last(yearlyCarbon),
    food: foodTonsHarvested,
    scenario: scenario,
    fitness: 0,
    isAllocated: true,
    averageBiodiversity: getAverageBiodiversity(),
  }

  postMessage({type: 'updatedRun', value: updatedRun})
}

const step = () => {
  if (sendLiveTreeUpdates) { // slow down the simulation if running in live tree-growth showcase mode
    delay(() => {
      stepOneYear()
      stepNYears(numYearsPerRun)
    }, 66)
  } else {
    delay(() => {
      stepOneYear()
      stepNYears(numYearsPerRun)
    }, 0)
  }
}

const getYearlyData = () => {
  return {
    carbon: yearlyCarbon,
    trees: yearlyTrees,
    biodiversity: yearlyBiodiversity,
    food: yearlyFood,
  }
}

export const stepNYears = (numYears: number) => {

  if (year < numYears) {
    // put next step on pauseQueue if we're paused, otherwise continue to run
    if (isPaused) { 
      pauseQueue.push({fn: step})
    } else {
      step()
    }
  }
  else {

  const runData: Run = {
    id: currentRunId,
    yearlyData: getYearlyData(),
    trees: trees,
    deadTrees: [],
    initialTrees: initialTrees,
    scenario: scenario,
    fitness: calculateFitness(),
    carbon: last(yearlyCarbon) || 0,
    averageBiodiversity: averageBiodiversity,
    food: foodTonsHarvested,
    isComplete: true,
    isAllocated: true,
  }

  postMessage({type: 'runData', value: runData})
  }
}


export const pruneOverflowTrees = () => {
  trees = trees.filter(tree => {
    return !(tree.x < 0 || tree.x > width || tree.y < 0 || tree.y > height)
  })
}

const selectivelyHarvestTrees = () => {
  // coppice trees older than X years, and bigger than Y radius (feet)
  // retain their age, but set radius to 0

  // find eligible trees
  const eligibleTrees = trees.filter(tree => tree.radius >= scenario.coppiceMinRadius)

  let numTreesToHarvest = Math.floor(eligibleTrees.length * scenario.coppiceChance)
  trees = trees.map(tree => {
    if (numTreesToHarvest > 0) {
      const isHarvestableSize = tree.radius >= scenario.coppiceMinRadius && tree.radius <= scenario.coppiceMinRadius + scenario.coppiceRadiusSpread
      const isHarvestableAge = tree.stemAge >= minCoppiceAge
      const species = getTreeSpeciesById(tree.speciesId)
      let isHarvestableSpecies = true
      // const isSpeciesFoodProducing = !!species.foodProductivity
      // if (isSpeciesFoodProducing && !scenario.coppiceFoodTrees) {
      //   isHarvestableSpecies = false
      // }
      if (isHarvestableSize && isHarvestableAge && isHarvestableSpecies) {
        const nearestTree = getNearestNTreesForTree(tree, 1)?.[0]
        if (nearestTree) {
          const isCrowded = nearestTree?.distance < tree.radius / 4
          if (isCrowded) {
            numTreesToHarvest--
            deadTreeCarbon += getCarbonFromTree(tree)
            return {
              ...tree,
              radius: 0,
              stemAge: 0,
            }
          } 
        }
      }
    }
    return tree
  })
}

const harvestFood = () => {
  trees.forEach(tree => {
    const species = treeSpecies.find(species => species.id === tree.speciesId) as TreeSpecies
    if (species.foodProductivity) {
      const adjustedRadius = Math.max(tree.radius - minFoodProducingCanopyRadius, 0)
      const foodPoundsHarvested = species.foodProductivity * Math.pow(adjustedRadius, 2)
      foodTonsHarvested += foodPoundsHarvested / 2000
    }
  })
}

const calculateTreeHealth = () => {
  // calculate shade + health
  // maybe on each step, write each tree's shade values to a bitmap, a width x height array, and use that to then calculate the amount of shade for each tree.
  // can use a radius-dependent function so there's more shade at the center of a tree, and less at its edges.
  // const shadeGrid: number[][] = []
  // NO, this won't work, b/c for any given tree, we don't want to include its own shade in the shade map... maybe we just subtract its own shade then?
  // OR, we just calculate a local shade map for every tree, by finding overlapping trees... calculating rough size of overlap...
  // then summing the overlaps...

  const newTrees = trees.map(baseTree => {
    
    let shadeIntensity: number

    // OLD SHADE CALCULATION
    if (useFastShadeCalculation) {
      const overlappingTrees = getOverlappingTreesForTree(baseTree);
      // calculate overlaps
      let totalOverlapArea = 0;
      const treesThatActuallyShadeThisOne = overlappingTrees.filter(overlappingTree => {
        return overlappingTree.stemAge > 0.75 * baseTree.stemAge
      })
      treesThatActuallyShadeThisOne.forEach(overlappingTree => {
        const distance = getDistanceBetweenTwoTrees(baseTree, overlappingTree)
        const triangleSideLength = overlappingTree.radius + baseTree.radius - distance
        totalOverlapArea += 0.433 * (triangleSideLength * triangleSideLength) * 2
      })
      const baseTreeArea = Math.PI * baseTree.radius * baseTree.radius
      shadeIntensity = Math.min(1, totalOverlapArea / baseTreeArea || 0)
    } else {
      shadeIntensity = 1 - baseTree.currentSunIntensity
    }

    // shadeIntensity = Math.min(1, shadeIntensity + 0.2)

    const species = treeSpecies.find(species => species.id === baseTree.speciesId) as TreeSpecies
    let health = baseTree.health
    if (shadeIntensity > species.shadeTolerance) {
      // adjust this for age - the older it is, the less affected by shade it will be due to being taller
      // if (baseTree.stemAge < 10 && shadeIntensity > 0.6) {
      //   // Don't penalize seedlings for shading, since they will receive mycorrhizal delivery of nutrients and energy from parent trees that are shading them
      if (useFastShadeCalculation) {
        health -= (shadeIntensity - species?.shadeTolerance) / Math.pow(baseTree.stemAge, 0.3) * 0.1
      } else {
        health -= Math.pow(shadeIntensity - species?.shadeTolerance, 2) / Math.pow(baseTree.stemAge, 0.3) * 1
      }
    } else {
      // health = 1
      health += Math.pow(species.shadeTolerance - shadeIntensity, 0.25) // steepen the curve here - trees should retain health very quickly after sun is restored
      // health = Math.min(1, health)
    }

    // calculate tree growth based on shade fraction
    const radius = baseTree.radius < species?.maxRadius * baseTree.sizeMultiplier ? baseTree.radius + species?.growthRate * growthMultiplier * baseTree.sizeMultiplier * (1 - shadeIntensity) : baseTree.radius

    return {
      ...baseTree,
      health,
      // radius: Math.min(radius, species.maxRadius), // optimize this to not calculate the radius change if we're already at max radius
      // radius: tree.radius + 1 / (1 + Math.exp(-0.1 * tree.age)) * species?.growthRate * growthMultiplier * tree.sizeMultiplier,
      radius,
      age: baseTree.age + 1,
      stemAge: baseTree.stemAge + 1,
      isDead: health < 0 || baseTree.stemAge > species.lifespan
    }
  });

  const newlyDeadTrees = newTrees.filter(tree => tree.isDead)
  // console.log(newlyDeadTrees.length)
  const livingTrees = newTrees.filter(tree => !tree.isDead)

  trees = livingTrees
  // sum carbon from dead trees and bank it - no reason to store all the dead trees in an array, we don't need them anymore
  const newDeadCarbon = sum(newlyDeadTrees.map(tree => getCarbonFromTree(tree)))
  deadTreeCarbon += newDeadCarbon
}

export const propagateSeeds = () => {
  const seedlings: Tree[] = []
  trees.forEach(tree => {
    // send out random number of seedlings
    if (tree.stemAge >= random(minReproductiveAge, minReproductiveAge + 3)) {
      times(Math.round(Math.random() * seedDensity * Math.sqrt(tree.stemAge) / 3), () => {
        seedlings.push({
          ...tree,
          age: 0,
          stemAge: 0,
          radius: 0,
          x: tree.x + (Math.random() - 0.5) * seedScatterDistanceMultiplier * tree.radius,
          y: tree.y + (Math.random() - 0.5) * seedScatterDistanceMultiplier * tree.radius,
        })
      })
    }
  })
  trees = [...trees, ...seedlings]
  pruneOverflowTrees()
}

const getDistanceBetweenTwoTrees = (tree1: Tree, tree2: Tree) => {
  const xDistance = tree1.x - tree2.x
  const yDistance = tree1.y - tree2.y
  const distance = Math.round(Math.sqrt(xDistance * xDistance + yDistance * yDistance))
  return distance
}

const getOverlappingTreesForTree = (baseTree: Tree) => {
  const overlappingTrees = trees.filter(tree => {
    if (tree === baseTree) { // skip this tree
      return false
    }
    const distance = getDistanceBetweenTwoTrees(baseTree, tree)
    return distance < baseTree.radius + tree.radius
  })
  return overlappingTrees
}

const getNearestNTreesForTree = (baseTree: Tree, numTrees: number): Array<Tree & { distance: number }> => {
  const treesByDistance = trees.map(tree => {
    if (tree === baseTree) { // skip this tree
      return false
    }
    const distance = getDistanceBetweenTwoTrees(baseTree, tree)
    return {
      ...tree,
      distance,
    }
  })
  return take(sortBy(treesByDistance, 'distance'), numTrees).filter(tree => tree.distance < 50)
}

const getMatureOverlapBetweenTwoTrees = (tree1: Tree, tree2: Tree) => {
  const distanceOnCenter = getDistanceBetweenTwoTrees(tree1, tree2)
  // get species of each tree, and find the max radius of each
  const species1 = getTreeSpeciesById(tree1.speciesId)
  const species2 = getTreeSpeciesById(tree2.speciesId)
  const overlapAtMaturity = species1.maxRadius + species2.maxRadius - distanceOnCenter
  return overlapAtMaturity
}

const areAnyOverlappingTrees = () => {
  return trees.some(baseTree => {
    return getOverlappingTreesForTree(baseTree).length > 0
  })
}

export const declusterTrees = () => {
  times(3, () => {

    const currentTrees = trees

    currentTrees.forEach(baseTree => {
      const nearestTrees = getNearestNTreesForTree(baseTree, 3)
            
      // for each neartree... move this one in the opposite direction
      nearestTrees.forEach(nearTree => {
        trees = trees.map(prevTree => {
          if (prevTree === baseTree) {

            // first figure out if the trees will overlap at max age
            // find direction vector toward nearTree
            const vector = {
              x: nearTree.x - prevTree.x,
              y: nearTree.y - prevTree.y
            }
            const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
            const normalizedVector = {
              x: vector.x / magnitude,
              y: vector.y / magnitude
            }
            // move away from nearTree
            // the repulsion strength should be based on the overlap amount at the final mature tree size - we don't need to repulse tiny trees that will not be overlapping at mature size, for instance.
            // const repulsion = 1
            const repulsion = getMatureOverlapBetweenTwoTrees(nearTree, baseTree) * 0.1 //get(scenario)?.declusteringStrength
            // console.log(Ma)
            // const repulsion = 0.1
            if (repulsion > 0) {
              // const repulsion = getTreeSpeciesById(near)
              prevTree.x -= normalizedVector.x * repulsion
              prevTree.y -= normalizedVector.y * repulsion
            }
          }
          return prevTree
        })
      })
    })
    pruneOverflowTrees()
  }) 
}

export const calculateOverlaps = () => {
  while (areAnyOverlappingTrees()) {
    trees.forEach(baseTree => {
      const overlappingTrees = getOverlappingTreesForTree(baseTree)
      // for each neartree... move this one in the opposite direction
      overlappingTrees.forEach(overlappingTree => {

        const updatedTrees = trees.map(prevTree => {
          if (prevTree === baseTree) {
            // find direction vector toward nearTree
            const vector = {
              x: overlappingTree.x - prevTree.x,
              y: overlappingTree.y - prevTree.y
            }
            const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
            const normalizedVector = {
              x: vector.x / magnitude,
              y: vector.y / magnitude
            }
            // move away from nearTree
            const repulsion = 1
            prevTree.x -= normalizedVector.x * repulsion
            prevTree.y -= normalizedVector.y * repulsion
          }
          return prevTree
        })

        if (updatedTrees) {
          trees = updatedTrees
        }

      })
    })
    pruneOverflowTrees()
  }
}

export const addNRandomTrees = (numTrees: number): Tree[] => {

  // let remainingTreesToPlant = numTrees - trees.length

  const newTrees: Tree[] = [];
  
  // 

  for (let index = 0; index < numTrees; index++) {

    const species = getRandomTreeSpecies();

    newTrees.push({
      speciesId: species.id,
      color: species.color,
      x: Math.random() * width,
      y: Math.random() * height,
      health: 1,
      radius: 0,
      age: 0,
      stemAge: 0,
      sizeMultiplier: 1,
      currentSunIntensity: 0,
    })

  }
  trees = [...trees, ...newTrees]

  declusterTrees()

  const minTreesPerAcre = 100

  if (trees.length < minTreesPerAcre) {
    addNRandomTrees(minTreesPerAcre - trees.length)
  }

  return trees
}

export {};