<script lang="ts">
  import Tooltip from "./Tooltip.svelte"

  export let label = ''
  export let value: number | string
  export let width = '6rem' // any valid CSS units
  export let tooltip = ''
  export let tooltipPosition: 'left' | 'right' = 'right'
  export let valueColor = 'inherit'
</script>

<div class="statistic {$$props.class || ''}" style="width: {width};">
  <div class="flex items-center justify-center" class:mt-[-2px]={!!tooltip}>
    <label>{label}</label>
    {#if tooltip}
      <Tooltip position={tooltipPosition}>{tooltip}</Tooltip>
    {/if}
  </div>
  <span style="color: {valueColor}">{value}</span>
</div>

<style>
  .statistic {
    display: flex;
    flex-direction: column;
    text-align: center;
    margin-right: 1rem;
    flex-shrink: 0;
  }
  .statistic label {
    flex-shrink: 0;
    line-height: 1.5;
    color: #ad8c6a;
    text-transform: uppercase;
    font-size: 0.7rem;
  }
  .statistic span {
    font-size: 1.8rem;
    flex-shrink: 0;
    font-weight: 100;
    line-height: 1;
  }
</style>