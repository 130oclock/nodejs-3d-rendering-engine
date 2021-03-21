/*To Do List
 * ! Drawing
 * [Done] triangles
 * [Done] lines
 * [Done] quadrilaterals
 * [Done] polygons
 * 
 * ! Rotation
 * [Done] Quaternions
 * [Done] SLERP
 * [Done] rotate around
 * [Done] OrthoNormal function
 * 
 * ! Camera Movement
 * [Done: fixed] camera rotation
 * [Done: fixed] camera projection
 * [Done] look-at function
 * 
 * ! Rendering
 * [Done] pixel by pixel rendering
 * [Done: fixed] screen clipping
 * [Done: fixed] depth buffer
 * parallel rendering
 * 
 * ! Lines
 * [Done] rendering lines
 * [Done] line-screen clipping
 * [Done: fixed] line clipping
 * [Done: fixed] line rastering
 * [Done: fixed] line depth buffer
 * [Done] optimize
 * 
 * ! Curves
 * [Done] drawing ellipses
 * [Done] subdivide ellipses
 * [Done] draw lines between subdivision
 * 
 * ! Lighting / Shading
 * [Done] flat shading
 * Gouraud shading
 * Phong shading
 * ambient occlusion
 * % Light Types
 * 1. directional lighting
 * 2. point lighting
 * 3. spotlighting
 * 4. area lighting
 * 
 * ! Animation
 * 
 * ! Kinematics
 * [Done] forward kinematics
 * [Done] inverse kinematics
 * 
 * ! Ray Casting
 * [Done] screen to world coordinates
 * 
 * ? Extra
 * textures
 * sky box
 * 
 * ? Optimization
 * detect if object is in frustum
 * optimize functions
*/

/* Notes
 * If the object is not on screen, why interpolate it?
 * vec3d.matrix_MultiplyVector is slow!
 * optimize 'putImageData' and 'setPixelLine'
 * don't put array.length inside of a for loop
 * for (var i of x)
*/

var socket = io();
// Client - Server Storage
var selfId;
var input;

var previousServerTime;
var timesteps = [];
var timestep = 0;
var currentTimestep = 0;
// Options
var showV = false; //show vectors
var showI = false; //show clipping
var showW = false; //show depth buffer
var interpolate_V = true; 
var Scontrols = true;
var showOct = false;

// Create New Player On Srever
socket.emit('new player');

socket.on('selfid', (id) => {
	//stores the clients id
	selfId = id;
	//responds when the server state changes
	socket.on('server_update', function() {
		//gets the difference in milliseconds from the previous update and the new update
		var now = performance.now();
		var timeDiff = now - previousServerTime;
		if (previousServerTime) {
			currentTimestep = timeDiff;
			if (timesteps.length < 10) {
				timesteps.push(timeDiff);
			} else {
				timesteps.shift();
				timesteps.push(timeDiff);
			}
			var timestepsTotal = 0;
			for (var i of timesteps) timestepsTotal += i;
			timestep = timestepsTotal/timesteps.length;
		}
		//resets previous server update time
		previousServerTime = now;
	});
});

// Classes
class PointLight {
	constructor(direction) {
		this.dir = direction || new vec3d(0, 1, 0);
		
		PointLight.list.push(this);
	}
}
PointLight.list = [];

class AmbientLight {
	constructor(direction, color) {
		this.dir = vec3d.normalize(direction) || new vec3d(0, 1, 0);
		this.color = color || new color();
	}
}

class Object {
	constructor(data) {
		this.id = data.id;
		this.scale = data.scale;
		this.pos = data.pos;
		this.vel = data.vel;
		this.rot = data.rot;
		if (data.mesh) this.mesh = Mesh.list[data.mesh.id].copy(this.scale);
		
		this.previousState = [{pos: this.pos, vel: this.vel, rot: this.rot, time: performance.now()}];
	}
	
	interpolate() {
		// Entity Interpolation
		var prevLength = this.previousState.length;
		if (timestep && prevLength > 1) {
			var time = performance.now() - (timestep * 2 + 100);
			var i = 0;
			while (this.previousState[i] && this.previousState[i].time < time) i++;
			var before = this.previousState[i];
			var after = this.previousState[i-1];
			if (before && after) {
				var dif = vec3d.subtract(after.pos, before.pos);
				var difLength = v_length(dif);
				if (difLength < 50) {
					var alpha = (time - before.time) / (after.time - before.time);
					
					var newPos = vec3d.lerp(before.pos, after.pos, alpha);
					this.pos = newPos;
					var newRot = Quaternion.slerp(before.rot, after.rot, alpha);
					this.rot = newRot;
					var newVel = vec3d.lerp(before.vel, after.vel, alpha);
					this.vel = newVel;
				} else {
					this.pos = after.pos;
					this.rot = after.rot;
					this.vel = after.vel;
				}
				if (prevLength > 10) this.previousState.splice(0, prevLength - 10);
			}
		}
	}
	
