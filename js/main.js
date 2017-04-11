var shaderProgramColored;
var shaderProgramPosColor;
var shaderProgramCubemapProj;
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
	shaderProgramCubemapProj = loadShader( "shader-cubemap-vs", "shader-cubemap-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix"]
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
	
	
	//render cubemap views
	var rotsY=[
				0.5*Math.PI,-0.5*Math.PI,0,0,0,Math.PI
			];
	var rotsX=[
				0,0,0.5*Math.PI,-0.5*Math.PI,0,0
			];
	gl.clearColor(1.0, 0.1, 0.1, 1.0);
	for (var ii=0;ii<6;ii++){
	//for (var ii=0;ii<1;ii++){
		mat4.perspective( 90.0, 1.0, 0.1, 100, pMatrix);	
		var framebuffer = cubemapFramebuffer[ii];
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.viewport(0, 0, framebuffer.width, framebuffer.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		//mat4.set(playerMatrix, playerCamera);
		mat4.identity(playerCamera);
		mat4.rotateY(playerCamera, rotsY[ii]);
		mat4.rotateX(playerCamera, rotsX[ii]);
		
		//mat4.multiply(playerCamera, playerMatrix, playerCamera);
		drawWorldScene(frameTime, false);
	}
	
	
	mat4.perspective(60, gl.viewportWidth/ gl.viewportHeight, 0.1, 10, pMatrix);
	
	//setup for drawing to screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	
	mat4.set(playerMatrix, playerCamera);	//necessary to have playerCam and playerMatrix???
	gl.clearColor(0.0, 0.1, 0.1, 1.0);

	drawWorldScene(frameTime, true);
}


