import { derived, get, writable } from "svelte/store"
import { times, delay, sortBy, take, countBy, last } from "lodash"

type Tree = {
  x: number
  y: number
  radius: number
  speciesId: string
  color: string
  age: number
  sizeMultiplier: number
  health: number // 0 to 1
  isDead?: boolean
}

type TreeSpecies = {
  id: string
  color: string
  growthRate: number
  maxRadius: number
  shadeTolerance: number // 0 to 1
  lifespan: number
}

const treeSpecies: TreeSpecies[] = [
  {
    id: 'oak',
    color: 'red',
    growthRate: 1,
    maxRadius: 100,
    shadeTolerance: 0.4,
    lifespan: 200,
  },
  {
    id: 'maple',
    color: 'rebeccapurple',
    growthRate: 1.5,
    maxRadius: 80,
    shadeTolerance: 0.45,
    lifespan: 400,
  },
  {
    id: 'linden',
    color: 'green',
    growthRate: 0.6,
    maxRadius: 80,
    shadeTolerance: 0.5,
    lifespan: 150,
  },
  {
    id: 'hickory',
    color: 'teal',
    growthRate: 0.8,
    maxRadius: 60,
    shadeTolerance: 0.5,
    lifespan: 500,
  },
  {
    id: 'hazel',
    color: 'blue',
    growthRate: 0.8,
    maxRadius: 15,
    shadeTolerance: 0.65,
    lifespan: 80,
  }
]

type Scenario = {
  speciesProbabilities: Array<{
    id: string
    probability: number
  }>
  id: string // randomly generated
}

const scenarios = writable<Scenario[]>([])
const currentScenario = derived(
  scenarios,
  scenarios => last(scenarios)
)

export const runs = writable<Run[]>([])
export const currentRunId = writable<number>(0)
export const currentRun = derived(
  [runs, currentRunId],
  ([runs, currentRunId]) => runs.find(run => run.id === currentRunId)
)
// export const livingTrees = derived(
//   currentRun,
//   currentRun => currentRun?.trees?.filter(tree => !tree.isDead) || []
// )

type Run = {
  id: number
  yearlyData: {
    carbon: number[],
    trees: number[],
    biodiversity: number[],
  },
  trees: Tree[],
  deadTrees: Tree[],
}

const width = 490; // 418x258 feet is 1 hectare, or 490x220, or 328x328
const height = 220;
const minReproductiveAge = 10;
const growthMultiplier = 2;
const seedDistanceMultiplier = 4; // 2 is within the radius of the parent tree
// const minLivingHealth = 0.1;
const maxSeedlings = 2;

// export const trees = writable<Tree[]>([])
export const numSpecies = derived(
  currentRun,
  currentRun => Object.keys(countBy(currentRun?.trees, 'speciesId'))?.length || 0
)
// const deadTrees = writable<Tree[]>([])
export const year = writable(0);
export const carbon = derived(
  currentRun,
  () => {
    return calculateCarbon()
  }
)
export const biodiversity = derived(
  currentRun,
  currentRun => {
    if (!currentRun) {
      return 0
    }
    const numTreesBySpecies = countBy(currentRun.trees, 'speciesId')
    const numTrees = currentRun.trees.length
    const arrayOfSpeciesCounts = Object.keys(numTreesBySpecies).map(key => numTreesBySpecies[key])
    const scaledArrayOfSpeciesCounts = arrayOfSpeciesCounts.map(count => count / numTrees)
    const rawBiodiversity = scaledArrayOfSpeciesCounts.reduce((acc, o) => acc * o, 1)
    // return Math.log(Math.log(1 - rawBiodiversity + 1.718) + 1.718)
    return Math.pow(1 - rawBiodiversity, 500).toFixed(3)
  }
)

const calculateCarbon = () => {
  let carbonSum = 0
  get(currentRun)?.trees.forEach(tree => {
    carbonSum += tree.radius * 100
  })
  get(currentRun)?.deadTrees.forEach(tree => {
    carbonSum += tree.radius * 100
  })
  return carbonSum 
}

const getRandomTreeSpecies = () => {
  return treeSpecies[Math.floor(Math.random() * treeSpecies.length)]
}

const getTreeSpeciesById = (id: string): TreeSpecies | undefined => {
  return treeSpecies.find(species => species.id === id);
}

export const displayRun = (runId: number) => {
  currentRunId.set(runId)
}

export const reset = () => {

  // if (get(currentRunId) > 0) {
  //   runs.update(prevRuns => [...prevRuns, get(currentRun)])
  // }
  const newRunId = (get(currentRunId) || 0) + 1

  runs.update(prevRuns => [...prevRuns, {
    id: newRunId,
    yearlyData: {
      carbon: [0],
      trees: [0],
      biodiversity: [0],
    },
    trees: [],
    deadTrees: [],
  }])
  currentRunId.set(newRunId)
  year.set(0)
}

const msPerFrame = 33.33
// const msPerFrame = 1
export const elapsedTime = writable(0)

export const run = () => {
  const startTime = new Date().getTime()
  elapsedTime.set(0)
  reset();
  addNRandomTrees(100);
  stepNYears(100);
  const endTime = new Date().getTime()
  elapsedTime.set(((endTime - startTime) / 1000).toFixed(1))
}

