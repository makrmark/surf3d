import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
    plugins: [basicSsl()],
    root: 'src',
    base: '/surf3d/',
    build: {
        outDir: '../dist',
        emptyOutDir: true
    },
    server: {
        port: 8080,
        https: true
    }
}); 