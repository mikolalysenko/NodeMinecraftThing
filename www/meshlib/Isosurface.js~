"use strict";

//Extracts a sublevel set from a given parameterically defined implicit function
// f is the implicit function
// h is the cell resolution
// lo is the lower bound on the range
// hi is the upper bound on the range
// vfmt is the vertex format for the resulting cell complex
// attr_func is the function which computes the 
//
function extract_sublevel3d(f, h, lo, hi, vfmt, attr_func) {
	var ctcomplex = new CellTupleComplex(3, vfmt);
	
    //Compute initial bounds
    var 
        dx = hi[0] - lo[0],
        dy = hi[1] - lo[1],
        dz = hi[2] - lo[2],
        nx = Math.floor(dx / h),
        ny = Math.floor(dy / h),
        nz = Math.floor(dz / h),
        stride_x = 1,
        stride_y = nx,
        stride_z = ny * stride_y
        i, j, k, idx = 0,
        x, y, z,
        samples = new Array(stride_z * nz);
        
    //Compute samples on grid points
    for(k=0, z=lo[0]; k<nz; ++k, z+=h)
    for(j=0, y=lo[1]; j<nj; ++j, y+=h)
    for(i=0, x=lo[2]; i<nx; ++i, x+=h)
    {
        samples[idx++] = f(x,y,z);
    }
    
    
    
    
}


