import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from '@vant/auto-import-resolver'

// https://vite.dev/config/
export default defineConfig({
  base: '/my-study-log/',
  plugins: [
    vue(),
    AutoImport({
      resolvers: [VantResolver()],
    }),
    Components({
      resolvers: [VantResolver()],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
      manifest: {
        name: '浅浅时钟',
        short_name: '浅浅时钟',
        description: '记录学习时间，追踪学习进度',
        theme_color: '#FFF5F6',
        background_color: '#FFF5F6',
        display: 'standalone',
        start_url: '/my-study-log/',
        scope: '/my-study-log/',
        orientation: 'portrait',
        lang: 'zh-CN',
        categories: ['productivity', 'education'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff2}'],
        navigateFallback: '/my-study-log/',
        runtimeCaching: [
          // 静态资源：构建产物带 hash，可永久缓存
          {
            urlPattern: /\.(?:js|css|woff2?|png|svg|ico|jpg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90天
              },
            },
          },
          // 导航请求：HTML 页面，优先网络，离线时回退缓存
          {
            urlPattern: /\/my-study-log\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7天
              },
            },
          },
          // 其他请求：网络优先
          {
            urlPattern: /^https?.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [
        // Will be configured via postcss.config.cjs
      ],
    },
  },
})
