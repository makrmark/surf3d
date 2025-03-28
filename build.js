const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    outdir: 'dist',
    bundle: true,
    metafile: true,
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['main.js'], // Ensure main.js is bundled
                    filename: 'index.html',   // Output HTML file
                    htmlTemplate: 'index.html', // Source HTML file
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