<script lang="ts">
  import { onMount } from "svelte";

  import { fly } from "svelte/transition"
  let isVisible = false
  let duration = 4000
  let isCountingDown = false

  onMount(() => {
    self.onmessage = (msg) => {
      if (msg.data.type === 'roundComplete') {
        isVisible = true
        setTimeout(() => {
          isCountingDown = true
        }, 10)
        setTimeout(() => isVisible = false, duration)
      }
    }
  })
</script>

{#if isVisible}
  <div transition:fly={{x: 200}} class="fixed top-4 right-4 z-10 text-sm text-white text-opacity-80 bg-[#ad8c6a] bg-opacity-30 shadow-lg backdrop-blur-sm rounded">
    <div class="modal-content max-w-full rounded-lg shadow-lg flex relative">
      <div style="background: var(--accentColor); transition: width {duration/1000}s" class="!bg-orange-500 absolute inset-0 rounded opacity-10 w-[0%]"
      class:!w-full={isCountingDown}></div>
      <div class="px-6 py-4">Generation Complete</div>
      <div on:click={() => isVisible = false} class="relative z-20 font-mono border-l text-[#ad8c6a] text-opacity-70 bg-black bg-opacity-10 border-white border-opacity-10 px-6 py-2 hover:bg-opacity-30 transition-colors rounded-r cursor-pointer text-lg flex items-center">x</div>
    </div>
  </div>  
{/if}