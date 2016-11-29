(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var AlphaJPEGModule = require('./utils/AlphaJPEG');

window.AlphaJPEG = AlphaJPEGModule;
},{"./utils/AlphaJPEG":2}],2:[function(require,module,exports){
function AlphaJPEG(){
  var self = this;
  
  self.load = function(target, src, options) {
    
    var onComplete = function(){};
    if(typeof target == 'string') {
        target = document.querySelector(target);
    }
    var pixelRatio = 1;
    var renderer = "svg";
    if(!options){
      options = {};
    }
    
    if( options.hasOwnProperty('onComplete') ) {
      onComplete = options.onComplete;
    }
    if( options.hasOwnProperty('pixelRatio') ) {
      pixelRatio = options.pixelRatio;
    }
    if( options.hasOwnProperty('renderer') ) {
      renderer = options.renderer;
    }
    //console.log('AlphaJPEG init');
    var canvas = document.createElement('canvas');
    var htmlImage = document.createElement('img');
    var imgContainer = document.createElement('div');
    var container = document.createElement('div');
    htmlImage.crossOrigin = "Anonymous";
    htmlImage.src = src;

    if(renderer == "svg") {
      
      htmlImage.onload = function(){
        
        var w = htmlImage.width;
        var h = htmlImage.height;

        container.style.width = w/2/pixelRatio + 'px';
        container.style.height = h/pixelRatio + 'px';

        imgContainer.style.position = 'relative';
        imgContainer.style.transform = 'scale('+ (1/pixelRatio) +')';
        imgContainer.style.transformOrigin = 'top left';
        imgContainer.style.webkitTransform = 'scale('+ (1/pixelRatio) +')';
        imgContainer.style.webkitTransformOrigin = 'top left';
        imgContainer.style.width = (w/2) + 'px';
        imgContainer.style.height = h + 'px';
        imgContainer.style.overflow = 'hidden';
        imgContainer.style.opacity = '0.999999'; // this really shouldn't be necessary, but it is.

        var svgW = w/2;
        var svgH = h;
        var imgW = w;
        var imgH = h;
        var imgSrc = src;

        var date = new Date();
        var msTime = date.getTime();

        var safeAssetName = imgSrc.split('/')[imgSrc.split('/').length-1].replace(/[|&\-;$%@_."<>=()+,]/g, "");

        var maskName = 'imageMask'+safeAssetName;
        var imageName = 'imageSource'+safeAssetName;

        var svgElement = '<svg id="'+safeAssetName+'" preserveAspectRatio="none" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ' + svgW + ' ' + svgH + '" class="svg-elem"><defs><mask id="'+maskName+'"><image id="'+imageName+'" width="' + imgW + '" height="' + imgH + '" xlink:href="' + imgSrc + '" x="-' + svgW + '"></image></mask></defs><image mask="url(#'+maskName+')" id="sourceImage" width="' + imgW + '" height="' + imgH + '" xlink:href="' + imgSrc + '"></image></svg>';

        imgContainer.innerHTML = svgElement;

        var svgDom = imgContainer.children[0];
        if (navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
          svgDom.onload = function(){
            //console.log('AlphaJPEG Load Complete \(Safari\).');
            onComplete(svgDom);
          };
        } else {
          //console.log('AlphaJPEG Load Complete.');
          onComplete(svgDom);
        }
        container.appendChild(imgContainer);
        target.appendChild(container);
      }
    }
    
    if(renderer == "canvas") {
      
      htmlImage.onload = function(){
        
        var w = htmlImage.width;
        var h = htmlImage.height;

        canvas.width = w;
        canvas.height = h;

        canvas.style.width = w/pixelRatio+"px";
        canvas.style.height = h/pixelRatio+"px";

        imgContainer.style.width = w/2/pixelRatio + 'px';
        imgContainer.style.height = h/pixelRatio + 'px';
        imgContainer.style.overflow = 'hidden';

        var ctx = canvas.getContext("2d");

        ctx.drawImage(htmlImage, 0, 0);

        var imageData = ctx.getImageData(0, 0, w/2, h);
        var imagePixels = imageData.data;
        var maskData = ctx.getImageData(w/2, 0, w/2, h);
        var maskPixels = maskData.data;

        for (var i = 0, n = imagePixels.length; i < n; i += 4) {
          var alpha = maskPixels[i];
          imagePixels[i + 3] = alpha;
        }

        ctx.putImageData(imageData, 0, 0);
        imgContainer.appendChild(canvas);
        target.appendChild(imgContainer);
        onComplete(imgContainer);
      }
    }
  }
}

module.exports = new AlphaJPEG();
},{}]},{},[1])


//# sourceMappingURL=alpha-jpeg.js.map
