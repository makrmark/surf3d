const esbuild = require('esbuild');
const fs = require('fs');

esbuild.build({
    entryPoints: ['main.js'],
    outdir: 'dist',
    bundle: true,
    format: 'esm',
    metafile: true,
    external: ['three'],
    entryNames: '[dir]/[name]-[hash]',
    chunkNames: '[name]-[hash]',
    assetNames: '[name]-[hash]',
    minify: false,
}).then((result) => {
    const mainFile = Object.keys(result.metafile.outputs).find(f => f.includes('main'));
    const html = fs.readFileSync('index.html', 'utf8')
        .replace('<script type="module" src="main.js">', `<script type="module" src="${mainFile.replace('dist/', '')}">`);
    fs.writeFileSync('dist/index.html', html);
    console.log('Build completed. Outputs:', Object.keys(result.metafile.outputs));
    console.log('Generated index.html:', fs.readFileSync('dist/index.html', 'utf8'));
}).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});