var url = require('url')
  , fs = require('fs')
  , SocketIOFileUploadServer = require("socketio-file-upload")
  , path = require('path')
  , _ = require('underscore')._
  , Room = require('./room.js')
  , uuid = require('node-uuid')
  , SLITE_EXT = '.jpg'
  , SLIDE_REG_EXP = new RegExp('^img\\d+' + SLITE_EXT + '$')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , HTML5_UPLOADER = false
  , supportUplExtensions = [".csv"]
  , LOG_COORD = true
  , LOG_GENERAL = true;
var start = process.hrtime();

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

var www_dir, slitesDir, staticDir, slitesReg;
exports.setDir = function (new_dir, newSlitesDir, newstaticDir, newSlitesReg, callback){
    www_dir = new_dir;
    slitesDir = newSlitesDir;
    staticDir = newstaticDir;
    slitesReg = newSlitesReg;
}

var pollStatisticsArray = new Array();
var pollAnswerArray = new Array();

var people = {};
var rooms = {};
var sockets = [];
var chatHistory = {};

function purge(s, action) {
    if (people[s.id].inroom) { //user is in a room
    var room = rooms[people[s.id].inroom]; //check which room user is in.
        if (action === "disconnect") {
            //module.parent.exports.io.sockets.emit("update", people[s.id].name + " has disconnected from the server.");
            if (_.contains((room.people), s.id)) {
                var personIndex = room.people.indexOf(s.id);
                room.people.splice(personIndex, 1);
                s.leave(room.name);
            }
            delete people[s.id];
            sizePeople = _.size(people);
            module.parent.exports.io.sockets.emit("update-people", {people: people, count: sizePeople});
            var o = _.findWhere(sockets, {'id': s.id});
            sockets = _.without(sockets, o);
        } else if (action === "removeRoom") {
            s.emit("update", "Only the owner can remove a room.");
        } else if (action === "leaveRoom") {
            if (_.contains((room.people), s.id)) {
                var personIndex = room.people.indexOf(s.id);
                room.people.splice(personIndex, 1);
                people[s.id].inroom = null;
                module.parent.exports.io.sockets.emit("update", people[s.id].name + " has left the room.");
                s.leave(room.name);
            }
        }
    } else {
        //The user isn't in a room, but maybe he just disconnected, handle the scenario:
        if (action === "disconnect") {
            module.parent.exports.io.sockets.emit("update", people[s.id].name + " has disconnected from the server.");
            delete people[s.id];
            sizePeople = _.size(people);
            module.parent.exports.io.sockets.emit("update-people", {people: people, count: sizePeople});
            var o = _.findWhere(sockets, {'id': s.id});
            sockets = _.without(sockets, o);
        }
    }
}


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
              if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
                  purge(socket, "disconnect");
              }
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
              //converter.convert(name, origName, socket, {www_dir: www_dir, slitesDir: slitesDir, sliteRegExp: SLIDE_REG_EXP, uploadDir: uploadDir, userSessionId: userSession.currentUserId, SlidesScheme: module.parent.exports.SlideScheme,  userAuth: userSession.userAuth, ssite: socket.handshake.headers.host, hashSize: module.parent.exports.slitesHashLen, domain: userSession.restrictions.domain, domainSet: userSession.domainSet, AWS_S3: module.parent.exports.AWS_S3, AWS_S3_BUCKET: module.parent.exports.AWS_S3_BUCKET, removeDirFunc: module.parent.exports.deleteFolderRecursive});
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
                console.log("0 file");
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
