import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';

export default defineConfig(({ mode }) => ({
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: 'index.ts',
    outDir: '../../dist/server',
    target: 'node22',
    sourcemap: mode !== 'production', // Only include sourcemaps in development
    rollupOptions: {
      external: [...builtinModules, '@devvit/web'],

      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
    // Performance optimizations for production
    ...(mode === 'production' && {
      minify: 'terser',
      terserOptions: {
        compress: {
          passes: 2,
          drop_console: true, // Remove console.log in production
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.log', 'console.warn', 'console.info'],
        },
        mangle: {
          keep_fnames: true, // Keep function names for better debugging
        },
        format: {
          comments: false, // Remove comments
        },
      },
    }),
  },
}));
