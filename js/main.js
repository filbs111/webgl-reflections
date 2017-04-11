var shaderProgramColored;
var shaderProgramPosColor;
function initShaders(){
	shaderProgramColored = loadShader( "shader-simple-vs", "shader-simple-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uColor"]
	});
	console.log("loaded 1st shader");
	shaderProgramPosColor = loadShader( "shader-poscolor-vs", "shader-poscolor-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uColor"]
	});
}

var sphereBuffers={};
var cubeBuffers={};
var octoFrameBuffers={};
var teapotBuffers={};
var sshipBuffers={};
function initBuffers(){
	
	var octoFrameBlenderObject = loadBlenderExport(octoFrameData.meshes[0]);
	var teapotObject = loadBlenderExport(teapotData);	//isn't actually a blender export - just a obj json

	loadBufferData(sphereBuffers, makeSphereData(61,32,1));
	loadBufferData(cubeBuffers, levelCubeData);
	loadBufferData(octoFrameBuffers, octoFrameBlenderObject);
	loadBufferData(teapotBuffers, teapotObject);

	function bufferArrayData(buffer, arr, size){
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
		buffer.itemSize = size;
		buffer.numItems = arr.length / size;
		console.log("buffered. numitems: " + buffer.numItems);
	}
	
	function loadBufferData(bufferObj, sourceData){
		bufferObj.vertexPositionBuffer = gl.createBuffer();
		bufferArrayData(bufferObj.vertexPositionBuffer, sourceData.vertices, 3);
		if (sourceData.uvcoords){
			bufferObj.vertexTextureCoordBuffer= gl.createBuffer();
			bufferArrayData(bufferObj.vertexTextureCoordBuffer, sourceData.uvcoords, 2);
		}
		
		//bufferObj.vertexNormalBuffer= gl.createBuffer();
		//bufferArrayData(bufferObj.vertexNormalBuffer, sourceData.normals, 3);

		bufferObj.vertexIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObj.vertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sourceData.indices), gl.STATIC_DRAW);
		bufferObj.vertexIndexBuffer.itemSize = 3;
		bufferObj.vertexIndexBuffer.numItems = sourceData.indices.length;
	}
	
	function loadBlenderExport(meshToLoad){
		return {
			vertices: meshToLoad.vertices,
			//normals: meshToLoad.normals,
			//uvcoords: meshToLoad.texturecoords?meshToLoad.texturecoords[0]:false,
			indices: [].concat.apply([],meshToLoad.faces)	//trick from https://www.youtube.com/watch?v=sM9n73-HiNA t~ 28:30
		}	
	};
}

function drawScene(frameTime){
	resizecanvas();

	requestAnimationFrame(drawScene);
	stats.end();
	stats.begin();
	
	//TODO move pMatrix etc to only recalc on screen resize
	mat4.perspective(60, gl.viewportWidth/ gl.viewportHeight, 0.1, 10, pMatrix);
	
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	drawWorldScene(frameTime, 0);
}


function drawWorldScene(frameTime) {		
		//console.log("drawing...");
		var activeProg = shaderProgramPosColor;
	
		mat4.set(playerMatrix, playerCamera);	//necessary to have playerCam and playerMatrix???
		mat4.set(playerCamera, mvMatrix)
		
		//draw level cube
		gl.useProgram(activeProg);
		gl.uniform4fv(activeProg.uniforms.uColor, [1.0, 0.4, 0.4, 1.0]);	//RED
		
		switch (guiParams.shape){
			case "sphere":
				drawObjectFromBuffers(sphereBuffers, activeProg);
			break;
			case "teapot":
				drawObjectFromBuffers(teapotBuffers, activeProg);
			break;
			case "octoframe":
				drawObjectFromBuffers(octoFrameBuffers, activeProg);
			break;
		}

		//drawObjectFromBuffers(cubeBuffers, activeProg);
		
		//draw other objects in scene
		gl.uniform4fv(activeProg.uniforms.uColor, [1.0, 1.0, 0.4, 1.0]);	//WHITE

		mat4.translate(mvMatrix, [2, 0, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//right
		mat4.translate(mvMatrix, [-4, 0, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//left
		mat4.translate(mvMatrix, [2, 2, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//top
		mat4.translate(mvMatrix, [0, -4, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//bottom
		mat4.translate(mvMatrix, [0, 2, 2]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//front
		mat4.translate(mvMatrix, [0, 0, -4]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//back
}
function drawObjectFromBuffers(bufferObj, shaderProg){
	prepBuffersForDrawing(bufferObj, shaderProg);
	drawObjectFromPreppedBuffers(bufferObj, shaderProg);
}
function prepBuffersForDrawing(bufferObj, shaderProg){
	gl.enable(gl.CULL_FACE);
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProg.attributes.aVertexPosition, bufferObj.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	if (bufferObj.vertexNormalBuffer){
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexNormalBuffer);
		gl.vertexAttribPointer(shaderProg.attributes.aVertexNormal, bufferObj.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
	}
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObj.vertexIndexBuffer);
	
	if (bufferObj.vertexTextureCoordBuffer){
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexTextureCoordBuffer);
		gl.vertexAttribPointer(shaderProg.attributes.aTextureCoord, bufferObj.vertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(shaderProg.uniforms.uSampler, 0);
	}
	gl.uniformMatrix4fv(shaderProg.uniforms.uPMatrix, false, pMatrix);
}
function drawObjectFromPreppedBuffers(bufferObj, shaderProg){
	gl.uniformMatrix4fv(shaderProg.uniforms.uMVMatrix, false, mvMatrix);
	gl.drawElements(gl.TRIANGLES, bufferObj.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}


var mvMatrix = mat4.create();
var pMatrix = mat4.create();
var playerMatrix = mat4.create();
var playerCamera = mat4.create();

function setMatrixUniforms(shaderProgram) {
    gl.uniformMatrix4fv(shaderProgram.uniforms.uPMatrix, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.uniforms.uMVMatrix, false, mvMatrix);
}

function setupScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.identity(playerMatrix);
	mat4.translate(playerMatrix, [0,0,-4]);
}


var texture;
function initTexture() {
	texture = gl.createTexture();
	texture.image = new Image();
	texture.image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	texture.image.src = "img/0033.jpg";
}


var guiParams={
	shape: 'sphere',
};

var stats;

function init(){

	stats = new Stats();
	stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild( stats.dom );

	var gui = new dat.GUI();
	var mydropdown = gui.add(guiParams, 'shape', ['sphere', 'teapot', 'octoframe']).onChange(function(v){console.log("changed " + v);});
		//examples: https://github.com/dataarts/dat.gui/blob/master/example.html
		
	
	canvas = document.getElementById("mycanvas");

	initGL();
	initShaders();
	initTexture();
	initBuffers();
  
	gl.clearColor(0.0, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	
	setupScene();
		
	requestAnimationFrame(drawScene);
}