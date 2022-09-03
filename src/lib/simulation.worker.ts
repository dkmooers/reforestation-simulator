import { countBy, last, random, sortBy, sum, take, times } from "lodash";
import type { Run, Scenario, Tree, TreeSpecies } from "../types";
// import { numYearsPerRun } from "../stores/store";
// import { treeSpecies } from "./treeSpecies" 
// import type { Run, Scenario, Tree, TreeSpecies } from "../types";
// import { derived, get, writable } from "svelte/store";

// const numYearsPerRun = 100

onmessage = (msg) => {
  const { type, value } = msg.data
  if (type === 'runScenario') {
    reset()
    scenario = value.scenario
    currentRunId = value.id
    treeSpecies = value.treeSpecies
    numYearsPerRun = value.numYearsPerRun
    sendLiveTreeUpdates = value.sendLiveTreeUpdates
    runScenario()
  } else if (type === 'ping') {
    postMessage({ type: 'ready' })
    console.log('Worker ready! 👋');
  }
};

let currentRunId = 0

let treeSpecies: TreeSpecies[] = []
let numYearsPerRun = 0
let yearlyCarbon = [0]
let yearlyTrees = [0]
let yearlyBiodiversity = [0]
let averageBiodiversity = 0
let sendLiveTreeUpdates = false

const width = 612; // 418x258 feet is 1 hectare, or 490x220, or 328x328, 176x612
const height = 176;
const minReproductiveAge = 5; // to account for seedlings being a couple years old already when planted
const growthMultiplier = 1.8; // initially set to 2; 1 results in way slower tree growth and slower runs; not sure what's a realistic number. 1.5 seems like a good compromise of slower speed but still decent run
const seedDistanceMultiplier = 4; // 2 is within the radius of the parent tree
// const minLivingHealth = 0.1;
const maxSeedlings = 2;

let scenario: Scenario
let trees: Tree[] = []
let initialTrees: Tree[] = []
let deadTrees: Tree[] = []
let year = 0


const getBiodiversity = () => {
  const numTrees = trees.length
  // const arrayOfSpeciesCounts = Object.values(numTreesBySpecies).filter(count => count !== 0) // remove zero-counts to avoid driving biodiversity to 0 if one species is not included
  // const scaledArrayOfSpeciesCounts = arrayOfSpeciesCounts.map(count => count / maxSpeciesCount)

  // new flow:
  // get num of trees by species
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
  // square it (optional) - to steepen the curve, and spread out values more (i.e. to weight biodiversity more strongly)
  const biodiversity = Math.pow(invertedSumOfVariances, 2)
  // const biodiversity = invertedSumOfVariances
  return biodiversity
}

// export const biodiversity = derived(
//   trees,
//   trees => {

//     // const numTreesBySpecies = countBy(trees, 'speciesId')
    
//     // const maxSpeciesCount = max(arrayOfSpeciesCounts)
//     // const scaledArrayOfSpeciesCounts = arrayOfSpeciesCounts.map(count => count / maxSpeciesCount)
//     // const rawBiodiversity = scaledArrayOfSpeciesCounts.reduce((acc, o) => acc * o, 1)
//     // // take square root to spread out the curve
//     // const scaledBiodiversity = Math.pow(rawBiodiversity, 0.5)//.toFixed(3)
//     // if (get(year) === numYearsPerRun) {
//     //   console.log(scaledBiodiversity * 100, arrayOfSpeciesCounts, scaledArrayOfSpeciesCounts)
//     // }
//     // return scaledBiodiversity
//   }
// )
// export const fitness = derived(
//   [biodiversity, carbon],
//   ([biodiversity, carbon]) => {
//     return Math.round(Number(biodiversity) * carbon / 2000 / (get(scenario)?.numTrees / 100))
//   }
// )

const getCarbonFromTree = (tree: Tree) => {
  return Math.pow(tree.radius, 2) * 2
}

