export const defaultTexture = (function () {
  const t = document.createElement('canvas')
  t.width = 64
  t.height = 64
  const cx = t.getContext('2d')
  cx.fillStyle = 'white'
  cx.fillRect(0, 0, 64, 64)
  cx.fillStyle = 'red'
  cx.fillRect(0, 0, 32, 32)
  cx.fillRect(32, 32, 32, 32)
  return t
})()
