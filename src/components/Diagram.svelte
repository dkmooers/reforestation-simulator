<script lang="ts">
  import { fade } from "svelte/transition"
  import {
    currentRound,
    currentRunId,
    currentRun,
    runs,
    toggleRunSimulation,
  } from "$lib/simulator"
  import Loader from "./Loader.svelte";

  let colorMode = 'colorized' // or 'shaded'
</script>

<div class="mb-2 flex bg-[#efe1db] rounded z-10">
  <div class="flex-grow rounded-lg flex items-center justify-center relative">
    {#if $currentRound === 0}
      <div class="w-full h-full absolute inset-0 flex items-center align-center flex-grow p-6">
        <div class="flex-grow items-center flex-initial flex flex-col">
          <div class="text-dark max-w-md text-center mx-auto mb-4 opacity-70 text-sm">This simulation uses multithreaded web workers. A four-core CPU is recommended for best performance.</div>
          <div class="text-dark max-w-md text-center mx-auto mb-4 opacity-70 text-sm">Depending on your computer's speed, the simulation can take up to 10 minutes to complete. Feel free to pause it at any time.</div>
          <button
            class="button-primary mx-auto mb-4 text-black text-opacity-75 transition-opacity hover:opacity-80 text-xl px-6 py-2 {false ? 'opacity-70 cursor-not-allowed pointer-events-none' : ''}"
            on:click={() => {
              toggleRunSimulation();
            }}
          >
            <span class="w-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                </svg>
            </span>

            <span class="font-light">Run</span>
          </button>
        </div>
      </div>
    {/if}
    {#if $currentRound === 1 && $runs.filter(run => run.isAllocated).length === 0}
      <div class="flex-col w-full h-full absolute inset-0 flex items-center justify-center flex-grow">
        <Loader size="4rem" />
      </div>
    {/if}
    <svg viewBox="0 0 392 112" class="w-full">
      <defs>
        <radialGradient id="treeGradient">
          <stop offset="0%" stop-color="rgba(20,100,20,1)" />
          <stop offset="70%" stop-color="rgba(0,150,0,0.5)" />
          <stop offset="100%" stop-color="rgba(20,100,0,0.0)" />
        </radialGradient>
      </defs>
          
      {#key $currentRunId}  
        <g in:fade={{delay: 50}} out:fade={{duration: 50}}>
            <!-- trunks -->
            <!-- {#each $trees as tree}
              <circle cx={tree.x} cy={tree.y} r={tree.radius / 10} fill="#3d2311" opacity="0.4" />
            {/each} -->
            <!-- foliage canopies -->
            {#each $currentRun?.trees || [] as tree}
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
            {#each $currentRun?.trees || [] as tree}
              <circle
                cx={tree.x}
                cy={tree.y}
                r={tree.radius}
                stroke="rgba(0,50,0,0.2)"
                style="z-index: 1"
                fill="transparent"
                stroke-width="0.25"
              />
              <!-- <text
                x={tree.x - tree.speciesId.length}
                y={tree.y}
                style="z-index: 10; font-family: monospace; font-size: 3px;">{tree.speciesId}</text
              > -->
              <!-- 
              <text
                x={tree.x - 5}
                y={tree.y + 2}
                style="z-index: 10; font-family: monospace; font-size: 4px;"
              >
                {tree.age} y
              </text>
              <text
                x={tree.x - 5}
                y={tree.y + 6}
                style="z-index: 10; font-family: monospace; font-size: 4px;"
              >
                {Math.round(tree.radius * 2)} ft
              </text>
              <text
                x={tree.x - 4}
                y={tree.y + 5}
                style="z-index: 10; font-family: monospace; font-size: 4px;"
              >
                {tree.health.toFixed(1)}
              </text>
              <text
                x={tree.x - 6}
                y={tree.y + 6}
                style="z-index: 10; font-family: monospace; font-size: 4px;">
                {tree.radius.toFixed(1) * 2}ft
              </text>
              -->
            {/each}
        </g>
      {/key}

    </svg>
  </div>
</div>