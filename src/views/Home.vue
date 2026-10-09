<script setup lang="ts">
import { computed } from 'vue'
import { CATEGORY_LABELS, getTools, type ToolCategory } from '../tools'

const categories = computed(() => {
  const order: ToolCategory[] = ['format', 'encode', 'time', 'generate', 'network']
  const tools = getTools()
  return order
    .map((key) => ({
      key,
      label: CATEGORY_LABELS[key],
      tools: tools.filter((tool) => tool.category === key),
    }))
    .filter((group) => group.tools.length > 0)
})
</script>

<template>
  <div class="home">
    <section class="hero">
      <h1>DevBox 开发者工具箱</h1>
      <p>纯前端实现，数据不离开你的浏览器 · 即开即用</p>
    </section>
    <section v-for="group in categories" :key="group.key" class="category">
      <h2 class="category-title">{{ group.label }}</h2>
      <div class="tool-grid">
        <router-link
          v-for="tool in group.tools"
          :key="tool.id"
          :to="`/tool/${tool.id}`"
          class="tool-card"
        >
          <div class="tool-card-name">{{ tool.name }}</div>
          <div class="tool-card-desc">{{ tool.description }}</div>
        </router-link>
      </div>
    </section>
  </div>
</template>
