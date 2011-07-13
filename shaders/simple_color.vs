precision mediump float;

attribute vec3 pos;
attribute vec3 color;

uniform mat4 proj;

varying vec3 c;

void main(void)
{
	gl_Position = proj * vec4(pos,1);
	c = color;
}

