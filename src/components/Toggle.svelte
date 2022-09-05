<script lang="ts">
  export let checked: boolean
  export let label: string = ""
  export let disabled: boolean = false

  $: console.log(checked)
</script>

<label for="small-toggle" class="inline-flex relative items-center cursor-pointer">
  <input type="checkbox" bind:checked={checked} id="small-toggle" class="sr-only peer" disabled={disabled}>
  <div class:opacity-60={disabled} class:cursor-default={disabled} class="w-9 h-5 bg-white bg-opacity-20 peer-focus:outline-none  rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-[#16c264]"></div>
  {#if label}
    <span class="ml-3 text-sm font-medium whitespace-nowrap">{label}</span>
  {/if}
</label>