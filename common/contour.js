var FP_TOLERANCE = 0.00001;

function isocontour(density_func, vertex_func, lo, hi, res) {
    var edges = [ {}, {}, {} ], 
        vertices = {},
        size = (res[0] + 1) * (res[1] + 1),
        above = new Array(size),
        below = new Array(size),
        h = [0.0, 0.0, 0.0],
        i=0, j=0, k=0,
        coord = [0, 0, 0],
        x=0, y=0, z=0,
        c_f=0.0, e_f = [0.0,0.0,0.0], t = 0.0, 
        p = [0.0, 0.0, 0.0], 
        q = [0.0, 0.0, 0.0],
        u=0, v=0, u_dir=0, v_dir=0,
        u_tab = [1, 2, 0],
        v_tab = [2, 0, 1],
        tmp;
        
    //Adjust bounds
    for(i=0; i<3; ++i) {
        h[i] = (hi[i] - lo[i]) / res[i];
        lo[i] -= h[i];
        res[i] += 2;
    }
    
    //Construct lower bounds for edges
    i = 0;
    for(x=0; x<=res[0]; ++x)
    for(y=0; y<=res[1]; ++y) {
        below[i++] = density_func(x*h[0]+lo[0], y*h[1]+lo[1], lo[2]);
    }
    
    for(coord[0]=0; coord[2]<res[2]; ++coord[2]) {
        i = 0;
        for(coord[0]=0; coord[0]<res[0]; ++coord[0]) {
            for(coord[1]=0; coord[1]<res[1]; ++coord[1]) {
            
                //Evaluate density function
                for(k=0; k<3; ++k) {
                    p[k] = coord[k]*h[k] + lo[k];
                }
                above[i] = density_func( p[0], p[1], p[2]+h[2] );
                c_f = below[i++];
                e_f = [below[i+res[1]], below[i], above[i-1]];
                
                //Solve for edge intersections
                for(j=0; j<3; ++j) {
                    //Test for intersection
					if(c_f < -FP_TOLERANCE) {
						if(e_f[j] < -FP_TOLERANCE) {
							continue;
						}
					}
					else if(c_f > FP_TOLERANCE) {
						if(e_f[j] > FP_TOLERANCE) {
							continue;
						}
					}
					else {
						if(Math.abs(e_f[j]) < FP_TOLERANCE) {
							continue;
						}
					}
					
					//Find intercept
					for(k=0; k<3; ++k) {
					    q[k] = p[k];
					}
					q[j] += h[j] * c_f / (c_f - e_f[j]);
					edges[j][coord[0]+":"+coord[1]+":"+coord[2]] = [ q, (c_f < e_f[j]), coord ];
					
					//Mark neighboring vertices
					u_dir = u_tab[j];
					v_dir = v_tab[j];
					for(u=0; u<=1; ++u) {
					    if(coord[u_dir]-u < 0)
							continue;
						for(v=0; v<=1; ++v) {
						    if(coord[v_dir]-v < 0)
						        continue;
						    for(k=0; k<3; ++k) {
						        tmp[k] = coord[k];
						    }
						    tmp[u_dir] -= u;
						    tmp[v_dir] -= v;
						    vertices[tmp[0] + ":" + tmp[1] + ":" + tmp[2]] = tmp.slice(0);
						}
					}
                }
            }
            
            above[i++] = density_func(coord[0]*h[0]+lo[0], res[1]*h[1]+lo[1], (coord[2]+1)*h[2]+lo[2]);
        }
    
		if(coord[2] < res[2]) {
			p[0] = res[0] * h[0] + lo[0];
			p[1] = lo[1];
			p[2] = (res[2] + 1) * h[1] + lo[1];
			for(y=0; y<res[1]; ++y, p[1]+=h[1]) {
			    above[i++] = density_func(p[0], p[1], p[2]);
			}
			
			//Swap above and below arrays
			tmp = above;
			above = below;
			below = tmp;
		}
	}
	
	//Create the mesh
	var mesh = new TriMesh();
	
	//Compute vertices
	var vname, intersect, w=0.0;
	for(vname in vertices) {
	    coord = vertices[vname];
	    for(k=0; k<3; ++k) {
	        p[k] = 0.0;
	    }
	    
	    for(j=0; j<3; ++j) {
	        u_dir = u_tab[j];
			v_dir = v_tab[j];
			
			for(u=0; u<=1; ++u)
			for(v=0; v<=1; ++v) {
			    tmp = coord.slice(0);
			    tmp[u_dir] += u;
			    tmp[v_dir] += v;
			    
			    intersect = edges[tmp[0] + ":" + tmp[1] + ":" + tmp[2]][0];
			    if(edge) {
			        for(k=0; k<3; ++k) {
			            p[k] += intersect[k];
			        }
			        w += 1.0;
			    }
			}
	    }
	    
	    //Average center
	    w = 1.0 / w;
	    for(k=0; k<3; ++k) {
	        p[k] *= w;
	    }
	    
	    //Add the vertex to the mesh
	    coord[0] = mesh.add_vertex(p);
	}
	
	//Generate faces
	var ename, edge, vert = [0,0,0,0], n;
	for(j=0; j<3; ++j) {
	    u_dir = u_tab[j];
	    v_dir = v_tab[j];
	    
	    for(ename in edges[j]) {
	        edge = edges[j][ename];
	        coord = edge[2];
	        
			if(	coord[u_dir] <= 0 || coord[v_dir] <= 0 ||
				coord[u_dir] >= res[u_dir]-1 || 
				coord[v_dir] >= res[v_dir]-1 || 
				coord[e] >= res[e] - 2)
				continue;
				
			n = 0;
			for(u=0; u<=1; ++u)
			for(v=0; v<=1; ++v) {
				tmp = coord.slice(0);
				tmp[u_dir] -= u;
				tmp[v_dir] -= v;				
				vert[n++] = vertices[tmp[0]+":"+tmp[1]+":"+tmp[2]][0];
			}
			
			if(edge[1]) {
		        mesh.add_triangle(vert[0], vert[1], vert[2]);
				mesh.add_triangle(vert[2], vert[1], vert[3]);
			}
			else {
				mesh.add_triangle(vert[0], vert[2], vert[1]);
				mesh.add_triangle(vert[1], vert[2], vert[3]);		
			}
	    }
	}
	
	return mesh;
}

