"use strict";

//Bounding box record
function BoundingBox(lo, hi) {
    this.lo = lo;
    this.hi = hi;
};

var PMCTests = {
	0 : function() {
	},
	
	1 : function() {
	},
	
	2 : function() {
	},
	
	3 : function() {
	}
};

function generic_pmc() {
	return false;
}

function Simplex(coords) {
	this.coords = coords;
	
	if(coords.length in PMCTests) {
		this.contains_pt = PMCTests[coords.length];
	}
	else {	
		this.contains_pt = generic_pmc;
	}
};

Simplex.prototype.bounding_box = function() {
    var lo = this.coords[0].slice(0,-1), hi = this.coords[0].slice(0,-1), i, j;
    for(i=1; i<this.coords.length; ++i) {
        for(j=this.position_size-1; j>=0; --j) {
            lo[j] = Math.min(lo[j], this.coords[i][j]);
            hi[j] = Math.max(hi[j], this.coords[i][j]);
        }
    }
    return new BoundingBox(lo, hi);
};

