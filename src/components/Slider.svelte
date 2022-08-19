<script lang="ts">
  export let min = 0
  export let max = 100
  export let value = 50
</script>

<label for="default-range" class="block text-sm font-medium">Year</label>
<input id="default-range" type="range" {min} {max} bind:value={value} class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700">