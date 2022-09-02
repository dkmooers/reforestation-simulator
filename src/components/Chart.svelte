<script>
  import * as Pancake from '@sveltejs/pancake';
  import { runs, currentRunId, numYearsPerRun } from '../stores/store';
  import { fade } from "svelte/transition"
  import { last } from 'lodash';
  import { max } from 'lodash';

  // let points = [] 
  let runsData = []
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
    // let maxCarbon = carbonValuesOfEachRun.reduce((max, thisRunCarbon) => thisRunCarbon > max ? thisRunCarbon : max, 0)
    // const pointsMax = last(points)?.carbon
    // console.log(pointsMax)
    // if (pointsMax && pointsMax > maxCarbon) {
    //   maxCarbon = pointsMax
    // }
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

  // $: console.log(runsData)

  $: currentRunData = runsData?.find(data => data?.[0].id === $currentRunId)

  // $: {
  //   points = $yearlyCarbon?.map((carbonValue, index) => {
  //     return {
  //       date: index + 1,
  //       carbon: carbonValue / 2000,
  //       trees: $yearlyTrees[index],
  //     }
  //   });
  //   if (points?.length > 1) {
  //     maxx = Math.max(numYearsPerRun, points?.[points.length - 1]?.date);
  //     // for (let i = 0; i < points.length; i += 1) {
  //     //   const point = points[i];

  //     //   if (point.avg < miny) {
  //     //     miny = point.avg;
  //     //   }

  //     //   if (point.avg > maxy) {
  //     //     maxy = point.avg;
  //     //     highest = point;
  //     //   }
  //     // }
  //   }
  // }

  miny = 0;

  const percent = date => {
    return 100 * (date - minx) / (maxx - minx);
  };

  // getInsolationData()
</script>

<div transition:fade class="relative chart flex flex-col text-[rgb(230 201 166)] p-2">
  <div class="mx-auto font-light -mb-3 text-[#ad8c6a] text-sm flex items-center">
    <span class="swatch carbon"></span>
    Carbon sequestered by run<span class="font-light ml-1">(tons)</span>
    <span class="swatch trees ml-6"></span>
    Number of trees
    <span class="swatch biodiversity ml-6"></span>
    Biodiversity
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
        <!-- <Pancake.SvgScatterplot data={points} x="{d => d.date}" y="{d => d.avg}" let:d>
          <path class="avg scatter" {d} />
        </Pancake.SvgScatterplot>

        <Pancake.SvgLine data={points} x="{d => d.date}" y="{d => d.carbon}" let:d>
          <path class="carbon active" {d} />
        </Pancake.SvgLine> -->

        {#each runsData as data}
          <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.carbon}" let:d>
            <path class="carbon" class:active={data?.[0].id === $currentRunId} {d} />
          </Pancake.SvgLine>
          <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.biodiversity * maxy}" let:d>
            <path class="biodiversity" class:active={data?.[0].id === $currentRunId} {d} />
          </Pancake.SvgLine>
          {#if showTrees}
            <Pancake.SvgLine data={data} x="{d => d.date}" y="{d => d.trees}" let:d>
              <path class="trees" class:active={data?.[0].id === $currentRunId} {d} />
            </Pancake.SvgLine>
          {/if}
        {/each}

        <!-- <Pancake.SvgLine data={points} x="{d => d.date}" y="{d => d.trees}" let:d>
          <path class="trees active" {d} />
        </Pancake.SvgLine> -->
      </Pancake.Svg>
    {/if}

    <!-- chart title -->
    <!-- <Pancake.Point x={1962} y={390}>
      <div class="text">
        <h2>Daily Power</h2>

        <p>
          <span style="color: #676778">•</span>
          <span>monthly average&nbsp;&nbsp;&nbsp;</span>
          <span style="color: #ff3e00">—</span>
          <span>trend</span>
        </p>
      </div>
    </Pancake.Point> -->

    <!-- annotate highest point -->
    <!-- <Pancake.Point x={highest.date} y={highest.avg}>
      <div class="annotation" style="position: absolute; right: 0.5em; top: -0.5em; white-space: nowrap; line-height: 1; color: #666;">
        {highest.avg} parts per million (ppm) &rarr;
      </div>
    </Pancake.Point> -->

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

<!-- <p>Source: <a target="_blank" href="https://scrippsco2.ucsd.edu/data/atmospheric_co2/primary_mlo_co2_record.html">Scripps Institution of Oceanography</a>. Based on <a href="https://www.bloomberg.com/graphics/climate-change-data-green/carbon-clock.html">Carbon Clock by Bloomberg</a>.</p> -->

<style>
  .chart {
    height: 100%;
    padding: 0 0 2em 2em;
    margin: 0 0 36px 0;
    /* max-width: 80em; */
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
    /* color: #999; */
  }

  .year-label {
    position: absolute;
    width: 4em;
    left: -2em;
    bottom: -30px;
    font-family: sans-serif;
    font-size: 14px;
    /* color: #999; */
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
    /* display: inline-block; */
    width: 12px;
    height: 12px;
    border-radius: 100%;
    margin-right: 6px;
  }
  .swatch.carbon {
    background-color: #16c264;
  }
  .swatch.trees {
    background-color: #aea798;
  }

  .swatch.biodiversity {
    background-color: #af62ff;
  }

  path.trees {
    stroke: #aea798;
    opacity: 0.3;
    transition: opacity 0.2s stroke-width 0.2s;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  path.scatter {
    stroke-width: 3px;
  }

  path.carbon {
    stroke: #16c264;/*#ff3e00;*/
    opacity: 0.3;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  path.active {
    stroke-width: 2px !important;
    opacity: 1 !important;
  }

  path.biodiversity {
    stroke: rebeccapurple;
    opacity: 0.5;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  .focus {
    position: absolute;
    width: 10px;
    height: 10px;
    left: -5px;
    top: -5px;
    border: 1px solid black;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .tooltip {
    position: absolute;
    white-space: nowrap;
    width: 8em;
    bottom: 1em;
    /* background-color: white; */
    color: rgb(230 201 166);
    line-height: 1;
    text-shadow: 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27), 0 0 10px rgb(40 34 27);
  }

  .tooltip strong {
    font-size: 1.4em;
    display: block;
  }

  /* @media (min-width: 800px) {
    .chart {
      height: 600px;
    }
  } */
</style>