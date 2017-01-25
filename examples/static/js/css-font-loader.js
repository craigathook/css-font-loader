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

module.exports = CSSFontLoader();
},{}]},{},[1])

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIi4vc3JjL2Nzcy1mb250LWxvYWRlci5qcyIsIlM6L2Nzcy1mb250LWxvYWRlci9zcmMvbG9hZGVycy9DU1NGb250TG9hZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDU1NGb250TG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXJzL0NTU0ZvbnRMb2FkZXInKTtcclxuXHJcbndpbmRvdy5DU1NGb250TG9hZGVyID0gQ1NTRm9udExvYWRlcjsiLCIndXNlIHN0cmljdCc7XHJcblxyXG52YXIgQ1NTRm9udExvYWRlciA9IGZ1bmN0aW9uKCkge1xyXG5cclxuICB2YXIgaXNPcGVyYSA9ICghIXdpbmRvdy5vcHIgJiYgISFvcHIuYWRkb25zKSB8fCAhIXdpbmRvdy5vcGVyYSB8fCBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJyBPUFIvJykgPj0gMDtcclxuICB2YXIgaXNGaXJlZm94ID0gdHlwZW9mIEluc3RhbGxUcmlnZ2VyICE9PSAndW5kZWZpbmVkJztcclxuICB2YXIgaXNTYWZhcmkgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwod2luZG93LkhUTUxFbGVtZW50KS5pbmRleE9mKCdDb25zdHJ1Y3RvcicpID4gMCB8fCAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAudG9TdHJpbmcoKSA9PT0gXCJbb2JqZWN0IFNhZmFyaVJlbW90ZU5vdGlmaWNhdGlvbl1cIjsgfSkoIXdpbmRvd1snc2FmYXJpJ10gfHwgc2FmYXJpLnB1c2hOb3RpZmljYXRpb24pO1xyXG4gIHZhciBpc0lFID0gLypAY2Nfb24hQCovZmFsc2UgfHwgISFkb2N1bWVudC5kb2N1bWVudE1vZGU7XHJcbiAgdmFyIGlzRWRnZSA9ICFpc0lFICYmICEhd2luZG93LlN0eWxlTWVkaWE7XHJcbiAgdmFyIGlzQ2hyb21lID0gISF3aW5kb3cuY2hyb21lICYmICEhd2luZG93LmNocm9tZS53ZWJzdG9yZTtcclxuXHJcbiAgdmFyIF9Qcm9taXNlID0gbnVsbDtcclxuICB2YXIgX3VybCA9IG51bGw7XHJcblxyXG4gIGlmKHR5cGVvZiBQcm9taXNlICE9PSAndW5kZWZpbmVkJyAmJiBQcm9taXNlLnRvU3RyaW5nKCkuaW5kZXhPZignW25hdGl2ZSBjb2RlXScpICE9PSAtMSl7IC8vIGNoZWNrIGlmIHRoZXJlIGlzIG5hdGl2ZSBwcm9taXNlIHN1cHBvcnQuXHJcbiAgICAgIF9Qcm9taXNlID0gUHJvbWlzZTtcclxuICB9XHJcblxyXG4gIHZhciBhcGkgPSB7fTtcclxuXHJcbiAgYXBpLnNldFByb21pc2UgPSBmdW5jdGlvbihwcm9taXNlTGliKSB7IF9Qcm9taXNlID0gcHJvbWlzZUxpYiB9O1xyXG5cclxuICBhcGkubG9hZCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcclxuICAgIF91cmwgPSB1cmw7XHJcblxyXG4gICAgaWYoY2FsbGJhY2spe1xyXG4gICAgICBhcGkuZG93bmxvYWRDU1MoY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmKF9Qcm9taXNlKSB7IFxyXG4gICAgICByZXR1cm4gbmV3IF9Qcm9taXNlKGFwaS5kb3dubG9hZENTUykgXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhcGkuZG93bmxvYWRDU1MoZnVuY3Rpb24oKXt9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFwaS5kb3dubG9hZENTUyA9IGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHhoci5vcGVuKCdHRVQnLCBfdXJsLCB0cnVlKTtcclxuXHJcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgIT09IDQpIHJldHVybjtcclxuICAgICAgaWYgKHRoaXMuc3RhdHVzICE9PSAyMDApIHJldHVybjtcclxuICAgICAgXHJcbiAgICAgIHZhciBjc3NTb3VyY2UgPSBTdHJpbmcodGhpcy5yZXNwb25zZVRleHQpLnJlcGxhY2UoLyAqbG9jYWxcXChbXildKlxcKSwgKi9nLCAnJyk7IC8vIHJlbW92ZSBhbGwgbG9jYWwgcmVmZXJlbmNlcyB0byBmb3JjZSByZW1vdGUgZm9udCBmaWxlIHRvIGJlIGRvd25sb2FkZWQgYW5kIHVzZWRcclxuICAgICAgXHJcbiAgICAgIGFwaS5sb2FkRnJvbUNTUyhjc3NTb3VyY2UsIHJlc29sdmUpO1xyXG4gICAgfVxyXG5cclxuICAgIHhoci5zZW5kKCk7XHJcblxyXG4gIH07XHJcblxyXG4gIGFwaS5sb2FkRnJvbUNTUyA9IGZ1bmN0aW9uKGNzc1NvdXJjZSwgY2FsbGJhY2spe1xyXG4gICAgdmFyIGNzc09yaWdpbmFsID0gY3NzU291cmNlO1xyXG4gICAgdmFyIG9yaWdpbmFsRm9udHMgPSBnZXRDU1NGb250cyhjc3NTb3VyY2UsIHRydWUpO1xyXG5cclxuICAgIHZhciBpZCA9IFN0cmluZyhuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XHJcbiAgICBcclxuICAgIHZhciBjc3NOZXcgPSBhcGkucmVuZGVyRm9udENTUyhvcmlnaW5hbEZvbnRzKTtcclxuXHJcbiAgICB2YXIgbG9hZGVkRm9udHMgPSAtMTtcclxuICAgIHZhciBmb250c1RvTG9hZCA9IGdldENTU0ZvbnRzKGNzc1NvdXJjZSk7XHJcbiAgICB2YXIgZm9udHNUb1JlZmVyZW5jZSA9IGdldENTU0ZvbnRzKGNzc05ldywgdHJ1ZSk7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZygnZm9udHNUb0xvYWQnLGZvbnRzVG9Mb2FkKTtcclxuXHJcbiAgICBmdW5jdGlvbiBsb2FkZWRDYWxsYmFjaygpIHtcclxuICAgICAgbG9hZGVkRm9udHMrKztcclxuXHJcbiAgICAgIHZhciBmb250VG9Mb2FkID0gZm9udHNUb0xvYWRbbG9hZGVkRm9udHNdO1xyXG4gICAgICBpZihmb250VG9Mb2FkKSB7XHJcblxyXG4gICAgICAgIHZhciBmb250UmVmZXJlbmNlcyA9IGZvbnRzVG9SZWZlcmVuY2UuZmlsdGVyKGZ1bmN0aW9uKGZvbnRSZWYpe1xyXG5cclxuICAgICAgICAgIHZhciBpc1NhbWVGb250ID0gZm9udFRvTG9hZC5mYW1pbHkgPT0gZm9udFJlZi5mYW1pbHk7XHJcbiAgICAgICAgICB2YXIgaXNTYW1lU3R5bGUgPSBmb250VG9Mb2FkLnN0eWxlID09IGZvbnRSZWYuc3R5bGU7XHJcbiAgICAgICAgICB2YXIgaXNTYW1lV2VpZ2h0ID0gZm9udFRvTG9hZC53ZWlnaHQgPT0gZm9udFJlZi53ZWlnaHQ7XHJcblxyXG4gICAgICAgICAgcmV0dXJuIGlzU2FtZUZvbnQgJiYgaXNTYW1lU3R5bGUgJiYgaXNTYW1lV2VpZ2h0O1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZihpc0Nocm9tZSl7XHJcbiAgICAgICAgICBmb250VG9Mb2FkLmZhbWlseSA9IGZvbnRUb0xvYWQuZmFtaWx5Oy8vICsgZm9udFRvTG9hZC53ZWlnaHQgKyBmb250VG9Mb2FkLnN0eWxlICsgU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgZm9udFRvTG9hZC5mYW1pbHkgPSBmb250VG9Mb2FkLmZhbWlseSArIGZvbnRUb0xvYWQud2VpZ2h0ICsgZm9udFRvTG9hZC5zdHlsZSArIFN0cmluZyhuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgc3R5bGVUYWcgPSBudWxsO1xyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgc3R5bGVUYWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIHN0eWxlVGFnLmlubmVySFRNTCArPSBhcGkucmVuZGVyRm9udENTUyhmb250UmVmZXJlbmNlcyk7XHJcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZVRhZyk7XHJcblxyXG4gICAgICAgIGZvcih2YXIgZiBpbiBmb250UmVmZXJlbmNlcyl7XHJcbiAgICAgICAgICBmb250UmVmZXJlbmNlc1tmXS5mYW1pbHkgPSBmb250VG9Mb2FkLmZhbWlseTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCFpc0Nocm9tZSl7XHJcblxyXG4gICAgICAgICAgc3R5bGVUYWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgICAgc3R5bGVUYWcuaW5uZXJIVE1MICs9IGFwaS5yZW5kZXJGb250Q1NTKGZvbnRSZWZlcmVuY2VzKTtcclxuICAgICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3R5bGVUYWcpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcGkud2FpdEZvcldlYmZvbnQoZm9udFRvTG9hZCwgbG9hZGVkQ2FsbGJhY2spO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ2RvbmUtLS0tJyk7XHJcbiAgICAgICAgLy9zdHlsZVRhZy5pbm5lckhUTUwgPSBjc3NPcmlnaW5hbDtcclxuICAgICAgICBpZihjYWxsYmFjaykgY2FsbGJhY2soKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRlZENhbGxiYWNrKCk7XHJcbiAgfVxyXG5cclxuICBhcGkucmVuZGVyRm9udENTUyA9IGZ1bmN0aW9uKGZvbnRzKXtcclxuICAgIHZhciBjc3NOZXcgPSAnJztcclxuICAgIGZvcih2YXIgaSBpbiBmb250cykgeyAvLyBmb3JjZSBjc3MgdG8gdXNlIGZvbnQgZmFtaWx5IG5hbWUgaW4gc2luZ2xlIHF1b3Rlc1xyXG4gICAgICB2YXIgZm9udCA9IGZvbnRzW2ldO1xyXG4gICAgICAvL2NvbnNvbGUubG9nKGZvbnRzKTtcclxuICAgICAgdmFyIHVuaXF1ZU5hbWUgPSBmb250LmZhbWlseTsvLyArIGZvbnQud2VpZ2h0ICsgZm9udC5zdHlsZSArIFN0cmluZyhuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XHJcblxyXG4gICAgICBjc3NOZXcgKz0gJ0Bmb250LWZhY2Uge1xcbic7XHJcbiAgICAgIGNzc05ldyArPSAnIGZvbnQtZmFtaWx5OiBcXCcnICsgdW5pcXVlTmFtZSArICdcXCdcXDtcXG4nO1xyXG4gICAgICBjc3NOZXcgKz0gJyBmb250LXN0eWxlOiAnICsgZm9udC5zdHlsZSArICdcXDtcXG4nO1xyXG4gICAgICBjc3NOZXcgKz0gJyBmb250LXdlaWdodDogJyArIGZvbnQud2VpZ2h0ICsgJ1xcO1xcbic7XHJcbiAgICAgIGNzc05ldyArPSAnIHNyYzogJysgZm9udC5zcmMgKyAnXFw7XFxuJztcclxuICAgICAgaWYoZm9udC51bmljb2RlKSBjc3NOZXcgKz0gJyB1bmljb2RlLXJhbmdlOiAnKyBmb250LnVuaWNvZGUgKyAnXFw7XFxuJztcclxuICAgICAgY3NzTmV3ICs9ICd9XFxuXFxuJztcclxuXHJcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ1tcXCd8XCJdJyArIGZvbnQuZmFtaWx5ICsgJ1tcXCd8XCJdJyAgICwgJ2cnKTtcclxuICAgICAgZm9udC5mYW1pbHkgPSB1bmlxdWVOYW1lOyAvLyBtYWtlIGZvbnQgZmFtaWx5IG5hbWUgdW5pcXVlLlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGNzc05ldztcclxuICB9XHJcblxyXG4gIGFwaS53YWl0Rm9yV2ViZm9udCA9IGZ1bmN0aW9uKGZvbnQvKnMqLywgY2FsbGJhY2spIHtcclxuICAgIC8vY29uc29sZS5sb2coJ3dhaXRGb3JXZWJmb250JywgZm9udHMpO1xyXG4gICAgdmFyIGxvYWRlZEZvbnRzID0gMDtcclxuICAgIHZhciB0ZXN0Tm9kZXMgPSBbXTtcclxuXHJcbiAgICB2YXIgZmFtaWx5ID0gZm9udC5mYW1pbHk7XHJcbiAgICB2YXIgd2VpZ2h0ID0gZm9udC53ZWlnaHQ7XHJcbiAgICB2YXIgc3R5bGUgPSBmb250LnN0eWxlO1xyXG5cclxuICAgIHZhciB0ZXN0Tm9kZSA9IGNyZWF0ZUZvbnRUZXN0Tm9kZShmYW1pbHksIHdlaWdodCwgc3R5bGUpO1xyXG5cclxuICAgIHZhciBudWxsV2lkdGggPSBOdW1iZXIoU3RyaW5nKHRlc3ROb2RlLm9mZnNldFdpZHRoKSk7XHJcbiAgICB0ZXN0Tm9kZS5zdHlsZS5mb250RmFtaWx5ID0gJ3NhbnMtc2VyaWYnO1xyXG4gICAgdmFyIHNhbnNXaWR0aCA9IE51bWJlcihTdHJpbmcodGVzdE5vZGUub2Zmc2V0V2lkdGgpKTtcclxuICAgIHRlc3ROb2RlLnN0eWxlLmZvbnRGYW1pbHkgPSAnXFwnJyArIFN0cmluZyhuZXcgRGF0ZSgpLmdldFRpbWUoKSkgKyAnXFwnJztcclxuICAgIHZhciBlcnJvcldpZHRoID0gTnVtYmVyKFN0cmluZyh0ZXN0Tm9kZS5vZmZzZXRXaWR0aCkpO1xyXG4gICAgdGVzdE5vZGUuc3R5bGUuZm9udEZhbWlseSA9ICdcXCcnICsgU3RyaW5nKG5ldyBEYXRlKCkuZ2V0VGltZSgpKSArICdcXCcnO1xyXG4gICAgdmFyIGZhbWlseVdpZHRoID0gTnVtYmVyKFN0cmluZyh0ZXN0Tm9kZS5vZmZzZXRXaWR0aCkpO1xyXG4gICAgXHJcbiAgICB0ZXN0Tm9kZXMucHVzaCh7XHJcbiAgICAgIGZhbWlseTogZmFtaWx5LFxyXG4gICAgICB3ZWlnaHQ6IHdlaWdodCxcclxuICAgICAgc3R5bGU6IHN0eWxlLFxyXG4gICAgICBlbGVtOiB0ZXN0Tm9kZSwgXHJcbiAgICAgIG51bGxXaWR0aDogbnVsbFdpZHRoLFxyXG4gICAgICBzYW5zV2lkdGg6IHNhbnNXaWR0aCxcclxuICAgICAgZXJyb3JXaWR0aDogZXJyb3JXaWR0aCxcclxuICAgICAgY2hhbmdlRGV0ZWN0ZWQ6IDAsIFxyXG4gICAgICBsb2FkZWQ6IGZhbHNlXHJcbiAgICB9KTtcclxuICAgICAgXHJcbiAgICAvL3Rlc3ROb2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGUpe2NvbnNvbGUubG9nKGUuZmFtaWx5LCBlLndlaWdodCwgZS5zdHlsZSwgZS5udWxsV2lkdGgsIGUuc2Fuc1dpZHRoLCBlLmVycm9yV2lkdGgsIGUuZWxlbS5vZmZzZXRXaWR0aCl9KVxyXG4gICAgLy9jb25zb2xlLmxvZygnPT09PScpO1xyXG4gICAgY2hlY2tGb250cyh0ZXN0Tm9kZXMsIGNhbGxiYWNrKTtcclxuICAgXHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBDb21wYXJlIGN1cnJlbnQgd2lkdGggd2l0aCBvcmlnaW5hbCB3aWR0aFxyXG4gICAgLy9jb25zb2xlLmxvZygnPT09PScpO1xyXG4gICAgXHJcbiAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xyXG4gICAgICB2YXIgbmV3V2lkdGggPSBTdHJpbmcoTnVtYmVyKGUuZWxlbS5vZmZzZXRXaWR0aCkpO1xyXG4gICAgICBlLmVsZW0uc3R5bGUuZm9udEZhbWlseSA9ICdcXCcnICsgZS5mYW1pbHkgKyAnXFwnLCBzYW5zLXNlcmlmJztcclxuICAgICAgXHJcbiAgICAgIGlmKGUubnVsbFdpZHRoICE9IG5ld1dpZHRoICYmIGUuc2Fuc1dpZHRoICE9IG5ld1dpZHRoICYmIGUuZXJyb3JXaWR0aCAhPSBuZXdXaWR0aCkge1xyXG4gICAgICAgIHZhciBtYXRjaE90aGVyRm9udFdpZHRocyA9IGZhbHNlO1xyXG4gICAgICAgIGZvcih2YXIgbiBpbiBub2Rlcyl7XHJcbiAgICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW25dO1xyXG4gICAgICAgICAgbWF0Y2hPdGhlckZvbnRXaWR0aHMgPSBub2RlLmVsZW0ub2Zmc2V0V2lkdGggPT0gbmV3V2lkdGg7XHJcbiAgICAgICAgICBpZihtYXRjaE90aGVyRm9udFdpZHRocykgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKG1hdGNoT3RoZXJGb250V2lkdGhzID09IGZhbHNlKSB7XHJcbiAgICAgICAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgIFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHZhciBsb2FkZWROb2RlcyA9IG5vZGVzLmZpbHRlcihmdW5jdGlvbihlKXtcclxuICAgICAgcmV0dXJuIGUubG9hZGVkO1xyXG4gICAgfSk7XHJcbiAgICAvL25vZGVzLmZvckVhY2goZnVuY3Rpb24oZSl7Y29uc29sZS5sb2coZS5mYW1pbHksIGUud2VpZ2h0LCBlLnN0eWxlLCBlLm51bGxXaWR0aCwgZS5zYW5zV2lkdGgsIGUuZXJyb3JXaWR0aCwgZS5lbGVtLm9mZnNldFdpZHRoKX0pXHJcbiAgICBpZihsb2FkZWROb2Rlcy5sZW5ndGggPT0gbm9kZXMubGVuZ3RoKXtcclxuICAgICAgZm9yKHZhciBuIGluIG5vZGVzKXtcclxuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzW25dO1xyXG4gICAgICAgIG5vZGUuZWxlbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUuZWxlbSk7XHJcbiAgICAgIH1cclxuICAgICAgbm9kZXMgPSBbXTtcclxuICAgICAgY2FsbGJhY2soKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICBjaGVja0ZvbnRzKG5vZGVzLCBjYWxsYmFjayk7XHJcbiAgICAgIH0sNTApO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUZvbnRUZXN0Tm9kZShmYW1pbHksIHdlaWdodCwgc3R5bGUpe1xyXG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICB2YXIgdGVzdFN0cmluZyA9ICc5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyM5Z2lJdFQxV1F5QCEtLyMnOyAvLyBDaGFyYWN0ZXJzIHRoYXQgdmFyeSBzaWduaWZpY2FudGx5IGFtb25nIGRpZmZlcmVudCBmb250c1xyXG4gICAgbm9kZS5pbm5lckhUTUwgPSB0ZXN0U3RyaW5nO1xyXG4gICAgbm9kZS5zdHlsZS5mbG9hdCA9ICdsZWZ0JztcclxuICAgIG5vZGUuc3R5bGUucG9zaXRpb24gICAgICA9ICdhYnNvbHV0ZSc7IC8vIFZpc2libGUgLSBzbyB3ZSBjYW4gbWVhc3VyZSBpdCAtIGJ1dCBub3Qgb24gdGhlIHNjcmVlblxyXG4gICAgLy8gbm9kZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJzsgLy8gZm9yIGRlYnVnXHJcbiAgICAvLyBub2RlLnN0eWxlLmZsb2F0ID0gJ2xlZnQnOyAvLyBmb3IgZGVidWdcclxuICAgIG5vZGUuc3R5bGUubGVmdCAgICAgICAgICA9ICctMTAwMDAwcHgnO1xyXG4gICAgbm9kZS5zdHlsZS50b3AgICAgICAgICAgID0gJy0xMDAwMDBweCc7XHJcbiAgICBub2RlLnN0eWxlLmZvbnRTaXplICAgICAgPSAnMzBweCc7IC8vIExhcmdlIGZvbnQgc2l6ZSBtYWtlcyBldmVuIHN1YnRsZSBjaGFuZ2VzIG9idmlvdXNcclxuICAgIC8vIFJlc2V0IGFueSBmb250IHByb3BlcnRpZXNcclxuICAgIC8vbm9kZS5zdHlsZS5mb250RmFtaWx5ICAgID0gJ0xvYWRTdHJpbmc0NTE3OCc7XHJcbiAgICBub2RlLnN0eWxlLmZvbnRWYXJpYW50ICAgPSAnbm9ybWFsJztcclxuICAgIG5vZGUuc3R5bGUuZm9udFN0eWxlICAgICA9IHN0eWxlO1xyXG4gICAgbm9kZS5zdHlsZS5mb250V2VpZ2h0ICAgID0gd2VpZ2h0O1xyXG4gICAgbm9kZS5zdHlsZS5sZXR0ZXJTcGFjaW5nID0gJzAnO1xyXG4gICAgbm9kZS5zdHlsZS53aGl0ZVNwYWNlICAgID0gJ25vd3JhcCc7XHJcbiAgICBub2RlLnN0eWxlLm9wYWNpdHkgICAgICAgPSAwO1xyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdldENTU0ZvbnRzKGNzc1NvdXJjZSwgaW5jbHVkZUV4dHJhcykge1xyXG4gICAgdmFyIGZvbnRDU1MgPSBnZXRDU1NTZWxlY3RvckNvbnRlbnRzKCdAZm9udC1mYWNlJywgY3NzU291cmNlKTtcclxuICAgIHZhciBmb250cyA9IFtdO1xyXG4gICAgZm9yKHZhciBmIGluIGZvbnRDU1MpIHtcclxuICAgICAgdmFyIGNzcyA9IGZvbnRDU1NbZl07XHJcbiAgICAgIHZhciBmb250ID0ge307XHJcbiAgICAgIGZvbnQud2VpZ2h0ID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ2ZvbnQtd2VpZ2h0JywgY3NzKVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBmb250LmZhbWlseSA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdmb250LWZhbWlseScsIGNzcylbMF0ucmVwbGFjZSgvW1wiJ10rL2csICcnKTtcclxuICAgICAgZm9udC5zdHlsZSA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdmb250LXN0eWxlJywgY3NzKVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBpZihpbmNsdWRlRXh0cmFzKSBmb250LnNyYyA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdzcmMnLCBjc3MpWzBdLnJlcGxhY2UoJ2Zvcm1hdCcgLCcgZm9ybWF0Jyk7XHJcbiAgICAgIHZhciB1bmljb2RlID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ3VuaWNvZGUtcmFuZ2UnLCBjc3MpO1xyXG4gICAgICBpZihpbmNsdWRlRXh0cmFzICYmIHVuaWNvZGUpIGZvbnQudW5pY29kZSA9IHVuaWNvZGVbMF0ucmVwbGFjZSgvW1wiJ10rL2csICcnKTtcclxuICAgICAgZm9udHMucHVzaChmb250KTtcclxuICAgIH1cclxuICAgIHdpbmRvdy5mb250cyA9IGZvbnRzO1xyXG4gICAgZm9udHMgPSByZW1vdmVEdXBsaWNhdGVPYmplY3RzKGZvbnRzKTtcclxuICAgIHJldHVybiBmb250cztcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTVXJscyhjc3NTb3VyY2Upe1xyXG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgndXJsXFxcXGJbXlxcXFwoXSpcXFxcKChbXFxcXHNcXFxcU10qPylcXFxcKScsICdnbScpO1xyXG4gICAgdmFyIHJlc3VsdHMgPSBudWxsO1xyXG4gICAgdmFyIG1hdGNoOyBcclxuICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY3NzU291cmNlKSkge1xyXG4gICAgICBpZihyZXN1bHRzKSB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKG1hdGNoWzFdKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHRzID0gW21hdGNoWzFdXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZXN1bHRzID0gcmVzdWx0cy5tYXAoZnVuY3Rpb24oZWxlbSkgeyByZXR1cm4gZWxlbS5yZXBsYWNlKC9bXCInXFxzXSsvZywgJycpOyB9KTtcclxuICAgIHJlc3VsdHMgPSByZXN1bHRzLnNvcnQoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSwgcG9zLCBhcnkpIHsgcmV0dXJuICFwb3MgfHwgaXRlbSAhPSBhcnlbcG9zIC0gMV07IH0pO1xyXG4gICAgXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldENTU1Byb3BlcnR5VmFsdWVzKGNzc1Byb3BlcnR5LCBjc3NTb3VyY2UpIHtcclxuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoY3NzUHJvcGVydHkrJ1xcXFxiW146XSo6KFtcXFxcc1xcXFxTXSo/KTsnLCAnZ20nKTtcclxuICAgIHZhciByZXN1bHRzID0gbnVsbDtcclxuICAgIHZhciBtYXRjaDsgXHJcbiAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKGNzc1NvdXJjZSkpIHtcclxuICAgICAgaWYocmVzdWx0cykge1xyXG4gICAgICAgIHJlc3VsdHMucHVzaChtYXRjaFsxXS5yZXBsYWNlKC9bIFxcdF0rLywgJycpKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHRzID0gW21hdGNoWzFdLnJlcGxhY2UoL1sgXFx0XSsvLCAnJyldO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdldENTU1NlbGVjdG9yQ29udGVudHMoc2VsZWN0b3IsIGNzc1NvdXJjZSkge1xyXG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChzZWxlY3RvcisnXFxcXHMqeyhbXFxcXHNcXFxcU10qPyl9JywgJ2dtJyk7IC8vc2VjdGlvbiBleGFtcGxlOiBAZm9udC1mYWNlLCAjY29udGFpbmVyXHJcbiAgICBcclxuICAgIHZhciByZXN1bHRzID0gbnVsbDtcclxuICAgIHZhciBtYXRjaDsgXHJcbiAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKGNzc1NvdXJjZSkpIHtcclxuICAgICAgaWYocmVzdWx0cykge1xyXG4gICAgICAgIHJlc3VsdHMucHVzaChtYXRjaFsxXSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0cyA9IFttYXRjaFsxXV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiByZW1vdmVEdXBsaWNhdGVzKG9iamVjdCkge1xyXG4gICAgcmV0dXJuIG9iamVjdC5zb3J0KCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0sIHBvcywgYXJ5KSB7IHJldHVybiAhcG9zIHx8IGl0ZW0gIT0gYXJ5W3BvcyAtIDFdOyB9KTtcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gcmVtb3ZlRHVwbGljYXRlT2JqZWN0cyhvYmplY3RzQXJyYXkpIHtcclxuICAgICAgdmFyIHVzZWRPYmplY3RzID0ge307XHJcblxyXG4gICAgICBmb3IgKHZhciBpPW9iamVjdHNBcnJheS5sZW5ndGggLSAxO2k+PTA7aS0tKSB7XHJcbiAgICAgICAgICB2YXIgc28gPSBKU09OLnN0cmluZ2lmeShvYmplY3RzQXJyYXlbaV0pO1xyXG5cclxuICAgICAgICAgIGlmICh1c2VkT2JqZWN0c1tzb10pIHtcclxuICAgICAgICAgICAgICBvYmplY3RzQXJyYXkuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB1c2VkT2JqZWN0c1tzb10gPSB0cnVlOyAgICAgICAgICBcclxuICAgICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgXHJcbiAgICAgIHJldHVybiBvYmplY3RzQXJyYXk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYXBpO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENTU0ZvbnRMb2FkZXIoKTsiXX0=