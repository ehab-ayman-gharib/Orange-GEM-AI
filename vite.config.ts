import { defineConfig } from 'vite';

export default defineConfig({
    // Use a relative base so built assets are referenced relative to index.html.
    // This makes the build portable across hosts (GitHub Pages subpath vs Vercel root).
    base: './',
});