	move() {
		var after = this.previousState[this.previousState.length - 1];
		this.pos = after.pos;
		this.rot = after.rot;
		this.vel = after.vel;
	}
	
	posToScreenSpace() {
		var viewPos = vec3d.matrix_MultiplyVector(matView, this.pos);
		var proj = vec3d.matrix_MultiplyVector(matProj, viewPos);
		proj = vec3d.divide(proj, proj.w);
		return proj;
	}
	
	getViewSpace() {
		var viewPos = vec3d.matrix_MultiplyVector(matView, this.pos);
		return viewPos;
	}
	
	checkInsideFrustum() {
		var angleVector = this.posToScreenSpace();
		var x = angleVector.x, y = angleVector.y, z = angleVector.z;
		if (z > 1) return false;
		var buffer = 1;
		return (x > -1 - buffer && x < 1 + buffer && y > -1 - buffer && y < 1 + buffer);
		//return true;
		/*var r = Math.sqrt((x * x) + (y * y) + (z * z));
		var yAngle = Math.atan(y / x);
		var xAngle = Math.acos(z / r);
		var camX = matProj.m[0][0];//(90 * (HEIGHT/WIDTH)) * Math.PI / 180;//
		var camY = matProj.m[1][1];//90 * Math.PI / 180;//
		xAngle /= camX; yAngle /= camY;
		//console.log(camX, xAngle, camY, yAngle);
		return (xAngle > -camX && xAngle < camX && yAngle > -camY && yAngle < camY);*/
	}

