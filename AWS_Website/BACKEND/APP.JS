var express = require('express')
  , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , session = require('express-session')
  , methodOverride = require('method-override')
  , flash = require('connect-flash')
  , fs = require('fs')
  , passport = require('passport')
  , util = require('util')
  , LocalStrategy = require('passport-local').Strategy
  , path = require('path')
  , moment = require('moment')
  , dbImport = require("./lib/db.js")
  , appPort = 8081
  , ioPort = 1337
  , sessionIdCookie = "GuestListCurrUser"
  , LOG_GENERAL = true
  , DEBUG = false
  , paypalIpn = require('paypal-ipn');

var app = express();
module.exports.app = app;
module.exports.sessionIdCookie = sessionIdCookie;

//------- Importing db
// User
var User = dbImport.User;
module.exports.UserScheme = User;
// eventsReg
var Event = dbImport.Event;
module.exports.Event = Event;
// Guests
var Guests = dbImport.Guests;
module.exports.Guests = Guests;
//-----------
// Users roles
var rolesRestrictions = {};
// Basic account
rolesRestrictions[0] = {maxListsCount: 3, maxListsSize: 10485760, maxListSize: 5242880};
// Silver account
rolesRestrictions[1] = {maxListsCount: 3, maxListsSize: 10485760, maxListSize: 5242880};
// Gold account
rolesRestrictions[2] = {maxListsCount: 10000, maxListsSize: 104857600, maxListSize: 104857600};
// Admin account
rolesRestrictions[10] = {maxListsCount: 10000, maxListsSize: 10485760000000000000, maxListSize: 10485760000000000000};

var Plans = {
	'1': {desc: 'Silver', price: 5, role: 1},
	'2': {desc: 'Gold', price: 10, role: 2},
	'3': {desc: 'GoldUpgrade', price: 5, role: 2}
};

function addUser(password, email, callback) {
	if(LOG_GENERAL) {
		console.log("MA: new user2: " + password + " " + email);
	}

  // Seed a user
  var user = new User({ email: email, password: password });

  var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
  if(re.test(email) == false) {
	  callback(3);
  }
  else {
  //callback(4);

   /*if(password != password_confirm) {
    	console.log("Password confirm error");
    	callback(4)
   }
 else {*/
   user.save(function(err) {
    if(err) {
		console.log("DB ERRORRRR +++++++++ " + err);
	if( err.code === 11000 ) {
	    err_code = 2;
	}
	else {
	    err_code = 3;
	}

	callback(err_code);

    } else {
     console.log('user: ' + user.email + " saved.");
     callback(0);
    }
  });

 }


}



passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    session: true
  }, function(username, password, done) {
  username = username.toLowerCase();
  User.findOne({ email: username }, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if(isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Invalid password' });
      }
    });
  });
}));


var expressLogFile = fs.createWriteStream('./expressLogFile.log', {flags: 'w'}); //use {flags: 'w'} to open in write mode

// find path www_dir to index.html
var www_static_dir = 'www_static';
module.exports.www_static_dir = www_static_dir;
var indexHtml = 'index.html';
var awsDir = '/home/ec2-user/www/';
var localDir = __dirname + "/../";
var www_dir;
if (fs.existsSync(path.join(localDir, www_static_dir, indexHtml))) {
    www_dir = localDir;
} else {
    www_dir = awsDir;
}
www_dir = path.normalize(www_dir);
console.log('www_dir: ' + www_dir);

// hash redirection
var eventHashLen = 4;
module.exports.eventHashLen = eventHashLen;
var eventsReg = "[0-9a-zA-Z]{" + eventHashLen + "}";
// middleware do render slites files from /slites folders
var eventsRegMW = new RegExp('^\\/' + eventsReg + '(\\/|$)');

