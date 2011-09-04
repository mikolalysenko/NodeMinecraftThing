"use strict";

//Vertex attribute record
function AttributeRec(attr_name, attr_size, attr_offset) {
	this.attr_name = attr_name;
	this.attr_size = attr_size;
	this.attr_offset = attr_offset;
}

//A vertex format specification
function VertexFormat() {
	this.attributes = [];
	this.vsize = 0;
}

//Adds an attribute to the vertex format.  All attributes are treated as floats
// attr_name is the name of the attribute
// attr_size is the number of components for the attribute
VertexFormat.prototype.add_attribute = function(attr_name, attr_size) {
	var attr = new AttributeRec(attr_name, attr_size, this.vsize);
	this.vsize += attr_size;
	this.attributes.push(attr);
	this[attr_name] = attr;
}

//Flattens a human readable list of vertex entries into an ordered list of vertex data
// This is not very efficient, but can be useful for debugging
VertexFormat.prototype.flatten = function(dict) {
	var res = [], i, j, attr;
	for(i=0; i<this.attributes.length; ++i) {
		var attr = this.attributes[i];
		for(j=0; j<attr.attr_size; ++j) {
			res.push(dict[attr.attr_name][j]);
		}
	}
	
	return res;
}

//Expands a flattened vertex array into a human readable form
VertexFormat.prototype.expand = function(data) {
	var res = {}, i, j, attr;
	
	if(data.length != this.vsize) {
		Console.log("Vertex data is too short");
		return {};
	}
	
	if(data instanceof Float32Array) {
		for(i=0; i<this.attributes.length; ++i) {
			attr = this.attributes[i];
		}
	}
}

