const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    entryPoints: ['main.js'],
    outdir: 'dist',
    bundle: true,
    format: 'esm',
    metafile: true,
    external: ['three'], // Exclude "three" from bundling
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['main.js'],
                    filename: 'index.html',
                    htmlTemplate: 'index.html',
                    scriptType: 'module',
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