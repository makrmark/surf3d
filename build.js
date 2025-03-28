const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    outdir: 'dist',
    bundle: true,
    format: 'esm',
    metafile: true,
    external: ['three'],
    plugins: [
        htmlPlugin({
            files: [
                {
                    filename: 'index.html',      // Output file in dist
                    htmlTemplate: 'index.html',  // Source file
                },
            ],
        }),
    ],
    entryNames: '[dir]/[name]-[hash]',
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: false,
}).then((result) => {
    console.log('Build completed. Outputs:', Object.keys(result.metafile.outputs));
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});