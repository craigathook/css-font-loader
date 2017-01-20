'use strict';

var CSSFontLoader = function() {

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
    var originalFonts = getCSSFonts(cssSource);
    
    var styleTag = document.createElement('style');

    var id = String(new Date().getTime());
    
    for(var i in originalFonts) { // force css to use font family name in single quotes
      var font = originalFonts[i];
      var regex = new RegExp('[\'|"]' + font.family + '[\'|"]'   , 'g');
      //font.family = font.family + new Date().getTime(); // make font family name unique.
      cssSource = String(cssSource).replace(regex, '\'' + font.family + '\'', 'g'); // replace the font family name.
    }

    
    styleTag.innerHTML = cssSource;
    document.head.appendChild(styleTag);
    
    var fontsToLoad = getCSSFonts(cssSource);

    //console.log(fontsToLoad);

    api.waitForWebfonts(fontsToLoad, function() {
      //styleTag.innerHTML = styleTag.innerHTML+cssOriginal;
      if(callback) callback(); 
    });
  }

  api.waitForWebfonts = function(fonts, callback) {
    //console.log('waitForWebfonts', fonts);
    var loadedFonts = 0;
    var testNodes = [];
    for(var i = 0, l = fonts.length; i < l; ++i) {
      var font = fonts[i];
      var family = font.family;
      var weight = font.weight;
      var style = font.style;

      // console.log('build font test for:', family, weight, style);

      var testNode = createFontTestNode(family, weight, style);
      testNodes.push({ elem: testNode, width: testNode.offsetWidth });
      testNode.style.fontFamily = '\'' + family + '\', sans-serif';       
    }
    setTimeout(function(){
      checkFonts(testNodes, callback);
    },0);
  }
  
  function checkFonts(nodes, callback) {
    // Compare current width with original width
    //console.log('checking');
    var pass = true;
    for(var n in nodes){
      var node = nodes[n];
      if(node.width == node.elem.offsetWidth){
        pass = false;
      }
    }
    if(pass){
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
    node.innerHTML = '9giItT1WQy@!-/#'; // Characters that vary significantly among different fonts
    node.style.position      = 'absolute'; // Visible - so we can measure it - but not on the screen
    // node.style.display = 'block'; // for debug
    // node.style.float = 'left'; // for debug
    node.style.left          = '-10000px';
    node.style.top           = '-10000px';
    node.style.fontSize      = '30000px'; // Large font size makes even subtle changes obvious
    // Reset any font properties
    node.style.fontFamily    = 'sans-serif';
    node.style.fontVariant   = 'normal';
    node.style.fontStyle     = style;
    node.style.fontWeight    = weight;
    node.style.letterSpacing = '0';
    node.style.whiteSpace    = 'nowrap';
    document.body.appendChild(node);
    
    return node;
  }
  
  function getCSSFonts(cssSource) {
    var fontCSS = getCSSSelectorContents('@font-face', cssSource);
    var fonts = [];
    for(var f in fontCSS) {
      var css = fontCSS[f];
      var font = {};
      font.weight = getCSSPropertyValues('font-weight', css)[0].replace(/["']+/g, '');
      font.family = getCSSPropertyValues('font-family', css)[0].replace(/["']+/g, '');
      font.style = getCSSPropertyValues('font-style', css)[0].replace(/["']+/g, '');
      fonts.push(font);
      //console.log('family', font.family);
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