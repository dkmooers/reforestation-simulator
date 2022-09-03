import { derived, get, writable } from "svelte/store"
import { times, delay, sortBy, take, countBy, last, reverse, first, sum, random, update, without } from "lodash"
import { treeSpecies } from "$lib/treeSpecies";
import SimulationWorker from '../lib/simulation.worker?worker'
// import type { Run, Scenario, Tree, TreeSpecies } from "../types";
import { getRandomArrayElement, getRandomId } from "$lib/helpers";
import type { Run, Scenario } from "../types";

let useMultithreading = true
const numWorkers = 3
let workers: Worker[] = []
const numWorkersReady = writable(0)
export const allWorkersReady = derived(
  numWorkersReady,
  numWorkersReady => numWorkersReady === numWorkers
)
export const bestRun = writable<Run>()
export const numYearsPerRun = 100
export const maxRounds = 20
export const populationSize = 20
const numElites = 2
const preserveEliteRunData = true // if true, don't re-run elite scenarios in the next round - re-use their tree growth run data and fitness from previous round
const crossoverFraction = 0.7
const randomFraction = 0.1
const mutationStrength = 0.2
export const fitnessImprovement = writable(0)
export const currentRound = writable(0)
export const rounds = writable<Run[][]>([])
export const roundIndexViewedInTable = writable(0)
export const bestFitnessByRound = derived(
  rounds,
  rounds => rounds.map(runs => last(sortBy(runs, 'fitness'))?.fitness || 0)
)

const pauseQueue: Array<{
  fn: Function,
  args: any
}> = []

const handleMessage = (e) => {
  if (e.data.type === 'runData') {
    // console.log(e)
    const runData = e.data.value as Run;
    // console.log('worker 2: RUN DATA RECEIVED:', runData)
    // isRunning.set(false)
    trees.set(runData.trees)
    deadTrees.set(runData.deadTrees)
    initialTrees.set(runData.initialTrees)
    yearlyTrees.set(runData.yearlyData.trees)
    yearlyBiodiversity.set(runData.yearlyData.biodiversity)
    yearlyCarbon.set(runData.yearlyData.carbon)
    year.set(runData.yearlyData.carbon.length)

    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === runData.id) {
        // console.log(runData.id)
        return runData
      } else {
        return run
      }
    }))

    displayRun(runData.id)

    // KEEP RUNNING WORKERS UNTIL WE GET TO MAX RUNS
    const numUnallocatedRuns = get(runs).filter(run => !run.isAllocated)?.length
    const numUnfinishedRuns = get(runs).filter(run => !run.isComplete)?.length
    // ask this worker to do another run if there are any unallocated runs waiting to be run
    // if paused, put next items in a queue to be run on unpause
    if (!get(isRunning)) {
      pauseQueue.push({fn: dispatchNextRunToWorker, args: e.srcElement})
    }
    else if (numUnallocatedRuns > 0) {
      dispatchNextRunToWorker(e.srcElement)
    } else if (numUnfinishedRuns === 0) {
      attemptToRunNextRound()
    }
  } else if (e.data.type === 'updatedRun') {
    // console.log('updatedRun')

    const updatedRun = e.data.value as Run

    // if this run is not in runs yet, add it
    // if (!get(runs).find(run => run.id === updatedRun.id)) {
    //   runs.update(prevRuns => [...prevRuns, updatedRun])
    //   // currentRunId.set(updatedRun.id)
    // }
    // else {

    // update tree graphics every year if we're not using web workers / multiple threads at once
    if (!useMultithreading) {
      year.set(updatedRun.yearlyData.biodiversity.length)
      yearlyTrees.set(updatedRun.yearlyData.trees)
      yearlyBiodiversity.set(updatedRun.yearlyData.biodiversity)
      yearlyCarbon.set(updatedRun.yearlyData.carbon)
      // only render trees every Nth year step to avoid choking the graphics engine
      if (updatedRun.yearlyData.carbon.length % 4 === 0) {
        trees.set(updatedRun.trees)
      }
    }
    
    // update everything else every single year
    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === updatedRun.id) {
        // console.log(updatedRun.id)

        // live-update trees if run data is sending them
        // only render trees every Nth year step to avoid choking the graphics engine
        // if (updatedRun.trees.length && updatedRun.yearlyData.carbon.length % 5 === 0) {
        //   trees.set(updatedRun.trees)
        // }

        return updatedRun
      } else {
        return run
      }
    }))
    // }
  } 
  else if (e.data.type === 'ready') {
    // log this worker as ready
    numWorkersReady.update(num => num + 1)
  }
  // else if (e.data.type === 'success') {
  //   // KEEP RUNNING WORKERS UNTIL WE GET TO MAX RUNS
  //   const numUnallocatedRuns = get(runs).filter(run => !run.isAllocated)?.length
  //   // ask this worker to do another run if there are any unallocated runs waiting to be run
  //   if (numUnallocatedRuns > 0) {
  //     dispatchNextRunToWorker(e.srcElement)
  //   } else if (numUnallocatedRuns === 0) {
  //     attemptToRunNextRound()
  //   }
  // }
}

