<script lang="ts">
  import Chart from '../components/Chart.svelte';

	import {
		addNRandomTrees,
		calculateOverlaps,
		run,
		reset,
		stepNYears,
    numSpecies,
		year,
		carbon,
		biodiversity,
		pruneOverflowTrees,
		declusterTrees,
    runs,
    displayRun,
    currentRunId,
    currentRun,
	} from '../stores/store';

	let renderGraphics = true;
  let colorMode = 'colorized';
</script>

<div
  class="flex flex-col items-stretch h-screen p-4 overflow-hidden"
>
  <div class="flex items-start">
    <div>
      <h1 class="whitespace-nowrap mr-6 mb-1">Tree Growth Simulator</h1>
    </div>
    
    <div class="flex space-x-4 items-center ml-auto bg-black bg-opacity-40 px-4 py-2 rounded">
      <label class="flex items-center whitespace-nowrap">
        Render graphics
        <input type="checkbox" bind:checked={renderGraphics} />
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
      <div class="italic leading-tight mb-4 opacity-60 text-sm">An app design showcase with a simplified biological tree growth model, propagation model, and carbon calculation model.</div>

      <!-- Buttons -->
      <div class="mr-6">
        <div class="whitespace-nowrap" >
          <button
            class="text-black text-opacity-75"
            style="background: var(--accentColor);"
            on:click={() => {
              run();
            }}>Run</button
          >
          <button on:click={() => stepNYears(1)}>+1 year</button>
          <button on:click={() => stepNYears(5)}>+5 years</button>
          <button on:click={() => stepNYears(10)}>+10 years</button>
          <button on:click={() => stepNYears(50)}>+50 years</button>
          <button on:click={() => reset()}>Reset</button>
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
				<span>{$currentRun?.trees.length || 0}</span>
			</div>
      <div class="statistic !w-2f0">
        <label>species</label>
        <span>{$numSpecies}</span>
      </div>
			<div class="statistic">
				<label>carbon (tons)</label>
				<span style="color: var(--accentColor)">{Math.round($carbon / 2000)}</span>
			</div>
			<div class="statistic !w-2f0">
				<label>tons / year</label>
				<span>{Math.round($carbon / 2000 / $year) || 0}</span>
			</div>
			<div class="statistic">
				<label>biodiversity</label>
				<span>{(Number($biodiversity) * 100).toFixed(1)}%</span>
			</div>
      <div class="statistic">
        <label>area (hectares)</label>
        <span>1.0</span>
      </div>
		</div>
	</div>

  <!-- <div class="flex grid-fols-2 gap-6 mt-2"> -->

    <div class="flex space-x-2 mt-2 items-center">
      <div class="opacity-80 text-sm">Run:</div>
      {#each $runs as run}
        <div
          on:click={() => displayRun(run.id)}
          class="text-sm rounded-t border-t border-l border-r border-orange-100 border-opacity-20 px-2 py-[0.125rem] bg-white bg-opacity-5 hover:bg-opacity-20 cursor-pointer"
          style={run.id === $currentRunId ? 'background: var(--accentColor); color: var(--backgroundColor);' : ''}
        >{run.id}</div>
      {/each}
    </div>


    <!-- Diagram -->
    <div class="mb-4 flex">
      <div class="flex-grow">
        <svg viewBox="0 0 490 140" class="rounded w-full" style="background: #efe1db;">
          <defs>
            <radialGradient id="treeGradient">
              <stop offset="0%" stop-color="rgba(20,100,20,1)" />
              <stop offset="70%" stop-color="rgba(0,150,0,0.5)" />
              <stop offset="100%" stop-color="rgba(20,100,0,0.0)" />
            </radialGradient>
          </defs>

          {#if renderGraphics}
            <!-- trunks -->
            {#each $livingTrees as tree}
              <circle cx={tree.x} cy={tree.y} r={tree.radius / 10} fill="#3d2311" opacity="0.4" />
            {/each}
            <!-- foliage canopies -->
            {#each $livingTrees as tree}
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
            {#each $livingTrees as tree}
              <circle
                cx={tree.x}
                cy={tree.y}
                r={tree.radius}
                stroke="rgba(0,50,0,0.2)"
                style="z-index: 1"
                fill="transparent"
                stroke-width="0.5"
              />
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
              <!-- <text
              x={tree.x - 6}
              y={tree.y + 6}
              style="z-index: 10; font-family: monospace; font-size: 4px;">{tree.radius.toFixed(1) * 2}ft</text
            > -->
            {/each}
          {/if}
        </svg>
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
    margin-right: 1rem;
    flex-shrink: 0;
	}
	.statistic label {
		line-height: 1.5;
    color: #ad8c6a;
    text-transform: uppercase;
    font-size: 0.7rem;
		/* color: #d49352; */
	}
	.statistic span {
		font-size: 2rem;
		font-weight: 100;
		line-height: 1;
	}
</style>
