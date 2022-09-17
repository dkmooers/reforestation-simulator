<script lang="ts">
	import { browser } from "$app/environment"
  import { onMount} from "svelte"
  import { currentRun } from "../lib/simulator"
  // const shadeMap = new Array(100).fill(0).map(()=>new Array(100).fill(0))
  const width = 392
  const height = 112
  const scalar = 1
  const treeShadeOpacity = 0.8
  const treeShadeOpacity4Bit = Math.round(treeShadeOpacity * 255)

  let shadeMapCanvas: HTMLCanvasElement
  let renderedShadeMapCanvas: HTMLCanvasElement
  let renderedCtx: CanvasRenderingContext2D

  const redrawTrees = () => {
    if (browser && shadeMapCanvas) {
      const shadeCtx = shadeMapCanvas.getContext('2d')
      if (shadeCtx) {
        // clear canvas
        shadeCtx.clearRect(0, 0, width, height)
        // draw current trees
        $currentRun?.trees.forEach(tree => {
          shadeCtx.beginPath()
          shadeCtx.arc(tree.x, tree.y, tree.radius, 0, 2 * Math.PI, false)
          shadeCtx.fillStyle = `rgba(0, 0, 0, ${treeShadeOpacity})`
          shadeCtx.fill()
        })
        $currentRun?.trees.forEach((tree, index) => {
          if (index === 0) {
            const x = tree.x - tree.radius
            const y = tree.y - tree.radius
            var imageData = shadeCtx.getImageData(x, y, tree.radius * 2, tree.radius * 2)
            // get sunlight 
            // let shadeSum4Bit = 0
            let numPixels = 0
            let sunlightSum4Bit = 0
            imageData.data.forEach((pixelValue, index) => {
              // only use alpha pixels (every 4th one)
              if (index % 4 === 3) {
                // add this opacity value to sunlightSum
                sunlightSum4Bit += 255 - Math.max(pixelValue - treeShadeOpacity4Bit, 0)
                // shadeSum4Bit += Math.max(pixelValue - treeShadeOpacity4Bit, 0)
                numPixels++
              }
            })
            // const totalAlphaOverArea4Bit = numPixels * 255
            // const avgSunlight = (totalAlphaOverArea4Bit - shadeSum4Bit) / 255
            // const avgSunlightTotal = 
            const sunlightSumFloat = sunlightSum4Bit / 255
            const sunlightPerArea = sunlightSumFloat / Math.pow(tree.radius*2, 2)
            // console.log(sunlightPerArea)
          }
        })
        drawShadeMapToCanvas()
      } else {
        console.log('shadeCtx not found')
      }
    } else {
      console.log('not browser, or shadeMapCanvas not found')
    }
  }

  const drawShadeMapToCanvas = () => {
    if (browser) {
      renderedCtx.clearRect(0, 0, width, height)
      renderedCtx.drawImage(shadeMapCanvas, 0, 0)
    }
  }

  setInterval(redrawTrees, 100)
  	
  // if (browser) {
  //   shadeMapCanvas = document.createElement('canvas')
  //   // const shadeMapCanvas = new OffscreenCanvas(392, 112)
  //   shadeMapCanvas.width = width
  //   shadeMapCanvas.height = height
  //   // const shadeCtx = shadeMapCanvas.getContext('2d')
	
  //   // const trees = [
  //   //   {
  //   //     radius: 15,
  //   //     x: 50,
  //   //     y: 50,
  //   //   },
  //   //   {
  //   //     radius: 25,
  //   //     x: 25,
  //   //     y: 40,
  //   //   },
  //   //   {
  //   //     radius: 20,
  //   //     x: 75,
  //   //     y: 80,
  //   //   }
  //   // ]
	
  //   // trees.forEach(tree => {
  //   //   if (shadeCtx) {
  //   //     shadeCtx.beginPath()
  //   //     shadeCtx.arc(tree.x, tree.y, tree.radius, 0, 2 * Math.PI, false)
  //   //     shadeCtx.fillStyle = 'rgba(0,0,0,0.3)'
  //   //     shadeCtx.fill()
  //   //   }
  //   // })
  // }

	
  onMount(() => {
      console.log(renderedShadeMapCanvas)
      if (browser) {
        // shadeMapCanvas = document.createElement('canvas')
        shadeMapCanvas = new OffscreenCanvas(width, height)
        shadeMapCanvas.width = width
        shadeMapCanvas.height = height

        renderedShadeMapCanvas = document.getElementById('renderedShadeMap') as HTMLCanvasElement
        renderedCtx = renderedShadeMapCanvas.getContext('2d') as CanvasRenderingContext2D
      }
  })
	
</script>

<canvas id="renderedShadeMap" class="rounded bg-[#efe1db] w-full p-0" width={width} height={height}></canvas>