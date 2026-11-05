<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const src = computed(() => props.item.config?.src || props.item.config?.url || '')
const isInterpolation = computed(() => props.item.interactiveType === 'interpolation')
const frame = ref(null)
const frameHeight = ref(480)

function resizeInterpolation(event) {
  if (!isInterpolation.value || event.source !== frame.value?.contentWindow) return
  if (event.origin !== window.location.origin || event.data?.type !== 'runge-height') return
  const height = Number(event.data.height)
  if (Number.isFinite(height)) frameHeight.value = Math.max(200, Math.min(1200, height + 4))
}

onMounted(() => window.addEventListener('message', resizeInterpolation))
onBeforeUnmount(() => window.removeEventListener('message', resizeInterpolation))
const providerLabel = computed(() => {
  if (props.item.interactiveType === 'geogebra') return 'GeoGebra'
  if (props.item.interactiveType === 'desmos') return 'Desmos'
  return '交互'
})
</script>

<template>
  <article class="ix embed-ix">
    <div v-if="!isInterpolation" class="ix-head">
      <span class="ix-badge">{{ providerLabel }}</span>
      <span class="ix-title">{{ item.title || `${providerLabel} 演示` }}</span>
    </div>
    <div class="ix-body">
      <p v-if="item.desc" class="ix-desc">{{ item.desc }}</p>
      <div
        class="interactive-frame"
        :class="{ 'interpolation-frame': isInterpolation }"
        :style="isInterpolation ? { height: `${frameHeight}px` } : undefined"
      >
        <iframe
          v-if="src"
          ref="frame"
          :src="src"
          :title="item.title || `${providerLabel} 演示`"
          loading="lazy"
          allowfullscreen
        ></iframe>
        <div v-else class="ix-stub">
          <span class="t">{{ providerLabel.toUpperCase() }}</span>
          <span class="s">在模块下方添加 `src: 嵌入地址` 即可挂载演示。</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.interpolation-frame {
  aspect-ratio: auto;
  border: 0;
  border-radius: 0;
  background: transparent;
}
</style>
