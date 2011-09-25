//This module is a terrible, thoughtlessly constructed mess.  On the other hand,
// I also have better things to do in life than endlessly rewrite linear algebra
// codes.  So it will do for now.


//Linear interpolation
exports.lerp = function(p0, p1, t, f) {
  if(!f) {
    f = new Array(p0.length);
  }
  for(var i=p0.length-1; i>=0; --i) {
    f[i] = (1.0-t)*p0[i] + t*p1[i];
  }
  return f;
}

//Cubic Hermite spline interpolation
exports.hermite = function(p0, v0, p1, v1, t, f) {
  if(!f) {
    f = new Array(p0.length);
  }
  
  //Evaluate hermite polynomials
  var ti  = (t-1), t2  = t*t, ti2 = ti*ti,
      h00 = (1+2*t)*ti2,
      h10 = t*ti2,
      h01 = t2*(3-2*t),
      h11 = t2*ti;
      
  for(var i=p0.length-1; i>=0; --i) {
    f[i] = h00*p0[i] + h10*v0[i] + h01*p1[i] + h11*v1[i];
  }
  
  return f;
}

exports.cross = function(u, v) {
	return [ 
		u[1] * v[2] - u[2] * v[1],
		u[2] * v[0] - u[0] * v[2],
		u[0] * v[1] - u[1] * v[0] ];
};

exports.dot3 = function(u, v) {
	return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
};

exports.hg_xform3 = function(M, X, R) {
  if(!R) {
    R = [0, 0, 0, 0];
  }
	var V = [X[0], X[1], X[2], 1.0], i, j;
	for(j=0; j<4; ++j)
	for(i=0; i<4; ++i) {
		R[i] += M[i+4*j] * V[j]
	}
	for(i=0; i<4; ++i) {
		R[i] /= R[3];
	}
	return R;
};

exports.xform3 = function(M, x, y) {
  if(!y) {
    y = [0,0,0];
  }
	var i, j;
	for(i=0; i<3; ++i)
	for(j=0; j<3; ++j) {
		y[i] += M[i+3*j] * x[j];
	}
	
	return y;
};

exports.mmult3 = function(A, B, C) {
  if(!C) {
    C = new Array(9);
  }
	var i, j, k;
	for(i=0; i<3; i++) {
		for(j=0; j<3; j++) {
			var x = 0.0;
			for(k=0; k<3; k++) {
				x += A[i + 3*k] * B[k + 3*j];
			}
			C[i + 3*j] = x;
		}
	}
	return C;
};

exports.minv3 = function(mat, R) {
  if(!R) {
    R = new Array(9);
  }
	var k, M = function(i, j) { return mat[i + 3*j]; };
	R = [
		 M(1,1)*M(2,2)-M(1,2)*M(2,1),	-M(1,0)*M(2,2)+M(1,2)*M(2,0),	 M(1,0)*M(2,1)-M(1,1)*M(2,0),
		-M(0,1)*M(2,2)+M(0,2)*M(2,1),	 M(0,0)*M(2,2)-M(0,2)*M(2,0),	-M(0,0)*M(2,1)+M(0,1)*M(2,0),
		 M(0,1)*M(1,2)-M(0,2)*M(1,1),	-M(0,0)*M(1,2)+M(0,2)*M(1,0),	 M(0,0)*M(1,1)-M(0,1)*M(1,0) ];
		 
	var D = M(0,0) * R[0]  + M(0,1) * R[1] + M(0,2) * R[2];
	
	if(Math.abs(D) < 0.0001) {
		return [];
	}
	for(k=0; k<9; ++k) {
		R[k] /= D;
	}
	return R;
};

exports.mtransp3 = function(M, res) {
  if(!res) {
    res = new Array(9);
  }
	var i, j;
	for(i=0; i<3; ++i)
	for(j=0; j<3; ++j) {
		res[i+3*j] = M[j+3*i];
	}
	
	return res;
};

exports.xform4 = function(A, x, y) {
  if(!y) {
    y = new Array(4);
  }
  var i,j;
  for(i=0; i<4; ++i) {
    y[i] = 0;
    for(j=0; j<4; ++j) {
      y[i] += A[4*j+i] * x[j];
    }
  }
  return y;
};

exports.mmult4 = function(A, B, C) {
  if(!C)  {
    C = new Array(16);
  }
	var i, j, k, x;
	for(i=0; i<4; i++) {
		for(j=0; j<4; j++) {
			x = 0.0;
			for(k=0; k<4; k++) {
				x += A[i+4*k] * B[k+4*j];
			}
			C[i+4*j] = x;
		}
	}
	return C;
};

exports.mdet4 = function(m) {
	return  m[3]*m[6]*m[9]*m[12] - m[2]*m[7]*m[9]*m[12] - m[3]*m[5]*m[10]*m[12] + m[1]*m[7]*m[10]*m[12]+
			m[2]*m[5]*m[11]*m[12] - m[1]*m[6]*m[11]*m[12] - m[3]*m[6]*m[8]*m[13] + m[2]*m[7]*m[8]*m[13]+
			m[3]*m[4]*m[10]*m[13] - m[0]*m[7]*m[10]*m[13] - m[2]*m[4]*m[11]*m[13] + m[0]*m[6]*m[11]*m[13]+
			m[3]*m[5]*m[8]*m[14] - m[1]*m[7]*m[8]*m[14] - m[3]*m[4]*m[9]*m[14] + m[0]*m[7]*m[9]*m[14]+
			m[1]*m[4]*m[11]*m[14] - m[0]*m[5]*m[11]*m[14] - m[2]*m[5]*m[8]*m[15] + m[1]*m[6]*m[8]*m[15]+
			m[2]*m[4]*m[9]*m[15] - m[0]*m[6]*m[9]*m[15] - m[1]*m[4]*m[10]*m[15] + m[0]*m[5]*m[10]*m[15];
};

exports.minv4 = function(m, inv) {
  if(!inv) {
    inv = new Array(16);
  }

	inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] +
		m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
	inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] -
		m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
	inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] +
		m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
	inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] -
		m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
	inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] -
		m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
	inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] +
		m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
	inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] -
		m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
	inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] +
		m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
	inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] +
		m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
	inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] -
		m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
	inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] +
		m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
	inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] -
		m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
	inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] -
		m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
	inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] +
		m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
	inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] -
		m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
	inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] +
		m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];

	var det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

	if (Math.abs(det) <= 1e-8) {
		return inv;
	}

	det = 1.0 / det;

	for (var i = 0; i < 16; ++i) {
		inv[i] *= det;
	}

	return inv;
};

exports.mtransp4 = function(M, res) {
  if(!res) {
    res = new Array(16);
  }
	var i, j;
	for(i=0; i<4; ++i)
	for(j=0; j<4; ++j) {
		res[i+4*j] = M[j+4*i];
	}
	return res;
};


