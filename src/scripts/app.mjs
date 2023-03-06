/* global $ Backbone */

// app.mjs

import getMessage from "./partial.mjs";

console.log('Hello Galaxy', getMessage());

$(() => {
	const $container = $('#app-container');
	console.log($container);

	new Backbone.Router({
		routes: {
			['']() {
				console.log('INDEX');
			},

			['index.html']() {
				console.log('INDEX');
			},

			['about.html']() {
				console.log('ABOUT');
			},

			['*Others']() {
				console.log('OTHERS');
			}
		}
	});

	Backbone.history.start({
		pushState: true,
		root: '/* @echo APP_FOLDER */'
	});
});
