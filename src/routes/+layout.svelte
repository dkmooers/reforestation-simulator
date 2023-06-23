<script>
  import "../app.css";
  // export const ssr = false;
</script>

<div class="flex h-screen w-screen">
  <div class="w-16 bg-gradient-to-br from-purple-800 to-purple-900 border-r border-purple-700 flex-shrink-0 py-3 px-2 text-center flex flex-col space-y-6 items-center">
    {#each ['A', 'B', 'C', 'D'] as item}
      <div class="rounded-full w-8 h-8 bg-black bg-opacity-20 flex items-center justify-center"><div>{item}</div></div>
    {/each}
  </div>
  <div class="flex-grow-0">
    <div class="h-12 bg-stone-200 flex w-full text-stone-700 items-center px-4">
      <div class="font-extrabold">EarthHub</div>
      <div class="rounded-full bg-green-500 border-2 ml-auto w-8 h-8">X</div>
    </div>
    <slot />
  </div>
</div>