export const stepNYears = (numYears: number) => {
  times(numYears, (index) => {
    delay(() => {
      year.update(prevYear => prevYear + 1);
      const prevTrees = get(currentRun)?.trees || [];
      updateTreesTo(prevTrees.map(tree => {
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

      runs.update(prevRuns => prevRuns.map(run => {
        if (run.id !== get(currentRunId)) {
          return run;
        }
        return {
          ...run,
          yearlyData: {
            carbon: [...run.yearlyData.carbon, newCarbon],
            trees: [...run.yearlyData.trees, get(currentRun)?.trees?.length || 0],
            biodiversity: [...run.yearlyData.biodiversity, 1]
          }
        }
      }))

      // maybe on each step, write each tree's shade values to a bitmap, a width x height array, and use that to then calculate the amount of shade for each tree.
      // can use a radius-dependent function so there's more shade at the center of a tree, and less at its edges.
      calculateTreeHealth()
      propagateSeeds()

    }, msPerFrame * (index + 1), index);
  })
}

export const pruneOverflowTrees = () => {
  updateTreesTo(get(currentRun)?.trees.filter(tree => {
    return !(tree.x < 0 || tree.x > width || tree.y < 0 || tree.y > height)
  }) || [])
}

const calculateTreeHealth = () => {
  // calculate shade map
  const shadeGrid: number[][] = []
  // NO, this won't work, b/c for any given tree, we don't want to include its own shade in the shade map... maybe we just subtract its own shade then?
  // OR, we just calculate a local shade map for every tree, by finding overlapping trees... calculating rough size of overlap...
  // then summing the overlaps...
  // let's do the overall shade map approach, and subtract each tree's own shade map from it when evaluating that tree's shade


  // OR WAIT... can we just naively get all overlapping trees, calculate the radius diff, and approximate the overlap?

  const newTrees = get(currentRun)?.trees?.map(baseTree => {
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
  }) || [];

  // updateTreesTo(newTrees || [])

  const newlyDeadTrees = newTrees.filter(tree => tree.isDead)
  const livingTrees = newTrees.filter(tree => !tree.isDead)

  updateTreesTo(livingTrees)
  updateDeadTreesTo([...get(currentRun)?.deadTrees || [], ...newlyDeadTrees])
}

// filter out dead trees
export const propagateSeeds = () => {
  const seedlings: Tree[] = []

  get(currentRun)?.trees?.forEach(tree => {
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
  updateTreesTo([...get(currentRun)?.trees || [], ...seedlings])
  pruneOverflowTrees()
}

const getDistanceBetweenTwoTrees = (tree1: Tree, tree2: Tree) => {
  const xDistance = tree1.x - tree2.x
  const yDistance = tree1.y - tree2.y
  const distance = Math.round(Math.sqrt(xDistance * xDistance + yDistance * yDistance))
  return distance
}

const getOverlappingTreesForTree = (baseTree: Tree) => {
  const overlappingTrees = get(currentRun)?.trees.filter(tree => {
    if (tree === baseTree) { // skip this tree
      return false
    }
    const distance = getDistanceBetweenTwoTrees(baseTree, tree)
    return distance < baseTree.radius + tree.radius
  })
  return overlappingTrees || []
}

const getNearestTreesForTree = (baseTree: Tree): Array<Tree & { distance: number }> => {
  const treesByDistance = get(currentRun)?.trees.map(tree => {
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

const areAnyOverlappingTrees = () => {
  return get(currentRun)?.trees.some(baseTree => {
    return getOverlappingTreesForTree(baseTree).length > 0
  })
}

export const declusterTrees = () => {
  times(50, () => {
    const currentTrees = get(currentRun)?.trees
    currentTrees?.forEach(baseTree => {
      const nearestTrees = getNearestTreesForTree(baseTree)
      // for each neartree... move this one in the opposite direction
      nearestTrees.forEach(nearTree => {

        updateTreesTo(get(currentRun)?.trees?.map(tree => {
          if (tree === baseTree) {
            // find direction vector toward nearTree
            const vector = {
              x: nearTree.x - tree.x,
              y: nearTree.y - tree.y
            }
            const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
            const normalizedVector = {
              x: vector.x / magnitude,
              y: vector.y / magnitude
            }
            // move away from nearTree
            const repulsion = 1
            tree.x -= normalizedVector.x * repulsion
            tree.y -= normalizedVector.y * repulsion
          }
          return tree
        }) || [])


      })
    })
  }) 
}

export const updateTreesTo = (newTrees: Tree[]) => {
  runs.update(prevRuns => prevRuns.map(run => {
    if (run.id !== get(currentRunId)) {
      return run;
    }
    return {
      ...run,
      trees: newTrees
    }
  }))
}

export const updateDeadTreesTo = (newDeadTrees: Tree[]) => {
  runs.update(prevRuns => prevRuns.map(run => {
    if (run.id !== get(currentRunId)) {
      return run;
    }
    return {
      ...run,
      trees: newDeadTrees
    }
  }))
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
          updateTreesTo(updatedTrees)
        }

      })
    })
    pruneOverflowTrees()
  }
}

export const addNRandomTrees = (numTrees: number) => {
  const newTrees: Tree[] = [];
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
      sizeMultiplier: Math.random() / 2 + 0.5,
    })
  }
  updateTreesTo([...get(currentRun)?.trees || [], ...newTrees])
  declusterTrees()
}