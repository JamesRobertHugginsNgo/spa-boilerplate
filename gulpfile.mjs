import { deleteAsync } from "del";
import detectPort from "detect-port";
import Gulp from 'gulp';
import gulpAutoPrefixer from 'gulp-autoprefixer';
import gulpBabel from 'gulp-babel';
import gulpCleanCss from 'gulp-clean-css';
import gulpConnect from 'gulp-connect';
import gulpDependents from 'gulp-dependents';
import gulpHtmlMin from 'gulp-htmlmin';
import gulpPreProcess from 'gulp-preprocess';
import gulpRename from 'gulp-rename';
import gulpSass from 'gulp-sass';
import gulpUglify from 'gulp-uglify';
import gulpUseRef from 'gulp-useref';
import lazyPipe from 'lazypipe';
import open from 'open';
import Path from 'path';
import sass from 'sass';
import vinylNamed from 'vinyl-named';
import webPackStream from 'webpack-stream';

const APP_FILES = ['index.html', 'about.html'];
const APP_FOLDER = 'webapp/web-project-boilerplate';

const DEST_DIST = 'dist';
const DEST_BUILD_PREP = 'temp_build_prep';
const DEST_BUILD_MAIN = 'temp_build_main';

const ESM_ENTRY_POINTS = ['scripts/entry.mjs', 'scripts/app.mjs'];

const MINIFY = true;

export function clean() {
	return deleteAsync([DEST_DIST, DEST_BUILD_PREP, DEST_BUILD_MAIN]);
}

const preProcessContext = {
	makeOpenBuildTag: (type, fileName) => {
		const extName = Path.extname(fileName);
		const baseName = Path.basename(fileName, extName);
		const dirName = Path.dirname(fileName);
		const cacheBuster = new Date().getTime().toString(32);
		const path = Path.join('/', APP_FOLDER, dirName, `${baseName}-${cacheBuster}${extName}`);
		return `<!-- build:${type} ${path} -->`;
	},

	APP: 'WEB PROJECT BOILERPLATE',
	APP_FOLDER
};

const preProcessPipe = lazyPipe()
	.pipe(gulpPreProcess, {
		context: preProcessContext
	});

const preProcessPipeEsm = lazyPipe()
	.pipe(gulpPreProcess, {
		context: preProcessContext,
		extension: 'js'
	});

