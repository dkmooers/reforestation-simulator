<div class="relative group pr-2 cursor-pointer">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 ml-3 text-[#ad8c6a] group-hover:text-white transition-colors cursor-pointer">
    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
  </svg>
  <div class="z-10 w-64 max-w-2xl whitespace-normal text-base absolute top-0 left-10 invisible group-hover:visible transition-opacity opacity-0 group-hover:opacity-100 bg-black bg-opacity-70 backdrop-blur px-4 py-3 rounded shadow-lg leading-5">
    <slot />
  </div>
</div>