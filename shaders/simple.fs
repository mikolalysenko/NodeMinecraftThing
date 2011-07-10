precision mediump float;
uniform sampler2D tex;
varying vec2 tc;

void main(void)
{
	gl_FragColor = texture2D(tex, tc) + vec4(0, 0, 0, 1);
}

