const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    entryPoints: ['main.js'], // Main entry point for the module
    outdir: 'dist',
    bundle: true,
    format: 'esm', // Output as ES modules to match type="module"
    metafile: true,
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['main.js'], // Also specify here for HTML plugin
                    filename: 'index.html',   // Output HTML file
                    htmlTemplate: 'index.html', // Source HTML file
                    scriptType: 'module',     // Explicitly handle as module
                },
            ],
        }),
    ],
    entryNames: '[dir]/[name]-[hash]',
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: true,
}).then((result) => {
    console.log('Build completed. Outputs:', Object.keys(result.metafile.outputs));
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});