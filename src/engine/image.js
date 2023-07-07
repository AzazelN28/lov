export function loadImage(url) {
  return new Promise((resolve, reject) => {
    function handler(e) {
      const image = e.target
      image.removeEventListener('load', handler)
      image.removeEventListener('error', handler)
      image.removeEventListener('abort', handler)
      if (e.type === 'load') {
        return resolve(image)
      } else {
        return reject(e)
      }
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.addEventListener('load', handler)
    image.addEventListener('error', handler)
    image.addEventListener('abort', handler)
    image.src = url
  })
}

export async function loadImageBitmap(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

export default {
  loadImage,
  loadImageBitmap
}
