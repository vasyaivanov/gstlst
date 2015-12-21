var url = require('url')
  , fs = require('fs')
  , SocketIOFileUploadServer = require("socketio-file-upload")
  , path = require('path')
  , _ = require('underscore')._
  , Room = require('./room.js')
  , prepare = require('./prepare.js')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , supportUplExtensions = [".csv"]
  , LOG_COORD = true
  , LOG_GENERAL = true;
var start = process.hrtime();

//
prepare.initCache(module.parent.exports.Event, function(data) {
  console.log("Hash checked: " + data);
});

function resetElapsedTime() {
    start = process.hrtime();
}

function elapsedTime(note) {
    var precision = 0; // 0 decimal places
    var elapsed = process.hrtime(start)[1] / 1000000;
                                                           // divide by a million to get nano to milliseconds
    console.log(note + ' in: ' + process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms"); // print message + time
    start = process.hrtime(); // reset the timer
    return elapsed;
}

var www_dir, staticDir, eventsReg;
exports.setDir = function (new_dir, newstaticDir, newEventsReg, callback){
    www_dir = new_dir;
    staticDir = newstaticDir;
    eventsReg = newEventsReg;
}

var pollStatisticsArray = new Array();
var pollAnswerArray = new Array();

var sockets = [];
var chatHistory = {};

module.parent.exports.io.use(function (socket, next) {
    if (socket.handshake.query.type == "user" && typeof socket.handshake.query.hash !== 'undefined') {
        return next();
    }
    return next();
});

module.parent.exports.io.sockets.on('connection', function (socket) {
    if(typeof module.parent.exports.UserData  !== "undefined") {
      var userSession = module.parent.exports.UserData[module.parent.exports.getCookie(socket.handshake.headers.cookie,module.parent.exports.sessionIdCookie)];
      if(typeof userSession !== "undefined") {
          console.log('SOCKET CONNECTION on', new Date().toLocaleTimeString() + ' Addr: ' + socket.handshake.headers.host + ' Socket: ' + socket.id + ' UserAgent:' + socket.handshake.headers['user-agent']);
          console.log('--------------');
            socket.on('disconnect', function () {
              console.log('SOCKET DISCONNECT on', new Date().toLocaleTimeString() + ' Addr: ' + socket.handshake.headers.host + ' Socket: ' + socket.id);
              console.log('--------------');
          });

          var uploadDir = path.join(www_dir, "UPLOAD/");
          function uploadStarted(name){
              resetElapsedTime();
			  if(LOG_GENERAL) {
				console.log("UPLOAD started  file: " + name);
			  }
          }
          function uploadProgress(name){
    			  if(LOG_GENERAL) {
    				  console.log("UPLOAD progress file: " + name);
    			  }
          }
          function uploadError(type,name) {
              var data = {};
          		if(type > 0) {
          			data.limit = type;
          		}
          		else {
          			data.limit = 0;
          			console.error("UPLOAD error: " + name);
          		}
              data.error = true;
              socket.emit("listUploadError", data);
          }

          function uploadComplete(name, origName) {
              console.log("UPLOADED...Converting file");
              var listParams = {
                  socket: socket,
                  opt: {
                    hashSize: module.parent.exports.eventHashLen,
                    EventsScheme: module.parent.exports.Event
                  }
              };

              //
              var newEvent = new prepare.List(listParams, function (err,eventHash) {
                  if(err) {
                    console.log("ERROR processing file" + err);
                  }
                  else {
                      console.log("Hash created: " + eventHash);
                  }
              });
          }

          var uploader = new SocketIOFileUploadServer();
      		uploader.dir = uploadDir;
      		uploader.listen(socket);
          uploader.maxFileSize = userSession.restrictions.maxSlideSize;

          uploader.on("start", function (event) {
  				      uploadStarted(event.file.name);
          });

      		uploader.on("progress", function (event) {
      			uploadProgress(event.file.pathName);
      		});

      		uploader.on("complete", function (event) {
    				fs.exists(event.file.pathName, function (exists) {
						 if(supportUplExtensions.indexOf(path.extname(event.file.pathName)) == -1) {
                console.log("Error: We support only csv files")
							   fs.unlinkSync(event.file.pathName);
							   uploadError(3, "");
						  }
						  else {
							if((fs.statSync(event.file.pathName)["size"] > 0)) {
                console.log("Upload completed");
								uploadComplete(event.file.pathName, event.file.name);
							}
							else {
								fs.unlinkSync(event.file.pathName);
								uploadError(2, "");
							}
						 }
      			});
      		});


      		uploader.on("error", function (event) {
      			uploadError(0, JSON.stringify(event));
      		});

          socket.on('error', function (data){
            console.error(data);
          });

      }
    }

});
