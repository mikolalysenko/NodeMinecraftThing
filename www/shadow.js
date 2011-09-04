"use strict";

var Shadows = {
	init : function()
	{
		var gl = Game.gl, res = Loader.get_program("shaders/shadow.fs", "shaders/shadow.vs");
		if(res[0] != "Ok")
		{
			return res[1];
		}
	
		Shadows.shadow_fs 		= res[1];
		Shadows.shadow_vs		= res[2];
		Shadows.shadow_shader	= res[3];
	
		Shadows.shadow_shader.pos_attr = 0;
		gl.bindAttribLocation(Shadows.shadow_shader, Shadows.shadow_shader.pos_attr, "pos");

		Shadows.shadow_shader.proj_mat = gl.getUniformLocation(Shadows.shadow_shader, "proj");
		if(Shadows.shadow_shader.proj_mat == null)
			return "Could not locate projection matrix uniform";
	
		Shadows.shadow_shader.chunk_offset = gl.getUniformLocation(Shadows.shadow_shader, "chunk_offset");
		if(Shadows.shadow_shader.chunk_offset == null)
			return "Could not locate chunk offset uniform";

	
		Shadows.shadow_maps = [ 
			new ShadowMap(512, 512, 256, 2, 300)
			];
	
	
		//Create quad stuff
		var verts = new Float32Array([
			-1, -1, 0, 1,
			-1, 1, 0, 1,
			1, 1, 0, 1,
			1, -1, 0, 1]);
	
		var ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
	
		Shadows.quad_vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Shadows.quad_vb);
		gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
		Shadows.quad_ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Shadows.quad_ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
		res = Loader.get_program("shaders/shadow_init.fs", "shaders/shadow_init.vs");
	
		if(res[0] != "Ok")
			return res[1];
	
		Shadows.shadow_init_shader	= res[3];
	
		Shadows.shadow_init_shader.pos_attr = gl.getAttribLocation(Shadows.shadow_init_shader, "pos");
		if(Shadows.shadow_init_shader.pos_attr == null)
			return "Could not locate position attribute for shadow init shader";
	
	
		Shadows.blur_tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, Shadows.blur_tex);
		gl.texParameteri(gl.TEXTURE_2D,	gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.FLOAT, null);
		gl.bindTexture(gl.TEXTURE_2D, null);	
	
		Shadows.blur_fbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, Shadows.blur_fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Shadows.blur_tex, 0);
	
		return "Ok";
	},

	shutdown : function()
	{
	},

	init_map : function()
	{
		var gl = Game.gl;

		gl.useProgram(Shadows.shadow_init_shader);
		gl.enableVertexAttribArray(Shadows.shadow_init_shader.pos_attr);
	
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.TEXTURE_2D);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, Shadows.quad_vb);
		gl.vertexAttribPointer(Shadows.shadow_init_shader.pos_attr, 4, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Shadows.quad_ib);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}
}

//A shadow map
var ShadowMap = function(width, height, z_center, radius, side)
{
	var gl = Game.gl;

	this.width		= width;
	this.height		= height;
	this.z_center	= z_center;
	this.side		= side;
	this.radius 	= radius;
	
	this.light_matrix = [ 1, 0, 0, 0,
										 0, 1, 0, 0,
										 0, 0, 1, 0,
										 0, 0, 0, 1 ];

	this.shadow_tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.shadow_tex);
	gl.texParameteri(gl.TEXTURE_2D,	gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	this.depth_rb = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.depth_rb);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	
	this.fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadow_tex, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depth_rb);
	
	if(!gl.isFramebuffer(this.fbo))
	{
		alert("Could not create shadow map frame buffer");
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	
	//Create shadow map shader
	
	var vs_source = 
'attribute vec4 pos; \
varying vec2 tc; \
void main(void) \
{ \
	tc = 0.5 * pos.xy + vec2(0.5, 0.5); \
	gl_Position = pos; \
}',

		fs_source =
'precision mediump float; \n\
uniform sampler2D tex;  \n\
varying vec2 tc; \n\
void main(void) \n\
{ \n\
	vec4 result = vec4(0.0,0.0,0.0,0.0); \n\
	for(int i=-'+radius+'; i<='+radius+'; ++i) \n\
	{  \n\
		result += texture2D(tex, tc.yx + vec2(float(2*i)+0.5,0)/'+this.width+'.0); \n\
	} \n\
	gl_FragColor = result / ' + (2*radius+1)+'.0; \n\
}';
	
	this.blur_shader	= Loader.get_program_from_source(gl, fs_source, vs_source);
	this.blur_shader.pos_attr = gl.getAttribLocation(this.blur_shader, "pos");
	this.blur_shader.tex = gl.getUniformLocation(this.blur_shader, "tex");
}

