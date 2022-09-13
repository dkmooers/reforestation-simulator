<script lang="ts">
  export let position: 'right' | 'left' = 'right';
  export let iconClass = '';
  export let padIcon = true;
</script>


<div class="relative group cursor-pointer py-2 {padIcon ? 'px-1' : ''} flex-shrink-0 flex justify-center {$$props.class || ''}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="-my-2 !w-5 !h-5 text-[#ad8c6a] group-hover:text-white transition-colors cursor-pointer {iconClass ? iconClass : ''}">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
  </svg>
  <div class="{$$props.class ?? ''} hover:visible flex flex-1 z-20 w-72 max-w-2xl whitespace-normal peer-hover:visible text-sm text-left font-light absolute top-0 text-white normal-case {position === 'right' ? 'left-4 justify-start' : 'right-4 justify-end'} px-4 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100 leading-5">
    <div class="px-4 py-3 bg-black bg-opacity-70 backdrop-blur rounded shadow-lg peer"><slot /></div>
  </div>
</div>