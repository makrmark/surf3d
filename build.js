const esbuild = require('esbuild');
const { htmlPlugin } = require('@craftamap/esbuild-plugin-html');

esbuild.build({
    entryPoints: ['main.js'],
    outdir: 'dist',
    bundle: true,
    format: 'esm', // Ensure ES module output
    metafile: true,
    external: ['three'],
    plugins: [
        htmlPlugin({
            files: [
                {
                    entryPoints: ['main.js'],
                    filename: 'index.html',
                    htmlTemplate: 'index.html',
                    scriptType: 'module', // Enforce module type
                },
            ],
        }),
    ],
    entryNames: '[dir]/[name]-[hash]',
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: false, // Keep off for now
}).then((result) => {
    console.log('Build completed. Outputs:', Object.keys(result.metafile.outputs));
    console.log('Main file content:', require('fs').readFileSync(Object.keys(result.metafile.outputs).find(f => f.includes('main')), 'utf8'));
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});