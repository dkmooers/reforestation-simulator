import { derived, get, writable } from "svelte/store"
import { times, sortBy, take, countBy, last, reverse, first, sum, random, without, update } from "lodash"
import { treeSpecies } from "$lib/treeSpecies";
import SimulationWorker from '../lib/simulation.worker?worker'
import { getRandomArrayElement, getRandomId } from "$lib/helpers";
import type { Run, Scenario, Tree } from "../types";
import { browser, dev } from "$app/environment";
import { dispatch } from "$lib/dispatcher";

export const devMode = !!dev
export const useMultithreading = writable(true) // when false, we show live tree growth updates every year
const numWorkers = 3
const numActiveWorkers = derived(
  useMultithreading,
  useMultithreading => {
    return useMultithreading ? numWorkers : 1
  }
)
let workers: Worker[] = []
const numWorkersReady = writable(0)
export const allWorkersReady = derived(
  [numActiveWorkers, numWorkersReady],
  ([numActiveWorkers, numWorkersReady])  => numWorkersReady >= numActiveWorkers
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
const limitFramerateOfLiveTreeUpdates = false // if true, reduce frequency of live tree growth updates to reduce graphics stuttering when updating the tree growth diagram

let pauseQueue: Array<{
  fn: Function,
  args: any
}> = []

const handleMessage = (e: MessageEvent) => {
  if (e.data.type === 'runData') {
    const runData = e.data.value as Run;

    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === runData.id) {
        return runData
      } else {
        return run
      }
    }))

    updateOverallFitnessImprovement()
    displayRun(runData.id)

    // ask this worker to do another run if there are any unallocated runs waiting to be run
    const numUnallocatedRuns = get(runs).filter(run => !run.isAllocated)?.length
    const numUnfinishedRuns = get(runs).filter(run => !run.isComplete)?.length
    if (!get(isRunning)) {
      // if paused, put next items in a queue to be run on unpause
      pauseQueue.push({fn: dispatchNextRunToWorker, args: e.srcElement})
    }
    else if (numUnallocatedRuns > 0) {
      const worker = e.currentTarget as Worker
      if (worker) {
        dispatchNextRunToWorker(worker)
      }
    } else if (numUnfinishedRuns === 0) {
      attemptToRunNextRound()
    }
  } else if (e.data.type === 'updatedRun') {

    const updatedRun = e.data.value as Run

    // update tree graphics every year if we're in single threaded mode
    if (!get(useMultithreading)) {
      currentRunId.set(updatedRun.id)
      // year.set(updatedRun.yearlyData.biodiversity.length)
      // yearlyTrees.set(updatedRun.yearlyData.trees)
      // yearlyBiodiversity.set(updatedRun.yearlyData.biodiversity)
      // yearlyCarbon.set(updatedRun.yearlyData.carbon)
      // yearlyFood.set(updatedRun.yearlyData.food)
      // if (limitFramerateOfLiveTreeUpdates) {
      //   // only render trees every Nth year step to avoid choking the graphics engine
      //   if (updatedRun.yearlyData.carbon.length % 4 === 0) {
      //     trees.set(updatedRun.trees)
      //   }
      // } else {
      //   trees.set(updatedRun.trees)
      // }
    }

    runs.update(prevRuns => prevRuns.map((run, index) => {
      if (run.id === updatedRun.id) {
        return updatedRun
      } else {
        return run
      }
    }))
  }
  else if (e.data.type === 'ready') {
    // log this worker as ready
    numWorkersReady.update(num => num + 1)
  }
}

export const loadWorkers = async () => {
  console.log('loadWorkers')
  numWorkersReady.set(0)
  workers = []
  // create N workers
  times(get(numActiveWorkers), () => {
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
    return (baseCompletedFraction + thisRoundAdditionToCompletedFraction) * 100
  }
)

export const progressPercentThisGeneration = derived(
  runs,
  runs => {
    return runs.filter(run => run.isComplete).length / populationSize * 100
  }
)

export const currentRunId = writable<number>(0)

export const currentRun = derived(
  [runs, currentRunId],
  ([runs, currentRunId]) => runs.find(run => run.id === currentRunId)
)

export const carbonTonsPerYearForCurrentRun = derived(
  currentRun,
  currentRun => (currentRun?.carbon || 0) / (currentRun?.yearlyData.carbon.length || 1)
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
      if (run.fitness > maxFitness) {
        maxFitness = run.fitness
        maxFitnessRunId = run.id
      }
    })
    return maxFitnessRunId
  }
)

