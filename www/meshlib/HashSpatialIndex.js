"use strict";

//A hash based spatial index
function HashSpatialIndex(levels, scale_factor, base_scale) {
    this.base_scale = base_scale;
	this.scale_factor = scale_factor;
	this.hash_index = new Array(levels);
	
	var i;
	for(i=0; i<levels; ++i) {
        hash_index[i] = {};
	}
	
	this.ctcomplex = null;
	this.position_offset = 0;
	this.dimension = 0;
}

//Attaches a spatial index
HashSpatialIndex.prototype.attach_complex = function(ctcomplex) {

    if(this.ctcomplex) {
        Console.log("Warning!  Double attaching cell complex!");
        this.detach_complex();
    }

    this.ctcomplex = ctcomplex;
	this.position_offset = vfmt[position_attribute].attr_offset;
	this.dimension = vfmt[position_attribute].attr_size;
}

//Detaches the spatial index
HashSpatialIndex.prototype.detach_complex = function() {
    this.hash_index = [];
    this.ctcomplex = null;
}

//Adds a cell to the index
HashSpatialIndex.prototype.add_cell = function(cel) {    
}

//Removes  a cell from the index
HashSpatialIndex.prototype.remove_cell = function(cel) {
}

//Locates a point
HashSpatialIndex.prototype.locate_point = function(coord) {
}

