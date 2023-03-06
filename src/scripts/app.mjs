/* global $ */

// app.mjs

import getMessage from "./partial.mjs";

console.log('Hello Galaxy', getMessage());

$(() => {
	const $container = $('#app-container');
	console.log($container);
});
