import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: './', // Use relative paths for all assets (critical for playable ads)
  plugins: [
    // Compress with gzip for size reporting
    viteCompression({
      algorithm: 'gzip',
      threshold: 0,
    }),
    // Bundle size visualization
    visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Advanced minification with terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.debug'],
        passes: 3,
        // Safer optimizations - removed some unsafe options that may break Babylon.js
        toplevel: true,
        // Standard optimizations
        arguments: true,
        dead_code: true,
        evaluate: true,
        inline: 2,
        join_vars: true,
        loops: true,
        sequences: true,
        unused: true,
        conditionals: true,
        comparisons: true,
        if_return: true,
        collapse_vars: true,
      },
      mangle: {
        toplevel: true,
        keep_fnames: false,
        // Removed property mangling - may break Babylon.js internal properties
      },
      format: {
        comments: false, // Remove all comments
        ascii_only: true,
      },
    },
    rollupOptions: {
      output: {
        // Inline everything into a single file for playable ads
        inlineDynamicImports: true,
        manualChunks: undefined,
        // Minimize output formatting
        compact: true,
        generatedCode: {
          constBindings: true,
          arrowFunctions: true,
        },
        // Optimize asset names
        assetFileNames: 'a/[hash][extname]',
        chunkFileNames: 'c/[hash].js',
        entryFileNames: 'e/[hash].js',
      },
      treeshake: {
        moduleSideEffects: (id) => id.includes('@babylonjs') || id.endsWith('.fx') || id.includes('/levels/'),
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        // Aggressive tree-shaking
        preset: 'smallest',
        unknownGlobalSideEffects: false,
      },
    },
    target: 'es2022',
    cssCodeSplit: false,
    // Disable source maps for production
    sourcemap: false,
    // Report compressed size
    reportCompressedSize: true,
    // Chunk size warnings
    chunkSizeWarningLimit: 500,
    // Asserts configuration for better tree-shaking
    assetsInlineLimit: 4096, // Inline small assets as base64
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [],
    esbuildOptions: {
      // Use esbuild for maximum speed
      target: 'es2022',
      treeShaking: true,
    },
  },
});
