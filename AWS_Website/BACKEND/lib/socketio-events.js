var url = require('url')
  , fs = require('fs')
  , SocketIOFileUploadServer = require("socketio-file-upload")
  , path = require('path')
  , _ = require('underscore')._
  , prepare = require('./prepare.js')
  , session = require('express-session')
  , cookieParser = require('cookie-parser')
  , supportUplExtensions = [".csv"]
  , csvConverter = require("csvtojson").Converter
  , LOG_COORD = true
  , LOG_GENERAL = true
  , ddCounts = {};
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

	  if(typeof userSession == "undefined") {
		  // Look like we have an App session
		  userSession = {};
		  userSession.restrictions = {};
		  userSession.restrictions.maxListSize = 0;
	  }

      if(typeof userSession !== "undefined") {
          console.log('SOCKET CONNECTION on', new Date().toLocaleTimeString() + ' Addr: ' + socket.handshake.headers.host + ' Socket: ' + socket.id + ' UserAgent:' + socket.handshake.headers['user-agent']);
          console.log('--------------');
            socket.on('disconnect', function () {
              console.log('SOCKET DISCONNECT on', new Date().toLocaleTimeString() + ' Addr: ' + socket.handshake.headers.host + ' Socket: ' + socket.id);
              console.log('--------------');
          });

		var listParams = {
		  socket: socket,
		  opt: {
			hashSize: module.parent.exports.eventHashLen,
			EventsScheme: module.parent.exports.Event
		  }
		};

		//
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
			console.log("Uploaded");
			  var listParams = {
				  socket: socket,
				  opt: {
					hashSize: module.parent.exports.eventHashLen,
					EventsScheme: module.parent.exports.Event
				  }
			  };

			  var newEvent = new prepare.List(listParams, function (err,eventHash) {
				  if(err) {
					console.log("ERROR processing file" + err);
					newEvent.deleteHash();
				  }
				  else {
					console.log("Hash created: " + eventHash);
					var converter = new csvConverter({noheader:true, headers:["Name"]});
					converter.fromFile(name,function(err,result){
						var operc = (100 / result.length);
            var eventName = origName;
            eventName = eventName.replace(/(\_|\.csv)/gi,"");
						var insertEvent = new module.parent.exports.Event({eventId: eventHash, name: eventName});
						insertEvent.save(function(err, saved) {
							if(err) {
								uploadError(0);
								newEvent.deleteHash();
							}
							else {
								for(var res in result){
                  var Name = result[res].Name;
                  delete result[res].Name;
									socket.emit('uploadProgress', {percentage: Math.floor(operc*res)})
									var insertData = new module.parent.exports.Guests({Name: Name, Params: result[res], eventId: eventHash});
									insertData.save(function(err, saved) {
                    if(err) console.log(err);
                  });

									if(res == result.length - 1) {
										socket.emit('uploadProgress', {percentage: 100, eventId: eventHash})
									}
								}
								fs.unlinkSync(name);
							}
						});
					});
				  }
			  });
		}

		var uploader = new SocketIOFileUploadServer();
		uploader.dir = uploadDir;
		uploader.listen(socket);
		uploader.maxFileSize = userSession.restrictions.maxListSize;

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

      	socket.on('readUserUpload', function (callback) {
      		callback(userSession.restrictions.maxListSize);
        });

      	socket.on('getEvent', function (data, callback) {
      		module.parent.exports.checkEvent(data.eventId, function(ret) {
      				if(ret.found == 1) {
                var guestList = module.parent.exports.Guests.find({eventId: data.eventId, marked: 0}).sort({'Name': 'asc'});
                var totalRecords = module.parent.exports.Guests.count({eventId: data.eventId});
                var markedRecords = module.parent.exports.Guests.count({eventId: data.eventId, marked: 1});
                guestList.then(function(docs) {
                  totalRecords.then(function(total) {
                    markedRecords.then(function(marked) {
                        callback({code: 0, guests: docs, name: ret.name, total: total + ret.count, marked: marked + ret.count});
                    });
                  });
                });
      				}
      				else {
      					callback({code: 1});
      				}
      			});
        });

      	socket.on('markGuest', function (data, callback) {
    			module.parent.exports.checkEvent(data.eventId, function(ret) {
    				if(ret.found == 1) {
    					module.parent.exports.checkGuest(data.eventId, data.guestId, function(res) {
    						if(res.found == 1) {
    							module.parent.exports.Guests.update({eventId: data.eventId , _id: data.guestId},{$set: {marked: 1}}, function(err,updated) {
    								if(err) {
    									callback({code: 1});
    								}
    								else {
    									socket.broadcast.emit('markedUser', {eventId: data.eventId ,guestId: data.guestId});
    									callback({code: 0});
    								}
    							});
    						}
    						else {
    							callback({code: 1});
    						}
    					});
    				}
    				else {
    					callback({code: 1});
    				}
    			});
        });

        socket.on('removeGuest', function (data, callback) {
    			module.parent.exports.checkEvent(data.eventId, function(ret) {
    				if(ret.found == 1) {
    					module.parent.exports.checkGuest(data.eventId, data.guestId, function(res) {
    						if(res.found == 1) {
    							module.parent.exports.Guests.remove({eventId: data.eventId , _id: data.guestId}, function(err) {
                    socket.broadcast.emit('removedUser', {eventId: data.eventId ,guestId: data.guestId});
                    callback({code: 0});
    							});
    						}
    					});
    				}
    			});
        });

        socket.on('addGuest', function (data, callback) {
    			module.parent.exports.checkEvent(data.eventId, function(ret) {
    				if(ret.found == 1) {
              var insertEvent = new module.parent.exports.Guests({eventId: data.eventId, Name: data.guestName});
              insertEvent.save(function(err, saved) {
                if(err) {callback({code: 1, err: err});}
                else {
                  socket.broadcast.emit('addedUser', {eventId: data.eventId , _id: saved._id, name: saved.Name});
                  callback({code: 0, _id: saved._id, name: saved.Name})
                }
              });
    				}
    			});
        });

        socket.on('changeMarked', function (data, callback) {
          module.parent.exports.checkEvent(data.eventId, function(ret) {
            if(ret.found == 1) {
              var count = (data.action == 1) ? ret.count+1 : ret.count-1;
              if(count+ret.marked < 0) {
                callback({code: 1});
              }
              else {
                  module.parent.exports.Event.update({eventId: data.eventId },{$set: {addCount: count }}, function(err,updated) {
                    if(!err) {
                      socket.broadcast.emit('markedChanged', {eventId: data.eventId, action: data.action});
                      callback({code: 0});
                    }
                    else {callback({code: 1})}
                  });
              }
            }
          });
        });

        socket.on('ddCountPlusOne', function (data, callback) {
            if(data.id) {
              if(typeof ddCounts[data.id] === 'undefined') {ddCounts[data.id] = 0;}
              ddCounts[data.id] = ddCounts[data.id] + 1;
              socket.broadcast.emit("ddCountUpdate", { id: data.id, count: ddCounts[data.id] });
              callback({ code: 1, count: ddCounts[data.id], counts: ddCounts});
            }
        });

      }
    }
});
