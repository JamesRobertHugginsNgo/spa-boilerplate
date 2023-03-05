import { deleteAsync } from "del";
import Gulp from 'gulp';
import gulpAutoPrefixer from 'gulp-autoprefixer';
import gulpBabel from 'gulp-babel';
import gulpCleanCss from 'gulp-clean-css';
import gulpDependents from 'gulp-dependents';
import gulpPreProcess from 'gulp-preprocess';
import gulpRename from 'gulp-rename';
import gulpSass from 'gulp-sass';
import gulpUglify from 'gulp-uglify';
import gulpUseRef from 'gulp-useref';
import lazyPipe from 'lazypipe';
import Path from 'path';
import sass from 'sass';
import webPackStream from 'webpack-stream';

const FILES = ['index.html', 'about.html'];
const FOLDER = '/webapp/web-project-boilerplate/';
const MINIFY = true;

function clean() {
	return deleteAsync(['dist', 'temp']);
}

const preProcessPipe = lazyPipe()
	.pipe(gulpPreProcess, {
		context: {
			makeOpenBuildTag: (type, fileName) => {
				const extName = Path.extname(fileName);
				const baseName = Path.basename(fileName, extName);
				const dirName = Path.dirname(fileName);
				const cacheBuster = new Date().getTime().toString(32);
				const path = Path.join(FOLDER, dirName, `${baseName}-${cacheBuster}${extName}`);
				return `<!-- build:${type} ${path} -->`;
			},

			APP: 'WEB PROJECT BOILERPLATE'
		}
	});

function build_prep_css() {
	return Gulp.src('src/**/*.css', { since: Gulp.lastRun(build_prep_css) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest('temp/build_prep'));
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
		.pipe(Gulp.dest('temp/build_prep'));
}

function build_prep_scss() {
	return Gulp.src('src/**/*.scss', { since: Gulp.lastRun(build_prep_scss) })
		.pipe(sassPipe())
		.pipe(gulpRename((path) => {
			path.extname = '.scss';
		}))
		.pipe(Gulp.dest('temp/build_prep'));
}

function build_prep_js() {
	return Gulp.src('src/**/*.js', { since: Gulp.lastRun(build_prep_js) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest('temp/build_prep'));
}

function build_prep_mjs_prep() {
	return Gulp.src('src/**/*.mjs', { since: Gulp.lastRun(build_prep_mjs_prep) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest('temp/build_prep'));
}

function build_prep_mjs_webpack() {
	return Gulp.src('temp/build_prep/scripts/entry.mjs')
		.pipe(webPackStream({}))
		.pipe(gulpRename((path) => {
			path.basename = 'entry';
			path.extname = '.mjs';
		}))
		.pipe(Gulp.dest('temp/build_prep/scripts/'));
}

const build_prep_ejs = Gulp.series(
	build_prep_mjs_prep,
	build_prep_mjs_webpack
);

function build_prep_html() {
	return Gulp.src('src/**/*.html', { since: Gulp.lastRun(build_prep_html) })
		.pipe(preProcessPipe())
		.pipe(Gulp.dest('temp/build_prep'));
}

const build_prep = Gulp.parallel(
	build_prep_css,
	build_prep_sass,
	build_prep_scss,
	build_prep_js,
	build_prep_ejs,
	build_prep_html
);

function build_main_app_main() {
	return Gulp.src('temp/build_prep/app.html')
		.pipe(gulpUseRef())
		.pipe(Gulp.dest('temp/build_main'));
}

function build_main_app_complete_css() {
	let result = Gulp.src('temp/build_main/**/*.css')
		.pipe(gulpAutoPrefixer());
	if (MINIFY) {
		result = result.pipe(gulpCleanCss());
	}
	return result.pipe(Gulp.dest('dist'));
}

function build_main_app_complete_js() {
	let result = Gulp.src('temp/build_main/**/*.js')
		.pipe(gulpBabel());
	if (MINIFY) {
		result = result.pipe(gulpUglify());
	}
	return result.pipe(Gulp.dest('dist'));
}

function build_main_app_complete_html() {
	let result = Gulp.src('temp/build_main/app.html');
	for (const file of FILES) {
		result = result
			.pipe(gulpRename((path) => {
				path.extname = Path.extname(file);
				path.basename = Path.basename(file, path.extname);
			}))
			.pipe(Gulp.dest(Path.join('dist', FOLDER)));
	}
	return result;
}

const build_main_app_complete = Gulp.parallel(
	build_main_app_complete_css,
	build_main_app_complete_js,
	build_main_app_complete_html
);

const build_main_app = Gulp.series(
	build_main_app_main,
	build_main_app_complete
);

function build_main_asset() {
	return Promise.resolve(); // TODO
}

const build_main = Gulp.parallel(
	build_main_app,
	build_main_asset
);

const _build = Gulp.series(
	build_prep,
	build_main
);

export const build = Gulp.series(
	clean,
	_build
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

export default build;
