$(document).ready(function () {
    function getClearUrl() {
        var url = [location.protocol, '//', location.host, location.pathname].join('');
        return url;
    }

    function getClearHost() {
        var url = [location.protocol, '//', location.host].join('');
        return url;
    }

    function getCurrentHash() {
        var hash = document.location.href;
        if (hash[hash.length - 1] === '/') {
            hash = hash.slice(0, -1);
        }
        var slashPos = hash.lastIndexOf('/');
        hash = hash.slice(slashPos + 1);
        hash = hash.toUpperCase();
        return hash;
    }

    var url = document.location.href;
    var hashPos = url.lastIndexOf('#');
    var localUrl = url.slice(hashPos + 1);
    if (localUrl === 'upload_guestlist') {
        document.location = getClearUrl();
    }

    if(typeof mainSocket !== 'undefined') {
        alert('mainSocket is already defined!');
    }

    var mainSocket = io.connect(document.location.hostname + ':' + location.port);


    mainSocket.on('listUploadError', function (rdata) {
		    var data = {};
    		if(rdata.limit == 2) {
    			data.msg = "The file is too big";
    		}
    		else if(rdata.limit == 3) {
    			data.msg = "We only support csv file format";
    		}
    		else {
    			data.msg = 'Server error!\nPlease try uploading again. If fails again contact support.';
    		}
			//console.log("File conversion failed! " + JSON.stringify(data));
			data.error = true;
			data.percentage = 100;
    		updateProgress(data);
    		setTimeout(function(){ window.location = getClearUrl(); }, 10000); // reload after 10 sec
    });

    $("#uploadTrue").show();

    function setUploadMessage(title) {
        progressLabel.text(title);
    }

    var uploadButton  = $('#uploadGuestlist'),
        progressbar   = $('#progressbar'),
        progressLabel = $('#uploadLabel');

    progressbar.progressbar({
        value:  false
    });

    function openUploadDialog(msg) {
        var url = getClearUrl();
        document.location = url + "#upload_guestlist";
        setUploadMessage(msg);
    };


    function updateProgress(data) {
        var printMsg = false, newLine = false;
        var finalMsg = data.percentage == 100 && typeof data.msg !== 'undefined';
        var msg = '';
        if (data.percentage >= 0 && !data.error && !finalMsg) {
            msg += "Progress: " + data.percentage + "%";
            newLine = true;
        } else {
            printMsg = true;
        }
        if (printMsg || finalMsg) {
            if (newLine) {
                msg += '\n';
            }
            msg += data.msg;
        }
        progressLabel.html(msg);
        if (data.percentage >= 0 || data.error) {
            var n = data.error ? 100 :  parseInt(data.percentage, 10);
            progressbar.progressbar("value", n);
        }
    }


	mainSocket.emit('readUserUpload', function(maxFileSize) {

			var siofu = new SocketIOFileUpload(mainSocket);
			siofu.chunkSize = 0;
			siofu.maxFileSize = maxFileSize;
			siofu.listenOnInput(document.getElementById("uploadGuestlist"));

			siofu.addEventListener("choose", function(event){
				console.log("Upload file(s) chosen: " + event.files[0].name);
				openUploadDialog('Uploading: ' + event.files[0].name);
			});

			siofu.addEventListener("start", function(event){
				console.log("Upload started: " + event.file.name);
			});

			siofu.addEventListener("complete", function(event){
				console.log("Upload successful: " + event.file.name);
				setUploadMessage('Importing file...');
			});

			siofu.addEventListener("error", function(event){
				var data = [];
				data.msg = 'Server error!\nPlease try uploading again. If fails again contact support.';
				if(event.code == 1) {
					data.msg = "File is too big for upload."
				}
				data.error = true;
				data.percentage = 100;
				updateProgress(data);
				setTimeout(function(){ window.location = getClearUrl(); }, 10000); // reload after 10 sec
			});
	});


	mainSocket.on("uploadProgress", function (data) {
        data.msg = "Guest list uploaded!<br>Download our <a href=\"https://itunes.com\">app</a> and enter this password <a><i>" + data.eventId + "</i></a> to manage this guest list";
        if (data.percentage >= 0) {
          data.error = false;
          updateProgress(data);
        }
    });

});