export const loadWorkers = async () => {
  // clear previous sync workers
  // TODO should we destroy them instead of just nulling the array?
  workers = []
  // create N workers
  times(numWorkers, () => {
    // const worker = new Worker(new URL('../lib/simulation.worker.ts', import.meta.url))
    const worker = new SimulationWorker()
    worker.postMessage({type: 'ping'})
    worker.onmessage = (e) => {
      handleMessage(e)
    }
    workers.push(worker)
  })
};

// const scenarios = writable<Scenario[]>([])
// const currentScenario = derived(
//   scenarios,
//   scenarios => last(scenarios)
// )

export const isRunning = writable(false)
export const runs = writable<Run[]>([])

export const progressPercent = derived(
  [rounds, runs],
  ([rounds, runs]) => {
    const completedRounds = rounds.length
    const baseCompletedFraction = completedRounds / maxRounds
    const completedRunsThisRound = runs.filter(run => run.isComplete)?.length || 0
    const thisRoundAdditionToCompletedFraction = completedRunsThisRound / populationSize / maxRounds
    return (baseCompletedFraction + thisRoundAdditionToCompletedFraction) * 100
  }
)

// export const population = writable<Run[]>([])

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
export const runIdWithHighestFitness = derived(
  runs,
  runs => {
    let maxFitness = 0
    let maxFitnessRunId = 0
    runs.forEach(run => {
      // const biodiversity = last(run.yearlyData.biodiversity) || 0
      // const carbon = last(run.yearlyData.carbon) || 0
      // const score = biodiversity * carbon / 2000
      
      if (run.fitness > maxFitness) {
        maxFitness = run.fitness
        maxFitnessRunId = run.id
      }
    })
    return maxFitnessRunId
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
export const initialTrees = writable<Tree[]>([])
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

const getEmptyRun = (): Run => ({
  id: getRandomId(),
  yearlyData: {
    carbon: [0],
    trees: [0],
    biodiversity: [0],
  },
  trees: [],
  deadTrees: [],
  scenario: generateScenario(),
  fitness: 0,
})

export const reset = (opts?: { initialTrees?: Tree[]} ) => {

  const mostRecentRunId = last(get(runs))?.id || 0
  const newRunId = mostRecentRunId + 1
  rounds.set([])
  currentRound.set(0)
  // const newRunId = (get(currentRunId) || 0) + 1

  runs.update(prevRuns => [...prevRuns, getEmptyRun()])

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

const normalizeSpeciesProbabilities = (probabilities: number[]) => {
  const sumOfSpeciesProbabilities = sum(probabilities)
  const normalizedSpeciesProbabilities = probabilities.map(probability => {
    return probability / sumOfSpeciesProbabilities
  })
  return normalizedSpeciesProbabilities
}

const generateScenario = (): Scenario => {
  const speciesProbabilities = treeSpecies.map((species) => {
    return Math.max(0, Number((Math.random() * 1.2 - 0.2).toFixed(2)))
  })

  return {
    speciesProbabilities: normalizeSpeciesProbabilities(speciesProbabilities),
    numTrees: random(100, 200),
    declusteringStrength: Number(Math.random().toFixed(2)),
    coppiceChance: random(0, 0.1),
    coppiceMinRadius: random(5, 25)
  }
}

const createInitialPopulation = (): Scenario[] => {
  return new Array(populationSize).fill(null).map(o => {
    return generateScenario()
  })
}

const dispatchNextRunToWorker = (worker: Worker, opts?: { sendLiveTreeUpdates?: boolean }) => {
  const firstUnallocatedRun = first(get(runs).filter(run => !run.isAllocated))
  if (firstUnallocatedRun) {
    worker.postMessage({type: 'runScenario', value: {
      scenario: firstUnallocatedRun.scenario,
      id: firstUnallocatedRun.id,
      treeSpecies, // send this because importing it inside the worker was causing circular build errors
      numYearsPerRun, // send this because importing it inside the worker was causing circular build errors
      sendLiveTreeUpdates: opts?.sendLiveTreeUpdates,
    }})
    runs.update(prevRuns => prevRuns.map(run => {
      if (run.id !== firstUnallocatedRun.id) {
        return run
      } else {
        return {
          ...run,
          isAllocated: true
        }
      }
    }))
  }
}

const runPopulation = () => {
  // send a message to each worker to start going on a run (the instructions to continue after that come from handleMessage func)
  workers.forEach(worker => {
    // only send live tree updates for the very first run that's dispatched
    const sendLiveTreeUpdates = get(currentRound) === 1 && get(runs).filter(run => run.isAllocated).length === 0 
    dispatchNextRunToWorker(worker, { sendLiveTreeUpdates })
  })
}

// const evaluatePopulation = () => {
//   // this is already done by each worker, which evaluates the individual's fitness after it's done running
// }

const areStopConditionsMet = () => {
  return false
}

const generateCrossoverFromParents = (parent1: Run, parent2: Run): Scenario => {
  // combine randomly
  const scenario1 = parent1.scenario
  const scenario2 = parent2.scenario
  let child: Scenario = { ...scenario1 }
  without(Object.keys(child), 'speciesProbabilities').forEach(prop => {
    child[prop] = getRandomArrayElement([scenario1, scenario2])[prop]
  })
  // child.declusteringStrength = getRandomArrayElement([scenario1, scenario2]).declusteringStrength
  // child.numTrees = getRandomArrayElement([scenario1, scenario2]).numTrees
  child.speciesProbabilities = normalizeSpeciesProbabilities(scenario1.speciesProbabilities.map((probability, index) => {
    return getRandomArrayElement([scenario1, scenario2]).speciesProbabilities[index]
  }))

  // do random mutations?
  child = generateMutantFromParent(child)

  // child.coppiceChance = getRandomArrayElement([scenario1, scenario2]).coppiceChance
  return child as Scenario
}

const getRandomMutationMultiplier = () => {

  // simple linear mutation, 0.8 - 1.2:
  // return Math.random() * (mutationStrength * 2) + (1 - mutationStrength)

  // use cubic function to make smaller mutations more likely, and larger mutations less likely
  // for random 0-1, returns random 0-2 but with cubic curve
  // increase exponent to make it more likely to get smaller mutations (needs to be odd though)
  return Math.pow((Math.random() - 0.5) * 2, 3) + 1
}

const generateMutantFromParent = (parent: Scenario): Scenario => {
  // const parentScenario = parent.scenario
  const mutant = {
    ...parent
  }
  // randomly mutate all numerical properties (not speciesProbabilities which is an array)
  without(Object.keys(mutant), 'speciesProbabilities').forEach(prop => {
    mutant[prop] *= getRandomMutationMultiplier()
  })
  mutant.speciesProbabilities = normalizeSpeciesProbabilities(mutant.speciesProbabilities.map(probability => (
    probability * getRandomMutationMultiplier()
  )))
  return mutant
}

const selectRandomParentByFitness = () => {
  // we use a cube root function to preferentially choose higher-fitness parents
  const randomRunIndex = Math.floor(Math.pow(Math.random(), 1/3) * populationSize)
  return sortBy(get(runs), 'fitness')[randomRunIndex] // sortBy sorts in ascending order
}

const selectNewPopulation = () => {

  let newRunPartials: Partial<Run>[] = []

  if (get(currentRound) === 1) {
    newRunPartials = createInitialPopulation().map(scenario => ({scenario}))
  } else {
    // select elites and move them to next generation
    const elites = take(reverse(sortBy(get(runs), 'fitness')), numElites)
    if (preserveEliteRunData) {
      elites.forEach(elite => newRunPartials.push(elite))
    } else {
      elites.forEach(elite => newRunPartials.push({scenario: elite.scenario}))
    }
    // set current run ID to top elite
    currentRunId.set(elites[0].id)

    // pure random search
    // times(populationSize - numElites, () => {
    //   newRunPartials.push({
    //     scenario: generateScenario()
    //   })
    // })
    
    // generate crossovers and add to next generation
    // const numCrossovers = populationSize - numElites
    const numCrossovers = Math.floor((populationSize - numElites) * crossoverFraction)
    times(numCrossovers, () => {
      newRunPartials.push({
        scenario: generateCrossoverFromParents(
          selectRandomParentByFitness(),
          selectRandomParentByFitness()
        )})
    })

    // create random new individual once per generation to keep things fresh
    const numRandomNewIndividuals = Math.floor((populationSize - numElites) * randomFraction)
    times(numRandomNewIndividuals, () => {
      newRunPartials.push({scenario: generateScenario()})
    })

    // generation mutations and add to next generation
    const numMutants = populationSize - numElites - numCrossovers - numRandomNewIndividuals
    times(numMutants, () => {
      const randomParent = getRandomArrayElement(elites)
      // const randomParent = selectRandomParentByFitness()
      newRunPartials.push({scenario: generateMutantFromParent(randomParent.scenario)})
    })
  }

  const newRuns = newRunPartials.map(run => {
    return {
      ...getEmptyRun(),
      ...run,
    } as Run
  })

  runs.set(newRuns)
}

const completeSimulation = () => {
  console.log('complete simulation!')
  isRunning.set(false);
  window.postMessage({type: 'runFinished'})
  currentRunId.set(get(runIdWithHighestFitness))
}

const attemptToRunNextRound = () => {

  const bestRunInLastRound = last(sortBy(get(runs), 'fitness'))
  if (bestRunInLastRound?.fitness && bestRunInLastRound.fitness > (get(bestRun)?.fitness ?? 0)) {
    bestRun.set(bestRunInLastRound)
  }

  // save last round
  const lastRound = get(runs)
  if (lastRound.length) {
    rounds.update(prevRounds => [...prevRounds, lastRound])
  }

  // update overall fitness improvement %
  if (get(rounds).length > 1) {
    const firstRoundMaxFitness = last(sortBy(first(get(rounds)), 'fitness'))?.fitness
    const lastRoundMaxFitness = last(sortBy(last(get(rounds)), 'fitness'))?.fitness
    if (firstRoundMaxFitness && lastRoundMaxFitness) {
      fitnessImprovement.set(lastRoundMaxFitness / firstRoundMaxFitness)
    }
  }

  if (get(currentRound) >= maxRounds || areStopConditionsMet()) {
    completeSimulation()
  } else {
    currentRound.update(round => round + 1)
    roundIndexViewedInTable.set(get(currentRound) - 1)
    // console.log('running round', get(currentRound))
    selectNewPopulation()
    runPopulation()
  }
}

export const runSimulation = () => {

  if (get(currentRound) > 0) {
    isRunning.update(prevRunning => !prevRunning)

    // if we're restarting, run queued items from last time the run was paused
    if (get(isRunning)) {
      if (get(runs).filter(run => !run.isComplete).length === 0) {
        attemptToRunNextRound()
      } else {
        pauseQueue?.forEach(({fn, args}) => fn(args))
      }
    }

  } else {
    currentRound.set(0)
    isRunning.set(true)
    const startTime = new Date().getTime()
    elapsedTime.set(0)
    attemptToRunNextRound()

    // just repeat new runs N times
    // times(5, () => {
      // setTimeout(() => {
        // console.log(get(isRunning))

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


}

// const runScenario = () => {
//   stepNYears(50);
// }

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