'use strict';

var CSSFontLoader = require('../../../src/loaders/CSSFontLoader');

function Main() {
  console.log('Main: instance');

  var cssFontURL = 'https://fonts.googleapis.com/css?family=Indie+Flower|Roboto';

  CSSFontLoader.load(cssFontURL, fontsLoaded);

  function fontsLoaded() {
    console.log('Fonts Loaded.');
  }
}

var main = new Main();
