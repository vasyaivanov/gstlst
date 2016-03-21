var appObj = new Object();
appObj.connected = 0;
appObj.listLoaded = 0;

var audioClick = new Audio('./click.mp3');
audioClick.volume = 0.1;

Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

appObj.start = function() {
if(typeof io != "undefined") {
	var socket = io.connect("https://www.partyguestlist.com/");
  //var socket = io.connect("http://www.ugl.loc/");
	var guestlistMetadata = {};

	// Functionality: hiding list before the orginized enters guest's name
	/*$("#filterControlgroup-input").on("keydown", function (e) {
		console.log($("#filterControlgroup-input").val().length);
		if($("#filterControlgroup-input").val().length >= 1) {
			$(".ui-controlgroup-controls").show();
		}
		else {
			$(".ui-controlgroup-controls").hide();
		}
	});*/

  $("#addGuestMenu").hide();
	appObj.guestClicked = function (guestId, guestName){

		/*var id = "#" + guestId;
		$(id).hide('slow');
		$( "#greenCheckmark" ).show( "fast",
			function() {setTimeout(function(){ $( "#greenCheckmark" ).hide(); }, 1000);
		});*/

		$("#confirmDeleteGuestName").html(guestName + "?");
		$("#confirmDeleteGuest").attr("onclick", "appObj.markGuest('" + guestId + "','"+ guestName + "')");
		$("#popupButton").click();
	}

	appObj.markGuest = function(guestId, guestName){
    if(appObj.findGuestId(guestId)) {
			socket.emit("markGuest", {eventId: localStorage.getItem("lastEvent"), guestId: appObj.findGuestId(guestId) }, function(data) {
				if(data.code == 0) {
                    audioClick.play();
                    appObj.changeOnlineStats(2,1);
					appObj.removeFromList(guestId,1);
				}
			});
		}
	}

  appObj.findGuestId = function(gId) {
    for (i = 0; i < guestlistMetadata.guests.length; i++) {
      if(typeof guestlistMetadata.guests[i] != "undefined") {
        if(gId == guestlistMetadata.guests[i].fakeid && guestlistMetadata.guests[i].eventId == localStorage.getItem("lastEvent")) {
          return guestlistMetadata.guests[i]._id;
        }
        else if(gId == guestlistMetadata.guests[i]._id && guestlistMetadata.guests[i].eventId == localStorage.getItem("lastEvent")) {
          return guestlistMetadata.guests[i].fakeid;
        }
      }
    }
  }

	appObj.removeFromList = function(guestId,showMark) {
		var id = "#" + guestId;
		$(id).hide('slow');
		if(showMark == 1) {
			$( "#greenCheckmark" ).show( "fast",
				function() {setTimeout(function(){ $( "#greenCheckmark" ).hide(); }, 1000);
			});
		}
	}

  appObj.addNewGuest = function(data) {
    var nextKey = guestlistMetadata.guests.length + 1;
    guestlistMetadata.guests[nextKey] = {};
    guestlistMetadata.guests[nextKey]._id = data._id;
    guestlistMetadata.guests[nextKey].Name = data.name;
    guestlistMetadata.guests[nextKey].fakeid = Math.floor(Math.random() * (9999999 - 1111111) + 1111111);
    guestlistMetadata.guests[nextKey].eventId = localStorage.getItem("lastEvent");
    guestlistMetadata.guests[nextKey].marked = 0;
    appObj.changeOnlineStats(1,1);
    var guest= $('<a id="'+ guestlistMetadata.guests[nextKey].fakeid +'" href="#" class="ui-btn ui-shadow ui-corner-all" onclick="appObj.guestClicked(\'' + guestlistMetadata.guests[nextKey].fakeid + '\',\''+ guestlistMetadata.guests[nextKey].Name + '\')">' + guestlistMetadata.guests[nextKey].Name + '</a>');
    $(".ui-controlgroup-controls ").append(guest);

  }

	// Show pass windows if server is online
	socket.on("connect", function(err) {
		console.log("Connection is online");
		if($("#eventPassword").val() == "") {
			$("#loadingPage").hide();
			$("#enterEventPass").show();
			appObj.connected = 1;
			if(localStorage.getItem("lastEvent")) {
				console.log(localStorage)
				$("#eventPassword").val(localStorage.getItem("lastEvent"));
				goToEvent();
			}
		}
	});

	//
	socket.on("disconnect", function(err) {
		console.log("Lost connection");
		$("#event").hide();
		$("#enterEventPass").hide();
		$("#loadingPage").show();
		appObj.connected = 0;
	});


	socket.on("reconnect", function(err) {
		console.log("Reconnected");
		if($("#eventPassword").val() != "") {
			appObj.connected = 1;
			appObj.loadList();
		}
	});

	socket.on("markedUser", function(data) {
    if(appObj.findGuestId(data.guestId)) {
      appObj.changeOnlineStats(2,1);
      appObj.removeFromList(appObj.findGuestId(data.guestId),0);
    }
	});

  socket.on("removedUser", function(data) {
    if(appObj.findGuestId(data.guestId)) {
      appObj.changeOnlineStats(1,-1);
      appObj.removeFromList(appObj.findGuestId(data.guestId),0);
    }
  });

  socket.on("addedUser", function(data) {
      appObj.addNewGuest(data);
  });

  socket.on("markedChanged", function(data) {
      if(data.eventId == localStorage.getItem("lastEvent")) {
        if(data.action == 1) {
          appObj.changeOnlineStats(1,1);
          appObj.changeOnlineStats(2,1);
        }
        else {
          appObj.changeOnlineStats(1,-1);
          appObj.changeOnlineStats(2,-1);
        }
      }
  });


	$("#eventPassword").keyup(function(event){
	    if(event.keyCode == 13){
	        $("#eventButton").click();
	    }
	});

	function goToEvent() {
		$("#event").hide();
		$("#loadingPage").show();
		$("#enterEventPass").hide();
		$("#helpPanel").hide();
		$("#enterEventError").html("");
		if(appObj.connected == 0) {
			$("#loadingPage").show();
        }
        else {
            appObj.loadList();
        }
	}

	function goHome() {
		localStorage.clear();
    $("#addGuestMenu").hide();
		$("#event").hide();
		$("#helpPanel").hide();
		$("#enterEventPass").hide();
		if(appObj.connected == 0) {
			$("#loadingPage").show();
		}
		else {
			$("#enterEventPass").show();
		}
	}

	function showHelp() {
		$("#enterEventPass").hide();
		$("#event").hide();
		$("#helpPanel").show();
		$("#loadingPage").hide();
	}

	 /*$( ".ui-controlgroup-controls" ).on( "swipe", swipeHandler );
  	function swipeHandler( event ){
    	removeGuest(event.target.id);
	  }*/

	function addGuest(){
    var newGName = $("#addGuestName").val();
    newGName = newGName.replace(/[^a-zA-Z0-9]/g, '');
    if(newGName && localStorage.getItem("lastEvent")) {
      $('#addGuestButton').prop('disabled', true);
      socket.emit("addGuest", {eventId: localStorage.getItem("lastEvent"), guestName: newGName }, function(data) {
        if(data.code == 0) {
          $("#addNewGuestError").hide();
          $('#addGuestButton').prop('disabled', false);
          appObj.addNewGuest(data);
          $("#cancelDeleteGuest").click();
        }
        else {

          $("#addNewGuestError").show().text("This guest was found in DB");
          $('#addGuestButton').prop('disabled', false);
        }
      });
    }
	}

	function removeGuest(id){
    console.log("REMOVING");
    if(appObj.findGuestId(id)) {
      socket.emit("removeGuest", {eventId: localStorage.getItem("lastEvent"), guestId: appObj.findGuestId(id) }, function(data) {
        if(data.code == 0) {
          appObj.changeOnlineStats(1,-1);
          appObj.removeFromList(id,0);
        }
      });

    }

	}

  $("#addCheckedGuestNumberButton").click(function() {
    if(appObj.connected == 1) {
      audioClick.play();
      socket.emit("changeMarked", {eventId: localStorage.getItem("lastEvent"), action: 1 }, function(data) {
        if(data.code == 0) {
          appObj.changeOnlineStats(2,1);
          appObj.changeOnlineStats(1,1);
        }
      });
    }
  });

  $("#removeCheckedGuestNumberButton").click(function() {
    if(appObj.connected == 1) {
      audioClick.play();
      socket.emit("changeMarked", {eventId: localStorage.getItem("lastEvent"), action: -1 }, function(data) {
        if(data.code == 0) {
          //audioClick.play();
          appObj.changeOnlineStats(2,-1);
          appObj.changeOnlineStats(1,-1);
        }
      });
    }
  });

	$("#eventButton").click(function() {
		goToEvent();
	});

	$("#changeEventBut").click(function () {
		goHome();
	});

	$("#homeMenu").click(function () {
		goHome();
		$("#menuButton").click();
	});

	$("#helpMenu").click(function () {
		showHelp();
		$("#menuButton").click();
	});

	$("#eventMenu").click(function () {
		goToEvent();
		$("#menuButton").click();
	});

	$("#addGuestMenu").click(function () {
		$("#menuButton").click();
	});

	$("#removeGuestMenu").click(function () {
		removeGuest();
		$("#menuButton").click();
	});

	$("#addGuestButton").click(function () {
		addGuest();
	});

  appObj.changeOnlineStats = function(type,val) {
      var selName = (type == 1) ? "totalGuests" : "checkedGuests";
      if(val == 1) {
        $("#" + selName).text(parseInt($("#" + selName).text()) + 1);
      }
      else if(val == -1) {
        $("#" + selName).text(parseInt($("#" + selName).text()) - 1);
      }
  }

	appObj.loadList = function() {
		guestlistMetadata = {};
		$(".ui-controlgroup-controls").empty();
		socket.emit("getEvent", {eventId: $("#eventPassword").val().toLowerCase()} , function(eventData) {
			$("#loadingPage").hide();
			if(eventData.code == 1) {
				// Event wasn't found
				$("#event").hide();
				$("#enterEventPass").show();
				$("#enterEventError").text("Event wasn't found");
			}
			else {
				localStorage.setItem("lastEvent",$("#eventPassword").val().toLowerCase());
				guestlistMetadata = {
					eventName: eventData.name,
					guests: eventData.guests
				};
        $("#totalGuests").text(eventData.total);
        $("#checkedGuests").text(eventData.marked);
				$("#eventName").html(guestlistMetadata.eventName);
				if(guestlistMetadata && guestlistMetadata.guests && guestlistMetadata.guests.length>0){
					var guests = guestlistMetadata.guests;
					for (i = 0; i < guests.length; i++) {
						var newId = Math.floor(Math.random() * (9999999 - 1111111) + 1111111);
						guestlistMetadata.guests[i].fakeid = newId;
						guests[i].fakeid = newId;
						guests[i].Name = guests[i].Name.replace("'","");
						var guest= $('<a id="'+ guests[i].fakeid +'" href="#" class="ui-btn ui-shadow ui-corner-all" onclick="appObj.guestClicked(\'' + guests[i].fakeid + '\',\''+ guests[i].Name + '\')">' + guests[i].Name + '</a>');
						$(".ui-controlgroup-controls ").append(guest);
					}
				}

				$("#loadingPage").hide();
				$("#event").show();
        $("#addGuestMenu").show();
			}
		});
	}

}
else {
	setTimeout(function(){
		location.reload();
		console.log("Reconnecting");
	},5000);
}

}
