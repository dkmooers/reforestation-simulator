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
  <div transition:fly class="fixed w-screen h-screen inset-0 z-50 bg-white bg-opacity-20 backdrop-blur flex items-center justify-center">
    <div class="modal-content max-w-full w-[30rem] rounded-lg shadow-lg p-6">
      <h1 class="text-center flex flex-col items-center mb-6">
        <span class="pb-3 w-12">
            <img alt="Tree icon" src="/treeicon.png" />
        </span>
        <span class="opacity-70">Welcome to</span>
        <b class="whitespace-nowrap">Reforestation Simulator</b>
      </h1>
      <div class="space-y-3 flex flex-col">
        <p>This app prototype uses genetic algorithms to find optimal reforestation scenarios that maximize both carbon sequestration <em>and</em> biodiversity.</p>
        <p>The app plants different mixtures of temperate tree species on one acre of land, and then simulates 100 years of tree growth, harvesting, and self-seeding by calculating the sunlight available to each tree.</p>
        <p>The goal is to find the initial makeup of tree species, and the frequency of harvesting, that leads to the highest sequestered carbon and biodiversity.</p>
        <p>It runs multiple scenarios in parallel using multithreaded web workers, evolves successive generations using crossover and mutation, and stops after 20 generations.</p>
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
    transition: opacity 0.2s;
    color: rgba(0,0,0,0.7);
  }
  button:hover {
    background-color: var(--accentColor);
    opacity: 0.8;
  }
  .modal-content {
    background-color: var(--backgroundColor);
  }
</style>