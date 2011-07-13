"use strict";

//Preloads game data in the background
var Loader = 
{
	shaders :
	[
		"shaders/simple.vs",
		"shaders/simple.fs",
		"shaders/shadow.fs",
		"shaders/shadow.vs",
		"shaders/shadow_init.fs",
		"shaders/shadow_init.vs",
		"shaders/simple_color.vs",
		"shaders/simple_color.fs"
	],
	
	images :
	[
	],
	
	data : {},
	
	num_loaded : 0,
	max_loaded : 0,
	pct_loaded : 0,
	finished : false,
	failed : false,

	start : function(prog_callback, err_callback)
	{
		Loader.max_loaded = Loader.shaders.length + Loader.images.length;

		Loader.onProgress = function(url)
		{
			++Loader.num_loaded;
			Loader.pct_loaded = Loader.num_loaded / Loader.max_loaded;
			Loader.finished = Loader.num_loaded >= Loader.max_loaded;
			prog_callback(url);
		}

		Loader.onError = function(data)
		{
			Loader.failed = true;
			err_callback("Error loading file: " + data);
		}

		for(var i=0; i<Loader.shaders.length; i++)
		{
			Loader.fetch_shader(Loader.shaders[i]);
		}	
	
		for(var i=0; i<Loader.images.length; i++)
		{
			Loader.fetch_image(Loader.images[i]);
		}
	},

	fetch_shader : function(url)
	{
		var XHR = new XMLHttpRequest();
		XHR.open("GET", url, true);
	
		XHR.onreadystatechange = function()
		{
			if(XHR.readyState == 4)
			{
				if(XHR.status == 200 || XHR.status == 304 || XHR.status == 0)
				{
					Loader.data[url] = XHR.responseText;
					Loader.onProgress(url);
				}
				else
				{
					Loader.onError(url);
				}
			}
		}
	
		XHR.send(null);
	},

	fetch_image : function(url)
	{
		var img = new Image();
		img.onload = function()
		{
			Loader.data[url] = img;
			Loader.onProgress(url);
		}
		img.src = url;
	},
	
	get_shader: function(url)
	{
		var gl = Game.gl, script = Loader.data[url];
		if(!script)
			return ["Fail", "Error requesting document"];

		//Extract file extension
		var ext = url.split('.');
		ext = ext[ext.length-1];

		var shader;
		if(ext == 'vs')
		{
			shader = gl.createShader(gl.VERTEX_SHADER);
		}
		else if(ext == 'fs')
		{
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		}
		else
		{
			return ["Fail", "Invalid file extension"];
		}

		gl.shaderSource(shader, script);
		gl.compileShader(shader);

		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		{
			return ["Fail", gl.getShaderInfoLog(shader)];
		}
		return ["Ok", shader];
	},

	get_program: function(fs_url, vs_url)
	{
		//Load chunk vertex/frag shaders
		var gl = Game.gl, res = Loader.get_shader(fs_url);
		if(res[0] != "Ok")
			return ["Fail", "Fragment shader " + fs_url + " compile error:\n" + res[1]];
		var fs = res[1];

		res = Loader.get_shader(vs_url);
		if(res[0] != "Ok")
			return ["Fail", "Vertex shader " + vs_url + " compile error:\n" + res[1]];
		var vs = res[1];

		//Create the chunk shader
		var gl = Game.gl, prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);

		if(!gl.getProgramParameter(prog, gl.LINK_STATUS))
		{
			return ["Fail", "Shader link error (" + fs_url +", " + vs_url + "): Could not link shaders"];
		}

		return ["Ok", fs, vs, prog];
	},

	get_program_from_source: function(fs_source, vs_source)
	{
		var gl = Game.gl, vshader, fshader, prog;

		vshader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vshader, vs_source);
		gl.compileShader(vshader);
	
		fshader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fshader, fs_source);
		gl.compileShader(fshader);
	
		prog = gl.createProgram();
		gl.attachShader(prog, vshader);
		gl.attachShader(prog, fshader);
		gl.linkProgram(prog);

		return prog;
	},

	get_texture: function(url)
	{
		var gl = Game.gl, img = Loader.data[url];
		if(!img)
		{
			return ["Fail", "Could not load image " + url];
		}

		var gl = Game.gl, 
			tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		return ["Ok", tex];	
	}
}
