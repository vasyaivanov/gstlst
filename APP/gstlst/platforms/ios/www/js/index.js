var appObj = new Object();
appObj.connected = 0;

$( document ).ready(function() {
if(typeof io != "undefined") {
	var socket = io.connect("https://www.uberguestlist.com/");
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
			for (i = 0; i < guestlistMetadata.guests.length; i++) {
				if(guestId == guestlistMetadata.guests[i].fakeid) {
					// Send socket to remove
					console.log("Guest was found")
					socket.emit("markGuest", {eventId: $("#eventPassword").val().toLowerCase(), guestId: guestlistMetadata.guests[i]._id }, function(data) {
						if(data.code == 0) {
							appObj.removeFromList(guestId,1);
						}
					});
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
		$("#cancelDeleteGuest").click();
	}

	// Show pass windows if server is online
	socket.on("connect", function(err) {
		console.log("Connection is online");
		if($("#eventPassword").val() == "") {
			$("#loadingPage").hide();
			$("#enterEventPass").show();
			appObj.connected = 1;
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
		for (i = 0; i < guestlistMetadata.guests.length; i++) {
			if(data.guestId == guestlistMetadata.guests[i]._id && data.eventId == guestlistMetadata.guests[i].eventId) {
				appObj.removeFromList(guestlistMetadata.guests[i].fakeid,0);
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
		appObj.loadList();
	}

	function goHome() {
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
				guestlistMetadata = {
					eventName: eventData.name,
					guests: eventData.guests
				};
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
});
