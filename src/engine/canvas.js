export function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function createOffscreenCanvas(width, height) {
  if ('OffscreenCanvas' in window) {
    return new OffscreenCanvas(width, height)
  }
  return createCanvas(width, height)
}

export function getCanvasContext(canvas, contextId, contextAttributes) {
  return canvas.getContext(contextId, contextAttributes)
}

export function createCanvasContext(width, height, contextId, contextAttributes) {
  const canvas = createCanvas(width, height)
  return getCanvasContext(canvas, contextId, contextAttributes)
}

export function createCanvasFromImage(image) {
  return createCanvas(image.width, image.height)
}

export function convertImageToContext2D(image) {
  const context = createCanvasContext(image.naturalWidth, image.naturalHeight, '2d')
  context.drawImage(image, 0, 0)
  return context
}

export function resizeTo(canvas, width, height) {
  let resized = false
  if (canvas.width !== width) {
    canvas.width = width
    resized = true
  }
  if (canvas.height !== height) {
    canvas.height = height
    resized = true
  }
  return resized
}

export function resizeAuto(canvas, multiplier = 1.0) {
  return resizeTo(
    canvas,
    Math.floor(canvas.clientWidth * multiplier),
    Math.floor(canvas.clientHeight * multiplier),
  )
}

export default {
  createCanvas,
  createOffscreenCanvas,
  getCanvasContext,
  createCanvasContext,
  createCanvasFromImage,
  convertImageToContext2D,
  resizeTo,
  resizeAuto,
}