// Auto redirect to WWW, if no subdomain
var trustedDomains = ["uberguestlist.elasticbeanstalk.com", "localhost", "ugl.loc"];
function redirectToWWW(req,res,next) {
	var domainClear = req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];
	if(req.hostname.split('.').length == 2) {
		res.redirect(((req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'] : "https") + '://www.' + domainClear + req.url);
	}
	else if(req.hostname.split('.').length > 3 && trustedDomains.indexOf(req.headers.host) == -1) {
		// Redirect if more than 3 subdomains
		var domainClear = req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];
		res.redirect(((req.headers['x-forwarded-proto']) ? req.headers['x-forwarded-proto'] : "https") + '://www.' + domainClear);
	}
	else {
		next();
	}
}

// Autogenerate session for hosts
var mwCache = Object.create(null);
function virtualHostSession(req, res, next) {
	var host = req.hostname;
	if(host) {
		var domainClear;
		if(trustedDomains.indexOf(host) != -1) {
			domainClear = host;
		}
		else {
			domainClear = host.split('.').reverse()[1] + '.' + host.split('.').reverse()[0];
		}

		var hostSession = mwCache[domainClear];
		if (!hostSession) {
			hostSession = mwCache[domainClear] = session({
				secret: 'abrakadabra',
				resave: false,
				cookie: {domain: '.' + domainClear},
				saveUninitialized: false
			});
		}
		hostSession(req, res, next);
	}
	else {
		res.send("Session not found...Reloading page...<meta http-equiv=\"refresh\" content=\"10\" />");
	}
}


// configure Express
app.set('port', appPort || process.env.PORT);
app.set('view engine', 'ejs');//'html'
app.set('views', www_dir);
app.engine('.html', require('ejs').renderFile);
app.set("view options", {layout: false});
app.use(logger('dev', { stream: expressLogFile }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(virtualHostSession);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
// Set session
app.use(function (req, res, next) {

if(!path.extname(req.url.substring(1))) {
  console.log("PAGE_REQUEST: " + new Date().toLocaleDateString('en-US') + ", page: " + req.hostname + req.url + ', ' +  ((req.headers['user-agent']) ? req.headers['user-agent'] : 'bot'));
  console.log('--------------');

}

if(req.method == "POST" && req.url == "/paypal") {
	next();
}
else {
	setUserSession(req,res,function(userId) {
		var readQueryStr = "";
		if(req.url.indexOf('?') > 0) {
			readQueryStr = req.url;
			readQueryStr = readQueryStr.replace(/(.+)\?/g,"")
		}
		var userAgent = (req.headers['user-agent']) ? req.headers['user-agent'] : 'bot';
		if(userId == 0 && req.query.auth != 1 && userAgent.match(/(bot|spider)/i) == null) {
			if(readQueryStr != '') {
				readQueryStr = '?' + readQueryStr + '&auth=1';
			}
			else {
				readQueryStr = "?auth=1"
			}
			res.redirect(req.path + readQueryStr);
		}
		else {
			if(req.query.auth == 1 && userId.length > 0) {
				if(readQueryStr != '') {
					readQueryStr = "?" + readQueryStr;
				}
				readQueryStr = readQueryStr.replace(/(\&|\?)?auth=1/g,"")
				res.redirect(req.path + readQueryStr);
			}
			else {
				if(userId == 0) {
					console.log('Bot or crawler: ' + req.url + ' : ' + req.headers['user-agent']);
					var split_hash = req.path.split("/");
					var hash = req.path.replace("/","");
					next();
				}
				else {
					//console.log("Initialize new session");
					if(typeof UserData[userId] === 'undefined') {UserData[userId] = {};}
					if(req.user) UserData[userId].domain = req.user.domain
					UserData[userId].currentUserId = userId
					readUserRights(userId, function(res) {
						if(req.user) {
							UserData[userId].userAuth = 1;
							UserData[userId].userRole = res;
							UserData[userId].restrictions = rolesRestrictions[res];
							UserData[userId].domainSet = req.user.domain ? 1 : 0;
						}
						else {
							UserData[userId].userAuth = 0;
							UserData[userId].userRole = 0;
							UserData[userId].restrictions = rolesRestrictions[0];
							UserData[userId].domainSet = 0;
					  }
            module.exports.UserData[userId] = UserData[userId];
						next();
					});
				}
			}
		}
    });
}
});

// If session expired - remove old cookie
app.use(function (req, res, next) {
	User.findOne({ _id : req.cookies[sessionIdCookie] }, function (err, checkUser) {
		if(!req.user && checkUser) {
			var domainClear = req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];
			console.log("User has old cookie. Remove it");
			res.clearCookie(sessionIdCookie , {  domain: '.' + domainClear });
			res.redirect("/");

		}
		else {
			next();
		}
	});
});

app.use(redirectToWWW);

// Auth array
var UserData = {};
module.exports.UserData = {};


// Visualize slides
app.use(function (req, res, next) {

  //console.log(UserData);

	var customHash = req.url.substring(1);
	customHash = customHash.replace(/^\?/,"");
	var domainClear = 'www.' + req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];

	/*Slide.findOne( {scid : { $regex : new RegExp("^" + customHash + "$" , "i") } , paypalPayed: 1, site: domainClear, domainSet: 0 }).exec(function (err, doc) {
		if(err) {console.log(err)}
      if( doc ) {
        req.url = "/" + doc.sid;
      }
			var match = req.url.match(eventsRegMW);
			if (match) {                                                     // if hash found in url
				if (req.url[req.url.length - 1] === '/') {
					req.url = req.url.slice(0, -1);
					//console.log("removed trailing slash");
				}
				//console.log('URL: "' + req.url + '"');
				var slashPos = req.url.indexOf('/', 1);
				//console.log('slashPos: ' + slashPos);
				var wwwSlites = path.join(www_dir, slitesDir);                  // www/slites/
				var hash = req.url.substring(1);
				var afterHash = '';                                             // all that is after hash
				if (slashPos !== -1) {                                          // something after second slash
					hash = req.url.substring(1, slashPos);
					afterHash = req.url.substring(slashPos + 1).trim();
				}
				//console.log('hash: ' + hash);
				//console.log('afterHash: ' + afterHash);

				afterHash = afterHash.replace(/(\&|\?)?auth=1/g,"")

				if (afterHash === '' || afterHash.match(/^index($|\.html$|\.htm$)/)) {              // if nothing after hash or index.html (from slites/hash folder)
					//var indexPathname = path.join(wwwSlites, hash, 'index.html');                // www/slites/hash/index.html
					var indexPathname = path.join(www_dir, www_static_dir, "A1",'index.html');
					//console.log('RENDERING HTML: ' + indexPathname);
					// Check slide in DB
					if(typeof req.cookies[sessionIdCookie] != "undefined") {
						slideCheckPresenter(hash, UserData[req.cookies[sessionIdCookie]].currentUserId , function(sfound, spresenter, stitle, spassword, spayed, scustomurl, sisVideoChatOpen, sisScreensharingOpen, sslidesNum, ssetDomain) {
							if(sfound == 1) {
								res.render(indexPathname, {title: stitle, presenter: spresenter, password: spassword ? 1 : 0 , payed:  spayed , customurl: scustomurl, isVideoChatOpen: sisVideoChatOpen, isScreensharingOpen: sisScreensharingOpen, slidesNum: sslidesNum , hash: hash, role: module.exports.userRole });
							}
							else {
								res.send('Presentation was not found');
							}
						});
					}
					else {
						res.send('Presentation was not found');
					}
				} else if (afterHash.match(/^img[0-9]{1,6}\.jpg(\?ts=[0-9]+)?$/i)) {  // img*.jpg files (from slites/hash folder)
					//console.log('jpg: ' + afterHash);
					var extTsPos = afterHash.indexOf('.jpg?ts=', 4);
					var jpgOptions = { lastModified: true, maxAge: 0 };
					if (extTsPos !== -1) {
						afterHash = afterHash.substring(0, extTsPos + 4);
						//console.log('ts-truncated jpg: ' + afterHash);
						jpgOptions.lastModified = false;
					}

					// Redirect to Amazon S3
					res.redirect(getS3fileUrl(hash + "/" + afterHash ));

				} else if (hash && afterHash.match(/download\s*(\/?|\\)?$/i)) {
					var hashPath = path.join(wwwSlites, hash);
					console.log('Downloading presentation from: ', hashPath);
					var supportUplExtensions = [".ppt", ".pptx"];

					// Get File from Amazon S3
					AWS_S3.listObjects({Bucket: AWS_S3_BUCKET, Prefix: hash}, function(err, data) {
					  data.Contents.forEach(function(content) {
						if(supportUplExtensions.indexOf(path.extname(content.Key)) != -1) {
							res.redirect(getS3fileUrl(content.Key));
						}
					  });
					});

				} else {                                                    // all other files from www_static folder
					console.log('Arbitrary hash file: ' + afterHash);
					var fileOptions = { lastModified: true, maxAge: 0 };
					var hashPath = path.join(wwwSlites, hash);
					var fileToSend = path.join(hashPath, afterHash);
					res.sendFile(fileToSend, fileOptions, function (err) {
						if (err) {
							console.log(err + ' sending arbitrary file: ' + fileToSend);
						}
					});
				}
			}
			else if(req.url == "/A1/") {
				 var indexPathname = path.join(www_dir, www_static_dir, "A1",'index.html');
				 res.render(indexPathname, {title: "A1", presenter: 1, password: 0, payed:  0 , customurl: "", isVideoChatOpen: "", isScreensharingOpen: "", slidesNum: 13 , hash: "HASH_TEMPLATE", role: 0});
			}
			else {
				next();
			}
		//}
	});*/
  next();
});

// ROUTES
var router = express.Router();

function setUserSession(req, res, callback) {
	var oldUserId = 0;
	var expDate = new Date(Number(new Date()) + 315360000000);

	var domainClear;
	var host = req.hostname;
	if(trustedDomains.indexOf(host) != -1) {
		domainClear = host;
	}
	else {
		domainClear = host.split('.').reverse()[1] + '.' + host.split('.').reverse()[0];
	}

   if(!(req.cookies[sessionIdCookie])) {
		var userIpAddress = req.connection.remoteAddress.replace(/\./g,"");
		var newUserId = (req.user) ? req.user._id.toString() : Math.floor(Math.random() * (99999999999 - 1)) + 1 + userIpAddress + Math.round(+new Date()/1000);
		//console.log("Setting new session cookie");
		res.cookie(sessionIdCookie, newUserId, { domain: '.' + domainClear, expires: expDate });
		callback(0);
   }
	else {
		var domainClear = req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];
		if((req.user) && (req.user._id != req.cookies[sessionIdCookie])) {
			oldUserId = req.cookies[sessionIdCookie];
			res.cookie(sessionIdCookie, req.user._id.toString() , {  domain: '.' + domainClear, expires: expDate });
				callback(0);
		}
		else {
			callback(req.cookies[sessionIdCookie]);
		}
	}
}

