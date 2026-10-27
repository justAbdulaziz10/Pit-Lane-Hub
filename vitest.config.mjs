import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';

const sourceRoot = new URL('./src/', import.meta.url).pathname;

export default defineConfig({
    plugins: [{
        name: 'source-jsx-in-js',
        enforce: 'pre',
        async transform(code, id) {
            if (!id.startsWith(sourceRoot) || !id.endsWith('.js')) return null;
            return transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } });
        },
    }],
    test: {
        environment: 'node',
        include: ['tests/**/*.test.js'],
    },
    resolve: {
        alias: {
            '@': new URL('./src', import.meta.url).pathname,
        },
    },
});
