<script lang="ts">
  import Tooltip from "./Tooltip.svelte";
  import {
    bestFitnessByRound,
    currentRunId,
    displayRun,
    enableSelectiveHarvesting,
    fitnessImprovement,
    isRunning,
    isPaused,
    roundIndexViewedInTable,
    rounds,
    runIdWithHighestBiodiversity,
    runIdWithHighestCarbon,
    runIdWithHighestFitness,
    runs,
  } from "$lib/simulator"
  import { last, reverse, sortBy } from "lodash";
  import Statistic from "./Statistic.svelte";

  let isSidebarOpen = true;

  $: runsDisplayedInTable = reverse(sortBy(($roundIndexViewedInTable === $rounds.length ? $runs : $rounds[$roundIndexViewedInTable])?.map((run, index) => ({...run, index: index + 1})), 'fitness', ))

</script>

<div class="py-4 flex-shrink relative bg-[#2a2421] border-l border-[#ad8c6a] border-opacity-50 mr-[-1px] h-screen">
  <div class="{isSidebarOpen ? `${$enableSelectiveHarvesting ? 'w-[22rem]' : 'w-[13.8rem]'} overflow-visible` : 'w-0 overflow-hidden'} flex flex-col min-h-full" style="transition: width 0.2s; ">
    <div class="px-4 flex-grow">

      <div class="flex items-center mb-3 text-sm">
        <label class="mr-2 text-subtle">Generation:</label>
        <select bind:value={$roundIndexViewedInTable} class="text-sm">
          {#if !$rounds.length}
            <option value={0} label="1" />
          {:else}
            {#each $rounds as round, index}
              <option value={index} label={String(index + 1)} />
            {/each}
            {#if $isRunning || $isPaused}
              <option value={$rounds.length} label={String($rounds.length + 1)} />
            {/if}
          {/if}
        </select>
      </div>

      <table class="border-collapse text-xs">
        <thead>
          <th class="w-[1.4rem] text-center">#
            <Tooltip padIcon={false} position="left">Run Number</Tooltip>
          </th>
          <th class="min-w-[2.3rem]">Fit
            <Tooltip padIcon={false} position="left">Fitness: A weighted calculation based on carbon sequestered, biodiversity, and food harvested</Tooltip>
          </th>
          <th class="min-w-[2.3rem]">C
            <Tooltip padIcon={false} position="left">Carbon sequestered</Tooltip>
          </th>
          <th class="min-w-[2.3rem]">Bio
            <Tooltip padIcon={false} position="left">Biodiversity</Tooltip>
          </th>
          <th class="min-w-[2.3rem]">Food
            <Tooltip padIcon={false} position="left">Food Tons Harvested</Tooltip>
          </th>
          {#if $enableSelectiveHarvesting}
            <th class="min-w-[2.8rem]">R<sub>min</sub><br />
              <Tooltip padIcon={false} position="left">Harvest Min Radius: The minimum tree canopy radius at which trees can be harvested.</Tooltip>
            </th>
            <th class="min-w-[3rem]">R<sub>max</sub><br />
              <Tooltip padIcon={false} position="left">Harvest Max Radius: The maximum tree canopy radius at which trees can be harvested.</Tooltip>
            </th>
            <th class="min-w-[2.5rem] text-center">H%<br />
              <Tooltip padIcon={false} position="left">Harvest Chance: The chance that any given eligible tree will be harvested each year.</Tooltip>
            </th>
          {/if}
        </thead>
        {#each runsDisplayedInTable as run, index}
        <!-- {#each reverse(sortBy($runs.filter(run => run.isAllocated).map((run, index) => ({...run, index: index + 1})), 'fitness', )) as run, index} -->
          <tr class="bg-transparent transition-colors {run.id === $currentRunId ? 'current-run' : ''} " style={run.id === $currentRunId ? 'background-color: #0006; bingo: #ad8c6a22; color: white;' : ''}>
            <td class="cursor-pointer text-right  hover:!text-white transition-colors " on:click={() => displayRun(run.id)}>{run.index}</td>
            <td class="text-right" class:!text-yellow-500={run.id === $runIdWithHighestFitness}>{run.fitness ?? '--'}</td>
            <td class="text-right" class:!text-green-400={run.id === $runIdWithHighestCarbon}>{Math.round((last(run.yearlyData.carbon) || 0))}</td>
            <td class="text-right" class:!text-[#af62ff]={run.id === $runIdWithHighestBiodiversity}>{Math.round((run.averageBiodiversity || 0) * 100)}%</td>
            <td class="text-right">{Math.round(run.food || 0)}</td>
            {#if $enableSelectiveHarvesting}
              <td class="text-right">{Math.round(run.scenario.coppiceMinRadius || 0)} ft</td>
              <td class="text-right">{Math.round((run.scenario.coppiceMinRadius + run.scenario.coppiceRadiusSpread) || 0)} ft</td>                  
              <td class="text-right">{Math.round((run.scenario.coppiceChance || 0) * 100)}%</td>
            {/if}
          </tr>
        {/each}
      </table>

      <Statistic
        class="mt-5"
        valueColor="rgb(234, 179, 8)"
        label="Total fitness improvement"
        width="100%"
        value="{Math.max(0, Math.round((($fitnessImprovement || 1) - 1) * 100))}%"
      />

      <div class="flex items-center justify-center text-center mt-4 mb-1 text-subtle text-xs uppercase">
        <span>Best fitness by generation</span>
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

    </div>
    <div class="mt-auto mx-auto px-4 whitespace-nowrap">Built by <a style="color: var(--accentColor); transition: border 0.2s;" class="border-b font-normal border-[#16c264] border-opacity-0 hover:border-opacity-100" href="http://devinmooers.com" target="_blank">Devin Mooers</a></div>
  </div>

  <div class="absolute -left-8 w-8 top-[4.1rem] flex flex-col rounded-l items-center justify-center bg-[#ad8c6a] bg-opacity-10 border border-[#ad8c6a] border-r-0 text-[#ad8c6a] cursor-pointer hover:bg-opacity-20"  style="background: var(--backgroundColor)" on:click={() => isSidebarOpen = !isSidebarOpen}>
    <div class="rotate-90 mt-[1.3rem] text-xs">Ranking</div>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="mt-5 mb-1 w-5 h-5 transition-transform {isSidebarOpen ? '' : 'rotate-180'}">
      <path fill-rule="evenodd" d="M4.72 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 010-1.06zm6 0a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06L17.69 12l-6.97-6.97a.75.75 0 010-1.06z" clip-rule="evenodd" />
    </svg>
  </div>
</div>

<style>
  th {
    padding: 0.2rem 0.4rem;
  }
  td, th {
    border: 1px solid #ad8c6a99;
  }
  td {
    color: #ad8c6a;
    transition: color 0.2s;
    padding: 0 0.4rem;
  }
  tr.current-run {
    color: white !important;
  }
  tr.current-run td {
    color: white;
  }
</style>