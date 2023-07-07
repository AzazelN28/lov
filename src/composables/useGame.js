import { onMounted, onUnmounted } from 'vue'
import { init } from '@/engine/index.js'

export function useGame(canvasRef) {
  onMounted(() => {
    init(canvasRef.value)
  })

  onUnmounted(() => {
    console.log('unmounted')
  })
}

export default useGame
