precision mediump float;

attribute vec3 pos;
attribute vec2 texCoord;
varying vec2 tc;

void main(void)
{
	gl_Position = vec4(pos.x, pos.y, pos.z, 1.0);
	tc = texCoord;
}

