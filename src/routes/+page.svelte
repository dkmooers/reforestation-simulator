<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition'
  import Chart from '../components/Chart.svelte';
  import Modal from '../components/Modal.svelte';
	import {
    loadWorkers,
    useMultithreading,
		toggleRunSimulation,
		reset,
    numSpecies,
    carbonTonsPerYearForCurrentRun,
    runIdWithHighestCarbon,
    runIdWithHighestFitness,
    runs,
    displayRun,
    currentRunId,
    currentRun,
    isRunning,
    isPaused,
    isComplete,
    allWorkersReady,
    currentRound,
    numYearsPerRun,
    maxRounds,
    progressPercentOverall,
    progressPercentThisGeneration,
    enableSelectiveHarvesting,
	} from '../lib/simulator';
  import { treeSpecies } from '$lib/treeSpecies';
  import PauseMessage from '../components/PauseMessage.svelte';
  import Tooltip from '../components/Tooltip.svelte';
  import Loader from '../components/Loader.svelte';
  import { createEventDispatcher, run } from 'svelte/internal';
  import Toggle from '../components/Toggle.svelte';
  import SuccessModal from '../components/SuccessModal.svelte';
  import Statistic from '../components/Statistic.svelte';
  import Sidebar from '../components/Sidebar.svelte';
  import Diagram from '../components/Diagram.svelte';
  import ProgressBar from '../components/ProgressBar.svelte';

  let showIntro: () => {};
	let renderGraphics = true;
  let showTreeLabels = true;
  let colorMode = 'colorized';
  $: currentRunBiodiversity = Math.round(($currentRun?.averageBiodiversity || 0) * 100)
  const dispatch = createEventDispatcher()

  onMount(() => {
    window.addEventListener('keydown', function(event) {
        const key = event.key;
        if (key === 'ArrowRight') {
          console.log('right')
        } else if (key === 'ArrowLeft') {
          console.log('left')
        }
    });
    setTimeout(() => {
      loadWorkers()
    }, 10)
  })

</script>

