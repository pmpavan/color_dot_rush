import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: '../../dist/client',
      sourcemap: mode !== 'production', // Only include sourcemaps in development
      chunkSizeWarningLimit: 2000, // Increase limit for Phaser bundle
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'], // Bundle Phaser separately for better caching
          },
          // Ensure assets are properly bundled with content hashing
          assetFileNames: (assetInfo) => {
            const info = assetInfo.names?.[0]?.split('.') || [];
            const extType = info[info.length - 1] || '';
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(extType)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          // Optimize chunk naming for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      // CSP Compliance: Don't inline assets, bundle them properly
      assetsInlineLimit: 0,
      // Performance optimizations for production
      ...(mode === 'production' && {
        minify: 'terser',
        terserOptions: {
          compress: {
            passes: 3, // Multiple compression passes
            drop_console: false, // Remove console.log in production
            drop_debugger: false, // Remove debugger statements
            // pure_funcs: ['console.log', 'console.warn', 'console.info'], // Remove specific console methods
            unsafe_arrows: true, // Convert arrow functions for better compression
            unsafe_methods: true, // Optimize method calls
            unsafe_proto: true, // Optimize prototype access
          },
          mangle: {
            safari10: true, // Fix Safari 10 issues
            properties: {
              regex: /^_/, // Mangle private properties starting with _
            },
          },
          format: {
            comments: false, // Remove comments
          },
        },
      }),
    },
    // Ensure proper asset handling for CSP compliance
    publicDir: 'public',
    assetsInclude: [
      '**/*.svg',
      '**/*.png',
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.gif',
      '**/*.woff2',
      '**/*.woff',
      '**/*.ttf',
      '**/*.eot'
    ],
    // Performance optimizations
    optimizeDeps: {
      include: ['phaser'], // Pre-bundle Phaser for faster dev startup
      exclude: [], // Don't exclude any dependencies
    },
    // Server configuration for development
    server: {
      // Optimize for development performance
      hmr: {
        overlay: false, // Disable error overlay for better performance
      },
    },
  };
});
