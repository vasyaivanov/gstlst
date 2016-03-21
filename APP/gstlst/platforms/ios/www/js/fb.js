var facebookObj = new Object();

facebookObj.login = function() {
    var fbLoginSuccess = function (userData) {
        console.log("UserInfo: ", userData);
    }
    
    facebookConnectPlugin.login(["public_profile"], fbLoginSuccess,
         function loginError (error) {
         console.error(error)
    });

}

facebookObj.checkStatus = function() {
    facebookConnectPlugin.getLoginStatus(function(response){
                                         console.log(response);
                                         if(response.status == "connected") {
                                            $("#facebook-but").hide();
                                         }
                                         },
                                         function(error) {
                                            console.log(error);
                                         });
}