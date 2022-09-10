<script lang="ts">
  export let color = ''
  export let percentComplete: number
</script>

<div class="h-[3px] w-full bg-black relative">
  <div class="bg-yellow-500 absolute left-0 top-0 h-full" style="width: {percentComplete}%; transition: width 1s; {color ? `background-color: ${color}` : ''}" />
</div>