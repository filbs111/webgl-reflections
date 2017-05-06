var shaderProgramColored;
var shaderProgramPosColor;
var shaderProgramSimpleCubemap;
var reflProgs={};
var portalProgs={};
var portalActive=false;
var playerObjScale=0.01;
var playerObjScaleVec=[playerObjScale,playerObjScale,playerObjScale];

function initShaders(){
	shaderProgramColored = loadShader( "shader-simple-vs", "shader-simple-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uColor"]
	});
	shaderProgramPosColor = loadShader( "shader-poscolor-vs", "shader-poscolor-fs",{
		attributes:["aVertexPosition", "aVertexNormal"],
		uniforms:["uPMatrix","uMVMatrix","uColor"]
	});
	shaderProgramPosColorWDiscard = loadShader( "shader-poscolorwdiscard-vs", "shader-poscolorwdiscard-fs",{
		attributes:["aVertexPosition", "aVertexNormal"],
		uniforms:["uPMatrix","uMVMatrix","uColor","uSpherePos"]
	});
	reflProgs.projection = loadShader( "shader-cubemap-vs", "shader-cubemap-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uCentrePos"]
	});
	reflProgs.distant = loadShader( "shader-reflect-vs", "shader-cubemap-fs",{
		attributes:["aVertexPosition", "aVertexNormal"],
		uniforms:["uPMatrix","uMVMatrix","uEyePos"]
	});
	reflProgs.vertprojection = loadShader( "shader-reflect-vertproj-vs", "shader-cubemapportal-vertproj-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uCentrePos"]
	});
	
	portalProgs.projection = loadShader( "shader-cubemap-vs", "shader-cubemapportal-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uCentrePos"]
	});
	portalProgs.distant = loadShader( "shader-reflect-vs", "shader-cubemapportal-fs",{
		attributes:["aVertexPosition", "aVertexNormal"],
		uniforms:["uPMatrix","uMVMatrix","uEyePos"]
	});
	portalProgs.vertprojection = loadShader( "shader-cubemap-vertproj-vs", "shader-cubemapportal-vertproj-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uCentrePos"]
	});
	
	shaderProgramSimpleCubemap = loadShader( "shader-simplecubemap-vs", "shader-simplecubemap-fs",{
		attributes:["aVertexPosition"],
		uniforms:["uPMatrix","uMVMatrix","uColor"]
	});
}

var ballBuffers={};
var sphereBuffers={};
var cubeBuffers={};
var cubeFrameBuffers={};
var octoFrameBuffers={};
var teapotBuffers={};
var sshipBuffers={};
function initBuffers(){
	
	var cubeFrameBlenderObject = loadBlenderExport(cubeFrameData.meshes[0]);
	var octoFrameBlenderObject = loadBlenderExport(octoFrameData.meshes[0]);
	var teapotObject = loadBlenderExport(teapotData);	//isn't actually a blender export - just a obj json

	loadBufferData(ballBuffers, makeSphereData(99,200,1));	//todo use subdivided normalized box instead of sphere 
	loadBufferData(sphereBuffers, makeSphereData(19,40,1));
	loadBufferData(cubeBuffers, levelCubeData);
	loadBufferData(cubeFrameBuffers, cubeFrameBlenderObject);
	loadBufferData(octoFrameBuffers, octoFrameBlenderObject);
	loadBufferData(teapotBuffers, teapotObject);

	sphereBuffers.cullRad = 1;
	cubeFrameBuffers.cullRad = Math.sqrt(3);	//radius of bounding sphere
	octoFrameBuffers.cullRad = 1;
	teapotBuffers.cullRad = 2;	//guess
	
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
		
		bufferObj.vertexNormalBuffer= gl.createBuffer();
		bufferArrayData(bufferObj.vertexNormalBuffer, sourceData.normals, 3);

		bufferObj.vertexIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObj.vertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sourceData.indices), gl.STATIC_DRAW);
		bufferObj.vertexIndexBuffer.itemSize = 3;
		bufferObj.vertexIndexBuffer.numItems = sourceData.indices.length;
	}
	
	function loadBlenderExport(meshToLoad){
		return {
			vertices: meshToLoad.vertices,
			normals: meshToLoad.normals,
			//uvcoords: meshToLoad.texturecoords?meshToLoad.texturecoords[0]:false,
			indices: [].concat.apply([],meshToLoad.faces)	//trick from https://www.youtube.com/watch?v=sM9n73-HiNA t~ 28:30
		}	
	};
}

