import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: '../../dist/client',
      sourcemap: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            phaser: ['phaser'],
          },
          // Ensure assets are properly bundled
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(extType)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
      // Ensure all assets are inlined for CSP compliance
      assetsInlineLimit: 0, // Don't inline assets, but bundle them properly
      ...(mode === 'production' && {
        minify: 'terser',
        terserOptions: {
          compress: {
            passes: 2,
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
      }),
    },
    // Ensure proper asset handling
    publicDir: 'public',
    assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.woff2'],
  };
});
