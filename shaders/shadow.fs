#extension GL_OES_standard_derivatives : enable
precision mediump float;

varying float depth;

void main(void)
{
	float dx = dFdx(depth);  
	float dy = dFdy(depth);  

	gl_FragColor = vec4(depth, depth*depth + 0.25 * (dx*dx + dy*dy), 1, 1);
}

