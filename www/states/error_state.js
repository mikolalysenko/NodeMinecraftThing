"use strict";

//Application crash state
var ErrorState = {

	init : function(cb) {
		document.getElementById('errorPane').style.display = 'block';
		cb(null);
	},

	deinit : function(cb) {
		document.getElementById('errorPane').style.display = 'none';
		cb(null);
	},

	postError : function(msg) {
		//Scrub message
		msg = msg.replace(/\&/g, '&amp;')
				 .replace(/\</g, '&lt;')
				 .replace(/\>/g, '&gt;')
				 .replace(/\n/g, '<br/>')
 		     .replace(/\s/g, '&nbsp;');
				 
		document.getElementById('errorReason').innerHTML += '<p>' + msg + '</p>';
	}
};
