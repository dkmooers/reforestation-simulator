import { derived, get, writable } from "svelte/store"
import { times, delay, sortBy, take, countBy, last } from "lodash"
import { treeSpecies } from "$lib/treeSpecies";
import type { Run } from "src/types";

let syncWorker: Worker | undefined = undefined;
let syncWorker2: Worker | undefined = undefined;
let syncWorker3: Worker | undefined = undefined;
let syncWorker4: Worker | undefined = undefined;

const handleMessage = (e) => {
  if (e.data.type === 'runData') {
    // console.log(e)
    const runData = e.data.value as Run;
    // console.log('worker 2: RUN DATA RECEIVED:', runData)
    // isRunning.set(false)
    trees.set(runData.trees)
    deadTrees.set(runData.deadTrees)
    yearlyTrees.set(runData.yearlyData.trees)
    yearlyBiodiversity.set(runData.yearlyData.biodiversity)
    yearlyCarbon.set(runData.yearlyData.carbon)
    year.set(runData.yearlyData.carbon.length)

    runs.update(prevRuns => {
      const lastRunId = last(get(runs))?.id || 0
      return [
        ...prevRuns,
        {
          ...runData,
          // id: lastRunId + 1
        }
      ]
    })
    currentRunId.set(runData.id)



  } else if (e.data.type === 'updatedRun') {
    // console.log('updatedRun')

    const updatedRun = e.data.value as Run

    // if this run is not in runs yet, add it
    if (!get(runs).find(run => run.id === updatedRun.id)) {
      runs.update(prevRuns => [...prevRuns, updatedRun])
      currentRunId.set(updatedRun.id)
    }
    else {

      year.set(updatedRun.yearlyData.biodiversity.length)
      yearlyTrees.set(updatedRun.yearlyData.trees)
      yearlyBiodiversity.set(updatedRun.yearlyData.biodiversity)
      yearlyCarbon.set(updatedRun.yearlyData.carbon)
      // carbon.set(last(updatedRun.yearlyData.carbon))

      // only render trees every Nth year step to avoid choking the graphics engine
      if (updatedRun.yearlyData.biodiversity.length % 4 === 0) {
        trees.set(updatedRun.trees)
      }
      // update everything else every single year
      runs.update(prevRuns => prevRuns.map((run, index) => {
        if (run.id === updatedRun.id) {
          return updatedRun
        } else {
          return run
        }
      }))

    }
  } else if (e.data.type === 'success') {
    // isRunning.set(false)

    // KEEP RUNNING WORKERS UNTIL WE GET TO MAX RUNS
    const numRuns = get(runs).length
    const maxRuns = 17
    // ask this worker to do another run if we're not at max runs yet
    if (numRuns < maxRuns) {
      e.srcElement.postMessage({action: 'runSimulation'})
    } else if (numRuns >= maxRuns + 3) {
      isRunning.set(false);
    }
  }
}

export const loadWorker = async () => {

  const SyncWorker = await import('../lib/simulation.worker?worker');
  
  syncWorker = new SyncWorker.default();
  syncWorker.postMessage('ping')
  syncWorker.onmessage = (e) => {
    handleMessage(e)
  }

  syncWorker2 = new SyncWorker.default();
  syncWorker2.onmessage = (e) => {
    handleMessage(e)
  }


  syncWorker3 = new SyncWorker.default();
  syncWorker3.onmessage = (e) => {
    handleMessage(e);
  }

  syncWorker4 = new SyncWorker.default();
  syncWorker4.onmessage = (e) => {
    handleMessage(e);
  }

};

// syncWorkeronmessage = (e) => {
//   console.log('Message received from main script');
//   const workerResult = `Result: ${e.data[0] * e.data[1]}`;
//   console.log('Posting message back to main script');
//   postMessage(workerResult);
// }

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

export const isRunning = writable(false)
export const runs = writable<Run[]>([])
export const currentRunId = writable<number>(0)
export const currentRun = derived(
  [runs, currentRunId],
  ([runs, currentRunId]) => runs.find(run => run.id === currentRunId)
)
export const averageCarbonAcrossRuns = derived(
  runs, 
  runs => runs.reduce((runningTotal, run) => (last(run.yearlyData.carbon) || 0) + runningTotal, 0) / (runs.length || 1)
)
export const runIdWithHighestCarbon = derived(
  runs,
  runs => {
    let maxCarbon = 0
    let maxCarbonRunId = 0
    runs.forEach(run => {
      const carbon = last(run.yearlyData.carbon) || 0
      if (carbon > maxCarbon) {
        maxCarbon = carbon
        maxCarbonRunId = run.id
      }
    })
    return maxCarbonRunId
  }
)
export const runIdWithHighestBiodiversity = derived(
  runs,
  runs => {
    let maxBiodiversity = 0
    let maxBiodiversityRunId = 0
    runs.forEach(run => {
      const biodiversity = last(run.yearlyData.biodiversity) || 0
      if (biodiversity > maxBiodiversity) {
        maxBiodiversity = biodiversity
        maxBiodiversityRunId = run.id
      }
    })
    return maxBiodiversityRunId
  }
)
export const runIdWithHighestScore = derived(
  runs,
  runs => {
    let maxScore = 0
    let maxScoreRunId = 0
    runs.forEach(run => {
      const biodiversity = last(run.yearlyData.biodiversity) || 0
      const carbon = last(run.yearlyData.carbon) || 0
      const score = biodiversity * carbon / 2000
      if (score > maxScore) {
        maxScore = score
        maxScoreRunId = run.id
      }
    })
    return maxScoreRunId
  }
)

