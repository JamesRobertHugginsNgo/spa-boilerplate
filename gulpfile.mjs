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

const BUILD_ENV = process.env.BUILD_ENV;

const BUILD_ENV_DEV = 'DEV';
const BUILD_ENV_QA = 'QA';
const BUILD_ENV_PROD = 'PROD';

////////////////////////////////////////////////////////////////////////////////

const APP_FILES = ['index.html', 'about.html'];
const APP_FOLDER = 'webapp/spa-boilerplate';

const DEST_DIST = 'dist';
const DEST_BUILD_PREP = 'temp_prep';
const DEST_BUILD_MAIN = 'temp_next';

const MINIFY = BUILD_ENV === BUILD_ENV_QA || BUILD_ENV === BUILD_ENV_PROD;

const PRE_PROCESS_CONTEXT = {
	APP: 'SPA BOILERPLATE',
	APP_FOLDER,

	// ALL ENV

	...BUILD_ENV !== BUILD_ENV_DEV && BUILD_ENV !== BUILD_ENV_QA && BUILD_ENV !== BUILD_ENV_PROD ? {

		// LOCAL ENV

	} : BUILD_ENV === BUILD_ENV_DEV ? {

		// DEV ENV

	} : BUILD_ENV === BUILD_ENV_QA ? {

		// QA ENV

	} : {

		// PROD ENV

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

const preProcessPipe = lazyPipe().pipe(gulpPreProcess, {
	context: PRE_PROCESS_CONTEXT
});

const preProcessPipeMjs = lazyPipe().pipe(gulpPreProcess, {
	context: PRE_PROCESS_CONTEXT,
	extension: 'js'
});

const sassPipe = lazyPipe()
	.pipe(gulpDependents)
	.pipe(preProcessPipe)
	.pipe(gulpSass(sass));

const esmPipe = lazyPipe()
	.pipe(() => {
		return gulpIf('*.mjs', webPackStream({
			mode: BUILD_ENV === BUILD_ENV_QA || BUILD_ENV === BUILD_ENV_PROD
				? 'production'
				: 'development'
		}));
	});

////////////////////////////////////////////////////////////////////////////////

// CLEAN
export function clean() {
	return deleteAsync([DEST_DIST, DEST_BUILD_PREP, DEST_BUILD_MAIN]);
}

////////////////////////////////////////////////////////////////////////////////

// _BUILD
const _build = Gulp.series(

	// _BUILD PREP
	Gulp.parallel(

		// _BUILD PREP CSS
		function _build_prep_css() {
			return Gulp.src('src/**/*.css', { since: Gulp.lastRun(_build_prep_css) })
				.pipe(preProcessPipe())
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		},

		// _BUILD PREP SASS
		function _build_prep_sass() {
			return Gulp.src('src/**/*.sass', { since: Gulp.lastRun(_build_prep_sass) })
				.pipe(sassPipe())
				.pipe(gulpRename((path) => {
					path.extname = '.sass';
				}))
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		},

		// _BUILD PREP SCSS
		function _build_prep_scss() {
			return Gulp.src('src/**/*.scss', { since: Gulp.lastRun(_build_prep_scss) })
				.pipe(sassPipe())
				.pipe(gulpRename((path) => {
					path.extname = '.scss';
				}))
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		},

		// _BUILD PREP JS
		function _build_prep_js() {
			return Gulp.src('src/**/*.js', { since: Gulp.lastRun(_build_prep_js) })
				.pipe(preProcessPipe())
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		},

		// _BUILD PREP ESM PREP
		function _build_prep_esm_prep() {
			return Gulp.src('src/**/*.mjs', { since: Gulp.lastRun(_build_prep_esm_prep) })
				.pipe(preProcessPipeMjs())
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		},

		// _BUILD PREP HTML
		function _build_prep_html() {
			return Gulp.src('src/**/*.html', { since: Gulp.lastRun(_build_prep_html) })
				.pipe(preProcessPipe())
				.pipe(Gulp.dest(DEST_BUILD_PREP));
		}
	),

	// _BUILD NEXT
	Gulp.parallel(

		// _BUILD NEXT APP
		Gulp.series(

			// _BUILD NEXT APP PREP
			function _build_next_app_prep() {
				return Gulp.src(Path.join(DEST_BUILD_PREP, 'app.html'))
					.pipe(gulpUseRef({}, esmPipe))
					.pipe(Gulp.dest(DEST_BUILD_MAIN));
			},

			// _BUILD NEXT APP COMPLETE
			Gulp.parallel(

				// _BUILD NEXT APP COMPLETE CSS
				function _build_next_app_complete_css() {
					let result = Gulp.src(Path.join(DEST_BUILD_MAIN, '**/*.css'))
						.pipe(gulpAutoPrefixer());
					if (MINIFY) {
						result = result.pipe(gulpCleanCss());
					}
					return result
						.pipe(Gulp.dest(DEST_DIST))
						.pipe(gulpConnect.reload());
				},

				// _BUILD NEXT APP COMPLETE JS
				function _build_next_app_complete_js() {
					let result = Gulp.src(Path.join(DEST_BUILD_MAIN, '**/*.js'))
						.pipe(gulpBabel());
					if (MINIFY) {
						result = result.pipe(gulpUglify());
					}
					return result
						.pipe(Gulp.dest(DEST_DIST))
						.pipe(gulpConnect.reload());
				},

				// _BUILD NEXT APP COMPLETE HTML
				function _build_next_app_complete_html() {
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
			)
		),

		// _BUILD NEXT ASSET
		Gulp.parallel(

			// _BUILD NEXT ASSET SVG
			function _build_next_asset_svg() {
				return Gulp.src('src/**/*.svg')
					.pipe(Gulp.dest(Path.join(DEST_DIST, APP_FOLDER)))
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
export const watch = Gulp.series(build, _watch);

////////////////////////////////////////////////////////////////////////////////

// SERVE
export const serve = Gulp.series(
	build,

	// SERVE APP
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
	},

	_watch
);

////////////////////////////////////////////////////////////////////////////////

// DEFAULT
export default build;
