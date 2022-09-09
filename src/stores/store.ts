import { derived, get, writable } from "svelte/store"
import { times, sortBy, take, countBy, last, reverse, first, sum, random, without } from "lodash"
import { treeSpecies } from "$lib/treeSpecies";
import SimulationWorker from '../lib/simulation.worker?worker'
import { getRandomArrayElement, getRandomId } from "$lib/helpers";
import type { Run, Scenario, Tree } from "../types";

export const useMultithreading = writable(true) // disable this and set workers to 1 to show live tree updates during growth
const numWorkers = derived(
  useMultithreading,
  useMultithreading => {
    return useMultithreading ? 3 : 1
  }
)
let workers: Worker[] = []
const numWorkersReady = writable(0)
export const allWorkersReady = derived(
  [numWorkers, numWorkersReady],
  ([numWorkers, numWorkersReady])  => numWorkersReady >= numWorkers
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
export const enableSelectiveHarvesting = writable(true)

const pauseQueue: Array<{
  fn: Function,
  args: any
}> = []

const handleMessage = (e) => {
  if (e.data.type === 'runData') {
    const runData = e.data.value as Run;
    // trees.set(runData.trees)
    // deadTrees.set(runData.deadTrees)
    // initialTrees.set(runData.initialTrees)
    // yearlyTrees.set(runData.yearlyData.trees)
    // yearlyBiodiversity.set(runData.yearlyData.biodiversity)
    // yearlyCarbon.set(runData.yearlyData.carbon)
    // year.set(runData.yearlyData.carbon.length)

    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === runData.id) {
        // console.log(runData.id)
        return runData
      } else {
        return run
      }
    }))

    updateFitnessImprovement()

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

    const updatedRun = e.data.value as Run

    // update tree graphics every year if we're not using web workers / multiple threads at once
    if (!get(useMultithreading)) {
      currentRunId.set(updatedRun.id)
      // displayRun(updated)
      year.set(updatedRun.yearlyData.biodiversity.length)
      yearlyTrees.set(updatedRun.yearlyData.trees)
      yearlyBiodiversity.set(updatedRun.yearlyData.biodiversity)
      yearlyCarbon.set(updatedRun.yearlyData.carbon)
      // only render trees every Nth year step to avoid choking the graphics engine
      // if (updatedRun.yearlyData.carbon.length % 4 === 0) {
        trees.set(updatedRun.trees)
      // }
    }
    
    // update everything else every single year

    // trees.set(updatedRun.trees)
    // currentRunId.set(updatedRun.id)

    // if (!get(runs).find(run => run.id === updatedRun.id)) {
    //   runs.update(runs => [...runs, updatedRun])
    // } else {

    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === updatedRun.id) {

        // if (!useMultithreading) {
        //   console.log('setting trees...')
        //   trees.set(updatedRun.trees)
        //   year.set(updatedRun.yearlyData.carbon.length)
        // }
        // live-update trees if run data is sending them
        // only render trees every Nth year step to avoid choking the graphics engine
        // if (updatedRun.trees.length && updatedRun.yearlyData.carbon.length % 5 === 0) {
          // trees.set(updatedRun.trees)
          // year.set(updatedRun.yearlyData.carbon.length)
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
}

export const loadWorkers = async () => {
  console.log('loadWorkers')
  // clear previous workers
  // workers.forEach(worker => {
  //   worker.terminate()
  // })
  numWorkersReady.set(0)
  workers = []
  // create N workers
  times(get(numWorkers), () => {
    // const worker = new Worker(new URL('../lib/simulation.worker.ts', import.meta.url))
    const worker = new SimulationWorker()
    worker.postMessage({type: 'ping'})
    worker.onmessage = (e) => {
      handleMessage(e)
    }
    workers.push(worker)
  })
};

export const isRunning = writable(false)
export const isPaused = writable(false)
export const isComplete = writable(false)
export const runs = writable<Run[]>([])

export const progressPercentOverall = derived(
  [rounds, runs],
  ([rounds, runs]) => {
    const completedRounds = rounds.length
    const baseCompletedFraction = completedRounds / maxRounds
    const completedRunsThisRound = runs.filter(run => run.isComplete)?.length || 0
    const thisRoundAdditionToCompletedFraction = completedRunsThisRound / populationSize / maxRounds
    // const inProgressRunsAdditionToCompletedFraction = sum(runs.filter(run => run.isAllocated && !run.isComplete).map(run => run.yearlyData.carbon.length)) / (populationSize * numYearsPerRun)
    return (baseCompletedFraction + thisRoundAdditionToCompletedFraction) * 100
  }
)

export const progressPercentThisGeneration = derived(
  runs,
  runs => {    
    return sum(runs.map(run => run.yearlyData.carbon.length)) / (populationSize * numYearsPerRun) * 100
  }
)

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