ShadowMap.prototype.calc_light_matrix = function()
{
	var pose = Player.view_matrix(),
		P = hgmult(m4inv(pose), [0, 0, -this.z_center]),
	
		basis = Sky.get_basis(),
		n = basis[0], u = basis[1], v = basis[2],
		
		aspect = 0.25 + 0.8 * Math.abs(n[1]),
		
		z_max = 512.0, z_min = -512.0,
		
		w = 1.0 / this.side,
		w1 = w,
		w2 = w / aspect,
		
		cx = Math.floor(dot(P, u) * w1 * 128.0) / 128.0,
		cy = Math.floor(dot(P, v) * w2 * (aspect*aspect)  * 128.0) / 128.0,
		z_scale = -1.0 / (z_max - z_min);
	
	return [
		w1*u[0],	w2*v[0],	n[0]*z_scale,	0,
		w1*u[1],	w2*v[1],	n[1]*z_scale,	0,
		w1*u[2],	w2*v[2],	n[2]*z_scale,	0,
		-cx,	-cy,	-z_max*z_scale,	1];
}


ShadowMap.prototype.begin = function()
{

	var gl = Game.gl;

	//Calculate light matrix
	this.light_matrix = this.calc_light_matrix();

	gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
	gl.viewport(0, 0, this.width, this.height);
	

	gl.clear(gl.DEPTH_BUFFER_BIT);
	
	//Draw a full quad to the background
	Shadows.init_map();
	
	gl.useProgram(Shadows.shadow_shader);
	gl.uniformMatrix4fv(Shadows.shadow_shader.proj_mat, false, this.light_matrix);
	
	gl.disable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	
	gl.disable(gl.CULL_FACE);
	
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.1, 6.0);
	
	gl.enableVertexAttribArray(Shadows.shadow_shader.pos_attr);
	gl.enableVertexAttribArray(Shadows.shadow_shader.norm_attr);
	
	//Apply bias
	var i;
	for(i=0; i<4; ++i)
	{
		this.light_matrix[4*i]   *= 0.5;
		this.light_matrix[4*i+1] *= 0.5;
	}
	this.light_matrix[12] += 0.5;
	this.light_matrix[13] += 0.5;
}

ShadowMap.prototype.end = function()
{
	var gl = Game.gl;

	//gl.disableVertexAttribArray(Shadows.shadow_shader.pos_attr);	
	gl.disable(gl.POLYGON_OFFSET_FILL);
	
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.DEPTH_TEST);
	gl.enable(gl.TEXTURE_2D);
	
	if(this.radius > 0)
	{
		//Need to reset texture parameters since these get cleared when we render (stupid)
		gl.bindFramebuffer(gl.FRAMEBUFFER, Shadows.blur_fbo);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.shadow_tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	
		//Do first blur pass
		gl.useProgram(this.blur_shader);
		gl.enableVertexAttribArray(this.blur_shader.pos_attr);
		gl.uniform1i(this.blur_shader.tex, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, Shadows.quad_vb);
		gl.vertexAttribPointer(this.blur_shader.pos_attr, 4, gl.FLOAT, false, 0, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Shadows.quad_ib);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	
		//Do second blur pass
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
		gl.bindTexture(gl.TEXTURE_2D, Shadows.blur_tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}
		
	//Unbind fbo
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, this.shadow_tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}

ShadowMap.prototype.draw_debug = function()
{
	Debug.draw_tex(this.shadow_tex);
}
