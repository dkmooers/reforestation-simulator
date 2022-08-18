<script>
  import * as Pancake from '@sveltejs/pancake';
  import { currentRun, trees } from '../stores/store';
  import { get } from 'svelte/store';
  import { insolationData } from '../data/insolation.js';
  import { draw } from "svelte/transition"

  // const data = tsv
  //   .split('\n')
  //   .map(str => {
  //     let [date, avg, trend] = str.split('\t').map(parseFloat);
  //     if (avg === -99.99) avg = null;

  //     return { date, avg, trend };
  //   });

  // let points = data.filter(d => d.avg);
  let weightedAvgValues = []
  const weightedAvgDays = 28
  let points = []

  // let points = insolationData.days.map((day, index) => {
  //   if (weightedAvgValues.length >= weightedAvgDays) {
  //     weightedAvgValues.shift()
  //   }
  //   const scaledSolarEnergy = day.solarenergy / 3.6 // to get from MJ/m2 to kWh/m2
  //   weightedAvgValues = [...weightedAvgValues, scaledSolarEnergy]
  //   const weightedAvg = weightedAvgValues.reduce((a, b) => a + b, 0) / weightedAvgValues.length
  //   return {
  //     date: 2021 + index / 365,
  //     trend: weightedAvg,
  //     avg: scaledSolarEnergy.toFixed(2)
  //   }
  // });
  // console.log(points)

  let minx = 0;
  let maxx = 100;
  let miny = 0;
  let maxy = 1000;
  let highest;

  $: {
    points = $currentRun?.yearlyData?.carbon?.map((carbonValue, index) => {
      // if (weightedAvgValues.length >= weightedAvgDays) {
      //   weightedAvgValues.shift()
      // }
      // const scaledSolarEnergy = day.solarenergy / 3.6 // to get from MJ/m2 to kWh/m2
      // weightedAvgValues = [...weightedAvgValues, scaledSolarEnergy]
      // const weightedAvg = weightedAvgValues.reduce((a, b) => a + b, 0) / weightedAvgValues.length
      return {
        date: index,
        avg: carbonValue / 2000,
        trend: $currentRun.yearlyData.trees[index],
        // date: 2021 + index / 365,
        // trend: weightedAvg,
        // avg: scaledSolarEnergy.toFixed(2)
      }
    });
    // console.log(points)
    if (points?.length > 1) {
      minx = points?.[0]?.date;
      maxx = Math.max(100, points?.[points.length - 1]?.date);
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];

        if (point.avg < miny) {
          miny = point.avg;
        }

        if (point.avg > maxy) {
          maxy = point.avg;
          highest = point;
        }
      }
    }
  }



  miny = 0;

  const months = 'Jan Feb Mar Apr May June July Aug Sept Oct Nov Dec'.split(' ');

  const format = date => {
    const year = ~~date;
    const month = Math.floor((date % 1) * 12);

    return `${months[month]} ${year}`;
  };

  const pc = date => {
    return 100 * (date - minx) / (maxx - minx);
  };

  // getInsolationData()
</script>

<div class="relative chart flex flex-col text-[rgb(230 201 166)] p-2">
  <div class="mx-auto font-normal mb-3 text-xl">Carbon Sequestered <span class="font-light">(tons)</span></div>
  <Pancake.Chart x1={minx} x2={maxx} y1={miny} y2={maxy}>
    <Pancake.Grid horizontal count={3} let:value let:last>
      <div class="grid-line horizontal"><span>{value} {last ? 'tons' : ''}</span></div>
    </Pancake.Grid>

    <Pancake.Grid vertical count={5} let:value>
      <div class="grid-line vertical"></div>
      <span class="year-label">{value}</span>
    </Pancake.Grid>
    

    {#if points?.length}
      <Pancake.Svg>
        <Pancake.SvgScatterplot data={points} x="{d => d.date}" y="{d => d.avg}" let:d>
          <path class="avg scatter" {d} />
        </Pancake.SvgScatterplot>

        <Pancake.SvgLine data={points} x="{d => d.date}" y="{d => d.avg}" let:d>
          <path class="trend" {d} />
        </Pancake.SvgLine>

        <Pancake.SvgLine data={points} x="{d => d.date}" y="{d => d.trend}" let:d>
          <path class="avg" {d} />
        </Pancake.SvgLine>
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

    {#if points?.length}

      <Pancake.Quadtree data={points} x="{d => d.date}" y="{d => d.avg}" let:closest>
        {#if closest}
          <Pancake.Point x={closest.date} y={closest.avg} let:d>
            <div class="focus"></div>
            <div class="tooltip" style="transform: translate(-{pc(closest.date)}%,0)">
              <strong class="font-normal text-[#16c264]"><span>{Math.round(closest.avg)}</span> <span class="font-extralight">tons</span></strong>
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
    opacity: 0.7;
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

  path.avg {
    stroke: #676778;
    opacity: 0.5;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 1px;
    fill: none;
  }

  path.scatter {
    stroke-width: 3px;
  }

  path.trend {
    stroke: #16c264;/*#ff3e00;*/
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 2px;
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