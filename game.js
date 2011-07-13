"use strict";

var Game = 
{
	running : false,

	//Camera parameters
	znear : 1.0,
	zfar  : 512.0,
	fov   : Math.PI / 4.0,
		
	//Our local event loops
	tick_interval   : null,
	draw_interval   : null,
	shadow_interval : null,
	
	//Create a tetmesh
	ctcomplex : null,
	ib : null,
	vb : null,
	prim_count : 0,
	testprog : null,
	
	//Preload resources for the game
	preload : function()
	{
		//Initialize WebGL
		Game.canvas = document.getElementById("gameCanvas");
		var gl;
		try
		{
			gl = Game.canvas.getContext("experimental-webgl");
		}
		catch(e)
		{
			App.crash('Browser does not support WebGL');
			return false;
		}
		if(!gl)
		{
			App.crash('Invalid WebGL object');
			return false;
		}
		Game.gl = gl;

		//Get extensions
		Game.EXT_FPTex = gl.getExtension("OES_texture_float");
		Game.EXT_StdDeriv = gl.getExtension("OES_standard_derivatives");
		Game.EXT_VertexArray = gl.getExtension("OES_vertex_array_object");	
		if(!Game.EXT_FPTex)
		{
			App.crash("WebGL implementation does not support floating point textures");
			return false;
		}
		
		return true;
	},
	
	//Start game
	init : function()
	{
		//Turn on display
		document.getElementById('gamePane').style.display = 'block';
	
		//Initialize screen
		window.onresize = function(event)
		{
			if(Game.running)
			{
				Game.resize();
			}
		}
		Game.resize();
	
		//Start running the game
		Game.running 		 = true;
		Game.tick_interval 	 = setInterval(Game.tick, GAME_TICK_RATE);
		Game.draw_interval 	 = setInterval(Game.draw, GAME_DRAW_RATE);
		Game.shadow_interval = setInterval(Game.update_shadows, GAME_SHADOW_RATE);
		

		//Initialize debug system
		var res = Debug.init();
		if(res != "Ok")
		{
			App.crash(res);
			return;
		}
		
		//Initialize shadows
		res = Shadows.init();
		if(res != "Ok")
		{
			App.crash(res);
			return;
		}
		
		//Initialize player
		Player.init();
		
		
		var vfmt = new VertexFormat();
		vfmt.add_attribute("pos", 3);
		vfmt.add_attribute("color", 3);
		
		Game.ctcomplex = new CellTupleComplex(3, vfmt);
		
		var v = [
			Game.ctcomplex.add_vert([0, 0, 0, 0, 0, 0]),
			Game.ctcomplex.add_vert([1, 0, 0, 1, 0, 0]),
			Game.ctcomplex.add_vert([0, 1, 0, 0, 1, 0]),
			Game.ctcomplex.add_vert([1, 1, 0, 1, 0, 0]),
			Game.ctcomplex.add_vert([0, 0, 1, 0, 0, 1]),
			Game.ctcomplex.add_vert([1, 0, 1, 1, 0, 1]),
			Game.ctcomplex.add_vert([0, 1, 1, 0, 1, 1]),
			Game.ctcomplex.add_vert([1, 1, 1, 1, 0, 1]) ];
		
		Game.ctcomplex.add_cell([v[0], v[1], v[2], v[3]]);
		Game.ctcomplex.add_cell([v[4], v[5], v[6], v[7]]);
		
		Game.ib = Game.gl.createBuffer();
		Game.vb = Game.gl.createBuffer();
		Game.init_buffers();
		
		var tprog = Loader.get_program("shaders/simple_color.fs", "shaders/simple_color.vs");
		
		if(tprog[0] != "Ok")
		{
			App.crash(tprog[1]);
			return;		
		}
		
		Game.testprog = tprog[3];
	},

	//Stop all intervals
	shutdown : function()
	{
		document.getElementById('gamePane').style.display = 'none';
	
		Game.running = false;
		if(Game.tick_interval)		clearInterval(Game.tick_interval);
		if(Game.draw_interval)		clearInterval(Game.draw_interval);
		if(Game.shadow_interval)	clearInterval(Game.shadow_interval);
		
		window.onresize = null;
		
		Player.shutdown();		
		Shadows.shutdown();
		Debug.shutdown();
	},

	//Resize function
	resize : function()
	{
		Game.canvas.width = window.innerWidth;
		Game.canvas.height = window.innerHeight;
	
		Game.width = Game.canvas.width;
		Game.height = Game.canvas.height;
	
		//Set the dimensions for the UI stuff
		var appPanel = document.getElementById("gamePane");
		appPanel.width = Game.canvas.width;
		appPanel.height = Game.canvas.height;
	},
	
	//Computes the projection matrix for the game
	proj_matrix : function(w, h, fov, zfar, znear)
	{
		var aspect = w / h;
	
		var ymax = znear * Math.tan(0.5 * fov);
		var ymin = -ymax;
		var xmin = ymin * aspect;
		var xmax = ymax * aspect;
	
		var X = 2.0 * znear / (xmax - xmin);
		var Y = 2.0 * znear / (ymax - ymin);
		var A = (xmax + xmin) / (xmax - xmin);
		var B = (ymax + ymin) / (ymax - ymin);
		var C = -(zfar + znear) / (zfar - znear);
		var D = -2.0 * zfar*znear / (zfar - znear);
	
		return [X, 0, 0, 0,
				 0, Y, 0, 0,
			 	 A, B, C, -1,
				 0, 0, D, 0];
	
	},

	//Returns the camera matrix for the game
	camera_matrix : function(width, height, fov, zfar, znear)
	{
		if(!width)
		{
			width = Game.width;
			height = Game.height;
			fov = Game.fov;
		}
	
		if(!zfar)
		{
			zfar = Game.zfar;
			znear = Game.znear;
		}
	
		return mmult(Game.proj_matrix(width, height, fov, zfar, znear), Player.view_matrix());
	},

	//Tick the game
	tick : function()
	{
		//Update player input
		Player.tick();
		
	},
	
	init_buffers : function()
	{
		var gl = Game.gl;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, Game.vb);
		gl.bufferData(gl.ARRAY_BUFFER, Game.ctcomplex.get_vert_buffer(), gl.DYNAMIC_DRAW);
		
		var pattr = gl.getAttribLocation(Game.testprog, "pos"),
			cattr = gl.getAttribLocation(Game.testprog, "color");
		
		gl.enableVertexAttribArray(pattr);
		gl.vertexAttribPointer(pattr, 3, gl.FLOAT, false, 4*6, 0);
		
		gl.enableVertexAttribArray(cattr);
		gl.vertexAttribPointer(cattr, 3, gl.FLOAT, false, 4*6, 4*3);

		var tmp = Game.ctcomplex.get_index_buffer(2, true);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Game.ib);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tmp[0], gl.DYNAMIC_DRAW);
		Game.prim_count = tmp[1];
	},

	//Draw the game
	draw : function()
	{
		var gl = Game.gl;
	
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);	
		gl.viewport(0, 0, Game.width, Game.height);
		gl.clearColor(0.3, 0.5, 0.9, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	
		gl.enable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		
		gl.useProgram(Game.testprog);
		gl.uniformMatrix4fv(
			gl.getUniformLocation(Game.testprog, "proj"),
			false,
			Game.camera_matrix());
			
		gl.drawElements(gl.TRIANGLES, Game.prim_count, gl.UNSIGNED_SHORT, 0);
	},
	
	//Update the shadow maps
	update_shadows : function()
	{
	/*
		for(var i=0; i<Shadows.shadow_maps.length; ++i)
		{
			Shadows.shadow_maps[i].begin();
			Shadows.shadow_maps[i].end();
		}
	*/
	}
};