<div class="flex">

  <div
    class="flex flex-grow flex-col items-stretch h-screen overflow-hidden"
  >
    <Modal bind:trigger={showIntro} />
    <SuccessModal />
    <PauseMessage />
    
    {#if !$allWorkersReady && !$isRunning && !$isPaused}
      <div transition:fade class="z-30 fixed inset-0 bg-black bg-opacity-10 backdrop-blur flex items-center justify-center">
        <div class="flex flex-col justify-center items-center space-y-3">
          <div class="font-bold">Loading workers</div>
          <Loader size="6rem" />
        </div>
      </div>
    {/if}

    <!-- Progress bar (entire simulation) -->
    <ProgressBar percentComplete={$progressPercentOverall} />
    <!-- Progress bar (this round) -->
    <ProgressBar percentComplete={$progressPercentThisGeneration} color="#ad8c6a" />

    <div class="p-4 flex-grow flex flex-col">
      <div class="flex items-center space-x-6 -mt-2">
        <h1 class="whitespace-nowrap mt-3 flex items-center">
          <div class="-mt-3 mr-2 w-8">
            <img alt="Tree icon" src="/treeicon.png" />
          </div>
          <span class="-mt-2">Reforestation Simulator</span>
          <Tooltip>
            A reforestation simulator prototype with a basic biological tree growth model based on available sunlight, seed propagation, and a simplified carbon calculation model, using multithreaded web workers for speed enhancements and genetic algorithms for finding optimal tree planting scenarios.
            <button class="button-primary my-4 font-normal" on:click|preventDefault|stopPropagation={() => {
              showIntro()
            }}>More Information</button>
            <div class="mt-2">Built by <a style="color: var(--accentColor); transition: border 0.2s;" class="border-b font-normal border-[#16c264] border-opacity-0 hover:border-opacity-100" href="http://devinmooers.com" target="_blank">Devin Mooers</a></div>
          </Tooltip>
        </h1>

        <!-- Buttons -->
        <div class="flex-grow">
          <div class="whitespace-nowrap flex">
            <button
            class="button-primary text-black text-opacity-75 transition-opacity hover:opacity-80 select-none {$isComplete ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}"
              on:click={() => {
                // reset();
                if (!$isPaused) {
                  dispatch('pause')
                }
                toggleRunSimulation();
              }}
            >
              <div class="w-6 flex items-center h-full">
                {#if $isRunning}
                  <div class="relative mt-1 h-full">
                    <Loader class="absolute top-0 left-0" />
                    <!-- Pause icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3 h-3 absolute top-[4px] left-[4px] text-white">
                      <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clip-rule="evenodd" />
                    </svg>
                  </div>

                {:else}
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                  </svg>
                {/if}
                </div>

              <span>{$isRunning ? 'Pause' : 'Run'}</span>
            </button>

            <button class="{$isRunning ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}" on:click={() => {
              reset()
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd" />
              </svg>
              <span>Reset</span>
            </button>
          </div>

        </div>

        <!-- Controls -->
        <div class="flex items-center ml-auto bg-black bg-opacity-70 pl-3 pr-1 py-1 rounded">
          <label class="whitespace-nowrap mr-1">Enable selective harvesting</label>
          <Tooltip position="left" iconClass="!ml-0 mr-1">
            Randomly selects a percentage of eligible trees for harvesting, preferring clumped/crowded trees. Selective harvesting has the potential to increase carbon sequestration if managed properly, but can also eliminate some special types of habitat, and reduce overall ecosystem biodiversity.
            {#if $isPaused || $isRunning}
              <div class="mt-2">Cannot be changed in the middle of a simulation as it would invalidate test results. Once you reset the simulation, then you'll be able to change this setting.</div>
            {/if}
          </Tooltip>
          <Toggle bind:checked={$enableSelectiveHarvesting} disabled={$isRunning || $isPaused} />
          <span class="opacity-30 mx-3">•</span>
          <label class="whitespace-nowrap mr-3">Use multithreading</label>
          <Toggle bind:checked={$useMultithreading} disabled={$isRunning || $isPaused} />

          <!-- <label class="whitespace-nowrap">
            Color mode
            <select bind:value={colorMode}>
              <option value="colorized" label="Colorized">
              <option value="shaded" label="Shaded">
            </select>
          </label> -->
        </div>
      </div>

      <!-- Statistics -->
      <div class="flex -ml-6">
        <Statistic
          label="Generation"
          tooltip='Each generation consists of 20 individual reforestation scenarios. Each scenario is simulated for 100 years of tree growth and propagation, which equals one "run".'
          value="{$currentRound} / {maxRounds}"
          width="9rem"
          class="border-r border-subtle"
        />
        <Statistic
          label="Year"
          value={$currentRun?.yearlyData?.carbon?.length || 0}
          width="4rem"
        />
        <Statistic
          label="Trees Planted"
          value={$currentRun?.initialTrees.length || 0}
        />
        <Statistic
          label="Final Trees"
          tooltip="This can be much larger than trees planted due to seed-based propagation."
          value={($currentRun?.trees.length || 0).toLocaleString('en-US')}
        />
        <Statistic
          label="Final Species"
          value={$numSpecies}
        />
        <Statistic
          label="Food"
          valueColor="rgb(243 73 168)"
          width="4rem"
          tooltip="Food tons harvested"
          tooltipPosition="left"
          value={Math.round($currentRun?.food || 0)}
        />
        <Statistic
          label="Biodiversity"
          valueColor="#af62ff"
          value="{currentRunBiodiversity}%"
        />
        <Statistic
          label="Carbon (t)"
          valueColor="var(--accentColor)"
          tooltip="This is a rough estimate for prototyping purposes, in lieu of a more physically accurate DBH-based calculation."
          tooltipPosition="left"
          value={Math.round($currentRun?.carbon || 0).toLocaleString('en-US')}
        />
        <Statistic
          label="C Tons / Year"
          width="5rem"
          value={($carbonTonsPerYearForCurrentRun || 0).toFixed(1).toLocaleString('en-US')}
        />
        <Statistic
          label="Fitness"
          valueColor="rgb(234, 179, 8)"
          tooltip="Fitness is evaluated based on maximizing carbon sequestration and biodiversity."
          tooltipPosition="left"
          value={$currentRun?.fitness?.toLocaleString('en-US') || 0}
        />
      </div>

      <!-- Current Run Tabs -->
      <div class="flex space-x-2 items-end">
        <div class="opacity-80 text-sm pb-[5px]">Run:</div>
        {#if $runs.length === 0}
          <div class="flex flex-col items-center justify-end ">
            <div style="color: var(--accentColor);" class="leading-tight" class:opacity-10={true}>•</div>
            <div
              class="text-sm rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-5 hover:bg-opacity-20 cursor-pointer"
              style={'background: var(--accfentColor); color: var(--backgroundColor);'}
            >1</div>
          </div>
        {:else}
          {#each $runs as run, index}
            <div class="flex flex-col items-center justify-end">
              
              <!-- Indicator Dots for highest carbon and highest fitness runs -->
              <div class="flex leading-tight">
                <div style="color: var(--accentColor);" class="opacity-100 transition-opacity" class:!opacity-10={run.id !== $runIdWithHighestCarbon}>•</div>
                <div class="text-yellow-400 opacity-100 transition-opacity" class:!opacity-10={run.id !== $runIdWithHighestFitness}>•</div>
              </div>

              <!-- Tab -->
              <div
                on:click={() => displayRun(run.id)}
                in:fade
                class="text-sm transition-colors relative rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-0 hover:bg-opacity-20 cursor-pointer"
                style="{run.id === $currentRunId ? 'background-color: #b6a393; color: var(--backgroundColor);' : ''}"
              >
                <!-- Vertical progress bar background -->
                <div class="absolute bottom-0 left-0 w-full bg-[#ad8c6a] {run.id === $currentRunId ? 'bg-opacity-0' : 'bg-opacity-40'} rounded-t-[0.2rem]" style="height: {run.yearlyData.carbon.length * 100 / numYearsPerRun}%"></div>
                {index + 1}
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <Diagram />

      <!-- Species breakdown bar chart -->
      <div class="text-xs mb-1 flex items-center opacity-0 transition-opacity" class:!opacity-100={$runs?.filter(run => run.isComplete).length > 0}>
        Initial planting species breakdown:
        <Tooltip>
          <small>The percentages of each species initially planted in this run</small>
        </Tooltip>
      </div>
      <div class="h-4">
        {#if $currentRun?.scenario}
          <div class="bg-white flex rounded">
            {#each $currentRun.scenario.speciesProbabilities as probability, speciesIndex}
              {@const probabilityPercent = probability * 100}
              {@const species = treeSpecies[speciesIndex]}
              <div
                style="width: {probabilityPercent}%; background: {species?.color}99; transition: min-width 0.2s;"
                class="px-2 hover:flex-grow min-w-0 hover:!min-w-[5.5rem] cursor-pointer whitespace-nowrap text-xs text-black border-r border-black border-opacity-20 overflow-hidden"
                class:rounded-l={speciesIndex === 0}
                class:rounded-r={speciesIndex === Object.keys($currentRun.scenario.speciesProbabilities).length - 1}
              >{species.id}: {Math.round($currentRun.scenario.speciesProbabilities[speciesIndex] * 100)}%</div>
            {/each}
          </div>
        {:else}
          <div class="bg-black w-full rounded bg-opacity-80"></div>
        {/if}
      </div>

      <!-- Chart -->
      <div class="flex-grow rounded pt-3 pb-0 pr-2">
          <Chart />
      </div>
    </div>
    
  </div>

  <Sidebar />
</div>
