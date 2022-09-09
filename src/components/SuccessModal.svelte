<script lang="ts">
  import { elapsedTime } from "../stores/store";
  import { onDestroy, onMount } from "svelte";
  import { fly } from "svelte/transition"
  import { browser } from "$app/environment";
  let isVisible = false

  const trigger = () => {
    isVisible = true
  }

  onMount(() => {
    if (browser) {
      window.addEventListener('runFinished', trigger)
    }
  })

  onDestroy(() => {
    if (browser) {
      window.removeEventListener('runFinished', trigger)
    }
  })

</script>

{#if isVisible}
  <div transition:fly class="fixed w-screen h-screen inset-0 z-50 bg-white bg-opacity-20 backdrop-blur flex items-center justify-center">
    <div class="modal-content max-w-full w-[30rem] rounded-lg shadow-lg p-6">
      <h1 class="text-center flex flex-col items-center mb-6">
        <span class="pb-3 w-12">
            <img alt="Tree icon" src="/treeicon.png" />
        </span>
        <span class="opacity-70">Run Complete</span>
      </h1>
      <div class="space-y-2 flex flex-col">
        <div class="text-center">Completed in <span class="text-green-400">{Math.floor($elapsedTime / 60)}</span> minutes <span class="text-green-400">{Math.floor($elapsedTime % 60)}</span> seconds.
        </div>
        <div class="text-center">
          Close this window to see details of the best-performing tree planting scenario:
        </div>
        <div>
          <button class="button-primary px-8 py-2 mt-3 mb-2 text-lg font-bfold mx-auto flex space-x-2" on:click={() => isVisible = false}>
            <span>See details</span>
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