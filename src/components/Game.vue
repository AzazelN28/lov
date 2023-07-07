<template>
  <canvas ref="canvas"></canvas>
</template>

<style scoped>
canvas {
  image-rendering: pixelated;

  width: 100%;
  height: auto;

  aspect-ratio: 16 / 9;
}
</style>

<script setup>
import { ref } from 'vue'
import { useGame } from '@/composables/useGame'

const canvas = ref(null)

useGame(canvas)
</script>

