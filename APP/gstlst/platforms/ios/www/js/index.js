var guestlistMetadata = {
    eventName: "Ruby Skye New Years party",
    guests: [
        {"guestName":"Konstantin Raskoshniy", "guestId":"1"}, 
        {"guestName":"Jim Duhovniy", "guestId":"2"}, 
        {"guestName":"Anna Ivanova", "guestId":"3"}, 
        {"guestName":"John Doe", "guestId":"4"}, 
        {"guestName":"Anna Yorkoalnvoa", "guestId":"5"}, 
        {"guestName":"Bob Alekxsnadi", "guestId":"6"}, 
        {"guestName":"Anna", "guestId":"7"}, 
        {"guestName":"John", "guestId":"8"}, 
        {"guestName":"Anna Bobana", "guestId":"9"}, 
        {"guestName":"Евгений Духовный", "guestId":"10"}
    ]
}

document.addEventListener("deviceready", onDeviceReady, false);
var isDeviceReady = false;
function onDeviceReady(){
    if(!isDeviceReady){
        isDeviceReady = true;
        $("#eventName").html(guestlistMetadata.eventName);
        if(guestlistMetadata && guestlistMetadata.guests && guestlistMetadata.guests.length>0){
            var guests = guestlistMetadata.guests;
            for (i = 0; i < guests.length; i++) { 
                var guest= $('<a id="'+ guests[i].guestId +'" href="#" class="ui-btn ui-shadow ui-corner-all" onclick="guestClicked(\'' + guests[i].guestId + '\',\''+ guests[i].guestName + '\')">' + guests[i].guestName + '</a>');
                $(".ui-controlgroup-controls ").append(guest);
            }
        }
    }
}

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
        var id = "#" + guestId;
        $(id).hide('slow');
        $( "#greenCheckmark" ).show( "fast", 
            function() {setTimeout(function(){ $( "#greenCheckmark" ).hide(); }, 1000);   
        });
        $("#cancelDeleteGuest").click();    
}

