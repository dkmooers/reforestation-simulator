<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, slide, fly } from 'svelte/transition'
  import Chart from '../components/Chart.svelte';
  import Slider from '../components/Slider.svelte';
  import Modal from '../components/Modal.svelte';
	import {
    loadWorkers,
    allWorkersReady,
		addNRandomTrees,
		calculateOverlaps,
		runSimulation,
		reset,
		stepNYears,
    numSpecies,
		year,
		carbon,
    averageCarbonAcrossRuns,
    runIdWithHighestCarbon,
    runIdWithHighestBiodiversity,
    runIdWithHighestFitness,
		biodiversity,
		pruneOverflowTrees,
		declusterTrees,
    runs,
    rounds,
    displayRun,
    currentRunId,
    currentRun,
    trees,
    initialTrees,
    isRunning,
    clearRunHistory,
    currentRound,
    numYearsPerRun,
    roundIndexViewedInTable,
    fitnessImprovement,
    bestFitnessByRound,
    maxRounds,
    progressPercent,
    populationSize,
	} from '../stores/store';
  import TreeIcon from '../components/TreeIcon.svelte';
  import { treeSpecies } from '$lib/treeSpecies';
  import SuccessMessage from '../components/SuccessMessage.svelte';
  import { prettifyNumber } from '$lib/helpers';
  import { sortBy, reverse } from 'lodash';
  import { last } from 'lodash';
  import Tooltip from '../components/Tooltip.svelte';
  import Loader from '../components/Loader.svelte';

	let renderGraphics = true;
  let showTreeLabels = true;
  let colorMode = 'colorized';
  let isSidebarOpen = true;
  $: currentRunBiodiversity = Math.round(($currentRun?.averageBiodiversity || 0) * 100)
  // $: currentRunBiodiversity = Math.round((last($currentRun?.yearlyData.biodiversity) || 0) * 100)
  // $: isRunButtonDisabled = $isRunning || !$allWorkersReady


  // $: console.log($runs.map(r => r))

  onMount(() => {
    window.addEventListener('keydown', function(event) {
        const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
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
    <Modal />
    <SuccessMessage />
    {#if !$allWorkersReady}
      <div transition:fade class="z-30 fixed inset-0 bg-black bg-opacity-10 backdrop-blur flex items-center justify-center">
        <div class="flex flex-col justify-center items-center space-y-3">
          <div class="font-bold">Loading workers</div>
          <Loader size="6rem" />
        </div>
      </div>
    {/if}

    <!-- Progress bar (entire simulation) -->
    <div class="h-[3px] w-full bg-black relative">
      <div class="bg-yellow-500 absolute left-0 top-0 h-full" style="width: {$progressPercent}%; transition: width 1s;" />
    </div>
    <!-- Progress bar (this round) -->
    <div class="h-[3px] w-full bg-black relative">
      <div class="bg-subtle absolute left-0 top-0 h-full" style="width: {$runs.filter(run => run.isComplete)?.length / populationSize * 100}%; transition: width 1s;" />
    </div>

    <div class="p-4 flex-grow flex flex-col">
      <div class="flex items-center space-x-6 -mt-2">
        <!-- <div class="flex"> -->
          <h1 class="whitespace-nowrap mt-3 flex items-center">
            <div class="-mt-3"><TreeIcon /></div>
            <span class="-mt-2">Reforestation Simulator</span>
            <Tooltip>
              A reforestation simulator prototype with a basic biological tree growth model based on available sunlight, seed propagation, and a simplified carbon calculation model, using multithreaded web workers for speed enhancements and genetic algorithms for finding optimal tree planting scenarios.
              <div class="mt-2">Built by <a style="color: var(--accentColor); transition: border 0.2s;" class="border-b font-normal border-[#16c264] border-opacity-0 hover:border-opacity-100" href="http://devinmooers.com" target="_blank">Devin Mooers</a></div>
            </Tooltip>
            <!-- <span class="rounded-full bg-[#ad8c6a] text-base h-6 w-6">?</span> -->
          </h1>

          <!-- Buttons -->
          <div class="flex-grow">
            <div class="whitespace-nowrap flex">
              <button
                class="text-black text-opacity-75 transition-opacity hover:opacity-80 {false ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}"
                style="background: var(--accentColor);"
                on:click={() => {
                  // reset();
                  runSimulation();
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

              <!-- <button on:click={() => stepNYears(1)}>+1 year</button>
              <button on:click={() => stepNYears(5)}>+5 years</button>
              <button on:click={() => stepNYears(10)}>+10 years</button>
              <button on:click={() => stepNYears(50)}>+50 years</button> -->
              <button class="{$isRunning ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}" on:click={() => {
                reset()
                clearRunHistory()
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd" />
                </svg>
                <span>Reset</span>
              </button>
            </div>
            <!-- <div class="whitespace-nowrap">
              <button on:click={() => addNRandomTrees(100)}>Plant Trees</button>
              <button on:click={() => calculateOverlaps()}>Calculate Overlaps</button>
              <button on:click={() => pruneOverflowTrees()}>Prune Overflow Trees</button>
              <button on:click={() => declusterTrees()}>Decluster</button>
            </div> -->
          </div>
          <!-- <div class="italic leading-tight mb-4 opacity-60 text-sm">An app prototype with a simplified biological tree growth model, propagation model, and carbon calculation model.</div> -->

        <!-- </div> -->
      
        <!-- Controls -->
        <div class="flex space-x-4 items-center ml-auto bg-black bg-opacity-70 pl-3 pr-1 py-1 rounded">
          <!-- <label class="flex items-center whitespace-nowrap">
            Render graphics
            <input type="checkbox" bind:checked={renderGraphics} />
          </label> -->
          <!-- <span class="opacity-30">•</span> -->
          <label class="flex items-center whitespace-nowrap">
            Show tree labels
            <input type="checkbox" bind:checked={showTreeLabels} />
          </label>
          <span class="opacity-30">•</span>
          <label class="whitespace-nowrap">
            Color mode
            <select bind:value={colorMode}>
              <option value="colorized" label="Colorized">
              <option value="shaded" label="Green shading">
            </select>
          </label>
        </div>
      </div>

      <!-- Statistics -->
      <div class="flex -ml-6">
        <div class="statistic !w-32 border-r border-subtle">
          <label>round</label>
          <span>{$currentRound} / {maxRounds}</span>
        </div>
        <div class="statistic !w-20f">
          <label>year</label>
          <span>{$year}</span>
        </div>
        <div class="statistic !w-24">
          <label>trees planted</label>
          <span>{$currentRun?.initialTrees.length || 0}</span>
        </div>
        <div class="statistic !w-20">
          <label>final trees</label>
          <span>{($trees.length || 0).toLocaleString('en-US')}</span>
        </div>
        <div class="statistic !w-24">
          <label>final species</label>
          <span>{$numSpecies}</span>
        </div>
        <div class="statistic !w-24">
          <div class="flex items-center justify-center">
            <label>biodiversity </label>
            <!-- <Tooltip position="left">Biodiversity is calculated based on having an even spread of many sp</Tooltip> -->
          </div>
          <span class="text-[#af62ff]">{currentRunBiodiversity}%</span>
        </div>
        <div class="statistic !w-24">
          <div class="flex items-center justify-center mt-[-2px]">
            <label>carbon (t) </label>
            <Tooltip position="left">This is a placeholder measurement, not a more physically accurate DBH-based measurement.</Tooltip>
          </div>
          <span style="color: var(--accentColor)">{Math.round($carbon / 2000).toLocaleString('en-US')}</span>
        </div>
        <!-- <div class="statistic !w-36">
          <label>avg carbon (all runs)</label>
          <span>{Math.round($averageCarbonAcrossRuns / 2000)}</span>
        </div> -->
        <div class="statistic !w-20">
          <label>tons / year</label>
          <span>{(Math.round($carbon / 2000 / $year) || 0).toLocaleString('en-US')}</span>
        </div>
        <div class="statistic !w-24">
          <div class="flex items-center justify-center mt-[-2px]">
            <label>fitness </label>
            <Tooltip position="left">Fitness is evaluated based on maximizing carbon sequestration and biodiversity, and minimizing the number of initial trees that need to be planted.</Tooltip>
          </div>
          <span class="text-yellow-500">{$currentRun?.fitness?.toLocaleString('en-US') || 0}</span>
        </div>
        <!-- <div class="statistic">
          <label>area (ha)</label>
          <span>1.0</span>
        </div> -->
        <!-- <div class="statistic !w-56 border-l border-[#ad8c6a] border-opacity-30 pl-4">
          <label>avg carbon across runs (tons)</label>
          <span>{Math.round($averageCarbonAcrossRuns / 2000)}</span>
        </div> -->
      </div>

      <!-- <div class="flex grid-fols-2 gap-6 mt-2"> -->

      <div class="flex space-x-2 items-end">
        <div class="opacity-80 text-sm pb-[5px]">Run:</div>
        {#if $runs.filter(run => run.isAllocated).length === 0}
          <div class="flex flex-col items-center justify-end ">
            <div style="color: var(--accentColor);" class="leading-tight" class:opacity-10={true}>•</div>
            <div
              class="text-sm rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-5 hover:bg-opacity-20 cursor-pointer"
              style={'background: var(--accfentColor); color: var(--backgroundColor);'}
            >1</div>
          </div>
          <!-- {#if !$isRunning}
            <div in:fade class="text-[#ad8c6a] text-sm mb-1 pl-2">(Click Run to run the simulation)</div>
          {/if} -->
        {:else}
          {#each $runs.filter(run => run.isAllocated) as run, index}
            <div class="flex flex-col items-center justify-end">
              <!-- Dots -->
              <div class="flex leading-tight">
                <div style="color: var(--accentColor);" class="opacity-100 transition-opacity" class:!opacity-10={run.id !== $runIdWithHighestCarbon}>•</div>
                <div class="text-yellow-400 opacity-100 transition-opacity" class:!opacity-10={run.id !== $runIdWithHighestFitness}>•</div>
              </div>

              <!-- Tab -->
              <div
                on:click={() => displayRun(run.id)}
                in:fade
                class="text-sm transition-colors relative rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-0 hover:bg-opacity-20 cursor-pointer"
                class:!bg-yellow-500={run.id === $runIdWithHighestFitness}
                class:!text-stone-900={run.id === $runIdWithHighestFitness}
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

      <!-- Diagram -->
      <div class="mb-2 flex bg-[#efe1db] rounded z-10">
        <div class="flex-grow rounded-lg flex items-center justify-center relative">
          {#if $currentRound === 0}
            <div class="w-full h-full absolute inset-0 flex items-center align-center flex-grow">
              <button
                class="mx-auto text-black text-opacity-75 transition-opacity hover:opacity-80 text-2xl px-6 py-3 {false ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}"
                style="background: var(--accentColor);"
                on:click={() => {
                  // reset();
                  runSimulation();
                }}
              >
                <span class="w-8">
                  <!-- {#if $isRunning}
                    <Loader size="2rem" class="mr-2" />
                  {:else} -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                    </svg>
                  <!-- {/if} -->
                </span>

                <span class="font-light">Run</span>
              </button>
            </div>
          {/if}
          {#if $currentRound === 1 && $runs.filter(run => run.isComplete).length === 0}
            <div class="flex-col w-full h-full absolute inset-0 flex items-center justify-center flex-grow">
              <Loader size="4rem" />
            </div>
          {/if}
          <svg viewBox="0 0 612 176" class="w-full">
            <defs>
              <radialGradient id="treeGradient">
                <stop offset="0%" stop-color="rgba(20,100,20,1)" />
                <stop offset="70%" stop-color="rgba(0,150,0,0.5)" />
                <stop offset="100%" stop-color="rgba(20,100,0,0.0)" />
              </radialGradient>
            </defs>
          
            {#key $currentRunId}  

              <g in:fade={{delay: 50}} out:fade={{duration: 50}}>
                {#if renderGraphics}
                  <!-- trunks -->
                  <!-- {#each $trees as tree}
                    <circle cx={tree.x} cy={tree.y} r={tree.radius / 10} fill="#3d2311" opacity="0.4" />
                  {/each} -->
                  <!-- foliage canopies -->
                  {#each $trees as tree}
                    {#if colorMode === 'colorized'}
                      <circle cx={tree.x} cy={tree.y} r={tree.radius} fill={tree.color} opacity="0.3" />
                    {:else if colorMode === 'shaded'}
                      <circle
                        cx={tree.x}
                        cy={tree.y}
                        r={tree.radius}
                        fill="url('#treeGradient')"
                        style="z-index: 1"
                        opacity="0.75"
                      />
                    {/if}
                  {/each}
                  <!-- tree outlines and text overlays -->
                  {#each $trees as tree}
                    <circle
                      cx={tree.x}
                      cy={tree.y}
                      r={tree.radius}
                      stroke="rgba(0,50,0,0.2)"
                      style="z-index: 1"
                      fill="transparent"
                      stroke-width="0.5"
                    />
                    {#if showTreeLabels}
                      <text
                        x={tree.x - 5}
                        y={tree.y - 2}
                        style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.speciesId}</text
                      >
                      <text
                        x={tree.x - 5}
                        y={tree.y + 2}
                        style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.age} y</text
                      >
                      <!-- <text
                        x={tree.x - 4}
                        y={tree.y + 5}
                        style="z-index: 10; font-family: monospace; font-size: 4px;"
                        >{tree.health.toFixed(1)}</text
                      > -->
                    {/if}
                      <!-- <text
                      x={tree.x - 6}
                      y={tree.y + 6}
                      style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.radius.toFixed(1) * 2}ft</text
                    > -->
                  {/each}
                {/if}
              </g>
            {/key}

          </svg>
          <!-- <Slider min={0} max={100} bind:value={$year} /> -->
        </div>
      </div>

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
            <!-- {JSON.stringify($currentRun?.scenario)} -->
        {:else}
          <div class="bg-black w-full rounded bg-opacity-80"></div>
        {/if}
      </div>

      <!-- Carbon chart -->
      <div class="flex-grow rounded pt-3 pb-0 pr-2">
          <Chart />
      </div>
    </div>
    
  </div>

  <!-- Sidebar -->
  <div class="py-4 flex-shrink relative bg-[#2a2421] border-l border-[#ad8c6a] border-opacity-50 mr-[-1px] h-screen">
    <!-- {#if isSidebarOpen} -->
      <div class="{isSidebarOpen ? 'w-[19rem]' : 'w-0'} overflow-y-auto overflow-x-visible flex flex-col min-h-full" style="transition: width 0.2s; ">
        <div class="px-4 flex-grow">

          <div class="flex items-center mb-3 text-sm">
            <label class="mr-2 text-subtle">Round:</label>
            <select bind:value={$roundIndexViewedInTable} class="text-sm">
              {#if !$rounds.length}
                <option value={0} label="1" />
              {:else}
                {#each $rounds as round, index}
                  <option value={index} label={String(index + 1)} />
                {/each}
                {#if $isRunning}
                  <option value={$rounds.length} label={String($rounds.length + 1)} />
                {/if}
              {/if}
            </select>
          </div>

          <table class="border-collapse text-xs">
            <thead>
              <th title="Round Number">#</th>
              <th class="min-w-[3rem]" title="Fitness">Fit...</th>
              <th class="min-w-[3rem]" title="Carbon">Car...</th>
              <th class="min-w-[3rem]" title="Biodiversity">Bio...</th>
              <!-- <th class="min-w-[3rem]" title="Coppice Min Age">CMA</th> -->
              <th class="min-w-[3rem]" title="Harvest Min Radius (Canopy)">HMR</th>
              <th class="min-w-[3rem]" title="Harvest Chance">HC</th>

            </thead>
            {#each reverse(sortBy(($roundIndexViewedInTable === $rounds.length ? $runs : $rounds[$roundIndexViewedInTable])?.map((run, index) => ({...run, index: index + 1})), 'fitness', )) as run, index}
            <!-- {#each reverse(sortBy($runs.filter(run => run.isAllocated).map((run, index) => ({...run, index: index + 1})), 'fitness', )) as run, index} -->
              <tr class="bg-transparent transition-colors {run.id === $currentRunId ? 'current-run' : ''} " style={run.id === $currentRunId ? 'background-color: #0006; bingo: #ad8c6a22; color: white;' : ''}>
                <td class="cursor-pointer text-right  hover:!text-white transition-colors " on:click={() => displayRun(run.id)}>{run.index}</td>
                <td class="text-right" class:!text-yellow-500={run.id === $runIdWithHighestFitness}>{run.fitness ?? '--'}</td>
                <td class="text-right" class:!text-green-400={run.id === $runIdWithHighestCarbon}>{Math.round(last(run.yearlyData.carbon)/2000)}</td>
                <td class="text-right" class:!text-[#af62ff]={run.id === $runIdWithHighestBiodiversity}>{Math.round(last(run.yearlyData.biodiversity) * 100)}%</td>
                <!-- <td class="text-right">{Math.round(run.scenario.coppiceMinAge || 0)}yr</td> -->
                <td class="text-right">{Math.round(run.scenario.coppiceMinRadius || 0)} ft</td>
                <td class="text-right">{Math.round((run.scenario.coppiceChance || 0) * 100)}%</td>

              </tr>
            {/each}
          </table>

          <!-- {#if $rounds.length > 0} -->
            <div class="statistic !w-full mt-5">
              <label>Total fitness improvement</label>
              <div class="h-[1.8rem]">
                <span class="text-yellow-500">{Math.max(0, Math.round((($fitnessImprovement || 1) - 1) * 100))}%</span>
                <!-- {#key $currentRound}
                  <span class="text-yellow-500" in:fade={{duration: 200, delay: 300}} out:fade={{duration: 200}}>{Math.round((($fitnessImprovement || 1) - 1) * 100)}%</span>
                {/key} -->
              </div>
            </div>
            <div class="flex items-center justify-center mt-4 mb-1 text-subtle text-xs uppercase">
              <span>Best fitness by round</span>
              <!-- <Tooltip position="left">Fitness sometimes drops round to round, because simulations are run non-deterministically, i.e. for any initial scenario, running that scenario over and over will produce somewhat different results due to random seed propagation.</Tooltip> -->
            </div>
            <div class="grid grid-cols-2">
              {#each $bestFitnessByRound as fitness, index}
                <div class="text-xs">
                  <span class="text-subtle w-5 inline-block">{index + 1}:</span>
                  <span>{fitness}</span>
                  {#if index > 0}
                    {@const improvement = Math.round(100 * (fitness / $bestFitnessByRound[index - 1] - 1))}
                    {#if improvement > 0}
                      <span class="font-mono text-yellow-500 text-[0.65rem]">+{improvement}%</span>
                    {/if}    
                  {/if}
                </div>
              {/each}
            </div>
          <!-- {/if} -->

        </div>
        <div class="mt-auto mx-auto px-4 whitespace-nowrap">Built by <a style="color: var(--accentColor); transition: border 0.2s;" class="border-b font-normal border-[#16c264] border-opacity-0 hover:border-opacity-100" href="http://devinmooers.com" target="_blank">Devin Mooers</a></div>
      </div>

    <!-- {/if} -->
    <div class="absolute -left-8 w-8 top-[4.2rem] flex flex-col rounded-l items-center justify-center bg-[#ad8c6a] bg-opacity-10 border border-[#ad8c6a] border-r-0 text-[#ad8c6a] cursor-pointer hover:bg-opacity-20" on:click={() => isSidebarOpen = !isSidebarOpen}>
      <div class="rotate-90 mt-[1.3rem] text-xs">Ranking</div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="mt-5 mb-1 w-5 h-5 transition-transform {isSidebarOpen ? '' : 'rotate-180'}">
        <path fill-rule="evenodd" d="M4.72 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 010-1.06zm6 0a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06L17.69 12l-6.97-6.97a.75.75 0 010-1.06z" clip-rule="evenodd" />
      </svg>
    </div>
  </div>
</div>

<style>
	.statistics {
		display: inline-flex;
		/* margin-top: 1rem; */
		margin-left: 1rem;
	}
	.statistic {
		display: flex;
		flex-direction: column;
		/* margin-right: 2rem; */
		text-align: center;
		/* width: 9rem; */
    width: 4rem;
    margin-right: 1rem;
    flex-shrink: 0;
	}
	.statistic label {
    flex-shrink: 0;
		line-height: 1.5;
    color: #ad8c6a;
    text-transform: uppercase;
    font-size: 0.7rem;
		/* color: #d49352; */
	}
	.statistic span {
		font-size: 1.8rem;
    flex-shrink: 0;
		font-weight: 100;
		line-height: 1;
	}

  td, th {
    border: 1px solid #ad8c6a99;
    padding: 0 0.4rem;
  }
  td {
    color: #ad8c6a;
    transition: color 0.2s;
  }
  tr.current-run {
    color: white !important;
  }
  tr.current-run td {
    color: white;
  }
</style>
