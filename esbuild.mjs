import esbuild from 'esbuild';

const mode = process.env.ESBUILD_MODE;
const watch = process.env.ESBUILD_WATCH;

esbuild.build({
  entryPoints: [ './src/extension.ts' ],
  outfile: './out/extension.js',
  bundle: true,
  external: [ 'vscode' ],
  platform: 'node',

  minify: mode !== 'development',
  sourcemap: true,
  watch: !!watch
});