	project(vecTrianglesToRaster) {
		Object.projectTri.call(this, vecTrianglesToRaster);
	}
}
Object.projectTri = function(vecTrianglesToRaster) {
	// Object Rotation
	var matWorld = Quaternion.generateMatrix(this.rot, this.pos);
	
	// Draw Triangles
	for (var tri of this.mesh.triangles) {
		var triTransformed = new triangle();
		var triViewed = new triangle();

		/*triTransformed.p[0] = vec3d.matrix_MultiplyVector(matWorld, tri.p[0]);
		triTransformed.p[1] = vec3d.matrix_MultiplyVector(matWorld, tri.p[1]);
		triTransformed.p[2] = vec3d.matrix_MultiplyVector(matWorld, tri.p[2]);*/
		triTransformed.p = triangle.matrix_MultiplyVector(matWorld, tri.p);
		
		triTransformed.t[0] = tri.t[0];
		triTransformed.t[1] = tri.t[1];
		triTransformed.t[2] = tri.t[2];

		var normal = new vec3d(), line1 = new vec3d(), line2 = new vec3d();
		if (!tri.p[4]) {
			line1 = vec3d.subtract(triTransformed.p[1], triTransformed.p[0]);
			line2 = vec3d.subtract(triTransformed.p[2], triTransformed.p[0]);

			normal = vec3d.crossProduct(line1, line2);

			normal = vec3d.normalize(normal);
		} else {
			normal = tri.p[4];
		}

		var vCameraRay = vec3d.subtract(triTransformed.p[0], camera.pos);
		if (v_dotProduct(normal, vCameraRay) < 0) {
			var light_dir = vec3d.normalize(mainLight.dir);

			var dp = Math.max(0.1, v_dotProduct(light_dir, normal));
			// Store Color Data
			triViewed.brightness.r = (dp * 255) * (mainLight.color.r / 255);
			triViewed.brightness.g = (dp * 255) * (mainLight.color.g / 255);
			triViewed.brightness.b = (dp * 255) * (mainLight.color.b / 255);

			/*triViewed.p[0] = vec3d.matrix_MultiplyVector(matView, triTransformed.p[0]);
			triViewed.p[1] = vec3d.matrix_MultiplyVector(matView, triTransformed.p[1]);
			triViewed.p[2] = vec3d.matrix_MultiplyVector(matView, triTransformed.p[2]);*/
			triViewed.p = triangle.matrix_MultiplyVector(matView, triTransformed.p);
			
			triViewed.t[0] = triTransformed.t[0];
			triViewed.t[1] = triTransformed.t[1];
			triViewed.t[2] = triTransformed.t[2];

			var nClippedTriangles = 0;
			var clipped = [new triangle(), new triangle()];
			nClippedTriangles = triangle.clipAgainstPlane(camClippingPlane, {x:0, y:0, z:1}, triViewed, clipped[0], clipped[1]);

			for (var n = 0; n < nClippedTriangles; n++) {
				var triProjected = new triangle();
				// Project Triangles From 3d To 2d
				/*triProjected.p[0] = vec3d.matrix_MultiplyVector(matProj, clipped[n].p[0]);
				triProjected.p[1] = vec3d.matrix_MultiplyVector(matProj, clipped[n].p[1]);
				triProjected.p[2] = vec3d.matrix_MultiplyVector(matProj, clipped[n].p[2]);*/
				triProjected.p = triangle.matrix_MultiplyVector(matProj, clipped[n].p);
				
				triProjected.brightness = clipped[n].brightness;
				triProjected.t[0] = clipped[n].t[0];
				triProjected.t[1] = clipped[n].t[1];
				triProjected.t[2] = clipped[n].t[2];
				
				triProjected.t[0].u = triProjected.t[0].u / triProjected.p[0].w;
				triProjected.t[1].u = triProjected.t[1].u / triProjected.p[1].w;
				triProjected.t[2].u = triProjected.t[2].u / triProjected.p[2].w;
				
				triProjected.t[0].v = triProjected.t[0].v / triProjected.p[0].w;
				triProjected.t[1].v = triProjected.t[1].v / triProjected.p[1].w;
				triProjected.t[2].v = triProjected.t[2].v / triProjected.p[2].w;
				
				triProjected.t[0].w = 1 / triProjected.p[0].w;
				triProjected.t[1].w = 1 / triProjected.p[1].w;
				triProjected.t[2].w = 1 / triProjected.p[2].w;

				triProjected.p[0] = vec3d.divide(triProjected.p[0], triProjected.p[0].w);
				triProjected.p[1] = vec3d.divide(triProjected.p[1], triProjected.p[1].w);
				triProjected.p[2] = vec3d.divide(triProjected.p[2], triProjected.p[2].w);

				triProjected.p[0].x *= -1;
				triProjected.p[1].x *= -1;
				triProjected.p[2].x *= -1;
				triProjected.p[0].y *= -1;
				triProjected.p[1].y *= -1;
				triProjected.p[2].y *= -1;

				var offsetView = new vec3d(1, 1, 0);
				triProjected.p[0] = vec3d.add(triProjected.p[0], offsetView);
				triProjected.p[1] = vec3d.add(triProjected.p[1], offsetView);
				triProjected.p[2] = vec3d.add(triProjected.p[2], offsetView);
				triProjected.p[0].x *= 0.5 * WIDTH;
				triProjected.p[0].y *= 0.5 * HEIGHT;
				triProjected.p[1].x *= 0.5 * WIDTH;
				triProjected.p[1].y *= 0.5 * HEIGHT;
				triProjected.p[2].x *= 0.5 * WIDTH;
				triProjected.p[2].y *= 0.5 * HEIGHT;

				vecTrianglesToRaster.push(triProjected);
			}
		}
	}
}
Object.projectPoint = function(v1, imageData) {

	var matWorld = mat4x4.matrix_MakeIdentity();
	
	// Draw Lines
	var vTransformed = new vec3d();
	var vViewed = new vec3d();

	vTransformed = vec3d.matrix_MultiplyVector(matWorld, v1);

	vViewed = vec3d.matrix_MultiplyVector(matView, vTransformed);
	
	var vProjected;
	// Project Triangles From 3d To 2d
	vProjected = vec3d.matrix_MultiplyVector(matProj, vViewed);

	vProjected = vec3d.divide(vProjected, vProjected.w);

	vProjected.x *= -1;
	vProjected.y *= -1;

	var offsetView = new vec3d(1, 1, 0);
	vProjected = vec3d.add(vProjected, offsetView);
	
	vProjected.x *= 0.5 * WIDTH;
	vProjected.y *= 0.5 * HEIGHT;
	
	if (vProjected.x > 0 && vProjected.x < WIDTH && vProjected.y > 0 && vProjected.y < HEIGHT)
	fillPixelRect(imageData, vProjected.x, vProjected.y, 1, 1);
	return vProjected;
}

class LineObject {
	constructor(data) {
		this.id = data.id;
		this.line = new line(data.v1, data.v2);
		
		LineObject.list[this.id] = this;
	}
	
	project(linesToRaster) {
		LineObject.projectLine.call(this, linesToRaster);
	}
	
