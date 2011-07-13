//Default vertex buffer capacity for the mesh
var DEFAULT_CAPACITY = 1024;

//Incidence record
function Incidence(vert, cell) {
    this.vert = vert;
    this.cell = cell;
}

//A cell label
function Cell(d, c) {
	this.dimension = d;
	this.cell_id = c;
}

//A cell data type
function CellRec() {
    this.boundary = [];
    this.coboundary = [];
}

//A vertex data type
function Vertex(v) {
    this.v = v;
    this.coboundary = [];
}

//Vertex attribute entry
function Attribute(attr_name, attr_size, attr_offset) {
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
	var attr = new Attribute(attr_name, attr_size, this.vsize);
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

//Initializes the cell-tuple complex
// d = dimension of graph (must be nonnegative)
// vfmt = The vertex format.
function CellTupleComplex(d, vfmt) {

	//Initialize topological data
    var i;
    this.cells = new Array(d+1);
    this.index = new Array(d+1);
    this.count = new Array(d+1);
    
    for(i=0; i<=d; ++i) {
        this.cells[i] = {};
        this.index[i] = 0;
        this.count[i] = 0;
    }

   	//Initialize vertex buffer data
   	if(!(vfmt instanceof VertexFormat)) {
   		Console.log("Warning!  Invalid vertex format!");
   	}
   	
   	this.vertex_format = vfmt;
   	this.vsize = vfmt.vsize;
    this.vbuffer = new Float32Array(DEFAULT_CAPACITY * this.vsize);
    this.vlookup = [];
}

//Looks up the id for a given cell from its vertex tuple
// tup is the list of vertex names for the cell
// Returns the name of the cell (if it exists) or else -1
CellTupleComplex.prototype.lookup_cell = function(tup) {
	if(!(tup[0] in this.cells[0]))
		return null;

    if(tup.length == 1)
        return new Cell(0, tup[0]);

    var v, i, j, cob, c = tup[0], d = tup.length-1;
    
    for(i=0; i<d; ++i) {
        v = this.cells[i][c];
    
        for(j=0; j<v.coboundary.length; ++j) {
            cob = v.coboundary[j];
            if(cob.vert == tup[i+1])
            {
                c = cob.cell;
                break;
            }
        }
        
        if(j == v.coboundary.length) {
            return null;
        }
    }

    return new Cell(d, c);
}

//Looks up the tuple for a given cell
// d is the dimension of the cell
// c is the name of the cell
// Returns the tuple of the cell, or an empty list if no such cell exists
CellTupleComplex.prototype.get_tuple = function(cel) {
	var c = cel.cell_id, d = cel.dimension;
    if(!(c in this.cells[d]))
        return [];
    if(d < 1)
        return [ c ];
    
    var i, boundary = this.cells[d][c].boundary, res = new Array(d+1);
    for(i=0; i<=d; ++i) {
        res[i] = boundary[i].vert;
    }
    return res;
}

//Retrieves the vertex data from a vertex object
// vert is a cell label for the vertex
// Returns the components of the vertex, as arranged by the vertex format
CellTupleComplex.prototype.get_vert_data = function(vert) {
	var c = vert.cell_id, d = vert.dimension;
	if( d != 0  || !(c in this.cells[0]) )
		return []
	
	var off = this.cells[0][c].v * this.vsize;
	return this.vbuffer.slice(off, off+this.vsize);
}

//Adds a vertex to the graph
// vdata is the vertex data
// Returns the name of the vertex
CellTupleComplex.prototype.add_vert = function(vdata) {
    var c = this.index[0]++;
    
    //Check if we need to resize vertex array
    var off = this.count[0] * this.vsize;
    if(off >= this.vbuffer.length) {
    	var tmp = this.vbuffer;
    	this.vbuffer = new Float32Array(this.vbuffer.length * 2);
    	this.vbuffer.set(tmp);
    	delete tmp;
    }
    
    //Set data
    this.vbuffer.subarray(off, off+this.vsize).set(vdata);
    this.vlookup.push(c);
    
    this.cells[0][c] = new Vertex(this.count[0]++);
    return c;
}

//Adds a cell to the graph
// tup is a list of vertex indices
// Returns name of cell or -1 if the vertices of the cell do not exist
CellTupleComplex.prototype.add_cell = function(tup) {
    //Check all verts exist
    var i, d = tup.length-1;
    for(i=0; i<tup.length; ++i) {
        if(!(tup[i] in this.cells[0]))
            return null;
    }

    //Check if cell already exists
    var o = this.lookup_cell(tup);
    if(o)
    	return o;
    
    //Update all bounding cells
    var b, nc = new CellRec(), v, c = this.index[d]++; 
    for(i=0; i<tup.length; ++i) {
    	//Add boundary cell (if needed)
        v = tup[i];
        tup[i] = tup[d];
        b = this.add_cell(tup.slice(0, d)).cell_id;
        tup[i] = v;
        
        //Add to boundary of this cell, and update coboundary relation
        nc.boundary.push( new Incidence(v, b) );
        this.cells[d-1][b].coboundary.push(new Incidence(v, c));
    }
    
    //Add cell
    this.cells[d][c] = nc;
    this.count[d]++;
    
    return new Cell(d, c);
}

//Removes a cell from the graph
// d is the dimension of the cell
// c is the name of the cell
CellTupleComplex.prototype.remove_cell = function(cel) {
    //Verify cell exists
	var d = cel.dimension, c = cel.cell_id;
    if(!(c in this.cells[d]))
        return;

    //Remove from boundary of all lower cells
    var i, j, t, b;
    if(d > 0) {
        var boundary = this.cells[d][c].boundary;
        for(i=0; i<boundary.length; ++i) {
            b = this.cells[d-1][boundary[i].cell];
            for(j=0; j<b.coboundary.length; ++j) {
                if(b.coboundary[j].cell == c) {
                    b.coboundary[j] = b.coboundary[b.coboundary.length-1];
                    b.coboundary.pop();
                    break;
                }
            }
        }
    }
    else {
    	//Calculate offsets
    	var v = this.cells[0][c].v,
    		off = v * this.vsize,
    		eoff = this.count[0] * this.vsize;

		//Fix index lookup
		i = this.vlookup[this.count[0]-1];
		this.cells[0][i].v = v;
		this.vlookup[v] = i;
		this.vlookup.pop();
		
		//Erase from vertex array
    	this.vbuffer.subarray(off, off+this.vsize).set(this.vbuffer.subarray(eoff - this.vsize, eoff));
    }

    //Delete all cells on coboundary
    var coboundary = this.cells[d][c].coboundary;
    while(coboundary.length > 0) {
        this.remove_cell(new Cell(d+1, coboundary[0].cell));
    }

    //Delete cell
    delete this.cells[d][c];
    this.count[d]--;
}

//Subdivides a cell
// d is the dimension
// c is the cell name
// v is the vertex which is getting added to split the cell
CellTupleComplex.prototype.split_cell = function(cel, v) {
	var d = cel.dimension, c = cel.cell_id;

	//Make sure cell exists
	if(!(c in this.cells[d]) || !(v in this.cells[0]) || this.cells[0][v].coboundary.length > 0)
		return;
	
	//Split the cell
	var bnd = this.get_tuple(cel), i, t;
	for(i=0; i<bnd.length; ++i) {
		t = bnd[i];
		bnd[i] = v;
		this.add_cell(bnd);
		bnd[i] = t;
	}
	
	//Split coboundary
	var nc = this.cells[d][c];
	for(i=0; i<nc.coboundary.length; ++i) {
		this.split_cell(d+1, nc.coboundary[i].cell, v);
	}
	
	//Remove the cell
	this.remove_cell(d,c);
}

//Collapses a cell down to a single vertex
// d is the dimension
// c is the cell name
// v is the vertex it will be collapsed down to
CellTupleComplex.prototype.collapse_cell = function(cel, v) {
	//Check that cell and vertex exist
	var d = cel.dimension, c = cel.cell_id;
	if(!(c in this.cells[d]) || !(v in this.cells[0]) || this.cells[0][v].coboundary.length > 0)
		return;

	//Replace all of the counbary cells with reduced dimension cells
	var bnd = this.get_tuple(cel), i, j, cob = this.cells[d][c].coboundary, to_visit = [], t;
	
	//Add all the collapsed cells to visit list
	for(i=0; i<cob.length; ++i) {
		this.add_cell([v, cob[i].vert]);
		to_visit.push([ [v, cob[i].vert], cob[i].cell ]);
	}
	
	//Collapse all cobordant cells
	for(i=0; i<to_visit.length; ++i) {
		cob = this.cells[d + to_visit[i][0].length - 1][to_visit[i][1]].coboundary;
		
		for(j=0; j<cob.length; ++j) {
			t = to_visit[i][0].slice();
			t.push(cob[j].vert);
			this.add_cell( t )
			to_visit.push([ t, cob[j].cell ]);
		}
	}
	
	//Remove all boundary cells
	for(i=0; i<bnd.length; ++i) {
		this.remove_cell(new Cell(0, bnd[i]));
	}
}

//Retrieves vertex buffer data
CellTupleComplex.prototype.get_vert_buffer = function() {
	return this.vbuffer.subarray(0, this.vcount*this.vsize);
}

//Retrieves index buffer data for cells of dimension d
CellTupleComplex.prototype.get_index_buffer = function(d, surface_only) {
	var ib = new Int16Array(d * this.count[d]), i=0, j, v, c, n = 0;
	
	if(d > 0) {
		if(surface_only) {
			for(c in this.cells[d]) {
				if(this.cells[d][c].coboundary.length <= 1) {
					for(j=0; j<d; ++j) {
						v = this.cells[d][c].boundary[j].vert;
						ib[i++] = this.cells[0][v].v;
					}
					++n;
				}
			}		
		}
		else {
			for(c in this.cells[d]) {
				for(j=0; j<d; ++j) {
					v = this.cells[d][c].boundary[j].vert;
					ib[i++] = this.cells[0][v].v;
				}
				++n;
			}
		}
	}
	else {
		for(c in this.cells[0]) {
			ib[i++] = this.cells[0][c].v;
			++n;
		}
	}
	
	return [ ib.subarray(0, i), n ];
}


function test_mesh() {

	//Create the vertex format
	var vfmt = new VertexFormat();
	vfmt.add_attribute("pos", 2);

	//Create mesh
	var mesh = new CellTupleComplex(2, vfmt);
	
	var v0 = mesh.add_vert([0,0]),
		v1 = mesh.add_vert([2,1]),
		v2 = mesh.add_vert([0,2]),
		v3 = mesh.add_vert([2,3]);
	
	mesh.add_cell([v0,v1,v2]);
	mesh.add_cell([v1,v2,v3]);

	var v = mesh.add_vert([1,1]),
		e = mesh.lookup_cell([v1, v2]);

	mesh.collapse_cell(e, v);
}