function drawWorldScene(frameTime, drawReflector) {		
		//console.log("drawing...");
		mat4.set(playerCamera, mvMatrix)
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		//use cubemap for centre object
		if (drawReflector){
			
			var activeProg = shaderProgramCubemapProj;
			gl.useProgram(activeProg);
					
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
			gl.uniform1i(activeProg.uniforms.uSampler, 0);
					
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
		}
		
		//draw other objects in scene

		activeProg = shaderProgramPosColor;
		gl.useProgram(activeProg);
		
		//TODO disable texture??
		
		gl.uniform4fv(activeProg.uniforms.uColor, [1.0, 1.0, 1.0, 1.0]);	//WHITE

		mat4.translate(mvMatrix, [2, 0, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//right
		mat4.translate(mvMatrix, [-4, 0, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//left
		mat4.translate(mvMatrix, [2, 2, 0]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//top
		mat4.translate(mvMatrix, [0, -4, 0]);
		drawObjectFromBuffers(sphereBuffers, activeProg);	//bottom
		mat4.translate(mvMatrix, [0, 2, 2]);
		drawObjectFromBuffers(octoFrameBuffers, activeProg);	//front
		mat4.translate(mvMatrix, [0, 0, -4]);
		drawObjectFromBuffers(teapotBuffers, activeProg);	//back
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

var cubemapFramebuffer;
var cubemapTexture;
var cubemapSize = 1024;
//cube map code from http://www.humus.name/cubemapviewer.js (slightly modified)
function initCubemapFramebuffer()
{
	cubemapFramebuffer = [];

	cubemapTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	var faces = [gl.TEXTURE_CUBE_MAP_POSITIVE_X,
				 gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
				 gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
				 gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
				 gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
				 gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
	for (var i = 0; i < faces.length; i++)
	{
		var face = faces[i];
		
		var framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		framebuffer.width = cubemapSize;
		framebuffer.height = cubemapSize;
		cubemapFramebuffer[i]=framebuffer;
		
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);	//already bound so can lose probably
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		//gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texImage2D(face, 0, gl.RGBA, cubemapSize, cubemapSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		var renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, cubemapSize, cubemapSize);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, face, cubemapTexture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	}
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);	//this gets rid of errors being logged to console. 
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function setupScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.identity(playerMatrix);
	movePlayerFwd(-4);
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
		
	
	window.addEventListener("keydown",function(evt){
		console.log("key pressed : " + evt.keyCode);
		var willPreventDefault=true;
		switch (evt.keyCode){
			case 87:				//W
				movePlayerFwd(0.1);
				break;
			case 83:				//S
				movePlayerFwd(-0.1);
				break;
			case 65:				//A
				movePlayerLeft(0.1);
				break;
			case 68:				//D
				movePlayerLeft(-0.1);
				break;
			case 39:
				turnPlayer(0.02);
				break;
			case 37:
				turnPlayer(-0.02);
				break;
			case 81:				//Q
				rollPlayer(-0.02);	
				break;
			case 69:				//E
				rollPlayer(0.02);	
				break;
			case 32:				//spacebar
				movePlayerUp(-0.1);
				break;
			case 17:				//ctrl
				movePlayerUp(0.1);
				break;
			default:
				willPreventDefault=false;
				break;
			case 38:
				pitchPlayer(-0.02);		//up arrow
				break;
			case 40:
				pitchPlayer(0.02);
				break;
		}
		if (willPreventDefault){evt.preventDefault()};
	});
	
	
	canvas = document.getElementById("mycanvas");

	initGL();
	initShaders();
	initTexture();
	initCubemapFramebuffer();
	initBuffers();
  
	gl.clearColor(0.0, 0.1, 0.1, 1.0);
    gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	
	setupScene();
		
	requestAnimationFrame(drawScene);
}




var playerPosition = [0,0,0];
function movePlayerFwd(amount){	
	playerPosition[0] += amount*playerMatrix[2];
	playerPosition[1] += amount*playerMatrix[6];
	playerPosition[2] += amount*playerMatrix[10];
	setPlayerTranslation(playerPosition);
}
function movePlayerUp(amount){	
	playerPosition[0] += amount*playerMatrix[1];
	playerPosition[1] += amount*playerMatrix[5];
	playerPosition[2] += amount*playerMatrix[9];
	setPlayerTranslation(playerPosition);
}
function movePlayerLeft(amount){	
	playerPosition[0] += amount*playerMatrix[0];
	playerPosition[1] += amount*playerMatrix[4];
	playerPosition[2] += amount*playerMatrix[8];
	setPlayerTranslation(playerPosition);
}
function movePlayer(vec){	//[left,up,forward]
	playerPosition[0] += vec[0]*playerMatrix[0] + vec[1]*playerMatrix[1] + vec[2]*playerMatrix[2];
	playerPosition[1] += vec[0]*playerMatrix[4] + vec[1]*playerMatrix[5] + vec[2]*playerMatrix[6];
	playerPosition[2] += vec[0]*playerMatrix[8] + vec[1]*playerMatrix[9] + vec[2]*playerMatrix[10];
	setPlayerTranslation(playerPosition);
	constrainPlayerPositionToBox();
}
function turnPlayer(amount){
	setPlayerTranslation([0,0,0]);

	var rotMat=mat4.identity();
	mat4.rotateY(rotMat, amount);
	mat4.multiply(rotMat, playerMatrix, playerMatrix);
	
	setPlayerTranslation(playerPosition);
}
function rollPlayer(amount){
	setPlayerTranslation([0,0,0]);	
	
	var rotMat=mat4.identity();
	mat4.rotateZ(rotMat, amount);
	mat4.multiply(rotMat, playerMatrix, playerMatrix);

	setPlayerTranslation(playerPosition);
}
function pitchPlayer(amount){
	setPlayerTranslation([0,0,0]);	
	
	var rotMat=mat4.identity();
	mat4.rotateX(rotMat, amount);
	mat4.multiply(rotMat, playerMatrix, playerMatrix);

	setPlayerTranslation(playerPosition);
}
function rotatePlayer(vec){
	setPlayerTranslation([0,0,0]);
	var rotationMag = Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1] + vec[2]*vec[2]);
	var rotMat=mat4.identity();
	mat4.rotate(rotMat, rotationMag, [vec[0]/rotationMag, vec[1]/rotationMag, vec[2]/rotationMag]);	//TODO find or make method taking vector instead of separate unit axis/angle
	mat4.multiply(rotMat, playerMatrix, playerMatrix);
	setPlayerTranslation(playerPosition);
}

function setPlayerTranslation(posArray){
	playerMatrix[12]=0;	//zero translation components
	playerMatrix[13]=0;
	playerMatrix[14]=0;
	mat4.translate(playerMatrix, posArray);
}
