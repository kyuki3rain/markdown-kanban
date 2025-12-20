const esbuild = require("esbuild");
const glob = require("glob");

const watch = process.argv.includes('--watch');

async function main() {
	// テストファイルを検索
	const testFiles = glob.sync('src/test/**/*.test.ts');

	const ctx = await esbuild.context({
		entryPoints: testFiles,
		bundle: true,
		format: 'cjs',  // CommonJS出力（VSCode E2Eテストランナー用）
		platform: 'node',
		outdir: 'out/test',
		outbase: 'src/test',
		external: ['vscode', 'mocha'],  // VSCodeとMochaは外部依存
		sourcemap: true,
		logLevel: 'info',
	});

	if (watch) {
		await ctx.watch();
		console.log('Watching for changes...');
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