function drawScene(frameTime){
	resizecanvas();

	if (guiParams.smoothMovement){iterateMechanics();}	//TODO make movement speed independent of framerate
	movePlayerOutsideSphere();
	
	requestAnimationFrame(drawScene);
	stats.end();
	stats.begin();
	
	
	portalActive = (guiParams.portal);
	
	//render cubemap views
	switch (guiParams.projectionPoint){
		case "centre":
			offsetPointSigned=offsetPointZero;
			offsetPointUnsigned=offsetPointZero;
		break;
		case "offset":
			offsetPointSigned= portalActive? offsetPointNegative:offsetPointStored;	
			offsetPointUnsigned=offsetPointStored;
		break;
	}
	
	var rotsY=[
				0.5*Math.PI,-0.5*Math.PI,0,0,0,Math.PI
			];
	var rotsX=[
				0,0,0.5*Math.PI,-0.5*Math.PI,0,0
			];
	
	worldInBall = portalActive ? otherWorld : currentWorld;
	
	mat4.perspective(90, gl.viewportWidth/ gl.viewportHeight, 0.00025, 100, finalPMatrix);
	
	var frustumCullCmap = guiParams.culling? generateCullFunc(cmapPMatrix): noCull;	//TODO don't redo this if pMatrix unchanged
	var frustumCullFinal = guiParams.culling? generateCullFunc(finalPMatrix): noCull;		
	
	if (guiParams.renderCubemap && frustumCullFinal(playerMatrix,1)){
		pMatrix = cmapPMatrix;
		for (var ii=0;ii<6;ii++){
		//for (var ii=0;ii<1;ii++){
			var framebuffer = cubemapFramebuffer[ii];
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, framebuffer.width, framebuffer.height);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			//mat4.set(playerMatrix, playerCamera);
			mat4.identity(playerCamera);
					
			mat4.rotateY(playerCamera, rotsY[ii]);
			mat4.rotateX(playerCamera, rotsX[ii]);
			mat4.translate(playerCamera, offsetPointSigned);

			//mat4.multiply(playerCamera, playerMatrix, playerCamera);
			drawWorldScene(frameTime, false, worldInBall, frustumCullCmap);
		}
	}
	
	pMatrix = finalPMatrix;

	//setup for drawing to screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	
	mat4.set(playerMatrix, playerCamera);	//necessary to have playerCam and playerMatrix???
	
	drawWorldScene(frameTime, true, currentWorld, frustumCullFinal);
}

