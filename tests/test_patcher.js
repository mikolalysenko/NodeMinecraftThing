var patcher = require("../client/patcher.js");

function assert(expr, mesg) {
  if(!expr) {
    throw mesg;
  }
}

function printObj(obj) {
  console.log(JSON.stringify(obj));
}


(function() {
  var A = { a : 1, b : 2, c : 3, d : 4 },
      B = {};
      

  printObj(A);
  printObj(B);
  console.log(patcher.assign(B, A));
  
  printObj(A);
  printObj(B);
  console.log(patcher.assign(B, A));

  B = { b : 2, c : 4, d : 4, e : 8 };
  
  printObj(A);
  printObj(B);
  
  
  console.log(patcher.assign(B, A));
  
  printObj(A);
  printObj(B);
  
  
  A.x = { p:10, c:[0,1,2,3], qq:"qqqq", f:null };
  
  printObj(A);
  printObj(B);
  
  console.log(patcher.assign(B, A));
  
  printObj(A);
  printObj(B);
  
  A.x.c.length = 1
  A.qq = { arr:[], obj:{} };

  printObj(A);
  printObj(B);
  
  console.log(patcher.assign(B, A));
  printObj(A);
  printObj(B);
  
  A.x.c = ['x', 'y', 'z', 'p', 'd', 'q'];
  printObj(A);
  printObj(B);
  
  console.log(patcher.assign(B, A));

  printObj(A);
  printObj(B);


  A.x.c = {str:"I am an object now"};
  
  printObj(A);
  printObj(B);
  
  console.log(patcher.assign(B, A));
  
  printObj(A);
  printObj(B);

  console.log("DONE");  

})();


(function(){
  var A = { a : 1, b : 2, c : 3, d : 4 },
      B = { b : 2, c : 4, d : 4, e : 8 };
      
  var patch = patcher.computePatch(A, B);
  
  printObj(A);
  printObj(B);
  printObj(patch);

})();

//Test arrays

//Test null
