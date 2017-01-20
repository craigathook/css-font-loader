# CSS Font Loader - Load fonts from CSS and know when they're completely loaded.

CSS Font Loader loads a CSS file with web fonts then lets you know when all of those fonts are fully loaded. Particularly useful for loading Google Fonts, but also useful on any CSS with @font-face references.

CSS Font Loader is made up of 2 parts. 

1. The loader, which downloads a CSS stylesheet dynamically.
2. A CSS processing utility that takes raw CSS and fires the callback when all fonts found in the CSS are fully loaded.

# Setup

There are 3 ways to use CSS Font Loader:

**NPM**

	npm install css-font-loader

And just require it:

	var CSSFontLoader = require('css-font-loader');

**Script Tag**

Load it directly with a script tag. Download the compiled and minified library from:

	/build/css-font-loader.min.js

Upload it anywhere you like and include it with a script tag:

	<script src="css-font-loader.min.js"></script>

**Common JS Module**

Download the commonjs module located from:

	/src/loaders/CSSFontLoader/index.js

Save it anywhere you like in your development environment, and include it like normal:

	var CSSFontLoader = require('./loaders/CSSFontLoader');

# Usage

Create a CSS file with @font-face references to all the fonts you'd like to load using @font-face. For this example, lets call our CSS file **myFonts.css** and add this webfont to it:
~~~~
@font-face {
	font-family: 'Roboto';
	font-style: normal;
	font-weight: 400;
	src: url(https://fonts.gstatic.com/s/roboto/v15/ek4gzZ-GeXAPcSbHtCeQI_esZW2xOQ-xsNqO47m55DA.woff2) format('woff2');
}
~~~~
Then load the fonts like this:
~~~~
CSSFontLoader.load('fonts/myFonts.css', function(){ console.log('Fonts loaded.') });
~~~~
If you preffer to load the javascript libraries directly using script tags or other methods, you can use this stand-alone version of the library:

	/build/css-font-loader.min.js

This repository also includes a commonjs module version of the code located here:

	/src/loaders/CSSFontLoader/index.js

# Methods

**CSSFontLoader.load** ( cssURL[, callback] ) returns _Promise_
 > Loads the given CSS file, then checks to see when all the fonts found in the CSS have fully loaded. If no callback is referenced, then a Promise is returned. If no Promise is found for the platform, then nothing is returned.

 > **cssURL** - URL to a CSS Stylesheet with @font-face

**CSSFontLoader.loadFromCSS** ( cssSource[, callback])
 > Scans CSS source code passed through as a string for all font-face references and fires the callback when the fonts are fully loaded.
 
 > **cssSource** - CSS Stylesheet source as a string.
 
 **CSSFontLoader.setPromise** ( promiseLibrary )
 > If you're using a Promise library that doesn't use a global Promise reference, then you can set it for use by CSS Font Loader here.
 
 > **promiseLibrary** - A reference to a Promise library.

# Building

To build a stand alone javascript file you can load directly, run:

	gulp

This compiles a minified version of the library (css-font-loader.min.js), and a fullsized version of the library with a sourcemap (css-font-loader.js, css-font-loader.js.map) located in:

	/build/

To test the commonjs usage example, you can run:

	gulp example


# Examples

### JavaScript library (must be run on an HTTP server)

This example uses the compiled JavaScript library version of CSS Font Loader. You can find it here:

	/examples/static/

### CommonJS Module

This example uses the CommonJS module version of CSS Font Loader. You can find it here:

	/examples/commonjs/