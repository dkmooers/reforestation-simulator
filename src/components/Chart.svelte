<script lang="ts">
  import * as Pancake from '@sveltejs/pancake';
  import { runs, currentRunId, numYearsPerRun } from '../lib/simulator';
  import { fade } from "svelte/transition"
  import { last } from 'lodash';
  import { max } from 'lodash';
  import Tooltip from './Tooltip.svelte';

  let runsData: Array<{
    date: number[]
    carbon: number[]
    trees: number[]
    biodiversity: number[]
    id: number
  }> = []
  let showCarbon = true
  let showBiodiversity = true
  let showTrees = true

  let minx = 0;
  let maxx = numYearsPerRun;
  let miny = 0;
  let maxy = 4000;

  $: {
    const carbonValuesOfEachRun = $runs.map(run => last(run.yearlyData.carbon))
    let maxCarbon = max(carbonValuesOfEachRun) / 2000
    let maxTrees = 0
    if (showTrees) {
      maxTrees = max($runs?.map(run => max(run.yearlyData.trees))) || 0
    }
    const maxYToUse = (Math.max(maxCarbon, maxTrees))
    maxy = maxYToUse ? maxYToUse : maxy
  }

  $: runsData = $runs.map(run => run.yearlyData.carbon.map((carbonValue, index) => ({
    date: index + 1,
    carbon: carbonValue / 2000,
    trees: run.yearlyData.trees[index],
    biodiversity: run.yearlyData.biodiversity[index],
    id: run.id
  })))

  $: currentRunData = runsData?.find(data => data?.[0].id === $currentRunId)

  miny = 0;

  const percent = date => {
    return 100 * (date - minx) / (maxx - minx);
  };

</script>

