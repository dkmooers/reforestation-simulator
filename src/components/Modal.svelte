<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition"
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
      <h1>Welcome to Reforestation Simulator!</h1>
      <div class="space-y-3 flex flex-col">
        <p>This app prototype plants random trees on 1 hectare of land, and then simulates 100 years of tree growth and self-seeding by calculating the sunlight available to each tree.</p>
        <p>The goal is to find the initial mix of tree species and densities that leads to the highest sequestered carbon and biodiversity, and the least number of initial trees that need to be planted.</p>
        <p>It runs the simulation a number of times using multithreaded web workers, charts the carbon values, and highlights the best runs.</p>
        <button class="px-8 py-2 text-lg font-bfold mx-auto" on:click={() => isVisible = false}>Go</button>
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