	remove() {
		delete LineObject.list[this.id];
	}
}
LineObject.list = {};
LineObject.projectLine = function(linesToRaster, v1, v2, color) {
	
	//var matTrans = mat4x4.matrix_MakeTranslation(0, 0, 0);

	var matWorld = mat4x4.matrix_MakeIdentity();
	//matWorld = mat4x4.matrix_MultiplyMatrix(matWorld, matTrans);
	
	// Draw Lines
	var vTransformed = new line();
	var vViewed = new line();

	if (!v1) vTransformed.p[0] = vec3d.matrix_MultiplyVector(matWorld, this.line.p[0]);
	else vTransformed.p[0] = vec3d.matrix_MultiplyVector(matWorld, v1);
	if (!v2) vTransformed.p[1] = vec3d.matrix_MultiplyVector(matWorld, this.line.p[1]);
	else vTransformed.p[1] = vec3d.matrix_MultiplyVector(matWorld, v2);
	if (!color) vTransformed.brightness = this.line.color;
	else vTransformed.brightness = color;

	vViewed.p[0] = vec3d.matrix_MultiplyVector(matView, vTransformed.p[0]);
	vViewed.p[1] = vec3d.matrix_MultiplyVector(matView, vTransformed.p[1]);
	
	// Clip Line
	var nClippedLine = 0;
	var clipped = new line();
	nClippedLine = line.clipAgainstPlane(camClippingPlane, {x:0, y:0, z:1}, vViewed, clipped);
	
	if (nClippedLine == 1) {
		var vProjected = new line();
		// Project Triangles From 3d To 2d
		vProjected.p[0] = vec3d.matrix_MultiplyVector(matProj, clipped.p[0]);
		vProjected.p[1] = vec3d.matrix_MultiplyVector(matProj, clipped.p[1]);
		vProjected.brightness = vTransformed.brightness;
		
		vProjected.t[0].w = 1 / vProjected.p[0].w;
		vProjected.t[1].w = 1 / vProjected.p[1].w;

		vProjected.p[0] = vec3d.divide(vProjected.p[0], vProjected.p[0].w);
		vProjected.p[1] = vec3d.divide(vProjected.p[1], vProjected.p[1].w);

		vProjected.p[0].x *= -1;
		vProjected.p[0].y *= -1;
		vProjected.p[1].x *= -1;
		vProjected.p[1].y *= -1;

		var offsetView = new vec3d(1, 1, 0);
		vProjected.p[0] = vec3d.add(vProjected.p[0], offsetView);
		vProjected.p[1] = vec3d.add(vProjected.p[1], offsetView);
		
		vProjected.p[0].x *= 0.5 * WIDTH;
		vProjected.p[0].y *= 0.5 * HEIGHT;
		vProjected.p[1].x *= 0.5 * WIDTH;
		vProjected.p[1].y *= 0.5 * HEIGHT;
		
		linesToRaster.push(vProjected);
	}
}

class Ellipse {
	constructor(width, height, k, pos = new vec3d(), rot = new Quaternion()) {
		this.id = Math.random();
		this.width = width;
		this.height = height;
		this.pos = pos;
		this.rot = rot;
		Quaternion.normalize(this.rot);
		
		this.lines = Ellipse.calcEllipse(width, height, k);
		Ellipse.list[this.id] = this;
	}
	
	project(linesToRaster) {
		Ellipse.projectEllipse.call(this, linesToRaster);
	}
	
	remove() {
		delete Ellipse.list[this.id];
	}
}
Ellipse.list = [];
Ellipse.projectEllipse = function(linesToRaster) {
	var matWorld = Quaternion.generateMatrix(this.rot, this.pos);
	for (var line of this.lines) {
		var v1 = line.p[0];
		var v2 = line.p[1];
		var triTransformed1 = vec3d.matrix_MultiplyVector(matWorld, v1);
		var triTransformed2 = vec3d.matrix_MultiplyVector(matWorld, v2);
		
		LineObject.projectLine(linesToRaster, triTransformed1, triTransformed2, new color(255));
	}
}
Ellipse.calcPoint = function(a, b, theta) {
	var sinalpha = Math.sin(theta);
	var cosalpha = Math.cos(theta);

	var x = a * cosalpha;
	var y = b * sinalpha;

	return new vec3d(x, y);
}
Ellipse.calcEllipse = function(w, h, k) {
	var total = Math.PI*2;
	var thetaC = total / k;
	var points = [];
	var lines = [];
	for (var theta = 0; theta < total; theta += thetaC) points.push(Ellipse.calcPoint(w, h, theta));
	for (var i in points) {
		var point = points[i];
		var previous = points[i-1];
		if (i-1 == -1) previous = points[points.length-1];
		lines.push(new line(point, previous));
	}
	return lines;
}
new Ellipse(10, 10, 24, new vec3d(100), new Quaternion(1, 0.5, 2));
new Ellipse(10, 10, 24, new vec3d(110, 10, 15), new Quaternion(1, 0.5, 3, 5));

