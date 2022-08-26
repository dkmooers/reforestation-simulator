<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition"
  import TreeIcon from "./TreeIcon.svelte";
  let isVisible = false

  onMount(() => {
    setTimeout(() => {
      isVisible = true
    }, 1)
  })
</script>

{#if isVisible}
  <div transition:fly class="fixed w-screen h-screen inset-0 z-10 bg-white bg-opacity-20 backdrop-blur flex items-center justify-center">
    <div class="modal-content max-w-full w-[30rem] rounded-lg shadow-lg p-6">
      <h1 class="text-center flex flex-col items-center mb-6">
        <span class="pb-3">
          <TreeIcon />
        </span>
        <span class="opacity-70">Welcome to</span>
        <b class="whitespace-nowrap">Reforestation Simulator</b>
      </h1>
      <div class="space-y-3 flex flex-col">
        <p>This app prototype plants random trees on 1 hectare of land, and then simulates 100 years of tree growth and self-seeding by calculating the sunlight available to each tree.</p>
        <p>The goal is to find the initial mix of tree species and densities that leads to the highest sequestered carbon and biodiversity, and the least number of initial trees that need to be planted.</p>
        <p>It runs the simulation a number of times using multithreaded web workers, charts the carbon values, and highlights the best runs.</p>
        <div>
          <button class="px-8 py-2 mt-3 mb-2 text-lg font-bfold mx-auto flex space-x-2" on:click={() => isVisible = false}>
            <span>Go</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 

<style>
  button {
    background-color: var(--accentColor);
    color: rgba(0,0,0,0.7);

  }
  .modal-content {
    background-color: var(--backgroundColor);
  }
</style>