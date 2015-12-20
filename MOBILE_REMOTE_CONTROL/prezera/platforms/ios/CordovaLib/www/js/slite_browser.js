/* 
 * This script is for controlling browser specific functions 
 * of the remote control.
 */

function startup() {
    speechRecognizer = new SpeechRecognizer();
};

thumbnails();

$('#URLBox').keypress(function(e) {
	if(e.which == 13) {	
		changeURL();
	}
});


function printSpeechResult(resultObject){
    console.log("MA printResult");
    console.log(resultObject);
    
    socket.emit('cc',{my: resultObject});
    console.log(resultObject.indexOf("NEXT"));
    if (resultObject.indexOf("NEXT") > -1) {
       nextSlide();
    }
    else if (resultObject.indexOf("PREVIOUS") > -1) {
       prevSlide();
    }
};

// Adding event handlers to the currentSlide div, the user
// touches this div to draw or move laser
currentSlide.addEventListener('touchstart', touchStart, false);
currentSlide.addEventListener('touchmove', touchMove, false);
currentSlide.addEventListener('touchend', touchEnd, false);

// Touching the control area (the currentSlide div) will turn the
// laser on, making the red dot appear on the presentation.
// But only if we are in laser mode. 
function touchStart() {
    event.preventDefault();
    if(LASER === interactionType) {
        socket.emit('laserOn', {slideID: $('#URLSlides').val()});
    } else if (DRAW === interactionType) {
        // recalculate offsets in case window size has changed
        xOffset = currentSlide.offsetLeft;
        yOffset = currentSlide.offsetTop;
        slideWidth = currentSlide.offsetWidth,
        slideHeight = currentSlide.offsetHeight;
        var xPercent = calcOffset(event.pageX, xOffset, slideWidth);
        var yPercent = calcOffset(event.pageY, yOffset, slideHeight);
        //console.log("xPercent: " + xPercent);
        //console.log("yPercent: " + yPercent);
        socket.emit('drawStart',{x:xPercent,
                                 y:yPercent , slideID: $('#URLSlides').val()});
    }
};

function touchEnd() {
    event.preventDefault();
    if (LASER === interactionType) {
        socket.emit('laserOff');
    } else if (DRAW === interactionType) {
        socket.emit('drawStop');
    }
};

$('#prev').click(function() {
    prevSlide();
});

$('#next').click(function() {
    nextSlide();
});

$('#laser').click(function() {
    // calculate offset of interaction area in case window has been resized
    // since the last time laser was used. 
    xOffset = currentSlide.offsetLeft;
    yOffset = currentSlide.offsetTop;
    slideWidth = currentSlide.offsetWidth;
    slideHeight = currentSlide.offsetHeight;
    
    // if laser is on, turn it off
    if (LASER === interactionType) {
        interactionType = NONE;
        $('#laser').removeClass("buttons_off").addClass("buttons_on");
        $('#laser').removeClass("buttons_on").addClass("buttons_off");
        $('#overlay').css("z-index", 0);
        
    // otherwise turn laser on
    } else {
        interactionType = LASER;
        $('#laser').removeClass("buttons_off").addClass("buttons_on");
        $('#draw').removeClass("buttons_on").addClass("buttons_off");
        $('#overlay').css("z-index", 3);
    }
});

$('#draw').click(function() {
    xOffset = currentSlide.offsetLeft;
    yOffset = currentSlide.offsetTop;
    slideWidth = currentSlide.offsetWidth;
    slideHeight = currentSlide.offsetHeight;
    console.log(interactionType);
    // if draw is on, turn it off
    if (DRAW === interactionType) {
        interactionType = NONE;
        $('#draw').removeClass("buttons_on").addClass("buttons_off");
        $('#overlay').css("z-index", 0);
        
    // otherwise turn draw on
    } else {
        interactionType = DRAW;
        $('#draw').removeClass("button_off").addClass("buttons_on");
        $('#laser').removeClass("buttons_on").addClass("buttons_off");
        $('#overlay').css("z-index", 3);
    }
});


$('#speech').click(function() {
    console.log("MA numClicked");
    console.log(interactionType);
    if (SPEECH === interactionType) {
        speechRecognizer.cleanup();
        interactionType = NONE;
        $('#speech').removeClass("buttons_on").addClass("buttons_off");
    } else {
        console.log("Recognize speech");
        speechRecognizer.initialize( function(r){printSpeechResult(r)}, function(e){printSpeechResult(e)} );
        interactionType = SPEECH;
        $('#speech').removeClass("button_off").addClass("buttons_on");
    }
});