// Advanced Classes
class Input {
	constructor() {
		this.keys = {};
		this.mouse = {x: WIDTH/2, y: HEIGHT/2};
	}
}
input = new Input();
class Camera {
	constructor(pos = new vec3d(), viewDist = 500) {
		this.pos = pos;
		this.rot = new Quaternion();
		this.viewDist = viewDist;
		this.moveSpeed = 10;
		this.shiftSpeed = 40;
		this.mouseVector = new vec3d();
	}
	control(keys) {
		var speed;
		if (!keys[16]) speed = this.moveSpeed; 
		else speed = this.shiftSpeed;
		keys['vUp'] = this.rot.getUpVector();
		keys['vForward'] = this.rot.getForwardVector();
		keys['vRight'] = this.rot.getRightVector();
		
		if (keys[70]) this.pos = vec3d.add(this.pos, vec3d.multiply(keys['vUp'], -speed * dt)); //f
		if (keys[82]) this.pos = vec3d.add(this.pos, vec3d.multiply(keys['vUp'], speed * dt)); //r

		if (keys[83]) this.pos = vec3d.subtract(this.pos, vec3d.multiply(keys['vForward'], speed * dt)); //s
		if (keys[87]) this.pos = vec3d.add(this.pos, vec3d.multiply(keys['vForward'], speed * dt)); //w
		if (keys[68]) this.pos = vec3d.subtract(this.pos, vec3d.multiply(keys['vRight'], speed * dt)); //d
		if (keys[65]) this.pos = vec3d.add(this.pos, vec3d.multiply(keys['vRight'], speed * dt)); //a
		//if (keys[82]) this.rot = Quaternion.rotate(this.rot, input['vRight'], -2 * dt); //r
		//if (keys[70]) this.rot = Quaternion.rotate(this.rot, input['vRight'], 2 * dt); //f
		if (keys[37]) this.rot = Quaternion.rotate(this.rot, keys['vUp'], 2 * dt); //left
		if (keys[39]) this.rot = Quaternion.rotate(this.rot, keys['vUp'], -2 * dt); //right
		if (keys[69]) this.rot = Quaternion.rotate(this.rot, keys['vForward'], 2 * dt); //e
		if (keys[81]) this.rot = Quaternion.rotate(this.rot, keys['vForward'], -2 * dt); //q
		if (keys[40]) this.rot = Quaternion.rotate(this.rot, keys['vRight'], 2 * dt); //down
		if (keys[38]) this.rot = Quaternion.rotate(this.rot, keys['vRight'], -2 * dt); //up
		
		if (keys[88]) {this.rot = new Quaternion()} //x 
	}
	lookControl(dx, dy) {
		var up = this.rot.getUpVector();
		var right = this.rot.getRightVector();
		var v = {x: dx, y: dy};
		var length = Math.sqrt(v.x * v.x + v.y * v.y);
		if (length > 10) {
			v.x *= Math.PI/180;
			v.y *= Math.PI/180;

			this.rot = Quaternion.rotate(this.rot, up, -v.x/250);
			this.rot = Quaternion.rotate(this.rot, right, v.y/250);
		}
	}
	touchControl(dx, dy) {
		var up = this.rot.getUpVector();
		var right = this.rot.getRightVector();
		this.rot = Quaternion.rotate(this.rot, up, -dx/1000);
		this.rot = Quaternion.rotate(this.rot, right, dy/1000);
	}
	screenToRay(X, Y) {
		var x = (1 - (2 * X) / WIDTH) * (WIDTH/HEIGHT) * (WIDTH/HEIGHT);
		var y = 1 - (2 * Y) / HEIGHT;
		var z = 1;
		
		var ray_clip = new vec3d(x, y, z);
		var ray_eye = vec3d.matrix_MultiplyVector(mat4x4.matrix_QuickInverse(matProj), ray_clip);
		ray_eye.z = 1;
		ray_eye.w = 0;
		var ray_wor = vec3d.matrix_MultiplyVector(mat4x4.matrix_QuickInverse(matView), ray_eye);
		ray_wor = vec3d.normalize(ray_wor);
		this.mouseVector = ray_wor;
		//new LineObject(new line(vec3d.add(ray_wor, camera.pos), camera.pos));
	}
}

class Static extends Object {
	constructor(data) {
		super(data);

		Static.list[this.id] = this;
	}

	remove() {
		delete Static.list[this.id];
	}
}
Static.list = {};

class Projectile extends Object {
	constructor(data) {
		super(data);

		Projectile.list[this.id] = this;
	}
	project(vecTrianglesToRaster) {
		
	}

	remove() {
		delete Projectile.list[this.id];
	}
}
Projectile.list = {};

class Player extends Object {
	constructor(data) {
		super(data);
		this.childId = data.childId;
		//this.mesh = {triangles: [new triangle([0.5,0.5,0], [-0.5,0.5,0], [0.5,-0.5,0]), new triangle([-0.5,-0.5,0], [0.5,-0.5,0], [-0.5,0.5,0]), new triangle([0.5,0.5,0], [0.5,-0.5,0], [-0.5,0.5,0]), new triangle([-0.5,-0.5,0], [-0.5,0.5,0], [0.5,-0.5,0])]};

		Player.list[this.id] = this;
	}

	remove() {
		delete Player.list[this.id];
	}
}
Player.list = {};

