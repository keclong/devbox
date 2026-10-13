<script setup lang="ts">
import { useTheme } from './composables/useTheme'

const { theme, toggle } = useTheme()
</script>

<template>
  <div class="app">
    <header class="app-header">
      <router-link to="/" class="logo">DevBox</router-link>
      <span class="tagline">开发者工具箱</span>
      <button
        class="theme-toggle"
        type="button"
        :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
        @click="toggle"
      >
        <!-- 月亮：深色模式下显示，点击回浅色 -->
        <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
        <!-- 太阳：浅色模式下显示，点击变深色 -->
        <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </button>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="app-footer">纯前端工具 · 数据本地处理 · M1 版本</footer>
  </div>
</template>

<style scoped>
.theme-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.theme-toggle:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
</style>
