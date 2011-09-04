"use strict";

var Debug = {
	simple_fs : null,
	simple_vs : null,
	simple_shader : null,
	
	debug_vb : null,
	debug_tb : null,
	debug_ib : null,

	init : function()
	{
		//Create debug shader
		var gl = Game.gl,
			res = Loader.get_program("shaders/simple.fs", "shaders/simple.vs");
		
		if(res[0] != "Ok")
		{
			return res[1];
		}
	
		Debug.simple_fs 	 = res[1];
		Debug.simple_vs 	 = res[2];
		Debug.simple_shader = res[3];
	
		Debug.simple_shader.pos_attr = gl.getAttribLocation(Debug.simple_shader, "pos");
		if(Debug.simple_shader.pos_attr == null)
			return "Could not locate position attribute";

		Debug.simple_shader.tc_attr = gl.getAttribLocation(Debug.simple_shader, "texCoord");
		if(Debug.simple_shader.tc_attr == null)
			return "Could not locate tex coord attribute";

		Debug.simple_shader.tex_samp = gl.getUniformLocation(Debug.simple_shader, "tex");
		if(Debug.simple_shader.tex_samp == null)
			return "Could not locate sampler uniform";
		
		//Create debug buffers
		var debug_verts = new Float32Array([
			0, 0, 0,
			0, 1, 0,
			1, 1, 0,
			1, 0, 0]);

		var debug_tc = new Float32Array([
			0, 0,
			0, 1,
			1, 1,
			1, 0] );
		
		var debug_ind = new Uint16Array([0, 1, 2, 0, 2, 3]);
	
		Debug.debug_vb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Debug.debug_vb);
		gl.bufferData(gl.ARRAY_BUFFER, debug_verts, gl.STATIC_DRAW);
	
		Debug.debug_tb = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Debug.debug_tb);
		gl.bufferData(gl.ARRAY_BUFFER, debug_tc, gl.STATIC_DRAW);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
		Debug.debug_ib = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Debug.debug_ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, debug_ind, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		
		return "Ok";
	},

	shutdown : function()
	{
	},
	
	draw_tex : function(texname)
	{
		var gl = Game.gl;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.TEXTURE_2D);
	
		gl.useProgram(Debug.simple_shader);
		gl.enableVertexAttribArray(Debug.simple_shader.pos_attr);
		gl.enableVertexAttribArray(Debug.simple_shader.tc_attr);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texname);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.uniform1i(Debug.simple_shader.tex_samp, 0);
	
		gl.bindBuffer(gl.ARRAY_BUFFER, Debug.debug_vb);
		gl.vertexAttribPointer(Debug.simple_shader.pos_attr, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, Debug.debug_tb);
		gl.vertexAttribPointer(Debug.simple_shader.tc_attr, 2, gl.FLOAT, false, 0, 0);
	
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Debug.debug_ib);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}
};

