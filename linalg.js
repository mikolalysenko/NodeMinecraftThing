

function mmult(A, B)
{
	var C = new Array(16);
	
	for(var i=0; i<4; i++)
	{
		for(var j=0; j<4; j++)
		{
			var x = 0.0;
			for(var k=0; k<4; k++)
			{
				x += A[i + 4*k] * B[k + 4*j];
			}
			C[i + 4*j] = x;
		}
	}
	return C;
}

function hgmult(M, X)
{
	var R = [0, 0, 0, 0], V = [X[0], X[1], X[2], 1.0], i, j;
	
	for(j=0; j<4; ++j)
	{
		for(i=0; i<4; ++i)
		{
			R[i] += M[i+4*j] * V[j]
		}
	}
	
	for(i=0; i<4; ++i)
	{
		R[i] /= R[3];
	}
	
	return R;
}


function m3inv(mat)
{
	var k,
	
	M = function(i, j) { return mat[i + 3*j]; },
	
	R = [
		 M(1,1)*M(2,2)-M(1,2)*M(2,1),	-M(1,0)*M(2,2)+M(1,2)*M(2,0),	 M(1,0)*M(2,1)-M(1,1)*M(2,0),
		-M(0,1)*M(2,2)+M(0,2)*M(2,1),	 M(0,0)*M(2,2)-M(0,2)*M(2,0),	-M(0,0)*M(2,1)+M(0,1)*M(2,0),
		 M(0,1)*M(1,2)-M(0,2)*M(1,1),	-M(0,0)*M(1,2)+M(0,2)*M(1,0),	 M(0,0)*M(1,1)-M(0,1)*M(1,0) ],
	
	D = M(0,0) * R[0]  + M(0,1) * R[1] + M(0,2) * R[2];
	
	if(Math.abs(D) < 0.0001)
	{
		return [];
	}
	
	for(k=0; k<9; ++k)
	{
		R[k] /= D;
	}
	
	return R;
}

function m3xform(M, x)
{
	var i, j, y = [0,0,0];
	
	for(i=0; i<3; ++i)
	for(j=0; j<3; ++j)
	{
		y[i] += M[i+3*j] * x[j];
	}
	
	return y;
}

function m3transp(M)
{
	var res = new Array(9), i, j;
	
	for(i=0; i<3; ++i)
	for(j=0; j<3; ++j)
	{
		res[i+3*j] = M[j+3*i];
	}
	
	return res;
}

function m4det(m)
{
	return  m[3]*m[6]*m[9]*m[12] - m[2]*m[7]*m[9]*m[12] - m[3]*m[5]*m[10]*m[12] + m[1]*m[7]*m[10]*m[12]+
			m[2]*m[5]*m[11]*m[12] - m[1]*m[6]*m[11]*m[12] - m[3]*m[6]*m[8]*m[13] + m[2]*m[7]*m[8]*m[13]+
			m[3]*m[4]*m[10]*m[13] - m[0]*m[7]*m[10]*m[13] - m[2]*m[4]*m[11]*m[13] + m[0]*m[6]*m[11]*m[13]+
			m[3]*m[5]*m[8]*m[14] - m[1]*m[7]*m[8]*m[14] - m[3]*m[4]*m[9]*m[14] + m[0]*m[7]*m[9]*m[14]+
			m[1]*m[4]*m[11]*m[14] - m[0]*m[5]*m[11]*m[14] - m[2]*m[5]*m[8]*m[15] + m[1]*m[6]*m[8]*m[15]+
			m[2]*m[4]*m[9]*m[15] - m[0]*m[6]*m[9]*m[15] - m[1]*m[4]*m[10]*m[15] + m[0]*m[5]*m[10]*m[15];
}

function m4inv(m)
{
	var inv = new Array(16);

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
}

function m4transp(M)
{
	var res = new Array(16), i, j;
	
	for(i=0; i<4; ++i)
	for(j=0; j<4; ++j)
	{
		res[i+4*j] = M[j+4*i];
	}
	
	return res;
}

function cross(u, v)
{
	return [ 
		u[1] * v[2] - u[2] * v[1],
		u[2] * v[0] - u[0] * v[2],
		u[0] * v[1] - u[1] * v[0] ];
}

function dot(u, v)
{
	return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
}

function get_frustum_planes(M)
{
	var res = [], pl, i, j, k;
	
	for(i=0; i<3; ++i)
	for(j=-1; j<=1; j+=2)
	{
		pl = [];
		for(k=0; k<4; ++k)
		{
			if(i == 2 && j == 1)
			{
				pl.push( M[4*k+2] );
			}
			else
			{
				pl.push( M[4*k+3] + j * M[4*k+i] );
			}
		}
		
		mag = Math.sqrt(pl[0] * pl[0] + pl[1] * pl[1] + pl[2] * pl[2]);
		
		for(k=0; k<4; ++k)
		{
			pl[k] /= mag;
		}
		
		res.push(pl);
	}
	return res;
}

