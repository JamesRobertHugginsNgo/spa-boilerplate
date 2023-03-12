import { deleteAsync } from "del";
import detectPort from "detect-port";
import Gulp from 'gulp';
import gulpAutoPrefixer from 'gulp-autoprefixer';
import gulpBabel from 'gulp-babel';
import gulpCleanCss from 'gulp-clean-css';
import gulpConnect from 'gulp-connect';
import gulpDependents from 'gulp-dependents';
import gulpHtmlMin from 'gulp-htmlmin';
import gulpIf from 'gulp-if';
import gulpPreProcess from 'gulp-preprocess';
import gulpRename from 'gulp-rename';
import gulpSass from 'gulp-sass';
import gulpUglify from 'gulp-uglify';
import gulpUseRef from 'gulp-useref';
import lazyPipe from 'lazypipe';
import open from 'open';
import Path from 'path';
import sass from 'sass';
import webPackStream from 'webpack-stream';

////////////////////////////////////////////////////////////////////////////////

const APP_FOLDER = 'webapp/spa-boilerplate/';
const APP_FILES = ['index.html', 'about.html', 'html/app.html'];

const CONTEXT = {
	APP: 'SPA BOILERPLATE',
	APP_FOLDER,

	// ALL ENV

	...process.env.BUILD_ENV === 'PROD' ? {

		// PROD ENV

	} : process.env.BUILD_ENV === 'QA' ? {

		// QA ENV

	} : process.env.BUILD_ENV === 'DEV' ? {

		// DEV ENV

	} : {

		// LOCAL ENV

	},

	makeOpenBuildTag: (type, fileName) => {
		const extName = Path.extname(fileName);
		const baseName = Path.basename(fileName, extName);
		const dirName = Path.dirname(fileName);
		const cacheBuster = new Date().getTime().toString(32);
		const path = Path.join('/', APP_FOLDER, dirName, `${baseName}-${cacheBuster}${extName}`);
		return `<!-- build:${type} ${path} -->`;
	}
};

////////////////////////////////////////////////////////////////////////////////

const sassPipe = lazyPipe()
	.pipe(gulpDependents)
	.pipe(gulpPreProcess, {
		context: CONTEXT,
		extension: 'css'
	})
	.pipe(gulpSass(sass));

const esmPipe = lazyPipe()
	.pipe(() => {
		return gulpIf('*.mjs', webPackStream({
			mode: process.env.BUILD_ENV === 'QA' || process.env.BUILD_ENV === 'PROD'
				? 'production'
				: 'development'
		}));
	});

const minifyCode = process.env.BUILD_ENV === 'QA' || process.env.BUILD_ENV === 'PROD';

let cssPipe = lazyPipe().pipe(gulpAutoPrefixer);
if (minifyCode) {
	cssPipe = cssPipe.pipe(gulpCleanCss);
}
cssPipe = cssPipe.pipe(Gulp.dest, 'dist/');

let jsPipe = lazyPipe().pipe(gulpBabel);
if (minifyCode) {
	jsPipe = jsPipe.pipe(gulpUglify);
}
jsPipe = jsPipe.pipe(Gulp.dest, 'dist/');

let htmlPipe = lazyPipe();
for (const file of APP_FILES) {
	htmlPipe = htmlPipe.pipe(gulpRename, (path) => {
		path.extname = Path.extname(file);
		path.basename = Path.basename(file, path.extname);
		path.dirname = Path.dirname(file);
	});
	if (minifyCode) {
		htmlPipe = htmlPipe.pipe(gulpHtmlMin, { collapseWhitespace: true });
	}
	htmlPipe = htmlPipe.pipe(Gulp.dest, Path.join('dist/', APP_FOLDER));
}

////////////////////////////////////////////////////////////////////////////////

// CLEAN
export function clean() {
	return deleteAsync(['dist/', 'temp/']);
}

////////////////////////////////////////////////////////////////////////////////

// _BUILD
const _build = Gulp.series(

	// _BUILD PREP
	Gulp.parallel(

		// _BUILD PREP CSS
		function _build_prep_css() {
			return Gulp.src('src/**/*.css', { since: Gulp.lastRun(_build_prep_css) })
				.pipe(gulpPreProcess({
					context: CONTEXT,
					extension: 'css'
				}))
				.pipe(Gulp.dest('temp/'));
		},

		// _BUILD PREP SASS
		function _build_prep_sass() {
			return Gulp.src('src/**/*.sass', { since: Gulp.lastRun(_build_prep_sass) })
				.pipe(sassPipe())
				.pipe(gulpRename((path) => {
					path.extname = '.sass';
				}))
				.pipe(Gulp.dest('temp/'));
		},

		// _BUILD PREP SCSS
		function _build_prep_scss() {
			return Gulp.src('src/**/*.scss', { since: Gulp.lastRun(_build_prep_scss) })
				.pipe(sassPipe())
				.pipe(gulpRename((path) => {
					path.extname = '.scss';
				}))
				.pipe(Gulp.dest('temp/'));
		},

		// _BUILD PREP JS
		function _build_prep_js() {
			return Gulp.src('src/**/*.js', { since: Gulp.lastRun(_build_prep_js) })
				.pipe(gulpPreProcess({
					context: CONTEXT,
					extension: 'js'
				}))
				.pipe(Gulp.dest('temp/'));
		},

		// _BUILD PREP ESM
		function _build_prep_esm() {
			return Gulp.src('src/**/*.mjs', { since: Gulp.lastRun(_build_prep_esm) })
				.pipe(gulpPreProcess({
					context: CONTEXT,
					extension: 'js'
				}))
				.pipe(Gulp.dest('temp/'));
		},

		// _BUILD PREP HTML
		function _build_prep_html() {
			return Gulp.src('src/**/*.html', { since: Gulp.lastRun(_build_prep_html) })
				.pipe(gulpPreProcess({
					context: CONTEXT,
					extension: 'html'
				}))
				.pipe(Gulp.dest('temp/'));
		}
	),

	// _BUILD NEXT
	Gulp.parallel(

		// _BUILD NEXT APP
		function _build_next_app() {
			return Gulp.src(Path.join('temp/', 'app.html'))
				.pipe(gulpUseRef({}, esmPipe))
				.pipe(gulpIf('*.css', cssPipe()))
				.pipe(gulpIf('*.js', jsPipe()))
				.pipe(gulpIf('*.html', htmlPipe()))
				.pipe(gulpConnect.reload());
		},

		// _BUILD NEXT ASSET
		Gulp.parallel(

			// _BUILD NEXT ASSET SVG
			function _build_next_asset_svg() {
				return Gulp.src('src/**/*.svg')
					.pipe(Gulp.dest(Path.join('dist/', APP_FOLDER)))
					.pipe(gulpConnect.reload());
			}
		)
	)
);

// BUILD
export const build = Gulp.series(clean, _build);

////////////////////////////////////////////////////////////////////////////////

// WATCH APP
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

// WATCH
export const watch = Gulp.series(clean, _build, _watch);

////////////////////////////////////////////////////////////////////////////////

// SERVE
export const serve = Gulp.series(
	clean,
	_build,

	// SERVE APP
	function _serve() {
		return detectPort(9000)
			.then((port) => {
				gulpConnect.server({
					root: 'dist/',
					port,
					livereload: true
				});

				open(`http://localhost:${port}/${Path.join(APP_FOLDER, APP_FILES[0])}`);
			});
	},

	_watch
);

////////////////////////////////////////////////////////////////////////////////

// DEFAULT
export default build;
