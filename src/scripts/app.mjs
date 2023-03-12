/* global $ Backbone */

// app.mjs

import getMessage from "./partial.mjs";

console.log('Hello Galaxy', getMessage());

console.log(document.location);

const $container = $('#app-container');
new Backbone.Router({
	routes: {
		['index.html']() {
			console.log('INDEX');
			$container.html(`
				<h1>Index</h1>
			`);
		},

		['about.html']() {
			console.log('ABOUT');
			$container.html(`
				<h1>About</h1>
			`);
		},

		['*Others']() {
			console.log('OTHER');
			this.navigate('index.html', { trigger: true });
		}
	}
});

Backbone.history.start({
	pushState: true,
	root: '/* @echo APP_FOLDER */'
});

