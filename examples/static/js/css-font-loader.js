(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CSSFontLoader = require('./loaders/CSSFontLoader');

window.CSSFontLoader = CSSFontLoader;
},{"./loaders/CSSFontLoader":2}],2:[function(require,module,exports){
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
},{}]},{},[1])

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIi4vc3JjL2Nzcy1mb250LWxvYWRlci5qcyIsIlM6L2Nzcy1mb250LWxvYWRlci9zcmMvbG9hZGVycy9DU1NGb250TG9hZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ1NTRm9udExvYWRlciA9IHJlcXVpcmUoJy4vbG9hZGVycy9DU1NGb250TG9hZGVyJyk7XHJcblxyXG53aW5kb3cuQ1NTRm9udExvYWRlciA9IENTU0ZvbnRMb2FkZXI7IiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIENTU0ZvbnRMb2FkZXIgPSBmdW5jdGlvbigpIHtcclxuXHJcbiAgdmFyIF9Qcm9taXNlID0gbnVsbDtcclxuICB2YXIgX3VybCA9IG51bGw7XHJcblxyXG4gIGlmKHR5cGVvZiBQcm9taXNlICE9PSAndW5kZWZpbmVkJyAmJiBQcm9taXNlLnRvU3RyaW5nKCkuaW5kZXhPZignW25hdGl2ZSBjb2RlXScpICE9PSAtMSl7IC8vIGNoZWNrIGlmIHRoZXJlIGlzIG5hdGl2ZSBwcm9taXNlIHN1cHBvcnQuXHJcbiAgICAgIF9Qcm9taXNlID0gUHJvbWlzZTtcclxuICB9XHJcblxyXG4gIHZhciBhcGkgPSB7fTtcclxuXHJcbiAgYXBpLnNldFByb21pc2UgPSBmdW5jdGlvbihwcm9taXNlTGliKSB7IF9Qcm9taXNlID0gcHJvbWlzZUxpYiB9O1xyXG5cclxuICBhcGkubG9hZCA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spIHtcclxuICAgIF91cmwgPSB1cmw7XHJcblxyXG4gICAgaWYoY2FsbGJhY2spe1xyXG4gICAgICBhcGkuZG93bmxvYWRDU1MoY2FsbGJhY2spO1xyXG4gICAgfSBlbHNlIGlmKF9Qcm9taXNlKSB7IFxyXG4gICAgICByZXR1cm4gbmV3IF9Qcm9taXNlKGFwaS5kb3dubG9hZENTUykgXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhcGkuZG93bmxvYWRDU1MoZnVuY3Rpb24oKXt9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFwaS5kb3dubG9hZENTUyA9IGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHhoci5vcGVuKCdHRVQnLCBfdXJsLCB0cnVlKTtcclxuXHJcbiAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgIT09IDQpIHJldHVybjtcclxuICAgICAgaWYgKHRoaXMuc3RhdHVzICE9PSAyMDApIHJldHVybjtcclxuICAgICAgXHJcbiAgICAgIHZhciBjc3NTb3VyY2UgPSBTdHJpbmcodGhpcy5yZXNwb25zZVRleHQpLnJlcGxhY2UoLyAqbG9jYWxcXChbXildKlxcKSwgKi9nLCAnJyk7IC8vIHJlbW92ZSBhbGwgbG9jYWwgcmVmZXJlbmNlcyB0byBmb3JjZSByZW1vdGUgZm9udCBmaWxlIHRvIGJlIGRvd25sb2FkZWQgYW5kIHVzZWRcclxuICAgICAgXHJcbiAgICAgIGFwaS5sb2FkRnJvbUNTUyhjc3NTb3VyY2UsIHJlc29sdmUpO1xyXG4gICAgfVxyXG5cclxuICAgIHhoci5zZW5kKCk7XHJcblxyXG4gIH07XHJcblxyXG4gIGFwaS5sb2FkRnJvbUNTUyA9IGZ1bmN0aW9uKGNzc1NvdXJjZSwgY2FsbGJhY2spe1xyXG4gICAgdmFyIGNzc09yaWdpbmFsID0gY3NzU291cmNlO1xyXG4gICAgdmFyIG9yaWdpbmFsRm9udHMgPSBnZXRDU1NGb250cyhjc3NTb3VyY2UpO1xyXG4gICAgXHJcbiAgICB2YXIgc3R5bGVUYWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG5cclxuICAgIHZhciBpZCA9IFN0cmluZyhuZXcgRGF0ZSgpLmdldFRpbWUoKSk7XHJcbiAgICBcclxuICAgIGZvcih2YXIgaSBpbiBvcmlnaW5hbEZvbnRzKSB7IC8vIGZvcmNlIGNzcyB0byB1c2UgZm9udCBmYW1pbHkgbmFtZSBpbiBzaW5nbGUgcXVvdGVzXHJcbiAgICAgIHZhciBmb250ID0gb3JpZ2luYWxGb250c1tpXTtcclxuICAgICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCgnW1xcJ3xcIl0nICsgZm9udC5mYW1pbHkgKyAnW1xcJ3xcIl0nICAgLCAnZycpO1xyXG4gICAgICAvL2ZvbnQuZmFtaWx5ID0gZm9udC5mYW1pbHkgKyBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgLy8gbWFrZSBmb250IGZhbWlseSBuYW1lIHVuaXF1ZS5cclxuICAgICAgY3NzU291cmNlID0gU3RyaW5nKGNzc1NvdXJjZSkucmVwbGFjZShyZWdleCwgJ1xcJycgKyBmb250LmZhbWlseSArICdcXCcnLCAnZycpOyAvLyByZXBsYWNlIHRoZSBmb250IGZhbWlseSBuYW1lLlxyXG4gICAgfVxyXG5cclxuICAgIFxyXG4gICAgc3R5bGVUYWcuaW5uZXJIVE1MID0gY3NzU291cmNlO1xyXG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdHlsZVRhZyk7XHJcbiAgICBcclxuICAgIHZhciBmb250c1RvTG9hZCA9IGdldENTU0ZvbnRzKGNzc1NvdXJjZSk7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhmb250c1RvTG9hZCk7XHJcblxyXG4gICAgYXBpLndhaXRGb3JXZWJmb250cyhmb250c1RvTG9hZCwgZnVuY3Rpb24oKSB7XHJcbiAgICAgIC8vc3R5bGVUYWcuaW5uZXJIVE1MID0gc3R5bGVUYWcuaW5uZXJIVE1MK2Nzc09yaWdpbmFsO1xyXG4gICAgICBpZihjYWxsYmFjaykgY2FsbGJhY2soKTsgXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFwaS53YWl0Rm9yV2ViZm9udHMgPSBmdW5jdGlvbihmb250cywgY2FsbGJhY2spIHtcclxuICAgIC8vY29uc29sZS5sb2coJ3dhaXRGb3JXZWJmb250cycsIGZvbnRzKTtcclxuICAgIHZhciBsb2FkZWRGb250cyA9IDA7XHJcbiAgICB2YXIgdGVzdE5vZGVzID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwLCBsID0gZm9udHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XHJcbiAgICAgIHZhciBmb250ID0gZm9udHNbaV07XHJcbiAgICAgIHZhciBmYW1pbHkgPSBmb250LmZhbWlseTtcclxuICAgICAgdmFyIHdlaWdodCA9IGZvbnQud2VpZ2h0O1xyXG4gICAgICB2YXIgc3R5bGUgPSBmb250LnN0eWxlO1xyXG5cclxuICAgICAgLy8gY29uc29sZS5sb2coJ2J1aWxkIGZvbnQgdGVzdCBmb3I6JywgZmFtaWx5LCB3ZWlnaHQsIHN0eWxlKTtcclxuXHJcbiAgICAgIHZhciB0ZXN0Tm9kZSA9IGNyZWF0ZUZvbnRUZXN0Tm9kZShmYW1pbHksIHdlaWdodCwgc3R5bGUpO1xyXG4gICAgICB0ZXN0Tm9kZXMucHVzaCh7IGVsZW06IHRlc3ROb2RlLCB3aWR0aDogdGVzdE5vZGUub2Zmc2V0V2lkdGggfSk7XHJcbiAgICAgIHRlc3ROb2RlLnN0eWxlLmZvbnRGYW1pbHkgPSAnXFwnJyArIGZhbWlseSArICdcXCcsIHNhbnMtc2VyaWYnOyAgICAgICBcclxuICAgIH1cclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgY2hlY2tGb250cyh0ZXN0Tm9kZXMsIGNhbGxiYWNrKTtcclxuICAgIH0sMCk7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBDb21wYXJlIGN1cnJlbnQgd2lkdGggd2l0aCBvcmlnaW5hbCB3aWR0aFxyXG4gICAgLy9jb25zb2xlLmxvZygnY2hlY2tpbmcnKTtcclxuICAgIHZhciBwYXNzID0gdHJ1ZTtcclxuICAgIGZvcih2YXIgbiBpbiBub2Rlcyl7XHJcbiAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgIGlmKG5vZGUud2lkdGggPT0gbm9kZS5lbGVtLm9mZnNldFdpZHRoKXtcclxuICAgICAgICBwYXNzID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmKHBhc3Mpe1xyXG4gICAgICBmb3IodmFyIG4gaW4gbm9kZXMpe1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgICAgbm9kZS5lbGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZS5lbGVtKTtcclxuICAgICAgfVxyXG4gICAgICBub2RlcyA9IFtdO1xyXG4gICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKTtcclxuICAgICAgfSw1MCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlRm9udFRlc3ROb2RlKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSl7XHJcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgIG5vZGUuaW5uZXJIVE1MID0gJzlnaUl0VDFXUXlAIS0vIyc7IC8vIENoYXJhY3RlcnMgdGhhdCB2YXJ5IHNpZ25pZmljYW50bHkgYW1vbmcgZGlmZmVyZW50IGZvbnRzXHJcbiAgICBub2RlLnN0eWxlLnBvc2l0aW9uICAgICAgPSAnYWJzb2x1dGUnOyAvLyBWaXNpYmxlIC0gc28gd2UgY2FuIG1lYXN1cmUgaXQgLSBidXQgbm90IG9uIHRoZSBzY3JlZW5cclxuICAgIC8vIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7IC8vIGZvciBkZWJ1Z1xyXG4gICAgLy8gbm9kZS5zdHlsZS5mbG9hdCA9ICdsZWZ0JzsgLy8gZm9yIGRlYnVnXHJcbiAgICBub2RlLnN0eWxlLmxlZnQgICAgICAgICAgPSAnLTEwMDAwcHgnO1xyXG4gICAgbm9kZS5zdHlsZS50b3AgICAgICAgICAgID0gJy0xMDAwMHB4JztcclxuICAgIG5vZGUuc3R5bGUuZm9udFNpemUgICAgICA9ICczMDAwMHB4JzsgLy8gTGFyZ2UgZm9udCBzaXplIG1ha2VzIGV2ZW4gc3VidGxlIGNoYW5nZXMgb2J2aW91c1xyXG4gICAgLy8gUmVzZXQgYW55IGZvbnQgcHJvcGVydGllc1xyXG4gICAgbm9kZS5zdHlsZS5mb250RmFtaWx5ICAgID0gJ3NhbnMtc2VyaWYnO1xyXG4gICAgbm9kZS5zdHlsZS5mb250VmFyaWFudCAgID0gJ25vcm1hbCc7XHJcbiAgICBub2RlLnN0eWxlLmZvbnRTdHlsZSAgICAgPSBzdHlsZTtcclxuICAgIG5vZGUuc3R5bGUuZm9udFdlaWdodCAgICA9IHdlaWdodDtcclxuICAgIG5vZGUuc3R5bGUubGV0dGVyU3BhY2luZyA9ICcwJztcclxuICAgIG5vZGUuc3R5bGUud2hpdGVTcGFjZSAgICA9ICdub3dyYXAnO1xyXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIG5vZGU7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdldENTU0ZvbnRzKGNzc1NvdXJjZSkge1xyXG4gICAgdmFyIGZvbnRDU1MgPSBnZXRDU1NTZWxlY3RvckNvbnRlbnRzKCdAZm9udC1mYWNlJywgY3NzU291cmNlKTtcclxuICAgIHZhciBmb250cyA9IFtdO1xyXG4gICAgZm9yKHZhciBmIGluIGZvbnRDU1MpIHtcclxuICAgICAgdmFyIGNzcyA9IGZvbnRDU1NbZl07XHJcbiAgICAgIHZhciBmb250ID0ge307XHJcbiAgICAgIGZvbnQud2VpZ2h0ID0gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoJ2ZvbnQtd2VpZ2h0JywgY3NzKVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBmb250LmZhbWlseSA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdmb250LWZhbWlseScsIGNzcylbMF0ucmVwbGFjZSgvW1wiJ10rL2csICcnKTtcclxuICAgICAgZm9udC5zdHlsZSA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdmb250LXN0eWxlJywgY3NzKVswXS5yZXBsYWNlKC9bXCInXSsvZywgJycpO1xyXG4gICAgICBmb250cy5wdXNoKGZvbnQpO1xyXG4gICAgICAvL2NvbnNvbGUubG9nKCdmYW1pbHknLCBmb250LmZhbWlseSk7XHJcbiAgICB9XHJcbiAgICB3aW5kb3cuZm9udHMgPSBmb250cztcclxuICAgIGZvbnRzID0gcmVtb3ZlRHVwbGljYXRlT2JqZWN0cyhmb250cyk7XHJcbiAgICByZXR1cm4gZm9udHM7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGdldENTU1VybHMoY3NzU291cmNlKXtcclxuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ3VybFxcXFxiW15cXFxcKF0qXFxcXCgoW1xcXFxzXFxcXFNdKj8pXFxcXCknLCAnZ20nKTtcclxuICAgIHZhciByZXN1bHRzID0gbnVsbDtcclxuICAgIHZhciBtYXRjaDsgXHJcbiAgICB3aGlsZSAobWF0Y2ggPSByZWdleC5leGVjKGNzc1NvdXJjZSkpIHtcclxuICAgICAgaWYocmVzdWx0cykge1xyXG4gICAgICAgIHJlc3VsdHMucHVzaChtYXRjaFsxXSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0cyA9IFttYXRjaFsxXV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcmVzdWx0cyA9IHJlc3VsdHMubWFwKGZ1bmN0aW9uKGVsZW0pIHsgcmV0dXJuIGVsZW0ucmVwbGFjZSgvW1wiJ1xcc10rL2csICcnKTsgfSk7XHJcbiAgICByZXN1bHRzID0gcmVzdWx0cy5zb3J0KCkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0sIHBvcywgYXJ5KSB7IHJldHVybiAhcG9zIHx8IGl0ZW0gIT0gYXJ5W3BvcyAtIDFdOyB9KTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBnZXRDU1NQcm9wZXJ0eVZhbHVlcyhjc3NQcm9wZXJ0eSwgY3NzU291cmNlKSB7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKGNzc1Byb3BlcnR5KydcXFxcYlteOl0qOihbXFxcXHNcXFxcU10qPyk7JywgJ2dtJyk7XHJcbiAgICB2YXIgcmVzdWx0cyA9IG51bGw7XHJcbiAgICB2YXIgbWF0Y2g7IFxyXG4gICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhjc3NTb3VyY2UpKSB7XHJcbiAgICAgIGlmKHJlc3VsdHMpIHtcclxuICAgICAgICByZXN1bHRzLnB1c2gobWF0Y2hbMV0ucmVwbGFjZSgvWyBcXHRdKy8sICcnKSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmVzdWx0cyA9IFttYXRjaFsxXS5yZXBsYWNlKC9bIFxcdF0rLywgJycpXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiBnZXRDU1NTZWxlY3RvckNvbnRlbnRzKHNlbGVjdG9yLCBjc3NTb3VyY2UpIHtcclxuICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoc2VsZWN0b3IrJ1xcXFxzKnsoW1xcXFxzXFxcXFNdKj8pfScsICdnbScpOyAvL3NlY3Rpb24gZXhhbXBsZTogQGZvbnQtZmFjZSwgI2NvbnRhaW5lclxyXG4gICAgXHJcbiAgICB2YXIgcmVzdWx0cyA9IG51bGw7XHJcbiAgICB2YXIgbWF0Y2g7IFxyXG4gICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhjc3NTb3VyY2UpKSB7XHJcbiAgICAgIGlmKHJlc3VsdHMpIHtcclxuICAgICAgICByZXN1bHRzLnB1c2gobWF0Y2hbMV0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdHMgPSBbbWF0Y2hbMV1dO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gcmVtb3ZlRHVwbGljYXRlcyhvYmplY3QpIHtcclxuICAgIHJldHVybiBvYmplY3Quc29ydCgpLmZpbHRlcihmdW5jdGlvbihpdGVtLCBwb3MsIGFyeSkgeyByZXR1cm4gIXBvcyB8fCBpdGVtICE9IGFyeVtwb3MgLSAxXTsgfSk7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIHJlbW92ZUR1cGxpY2F0ZU9iamVjdHMob2JqZWN0c0FycmF5KSB7XHJcbiAgICAgIHZhciB1c2VkT2JqZWN0cyA9IHt9O1xyXG5cclxuICAgICAgZm9yICh2YXIgaT1vYmplY3RzQXJyYXkubGVuZ3RoIC0gMTtpPj0wO2ktLSkge1xyXG4gICAgICAgICAgdmFyIHNvID0gSlNPTi5zdHJpbmdpZnkob2JqZWN0c0FycmF5W2ldKTtcclxuXHJcbiAgICAgICAgICBpZiAodXNlZE9iamVjdHNbc29dKSB7XHJcbiAgICAgICAgICAgICAgb2JqZWN0c0FycmF5LnNwbGljZShpLCAxKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdXNlZE9iamVjdHNbc29dID0gdHJ1ZTsgICAgICAgICAgXHJcbiAgICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIFxyXG4gICAgICByZXR1cm4gb2JqZWN0c0FycmF5O1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGFwaTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDU1NGb250TG9hZGVyKCk7Il19