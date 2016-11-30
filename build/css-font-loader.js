(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var CSSFontLoader = require('./loaders/CSSFontLoader')();

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
      testNodes.push({elem:testNode,width:testNode.offsetWidth});
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
    // node.style.fontSize      = '300px'; // Large font size makes even subtle changes obvious
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

module.exports = CSSFontLoader;
},{}]},{},[1])

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIi4vc3JjL2Nzcy1mb250LWxvYWRlci5qcyIsIlM6L2Nzcy1mb250LWxvYWRlci9zcmMvbG9hZGVycy9DU1NGb250TG9hZGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDU1NGb250TG9hZGVyID0gcmVxdWlyZSgnLi9sb2FkZXJzL0NTU0ZvbnRMb2FkZXInKSgpO1xyXG5cclxud2luZG93LkNTU0ZvbnRMb2FkZXIgPSBDU1NGb250TG9hZGVyOyIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBDU1NGb250TG9hZGVyID0gZnVuY3Rpb24oKSB7XHJcblxyXG4gIHZhciBfUHJvbWlzZSA9IG51bGw7XHJcbiAgdmFyIF91cmwgPSBudWxsO1xyXG5cclxuICBpZih0eXBlb2YgUHJvbWlzZSAhPT0gJ3VuZGVmaW5lZCcgJiYgUHJvbWlzZS50b1N0cmluZygpLmluZGV4T2YoJ1tuYXRpdmUgY29kZV0nKSAhPT0gLTEpeyAvLyBjaGVjayBpZiB0aGVyZSBpcyBuYXRpdmUgcHJvbWlzZSBzdXBwb3J0LlxyXG4gICAgICBfUHJvbWlzZSA9IFByb21pc2U7XHJcbiAgfVxyXG5cclxuICB2YXIgYXBpID0ge307XHJcblxyXG4gIGFwaS5zZXRQcm9taXNlID0gZnVuY3Rpb24ocHJvbWlzZUxpYikgeyBfUHJvbWlzZSA9IHByb21pc2VMaWIgfTtcclxuXHJcbiAgYXBpLmxvYWQgPSBmdW5jdGlvbih1cmwsIGNhbGxiYWNrKSB7XHJcbiAgICBfdXJsID0gdXJsO1xyXG5cclxuICAgIGlmKGNhbGxiYWNrKXtcclxuICAgICAgYXBpLmRvd25sb2FkQ1NTKGNhbGxiYWNrKTtcclxuICAgIH0gZWxzZSBpZihfUHJvbWlzZSkgeyBcclxuICAgICAgcmV0dXJuIG5ldyBfUHJvbWlzZShhcGkuZG93bmxvYWRDU1MpIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgYXBpLmRvd25sb2FkQ1NTKGZ1bmN0aW9uKCl7fSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhcGkuZG93bmxvYWRDU1MgPSBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICB4aHIub3BlbignR0VUJywgX3VybCwgdHJ1ZSk7XHJcblxyXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAodGhpcy5yZWFkeVN0YXRlICE9PSA0KSByZXR1cm47XHJcbiAgICAgIGlmICh0aGlzLnN0YXR1cyAhPT0gMjAwKSByZXR1cm47XHJcbiAgICAgIFxyXG4gICAgICB2YXIgY3NzU291cmNlID0gU3RyaW5nKHRoaXMucmVzcG9uc2VUZXh0KS5yZXBsYWNlKC8gKmxvY2FsXFwoW14pXSpcXCksICovZywgJycpOyAvLyByZW1vdmUgYWxsIGxvY2FsIHJlZmVyZW5jZXMgdG8gZm9yY2UgcmVtb3RlIGZvbnQgZmlsZSB0byBiZSBkb3dubG9hZGVkIGFuZCB1c2VkXHJcbiAgICAgIFxyXG4gICAgICBhcGkubG9hZEZyb21DU1MoY3NzU291cmNlLCByZXNvbHZlKTtcclxuICAgIH1cclxuXHJcbiAgICB4aHIuc2VuZCgpO1xyXG5cclxuICB9O1xyXG5cclxuICBhcGkubG9hZEZyb21DU1MgPSBmdW5jdGlvbihjc3NTb3VyY2UsIGNhbGxiYWNrKXtcclxuICAgIHZhciBjc3NPcmlnaW5hbCA9IGNzc1NvdXJjZTtcclxuICAgIHZhciBvcmlnaW5hbEZvbnRzID0gZ2V0Q1NTRm9udHMoY3NzU291cmNlKTtcclxuICAgIFxyXG4gICAgdmFyIHN0eWxlVGFnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuXHJcbiAgICB2YXIgaWQgPSBTdHJpbmcobmV3IERhdGUoKS5nZXRUaW1lKCkpO1xyXG4gICAgXHJcbiAgICBmb3IodmFyIGkgaW4gb3JpZ2luYWxGb250cykgeyAvLyBmb3JjZSBjc3MgdG8gdXNlIGZvbnQgZmFtaWx5IG5hbWUgaW4gc2luZ2xlIHF1b3Rlc1xyXG4gICAgICB2YXIgZm9udCA9IG9yaWdpbmFsRm9udHNbaV07XHJcbiAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ1tcXCd8XCJdJyArIGZvbnQuZmFtaWx5ICsgJ1tcXCd8XCJdJyAgICwgJ2cnKTtcclxuICAgICAgY3NzU291cmNlID0gU3RyaW5nKGNzc1NvdXJjZSkucmVwbGFjZShyZWdleCwgJ1xcJycgKyBmb250LmZhbWlseSArICdcXCcnLCAnZycpOyAvLyByZXBsYWNlIHRoZSBmb250IGZhbWlseSBuYW1lLlxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBzdHlsZVRhZy5pbm5lckhUTUwgPSBjc3NTb3VyY2U7XHJcbiAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlVGFnKTtcclxuICAgIFxyXG4gICAgdmFyIGZvbnRzVG9Mb2FkID0gZ2V0Q1NTRm9udHMoY3NzU291cmNlKTtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKGZvbnRzVG9Mb2FkKTtcclxuXHJcbiAgICBhcGkud2FpdEZvcldlYmZvbnRzKGZvbnRzVG9Mb2FkLCBmdW5jdGlvbigpIHtcclxuICAgICAgLy9zdHlsZVRhZy5pbm5lckhUTUwgPSBzdHlsZVRhZy5pbm5lckhUTUwrY3NzT3JpZ2luYWw7XHJcbiAgICAgIGlmKGNhbGxiYWNrKSBjYWxsYmFjaygpOyBcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXBpLndhaXRGb3JXZWJmb250cyA9IGZ1bmN0aW9uKGZvbnRzLCBjYWxsYmFjaykge1xyXG4gICAgLy9jb25zb2xlLmxvZygnd2FpdEZvcldlYmZvbnRzJywgZm9udHMpO1xyXG4gICAgdmFyIGxvYWRlZEZvbnRzID0gMDtcclxuICAgIHZhciB0ZXN0Tm9kZXMgPSBbXTtcclxuICAgIGZvcih2YXIgaSA9IDAsIGwgPSBmb250cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcclxuICAgICAgdmFyIGZvbnQgPSBmb250c1tpXTtcclxuICAgICAgdmFyIGZhbWlseSA9IGZvbnQuZmFtaWx5O1xyXG4gICAgICB2YXIgd2VpZ2h0ID0gZm9udC53ZWlnaHQ7XHJcbiAgICAgIHZhciBzdHlsZSA9IGZvbnQuc3R5bGU7XHJcblxyXG4gICAgICAvLyBjb25zb2xlLmxvZygnYnVpbGQgZm9udCB0ZXN0IGZvcjonLCBmYW1pbHksIHdlaWdodCwgc3R5bGUpO1xyXG5cclxuICAgICAgdmFyIHRlc3ROb2RlID0gY3JlYXRlRm9udFRlc3ROb2RlKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSk7XHJcbiAgICAgIHRlc3ROb2Rlcy5wdXNoKHtlbGVtOnRlc3ROb2RlLHdpZHRoOnRlc3ROb2RlLm9mZnNldFdpZHRofSk7XHJcbiAgICAgIHRlc3ROb2RlLnN0eWxlLmZvbnRGYW1pbHkgPSAnXFwnJyArIGZhbWlseSArICdcXCcsIHNhbnMtc2VyaWYnOyAgICAgICBcclxuICAgIH1cclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgY2hlY2tGb250cyh0ZXN0Tm9kZXMsIGNhbGxiYWNrKTtcclxuICAgIH0sMCk7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKSB7XHJcbiAgICAvLyBDb21wYXJlIGN1cnJlbnQgd2lkdGggd2l0aCBvcmlnaW5hbCB3aWR0aFxyXG4gICAgLy9jb25zb2xlLmxvZygnY2hlY2tpbmcnKTtcclxuICAgIHZhciBwYXNzID0gdHJ1ZTtcclxuICAgIGZvcih2YXIgbiBpbiBub2Rlcyl7XHJcbiAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgIGlmKG5vZGUud2lkdGggPT0gbm9kZS5lbGVtLm9mZnNldFdpZHRoKXtcclxuICAgICAgICBwYXNzID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmKHBhc3Mpe1xyXG4gICAgICBmb3IodmFyIG4gaW4gbm9kZXMpe1xyXG4gICAgICAgIHZhciBub2RlID0gbm9kZXNbbl07XHJcbiAgICAgICAgbm9kZS5lbGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZS5lbGVtKTtcclxuICAgICAgfVxyXG4gICAgICBub2RlcyA9IFtdO1xyXG4gICAgICBjYWxsYmFjaygpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgIGNoZWNrRm9udHMobm9kZXMsIGNhbGxiYWNrKTtcclxuICAgICAgfSw1MCk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlRm9udFRlc3ROb2RlKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSl7XHJcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgIG5vZGUuaW5uZXJIVE1MID0gJzlnaUl0VDFXUXlAIS0vIyc7IC8vIENoYXJhY3RlcnMgdGhhdCB2YXJ5IHNpZ25pZmljYW50bHkgYW1vbmcgZGlmZmVyZW50IGZvbnRzXHJcbiAgICBub2RlLnN0eWxlLnBvc2l0aW9uICAgICAgPSAnYWJzb2x1dGUnOyAvLyBWaXNpYmxlIC0gc28gd2UgY2FuIG1lYXN1cmUgaXQgLSBidXQgbm90IG9uIHRoZSBzY3JlZW5cclxuICAgIC8vIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7IC8vIGZvciBkZWJ1Z1xyXG4gICAgLy8gbm9kZS5zdHlsZS5mbG9hdCA9ICdsZWZ0JzsgLy8gZm9yIGRlYnVnXHJcbiAgICBub2RlLnN0eWxlLmxlZnQgICAgICAgICAgPSAnLTEwMDAwcHgnO1xyXG4gICAgbm9kZS5zdHlsZS50b3AgICAgICAgICAgID0gJy0xMDAwMHB4JztcclxuICAgIC8vIG5vZGUuc3R5bGUuZm9udFNpemUgICAgICA9ICczMDBweCc7IC8vIExhcmdlIGZvbnQgc2l6ZSBtYWtlcyBldmVuIHN1YnRsZSBjaGFuZ2VzIG9idmlvdXNcclxuICAgIC8vIFJlc2V0IGFueSBmb250IHByb3BlcnRpZXNcclxuICAgIG5vZGUuc3R5bGUuZm9udEZhbWlseSAgICA9ICdzYW5zLXNlcmlmJztcclxuICAgIG5vZGUuc3R5bGUuZm9udFZhcmlhbnQgICA9ICdub3JtYWwnO1xyXG4gICAgbm9kZS5zdHlsZS5mb250U3R5bGUgICAgID0gc3R5bGU7XHJcbiAgICBub2RlLnN0eWxlLmZvbnRXZWlnaHQgICAgPSB3ZWlnaHQ7XHJcbiAgICBub2RlLnN0eWxlLmxldHRlclNwYWNpbmcgPSAnMCc7XHJcbiAgICBub2RlLnN0eWxlLndoaXRlU3BhY2UgICAgPSAnbm93cmFwJztcclxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSk7XHJcbiAgICBcclxuICAgIHJldHVybiBub2RlO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiBnZXRDU1NGb250cyhjc3NTb3VyY2UpIHtcclxuICAgIHZhciBmb250Q1NTID0gZ2V0Q1NTU2VsZWN0b3JDb250ZW50cygnQGZvbnQtZmFjZScsIGNzc1NvdXJjZSk7XHJcbiAgICB2YXIgZm9udHMgPSBbXTtcclxuICAgIGZvcih2YXIgZiBpbiBmb250Q1NTKSB7XHJcbiAgICAgIHZhciBjc3MgPSBmb250Q1NTW2ZdO1xyXG4gICAgICB2YXIgZm9udCA9IHt9O1xyXG4gICAgICBmb250LndlaWdodCA9IGdldENTU1Byb3BlcnR5VmFsdWVzKCdmb250LXdlaWdodCcsIGNzcylbMF0ucmVwbGFjZSgvW1wiJ10rL2csICcnKTtcclxuICAgICAgZm9udC5mYW1pbHkgPSBnZXRDU1NQcm9wZXJ0eVZhbHVlcygnZm9udC1mYW1pbHknLCBjc3MpWzBdLnJlcGxhY2UoL1tcIiddKy9nLCAnJyk7XHJcbiAgICAgIGZvbnQuc3R5bGUgPSBnZXRDU1NQcm9wZXJ0eVZhbHVlcygnZm9udC1zdHlsZScsIGNzcylbMF0ucmVwbGFjZSgvW1wiJ10rL2csICcnKTtcclxuICAgICAgZm9udHMucHVzaChmb250KTtcclxuICAgICAgLy9jb25zb2xlLmxvZygnZmFtaWx5JywgZm9udC5mYW1pbHkpO1xyXG4gICAgfVxyXG4gICAgd2luZG93LmZvbnRzID0gZm9udHM7XHJcbiAgICBmb250cyA9IHJlbW92ZUR1cGxpY2F0ZU9iamVjdHMoZm9udHMpO1xyXG4gICAgcmV0dXJuIGZvbnRzO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiBnZXRDU1NVcmxzKGNzc1NvdXJjZSl7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKCd1cmxcXFxcYlteXFxcXChdKlxcXFwoKFtcXFxcc1xcXFxTXSo/KVxcXFwpJywgJ2dtJyk7XHJcbiAgICB2YXIgcmVzdWx0cyA9IG51bGw7XHJcbiAgICB2YXIgbWF0Y2g7IFxyXG4gICAgd2hpbGUgKG1hdGNoID0gcmVnZXguZXhlYyhjc3NTb3VyY2UpKSB7XHJcbiAgICAgIGlmKHJlc3VsdHMpIHtcclxuICAgICAgICByZXN1bHRzLnB1c2gobWF0Y2hbMV0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdHMgPSBbbWF0Y2hbMV1dO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlc3VsdHMgPSByZXN1bHRzLm1hcChmdW5jdGlvbihlbGVtKSB7IHJldHVybiBlbGVtLnJlcGxhY2UoL1tcIidcXHNdKy9nLCAnJyk7IH0pO1xyXG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuc29ydCgpLmZpbHRlcihmdW5jdGlvbihpdGVtLCBwb3MsIGFyeSkgeyByZXR1cm4gIXBvcyB8fCBpdGVtICE9IGFyeVtwb3MgLSAxXTsgfSk7XHJcbiAgICBcclxuICAgIHJldHVybiByZXN1bHRzO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTUHJvcGVydHlWYWx1ZXMoY3NzUHJvcGVydHksIGNzc1NvdXJjZSkge1xyXG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChjc3NQcm9wZXJ0eSsnXFxcXGJbXjpdKjooW1xcXFxzXFxcXFNdKj8pOycsICdnbScpO1xyXG4gICAgdmFyIHJlc3VsdHMgPSBudWxsO1xyXG4gICAgdmFyIG1hdGNoOyBcclxuICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY3NzU291cmNlKSkge1xyXG4gICAgICBpZihyZXN1bHRzKSB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKG1hdGNoWzFdLnJlcGxhY2UoL1sgXFx0XSsvLCAnJykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHJlc3VsdHMgPSBbbWF0Y2hbMV0ucmVwbGFjZSgvWyBcXHRdKy8sICcnKV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0cztcclxuICB9XHJcbiAgXHJcbiAgZnVuY3Rpb24gZ2V0Q1NTU2VsZWN0b3JDb250ZW50cyhzZWxlY3RvciwgY3NzU291cmNlKSB7XHJcbiAgICB2YXIgcmVnZXggPSBuZXcgUmVnRXhwKHNlbGVjdG9yKydcXFxccyp7KFtcXFxcc1xcXFxTXSo/KX0nLCAnZ20nKTsgLy9zZWN0aW9uIGV4YW1wbGU6IEBmb250LWZhY2UsICNjb250YWluZXJcclxuICAgIFxyXG4gICAgdmFyIHJlc3VsdHMgPSBudWxsO1xyXG4gICAgdmFyIG1hdGNoOyBcclxuICAgIHdoaWxlIChtYXRjaCA9IHJlZ2V4LmV4ZWMoY3NzU291cmNlKSkge1xyXG4gICAgICBpZihyZXN1bHRzKSB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKG1hdGNoWzFdKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICByZXN1bHRzID0gW21hdGNoWzFdXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG4gIFxyXG4gIGZ1bmN0aW9uIHJlbW92ZUR1cGxpY2F0ZXMob2JqZWN0KSB7XHJcbiAgICByZXR1cm4gb2JqZWN0LnNvcnQoKS5maWx0ZXIoZnVuY3Rpb24oaXRlbSwgcG9zLCBhcnkpIHsgcmV0dXJuICFwb3MgfHwgaXRlbSAhPSBhcnlbcG9zIC0gMV07IH0pO1xyXG4gIH1cclxuICBcclxuICBmdW5jdGlvbiByZW1vdmVEdXBsaWNhdGVPYmplY3RzKG9iamVjdHNBcnJheSkge1xyXG4gICAgICB2YXIgdXNlZE9iamVjdHMgPSB7fTtcclxuXHJcbiAgICAgIGZvciAodmFyIGk9b2JqZWN0c0FycmF5Lmxlbmd0aCAtIDE7aT49MDtpLS0pIHtcclxuICAgICAgICAgIHZhciBzbyA9IEpTT04uc3RyaW5naWZ5KG9iamVjdHNBcnJheVtpXSk7XHJcblxyXG4gICAgICAgICAgaWYgKHVzZWRPYmplY3RzW3NvXSkge1xyXG4gICAgICAgICAgICAgIG9iamVjdHNBcnJheS5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHVzZWRPYmplY3RzW3NvXSA9IHRydWU7ICAgICAgICAgIFxyXG4gICAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICBcclxuICAgICAgcmV0dXJuIG9iamVjdHNBcnJheTtcclxuICB9XHJcblxyXG4gIHJldHVybiBhcGk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ1NTRm9udExvYWRlcjsiXX0=