<div transition:fade class="relative chart flex flex-col text-[rgb(230 201 166)] p-2">
  <div class="z-10 bg-black bg-opacity-50 rounded-[12px] py-[3px] px-2 mx-auto font-light mb-[-13px] text-[#ad8c6a] text-sm flex items-center">
    <span class="swatch carbon" class:active={showCarbon} on:click={() => showCarbon = !showCarbon}></span>
    Carbon sequestered by run<span class="font-light ml-1">(tons)</span>
    <!-- {#if showTrees} -->
      <span class="swatch trees ml-6" class:active={showTrees} on:click={() => showTrees = !showTrees}></span>
      Number of trees
    <!-- {/if} -->
    <span class="swatch biodiversity ml-6" class:active={showBiodiversity}  on:click={() => showBiodiversity = !showBiodiversity}></span>
    Biodiversity
    <Tooltip>On its own scale, from 0 - 100% vertically.</Tooltip>
  </div>
  <Pancake.Chart x1={minx} x2={maxx} y1={miny} y2={maxy}>

    <Pancake.Grid horizontal count={3} let:value let:last>
      <div class="grid-line horizontal"><span>{value} {last ? '' : ''}</span></div>
    </Pancake.Grid>

    <Pancake.Grid vertical count={5} let:value>
      <div class="grid-line vertical"></div>
      <span class="year-label">{value}</span>
    </Pancake.Grid>
  
    {#if runsData?.length}
      <Pancake.Svg>
        {#each runsData as data}

          {#if data.length < numYearsPerRun}
            {#if showCarbon}
              <Pancake.SvgScatterplot data={[last(data)]} x="{d => d.date}" y="{d => d.carbon}" let:d>
                <path class="carbon scatter" {d} />
              </Pancake.SvgScatterplot>
            {/if}
            {#if showBiodiversity}
              <Pancake.SvgScatterplot data={[last(data)]} x="{d => d.date}" y="{d => d.biodiversity * maxy}" let:d>
                <path class="biodiversity scatter" {d} />
              </Pancake.SvgScatterplot>
            {/if}
            {#if showTrees}
              <Pancake.SvgScatterplot data={[last(data)]} x="{d => d.date}" y="{d => d.trees}" let:d>
                <path class="trees scatter" {d} />
              </Pancake.SvgScatterplot> 
            {/if}
          {/if}

          {#if showCarbon}
            <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.carbon}" let:d>
              <path class="carbon" class:active={data?.[0].id === $currentRunId} {d} />
            </Pancake.SvgLine>
          {/if}
          {#if showBiodiversity}
            <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.biodiversity * maxy}" let:d>
              <path class="biodiversity" class:active={data?.[0].id === $currentRunId} {d} />
            </Pancake.SvgLine>
          {/if}
          {#if showTrees}
            <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.trees}" let:d>
              <path class="trees" class:active={data?.[0].id === $currentRunId} {d} />
            </Pancake.SvgLine>
          {/if}
        {/each}

      </Pancake.Svg>
    {/if}

    {#if currentRunData}

      <Pancake.Quadtree data={currentRunData} x="{d => d.date}" y="{d => d.carbon}" let:closest>
        {#if closest}
          <Pancake.Point x={closest.date} y={closest.carbon} let:d>
            <div class="focus"></div>
            <div class="tooltip" style="transform: translate(-{percent(closest.date)}%,0)">
              <strong class="font-normal text-[#16c264]"><span>{Math.round(closest.carbon)}</span> <span class="font-extralight">tons</span></strong>
              <span class="opacity-70">Year {closest.date}</span>
            </div>
          </Pancake.Point>
        {/if}
      </Pancake.Quadtree>

    {/if}
  </Pancake.Chart>
  <div class="absolute bottom-0 left-1/2 ">year</div>
</div>

<style>
  .chart {
    height: 100%;
    padding: 0 0 2em 2em;
    margin: 0 0 36px 0;
    margin: 0 auto;
  }

  .grid-line {
    position: relative;
    display: block;
    opacity: 0.3;
    border-color: rgb(230 201 166) !important;
  }

  .grid-line.horizontal {
    width: calc(100% + 2em);
    left: -2em;
    border-bottom: 1px dashed #ccc;
  }

  .grid-line.vertical {
    height: 100%;
    border-left: 1px dashed #ccc;
  }

  .grid-line span {
    position: absolute;
    left: 0;
    bottom: 2px;
    line-height: 1;
    font-family: sans-serif;
    font-size: 14px;
  }

  .year-label {
    position: absolute;
    width: 4em;
    left: -2em;
    bottom: -30px;
    font-family: sans-serif;
    font-size: 14px;
    text-align: center;
  }

  .text {
    position: absolute;
    width: 15em;
    line-height: 1;
    color: #666;
    transform: translate(0,-50%);
    text-shadow: 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white, 0 0 8px white;
  }

  .text p {
    margin: 0;
    line-height: 1.2;
    color: #999;
  }

  .text h2 {
    margin: 0;
    font-size: 1.4em;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 100%;
    border: 2px solid transparent;
    margin-right: 6px;
  }

  .swatch.carbon {
    border-color: #16c264;
  }
  .swatch.carbon.active {
    background-color: #16c264;
  }
  .swatch.trees {
    border-color: #aea798;
  }
  .swatch.trees.active {
    background-color: #aea798;
  }

  .swatch.biodiversity {
    border-color: #af62ff;
  }
  .swatch.biodiversity.active {
    background-color: #af62ff;
  }

  path.trees {
    stroke: #aea798;
    opacity: 0.2;
    transition: opacity 0.2s stroke-width 0.2s;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  path.scatter {
    opacity: 1 !important;
    stroke-width: 2.5px !important;
  }

  path.carbon {
    stroke: #16c264;
    opacity: 0.25;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  path.active {
    stroke-width: 2px !important;
    opacity: 1 !important;
  }

  path.trees.active {
    opacity: 0.8 !important;
  }

  path.biodiversity {
    stroke: #af62ff;
    opacity: 0.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }
  path.biodiversity.active {
    opacity: 0.8 !important;
  }

  .focus {
    position: absolute;
    width: 10px;
    height: 10px;
    left: -5px;
    top: -5px;
    border: 2px solid #16c264;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .tooltip {
    position: absolute;
    white-space: nowrap;
    width: 8em;
    bottom: 1em;
    color: rgb(230 201 166);
    line-height: 1;
    text-shadow: 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27);
  }

  .tooltip strong {
    font-size: 1.4em;
    display: block;
  }
</style>