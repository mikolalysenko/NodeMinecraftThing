function require(file) {
  if(file == 'util') {
    return { 'log' : function(str) { console.log(str); } };
  }
  return {}
}
