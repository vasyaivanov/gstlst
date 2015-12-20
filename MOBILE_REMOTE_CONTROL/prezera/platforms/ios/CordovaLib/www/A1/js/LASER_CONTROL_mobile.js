/*
 * This script is for reading the X/Y coordinates of the user touching the
 * remote, so they can be sent to the receiver for displaying a laser pointer
 */

function startup() {
    speechRecognizer = new SpeechRecognizer();
    document.addEventListener("deviceready", onDeviceReady, true);
};

// variables to deal with offset
var currentSlide = document.getElementById("currentSlide"),
    xOffset = currentSlide.offsetLeft,
    yOffset = currentSlide.offsetTop,
    slideWidth = currentSlide.offsetWidth,
    slideHeight = currentSlide.offsetHeight;

// hardcoded "notes", to show that notes change when a slide changes
var currSlideNum = 0;
var notesArray = [
" 1: Beginning slide, or should I say 'slite'. Get ready to see powerpoint with all the powers of the web",
" 2: Each slide is a webpage, so you don't need any special software. And it works with your existing powerpoint, how convenient!",
" 3: No need to mess around with a projector. Upload or create a presentation and share instantly.",
" 4: People can view your presentation from anywhere in the world.",
" 5: Infinite scrolling means you can fit as much data as you need on any slite",
" 6: scrolling example",
" 7: Lots of built-in features, use your smartphone as a clicker, as a laser pointer, and even things you usually can't do such as drawing and voice commands!",
" 8: Unique features such as live captioning and translation means your presentation can reach a wider audience with no effort on your part",
" 9: Here ask people if they have ever fallen asleep during a presentation. Maybe say your own anecdote about falling asleep at a meeting",
" 10: Live social commentary means your audience is more engaged during the meeting, and afterward a record of the discussion is available",
" 11: We have many competitors, but we do much more than them!",
" 12: Revenue Model",
" 13: Impressive team with over 50 years of combined software experience",
" 14: Our product targets a HUGE market. Everyone uses presentations from businesses to students",
" 15: Redefine what people think of when they hear the word 'presentation'",
" 16: The end! Thank you for your time.",
];

// variables to deal with timer
var timeDisplay = document.getElementById("timeDisplay"),
    seconds = 0, minutes = 0, hours = 0, timerInit
    timerActive = false;

function printSpeechResult(resultObject){
    console.log("MA printResult");
    console.log(resultObject);
    console.log(resultObject.indexOf("NEXT"));
    if (resultObject.indexOf("NEXT") > -1)
        socket.emit('mymessage', { my: 101 });
    else if (resultObject.indexOf("PREVIOUS") > -1)
        socket.emit('mymessage', { my: 102 });
};

function onDeviceReady() {
    // Adding event handlers to the currentSlide div, the user
    // touches this div to draw or move laser
    currentSlide.addEventListener("touchstart", touchStart, false);
    currentSlide.addEventListener("touchmove", touchMove, false);
    currentSlide.addEventListener("touchend", touchEnd, false);
    /* currentSlide.addEventListener("touchcancel", touchCancel, false); */
    
    // disable image dragging for all images.
    // Image dragging was interfering with the laser pointer event listeners
    $('img').on('dragstart', function(event) { event.preventDefault(); });
    
    $('#prev').click(function() {
        event.preventDefault();
        socket.emit('mymessage', { my:102 });
        currSlideNum--;
        $("#notes").text(notesArray[currSlideNum]);
    });
    
    $('#next').click(function() {
        event.preventDefault();
        socket.emit('mymessage', { my:101 });
        currSlideNum++;
        $("#notes").text(notesArray[currSlideNum]);
    });
    
    $('#laser').click(function() {
        event.preventDefault();
        // if laser is on, turn it off
        if (LASER === interactionType) {
            interactionType = NONE;
            $('#laser').css("border-color", "black");
            $('#theIframe').css("z-index", "1");
        // otherwise turn laser on
        } else {
            interactionType = LASER;
            $('#laser').css("border-color", "red");
            $('#draw').css("border-color", "black");
            $('#theIframe').css("z-index", "-1");
        }
    });
    
    $('#draw').click(function() {
        event.preventDefault();
        // if draw is on, turn it off
        if (DRAW === interactionType) {
            interactionType = NONE;
            $('#draw').css("border-color", "black");
            $('#theIframe').css("z-index", "1");
        // otherwise turn draw on
        } else {
            interactionType = DRAW;
            $('#draw').css("border-color", "red");
            $('#laser').css("border-color", "black");
            $('#theIframe').css("z-index", "-1");
        }
    });
    
    $('#timeDisplay').click(function() {
        event.preventDefault();
        if (timerActive) {
            timerActive = false;
            clearTimeout(timerInit);
        }
        else {
            timerActive = true;
            timer();
        }
    });
    
    $('#speech').click(function() {
       console.log("MA numClicked")
       event.preventDefault();
       if (SPEECH === interactionType) {
           speechRecognizer.cleanup();
           interactionType = NONE;
           $('#speech').css("border-color", "black");
       } else {
           speechRecognizer.initialize( function(r){printSpeechResult(r)}, function(e){printSpeechResult(e)} );
           interactionType = SPEECH;
           $('#speech').css("border-color", "red");
       }
    });
    
};

// interactionType is a global variable for switching between
// 'draw' and 'laser' mode
var NONE = 0, LASER = 1, DRAW = 2, SPEECH = 3;
var interactionType = NONE;

// Touching the control area (the currentSlide div) will turn the
// laser on, making the red dot appear on the presentation.
// But only if we are in laser mode. 
function touchStart() {
    event.preventDefault();
    if(LASER === interactionType)
        socket.emit('laserOn');
};

function touchEnd() {
    event.preventDefault();
    if(LASER === interactionType)
        socket.emit('laserOff');
};

// this is the main function handling laser and draw control by sending
// touch coordinates on to the server through socket.emit()
function touchMove(event) {
    event.preventDefault();
    switch(interactionType) {
        case LASER: {
            //alert(slideWidth);
            socket.emit('laserCoords',
                        { x:event.touches[0].pageX - xOffset,
                          y:event.touches[0].pageY - yOffset,
                          width:slideWidth,
                          height:slideHeight});
            break;
        }
        case DRAW: {
            socket.emit('drawCoords', { x:event.touches[0].pageX - xOffset,
                                        y:event.touches[0].pageY - yOffset });
            break;
        }
        default: {
            break;
        }
    }
};

function incrementTime() {
    seconds++;
    if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
    }
    timeDisplay.textContent = (hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds);
    
    timer();
};

function timer() {
    timerInit = setTimeout(incrementTime, 1000);
};



