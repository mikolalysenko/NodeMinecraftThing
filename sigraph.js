var DEFAULT_CAPACITY = 1024;

//Incidence record
function Incidence(vert, cell) {
    this.vert = vert;
    this.cell = cell;
}

//A cell data type
function Cell() {
    this.boundary = [];
    this.coboundary = [];
}

//A vertex data type
function Vertex(v) {
    this.v = v;
    this.coboundary = [];
}

//Initialize simplified incidence graph
// d = dimension of graph (must be nonnegative)
// vsize = size of vertex data
function SIGraph(d, vsize) {
    var i;
    this.cells = new Array(d+1);
    this.index = new Array(d+1);
    this.count = new Array(d+1);
    
    for(i=0; i<d; ++i) {
        this.cells[i] = {};
        this.index[i] = 0;
        this.count[i] = 0;
    }

   	//Special vertex buffer data
    this.vsize = vsize;
    this.vbuffer = new Float32Array(DEFAULT_CAPACITY * vsize);
    this.vlookup = [];
}

//Looks up the id for a given cell from its vertex tuple
// tup is the list of vertex names for the cell
// Returns the name of the cell (if it exists) or else -1
SIGraph.prototype.lookup_cell = function(tup) {
	if(!(tup[0] in this.cells[0]))
		return -1;

    if(tup.length == 1)
        return tup[0];

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
            return -1;
        }
    }

    return c;
}

//Looks up the tuple for a given cell
// d is the dimension of the cell
// c is the name of the cell
// Returns the tuple of the cell, or an empty list if no such cell exists
SIGraph.prototype.get_tuple = function(d, c) {
    if(!(c in this.cells[d]))
        return [];
    if(d < 1)
        return [ c ];
    
    var i, boundary = this.cells[d][c].boundary, res = new Array(d);
    for(i=0; i<res; ++i) {
        res[i] = boundary[i].vert;
    }
    return res;
}

//Adds a vertex to the graph
// vdata is the vertex data
// Returns the name of the vertex
SIGraph.prototype.add_vert = function(vdata) {
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
SIGraph.prototype.add_cell = function(tup) {
    //Check all verts exist
    var i, d = tup.length-1;
    for(i=0; i<tup.length; ++i) {
        if(!(tup[i] in this.cells[0]))
            return -1;
    }

    //Check if cell already exists
    var c = this.lookup_cell(tup);
    if(c != -1)
        return c;
    
    //Update all bounding cells
    var b, nc = new Cell(), v
    c = this.index[d]++; 
    for(i=0; i<tup.length; ++i) {
    	//Add boundary cell (if needed)
        v = tup[i];
        tup[i] = tup[d];
        b = this.add_cell(tup.slice(0, d));
        tup[i] = v;
        
        //Add to boundary of this cell, and update coboundary relation
        nc.boundary.push( new Incidence(v, b) );
        this.cells[d-1][b].coboundary.push(new Incidence(v, c));
    }
    
    //Add cell
    this.cells[d][c] = nc;
    this.count[d]++;
    
    return c;
}

//Removes a cell from the graph
// d is the dimension of the cell
// c is the name of the cell
SIGraph.prototype.remove_cell = function(d, c) {
    //Verify cell exists
    if(!(c in this.cells[d]))
        return;

    //Remove from boundary of all lower cells
    var i, j, t, b;
    if(d > 0) {
        var boundary = this.cells[d][c].boundary;
        for(i=0; i<boundary.length; ++i) {
            b = this.cells[d-1][boundary[i].cell];
            for(j=0; j<b.coboundary.length; ++j) {
                if(b.coboundary[j] == c) {
                    b.coboundary[j] = b.coboundary[-1];
                    b.coboundary.pop();
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
        this.remove_cell(d+1, coboundary[0].cell);
    }

    //Delete cell
    delete this.cells[d][c];
    this.count[d]--;
}

//Retrieves vertex buffer data
SIGraph.prototype.get_vert_buffer = function() {
	return this.vbuffer.subarray(0, this.vcount*this.vsize);
}

//Retrieves index buffer data for cells of dimension d
SIGraph.prototype.get_index_buffer = function(d, surface_only) {
	var ib = new Int16Array(d * this.count[d]), i=0, j, v, c;
	
	if(d > 0) {
		if(surface_only) {
			for(c in this.cells[d]) {
				if(c.coboundary.length <= 1) {
					for(j=0; j<d; ++j) {
						v = this.cells[d][c].boundary[j].vert;
						ib[i++] = this.cells[0][v].v;
					}
				}
			}		
		}
		else {
			for(c in this.cells[d]) {
				for(j=0; j<d; ++j) {
					v = this.cells[d][c].boundary[j].vert;
					ib[i++] = this.cells[0][v].v;
				}
			}
		}
	}
	else {
		for(c in this.cells[0]) {
			ib[i++] = this.cells[0][c].v;
		}
	}
	
	return ib.subarray(0, i);
}


function test_mesh() {
	var mesh = new SIGraph(2, 2);
	
	mesh.add_vert([0,0]);
	mesh.add_vert([1,1]);
	mesh.add_vert([0,2]);
	
	mesh.add_cell([0,1]);
	mesh.add_cell([1,2]);
	mesh.add_cell([2,1]);
}