// Index page
var rootRegExp = new RegExp('^/($|index(\.html)?$)');
router.get(rootRegExp, function (req, res){
  var domainClear = req.hostname.split('.').reverse()[1] + '.' + req.hostname.split('.').reverse()[0];
	var domainSplit = req.hostname.split('.');
  res.render(path.join(www_dir, www_static_dir, indexHtml), {});
});

app.use('/', router);

app.use(express.static(path.join(www_dir, www_static_dir)));

// ERROR HANDLING
// custom 404 page
app.use(function (req, res) {
    console.log('404: ' + req.url + ', User-Agent: ' + req.headers['user-agent']);
    res.type('text/html');
    res.status(404);
    res.send('<h1>404 - Not Found</h1>');
});

// custom 500 page
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.status(err.status || 500);
        res.type('text/html');
        res.send('<h1>500 - Server Error</h1>');
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.type('text/html');
    res.send('<h1>500 - Server Error</h1>');
});


// SOCKET.IO HTTP LISTEN
var http;
if (appPort !== ioPort) {
    http = require('http').Server(app).listen(ioPort, function () {
        console.log('Socket.io Http server listening on port: ' + ioPort);
    });
}

// APP LISTEN
var server = app.listen(app.get('port'), function () {
    console.log('Express server listening on port: ' + app.get('port'));
});
//require('socket.io').of().listen(server); // additional socket.io server to serve /socket.io/ requests

