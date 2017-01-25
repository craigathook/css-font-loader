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