// type Run = {
//   id: number
//   yearlyData: {
//     carbon: number[],
//     trees: number[],
//     biodiversity: number[],
//   },
//   trees: Tree[],
//   deadTrees: Tree[],
// }

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
  // [trees, deadTrees],
  // () => {
  //   return calculateCarbon()
  // }
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

const calculateCarbon = () => {
  let carbonSum = 0
  get(trees).forEach(tree => {
    carbonSum += tree.radius * 100
  })
  get(deadTrees).forEach(tree => {
    carbonSum += tree.radius * 100
  })
  return carbonSum 
}

const getRandomTreeSpecies = () => {
  return treeSpecies[Math.floor(Math.random() * treeSpecies.length)]
}

const getTreeSpeciesById = (id: string): TreeSpecies => {
  return treeSpecies.find(species => species.id === id);
}

export const displayRun = (runId: number) => {
  currentRunId.set(runId)
  // load all its data
  loadRun(runId)
}

const loadRun = (runId: number) => {
  const run = get(runs).find(run => run.id === runId)
  if (run) {
    yearlyCarbon.set(run.yearlyData.carbon)
    yearlyTrees.set(run.yearlyData.trees)
    yearlyBiodiversity.set(run.yearlyData.biodiversity)
    trees.set(run.trees)
    deadTrees.set(run.deadTrees)
  }
}

export const reset = (opts?: { initialTrees?: Tree[]} ) => {

  const mostRecentRunId = last(get(runs))?.id || 0
  const newRunId = mostRecentRunId + 1
  // const newRunId = (get(currentRunId) || 0) + 1

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
  yearlyCarbon.set([])
  yearlyTrees.set([])
  yearlyBiodiversity.set([])

  trees.set(opts?.initialTrees ?? [])
  deadTrees.set([])

  year.set(0)
}

export const clearRunHistory = () => {
  runs.set([])
  currentRunId.set(0)
}

// const msPerFrame = 33.33
const msPerFrame = 1
export const elapsedTime = writable(0)

export const runSimulation = () => {

  syncWorker?.postMessage({action: 'runSimulation'})
  syncWorker2?.postMessage({action: 'runSimulation'})
  syncWorker3?.postMessage({action: 'runSimulation'})
  syncWorker4?.postMessage({action: 'runSimulation'})

  // runs.set([])
  isRunning.set(true)
  const startTime = new Date().getTime()
  elapsedTime.set(0)

  // just repeat new runs N times
  // times(5, () => {
    // setTimeout(() => {
      console.log(get(isRunning))

      // run each new scenario
      // times(3, () => {
        // reset()
        // const initialTrees = addNRandomTrees(100)
        // runScenario()

        // re-run this scenario X more times
        // times(2, () => {
        //   reset()
        //   trees.set(initialTrees)
        //   runScenario()
        // })
      // })
    // }, 1000)
  // })


  const endTime = new Date().getTime()
  elapsedTime.set(((endTime - startTime) / 1000).toFixed(1))
}

const runScenario = () => {
  stepNYears(50);
}

export const stepNYears = (numYears: number, currentRunYear: number = 0) => {

  if (get(year) < numYears) {
    delay(() => {
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

      // maybe on each step, write each tree's shade values to a bitmap, a width x height array, and use that to then calculate the amount of shade for each tree.
      // can use a radius-dependent function so there's more shade at the center of a tree, and less at its edges.
      calculateTreeHealth()
      propagateSeeds()

      stepNYears(numYears, currentRunYear - 1)

    }, msPerFrame);
    
  } else {
    // store the run data after the run is over
    runs.update(prevRuns => prevRuns.map(run => {
      if (run.id !== get(currentRunId)) {
        return run;
      }
      return {
        ...run,
        yearlyData: {
          carbon: get(yearlyCarbon),
          trees: get(yearlyTrees),
          biodiversity: get(yearlyBiodiversity),
        },
        trees: get(trees),
        deadTrees: get(deadTrees),
      }
    }))
    isRunning.set(false)

  }


  // times(numYears, (index) => {
  //   // oops, this doesn't dynamicall adjust framerate, it schedules them all at once assuming a constant framerate!
}

export const pruneOverflowTrees = () => {
  trees.update(prevTrees => prevTrees.filter(tree => {
    return !(tree.x < 0 || tree.x > width || tree.y < 0 || tree.y > height)
  }))
}

const calculateTreeHealth = () => {
  // calculate shade map
  const shadeGrid: number[][] = []
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
            const repulsion = 1
            prevTree.x -= normalizedVector.x * repulsion
            prevTree.y -= normalizedVector.y * repulsion
          }
          return prevTree
        }))
      })
    })
  }) 
}

// export const updateTreesTo = (newTrees: Tree[]) => {
//   runs.update(prevRuns => prevRuns.map(run => {
//     if (run.id !== get(currentRunId)) {
//       return run;
//     }
//     return {
//       ...run,
//       trees: newTrees
//     }
//   }))
// }

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

  // while (remainingTreesToPlant > 0) {
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
    // remainingTreesToPlant -= 
  // }
  // return initially planted trees
  return get(trees)

}