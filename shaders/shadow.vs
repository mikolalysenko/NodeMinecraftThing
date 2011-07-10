precision mediump float;

attribute vec3 pos;

uniform mat4 proj;
uniform vec3 chunk_offset;

varying float depth;

void main(void)
{
	vec4 pos = proj * vec4(pos + chunk_offset, 1.0);
	depth = pos.z + 0.001;
	gl_Position = pos;
}