export const numSpecies = derived(
  currentRun,
  currentRun => currentRun?.trees ? Object.keys(countBy(currentRun.trees, 'speciesId'))?.length || 0 : 0
)

export const displayRun = (runId: number) => {
  currentRunId.set(runId)
  loadRun(runId)
}

const loadRun = (runId: number) => {
  currentRunId.set(runId)
}

const getEmptyRun = (): Run => ({
  id: getRandomId(),
  yearlyData: {
    carbon: [0],
    trees: [0],
    biodiversity: [0],
    food: [0],
  },
  food: 0,
  trees: [],
  deadTrees: [],
  scenario: generateScenario(),
  fitness: 0,
  averageBiodiversity: 0,
  initialTrees: [],
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
  clearRunHistory()
}

export const clearRunHistory = () => {
  runs.set([])
  currentRunId.set(0)
}

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
    coppiceMinRadius: random(5, 15),
    coppiceRadiusSpread: random(2, 15), // The difference between coppiceMinRadius and the max harvestable radius (defined this way instead of defining a max radius, because with mutation and crossover, that could result in a max radius that's lower than the min radius)
    // coppiceFoodTrees: getRandomArrayElement([true, false])
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
  child = generateMutantFromParent(child)

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
  without(Object.keys(mutant), 'speciesProbabilities', 'coppiceFoodTrees').forEach(prop => {
    mutant[prop] *= getRandomMutationMultiplier()
    // cap coppice chance at max 1.0 (100%)
    if (prop === 'coppiceChance') {
      mutant[prop] = Math.min(1, mutant[prop])
    }
  })
  mutant.speciesProbabilities = normalizeSpeciesProbabilities(mutant.speciesProbabilities.map(probability => (
    probability * getRandomMutationMultiplier()
  )))
  // 10% chance of flipping coppiceFoodTrees gene
  // if (Math.random() < 0.1) {
  //   mutant.coppiceFoodTrees = !mutant.coppiceFoodTrees
  // }
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
  if (browser) {
    dispatch('runFinished')
  }
  currentRunId.set(get(runIdWithHighestFitness))
}

const updateOverallFitnessImprovement = () => {
  if (get(rounds).length > 0) {
    const firstRoundMaxFitness = last(sortBy(first(get(rounds)), 'fitness'))?.fitness
    let lastRoundMaxFitness = 0
    if (get(rounds).length === maxRounds) {
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

  if (get(rounds).length && get(runs).filter(run => run.isComplete).length === populationSize) {
    dispatch('roundComplete')
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

  if (get(currentRound) >= maxRounds || areStopConditionsMet()) {
    completeSimulation()
  } else {
    currentRound.update(round => round + 1)
    roundIndexViewedInTable.set(get(currentRound) - 1)
    selectNewPopulation()
    runPopulation()
  }
}

export const toggleRunSimulation = () => {

  if (get(currentRound) > 0) {

    isRunning.update(prevRunning => !prevRunning)

    const wasJustPaused = !get(isRunning)

    if (wasJustPaused) {
      isPaused.set(true)
      // if (get(useMultithreading)) {
      //   dispatch('pause')
      // }
      workers.forEach(worker => {
        worker.postMessage({type: 'pause'})
      })
    } else {
      workers.forEach(worker => {
        worker.postMessage({type: 'resume'})
      })
      isPaused.set(false)
    }

    // if we're restarting, run queued items from last time the run was paused
    if (get(isRunning)) {
      if (get(runs).filter(run => !run.isComplete).length === 0) {
        attemptToRunNextRound()
      } else {
        pauseQueue?.forEach(({fn, args}) => fn(args))
        pauseQueue = []
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
