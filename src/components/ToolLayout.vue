<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="tool-layout">
    <div class="tool-header">
      <div>
        <h2 class="tool-title">{{ title }}</h2>
        <p v-if="description" class="tool-desc">{{ description }}</p>
      </div>
      <router-link to="/" class="back-link">&larr; 返回首页</router-link>
    </div>
    <div class="tool-panels">
      <section class="tool-panel">
        <div class="panel-title">输入</div>
        <div class="panel-body">
          <slot name="input" />
        </div>
        <div class="panel-actions">
          <slot name="input-actions" />
        </div>
      </section>
      <section class="tool-panel">
        <div class="panel-title">输出</div>
        <div class="panel-body">
          <slot name="output" />
        </div>
        <div class="panel-actions">
          <slot name="output-actions" />
        </div>
      </section>
    </div>
  </div>
</template>
