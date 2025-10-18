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
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'], // Bundle Phaser separately for better caching
          },
          // Ensure assets are properly bundled with content hashing
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
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
            passes: 2,
            drop_console: true, // Remove console.log in production
            drop_debugger: true, // Remove debugger statements
            pure_funcs: ['console.log', 'console.warn'], // Remove specific console methods
          },
          mangle: {
            safari10: true, // Fix Safari 10 issues
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
