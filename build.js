const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    outdir: 'dist',
    bundle: true,
    metafile: true, // Required by htmlPlugin
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['main.js'], // Explicitly list main.js as an entry point
                    filename: 'index.html',   // Output HTML file name in dist
                    htmlTemplate: 'index.html', // Source HTML file to process
                },
            ],
        }),
    ],
    entryNames: '[dir]/[name]-[hash]', // Output files like main-abc123.js
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: true, // Optional: reduces file size
}).then(() => {
    console.log('Build completed');
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});