socket.on('init', function(data) {
	if (data.meshes) {
		for (var id in data.meshes) {
			var mesh = data.meshes[id];
			Mesh.loadFile(mesh.src, mesh.id);
		}
	}
	for (var i in data.lines) {
		var o = data.lines[i];
		new LineObject(o);
	}
	for (var i in data.statics) {
		var o = data.statics[i];
		new Static(o);
	}
	for (var i in data.projectiles) {
		var o = data.projectiles[i];
		new Projectile(o);
	}
	for (var i in data.players) {
		var o = data.players[i];
		new Player(o);
	}
});
socket.on('update', function(data) {
	for (var i in data.statics) {
		var o = data.statics[i];
		var s = Static.list[o.id];
		if (!s) continue;
		var now = performance.now();
		if (interpolate_V) s.previousState.push({pos: o.pos, vel: o.vel, rot: o.rot, time: now});
		else {
			s.pos = o.pos;
			s.rot = o.rot;
			s.vel = o.vel;
		}
	}
	for (var i in data.projectiles) {
		var o = data.projectiles[i];
		var s = Projectile.list[o.id];
		if (!s) continue;
		var now = performance.now();
		if (interpolate_V) s.previousState.push({pos: o.pos, vel: o.vel, rot: o.rot, time: now});
		else {
			s.pos = o.pos;
			s.rot = o.rot;
			s.vel = o.vel;
		}
	}
	for (var i in data.players) {
		var o = data.players[i];
		var p = Player.list[o.id];
		if (!p) continue;
		var now = performance.now();
		if (interpolate_V) p.previousState.push({pos: o.pos, vel: o.vel, rot: o.rot, time: now});
		else {
			p.pos = o.pos;
			p.rot = o.rot;
		}
	}
});
socket.on('remove', function(data) {
	for (var i in data.lines) {
		var o = data.lines[i];
		if (LineObject.list[o]) LineObject.list[o].remove();
	}
	for (var i in data.statics) {
		var o = data.statics[i];
		if (Static.list[o]) Static.list[o].remove();
	}
	for (var i in data.projectiles) {
		var o = data.projectiles[i];
		if (Projectile.list[o]) Projectile.list[o].remove();
	}
	for (var i in data.players) {
		var o = data.players[i];
		if (Player.list[o]) Player.list[o].remove();
	}
});

socket.on('log', function(data) {
	console.log(data);
});

// Camera Variables
var camera = new Camera(new vec3d(0, 0, 0));
var camClippingPlane = {x:0, y:0, z:0.1};
var matView = mat4x4.matrix_MakeIdentity();

var mainLight = new AmbientLight(new vec3d(0, 1, 0), new color(255, 255, 255));

var backbuffer = ctx.getImageData(0, 0, WIDTH, HEIGHT);
var backbufferdata = backbuffer.data;
var pDepthBufferLength = WIDTH * HEIGHT | 0;
var pDepthBuffer = new Array(pDepthBufferLength);

var thisPlayer;

// Projection Matrix
var matProj = mat4x4.matrix_MakeProjection(90, HEIGHT/WIDTH, 0.1, 1000);

