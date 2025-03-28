const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    outdir: 'dist',
    bundle: true,
    plugins: [
        htmlPlugin({
            files: [
                {
                    filename: 'index.html',
                    htmlTemplate: 'index.html',
                },
            ],
        }),
    ],
    entryNames: '[dir]/[name]-[hash]',
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: true, // Optional: reduces file size
}).then(() => {
    console.log('Build completed');
}).catch(() => process.exit(1));