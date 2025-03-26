const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['api-direct.js'],
  bundle: true,
  minify: true,
  platform: 'node',
  target: 'node14',
  outfile: 'api-direct.js',
  allowOverwrite: true,
}).catch(() => process.exit(1)); 