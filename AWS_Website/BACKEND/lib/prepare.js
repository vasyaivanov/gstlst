var CachemanMongo = require('cacheman-mongo');
var fs = require('fs-extra');
var path = require('path');

var options = {
  port: 27017,
  host: '127.0.0.1',
  db: 'cache',
  collection: 'hash'
};

var cache = new CachemanMongo(options);
var cacheReady = false;
var cacheTimeout = 60000;

function onCacheReady(addedFiles){
    cacheReady = true;
    console.log('Cache ready, number of entries=' + addedFiles);
}

function initCache(Scheme, callback) {
    cacheReady = false;
    cache.clear(function (err) {
        if (err) {
            console.error('Error clearing cache: ' + err);
            callback(err);
        } else {
			// Cache gets data from DB
			Scheme.find({}, function (err, slidesDoc) {
				slidesDoc.forEach(function(doc) {
					cache.set(doc.eventId, true, function (err, value) {
						if (err) {
							console.error('Error setting cache: ' + err);
						}
					});
				});
				onCacheReady(slidesDoc.length);
        callback(null);
			});
      }
    })
};

exports.initCache = initCache;


var List = function (eventParams, callback) {
    var self = this;

    this.maxNumTries = 10;
    this.count = 0;
    this.hashValue = null;
    this.params = eventParams;

    if (!cacheReady) {
        var msg = 'Cache not ready';
        console.log(msg);
        callback(msg);
        throw msg;
    }

    this.reserveHash(function (err) {
        if (err) {
            callback(err);
        } else {
            console.log('New event created, hash: ' + self.hashValue);
            callback("",self.hashValue);
        }
    });
  }

List.prototype.setParams = function (params) {
    this.params = params;
};

List.prototype.getParams = function () {
    return this.params;
};

List.prototype.setNumSlides = function (num_slides) {
    this.num_slides = num_slides;
};

List.prototype.getNumSlides = function () {
    return this.num_slides;
};

List.prototype.getHash = function ()
{
	var hashLen = this.params.opt.hashSize;
    var time = process.hrtime()[0] // get unique number
	  , salt = Math.floor(Math.random() * Math.pow(hashLen - 1, Math.random() * (hashLen - 1))) % 36// get variable length prefix
	  , hash = '';
    for (var i = 0; i < hashLen - 1; i++) {
        hash = (time % 36).toString(36) + hash;
        time = Math.floor(time / 36);
    }
    hash = salt.toString(36) + hash;

	return hash;
}

List.prototype.reserveHash = function (callback) {
    var self = this;
    self.count++;
    self.hashValue = self.getHash();
    cache.get(self.hashValue, function (err, value) {
        if (self.count > self.maxNumTries) {
            var msg = 'Get Hash maximum tries reached';
            console.error(msg);
            callback(msg);
        } else if (err) {
            console.error('Error while getting hash cache: ' + err);
            callback(err);
        } else if (value != true) {
            cache.set(self.hashValue, true , cacheTimeout, function (err) {
                if (err) {
                    console.error('Error storing hash cache: ' + err);
                 }
                callback(err);
            });
        } else {
            self.reserveHash(callback);
        }
    });
}

List.prototype.deleteHash = function (callback) {
    var self = this;
    var oldHashValue = self.hashValue;
    if (!self.hashValue) {
        callback(null);
    } else {
        cache.set(oldHashValue, false , cacheTimeout, function (err) {
            console.log('Deleted hash cache: ' + oldHashValue);
            self.hashValue = null;      // mark hash as deleted
            if (err) {
                console.error('Error Deleting hash cache: ' + err);
                callback(err);
            }
        });
    }
};


module.exports.cache = cache;
module.exports.List = List;