var px = WIDTH/2, py = HEIGHT/2;
function draw() {
	thisPlayer = Player.list[selfId];
	
	// Input
	if (Scontrols && thisPlayer) {
		//camera.control(input.keys);
		camera.screenToRay(input.mouse.x, input.mouse.y);
		camera.lookControl(input.mouse.x - WIDTH/2, input.mouse.y - HEIGHT/2);
		var forward_ = camera.rot.getForwardVector();
		if (input.keys[69]) camera.rot = Quaternion.rotate(camera.rot, forward_, 2 * dt); //e
		if (input.keys[81]) camera.rot = Quaternion.rotate(camera.rot, forward_, -2 * dt); //q
		//camera.pos = Quaternion.rotateAround(thisPlayer.pos, camera.pos, camera.rot.getUpVector(), ((input.mouse.x - WIDTH/2)/1000000) * 180/Math.PI);
		
		var rot = Quaternion.conjugate(thisPlayer.rot);
		var forward = rot.getForwardVector(), up = rot.getUpVector();
		var targetPos = vec3d.add(vec3d.add(thisPlayer.pos, vec3d.multiply(up, 3)), vec3d.multiply(forward, -7));
		camera.pos = vec3d.lerp(camera.pos, targetPos,  dt*5);
		
		socket.emit('keyPress', input.keys, camera);
	} else {
		camera.control(input.keys);
		if (input.mouse[2]) {
			var dx = input.mouse.x - px, dy = input.mouse.y - py;
			camera.touchControl(dx, dy);
			px = input.mouse.x, py = input.mouse.y;
		}
	}
	
	/*if (thisPlayer && thisPlayer.childId) {
		Static.list[thisPlayer.childId].project = function(vecTrianglesToRaster) {
			Object.projectTri.call(this, vecTrianglesToRaster);
			var rot = Quaternion.conjugate(this.rot);
			var forward = rot.getForwardVector();
			var up = camera.rot.getUpVector();
			vec3d.orthoNormal(forward, up);
			LineObject.projectLine(linesToRaster, this.pos, vec3d.add(this.pos, vec3d.multiply(forward, 100)), new color(255));
			LineObject.projectLine(linesToRaster, this.pos, vec3d.add(this.pos, rot.getUpVector()), new color(255));
			LineObject.projectLine(linesToRaster, this.pos, vec3d.add(this.pos, up), new color(0, 255));
		}
	}*/
	
	/*for (var i in Static.list) {
		var p = Static.list[i];
		if (interpolate_V && p.getViewSpace && p.checkInsideFrustum()) p.interpolate();
		else p.move();
	}
	for (var i in Player.list) {
		var p = Player.list[i];
		if (interpolate_V) p.interpolate();
	}*/
	
	// Camera Rotation
	Quaternion.normalize(camera.rot);
	var matRot = Quaternion.generateMatrix(camera.rot);
	var matTrans = mat4x4.matrix_MakeTranslation(camera.pos.x, camera.pos.y, camera.pos.z);
	matTrans = mat4x4.matrix_QuickInverse(matTrans);
	matView = mat4x4.matrix_MultiplyMatrix(matTrans, matRot);
	
	//ctx.clearRect(0, 0, WIDTH, HEIGHT);
	backbuffer = new ImageData(WIDTH, HEIGHT);
	backbufferdata = backbuffer.data;
	for (var i = 0; i < pDepthBufferLength; i++) pDepthBuffer[i] = 0;

	var vecTrianglesToRaster = [];
	var linesToRaster = [];
	
	LineObject.projectLine(linesToRaster, new vec3d(), new vec3d(1, 0, 0), new color(255, 0, 0));
	LineObject.projectLine(linesToRaster, new vec3d(), new vec3d(0, 1, 0), new color(0, 255, 0));
	LineObject.projectLine(linesToRaster, new vec3d(), new vec3d(0, 0, 1), new color(0, 0, 255));
	
	var viewDist = camera.viewDist;
	for (var i in LineObject.list) {
		var p = LineObject.list[i];
		p.project(linesToRaster);
	}
	for (var i in Ellipse.list) {
		var p = Ellipse.list[i];
		p.project(linesToRaster);
	}
	for (var i in Static.list) {
		var p = Static.list[i];
		if (p.getViewSpace && p.checkInsideFrustum()) {
			if (interpolate_V) p.interpolate();
			if (p.mesh && v_distance(p.pos, camera.pos) < viewDist) p.project(vecTrianglesToRaster);
		} else p.move();
	}
	for (var i in Projectile.list) {
		var p = Projectile.list[i];
		if (p.getViewSpace && p.checkInsideFrustum()) {
			if (interpolate_V) p.interpolate();
			if (p.mesh && v_distance(p.pos, camera.pos) < viewDist) p.project(vecTrianglesToRaster);
		} else p.move();
	}
	for (var i in Player.list) {
		var p = Player.list[i];
		//if (p.id == selfId) continue;
		if (interpolate_V) p.interpolate();
		if (p.mesh) p.project(vecTrianglesToRaster);
	}
	
	// Clip Triangles More
	for (var triToRaster of vecTrianglesToRaster) {
		var listTriangles = [];
		var clipped = [new triangle(), new triangle()];
		
		listTriangles.push(triToRaster);
		var nNewTriangles = 1;
		// Draw Triangles
		for (var p = 0; p < 4; p++) {
			var nTrisToAdd = 0;
			while (nNewTriangles > 0) {
				clipped = [new triangle(), new triangle()];
				var test = listTriangles.shift();
				nNewTriangles--;
				switch (p) {
					case 0: nTrisToAdd = triangle.clipAgainstPlane({x:0, y:0, z:0}, {x:0, y:1, z:0}, test, clipped[0], clipped[1]); break; //Top
					case 1: nTrisToAdd = triangle.clipAgainstPlane({x:0, y:HEIGHT - 1, z:0}, {x:0, y:-1, z:0}, test, clipped[0], clipped[1]); break; //Bottom
					case 2: nTrisToAdd = triangle.clipAgainstPlane({x:0, y:0, z:0}, {x:1, y:0, z:0}, test, clipped[0], clipped[1]); break; //Right
					case 3: nTrisToAdd = triangle.clipAgainstPlane({x:WIDTH - 1, y:0, z:0}, {x:-1, y:0, z:0}, test, clipped[0], clipped[1]); break; //Left
				}
				for (var w = 0; w < nTrisToAdd; w++) listTriangles.push(clipped[w]);
			}
			nNewTriangles = listTriangles.length;
		}
		
		for (var t in listTriangles) {
			var tri = listTriangles[t];
			texturedTriangle(tri.p[0].x, tri.p[0].y, tri.t[0].u, tri.t[0].v, tri.t[0].w,
						 tri.p[1].x, tri.p[1].y, tri.t[1].u, tri.t[1].v, tri.t[1].w,
						 tri.p[2].x, tri.p[2].y, tri.t[2].u, tri.t[2].v, tri.t[2].w, tri.brightness);
		}
	}
	
	// Render Lines
	for (var lineToRaster of linesToRaster) {
		var listLine;
		var clipped;
		
		listLine = lineToRaster;
		for (var p = 0; p < 4; p++) {
			clipped = new line();
			switch (p) {
				case 0: line.clipAgainstPlane({x:0, y:0, z:0}, {x:0, y:1, z:0}, listLine, clipped); break; //Top
				case 1: line.clipAgainstPlane({x:0, y:HEIGHT - 1, z:0}, {x:0, y:-1, z:0}, listLine, clipped); break; //Bottom
				case 2: line.clipAgainstPlane({x:0, y:0, z:0}, {x:1, y:0, z:0}, listLine, clipped); break; //Right
				case 3: line.clipAgainstPlane({x:WIDTH - 1, y:0, z:0}, {x:-1, y:0, z:0}, listLine, clipped); break; //Left
			}
			listLine = clipped;
		}
		setPixelLine(listLine.p[0].x, listLine.p[0].y, listLine.p[1].x, listLine.p[1].y, listLine.t[0].w, listLine.t[1].w, listLine.brightness);
	}
	
	// Draws canvas
	ctx.putImageData(backbuffer, 0, 0);
	
	ctx.beginPath();
	ctx.fillStyle = 'red';
	ctx.fillRect(WIDTH/2,HEIGHT/2, 1, 1);
	ctx.closePath();
	
	// Calculate Average FPS
	/*if (fpsList.length <= 60) {
		if (dt) fpsList.push(1/dt);
	} else {
		fpsList.shift();
		fpsList.push(1/dt);
	}
	var fpsTotal = 0;
	for (var i in fpsList) fpsTotal += fpsList[i];
	var fps = fpsTotal/fpsList.length;
	fps = fps.toFixed(3);
	var S_fps = 1000/currentTimestep;
	var S_average = 1000/timestep;
	S_fps = S_fps.toFixed(3);
	S_average = S_average.toFixed(3);
	
	infoPanel.innerHTML = 'FPS '+(1/dt).toFixed(3)+'<br>'+'AVG '+fps+'<br><brightness>'+'SER '+S_fps+'<br>'+'AVG '+S_average+'<br></brightness>'+
	'<a>Camera Position:<br> {x: '+camera.pos.x.toFixed(1)+' y: '+camera.pos.y.toFixed(1)+' z: '+camera.pos.z.toFixed(1)+'}<br>'+
	'Camera Rotation:<br> [w: '+camera.rot.w.toFixed(2)+', <br>{x: '+camera.rot.x.toFixed(2)+' y: '+camera.rot.y.toFixed(2)+' z: '+camera.rot.z.toFixed(2)+'}]<br>'+'</a>'+
	'Interpolation: ' + interpolate_V;*/
}

