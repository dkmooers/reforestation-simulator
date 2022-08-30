import { countBy, delay, last, random, rest, sortBy, take, times } from "lodash";
import { numYearsPerRun } from "../stores/store";
import type { Run, Scenario, Tree, TreeSpecies } from "src/types";
import { derived, get, writable } from "svelte/store";
import { treeSpecies } from "./treeSpecies";

onmessage = (msg) => {
  // console.log('Hello World 👋');
  // console.log(msg.data)
  const { action, value } = msg.data
  if (action === 'runScenario') {
    reset()
    scenario.set(value.scenario)
    currentRunId.set(value.id)
    runScenario()
  } else if (action === 'ping') {
    console.log('Worker ready! 👋');
  }
  // if (msg.data)
};

export const isRunning = writable(false)
export const currentRunId = writable<number>(0)

export const yearlyCarbon = writable([0])
export const yearlyTrees = writable([0])
export const yearlyBiodiversity = writable([0])

const width = 612; // 418x258 feet is 1 hectare, or 490x220, or 328x328, 176x612
const height = 176;
const minReproductiveAge = 10;
const growthMultiplier = 2;
const seedDistanceMultiplier = 4; // 2 is within the radius of the parent tree
// const minLivingHealth = 0.1;
const maxSeedlings = 2;

export const scenario = writable<Scenario>()
export const trees = writable<Tree[]>([])
export const numSpecies = derived(
  trees,
  trees => Object.keys(countBy(trees, 'speciesId'))?.length || 0
)
const deadTrees = writable<Tree[]>([])
export const year = writable(0);
export const carbon = derived(
  yearlyCarbon,
  yearlyCarbon => last(yearlyCarbon) ?? 0
)
export const biodiversity = derived(
  trees,
  trees => {
    const numTreesBySpecies = countBy(trees, 'speciesId')
    const numTrees = trees.length
    const arrayOfSpeciesCounts = Object.keys(numTreesBySpecies).map(key => numTreesBySpecies[key])
    const scaledArrayOfSpeciesCounts = arrayOfSpeciesCounts.map(count => count / numTrees)
    const rawBiodiversity = scaledArrayOfSpeciesCounts.reduce((acc, o) => acc * o, 1)
    // return Math.log(Math.log(1 - rawBiodiversity + 1.718) + 1.718)
    return Math.pow(1 - rawBiodiversity, 500)//.toFixed(3)
  }
)
// export const fitness = derived(
//   [biodiversity, carbon],
//   ([biodiversity, carbon]) => {
//     return Math.round(Number(biodiversity) * carbon / 2000 / (get(scenario)?.numTrees / 100))
//   }
// )

const getCarbonFromTree = (tree: Tree) => {
  return Math.pow(tree.radius, 2) * 10
}

const calculateCarbon = () => {
  let carbonSum = 0
  get(trees).forEach(tree => {
    carbonSum += getCarbonFromTree(tree)
  })
  get(deadTrees).forEach(tree => {
    carbonSum += getCarbonFromTree(tree)
  })
  return carbonSum 
}

const getRandomTreeSpecies = () => {

  // we're basically making a comparator here to find which tree species probability bin this random number goes into,
  // where the bins are sized according to the species probabilities defined in the random scenario generation
  const speciesProbabilities = get(scenario).speciesProbabilities

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
  yearlyCarbon.set([])
  yearlyTrees.set([])
  yearlyBiodiversity.set([])
  trees.set(opts?.initialTrees ?? [])
  deadTrees.set([])
  year.set(0)
}

// const msPerFrame = 33.33
const msPerFrame = 1
export const elapsedTime = writable(0)

const calculateFitness = (): number => {
  const biodiversityTimesCarbonTons = Math.pow(get(biodiversity), 2) * get(carbon) / 2000
  const penaltyForTreesPlanted = Math.pow(get(scenario)?.numTrees / 100, 1/3) // cube root of (initial trees planted / 100)
  const fitnessAdjustedForTreesPlanted = biodiversityTimesCarbonTons / penaltyForTreesPlanted
  return Math.round(fitnessAdjustedForTreesPlanted)
}

