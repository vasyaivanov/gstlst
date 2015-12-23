
if(typeof io != "undefined") {
	var socket = io.connect("https://www.uberguestlist.com/");
	//var socket = io.connect("http://www.ugl.loc/");
	var guestlistMetadata = {};

	// Functionality: hiding list before an orginized enters guest's name
	/*$("#filterControlgroup-input").on("keydown", function (e) {
		console.log($("#filterControlgroup-input").val().length);
		if($("#filterControlgroup-input").val().length >= 1) {
			$(".ui-controlgroup-controls").show();
		}
		else {
			$(".ui-controlgroup-controls").hide();
		}
	});*/
	
	function guestClicked(guestId, guestName){
		
		/*var id = "#" + guestId;
		$(id).hide('slow');
		$( "#greenCheckmark" ).show( "fast", 
			function() {setTimeout(function(){ $( "#greenCheckmark" ).hide(); }, 1000);   
		});*/

		$("#confirmDeleteGuestName").html(guestName + "?");
		$("#confirmDeleteGuest").attr("onclick", "markGuest('" + guestId + "','"+ guestName + "')");
		$("#popupButton").click();
	}

	function markGuest(guestId, guestName){
			for (i = 0; i < guestlistMetadata.guests.length; i++) {
				if(guestId == guestlistMetadata.guests[i].fakeid) {
					// Send socket to remove
					console.log("Guest was found")
					socket.emit("markGuest", {eventId: $("#eventPassword").val(), guestId: guestlistMetadata.guests[i]._id }, function(data) {
						if(data.code == 0) {
							removeFromList(guestId,1);
						}
					});
				}
			} 
	}
	
	function removeFromList(guestId,showMark) {
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
		$("#loadingPage").hide();
		$("#enterEventPass").show();
		if($("#eventPassword").val() != "") {
			$("#eventButton").click();
		}
	});

	// 
	socket.on("disconnect", function(err) {
		console.log("Lost connection")
		$("#event").hide();
		$("#enterEventPass").hide();
		$("#loadingPage").show();
		$(".ui-controlgroup-controls").empty();
	});

	socket.on("markedUser", function(data) {
		for (i = 0; i < guestlistMetadata.guests.length; i++) {
			if(data.guestId == guestlistMetadata.guests[i]._id && data.eventId == guestlistMetadata.guests[i].eventId) {
				removeFromList(guestlistMetadata.guests[i].fakeid,0);
			}
		}
	});
	
	$("#eventButton").click(function() {
		socket.emit("getEvent", {eventId: $("#eventPassword").val()} , function(eventData) {
			if(eventData.code == 1) {
				// Event wasn't found
				$("#enterEventError").text("Event wasn't found");
			}
			else {
				guestlistMetadata = {
					eventName: eventData.name,
					guests: eventData.guests
				};

				document.addEventListener("deviceready", onDeviceReady, false);
				var isDeviceReady = false;
				function onDeviceReady(){
					if(!isDeviceReady){
						isDeviceReady = true;
						$("#eventName").html(guestlistMetadata.eventName);
						if(guestlistMetadata && guestlistMetadata.guests && guestlistMetadata.guests.length>0){
							var guests = guestlistMetadata.guests;
							for (i = 0; i < guests.length; i++) {
								var newId = Math.floor(Math.random() * (9999999 - 1111111) + 1111111);
								guestlistMetadata.guests[i].fakeid = newId;
								guests[i].fakeid = newId;
								var guest= $('<a id="'+ guests[i].fakeid +'" href="#" class="ui-btn ui-shadow ui-corner-all" onclick="guestClicked(\'' + guests[i].fakeid + '\',\''+ guests[i].Name + '\')">' + guests[i].Name + '</a>');
								$(".ui-controlgroup-controls ").append(guest);
							}
						}
					}
				}
				
				$("#enterEventPass").hide();
				$("#enterEventError").text("");
				//$(".ui-controlgroup-controls ").hide();
				$("#event").show();

			}
		});
	});
}
else {
	setTimeout(function(){
		location.reload();
		console.log("Reconnecting");
	},5000);
}