var fpsList = new Array();
var lastUpdate = performance.now();
var dt;
function update() {
	var now = performance.now();
	dt = (now - lastUpdate);
	dt /= 1000;
	lastUpdate = now;
	
	draw();
	
	window.requestAnimationFrame(update);
}
update();

document.onkeydown = function(e) {
	//e.preventDefault();
	input.keys[e.keyCode] = true;
	if (input.keys[86]) showV = !showV; //v
	if (input.keys[66]) showI = !showI; //b
	if (input.keys[77]) showW = !showW; //m
	if (input.keys[73]) interpolate_V = !interpolate_V; //i
	//if (input[74]) //j
	//if (input[75]) //k
	if (input.keys[76]) {
		Scontrols = !Scontrols; //l
	}
	if (input.keys[79]) showOct = !showOct; //o
}
document.onkeyup = function(e) {
	input.keys[e.keyCode] = false;
}
document.onmousedown = function(e) {
	input.mouse[e.button] = true;
	if (input.mouse[0] && Scontrols) {
		//socket.emit('shoot');
	}
	if (input.mouse[2]) { 
		px = e.clientX; py = e.clientY;
	}
}
document.onmousemove = function(e) {
	input.mouse.x = e.clientX;
	input.mouse.y = e.clientY;
}
document.onmouseup = function(e) {
	input.mouse[e.button] = false;
}
/*document.onwheel = function(e) {
	if (!input.keys[17] && e.deltaY > 0) camera.pos = vec3d.subtract(camera.pos, vec3d.multiply(input.keys['vForward'], _speed * dt * 10)); //s
	if (!input.keys[17] && e.deltaY < 0) camera.pos = vec3d.add(camera.pos, vec3d.multiply(input.keys['vForward'], _speed * dt * 10)); //w
}*/
document.ontouchstart = function(e) {
	if (e.touches.length === 3) Scontrols = !Scontrols;
	if (e.touches.length === 2) camera.pos = vec3d.add(camera.pos, vec3d.multiply(input.keys['vForward'], 20 * dt));
	var touch1 = e.touches[0];
	var x1 = touch1.clientX;
	var y1 = touch1.clientY;
	var x2, y2;
	document.ontouchmove = function(e) {
		var touch2 = e.touches[0];
		x2 = touch2.clientX;
		y2 = touch2.clientY;
		var dx = x2 - x1, dy = y2 - y1;
		camera.touchControl(dx, dy);
		x1 = x2;
		y1 = y2;
	}
	document.ontouchend = function(e) {
		document.ontouchmove = null;
		document.ontouchend = null;
	}
}
document.oncontextmenu = function(e) {
	e.preventDefault();
}
