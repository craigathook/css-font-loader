(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CSSFontLoader = require('./loaders/CSSFontLoader');

window.CSSFontLoader = CSSFontLoader;
},{"./loaders/CSSFontLoader":2}],2:[function(require,module,exports){
'use strict';

var CSSFontLoader = function() {

  var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
  var isFirefox = typeof InstallTrigger !== 'undefined';
  var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0 || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || safari.pushNotification);
  var isIE = /*@cc_on!@*/false || !!document.documentMode;
  var isEdge = !isIE && !!window.StyleMedia;
  var isChrome = !!window.chrome && !!window.chrome.webstore;

  var _Promise = null;
  var _url = null;

  if(typeof Promise !== 'undefined' && Promise.toString().indexOf('[native code]') !== -1){ // check if there is native promise support.
      _Promise = Promise;
  }

  var api = {};

  api.setPromise = function(promiseLib) { _Promise = promiseLib };

  api.load = function(url, callback) {
    _url = url;

    if(callback){
      api.downloadCSS(callback);
    } else if(_Promise) { 
      return new _Promise(api.downloadCSS) 
    } else {
      api.downloadCSS(function(){});
    }
  }

  api.downloadCSS = function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', _url, true);

    xhr.onreadystatechange = function() {
      if (this.readyState !== 4) return;
      if (this.status !== 200) return;
      
      var cssSource = String(this.responseText).replace(/ *local\([^)]*\), */g, ''); // remove all local references to force remote font file to be downloaded and used
      
      api.loadFromCSS(cssSource, resolve);
    }

    xhr.send();

  };

  api.loadFromCSS = function(cssSource, callback){
    var cssOriginal = cssSource;
    var originalFonts = getCSSFonts(cssSource, true);

    var id = String(new Date().getTime());
    
    var cssNew = api.renderFontCSS(originalFonts);

    var loadedFonts = -1;
    var fontsToLoad = getCSSFonts(cssSource);
    var fontsToReference = getCSSFonts(cssNew, true);

    //console.log('fontsToLoad',fontsToLoad);

    function loadedCallback() {
      loadedFonts++;

      var fontToLoad = fontsToLoad[loadedFonts];
      if(fontToLoad) {

        var fontReferences = fontsToReference.filter(function(fontRef){

          var isSameFont = fontToLoad.family == fontRef.family;
          var isSameStyle = fontToLoad.style == fontRef.style;
          var isSameWeight = fontToLoad.weight == fontRef.weight;

          return isSameFont && isSameStyle && isSameWeight;
        });

        if(isChrome){
          fontToLoad.family = fontToLoad.family;// + fontToLoad.weight + fontToLoad.style + String(new Date().getTime());
        } else {
          fontToLoad.family = fontToLoad.family + fontToLoad.weight + fontToLoad.style + String(new Date().getTime());
        }

        var styleTag = null;

        

        styleTag = document.createElement('style');
        styleTag.innerHTML += api.renderFontCSS(fontReferences);
        document.head.appendChild(styleTag);

        for(var f in fontReferences){
          fontReferences[f].family = fontToLoad.family;
        }

        if(!isChrome){

          styleTag = document.createElement('style');
          styleTag.innerHTML += api.renderFontCSS(fontReferences);
          document.head.appendChild(styleTag);
          
        }

        api.waitForWebfont(fontToLoad, loadedCallback);
      } else {
        //console.log('done----');
        //styleTag.innerHTML = cssOriginal;
        if(callback) callback();
      }
    }

    loadedCallback();
  }

  api.renderFontCSS = function(fonts){
    var cssNew = '';
    for(var i in fonts) { // force css to use font family name in single quotes
      var font = fonts[i];
      //console.log(fonts);
      var uniqueName = font.family;// + font.weight + font.style + String(new Date().getTime());

      cssNew += '@font-face {\n';
      cssNew += ' font-family: \'' + uniqueName + '\'\;\n';
      cssNew += ' font-style: ' + font.style + '\;\n';
      cssNew += ' font-weight: ' + font.weight + '\;\n';
      cssNew += ' src: '+ font.src + '\;\n';
      if(font.unicode) cssNew += ' unicode-range: '+ font.unicode + '\;\n';
      cssNew += '}\n\n';

      var regex = new RegExp('[\'|"]' + font.family + '[\'|"]'   , 'g');
      font.family = uniqueName; // make font family name unique.
    }
    return cssNew;
  }

  api.waitForWebfont = function(font/*s*/, callback) {
    //console.log('waitForWebfont', fonts);
    var loadedFonts = 0;
    var testNodes = [];

    var family = font.family;
    var weight = font.weight;
    var style = font.style;

    var testNode = createFontTestNode(family, weight, style);

    var nullWidth = Number(String(testNode.offsetWidth));
    testNode.style.fontFamily = 'sans-serif';
    var sansWidth = Number(String(testNode.offsetWidth));
    testNode.style.fontFamily = '\'' + String(new Date().getTime()) + '\'';
    var errorWidth = Number(String(testNode.offsetWidth));
    testNode.style.fontFamily = '\'' + String(new Date().getTime()) + '\'';
    var familyWidth = Number(String(testNode.offsetWidth));
    
    testNodes.push({
      family: family,
      weight: weight,
      style: style,
      elem: testNode, 
      nullWidth: nullWidth,
      sansWidth: sansWidth,
      errorWidth: errorWidth,
      changeDetected: 0, 
      loaded: false
    });
      
    //testNodes.forEach(function(e){console.log(e.family, e.weight, e.style, e.nullWidth, e.sansWidth, e.errorWidth, e.elem.offsetWidth)})
    //console.log('====');
    checkFonts(testNodes, callback);
   
  }
  
  function checkFonts(nodes, callback) {
    // Compare current width with original width
    //console.log('====');
    
    nodes.forEach(function(e){
      var newWidth = String(Number(e.elem.offsetWidth));
      e.elem.style.fontFamily = '\'' + e.family + '\', sans-serif';
      
      if(e.nullWidth != newWidth && e.sansWidth != newWidth && e.errorWidth != newWidth) {
        var matchOtherFontWidths = false;
        for(var n in nodes){
          var node = nodes[n];
          matchOtherFontWidths = node.elem.offsetWidth == newWidth;
          if(matchOtherFontWidths) break;
        }
        
        if(matchOtherFontWidths == false) {
          
        }
        e.loaded = true;
        
      }
    });
    var loadedNodes = nodes.filter(function(e){
      return e.loaded;
    });
    //nodes.forEach(function(e){console.log(e.family, e.weight, e.style, e.nullWidth, e.sansWidth, e.errorWidth, e.elem.offsetWidth)})
    if(loadedNodes.length == nodes.length){
      for(var n in nodes){
        var node = nodes[n];
        node.elem.parentNode.removeChild(node.elem);
      }
      nodes = [];
      callback();
    } else {
      setTimeout(function(){
        checkFonts(nodes, callback);
      },50);
    }
  };

  function createFontTestNode(family, weight, style){
    var node = document.createElement('span');
    var testString = '9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#9giItT1WQy@!-/#'; // Characters that vary significantly among different fonts
    node.innerHTML = testString;
    node.style.float = 'left';
    node.style.position      = 'absolute'; // Visible - so we can measure it - but not on the screen
    // node.style.display = 'block'; // for debug
    // node.style.float = 'left'; // for debug
    node.style.left          = '-100000px';
    node.style.top           = '-100000px';
    node.style.fontSize      = '30px'; // Large font size makes even subtle changes obvious
    // Reset any font properties
    //node.style.fontFamily    = 'LoadString45178';
    node.style.fontVariant   = 'normal';
    node.style.fontStyle     = style;
    node.style.fontWeight    = weight;
    node.style.letterSpacing = '0';
    node.style.whiteSpace    = 'nowrap';
    node.style.opacity       = 0;
    document.body.appendChild(node);
    
    return node;
  }
  
  function getCSSFonts(cssSource, includeExtras) {
    var fontCSS = getCSSSelectorContents('@font-face', cssSource);
    var fonts = [];
    for(var f in fontCSS) {
      var css = fontCSS[f];
      var font = {};
      font.weight = getCSSPropertyValues('font-weight', css)[0].replace(/["']+/g, '');
      font.family = getCSSPropertyValues('font-family', css)[0].replace(/["']+/g, '');
      font.style = getCSSPropertyValues('font-style', css)[0].replace(/["']+/g, '');
      if(includeExtras) font.src = getCSSPropertyValues('src', css)[0].replace('format' ,' format');
      var unicode = getCSSPropertyValues('unicode-range', css);
      if(includeExtras && unicode) font.unicode = unicode[0].replace(/["']+/g, '');
      fonts.push(font);
    }
    window.fonts = fonts;
    fonts = removeDuplicateObjects(fonts);
    return fonts;
  }
  
  function getCSSUrls(cssSource){
    var regex = new RegExp('url\\b[^\\(]*\\(([\\s\\S]*?)\\)', 'gm');
    var results = null;
    var match; 
    while (match = regex.exec(cssSource)) {
      if(results) {
        results.push(match[1]);
      } else {
        results = [match[1]];
      }
    }
    
    results = results.map(function(elem) { return elem.replace(/["'\s]+/g, ''); });
    results = results.sort().filter(function(item, pos, ary) { return !pos || item != ary[pos - 1]; });
    
    return results;
  }

  function getCSSPropertyValues(cssProperty, cssSource) {
    var regex = new RegExp(cssProperty+'\\b[^:]*:([\\s\\S]*?);', 'gm');
    var results = null;
    var match; 
    while (match = regex.exec(cssSource)) {
      if(results) {
        results.push(match[1].replace(/[ \t]+/, ''));
      } else {
        results = [match[1].replace(/[ \t]+/, '')];
      }
    }

    return results;
  }
  
  function getCSSSelectorContents(selector, cssSource) {
    var regex = new RegExp(selector+'\\s*{([\\s\\S]*?)}', 'gm'); //section example: @font-face, #container
    
    var results = null;
    var match; 
    while (match = regex.exec(cssSource)) {
      if(results) {
        results.push(match[1]);
      } else {
        results = [match[1]];
      }
    }
    return results;
  }
  
  function removeDuplicates(object) {
    return object.sort().filter(function(item, pos, ary) { return !pos || item != ary[pos - 1]; });
  }
  
  function removeDuplicateObjects(objectsArray) {
      var usedObjects = {};

      for (var i=objectsArray.length - 1;i>=0;i--) {
          var so = JSON.stringify(objectsArray[i]);

          if (usedObjects[so]) {
              objectsArray.splice(i, 1);
          } else {
              usedObjects[so] = true;          
          }
      }
    
      return objectsArray;
  }

  return api;
}

var module = {};
module.exports = CSSFontLoader();
},{}]},{},[1])

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIi4vc3JjL2Nzcy1mb250LWxvYWRlci5qcyIsIlM6L2Nzcy1mb250LWxvYWRlci9zcmMvbG9hZGVycy9DU1NGb250TG9hZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENTU0ZvbnRMb2FkZXIgPSByZXF1aXJlKCcuL2xvYWRlcnMvQ1NTRm9udExvYWRlcicpO1xyXG5cclxud2luZG93LkNTU0ZvbnRMb2FkZXIgPSBDU1NGb250TG9hZGVyOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBDU1NGb250TG9hZGVyID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gIHZhciBpc09wZXJhID0gKCEhd2luZG93Lm9wciAmJiAhIW9wci5hZGRvbnMpIHx8ICEhd2luZG93Lm9wZXJhIHx8IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZignIE9QUi8nKSA+PSAwO1xyXG4gIHZhciBpc0ZpcmVmb3ggPSB0eXBlb2YgSW5zdGFsbFRyaWdnZXIgIT09ICd1bmRlZmluZWQnO1xyXG4gIHZhciBpc1NhZmFyaSA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh3aW5kb3cuSFRNTEVsZW1lbnQpLmluZGV4T2YoJ0NvbnN0cnVjdG9yJykgPiAwIHx8IChmdW5jdGlvbiAocCkgeyByZXR1cm4gcC50b1N0cmluZygpID09PSBcIltvYmplY3QgU2FmYXJpUmVtb3RlTm90aWZpY2F0aW9uXVwiOyB9KSghd2luZG93WydzYWZhcmknXSB8fCBzYWZhcmkucHVzaE5vdGlmaWNhdGlvbik7XHJcbiAgdmFyIGlzSUUgPSAvKkBjY19vbiFAKi9mYWxzZSB8fCAhIWRvY3VtZW50LmRvY3VtZW50TW9kZTtcclxuICB2YXIgaXNFZGdlID0gIWlzSUUgJiYgISF3aW5kb3cuU3R5bGVNZWRpYTtcclxuICB2YXIgaXNDaHJvbWUgPSAhIXdpbmRvdy5jaHJvbWUgJiYgISF3aW5kb3cuY2hyb21lLndlYnN0b3JlO1xyXG5cclxuICB2YXIgX1Byb21pc2UgPSBudWxsO1xyXG4gIHZhciBfdXJsID0gbnVsbDtcclxuXHJcbiAgaWYodHlwZW9mIFByb21pc2UgIT09ICd1bmRlZmluZWQnICYmIFByb21pc2UudG9TdHJpbmcoKS5pbmRleE9mKCdbbmF0aXZlIGNvZGVdJykgIT09IC0xKXsgLy8gY2hlY2sgaWYgdGhlcmUgaXMgbmF0aXZlIHByb21pc2Ugc3VwcG9ydC5cclxuICAgICAgX1Byb21pc2UgPSBQcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgdmFyIGFwaSA9IHt9O1xyXG5cclxuICBhcGkuc2V0UHJvbWlzZSA9IGZ1bmN0aW9uKHByb21pc2VMaWIpIHsgX1Byb21pc2UgPSBwcm9taXNlTGliIH07XHJcblxyXG4gIGFwaS5sb2FkID0gZnVuY3Rpb24odXJsLCBjYWxsYmFjaykge1xyXG4gICAgX3VybCA9IHVybDtcclxuXHJcbiAgICBpZihjYWxsYmFjayl7XHJcbiAgICAgIGFwaS5kb3dubG9hZENTUyhjYWxsYmFjayk7XHJcbiAgICB9IGVsc2UgaWYoX1Byb21pc2UpIHsgXHJcbiAgICAgIHJldHVybiBuZXcgX1Byb21pc2UoYXBpLmRvd25sb2FkQ1NTKSBcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGFwaS5kb3dubG9hZENTUyhmdW5jdGlvbigpe30pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYXBpLmRvd25sb2FkQ1NTID0gZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgeGhyLm9wZW4oJ0dFVCcsIF91cmwsIHRydWUpO1xyXG5cclxuICAgIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMucmVhZHlTdGF0ZSAhPT0gNCkgcmV0dXJuO1xyXG4gICAgICBpZiAodGhpcy5zdGF0dXMgIT09IDIwMCkgcmV0dXJuO1xyXG4gICAgICBcclxuICAgICAgdmFyIGNzc1NvdXJjZSA9IFN0cmluZyh0aGlzLnJlc3BvbnNlVGV4dCkucmVwbGFjZSgvICpsb2NhbFxcKFteKV0qXFwpLCAqL2csICcnKTsgLy8gcmVtb3ZlIGFsbCBsb2NhbCByZWZlcmVuY2VzIHRvIGZvcmNlIHJlbW90ZSBmb250IGZpbGUgdG8gYmUgZG93bmxvYWRlZCBhbmQgdXNlZFxyXG4gICAgICBcclxuICAgICAgYXBpLmxvYWRGcm9tQ1NTKGNzc1NvdXJjZSwgcmVzb2x2ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgeGhyLnNlbmQoKTtcclxuXHJcbiAgfTtcclxuXHJcbiAgYXBpLmxvYWRGcm9tQ1NTID0gZnVuY3Rpb24oY3NzU291cmNlLCBjYWxsYmFjayl7XHJcbiAgICB2YXIgY3NzT3JpZ2luYWwgPSBjc3NTb3VyY2U7XHJcbiAgICB2YXIgb3JpZ2luYWxGb250cyA9IGdldENTU0ZvbnRzKGNzc1NvdXJjZSwgdHJ1ZSk7XHJcblxyXG4gICAgdmFyIGlkID0gU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuICAgIFxyXG4gICAgdmFyIGNzc05ldyA9IGFwaS5yZW5kZXJGb250Q1NTKG9yaWdpbmFsRm9udHMpO1xyXG5cclxuICAgIHZhciBsb2FkZWRGb250cyA9IC0xO1xyXG4gICAgdmFyIGZvbnRzVG9Mb2FkID0gZ2V0Q1NTRm9udHMoY3NzU291cmNlKTtcclxuICAgIHZhciBmb250c1RvUmVmZXJlbmNlID0gZ2V0Q1NTRm9udHMoY3NzTmV3LCB0cnVlKTtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKCdmb250c1RvTG9hZCcsZm9udHNUb0xvYWQpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGxvYWRlZENhbGxiYWNrKCkge1xyXG4gICAgICBsb2FkZWRGb250cysrO1xyXG5cclxuICAgICAgdmFyIGZvbnRUb0xvYWQgPSBmb250c1RvTG9hZFtsb2FkZWRGb250c107XHJcbiAgICAgIGlmKGZvbnRUb0xvYWQpIHtcclxuXHJcbiAgICAgICAgdmFyIGZvbnRSZWZlcmVuY2VzID0gZm9udHNUb1JlZmVyZW5jZS5maWx0ZXIoZnVuY3Rpb24oZm9udFJlZil7XHJcblxyXG4gICAgICAgICAgdmFyIGlzU2FtZUZvbnQgPSBmb250VG9Mb2FkLmZhbWlseSA9PSBmb250UmVmLmZhbWlseTtcclxuICAgICAgICAgIHZhciBpc1NhbWVTdHlsZSA9IGZvbnRUb0xvYWQuc3R5bGUgPT0gZm9udFJlZi5zdHlsZTtcclxuICAgICAgICAgIHZhciBpc1NhbWVXZWlnaHQgPSBmb250VG9Mb2FkLndlaWdodCA9PSBmb250UmVmLndlaWdodDtcclxuXHJcbiAgICAgICAgICByZXR1cm4gaXNTYW1lRm9udCAmJiBpc1NhbWVTdHlsZSAmJiBpc1NhbWVXZWlnaHQ7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmKGlzQ2hyb21lKXtcclxuICAgICAgICAgIGZvbnRUb0xvYWQuZmFtaWx5ID0gZm9udFRvTG9hZC5mYW1pbHk7Ly8gKyBmb250VG9Mb2FkLndlaWdodCArIGZvbnRUb0xvYWQuc3R5bGUgKyBTdHJpbmcobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBmb250VG9Mb2FkLmZhbWlseSA9IGZvbnRUb0xvYWQuZmFtaWx5ICsgZm9udFRvTG9hZC53ZWlnaHQgKyBmb250VG9Mb2FkLnN0eWxlICsgU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBzdHlsZVRhZyA9IG51bGw7XHJcblxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBzdHlsZVRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgc3R5bGVUYWcuaW5uZXJIVE1MICs9IGFwaS5yZW5kZXJGb250Q1NTKGZvbnRSZWZlcmVuY2VzKTtcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlVGFnKTtcclxuXHJcbiAgICAgICAgZm9yKHZhciBmIGluIGZvbnRSZWZlcmVuY2VzKXtcclxuICAgICAgICAgIGZvbnRSZWZlcmVuY2VzW2ZdLmZhbWlseSA9IGZvbnRUb0xvYWQuZmFtaWx5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIWlzQ2hyb21lKXtcclxuXHJcbiAgICAgICAgICBzdHlsZVRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgICBzdHlsZVRhZy5pbm5lckhUTUwgKz0gYXBpLnJlbmRlckZvbnRDU1MoZm9udFJlZmVyZW5jZXMpO1xyXG4gICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZVRhZyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwaS53YWl0Rm9yV2ViZm9udChmb250VG9Mb2FkLCBsb2FkZWRDYWxsYmFjayk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZygnZG9uZS0tLS0nKTtcclxuICAgICAgICAvL3N0eWxlVGFnLmlubmVySFRNTCA9IGNzc09yaWdpbmFsO1xyXG4gICAgICAgIGlmKGNhbGxiYWNrKSBjYWxsYmFjaygpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbG9hZGVkQ2FsbGJhY2soKTtcclxuICB9XHJcblxyXG4gIGFwaS5yZW5kZXJGb250Q1NTID0gZnVuY3Rpb24oZm9udHMpe1xyXG4gICAgdmFyIGNzc05ldyA9ICcnO1xyXG4gICAgZm9yKHZhciBpIGluIGZvbnRzKSB7IC8vIGZvcmNlIGNzcyB0byB1c2UgZm9udCBmYW1pbHkgbmFtZSBpbiBzaW5nbGUgcXVvdGVzXHJcbiAgICAgIHZhciBmb250ID0gZm9udHNbaV07XHJcbiAgICAgIC8vY29uc29sZS5sb2coZm9udHMpO1xyXG4gICAgICB2YXIgdW5pcXVlTmFtZSA9IGZvbnQuZmFtaWx5Oy8vICsgZm9udC53ZWlnaHQgKyBmb250LnN0eWxlICsgU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuXHJcbiAgICAgIGNzc05ldyArPSAnQGZvbnQtZmFjZSB7XFxuJztcclxuICAgICAgY3NzTmV3ICs9ICcgZm9udC1mYW1pbHk6IFxcJycgKyB1bmlxdWVOYW1lICsgJ1xcJ1xcO1xcbic7XHJcbiAgICAgIGNzc05ldyArPSAnIGZvbnQtc3R5bGU6ICcgKyBmb250LnN0eWxlICsgJ1xcO1xcbic7XHJcbiAgICAgIGNzc05ldyArPSAnIGZvbnQtd2VpZ2h0OiAnICsgZm9udC53ZWlnaHQgKyAnXFw7XFxuJztcclxuICAgICAgY3NzTmV3ICs9ICcgc3JjOiAnKyBmb250LnNyYyArICdcXDtcXG4nO1xyXG4gICAgICBpZihmb250LnVuaWNvZGUpIGNzc05ldyArPSAnIHVuaWNvZGUtcmFuZ2U6ICcrIGZvbnQudW5pY29kZSArICdcXDtcXG4nO1xyXG4gICAgICBjc3NOZXcgKz0gJ31cXG5cXG4nO1xyXG5cclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnW1xcJ3xcIl0nICsgZm9udC5mYW1pbHkgKyAnW1xcJ3xcIl0nICAgLCAnZycpO1xyXG4gICAgICBmb250LmZhbWlseSA9IHVuaXF1ZU5hbWU7IC8vIG1ha2UgZm9udCBmYW1pbHkgbmFtZSB1bmlxdWUuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3NzTmV3O1xyXG4gIH1cclxuXHJcbiAgYXBpLndhaXRGb3JXZWJmb250ID0gZnVuY3Rpb24oZm9udC8qcyovLCBjYWxsYmFjaykge1xyXG4gICAgLy9jb25zb2xlLmxvZygnd2FpdEZvcldlYmZvbnQnLCBmb250cyk7XHJcbiAgICB2YXIgbG9hZGVkRm9udHMgPSAwO1xyXG4gICAgdmFyIHRlc3ROb2RlcyA9IFtdO1xyXG5cclxuICAgIHZhciBmYW1pbHkgPSBmb250LmZhbWlseTtcclxuICAgIHZhciB3ZWlnaHQgPSBmb250LndlaWdodDtcclxuICAgIHZhciBzdHlsZSA9IGZvbnQuc3R5bGU7XHJcblxyXG4gICAgdmFyIHRlc3ROb2RlID0gY3JlYXRlRm9udFRlc3ROb2RlKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSk7XHJcblxyXG4gICAgdmFyIG51bGxXaWR0aCA9IE51bWJlcihTdHJpbmcodGVzdE5vZGUub2Zmc2V0V2lkdGgpKTtcclxuICAgIHRlc3ROb2RlLnN0eWxlLmZvbnRGYW1pbHkgPSAnc2Fucy1zZXJpZic7XHJcbiAgICB2YXIgc2Fuc1dpZHRoID0gTnVtYmVyKFN0cmluZyh0ZXN0Tm9kZS5vZmZzZXRXaWR0aCkpO1xyXG4gICAgdGVzdE5vZGUuc3R5bGUuZm9udEZhbWlseSA9ICdcXCcnICsgU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSArICdcXCcnO1xyXG4gICAgdmFyIGVycm9yV2lkdGggPSBOdW1iZXIoU3RyaW5nKHRlc3ROb2RlLm9mZnNldFdpZHRoKSk7XHJcbiAgICB0ZXN0Tm9kZS5zdHlsZS5mb250RmFtaWx5ID0gJ1xcJycgKyBTdHJpbmcobmV3IERhdGUoKS5nZXRUaW1lKCkpICsgJ1xcJyc7XHJcbiAgICB2YXIgZmFtaWx5V2lkdGggPSBOdW1iZXIoU3RyaW5nKHRlc3ROb2RlLm9mZnNldFdpZHRoKSk7XHJcbiAgICBcclxuICAgIHRlc3ROb2Rlcy5wdXNoKHtcclxuICAgICAgZmFtaWx5OiBmYW1pbHksXHJcbiAgICAgIHdlaWdodDogd2VpZ2h0LFxyXG4gICAgICBzdHlsZTogc3R5bGUsXHJcbiAgICAgIGVsZW06IHRlc3ROb2RlLCBcclxuICAgICAgbnVsbFdpZHRoOiBudWxsV2lkdGgsXHJcbiAgICAgIHNhbnNXaWR0aDogc2Fuc1dpZHRoLFxyXG4gICAgICBlcnJvcldpZHRoOiBlcnJvcldpZHRoLFxyXG4gICAgICBjaGFuZ2VEZXRlY3RlZDogMCwgXHJcbiAgICAgIGxvYWRlZDogZmFsc2VcclxuICAgIH0pO1xyXG4gICAgICBcclxuICAgIC8vdGVzdE5vZGVzLmZvckVhY2goZnVuY3Rpb24oZSl7Y29uc29sZS5sb2coZS5mYW1pbHksIGUud2VpZ2h0LCBlLnN0eWxlLCBlLm51bGxXaWR0aCwgZS5zYW5zV2lkdGgsIGUuZXJyb3JXaWR0aCwgZS5lbGVtLm9mZnNldFdpZHRoKX0pXHJcbiAgICAvL2NvbnNvbGUubG9nKCc9PT09Jyk7XHJcbiAgICBjaGVja0ZvbnRzKHRlc3ROb2RlcywgY2FsbGJhY2spO1xyXG4gICBcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gY2hlY2tGb250cyhub2RlcywgY2FsbGJhY2spIHtcclxuICAgIC8vIENvbXBhcmUgY3VycmVudCB3aWR0aCB3aXRoIG9yaWdpbmFsIHdpZHRoXHJcbiAgICAvL2NvbnNvbGUubG9nKCc9PT09Jyk7XHJcbiAgICBcclxuICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZSl7XHJcbiAgICAgIHZhciBuZXdXaWR0aCA9IFN0cmluZyhOdW1iZXIoZS5lbGVtLm9mZnNldFdpZHRoKSk7XHJcbiAgICAgIGUuZWxlbS5zdHlsZS5mb250RmFtaWx5ID0gJ1xcJycgKyBlLmZhbWlseSArICdcXCcsIHNhbnMtc2VyaWYnO1xyXG4gICAgICBcclxuICAgICAgaWYoZS5udWxsV2lkdGggIT0gbmV3V2lkdGggJiYgZS5zYW5zV2lkdGggIT0gbmV3V2lkdGggJiYgZS5lcnJvcldpZHRoICE9IG5ld1dpZHRoKSB7XHJcbiAgICAgICAgdmFyIG1hdGNoT3RoZXJGb250V2lkdGhzID0gZmFsc2U7XHJcbiAgICAgICAgZm9yKHZhciBuIGluIG5vZGVzKXtcclxuICAgICAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgICAgICBtYXRjaE90aGVyRm9udFdpZHRocyA9IG5vZGUuZWxlbS5vZmZzZXRXaWR0aCA9PSBuZXdXaWR0aDtcclxuICAgICAgICAgIGlmKG1hdGNoT3RoZXJGb250V2lkdGhzKSBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYobWF0Y2hPdGhlckZvbnRXaWR0aHMgPT0gZmFsc2UpIHtcclxuICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICBlLmxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgdmFyIGxvYWRlZE5vZGVzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uKGUpe1xyXG4gICAgICByZXR1cm4gZS5sb2FkZWQ7XHJcbiAgICB9KTtcclxuICAgIC8vbm9kZXMuZm9yRWFjaChmdW5jdGlvbihlKXtjb25zb2xlLmxvZyhlLmZhbWlseSwgZS53ZWlnaHQsIGUuc3R5bGUsIGUubnVsbFdpZHRoLCBlLnNhbnNXaWR0aCwgZS5lcnJvcldpZHRoLCBlLmVsZW0ub2Zmc2V0V2lkdGgpfSlcclxuICAgIGlmKGxvYWRlZE5vZGVzLmxlbmd0aCA9PSBub2Rlcy5sZW5ndGgpe1xyXG4gICAgICBmb3IodmFyIG4gaW4gbm9kZXMpe1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgICAgbm9kZS5lbGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZS5lbGVtKTtcclxuICAgICAgfVxyXG4gICAgICBub2RlcyA9IFtdO1xyXG4gICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKTtcclxuICAgICAgfSw1MCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlRm9udFRlc3ROb2RlKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSl7XHJcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgIHZhciB0ZXN0U3RyaW5nID0gJzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIzlnaUl0VDFXUXlAIS0vIyc7IC8vIENoYXJhY3RlcnMgdGhhdCB2YXJ5IHNpZ25pZmljYW50bHkgYW1vbmcgZGlmZmVyZW50IGZvbnRzXHJcbiAgICBub2RlLmlubmVySFRNTCA9IHRlc3RTdHJpbmc7XHJcbiAgICBub2RlLnN0eWxlLmZsb2F0ID0gJ2xlZnQnO1xyXG4gICAgbm9kZS5zdHlsZS5wb3NpdGlvbiAgICAgID0gJ2Fic29sdXRlJzsgLy8gVmlzaWJsZSAtIHNvIHdlIGNhbiBtZWFzdXJlIGl0IC0gYnV0IG5vdCBvbiB0aGUgc2NyZWVuXHJcbiAgICAvLyBub2RlLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snOyAvLyBmb3IgZGVidWdcclxuICAgIC8vIG5vZGUuc3R5bGUuZmxvYXQgPSAnbGVmdCc7IC8vIGZvciBkZWJ1Z1xyXG4gICAgbm9kZS5zdHlsZS5sZWZ0ICAgICAgICAgID0gJy0xMDAwMDBweCc7XHJcbiAgICBub2RlLnN0eWxlLnRvcCAgICAgICAgICAgPSAnLTEwMDAwMHB4JztcclxuICAgIG5vZGUuc3R5bGUuZm9udFNpemUgICAgICA9ICczMHB4JzsgLy8gTGFyZ2UgZm9udCBzaXplIG1ha2VzIGV2ZW4gc3VidGxlIGNoYW5nZXMgb2J2aW91c1xyXG4gICAgLy8gUmVzZXQgYW55IGZvbnQgcHJvcGVydGllc1xyXG4gICAgLy9ub2RlLnN0eWxlLmZvbnRGYW1pbHkgICAgPSAnTG9hZFN0cmluZzQ1MTc4JztcclxuICAgIG5vZGUuc3R5bGUuZm9udFZhcmlhbnQgICA9ICdub3JtYWwnO1xyXG4gICAgbm9kZS5zdHlsZS5mb250U3R5bGUgICAgID0gc3R5bGU7XHJcbiAgICBub2RlLnN0eWxlLmZvbnRXZWlnaHQgICAgPSB3ZWlnaHQ7XHJcbiAgICBub2RlLnN0eWxlLmxldHRlclNwYWNpbmcgPSAnMCc7XHJcbiAgICBub2RlLnN0eWxlLndoaXRlU3BhY2UgICAgPSAnbm93cmFwJztcclxuICAgIG5vZGUuc3R5bGUub3BhY2l0eSAgICAgICA9IDA7XHJcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUpO1xyXG4gICAgXHJcbiAgICByZXR1cm4gbm9kZTtcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTRm9udHMoY3NzU291cmNlLCBpbmNsdWRlRXh0cmFzKSB7XHJcbiAgICB2YXIgZm9udENTUyA9IGdldENTU1NlbGVjdG9yQ29udGVudHMoJ0Bmb250LWZhY2UnLCBjc3NTb3VyY2UpO1xyXG4gICAgdmFyIGZvbnRzID0gW107XHJcbiAgICBmb3IodmFyIGYgaW4gZm9udENTUykge1xyXG4gICAgICB2YXIgY3NzID0gZm9udENTU1tmXTtcclxuICAgICAgdmFyIGZvbnQgPSB7fTtcclxuICAgICAgZm9udC53ZWlnaHQgPSBnZXRDU1NQcm9wZXJ0eVZhbHVlcygnZm9udC13ZWlnaHQnLCBjc3MpWzBdLnJlcGxhY2UoL1tcIiddKy9nLCAnJyk7XHJcbiAgICAgIGZvbnQuZmFtaWx5ID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ2ZvbnQtZmFtaWx5JywgY3NzKVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBmb250LnN0eWxlID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ2ZvbnQtc3R5bGUnLCBjc3MpWzBdLnJlcGxhY2UoL1tcIiddKy9nLCAnJyk7XHJcbiAgICAgIGlmKGluY2x1ZGVFeHRyYXMpIGZvbnQuc3JjID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ3NyYycsIGNzcylbMF0ucmVwbGFjZSgnZm9ybWF0JyAsJyBmb3JtYXQnKTtcclxuICAgICAgdmFyIHVuaWNvZGUgPSBnZXRDU1NQcm9wZXJ0eVZhbHVlcygndW5pY29kZS1yYW5nZScsIGNzcyk7XHJcbiAgICAgIGlmKGluY2x1ZGVFeHRyYXMgJiYgdW5pY29kZSkgZm9udC51bmljb2RlID0gdW5pY29kZVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBmb250cy5wdXNoKGZvbnQpO1xyXG4gICAgfVxyXG4gICAgd2luZG93LmZvbnRzID0gZm9udHM7XHJcbiAgICBmb250cyA9IHJlbW92ZUR1cGxpY2F0ZU9iamVjdHMoZm9udHMpO1xyXG4gICAgcmV0dXJuIGZvbnRzO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiBnZXRDU1NVcmxzKGNzc1NvdXJjZSl7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd1cmxcXFxcYlteXFxcXChdKlxcXFwoKFtcXFxcc1xcXFxTXSo/KVxcXFwpJywgJ2dtJyk7XHJcbiAgICB2YXIgcmVzdWx0cyA9IG51bGw7XHJcbiAgICB2YXIgbWF0Y2g7IFxyXG4gICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhjc3NTb3VyY2UpKSB7XHJcbiAgICAgIGlmKHJlc3VsdHMpIHtcclxuICAgICAgICByZXN1bHRzLnB1c2gobWF0Y2hbMV0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdHMgPSBbbWF0Y2hbMV1dO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlc3VsdHMgPSByZXN1bHRzLm1hcChmdW5jdGlvbihlbGVtKSB7IHJldHVybiBlbGVtLnJlcGxhY2UoL1tcIidcXHNdKy9nLCAnJyk7IH0pO1xyXG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuc29ydCgpLmZpbHRlcihmdW5jdGlvbihpdGVtLCBwb3MsIGFyeSkgeyByZXR1cm4gIXBvcyB8fCBpdGVtICE9IGFyeVtwb3MgLSAxXTsgfSk7XHJcbiAgICBcclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoY3NzUHJvcGVydHksIGNzc1NvdXJjZSkge1xyXG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChjc3NQcm9wZXJ0eSsnXFxcXGJbXjpdKjooW1xcXFxzXFxcXFNdKj8pOycsICdnbScpO1xyXG4gICAgdmFyIHJlc3VsdHMgPSBudWxsO1xyXG4gICAgdmFyIG1hdGNoOyBcclxuICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY3NzU291cmNlKSkge1xyXG4gICAgICBpZihyZXN1bHRzKSB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKG1hdGNoWzFdLnJlcGxhY2UoL1sgXFx0XSsvLCAnJykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdHMgPSBbbWF0Y2hbMV0ucmVwbGFjZSgvWyBcXHRdKy8sICcnKV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTU2VsZWN0b3JDb250ZW50cyhzZWxlY3RvciwgY3NzU291cmNlKSB7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKHNlbGVjdG9yKydcXFxccyp7KFtcXFxcc1xcXFxTXSo/KX0nLCAnZ20nKTsgLy9zZWN0aW9uIGV4YW1wbGU6IEBmb250LWZhY2UsICNjb250YWluZXJcclxuICAgIFxyXG4gICAgdmFyIHJlc3VsdHMgPSBudWxsO1xyXG4gICAgdmFyIG1hdGNoOyBcclxuICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY3NzU291cmNlKSkge1xyXG4gICAgICBpZihyZXN1bHRzKSB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKG1hdGNoWzFdKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHRzID0gW21hdGNoWzFdXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIHJlbW92ZUR1cGxpY2F0ZXMob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gb2JqZWN0LnNvcnQoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSwgcG9zLCBhcnkpIHsgcmV0dXJuICFwb3MgfHwgaXRlbSAhPSBhcnlbcG9zIC0gMV07IH0pO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiByZW1vdmVEdXBsaWNhdGVPYmplY3RzKG9iamVjdHNBcnJheSkge1xyXG4gICAgICB2YXIgdXNlZE9iamVjdHMgPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGk9b2JqZWN0c0FycmF5Lmxlbmd0aCAtIDE7aT49MDtpLS0pIHtcclxuICAgICAgICAgIHZhciBzbyA9IEpTT04uc3RyaW5naWZ5KG9iamVjdHNBcnJheVtpXSk7XHJcblxyXG4gICAgICAgICAgaWYgKHVzZWRPYmplY3RzW3NvXSkge1xyXG4gICAgICAgICAgICAgIG9iamVjdHNBcnJheS5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHVzZWRPYmplY3RzW3NvXSA9IHRydWU7ICAgICAgICAgIFxyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBcclxuICAgICAgcmV0dXJuIG9iamVjdHNBcnJheTtcclxuICB9XHJcblxyXG4gIHJldHVybiBhcGk7XHJcbn1cclxuXHJcbnZhciBtb2R1bGUgPSB7fTtcclxubW9kdWxlLmV4cG9ydHMgPSBDU1NGb250TG9hZGVyKCk7Il19