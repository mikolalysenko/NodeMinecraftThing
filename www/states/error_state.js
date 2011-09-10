"use strict";

//Application crash state
var ErrorState = {

	init : function() {
		document.getElementById('errorPane').style.display = 'block';
	},

	shutdown : function() {
		document.getElementById('errorPane').style.display = 'none';
	},

	postError : function(msg) {
		//Scrub message
		msg = msg.replace(/\&/g, "&amp;")
				 .replace(/\</g, "&lt;")
				 .replace(/\>/g, "&gt;")
				 .replace(/\n/g, "\<br\/\>");
				 
		document.getElementById('errorReason').innerHTML = msg;
	}
};