// SOCKET.IO LISTEN
var io = require('socket.io').listen((appPort === ioPort ? server : http), { log: true});

module.exports.io = io;

var socketIoEvents = require("./lib/socketio-events.js").setDir(www_dir, www_static_dir, eventsReg, function () { });

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/#login');
}

module.exports.checkEvent = function(eventId, callback) {
	Event.findOne({eventId : eventId }).exec(function (err, doc) {
		if( doc ) {
      var markedRecords = Guests.count({eventId: eventId, marked: 1});
      markedRecords.then(function(marked) {
			     callback({found: 1, name: doc.name, count: doc.addCount, marked: marked});
      });
		}
		else {
			callback({found: 0});
		}
	});
}

module.exports.checkGuest = function(eventId ,guestId, callback) {
	Guests.findOne({_id : guestId, eventId: eventId }).exec(function (err, doc) {
		if( doc ) {
			callback({found: 1});
		}
		else {
			callback({found: 0});
		}
	});
}

function readUserRights(userId, callback) {
	User.findOne({_id: userId }, function (err, userDoc) {
		if(userDoc) {callback(userDoc.role > 0 ? userDoc.role : 0)}
		else {callback(0)}
	});
}

module.exports.getCookie = function (cookie, cookiename) {
  var cookiestring=RegExp(""+cookiename+"[^;]+").exec(cookie);
  return unescape(!!cookiestring ? cookiestring.toString().replace(/^[^=]+./,"") : "");
}