function build_prep_css() {
	return Gulp.src('src/**/*.css', { since: Gulp.lastRun(build_prep_css) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

const sassPipe = lazyPipe()
	.pipe(gulpDependents)
	.pipe(preProcessPipe)
	.pipe(gulpSass(sass));

function build_prep_sass() {
	return Gulp.src('src/**/*.sass', { since: Gulp.lastRun(build_prep_sass) })
		.pipe(sassPipe())
		.pipe(gulpRename((path) => {
			path.extname = '.sass';
		}))
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

function build_prep_scss() {
	return Gulp.src('src/**/*.scss', { since: Gulp.lastRun(build_prep_scss) })
		.pipe(sassPipe())
		.pipe(gulpRename((path) => {
			path.extname = '.scss';
		}))
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

function build_prep_js() {
	return Gulp.src('src/**/*.js', { since: Gulp.lastRun(build_prep_js) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

function build_prep_mjs_prep() {
	return Gulp.src('src/**/*.mjs', { since: Gulp.lastRun(build_prep_mjs_prep) })
		.pipe(preProcessPipeEsm())
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

function build_prep_mjs_webpack() {
	if (!ESM_ENTRY_POINTS || ESM_ENTRY_POINTS.length === 0) {
		return Promise.resolve();
	}

	let nameCounter = 0;
	const metadata = {};

	return Gulp.src(ESM_ENTRY_POINTS.map((entryPoint) => {
		return Path.join(DEST_BUILD_PREP, entryPoint);
	}))
		.pipe(vinylNamed(function (file) {
			const name = (nameCounter++).toString();
			metadata[name] = {
				dirname: Path.relative(Path.join(process.cwd(), DEST_BUILD_PREP), file.dirname),
				basename: file.stem,
				extname: file.extname
			};
			return name;
		}))
		.pipe(webPackStream({
			mode: MINIFY ? 'production' : 'development'
		}))
		.pipe(gulpRename((path) => {
			const _metadata = metadata[path.basename];
			path.dirname = _metadata.dirname;
			path.basename = _metadata.basename;
			path.extname = _metadata.extname;
		}))
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

const build_prep_ejs = Gulp.series(
	build_prep_mjs_prep,
	build_prep_mjs_webpack
);

function build_prep_html() {
	return Gulp.src('src/**/*.html', { since: Gulp.lastRun(build_prep_html) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest(DEST_BUILD_PREP));
}

const build_prep = Gulp.parallel(
	build_prep_css,
	build_prep_sass,
	build_prep_scss,
	build_prep_js,
	build_prep_ejs,
	build_prep_html
);

function build_main_main() {
	return Gulp.src(Path.join(DEST_BUILD_PREP, 'app.html'))
		.pipe(gulpUseRef())
		.pipe(Gulp.dest(DEST_BUILD_MAIN));
}

function build_main_complete_css() {
	let result = Gulp.src(Path.join(DEST_BUILD_MAIN, '**/*.css'))
		.pipe(gulpAutoPrefixer());
	if (MINIFY) {
		result = result.pipe(gulpCleanCss());
	}
	return result
		.pipe(Gulp.dest(DEST_DIST))
		.pipe(gulpConnect.reload());
}

function build_main_complete_js() {
	let result = Gulp.src(Path.join(DEST_BUILD_MAIN, '**/*.js'))
		.pipe(gulpBabel());
	if (MINIFY) {
		result = result.pipe(gulpUglify());
	}
	return result
		.pipe(Gulp.dest(DEST_DIST))
		.pipe(gulpConnect.reload());
}

function build_main_complete_html() {
	let result = Gulp.src(Path.join(DEST_BUILD_MAIN, 'app.html'));
	for (const file of APP_FILES) {
		result = result.pipe(gulpRename((path) => {
			path.extname = Path.extname(file);
			path.basename = Path.basename(file, path.extname);
			path.dirname = Path.dirname(file);
		}));
		if (MINIFY) {
			result = result.pipe(gulpHtmlMin({ collapseWhitespace: true }));
		}
		result = result
			.pipe(Gulp.dest(Path.join(DEST_DIST, APP_FOLDER)))
			.pipe(gulpConnect.reload());
	}
	return result;
}

const build_main_complete = Gulp.parallel(
	build_main_complete_css,
	build_main_complete_js,
	build_main_complete_html
);

const build_main = Gulp.series(
	build_main_main,
	build_main_complete
);

const _build = Gulp.series(
	build_prep,
	build_main
);

function build_asset_svg() {
	return Gulp.src('src/**/*.svg')
		.pipe(Gulp.dest(Path.join(DEST_DIST, APP_FOLDER)))
		.pipe(gulpConnect.reload());
}

const build_asset = Gulp.parallel(
	build_asset_svg
);

export const build = Gulp.series(
	clean,
	_build,
	build_asset
);

function _watch() {
	Gulp.watch([
		'src/**/*.css',
		'src/**/*.sass',
		'src/**/*.scss',
		'src/**/*.js',
		'src/**/*.mjs',
		'src/**/*.html'
	], _build);
}

export const watch = Gulp.series(build, _watch);

function _serve() {
	return detectPort(9000)
		.then((port) => {
			gulpConnect.server({
				root: DEST_DIST,
				port,
				livereload: true
			});

			open(`http://localhost:${port}/${Path.join(APP_FOLDER, APP_FILES[0])}`);
		});

}

export const serve = Gulp.series(build, _serve, _watch);

export default build;
