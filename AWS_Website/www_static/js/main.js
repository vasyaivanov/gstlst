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
    if (localUrl === 'upload_presentation') {
        document.location = getClearUrl();
    }

    if(typeof mainSocket !== 'undefined') {
        alert('mainSocket is already defined!');
    }

    var mainSocket = io.connect(document.location.hostname + ':' + location.port);


    mainSocket.on('listUploadError', function (rdata) {
		    var data = {};
    		if(rdata.limit == 1) {
    			data.msg = "You've reached the maximum limit of slides per user";
    		}
    		else if(rdata.limit == 2) {
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

    var uploadButton  = $('#uploadPresentation'),
        progressbar   = $('#progressbar'),
        progressLabel = $('#uploadLabel');

    progressbar.progressbar({
        value:  false
    });

    function openUploadDialog(msg) {
        var url = getClearUrl();
        document.location = url + "#upload_presentation";
        setUploadMessage(msg);
    };


    function updateProgress(data) {
        var printMsg = false, newLine = false;
        var finalMsg = data.percentage == 100 && typeof data.msg !== 'undefined';
        var msg = '';
        if (data.percentage >= 0 && !data.error && !finalMsg) {
            msg += "Progress: " + data.percentage + "%";
            newLine = true;
        } else if(data.slide > 0 && !data.error) {
            msg += "Loaded slides: " + data.slide + ' ';
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
        progressLabel.text(msg);
        if (data.percentage >= 0 || data.error) {
            var n = data.error ? 100 :  parseInt(data.percentage, 10);
            progressbar.progressbar("value", n);
        }
    }

			var siofu = new SocketIOFileUpload(mainSocket);
			siofu.chunkSize = 0;
			siofu.maxFileSize = 10240000;
			siofu.listenOnInput(document.getElementById("uploadPresentation"));

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


	mainSocket.on("uploadProgress", function (data) {
        var msg = "Upload Progress";
        if (data.percentage >= 0) {
            msg += ': ' + data.percentage + '%'
        }
        if (data.slite > 0) {
            msg += ' slide: ' + data.slide;
        }
        console.log(msg);
        if (data.percentage >= 0 || data.slide > 0) {
          data.error = false;
          updateProgress(data);
        }
    });

    mainSocket.on('slitePrepared', function (data) {
        console.log('File converted: ' + JSON.stringify(data));
        data.msg = 'Converted successfully!\nYOU WILL BE FORWARDED TO THE URL TO SHARE.';
        data.percentage = 100;
        updateProgress(data);
        setTimeout(function () {
            var url = getClearHost() + '/' + data.hash;
            window.location = url;
        }, 1000); // forward after 1 sec
    });
});
