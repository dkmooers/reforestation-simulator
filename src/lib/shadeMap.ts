import type { Tree } from "../types"

const treeShadeOpacity = 0.1
const treeShadeOpacity4Bit = Math.round(treeShadeOpacity * 255)

type ShadeMap = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
}

export const createShadeMap = (width: number, height: number): ShadeMap => {
  const shadeMapCanvas = new OffscreenCanvas(width, height)
  shadeMapCanvas.width = width
  shadeMapCanvas.height = height
  // return shadeMapCanvas.getContext('2d')
  // shadeMapCanvas.getContext('2d')
  return {
    ctx: shadeMapCanvas.getContext('2d'),
    width,
    height
  }
} 

export const recalculateShadeMapWithTrees = (shadeMap: ShadeMap, trees: Tree[]) => {
  // clear canvas
  const { ctx, width, height } = shadeMap
  ctx.clearRect(0, 0, width, height)
  // draw current trees
  trees.forEach(tree => {
    ctx.beginPath()
    ctx.arc(tree.x, tree.y, tree.radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = `rgba(0, 0, 0, ${treeShadeOpacity})`
    ctx.fill()
  })
  // calc sunlight intensity per area for each tree
  trees.forEach((tree, index) => {
    // if (index === 0) {
    const x = Math.floor(tree.x - tree.radius)
    const y = Math.floor(tree.y - tree.radius)
    const treeDiameter = Math.round(tree.radius * 2) || 1

    var imageData = ctx.getImageData(x, y, treeDiameter, treeDiameter)
    // get sunlight 
    // let shadeSum4Bit = 0
    let sunlightSumAllPixels4Bit = 0
    let numPixels = 0
    imageData.data.forEach((pixelValue, index) => {
      // only use alpha pixels (every 4th one)
      if (index % 4 === 3) {
        // add this opacity value to sunlightSum
        sunlightSumAllPixels4Bit += 26 - Math.min(Math.max(pixelValue - treeShadeOpacity4Bit, 0), 26)
        numPixels++
      }
    })
    const sunlightSumAllPixelsFloat = sunlightSumAllPixels4Bit / 255
    // const numPixels = treeDiameter * treeDiameter
    const scalar = 10 // 10 effectively means tree shade is 100% opacity; 8 would mean 80% opacity
    const sunlightPerArea = Math.min(sunlightSumAllPixelsFloat / numPixels * scalar, 1) // * 10 
    tree.currentSunIntensity = sunlightPerArea
  })
}