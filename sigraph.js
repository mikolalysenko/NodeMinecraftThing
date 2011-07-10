
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
function SIGraph(d) {
    var i;
    this.cells = new Array(d);
    this.index = new Array(d);
    for(i=0; i<d-1; ++i)
    {
        this.cells[i] = {};
        this.index[i] = 0;
    }
}

//Looks up the id for a given cell from its vertex tuple
// tup is the list of vertex names for the cell
// Returns the name of the cell (if it exists) or else -1
SIGraph.prototype.lookup_cell = function(tup) {
    if(tup.length == 1 {
        if( tup[0] in this.cells[0] )
            return tup[0];
        return -1;
    }  

    var v, i, j, cob, c = tup[0];
    
    for(i=0; i+1<tup.length; ++i) {
        v = this.cells[i][c];
    
        for(j=0; j<v.coboundary.length; ++j) {
            cob = v.coboundary[j];
            if(cob.vert == tup[i])
            {
                c = cob.cell;
                break;
            }
        }
        
        if(j == c.coboundary.length) {
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
    for(i=0; i<res; ++i)
    {
        res[i] = boundary[i].vert;
    }
    return res;
}

//Adds a vertex to the graph
// v is the vertex data
// Returns the name of the vertex
SIGraph.prototype.add_vert = function(v) {
    var c = this.index[0]++;
    this.cells[0][c] = new Vertex(v);
    return c;
}

//Adds a cell to the graph
// tup is a list of vertex indices
// Returns name of cell or -1 if the vertices of the cell do not exist
SIGraph.prototype.add_cell = function(tup) {
    //Check all verts exist
    var i;
    for(i=0; i<tup.length; ++i) {
        if(!(tup[i] in cells[0]))
            return -1;
    }

    //Check if cell already exists
    var c = SIGraph.prototype.lookup_cell(tup);
    if(c != -1)
        return c;
    
    //Update all bounding cells
    var b, nc = new Cell(), v
    c = this.index[tup.length]++; 
    for(i=0; i<tup.length; ++i)
    {
        v = tup[i];
        tup[i] = tup[-1];
        b = this.add_cell(tup.slice(0, tup.length-1));
        tup[i] = v;
        
        nc.boundary.push( new Incidence(v, b) );
        this.cells[tup.length-1][b].coboundary.push(new Incidence(v, c));
    }
    this.cells[tup.length][c] = nc;
    
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
    if(d > 0)
    {
        var boundary = this.cells[d][c].boundary;
        for(i=0; i<boundary.length; ++i)
        {
            b = this.cells[d-1][boundary[i].cell];
            for(j=0; j<b.coboundary.length; ++j)
            {
                if(b.coboundary[j] == c)
                {
                    b.coboundary[j] = b.coboundary[-1];
                    b.coboundary.pop();
                }
            }
        }
    }

    //Delete all cells on coboundary
    var coboundary = this.cells[d][c].coboundary;
    while(coboundary.length > 0)
    {
        this.remove_cell(d+1, coboundary[0].cell);
    }

    //Delete cell
    delete this.cells[d][c];
}