function noCull(){
	return true;
}
function drawWorldScene(frameTime, drawReflector, world, frustumCull) {
		
		setGlClearColor(world.bgColor);
		
		//console.log("drawing...");
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		//use cubemap for centre object
		var activeProg;

		if (guiParams.drawSkybox){
			//draw an object using cubemap
			activeProg = shaderProgramSimpleCubemap;
			gl.useProgram(activeProg);
			gl.uniform4fv(activeProg.uniforms.uColor, world.bgColor);
			
			//gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, world.skybox);
			//gl.uniform1i(activeProg.uniforms.uSampler, 0);

			mat4.set(playerCamera, mvMatrix);	//TODO position cubemap at player position
			mat4.scale(mvMatrix, [50,50,50]);
			
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.DEPTH_TEST);

			drawObjectFromBuffers(sphereBuffers, activeProg);	//TODO use cube object
		}
		
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		
		mat4.set(playerCamera, mvMatrix)
		
		var shaderSet = reflProgs;
		if (portalActive){
			shaderSet = portalProgs;
		};
		
		if (drawReflector){
			switch (guiParams.mappingType){
				case "projection":
					activeProg = shaderSet.projection;					
					gl.useProgram(activeProg);
					gl.uniform3fv(activeProg.uniforms.uCentrePos, offsetPointUnsigned);
					break;
				case "vertex projection":
					activeProg = shaderSet.vertprojection;					
					gl.useProgram(activeProg);
					gl.uniform3fv(activeProg.uniforms.uCentrePos, offsetPointUnsigned);
					break;
				case "distant reflection":
					activeProg = shaderSet.distant;
					gl.useProgram(activeProg);
					gl.uniform3fv(activeProg.uniforms.uEyePos, storedPlayerPos);
					break;
			}
				
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
			gl.uniform1i(activeProg.uniforms.uSampler, 0);
			
			switch (guiParams.shape){
				case "sphere":
					if (frustumCull(mvMatrix,1)){	//doesn't affect performance much so maybe should remove culling here (but keep for draw cubemap)
						drawObjectFromBuffers(ballBuffers, activeProg);
					}
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

		activeProg = drawReflector ? shaderProgramPosColor: shaderProgramPosColorWDiscard;
		gl.useProgram(activeProg);
		if (!drawReflector){
			gl.uniform3fv(activeProg.uniforms.uSpherePos, [playerCamera[12],playerCamera[13],playerCamera[14]]);	//basically co-ordinates of world 0,0,0 in current camera
		}
		//TODO disable texture??
		
		gl.uniform4fv(activeProg.uniforms.uColor, [1.0, 1.0, 1.0, 1.0]);	//WHITE
	
		
		if (guiParams.drawItems){
			var itemsToDraw = world.items;
			var scale = parseFloat(guiParams.itemScale);
			var invScale=1.0/scale;
			var itemSf= [scale,scale,scale];
			var itemInvSf=[invScale,invScale,invScale];

			for (var ii in itemsToDraw){
				var thisItem = itemsToDraw[ii];
				mat4.translate(mvMatrix, thisItem.trans);
				mat4.scale(mvMatrix, itemSf);
				if (frustumCull(mvMatrix,scale*thisItem.buffers.cullRad)){
					drawObjectFromBuffers(thisItem.buffers, activeProg);
				}
				mat4.scale(mvMatrix, itemInvSf);
			}
		}
		
		if (guiParams.drawPlayer){
			drawObjectFromBuffersForScaleAndWorld(cubeFrameBuffers, activeProg, {mat:playerMatrix, world:currentWorld}, playerObjScaleVec, world);
		}
		
		for (var bb in bullets){
			drawObjectFromBuffersForScaleAndWorld(cubeFrameBuffers, activeProg, bullets[bb], [0.01,0.01,0.04], world);
		}
		
		
}
function drawObjectFromBuffers(bufferObj, shaderProg){
	prepBuffersForDrawing(bufferObj, shaderProg);
	drawObjectFromPreppedBuffers(bufferObj, shaderProg);
}
function prepBuffersForDrawing(bufferObj, shaderProg){
	gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexPositionBuffer);
    gl.vertexAttribPointer(shaderProg.attributes.aVertexPosition, bufferObj.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	if (shaderProg.attributes.aVertexNormal){
		if (bufferObj.vertexNormalBuffer){
			gl.bindBuffer(gl.ARRAY_BUFFER, bufferObj.vertexNormalBuffer);
			gl.vertexAttribPointer(shaderProg.attributes.aVertexNormal, bufferObj.vertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
		}
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
function drawObjectFromBuffersForScaleAndWorld(bufferObj, activeProg, obj, scale, camworld){
	var invMat = mat4.create();
	
	if (camworld == obj.world){
		mat4.set(obj.mat, invMat);			
	} else {
		//console.log("drawing in other world");
		//draw object at "opposite" spot in the world (so will see through portal)	
		
		var movedMatrix = mat4.create();
		mat4.set(obj.mat, movedMatrix);
			
		movedMatrix[12]=0;	//zero translation components
		movedMatrix[13]=0;
		movedMatrix[14]=0;
			
		var posMagSq=0;
		var posn = getTranslationFromMat(obj.mat);
		for (var cc=0;cc<3;cc++){
			posMagSq+=posn[cc]*posn[cc];
		}
			
		var invertedPos = [];
		for (var cc=0;cc<3;cc++){
			invertedPos[cc]=-posn[cc]/posMagSq;
		}
			
		mat4.rotate(movedMatrix, Math.PI, posn);
		mat4.translate(movedMatrix, invertedPos);

		mat4.set(movedMatrix, invMat);
	}
	
	mat4.inverse(invMat);
	mat4.set(playerCamera, mvMatrix);
	mat4.multiply(mvMatrix, invMat);
	mat4.scale(mvMatrix,scale);	
	drawObjectFromBuffers(bufferObj, activeProg);
}

//copied from 3sphere explorer project
function generateCullFunc(pMat){
	var const1 = pMat[5];
	var const2 = pMat[0];
	var const3 = Math.sqrt(1+pMat[5]*pMat[5]);
	var const4 = Math.sqrt(1+pMat[0]*pMat[0]); 
	return function(mat, rad){	//return whether an sphere of radius rad, at a position determined by mat (ie with position [mat[12],mat[13],mat[14],mat[15]]) overlaps the view frustum.
		var const5=const3*rad;	//TODO only do this once when drawing a sequence of same objects.
		var const6=const4*rad;
		if (mat[14]>rad){return false;}
		if (mat[14]-const1*mat[13]>const5){return false;}	//vertical culling
		if (mat[14]+const1*mat[13]>const5){return false;}	
		if (mat[14]-const2*mat[12]>const6){return false;}	//horiz culling
		if (mat[14]+const2*mat[12]>const6){return false;}
		return true;
	}
}


var cmapPMatrix = mat4.create();
mat4.perspective( 90.0, 1.0, 0.00025, 100, cmapPMatrix);
var finalPMatrix = mat4.create();

var mvMatrix = mat4.create();
var pMatrix = finalPMatrix;
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
var cubemapFacelist;

function initCubemapFramebuffer(){
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
	cubemapFacelist = faces;
	
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
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
		
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

//cube map code from http://www.humus.name/cubemapviewer.js (relatively unmodified)
//TODO generalise code and share with above
function loadCubeMap(base)
{
	var texture  = gl.createTexture();
	skyboxImages = [];
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture );
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	var faces = [/*["posx.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
				 ["negx.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
				 ["posy.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
				 ["negy.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
				 ["posz.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
				 ["negz.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];*/
				 ["ft.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
				 ["bk.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
				 ["up.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
				 ["dn.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
				 ["rt.jpg", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
				 ["lf.jpg", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]];
	//var image_counter=0;
	for (var i = 0; i < faces.length; i++)
	{
		var face = faces[i][1];
		var image = new Image();
		image.onload = function (texture, face, image) {
			return function () {
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
				gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
								
				//image_counter++;
				//if (image_counter == 6)
				//{
				//	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
				//}		//no need for mipmap because skybox is usually magnified
						//since 256x256, fov~90, screens <256 pix high uncommon
				//requestAnimationFrame(draw);
			}
		}(texture, face, image);
		image.src = base + '/' + faces[i][0];
	}
	return texture;
}

function setupScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.identity(playerMatrix);
	movePlayer([0.3,-0.2,-1.5]);
}


var texture;

function initTexture() {
	/*
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
	*/
	worldOne.skybox = loadCubeMap("img/skyboxes/gg");
	worldTwo.skybox = worldOne.skybox;
}


var guiParams={
	pixSizeMultiplier:1.0,
	shape: 'sphere',
	mappingType: 'vertex projection',
	projectionPoint: 'offset',
	portal: true,
	drawSkybox: true,
	drawItems: true,
	itemScale: 1,
	drawPlayer: false,
	renderCubemap: true,
	smoothMovement: true,
	culling: true
};

var mouseInfo = {
	x:0,
	y:0,
	dragging: false,
	lastPointingDir:{}
};

var stats;

function init(){

	stats = new Stats();
	stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild( stats.dom );

	var gui = new dat.GUI();
	gui.add(guiParams, 'pixSizeMultiplier', 0.5, 2.0, 0.5);
	gui.add(guiParams, 'shape', ['sphere', 'teapot', 'octoframe']).onChange(function(v){console.log("changed " + v);});
	gui.add(guiParams, 'mappingType', ['projection', 'vertex projection', 'distant reflection']).onChange(function(v){console.log("changed " + v);});
	gui.add(guiParams, 'projectionPoint', ['centre', 'offset']).onChange(function(v){console.log("changed " + v);});
	gui.add(guiParams, 'portal');
	gui.add(guiParams, 'drawSkybox');
	gui.add(guiParams, 'drawItems');
	gui.add(guiParams, 'itemScale', 0.1,1.5,0.1);
	gui.add(guiParams, 'drawPlayer');
	gui.add(guiParams, 'renderCubemap');
	gui.add(guiParams, 'smoothMovement');
	gui.add(guiParams, 'culling');

	//examples: https://github.com/dataarts/dat.gui/blob/master/example.html
	
	window.addEventListener("keydown",function(evt){
		console.log("key pressed : " + evt.keyCode);
		var willPreventDefault=true;
		var controlSpeed = guiParams.smoothMovement ? 0:0.02;
		switch (evt.keyCode){
			case 87:				//W
				movePlayerFwd(controlSpeed);
				break;
			case 83:				//S
				movePlayerFwd(-controlSpeed);
				break;
			case 65:				//A
				movePlayerLeft(controlSpeed);
				break;
			case 68:				//D
				movePlayerLeft(-controlSpeed);
				break;
			case 39:
				turnPlayer(controlSpeed);
				break;
			case 37:
				turnPlayer(-controlSpeed);
				break;
			case 81:				//Q
				rollPlayer(-controlSpeed);	
				break;
			case 69:				//E
				rollPlayer(controlSpeed);	
				break;
			case 32:				//spacebar
				movePlayerUp(-controlSpeed);
				break;
			case 17:				//ctrl
				movePlayerUp(controlSpeed);
				break;
			default:
				willPreventDefault=false;
				break;
			case 38:
				pitchPlayer(-controlSpeed);		//up arrow
				break;
			case 40:
				pitchPlayer(controlSpeed);
				break;
				
			case 84:	//T = teleport to other world.
				switchWorld();
				break;
				
			case 71:	//G = fire gun
				new Bullet(playerMatrix, currentWorld);
				break;
		}
		if (willPreventDefault){evt.preventDefault()};
	});
	
	
	canvas = document.getElementById("mycanvas");

	canvas.addEventListener("mousedown", function(evt){
		mouseInfo.x = evt.offsetX;
		mouseInfo.y = evt.offsetY;
		mouseInfo.dragging = true;
		mouseInfo.lastPointingDir = getPointingDirectionFromScreenCoordinate({x:mouseInfo.x, y: mouseInfo.y});
	});
	canvas.addEventListener("mouseup", function(evt){
		mouseInfo.dragging = false;
	});
	canvas.addEventListener("mouseout", function(evt){
		mouseInfo.dragging = false;
	});
	canvas.addEventListener("mousemove", function(evt){
		if (mouseInfo.dragging){
			console.log("evt offsetX = " + evt.offsetX + ", offsetY = " + evt.offsetY);
			console.log("moved : " + evt.movementX + ", movementY = " + evt.movementY);	//this is very nearly the same as the calculated version
			console.log("calculated moved : " + (evt.offsetX - mouseInfo.x) + ", movementY = " + (evt.offsetY - mouseInfo.y) );
			mouseInfo.x = evt.offsetX;
			mouseInfo.y = evt.offsetY;
			
			var pointingDir = getPointingDirectionFromScreenCoordinate({x:mouseInfo.x, y: mouseInfo.y});
			console.log("pointingDir = " + pointingDir);
			
			//get the direction of current and previous mouse position.
			//do a cross product to work out the angle rotated
			//and rotate the player by this amount
			
			var crossProd = crossProductHomgenous(pointingDir, mouseInfo.lastPointingDir);
			mouseInfo.lastPointingDir = pointingDir;
			
			//rotate player 
			rotatePlayer([ -crossProd.x / crossProd.w, crossProd.y / crossProd.w, crossProd.z / crossProd.w]);
		}
	
	});
	
	
	initGL();
	initShaders();
	initTexture();
	initCubemapFramebuffer();
	initBuffers();
  
	gl.clearColor(0.0, 0.1, 0.1, 1.0);
	
	setupScene();
		
	requestAnimationFrame(drawScene);
}

var iterateMechanics = (function iterateMechanics(){
	var lastTime=(new Date()).getTime();
	var moveSpeed=0.01;
	var rotateSpeed=0.01;

	return function(){
		var nowTime = (new Date()).getTime();
		var timeElapsed = Math.min(nowTime - lastTime, 50);	//ms. 50ms -> slowdown if drop below 20fps 
		//console.log("time elapsed: " + timeElapsed);
		lastTime=nowTime;
		
		movePlayer([
			moveSpeed*(keyThing.keystate(65)-keyThing.keystate(68)),	//lateral
			moveSpeed*(keyThing.keystate(17)-keyThing.keystate(32)),	//vertical
			moveSpeed*(keyThing.keystate(87)-keyThing.keystate(83)),	//fwd/back
		]);
		
		rotatePlayer([
			rotateSpeed*(keyThing.keystate(40)-keyThing.keystate(38)), //pitch
			rotateSpeed*(keyThing.keystate(39)-keyThing.keystate(37)), //turn
			rotateSpeed*(keyThing.keystate(69)-keyThing.keystate(81)), //roll
		]);
		
		for (var bb in bullets){
			bullets[bb].iterate();
		}
	}
})();

var playerPosition = [0,0,0];
var worldOne = {
	items: [{trans:[2, 0, 0], buffers:cubeFrameBuffers}, //right
			{trans:[-4, 0, 0], buffers:octoFrameBuffers}, //left
			{trans:[2, 2, 0], buffers:octoFrameBuffers}, //top
			{trans:[0, -4, 0], buffers:sphereBuffers}, //bottom
			{trans:[0, 2, 2], buffers:octoFrameBuffers}, //front
			{trans:[0, 0, -4], buffers:teapotBuffers}, //back
			],
	bgColor: [1.1, 1.1, 1.1, 1.0]
};
var worldTwo = {
	items: [{trans:[2, 0, 0], buffers:cubeFrameBuffers}, //right
			{trans:[-4, 0, 0], buffers:cubeFrameBuffers}, //left
			{trans:[2, 2, 0], buffers:cubeFrameBuffers}, //top
			{trans:[0, -4, 0], buffers:cubeFrameBuffers}, //bottom
			{trans:[0, 2, 2], buffers:cubeFrameBuffers}, //front
			{trans:[0, 0, -4], buffers:cubeFrameBuffers}, //back
			],
	bgColor: [0.6, 0.0, 0.0, 1.0]
};
var currentWorld = worldOne;
var otherWorld = worldTwo;

function switchWorld(){
	console.log("switched world");
	var tmp=currentWorld;
	currentWorld = otherWorld;
	otherWorld= tmp;
}

function setGlClearColor(color){
	gl.clearColor(color[0], color[1], color[2], color[3]);
}

function movePlayerFwd(amount){	
	movePlayer([0,0,amount]);
}
function movePlayerUp(amount){	
	movePlayer([0,amount,0]);
}
function movePlayerLeft(amount){	
	movePlayer([amount,0,0]);
}
function movePlayer(vec){	//[left,up,forward]
	playerPosition[0] += vec[0]*playerMatrix[0] + vec[1]*playerMatrix[1] + vec[2]*playerMatrix[2];
	playerPosition[1] += vec[0]*playerMatrix[4] + vec[1]*playerMatrix[5] + vec[2]*playerMatrix[6];
	playerPosition[2] += vec[0]*playerMatrix[8] + vec[1]*playerMatrix[9] + vec[2]*playerMatrix[10];
	setPlayerTranslation(playerPosition);
	
	//when "dipping toe in" portal, want to nearly "follow" it. rotate by something like cross(player position (relative to portal) , movement) * falloff function
	var portalPos=[playerMatrix[12],playerMatrix[13],playerMatrix[14]];		//get portal position in frame of player
	var crossp=[];
	crossp[0] = -portalPos[1]*vec[2] +portalPos[2]*vec[1];
	crossp[1] = -portalPos[2]*vec[0] +portalPos[0]*vec[2];
	crossp[2] = -portalPos[0]*vec[1] +portalPos[1]*vec[0];

	var radsq=0;
	for (var cc=0;cc<3;cc++){
		radsq+=portalPos[cc]*portalPos[cc];
	}
	var falloff = 1.0/(radsq*radsq*radsq);
	for (var cc=0;cc<3;cc++){
		crossp[cc]*=falloff;
	}
	rotatePlayer(crossp);
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
function movePlayerOutsideSphere(){
	var posMagSq=0;
	for (var cc=0;cc<3;cc++){
		posMagSq+=playerPosition[cc]*playerPosition[cc];
	}
	posMagSq/=1.00125;	//(square of rad which to limit to ( drawn sphere rad =1 )
	if (posMagSq<1){
		if (portalActive){
			for (var cc=0;cc<3;cc++){
				playerPosition[cc]=-playerPosition[cc]/posMagSq;
			}
			mat4.rotate(playerMatrix, Math.PI, playerPosition);
			switchWorld();
		}else{
			var posMag = Math.sqrt(posMagSq);
			for (var cc=0;cc<3;cc++){
				playerPosition[cc]/=posMag;
			}	
		}	
		setPlayerTranslation(playerPosition);
	}
}
var storedPlayerPos;
var offsetPointZero=[0,0,0];
var offsetPointStored=[0,0,0];	//will update
var offsetPointNegative=[0,0,0];
var offsetPointSigned;
var offsetPointUnsigned;
function setPlayerTranslation(posArray){
	playerMatrix[12]=0;	//zero translation components
	playerMatrix[13]=0;
	playerMatrix[14]=0;
	storedPlayerPos = posArray;
	
	//cubemap camera point at A/(2A-1) where A=position of player camera
	var storedPlayerPosMag=0;
	for (var cc=0;cc<3;cc++){
		storedPlayerPosMag+= storedPlayerPos[cc]*storedPlayerPos[cc];
	}
	storedPlayerPosMag=Math.sqrt(storedPlayerPosMag);
	var denominator = 2*storedPlayerPosMag-1;
	for (var cc=0;cc<3;cc++){
		offsetPointStored[cc] = storedPlayerPos[cc]/denominator;
		offsetPointNegative[cc] = -offsetPointStored[cc];
	}	
	
	mat4.translate(playerMatrix, posArray);
}
function getTranslationFromMat(mat){	//possibly doing things in a stupid way here... (should probably just store inverse of this matrix)
	/*
	var pos=[0,0,0];
	for (var cc=0;cc<3;cc++){
		pos[0]+=mat[cc]*mat[12+cc];
		pos[1]+=mat[cc+4]*mat[12+cc];
		pos[2]+=mat[cc+8]*mat[12+cc];
	}
	return pos;
	*/
	var invMat = mat4.create();
	mat4.set(mat,invMat);
	mat4.inverse(invMat);
	return [-invMat[12],-invMat[13],-invMat[14]];
}

function getPointingDirectionFromScreenCoordinate(coords){
	
	var maxyvert = 1.0;	
	var maxxvert = screenAspect;
	
	var xpos = maxxvert*(coords.x*2.0/canvas.mystylewidth   -1.0 );
	var ypos = maxyvert*(coords.y*2.0/canvas.mystyleheight   -1.0 );
	var radsq = xpos*xpos + ypos*ypos;
	var zpos = 1.0;	//FOV 90 deg
	
	//normalise - use sending back homogenous co-ords because maybe a tiny amount more efficient since cross producting anyway
	var mag= Math.sqrt(radsq + zpos*zpos);
	
	return {
		x: xpos,
		y: ypos,
		z: zpos,
		w: mag
	}
}

function crossProductHomgenous(dir1, dir2){
	var output ={};
	output.x = dir1.y * dir2.z - dir1.z * dir2.y; 
	output.y = dir1.z * dir2.x - dir1.x * dir2.z; 
	output.z = dir1.x * dir2.y - dir1.y * dir2.x;
	output.w = dir1.w * dir2.w;
	return output;
}



// bullets
//TODO encapsulate better ( make a bullets object with functions on it )

var bullets=[];
var bulletidx=0;
var bulletspd = 0.01;
//from tutorial: https://www.youtube.com/watch?v=YCI8uqePkrc
function Bullet(mat, world){
	this.world=world;
	this.mat = mat4.create();
	mat4.set(mat, this.mat); //COPY the rotation matrix ( could alternatively ensure that player mat isn't modified later, only reassigned. )
	this.vel = [bulletspd*mat[2],bulletspd*mat[6],bulletspd*mat[10]];	//forward direction. 
	this.timer = 1000;
	this.id = bulletidx;
	bullets[bulletidx++]=this;
	console.log("fired a bullet");
}
Bullet.prototype.iterate = function(){
	mat4.translate(this.mat, this.vel);
	
	if (this.timer !=0){
		if(--this.timer ==0){
			this.destroy();
		}
	}
	
	//mainly copy/paste from function movePlayerOutsideSphere() . TODO generalise
	var posn = getTranslationFromMat(this.mat);
	var posMagSq=0;
	for (var cc=0;cc<3;cc++){
		posMagSq+=posn[cc]*posn[cc];
	}
	if (posMagSq<1){
		if (portalActive){
			
			//velocity should be rotated too, or expressed in object's frame rather than world frame)
			//basically vel along position vector should remain. other component should be multiplied by -1
			//component along reflection = r(v.r)
			//therefore v' = r(v.r) - (v-r(v.r)) = 2r(v.r) - v
			var vdotr = 0;
			var vel = this.vel;
			for (var cc=0;cc<3;cc++){
				vdotr+= vel[cc]*posn[cc];
			}
			vdotr/=posMagSq;
			for (var cc=0;cc<3;cc++){
				vel[cc] = -vel[cc] + 2*vdotr*posn[cc];
			}
			
			for (var cc=0;cc<3;cc++){
				posn[cc]=-posn[cc]/posMagSq;
			}
			mat4.rotate(this.mat, Math.PI, posn);
			
			
			this.world = (this.world == worldOne) ? worldTwo:worldOne;	//TODO less clunky! 
		}else{
			this.destroy();
		}	
		setMatTranslation(this.mat,posn);
	}	
};
Bullet.prototype.destroy = function(){
	console.log("destroyed a bullet");
	delete bullets[this.id];
};
function setMatTranslation(mat, posn){
	//mostly copy/paste from function setPlayerTranslation(posArray) TODO generalise
	mat[12]=0;	//zero translation components
	mat[13]=0;
	mat[14]=0;
	mat4.translate(mat, posn);
};