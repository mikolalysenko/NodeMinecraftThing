var voxels = require('../server/voxels.js');

function assert_fail(a, b) {
  console.log("ASSERT FAIL:", a, b);
  throw Error("ASSERT FAIL");
}

function assert_equals(arr0, arr1) {
  if(typeof(arr0) != typeof(arr1)) {
    assert_fail(arr0, arr1);
  }
  else if(typeof(arr0) == "object") {
    if(arr0.constructor !== arr1.constructor) {
      assert_fail(arr0, arr1);
    }
    if(arr0 instanceof Array) {
      if(arr0.length != arr1.length) {
        assert_fail(arr0, arr1);
      }
      for(var i=0; i<arr0.length; ++i) {
        if(arr0[i] !== arr1[i]) {
          assert_fail(arr0, arr1);
        }
      }
    }
    else if("equals" in arr0) {
      if(!arr0.equals(arr1)) {
        assert_fail(arr0, arr1);
      }
    }
    else {
      if(arr0 != arr1) {
        assert_fail(arr0, arr1);
      }
    }
  }
  else if(arr0 !== arr1) {
    assert_fail(arr0, arr1);
  }
};


(function() {

  console.log("Testing chunk");
  
  CHUNK_SIZE = voxels.CHUNK_SIZE;
  CHUNK_X    = voxels.CHUNK_X;
  CHUNK_Y    = voxels.CHUNK_Y;
  CHUNK_Z    = voxels.CHUNK_Z;
  
  var a = new voxels.Chunk(0,0,0);  
  assert_equals(a.data, [0,0]);

  a.set(10,10,10,0);
  assert_equals(a.data, [0,0]);

  a.set(1, 0, 0, 1);
  assert_equals(a.data, [0,0,1,1,2,0]);
  
  a.set(1,0,0,0);
  assert_equals(a.data, [0,0]);
  
  a.set(CHUNK_X-1,CHUNK_Y-1,CHUNK_Z-1,1);
  assert_equals(a.data, [0,0,CHUNK_SIZE-1,1]);
  
  a.set(CHUNK_X-2,CHUNK_Y-1,CHUNK_Z-1,1);
  assert_equals(a.data, [0,0,CHUNK_SIZE-2,1]);
  
  a.set(CHUNK_X-3,CHUNK_Y-1,CHUNK_Z-1,2);
  assert_equals(a.data, [0,0,CHUNK_SIZE-3,2,CHUNK_SIZE-2,1]);  
  
  a.set(10, 0, 0,3);
  assert_equals(a.data, [0,0,10,3,11,0,CHUNK_SIZE-3,2,CHUNK_SIZE-2,1]);

  a.set(11, 0, 0,3);
  assert_equals(a.data, [0,0,10,3,12,0,CHUNK_SIZE-3,2,CHUNK_SIZE-2,1]);

  a.set(12, 0, 0, 2);
  assert_equals(a.data, [0,0,10,3,12,2,13,0,CHUNK_SIZE-3,2,CHUNK_SIZE-2,1]);
  

  var b = new voxels.Chunk(1, 0, 0);
  b.set(1, 0, 0, 1);
  b.set(2, 0, 0, 2);
  b.set(3, 0, 0, 3);
  assert_equals(b.data, [0,0,1,1,2,2,3,3,4,0]);
  
  b.set(2, 0, 0, 4);
  assert_equals(b.data, [0,0,1,1,2,4,3,3,4,0]);

  b.set(2, 0, 0, 3);
  assert_equals(b.data, [0,0,1,1,2,3,4,0]);

  b.set(2, 0, 0, 1);
  assert_equals(b.data, [0,0,1,1,3,3,4,0]);
  
  console.log("Chunk passed");
  
})();


(function() {

  console.log("Testing chunk set");
  
  var v = new voxels.ChunkSet();
  
  v.set(0,0,0,1);
  

  function test() {
    v.rangeForeach([0,0,0], [16,16,16], 1, 
      function(x, y, z, vals, step) {
        console.log("Visiting: ",x,y,z,vals, step);
      });
  }
  
  for(var i=0; i<10; ++i)
    test();

})();

