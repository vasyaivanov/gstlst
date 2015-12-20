/*  This is the main JS file for index.html, our remote control app */

var currSlideNum = 0
// variables to deal with offset
var currentSlide = document.getElementById("currentSlide"),
    slideWidth = 0,
    slideHeight = 0,
    xOffset = 0,
    xOffset = 0,
    LOG_COORDS = true;

function getPos(el) {
    // yay readability
    for (var lx=0, ly=0;
         el != null;
         lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
    return {x: lx, y: ly};
}

function updateSlideMetrics(mouseX, mouseY){
    var slide = document.getElementById("slide");
    var slideImg = slide.getElementsByTagName('img')[0];
    var sliteImgPos = getPos(slideImg);
    slideWidth = slideImg.offsetWidth;
    slideHeight = slideImg.offsetHeight;
    xOffset = sliteImgPos.x;
    yOffset = sliteImgPos.y;
    //var rsSlide = document.getElementsByClassName("rsSlide")[0];
    //var rsSlidePos = getPos(rsSlide);
    //slideWidth = Math.min(rsSlide.offsetWidth, slideImg.offsetWidth);
    //slideHeight = Math.min(rsSlide.offsetHeight, slideImg.offsetHeight);
    //var w = window.innerWidth;
    //var h = window.innerHeight;
    //var videoGallery = document.getElementById("video-gallery");
    //var videoGalleryWidth = videoGallery.offsetWidth;
    //var videoGalleryHeight = videoGallery.offsetHeight;
    //xOffset = (w - slideWidth) / 2; ///rsSlidePos.x + (videoGalleryWidth - slideWidth)/2
    //yOffset = (h - slideHeight) / 2; ///rsSlidePos.y + (videoGalleryHeight - slideHeight)/2
    //console.log('innerSize: ' + w + ' ' + h);
    //console.log('Slide Pos: ' + slidePosX + ' ' + slidePosY);
    //console.log('videoGallerySize: ' + videoGalleryWidth + ' ' + videoGalleryHeight);

    //var galleryOffsetX = videoGallery.offsetLeft;
    //var galleryOffsetY = videoGallery.offsetTop;
    //xOffset = slideImg.offsetLeft + galleryOffsetX;
    //yOffset = slideImg.offsetTop + galleryOffsetY;
    //slideWidth = slideImg.offsetWidth;
    //slideHeight = slideImg.offsetHeight;
    //xOffset = rsSlidePos.x;//slidePosX;
    //yOffset = rsSlidePos.y;//slidePosY;
    if (LOG_COORDS) {
        console.log('Slide Metrics:');
        if (typeof mouseX !== "undefined" && typeof mouseY !== "undefined") {
            console.log("mouse X: " + mouseX + " Y: " + mouseY);
        }
        //console.log("window inner width: " + w + ', height: ' + h);
        console.log("xOffset: " + xOffset);
        console.log("yOffset: " + yOffset);
        console.log("slideWidth: " + slideWidth);
        console.log("slideHeight: " + slideHeight);
    }
}

function offsetToPercentage(xOff, yOff) {
    var xPer = calcOffset(xOff, xOffset, slideWidth);
    var yPer = calcOffset(yOff, yOffset, slideHeight);

    if (LOG_COORDS) {
        console.log("xOff: " + xOff);
        console.log("yOff: " + yOff);
        console.log("xPer: " + xPer);
        console.log("yPer: " + yPer);
    }
    return {x: xPer, y: yPer};
}

function percentageToOffset(xPer, yPer) {
    var xOff = calcPercentage(xPer, xOffset, slideWidth);
    var yOff = calcPercentage(yPer, yOffset, slideHeight);

    if (LOG_COORDS) {
        console.log("xOff: " + xOff);
        console.log("yOff: " + yOff);
        console.log("xPer: " + xPer);
        console.log("yPer: " + yPer);
    }
    return {x: xOff, y: yOff};
}

// This function is for getting the offset given coordinate relative to document
// It needs to be run once for X and once for Y
// coord = coordinate of touch relative to document
// offset = X or Y offset of the element inside the doc
// dim = width or height of the element
function calcOffset(coord, offset, dim) {
    return ((coord - offset)/dim);
};

function calcPercentage(coord, offset, dim) {
    return (coord * dim + offset);
};

// interactionType is a global variable for switching between different modes
var NONE = 0, LASER = 1, DRAW = 2, SPEECH = 3;
var interactionType = NONE;

// disable image dragging for all images
$('img').on('dragstart', function(event) { event.preventDefault(); });

currentSlide.addEventListener('touchstart', touchStart, false);
currentSlide.addEventListener('touchmove', touchMove, false);
currentSlide.addEventListener('touchend', touchEnd, false);

function touchStart(event) {
    //alert('touchStart');
    event.preventDefault();

    var xTouch, yTouch;
    if (isMobile()) {
        xTouch = event.touches[0].pageX;
        yTouch = event.touches[0].pageY;
    } else {
        xTouch = event.pageX;
        yTouch = event.pageY;
    }

    updateSlideMetrics(xTouch, yTouch);
    var per = offsetToPercentage(xTouch, yTouch);

    if(LASER === interactionType) {
        // Laser immediately for presenter
        $( "#redDot" ).css("visibility", "visible");
        moveLaserTo(per.x, per.y);
        socket.emit('laserOn', {x: per.x, y: per.y, slideID: currentHash, presPass: presentPassword});
    } else if (DRAW === interactionType) {
        drawTo('down', per.x, per.y);
        socket.emit('drawStart',{x: per.x, y: per.y , slideID: currentHash, presPass: presentPassword});
    }
};

function touchEnd(event) {
    event.preventDefault();
    if (LASER === interactionType) {
        $( "#redDot" ).css("visibility", "hidden");
        socket.emit('laserOff', {slideID: currentHash, presPass: presentPassword});
    } else if (DRAW === interactionType) {
        drawTo('up');
        socket.emit('drawStop', {slideID: currentHash, presPass: presentPassword});
    }
};

function getNumSlides() {
    var slider = $(".royalSlider").data('royalSlider');
    return slider.numSlides;
}

// Functions that handle moving to the next slide and updating notes
function prevSlideRemote() {
    prevSlideLocal();
    console.log('prevSlideRemote');
    currSlideNum--;
    if (currSlideNum < 0) {
        currSlideNum = getNumSlides() - 1;
    }
    socket.emit('changeSlideRequest', { my:102, slide:currSlideNum, slideID: currentHash, presPass: presentPassword});
    //$("#notes").text(notesArray[currSlideNum]);
};
function nextSlideRemote() {
    nextSlideLocal();
    console.log('nextSlideRemote');
    currSlideNum++;
    if (currSlideNum >= getNumSlides()) {
        currSlideNum = 0;
    }
    socket.emit('changeSlideRequest', { my:101, slide:currSlideNum, slideID: currentHash, presPass: presentPassword});
    //$("#notes").text(notesArray[currSlideNum]);
};

function thumbnails() {
    var elements    = document.querySelectorAll('#navButtons div');
    /*
    // add event listener for each button
    for (var i = 0, l = elements.length; i < l; i++) {
        var element = elements[i];
        element.setAttribute('slide_num', i);
        var url = document.getElementById("URLSlides").value;
        //element.style.backgroundImage = "url(./" + url + "/thumbnails/img" + (i+1) + ".png)";
        if (url === '' || url.length != 2) {
            element.style.backgroundImage = '';
        } else {
            element.style.backgroundImage = "url(../" + url + "/thumbnails/img" + (i+1) + ".png)";
        }
        // each event will be logged to the virtual console
        element.addEventListener("mousedown", function(e) {
                                     var slide_num = parseInt(this.getAttribute('slide_num'));
                                     currSlideNum = slide_num;
                                     $("#notes").text(notesArray[currSlideNum]);
                                     socket.emit('changeSlideRequest', { my:slide_num+1, slide:slide_num });
                                 }, false);
    }*/
}

function changeURL() {
	alert(location.port);
    var newUrl = 'https://' + document.location.hostname + ':' + location.port + '/remote/index.html?presentation=' + document.getElementById("URLSlides").value;
    //location.href = newUrl; // redirect to a new url with ?presentation= query string
    location.replace(newUrl);
}

function isLocalhost() {
	var location = document.location + "";
	return (location && location.indexOf("file") === 0);
}

function setIFrameUrl(hash){

      var protocolUrl = (location.protocol == 'https:') ? 'https://' : 'http://';

      var newUrl = protocolUrl + document.location.hostname + ':' + location.port + '/' + hash;

    var iFrame = document.getElementById('theIframe');
	iFrame.src = newUrl;
	if(isLocalhost()){
		iFrame.src = "www.slite.us/A1";
	}
    iFrame.addEventListener("load", onSlideLoaded);
}

function onSlideLoaded() {
    currSlideNum = 0;
    $("#notes").text(notesArray[currSlideNum]);
    // DUPLICATE SOCKET
    //socket = io.connect(document.location.hostname);
    socket.emit('changeSlideRequest', { my:currSlideNum+1, slide:currSlideNum });
    thumbnails(); // thumbnails have to match the slides
}

function clearURLSlides(){
	$("#URLSlides").val("");
}

// this is the main function handling laser and draw control by sending
// touch coordinates on to the server through socket.emit()
function touchMove(event) {
    //alert('touchMove');
    event.preventDefault();
    console.log("touchMove called");

    // This code is needed because the touch event is different on mobile vs browser
    var xTouch, yTouch;
    if (isMobile()) {
        xTouch = event.touches[0].pageX;
        yTouch = event.touches[0].pageY;
    } else {
        xTouch = event.pageX;
        yTouch = event.pageY;
    }


    updateSlideMetrics(xTouch, yTouch);
    var per = offsetToPercentage(xTouch, yTouch);

    switch(interactionType) {
        case LASER: {
            // Draw immediately for presenter
            moveLaserTo(per.x, per.y);
            socket.emit('laserCoords', { x:per.x,  y:per.y,  slideID: currentHash, presPass: presentPassword});
            break;
        }
        case DRAW: {
          // Draw immediately for presenter
          drawTo('move', per.x, per.y);
          socket.emit('drawCoords', { x:per.x, y:per.y , slideID: currentHash, presPass: presentPassword});
          break;
        }
        default: {
            break;
        }
    }
};

// Cause Repaint makes the font resize when
// the browser window is resized.
causeRepaintsOn = $("#URLBox");
$(window).resize(function() {
  causeRepaintsOn.css("z-index", 1);
});

// This script is intended to detect whether or not
// the program is opened in a mobile browser, and load
// the correct .js file.
var scriptSrc = '/js/remote/slite_browser.js';
/* if (/mobile/i.test(navigator.userAgent)) {
    scriptSrc = './js/slite_iphone.js';
} else {
    scriptSrc = './js/slite_browser.js';
} */
var script = document.createElement('script');
script.src = scriptSrc;
var head = document.getElementsByTagName('head')[0];
head.appendChild(script);


function getUrlParam(sParam)
{
	var sPageURL = window.location.search.substring(1); // get query string without ?
	var sURLVariables = sPageURL.split('&');
	for (var i = 0; i < sURLVariables.length; i++)
	{
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam)
		{
			return sParameterName[1];
		}
	}
}

function populateHash(){
	var presentationHash = currentHash/*getUrlParam("presentation")*/;
	//if(presentationHash){
    //    $("#URLSlides").val(presentationHash);
    //    //setIFrameUrl(presentationHash);
	//}
}

$(function() {
    //console.log( "ready!" );
	populateHash();
});
