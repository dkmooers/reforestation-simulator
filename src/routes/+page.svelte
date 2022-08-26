<script lang="ts">
  import { onMount } from 'svelte';
  import Chart from '../components/Chart.svelte';
  import Slider from '../components/Slider.svelte';
  import Modal from '../components/Modal.svelte';

	import {
    loadWorker,
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
		biodiversity,
		pruneOverflowTrees,
		declusterTrees,
    runs,
    displayRun,
    currentRunId,
    currentRun,
    trees,
    isRunning,
    clearRunHistory,
	} from '../stores/store';
  import TreeIcon from '../components/TreeIcon.svelte';

	let renderGraphics = true;
  let showTreeLabels = false;
  let colorMode = 'colorized';

  onMount(() => {
    window.addEventListener('keydown', function(event) {
        const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
        if (key === 'ArrowRight') {
          console.log('right')
        } else if (key === 'ArrowLeft') {
          console.log('left')
        }
    });
    loadWorker()
  })

</script>

<div
  class="flex flex-col items-stretch h-screen p-4 overflow-hidden"
>
  <Modal />
  <div class="flex items-start space-x-6">
    <!-- <div class="flex"> -->
      <h1 class="whitespace-nowrap mb-1 flex flex-grow">
        <TreeIcon />
        <span>Reforestation Simulator</span>
        <!-- <span class="rounded-full bg-white text-base h-6 w-6">?</span> -->
        
      </h1>
      <!-- <div class="italic leading-tight mb-4 opacity-60 text-sm">An app prototype with a simplified biological tree growth model, propagation model, and carbon calculation model.</div> -->

    <!-- </div> -->
    
    <div class="flex space-x-4 items-center ml-auto bg-black bg-opacity-40 px-4 py-2 rounded">
      <label class="flex items-center whitespace-nowrap">
        Render graphics
        <input type="checkbox" bind:checked={renderGraphics} />
      </label>
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

  <!-- Controls -->
	<div class="flex items-end flex-wrap">

    <div class="flex flex-col max-w-md mr-6">

      <!-- Buttons -->
      <div class="mr-6 mb-[4px]">
        <div class="whitespace-nowrap flex" >
          <button
            class="text-black text-opacity-75 {$isRunning ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}"
            style="background: var(--accentColor);"
            disabled={$isRunning}
            on:click={() => {
              // reset();
              runSimulation();
            }}
          >
            <span class="w-5">
              {#if $isRunning}
                <svg class="animate-spin mr-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
              {/if}
            </span>

            <span>Run</span>
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
    </div>


    <!-- Statistics -->
		<div class="flex">
			<div class="statistic !w-20f">
				<label>year</label>
				<span>{$year}</span>
			</div>
			<div class="statistic !w-20f">
				<label>trees</label>
				<span>{$trees.length || 0}</span>
			</div>
      <div class="statistic !w-2f0">
        <label>species</label>
        <span>{$numSpecies}</span>
      </div>
			<div class="statistic !w-24">
				<label>carbon (tons)</label>
				<span style="color: var(--accentColor)">{Math.round($carbon / 2000)}</span>
			</div>
      <!-- <div class="statistic !w-36">
        <label>avg carbon (all runs)</label>
        <span>{Math.round($averageCarbonAcrossRuns / 2000)}</span>
      </div> -->
			<div class="statistic !w-20">
				<label>tons / year</label>
				<span>{Math.round($carbon / 2000 / $year) || 0}</span>
			</div>
			<div class="statistic">
				<label>biodiversity</label>
				<span style="color: var(--biodiversity)">{(Number($biodiversity) * 100).toFixed(1)}%</span>
			</div>
      <div class="statistic !w-24">
        <label>area (ha)</label>
        <span>1.0</span>
      </div>
		</div>
	</div>

  <!-- <div class="flex grid-fols-2 gap-6 mt-2"> -->

    <div class="flex space-x-2 items-end">
      <div class="opacity-80 text-sm pb-[5px]">Run:</div>
      {#if $runs.length === 0}
        <div class="flex flex-col items-center justify-end">
          <div style="color: var(--accentColor);" class:opacity-10={true}>•</div>
          <div
            class="text-sm rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-5 hover:bg-opacity-20 cursor-pointer"
            style={'background: var(--accentColor); color: var(--backgroundColor);'}
          >1</div>
        </div>
      {:else}
        {#each $runs as run, index}
          <div class="flex flex-col items-center justify-end">
            <div class="flex leading-tight">

            <!-- {#if run.id === $runIdWithHighestCarbon} -->
              <div style="color: var(--accentColor);" class:opacity-10={run.id !== $runIdWithHighestCarbon}>•</div>
            <!-- {/if} -->
            <!-- {#if run.id === $runIdWithHighestBiodiversity} -->
              <div style="color: var(--biodiversity);" class:opacity-10={run.id !== $runIdWithHighestBiodiversity}>•</div>
            <!-- {/if} -->
            </div>
            <div
              on:click={() => displayRun(run.id)}
              class="text-sm rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-5 hover:bg-opacity-20 cursor-pointer"
              style={run.id === $currentRunId ? 'background: var(--accentColor); color: var(--backgroundColor);' : ''}
            >{index + 1}</div>
          </div>
        {/each}
      {/if}
    </div>


    <!-- Diagram -->
    <div class="mb-4 flex">
      <div class="flex-grow rounded flex items-center justify-center" style="background: #efe1db;">
          <svg viewBox="0 0 612 176" class=" w-full" >
            <defs>
              <radialGradient id="treeGradient">
                <stop offset="0%" stop-color="rgba(20,100,20,1)" />
                <stop offset="70%" stop-color="rgba(0,150,0,0.5)" />
                <stop offset="100%" stop-color="rgba(20,100,0,0.0)" />
              </radialGradient>
            </defs>

            {#if renderGraphics}
              <!-- trunks -->
              {#each $trees as tree}
                <circle cx={tree.x} cy={tree.y} r={tree.radius / 10} fill="#3d2311" opacity="0.4" />
              {/each}
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
                    x={tree.x - 4}
                    y={tree.y - 3}
                    style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.speciesId}</text
                  >
                  <text
                    x={tree.x - 4}
                    y={tree.y + 1}
                    style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.age}y</text
                  >
                  <text
                    x={tree.x - 4}
                    y={tree.y + 5}
                    style="z-index: 10; font-family: monospace; font-size: 4px;"
                    >{tree.health.toFixed(1)}</text
                  >
                {/if}
                  <!-- <text
                  x={tree.x - 6}
                  y={tree.y + 6}
                  style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.radius.toFixed(1) * 2}ft</text
                > -->
              {/each}
            {/if}
          </svg>
        <!-- <Slider min={0} max={100} bind:value={$year} /> -->
      </div>


    </div>

    <!-- Charts -->
    <div class="flex-grow rounded pt-2 pb-0 pr-2">
      <Chart />
    </div>
  <!-- </div> -->
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
		font-size: 2rem;
    flex-shrink: 0;
		font-weight: 100;
		line-height: 1;
	}
</style>