const runScenario = () => {
  const initialTrees = addNRandomTrees(get(scenario)?.numTrees)
  stepNYears(numYearsPerRun);
  postMessage({type: 'success'})
}

export const stepNYears = (numYears: number, currentRunYear: number = 0) => {

  for (let index = 0; index < numYears; index++) {
    // console.log('step at year:', get(year))

    // const element = array[index];
    

  // if (get(year) < numYears) {
    // delay(() => {
      year.update(prevYear => prevYear + 1);
      trees.update(prevTrees => prevTrees.map(tree => {
        const species = treeSpecies.find(species => species.id === tree.speciesId)
        if (species) {
          return {
            ...tree,
            radius: tree.radius < species?.maxRadius * tree.sizeMultiplier ? tree.radius + species?.growthRate * growthMultiplier * tree.sizeMultiplier : tree.radius,
            age: tree.age + 1,
          }
        } else {
          return tree
        }
      }))
      // calculate shade + health

      const newCarbon = calculateCarbon()

      yearlyCarbon.update(data => [...data, newCarbon])
      yearlyTrees.update(data => [...data, get(trees).length])
      yearlyBiodiversity.update(data => [...data, get(biodiversity)])


      const sendLiveUpdates = true

      if (sendLiveUpdates) {
        const updatedRun: Run = {
          // trees: get(trees),
          trees: [],
          deadTrees: [],
          // deadTrees: get(deadTrees),
          id: get(currentRunId),
          yearlyData: {
            carbon: get(yearlyCarbon),
            trees: get(yearlyTrees),
            biodiversity: get(yearlyBiodiversity),
          },
          scenario: get(scenario),
          fitness: 0,
          isAllocated: true,
          // scenario: get(scenario),
        }

        postMessage({type: 'updatedRun', value: updatedRun})
      }
      

      // maybe on each step, write each tree's shade values to a bitmap, a width x height array, and use that to then calculate the amount of shade for each tree.
      // can use a radius-dependent function so there's more shade at the center of a tree, and less at its edges.
      calculateTreeHealth()
      propagateSeeds()

      // stepNYears(numYears, currentRunYear - 1)

    // }, msPerFrame);
    
  // } else {
    }

    // store the run data after the run is over

    // console.log('run complete! attempting to return data...')

    const runData: Run = {
      id: get(currentRunId),
      yearlyData: {
        carbon: get(yearlyCarbon),
        trees: get(yearlyTrees),
        biodiversity: get(yearlyBiodiversity),
      },
      trees: get(trees),
      deadTrees: get(deadTrees),
      scenario: get(scenario),
      fitness: calculateFitness(),
      isComplete: true,
      isAllocated: true,
    }

    postMessage({type: 'runData', value: runData})

    // return 'Complete'
  }


  // times(numYears, (index) => {
  //   // oops, this doesn't dynamicall adjust framerate, it schedules them all at once assuming a constant framerate!
// }

export const pruneOverflowTrees = () => {
  trees.update(prevTrees => prevTrees.filter(tree => {
    return !(tree.x < 0 || tree.x > width || tree.y < 0 || tree.y > height)
  }))
}

