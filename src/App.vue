<template>
  <div class="app">
    <header class="app-header">
      <router-link to="/" class="logo">DevBox</router-link>
      <span class="tagline">开发者工具箱</span>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <footer class="app-footer">纯前端工具 · 数据本地处理 · M1 版本</footer>
  </div>
</template>