export const yearlyCarbon = writable([0])
export const yearlyTrees = writable([0])
export const yearlyBiodiversity = writable([0])

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
    year.set(run.yearlyData.carbon.length)
    // deadTrees.set(run.deadTrees)
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

  isPaused.set(false)
  isComplete.set(false)
  isRunning.set(false)
  const mostRecentRunId = last(get(runs))?.id || 0
  const newRunId = mostRecentRunId + 1
  rounds.set([])
  currentRound.set(0)
  fitnessImprovement.set(0)
  workers.forEach(worker => {
    worker.postMessage({type: 'reset'})
  })

  runs.update(prevRuns => [...prevRuns, getEmptyRun()])

  currentRunId.set(newRunId)
  yearlyCarbon.set([])
  yearlyTrees.set([])
  yearlyBiodiversity.set([])

  trees.set(opts?.initialTrees ?? [])
  deadTrees.set([])

  year.set(0)
  clearRunHistory()
}

export const clearRunHistory = () => {
  runs.set([])
  currentRunId.set(0)
}

const msPerFrame = 1
const startTime = writable(0)
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
    coppiceChance: random(0, 0.2),
    coppiceMinRadius: random(8, 20),
    coppiceRadiusSpread: random(5, 20), // The difference between coppiceMinRadius and the max harvestable radius (defined this way instead of defining a max radius, because with mutation and crossover, that could result in a max radius that's lower than the min radius)
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
      sendLiveTreeUpdates: !get(useMultithreading),// opts?.sendLiveTreeUpdates,
      enableSelectiveHarvesting: get(enableSelectiveHarvesting),
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
  if (get(useMultithreading)) {
    workers.forEach(worker => {
      dispatchNextRunToWorker(worker)
    })
  } else {
    dispatchNextRunToWorker(workers[0])
  }
}

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
  child.speciesProbabilities = normalizeSpeciesProbabilities(scenario1.speciesProbabilities.map((probability, index) => {
    return getRandomArrayElement([scenario1, scenario2]).speciesProbabilities[index]
  }))

  // do random mutations on crossover children
  // if (Math.random() < 0.25) {
    child = generateMutantFromParent(child)
  // }

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
  const mutant = {
    ...parent
  }
  // randomly mutate all numerical properties (not speciesProbabilities which is an array)
  without(Object.keys(mutant), 'speciesProbabilities').forEach(prop => {
    mutant[prop] *= getRandomMutationMultiplier()
    // cap coppice chance at 1 (100%)
    if (prop === 'coppiceChance') {
      mutant[prop] = Math.min(1, mutant[prop])
    }
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

    // testing pure random search instead of genetic algorithm
    // times(populationSize - numElites, () => {
    //   newRunPartials.push({
    //     scenario: generateScenario()
    //   })
    // })
    
    // generate crossovers and add to next generation
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
  const endTime = new Date().getTime()  
  elapsedTime.set(((endTime - get(startTime)) / 1000))
  console.log(get(elapsedTime))
  console.log('complete simulation!')
  isRunning.set(false);
  isPaused.set(false);
  isComplete.set(true);
  window.postMessage({type: 'runFinished'})
  currentRunId.set(get(runIdWithHighestFitness))
}

const updateFitnessImprovement = () => {
  // update overall fitness improvement %
  if (get(rounds).length > 0) {
    const firstRoundMaxFitness = last(sortBy(first(get(rounds)), 'fitness'))?.fitness
    let lastRoundMaxFitness = 0
    if (get(rounds).length > 1) {
      lastRoundMaxFitness = last(sortBy(last(get(rounds)), 'fitness'))?.fitness || 0
    } else {
      lastRoundMaxFitness = last(sortBy(get(runs), 'fitness'))?.fitness || 0
    }
    if (firstRoundMaxFitness && lastRoundMaxFitness) {
      fitnessImprovement.set(lastRoundMaxFitness / firstRoundMaxFitness)
    }
  }
}

const attemptToRunNextRound = () => {

  const bestRunInLastRound = last(sortBy(get(runs), 'fitness'))
  if (bestRunInLastRound?.fitness && bestRunInLastRound.fitness > (get(bestRun)?.fitness ?? 0)) {
    bestRun.set(bestRunInLastRound)
  }

  if (get(rounds).length) {
    window.postMessage({type: 'roundComplete'})
  }

  // save last round
  const lastRound = get(runs).map(run => ({
    ...run,
    trees: [], // don't save trees on past rounds, to prevent crashing of the app due to memory usage overload
    deadTrees: [],
  }))
  if (lastRound.length) {
    rounds.update(prevRounds => [...prevRounds, lastRound])
  }


  // updateFitnessImprovement()

  if (get(currentRound) >= maxRounds || areStopConditionsMet()) {
    completeSimulation()
  } else {
    currentRound.update(round => round + 1)
    roundIndexViewedInTable.set(get(currentRound) - 1)
    selectNewPopulation()
    runPopulation()
  }
}

export const runSimulation = () => {

  if (get(currentRound) > 0) {
    isRunning.update(prevRunning => !prevRunning)

    const wasJustPaused = !get(isRunning)
    if (wasJustPaused) {
      isPaused.set(true)
      window.postMessage({type: 'paused'})
    } else {
      isPaused.set(false)
    }

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
    startTime.set(new Date().getTime())
    elapsedTime.set(0)
    attemptToRunNextRound()
  }
}