const calculateTreeHealth = () => {
  // calculate shade map
  // const shadeGrid: number[][] = []
  // NO, this won't work, b/c for any given tree, we don't want to include its own shade in the shade map... maybe we just subtract its own shade then?
  // OR, we just calculate a local shade map for every tree, by finding overlapping trees... calculating rough size of overlap...
  // then summing the overlaps...
  // let's do the overall shade map approach, and subtract each tree's own shade map from it when evaluating that tree's shade


  // OR WAIT... can we just naively get all overlapping trees, calculate the radius diff, and approximate the overlap?


  // get(trees).forEach(tree => {
  //   // 
  // })

  const prevTrees = get(trees)

  const newTrees = prevTrees.map(baseTree => {
    // 
    const overlappingTrees = getOverlappingTreesForTree(baseTree);
    // calculate overlaps
    let totalOverlapArea = 0;
    const treesThatActuallyShadeThisOne = overlappingTrees.filter(overlappingTree => {
      return overlappingTree.age > 0.75 * baseTree.age
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
      // need to adjust this for age - the older it is, the less affected by shade it will be due to being taller
      health -= (shadeFraction - species?.shadeTolerance) / Math.pow(baseTree.age, 0.8)
    } else {
      health += 0.3
      health = Math.min(1, health)
    }

    return {
      ...baseTree,
      health,
      isDead: health < 0 || baseTree.age > species.lifespan
    }
  });

  const newlyDeadTrees = newTrees.filter(tree => tree.isDead)
  const livingTrees = newTrees.filter(tree => !tree.isDead)

  trees.set(livingTrees)
  deadTrees.update(prevDeadTrees => [...prevDeadTrees, ...newlyDeadTrees])
}

// filter out dead trees
export const propagateSeeds = () => {
  const seedlings: Tree[] = []
  trees.update(prevTrees => {
    prevTrees.forEach(tree => {
      // send out random number of seedlings
      if (tree.age >= minReproductiveAge) {
        times(Math.round(Math.random() * maxSeedlings * Math.sqrt(tree.age) / 3), () => {
          seedlings.push({
            ...tree,
            age: 0,
            radius: 0,
            x: tree.x + (Math.random() - 0.5) * seedDistanceMultiplier * tree.radius,
            y: tree.y + (Math.random() - 0.5) * seedDistanceMultiplier * tree.radius,
          })
        })
      }
    })
    return [...prevTrees, ...seedlings]
  })
  pruneOverflowTrees()
}

const getDistanceBetweenTwoTrees = (tree1: Tree, tree2: Tree) => {
  const xDistance = tree1.x - tree2.x
  const yDistance = tree1.y - tree2.y
  const distance = Math.round(Math.sqrt(xDistance * xDistance + yDistance * yDistance))
  return distance
}

const getOverlappingTreesForTree = (baseTree: Tree) => {
  const overlappingTrees = get(trees).filter(tree => {
    if (tree === baseTree) { // skip this tree
      return false
    }
    const distance = getDistanceBetweenTwoTrees(baseTree, tree)
    return distance < baseTree.radius + tree.radius
  })
  return overlappingTrees
}

const getNearestTreesForTree = (baseTree: Tree): Array<Tree & { distance: number }> => {
  const treesByDistance = get(trees).map(tree => {
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
  return get(trees).some(baseTree => {
    return getOverlappingTreesForTree(baseTree).length > 0
  })
}

export const declusterTrees = () => {
  times(50, () => {
    const currentTrees = get(trees)
    currentTrees.forEach(baseTree => {
      const nearestTrees = getNearestTreesForTree(baseTree)
      // for each neartree... move this one in the opposite direction
      nearestTrees.forEach(nearTree => {
        trees.update(prevTrees => prevTrees.map(prevTree => {
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
            const repulsion = getMatureOverlapBetweenTwoTrees(nearTree, baseTree) * get(scenario)?.declusteringStrength
            if (repulsion > 0) {
              // const repulsion = getTreeSpeciesById(near)
              prevTree.x -= normalizedVector.x * repulsion
              prevTree.y -= normalizedVector.y * repulsion
            }
          }
          return prevTree
        }))
      })
    })
  }) 
}

export const calculateOverlaps = () => {
  while (areAnyOverlappingTrees()) {
    const currentTrees = get(currentRun)?.trees
    currentTrees?.forEach(baseTree => {
      const overlappingTrees = getOverlappingTreesForTree(baseTree)
      // for each neartree... move this one in the opposite direction
      overlappingTrees.forEach(overlappingTree => {

        const updatedTrees = get(currentRun)?.trees?.map(prevTree => {
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
          trees.set(updatedTrees)
        }

      })
    })
    pruneOverflowTrees()
  }
}

export const addNRandomTrees = (numTrees: number): Tree[] => {

  let remainingTreesToPlant = numTrees - get(trees).length

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
      sizeMultiplier: Math.random() / 2 + 0.5,
    })
  }
  trees.update(prevTrees => [...prevTrees, ...newTrees])
  declusterTrees()
  if (remainingTreesToPlant > 0) {
    addNRandomTrees(remainingTreesToPlant)
  }

  return get(trees)
}





export {};