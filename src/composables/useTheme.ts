import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'devbox:theme'

/** 与 PWA manifest 的 theme_color 保持一致 */
const THEME_COLORS: Record<Theme, string> = {
  light: '#4f6ef7',
  dark: '#141419',
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

/** 初始值：用户显式选择优先，否则跟随系统 */
const theme = ref<Theme>(readStored() ?? (systemPrefersDark() ? 'dark' : 'light'))

function apply(value: Theme) {
  document.documentElement.classList.toggle('dark', value === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[value])
  // 首帧由 index.html 内联脚本定好，此处才允许过渡动画
  document.documentElement.classList.add('theme-ready')
}

watch(theme, apply, { immediate: true })

// 用户未显式选择过时，跟随系统主题变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!readStored()) {
    theme.value = e.matches ? 'dark' : 'light'
  }
})

export function useTheme() {
  function toggle() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme.value)
    } catch {
      // 隐私模式等写入失败时仅内存生效
    }
  }

  return { theme, toggle }
}