const calculateCarbon = () => {
  let carbonSum = 0
  trees.forEach(tree => {
    carbonSum += getCarbonFromTree(tree)
  })
  deadTrees.forEach(tree => {
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

  // for (let index = 0; index < Object.keys(treeSpeciesRandomValueThresholds).length; index++) {
  //   // check to see if the random value is in this species bin
  //   const speciesId
  //   const thisSpeciesThreshold = treeSpeciesRandomValueThresholds
    
  // }
  return treeSpecies[speciesIndexChosen ?? 0]

  // simple random species, same chance for each
  // return treeSpecies[Math.floor(Math.random() * treeSpecies.length)]
}

const getTreeSpeciesById = (id: string): TreeSpecies => {
  return treeSpecies.find(species => species.id === id);
}

export const reset = (opts?: { initialTrees?: Tree[]} ) => {
  yearlyCarbon = []
  yearlyTrees = []
  yearlyBiodiversity = []
  averageBiodiversity = 0
  trees = opts?.initialTrees ?? []
  deadTrees = []
  initialTrees = []
  year = 0
}

// const msPerFrame = 33.33
const msPerFrame = 1
export const elapsedTime = 0

const calculateFitness = (): number => {
  averageBiodiversity = sum(yearlyBiodiversity) / yearlyBiodiversity.length
  const biodiversityTimesCarbonTons = averageBiodiversity * last(yearlyCarbon) / 2000
  // console.log(get(biodiversity), get(carbon)/2000, biodiversityTimesCarbonTons)
  // const biodiversityTimesCarbonTons = Math.pow(get(biodiversity), 2) * get(carbon) / 2000
  // const penaltyForTreesPlanted = Math.pow(get(scenario)?.numTrees / 100, 1/3) // cube root of (initial trees planted / 100)
  // const fitnessAdjustedForTreesPlanted = biodiversityTimesCarbonTons / penaltyForTreesPlanted
  // return Math.round(fitnessAdjustedForTreesPlanted) || 0
  return Math.round(biodiversityTimesCarbonTons) || 0
}

const runScenario = () => {
  const newInitialTrees = addNRandomTrees(200)
  initialTrees = newInitialTrees
  stepNYears(numYearsPerRun);
  postMessage({type: 'success'})
}

const getAverageBiodiversity = () => {
  const averageBiodiversity = sum(yearlyBiodiversity) / yearlyBiodiversity.length
  return averageBiodiversity
}

export const stepNYears = (numYears: number, currentRunYear: number = 0) => {

  for (let index = 0; index < numYears; index++) {
    // console.log('step at year:', get(year))

    // const element = array[index];
    

  // if (get(year) < numYears) {
    // delay(() => {
      year++

      // Grow trees
      trees = trees.map((tree, index) => {
        const species = treeSpecies.find(species => species.id === tree.speciesId)
        if (species) {
          // const radius = tree.radius + 1 / (1 + Math.exp(-0.1 * tree.age)) * species?.growthRate * growthMultiplier * tree.sizeMultiplier

          // const radius = tree.radius < species?.maxRadius * tree.sizeMultiplier ? tree.radius + species?.growthRate * growthMultiplier * tree.sizeMultiplier : tree.radius

          // if (index === 0) {
          //   console.log(year, radius)
          // }
          return {
            ...tree,
            // radius: tree.radius + 1 / (1 + Math.exp(-0.1 * tree.age)) * species?.growthRate * growthMultiplier * tree.sizeMultiplier,
            radius: tree.radius < species?.maxRadius * tree.sizeMultiplier ? tree.radius + species?.growthRate * growthMultiplier * tree.sizeMultiplier : tree.radius,
            age: tree.age + 1,
            stemAge: tree.stemAge + 1,
          }
        } else {
          return tree
        }
      })

      const newCarbon = calculateCarbon()

      yearlyCarbon.push(newCarbon)
      yearlyTrees.push(trees.length)
      yearlyBiodiversity.push(getBiodiversity())

      const sendLiveUpdates = true

      if (sendLiveUpdates) {
        const updatedRun: Run = {
          // trees: sendLiveTreeUpdates ? trees : [],
          trees: [],
          deadTrees: [],
          initialTrees: [],
          id: currentRunId,
          yearlyData: {
            carbon: yearlyCarbon,
            trees: yearlyTrees,
            biodiversity: yearlyBiodiversity,
          },
          scenario: scenario,
          fitness: 0,
          isAllocated: true,
          averageBiodiversity: getAverageBiodiversity(),
        }

        postMessage({type: 'updatedRun', value: updatedRun})
      }
      
      // calculate shade + health
      // maybe on each step, write each tree's shade values to a bitmap, a width x height array, and use that to then calculate the amount of shade for each tree.
      // can use a radius-dependent function so there's more shade at the center of a tree, and less at its edges.
      selectivelyHarvestTrees()
      calculateTreeHealth()
      propagateSeeds()

      // stepNYears(numYears, currentRunYear - 1)

    // }, msPerFrame);
    
  // } else {
    }

    // store the run data after the run is over

    // console.log('run complete! attempting to return data...')

    const runData: Run = {
      id: currentRunId,
      yearlyData: {
        carbon: yearlyCarbon,
        trees: yearlyTrees,
        biodiversity: yearlyBiodiversity,
      },
      trees: trees,
      deadTrees: [],
      initialTrees: initialTrees,
      scenario: scenario,
      fitness: calculateFitness(),
      averageBiodiversity: averageBiodiversity,
      isComplete: true,
      isAllocated: true,
    }

    // console.log(get(initialTrees))

    postMessage({type: 'runData', value: runData})

    // return 'Complete'
  }


  // times(numYears, (index) => {
  //   // oops, this doesn't dynamicall adjust framerate, it schedules them all at once assuming a constant framerate!
// }

export const pruneOverflowTrees = () => {
  // console.log('before pruning:', trees.length)
  trees = trees.filter(tree => {
    return !(tree.x < 0 || tree.x > width || tree.y < 0 || tree.y > height)
  })
  // console.log('after pruning:', trees.length)
}

const selectivelyHarvestTrees = () => {

  // coppice trees older than X years, and bigger than Y radius (feet)
  // retain their age, but set radius to 0
  trees = trees.map(tree => {
    const isHarvestable = tree.radius > scenario.coppiceMinRadius
    const shouldHarvestThisTree = Math.random() < scenario.coppiceChance
    if (isHarvestable && shouldHarvestThisTree) {
      deadTrees.push({...tree}) // count the harvested part as sequestered carbon
      return {
        ...tree,
        radius: 0,
        stemAge: 0,
      }
    } else {
      return tree
    }
  })

  // const prevTrees = trees
  // const harvestedTrees = prevTrees.filter()
  // trees.update(trees => trees.map(tree => {
  //   // if above a certain age, harvest at random chance; add to dead trees
  //   if (tree)
  // }).filter(tree => ))
}

const calculateTreeHealth = () => {
  // calculate shade map
  // const shadeGrid: number[][] = []
  // NO, this won't work, b/c for any given tree, we don't want to include its own shade in the shade map... maybe we just subtract its own shade then?
  // OR, we just calculate a local shade map for every tree, by finding overlapping trees... calculating rough size of overlap...
  // then summing the overlaps...
  // let's do the overall shade map approach, and subtract each tree's own shade map from it when evaluating that tree's shade


  // OR WAIT... can we just naively get all overlapping trees, calculate the radius diff, and approximate the overlap?


  // trees.forEach(tree => {
  //   // 
  // })


  const newTrees = trees.map(baseTree => {
    // 
    const overlappingTrees = getOverlappingTreesForTree(baseTree);
    // calculate overlaps
    let totalOverlapArea = 0;
    const treesThatActuallyShadeThisOne = overlappingTrees.filter(overlappingTree => {
      return overlappingTree.stemAge > 0.75 * baseTree.stemAge
    })
    treesThatActuallyShadeThisOne.forEach(overlappingTree => {
      // get distance
      const distance = getDistanceBetweenTwoTrees(baseTree, overlappingTree)
      const triangleSideLength = overlappingTree.radius + baseTree.radius - distance
      totalOverlapArea += 0.433 * (triangleSideLength * triangleSideLength) * 2
    })
    const baseTreeArea = Math.PI * baseTree.radius * baseTree.radius
    const shadeFraction = Math.min(1, totalOverlapArea / baseTreeArea)

    const species = treeSpecies.find(species => species.id === baseTree.speciesId)
    let health = baseTree.health
    if (shadeFraction > species?.shadeTolerance) {
      // adjust this for age - the older it is, the less affected by shade it will be due to being taller
      health -= (shadeFraction - species?.shadeTolerance) / Math.pow(baseTree.stemAge, 0.8) * 0.8
    } else {
      // health += Math.abs(shadeFraction - species?.shadeTolerance)
      health += 0.3
      health = Math.min(1, health)
    }

    return {
      ...baseTree,
      health,
      isDead: health < 0 || baseTree.stemAge > species.lifespan
    }
  });

  const newlyDeadTrees = newTrees.filter(tree => tree.isDead)
  const livingTrees = newTrees.filter(tree => !tree.isDead)

  trees = livingTrees
  deadTrees = [...deadTrees, ...newlyDeadTrees]
}

export const propagateSeeds = () => {
  const seedlings: Tree[] = []
  trees.forEach(tree => {
    // send out random number of seedlings
    if (tree.stemAge >= random(minReproductiveAge, minReproductiveAge + 3)) {
      times(Math.round(Math.random() * maxSeedlings * Math.sqrt(tree.stemAge) / 3), () => {
        seedlings.push({
          ...tree,
          age: 0,
          stemAge: 0,
          radius: 0,
          x: tree.x + (Math.random() - 0.5) * seedDistanceMultiplier * tree.radius,
          y: tree.y + (Math.random() - 0.5) * seedDistanceMultiplier * tree.radius,
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

const getNearestTreesForTree = (baseTree: Tree): Array<Tree & { distance: number }> => {
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
  return take(sortBy(treesByDistance, 'distance'), 2).filter(tree => tree.distance < 50)
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
  times(2, () => {
    const currentTrees = trees
    currentTrees.forEach(baseTree => {
      const nearestTrees = getNearestTreesForTree(baseTree)
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
            const repulsion = getMatureOverlapBetweenTwoTrees(nearTree, baseTree) * 0.1//get(scenario)?.declusteringStrength
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

  let remainingTreesToPlant = numTrees - trees.length

  const newTrees: Tree[] = [];
  for (let index = 0; index < remainingTreesToPlant; index++) {
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
      // sizeMultiplier: Math.random() / 2 + 0.5,
    })
  }
  trees = [...trees, ...newTrees]
  declusterTrees()
  if (remainingTreesToPlant > 0) {
    addNRandomTrees(remainingTreesToPlant)
  }

  return trees
}





export {};