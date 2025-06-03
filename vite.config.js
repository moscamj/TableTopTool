import { defineConfig } from 'vite';

export default defineConfig({
        // No specific configurations needed for MVP,
        // but the file should exist and be valid.
        // We can add plugins like Vue or React later if needed.
        root: 'src',
        publicDir: 'src/public',
        server: {
                open: true, // Automatically open the app in the browser on server start
        },
        css: {
                postcss: './config/postcss.config.js'
        }
});
