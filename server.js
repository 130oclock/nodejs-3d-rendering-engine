/*To Do List
 * ? Projects
 * [Done] Boids
 * [Done] Octree
 * [Done] Inverse Kinematics
 * AABBCC collision
*/

// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var app = express();
var server = http.Server(app);
var io = socketIO(server);
var port_ = 2000;

app.set('port', port_);
app.use('/public', express.static(__dirname + '/public'));

// Routing
app.get('/', function(request, response) {
	response.sendFile(path.join(__dirname, 'public/client.html'));
});
app.get('/planet', function(request, response) {
	response.sendFile(path.join(__dirname, 'public/planetGen/planetClient.html'));
	console.log('a user connected to planet generator');
});
app.get('/ant', function(request, response) {
	response.sendFile(path.join(__dirname, 'public/simulations/LangtonsAnt.html'));
	console.log("a user connected to Langton's ant");
});
app.get('/tree', function(request, response) {
	response.sendFile(path.join(__dirname, 'public/simulations/Quadtree.html'));
	console.log("a user connected to Quadtree");
});
app.get('/mandelbrot', function(request, response) {
	response.sendFile(path.join(__dirname, 'public/simulations/Mandelbrot Set.html'));
	console.log("a user connected to Mandelbrot");
});

// Starts the server.
server.listen(port_, function() {
	console.log('Starting server on port ' + port_);
});

// Basic classes
class vec3d {
	constructor(x = 0, y = 0, z = 0, w = 1) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}
}
vec3d.copy = function(v) {
	return new vec3d(v.x, v.y, v.z);
}
vec3d.matrix_MultiplyVector = function(m, i) {
	var v = new vec3d();
	v.x = (i.x * m.m[0][0]) + (i.y * m.m[1][0]) + (i.z * m.m[2][0]) + (i.w * m.m[3][0]);
	v.y = (i.x * m.m[0][1]) + (i.y * m.m[1][1]) + (i.z * m.m[2][1]) + (i.w * m.m[3][1]);
	v.z = (i.x * m.m[0][2]) + (i.y * m.m[1][2]) + (i.z * m.m[2][2]) + (i.w * m.m[3][2]);
	v.w = (i.x * m.m[0][3]) + (i.y * m.m[1][3]) + (i.z * m.m[2][3]) + (i.w * m.m[3][3]);
	return v;
}
vec3d.add = function(v1, v2) {
	return {x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z, w: 1};
}
vec3d.subtract = function(v1, v2) {
	return {x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z, w: 1};
}
vec3d.multiply = function(v1, k) {
	return {x: v1.x * k, y: v1.y * k, z: v1.z * k, w: 1};
}
vec3d.divide = function(v1, k) {
	return {x: v1.x / k, y: v1.y / k, z: v1.z / k, w: 1};
}
vec3d.distance = function(v1, v2) {
	var dx = v1.x - v2.x;
	var dy = v1.y - v2.y;
	var dz = v1.z - v2.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
vec3d.lerp = function(v1, v2, value) {
	return {x: (1 - value) * v1.x + value * v2.x, y: (1 - value) * v1.y + value * v2.y, z: (1 - value) * v1.z + value * v2.z, w: 1};
}
vec3d.crossProduct = function(v1, v2) {
	var v = new vec3d();
	v.x = v1.y * v2.z - v1.z * v2.y;
	v.y = v1.z * v2.x - v1.x * v2.z;
	v.z = v1.x * v2.y - v1.y * v2.x;
	return v;
}
function v_dotProduct(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}
vec3d.mag = function(v) {
	return Math.sqrt(v_dotProduct(v, v));
}
vec3d.normalize = function(v) {
	var l = vec3d.mag(v);
	return {x: v.x / l, y: v.y / l, z: v.z / l, w: 1};
}
vec3d.limit = function(v, limit) {
	var lengthSquared = (v.x * v.x) + (v.y * v.y) + (v.z * v.z);
	if ((lengthSquared > limit * limit) && lengthSquared > 0) {
		var ratio = limit / Math.sqrt(lengthSquared);
		v.x *= ratio;
		v.y *= ratio;
		v.z *= ratio;
	}
}
vec3d.orthoNormal = function(normal, tangent) { //makes tangent orthogonal to normal
	var n = vec3d.normalize(normal);
	var dot = v_dotProduct(tangent, n);
	var proj = vec3d.multiply(n, dot);
	var t = vec3d.subtract(tangent, proj);
	t = vec3d.normalize(t);
	normal.x = n.x;
	normal.y = n.y;
	normal.z = n.z;
	tangent.x = t.x;
	tangent.y = t.y;
	tangent.z = t.z;
}
class mat4x4 {
	constructor() {
		this.m =
	   [[0,0,0,0,],
		[0,0,0,0,],
		[0,0,0,0,],
		[0,0,0,0,]];
	}
}
mat4x4.matrix_PointAt = function(pos, target, up) {
	// Calculate new forward direction
	var newForward = vec3d.subtract(target, pos);
	newForward = vec3d.normalize(newForward);

	// Calculate new up direction
	var a = vec3d.multiply(newForward, v_dotProduct(up, newForward));
	var newUp = vec3d.subtract(up, a);
	newUp = vec3d.normalize(newUp);

	var newRight = vec3d.crossProduct(newUp, newForward);

	var matrix = new mat4x4();
	matrix.m[0][0] = newRight.x;	matrix.m[0][1] = newRight.y;	matrix.m[0][2] = newRight.z;	matrix.m[0][3] = 0;
	matrix.m[1][0] = newUp.x;		matrix.m[1][1] = newUp.y;		matrix.m[1][2] = newUp.z;		matrix.m[1][3] = 0;
	matrix.m[2][0] = newForward.x;	matrix.m[2][1] = newForward.y;	matrix.m[2][2] = newForward.z;	matrix.m[2][3] = 0;
	matrix.m[3][0] = pos.x;			matrix.m[3][1] = pos.y;			matrix.m[3][2] = pos.z;			matrix.m[3][3] = 0;
	return matrix;
}
mat4x4.matrix_QuickInverse = function(m) {
	var matrix = new mat4x4();
	matrix.m[0][0] = m.m[0][0]; matrix.m[0][1] = m.m[1][0]; matrix.m[0][2] = m.m[2][0]; matrix.m[0][3] = 0;
	matrix.m[1][0] = m.m[0][1]; matrix.m[1][1] = m.m[1][1]; matrix.m[1][2] = m.m[2][1]; matrix.m[1][3] = 0;
	matrix.m[2][0] = m.m[0][2]; matrix.m[2][1] = m.m[1][2]; matrix.m[2][2] = m.m[2][2]; matrix.m[2][3] = 0;
	matrix.m[3][0] = -(m.m[3][0] * matrix.m[0][0] + m.m[3][1] * matrix.m[1][0] + m.m[3][2] * matrix.m[2][0]);
	matrix.m[3][1] = -(m.m[3][0] * matrix.m[0][1] + m.m[3][1] * matrix.m[1][1] + m.m[3][2] * matrix.m[2][1]);
	matrix.m[3][2] = -(m.m[3][0] * matrix.m[0][2] + m.m[3][1] * matrix.m[1][2] + m.m[3][2] * matrix.m[2][2]);
	matrix.m[3][3] = 1;
	return matrix;
}
mat4x4.rotation_To_Vector = function(matrix) {
	var r_11 = matrix.m[0][0], r_12 = matrix.m[0][1], r_13 = matrix.m[0][2],
		r_21 = matrix.m[1][0], r_22 = matrix.m[1][1], r_23 = matrix.m[1][2],
		r_31 = matrix.m[2][0], r_32 = matrix.m[2][1], r_33 = matrix.m[2][2];
	var a = Math.atan(r_21 / r_11);
	var b = Math.atan(-r_31 / Math.sqrt((r_32 * r_32) + (r_33 * r_33)));
	var y = Math.atan(r_32 / r_33);
	/*var a = Math.atan2(-r_31, r_11);
	var b = Math.asin(r_21);
	var y = Math.atan2(-r_23, r_22);*/
	return new vec3d(a, b, y);
}

class triangle {
	constructor(vec1 = [0,0,0], vec2 = [0,0,0], vec3 = [0,0,0]) {
		var _vec1 = new vec3d(vec1[0], vec1[1], vec1[2]);
		var _vec2 = new vec3d(vec2[0], vec2[1], vec2[2]);
		var _vec3 = new vec3d(vec3[0], vec3[1], vec3[2]);

		this.vects = [_vec1, _vec2, _vec3];
	}
	copyVec(num) {
		var vec = new vec3d(this.vects[num].x, this.vects[num].y, this.vects[num].z);

		return vec;
	}
}

class Quaternion {
	constructor(a, b, c, d) {
		// q = w + (x * i) + (y * j) + (z * k)
		this.w = a || 1;
		this.x = b || 0; //i
		this.y = c || 0; //j
		this.z = d || 0; //k
	}
	
	getForwardVector() {
		var x = 2 * ((this.x * this.z) + (this.w * this.y)),
		y = 2 * ((this.y * this.z) - (this.w * this.x)),
		z = 1 - (2 * ((this.x * this.x) + (this.y * this.y)));
		return new vec3d(x, y, z);
	}
	getUpVector() {
		var x = 2 * ((this.x * this.y) - (this.w * this.z)),
		y = 1 - (2 * ((this.x * this.x) + (this.z * this.z))),
		z = 2 * ((this.y * this.z) + (this.w * this.x));
		return new vec3d(x, y, z);
	}
	getRightVector() {
		var x = 1 - (2 * ((this.y * this.y) + (this.z * this.z))),
		y = 2 * ((this.x * this.y) + (this.w * this.z)),
		z = 2 * ((this.x * this.z) - (this.w * this.y));
		return new vec3d(x, y, z);
	}
}
Quaternion.copy = function(q) {
	return new Quaternion(q.w, q.x, q.y, q.z);
}
Quaternion.dotProduct = function(q1, q2) {
	return q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
}
Quaternion.magnitude = function(q) {
	return Math.sqrt((q.w * q.w) + (q.x * q.x) + (q.y * q.y) + (q.z * q.z));
}
Quaternion.normalize = function(q) {
	var magnitude = Quaternion.magnitude(q);
	q.w /= magnitude;
	q.x /= magnitude;
	q.y /= magnitude;
	q.z /= magnitude;
} 
Quaternion.add = function(q1, q2) {
	return new Quaternion(q1.w + q2.w, q1.x + q2.x, q1.y + q2.y, q1.z + q2.z);
}
Quaternion.subtract = function(q1, q2) {
	return new Quaternion(q1.w - q2.w, q1.x - q2.x, q1.y - q2.y, q1.z - q2.z);
}
Quaternion.multiply = function(q1, q2) {
	var a = (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z),
	b = (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y),
	c = (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x),
	d = (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w);
	return new Quaternion(a, b, c, d);
}
Quaternion.conjugate = function(q) {
	return new Quaternion(q.w, -q.x, -q.y, -q.z);
}
Quaternion.localRotation = function(axis, angle) {
	var local_rotation = new Quaternion();
	var angleHalf = angle/2;
	local_rotation.w = Math.cos(angleHalf);
	local_rotation.x = axis.x * Math.sin(angleHalf);
	local_rotation.y = axis.y * Math.sin(angleHalf);
	local_rotation.z = axis.z * Math.sin(angleHalf);
	return local_rotation;
}
Quaternion.rotate = function(q, axis, angle) {
	var local_rotation = Quaternion.localRotation(axis, angle);
	var total = Quaternion.multiply(local_rotation, q);
	return total;
}
Quaternion.lookAt = function(pos, target) {
	var forward = vec3d.normalize(vec3d.subtract(target, pos));
	var dot = v_dotProduct(new vec3d(0, 0, 1), forward);
	
	if (Math.abs(dot - (-1.0)) < 0.000001) {
		return new Quaternion(Math.PI, 0, 1, 0);
	}
	if (Math.abs(dot - (1.0)) < 0.000001) {
		return new Quaternion();
	}
	
	var angle = Math.acos(dot);
	var axis = vec3d.normalize(vec3d.crossProduct(new vec3d(0, 0, 1), forward));
	var quat = Quaternion.localRotation(axis, angle);
	Quaternion.normalize(quat);
	return quat;
}
Quaternion.lookRotation = function(pos, target, upDir) {
	var forward = vec3d.normalize(vec3d.subtract(target, pos));
	var up = vec3d.normalize(upDir);
	vec3d.orthoNormal(forward, up);
	var right = vec3d.crossProduct(up, forward);
	
	var ret = new Quaternion();
	ret.w = Math.sqrt(1 + right.x + up.y + forward.z) * 0.5;
	var w4_recip = 1 / (4 * ret.w);
	ret.x = (up.z - forward.y) * w4_recip;
	ret.y = (forward.x - right.z) * w4_recip;
	ret.z = (right.y - up.x) * w4_recip;
	return ret;
}
Quaternion.slerp = function(_q1, _q2, t) {
	var q1 = new Quaternion(_q1.w, _q1.x, _q1.y, _q1.z);
	var q2 = new Quaternion(_q2.w, _q2.x, _q2.y, _q2.z);
	Quaternion.normalize(q1);
	Quaternion.normalize(q2);
	
	var dot = Quaternion.dotProduct(q1, q2);
	var w1 = q1.w, x1 = q1.x, y1 = q1.y, z1 = q1.z;
	var w2 = q2.w, x2 = q2.x, y2 = q2.y, z2 = q2.z;
	
	if (dot < 0) {
		w1 = -w1;
		x1 = -x1;
		y1 = -y1;
		z1 = -z1;
		dot = -dot;
	}
	
	const DOT_THRESHOLD = 0.9995;
	if (dot > DOT_THRESHOLD) {
		var result = new Quaternion(w1 + t * (w2 - w1), x1 + t * (x2 - x1), y1 + t * (y2 - y1), z1 + t * (z2 - z1));
		Quaternion.normalize(result);
		return result;
	}
	
	var theta_0 = Math.acos(dot);
	var sin_theta_0 = Math.sin(theta_0);
	
	var theta = theta_0 * t;
	var sin_theta = Math.sin(theta);
	var cos_theta = Math.cos(theta);
	
	var s0 = cos_theta - dot * sin_theta / sin_theta_0;
	var s1 = sin_theta / sin_theta_0;
	
	var result = new Quaternion(s0 * w1 + s1 * w2, s0 * x1 + s1 * x2, s0 * y1 + s1 * y2, s0 * z1 + s1 * z2);
	return result
}
Quaternion.generateMatrix = function(q, pos) {
	var w = q.w, x = q.x, y = q.y, z = q.z;
	var sqw = w * w, sqx = x * x, sqy = y * y, sqz = z * z;
	/*var s = 1 / (sqx + sqy + sqz + sqw);
	s *= 2;*/
	var mat = new mat4x4();
	mat.m[0][0] = 1 - (2 * sqy) - (2 * sqz);
	mat.m[0][1] = (2 * x * y) - (2 * w * z);
	mat.m[0][2] = (2 * x * z) + (2 * w * y);
	mat.m[1][0] = (2 * x * y) + (2 * w * z);
	mat.m[1][1] = 1 - (2 * sqx) - (2 * sqz);
	mat.m[1][2] = (2 * y * z) - (2 * w * x);
	mat.m[2][0] = (2 * x * z) - (2 * w * y);
	mat.m[2][1] = (2 * y * z) + (2 * w * x);
	mat.m[2][2] = 1 - (2 * sqx) - (2 * sqy);
	mat.m[3][3] = 1;
	if (pos) {
		mat.m[3][0] = pos.x;
		mat.m[3][1] = pos.y;
		mat.m[3][2] = pos.z;
	}
	return mat;
}

class Mesh {
	constructor(src, id = Math.random()) {
		this.id = id;
		this.src = src;

		Mesh.list[id] = this;
	}
}
Mesh.list = {};

class Collider {
	constructor(min = new vec3d(), max = new vec3d()) {
		this.min = min;
		this.max = max;
	}

	pointIntersect(p, pos) {
		return (p.x >= this.min.x + pos.x && p.x <= this.max.x + pos.x) &&
			(p.y >= this.min.y + pos.y && p.y <= this.max.y + pos.y) &&
			(p.z >= this.min.z + pos.z && p.z <= this.max.z + pos.z);
	}
	intersect(a, apos, avel, bpos, bvel) {
		if (a.min.x + avel.x <= this.max.x + bvel.x && a.max.x + avel.x >= this.min.x + bvel.x && 
			a.min.y + avel.y <= this.max.y + bvel.y && a.max.y + avel.y >= this.min.y + bvel.y &&
			a.min.z + avel.z <= this.max.z + bvel.z && a.max.z + avel.z >= this.min.z + bvel.z) {
			if (a.min.z + apos.z > this.max.z + bpos.z || a.max.z + apos.z < this.min.z + bpos.z) return 'z';
			else if (a.min.y + apos.y > this.max.y + bpos.y || a.max.y + apos.y < this.min.y + bpos.y) return 'y';
			else if (a.min.x + apos.x > this.max.x + bpos.x || a.max.x + apos.x < this.min.x + bpos.x) return 'x';
		}
		return false;
	}
}

class Prefab {
	constructor(id, mesh, collider = new Collider()) {
		this.mesh = mesh;
		this.collider = collider;

		this.id = id;
		Prefab.list[this.id] = this;
	}
}
Prefab.list = {};

class Object {
	constructor(prefab, pos, rot, scale = new vec3d()) {
		this.mesh = prefab.mesh;
		this.scale = scale;
		this.collider = prefab.collider;
		this.pos = pos || new vec3d();
		this.vel = new vec3d();
		this.acc = new vec3d();
		this.rot = rot || new Quaternion();
		this.vRot = new Quaternion();
		this.aRot = new Quaternion();
	}

	initData() {
		return {
			id: this.id,
			scale: this.scale,
			pos: this.pos,
			rot: this.rot,
			vel: this.vel,
			mesh: this.mesh,
		};
	}

	updateData() {
		return {
			id: this.id,
			pos: this.pos,
			rot: this.rot,
			vel: this.vel,
		};
	}
}

class Line {
	constructor(v1, v2) {
		this.id = Math.random();
		this.v1 = v1;
		this.v2 = v2;
		
		Line.list[this.id] = this;
		init.lines.push(this.initData());
	}
	
	remove() {
		delete Line.list[this.id];
		remove.lines.push(this.id);
	}
	
	initData() {
		return {
			id: this.id,
			v1: this.v1,
			v2: this.v2,
		};
	}
}
Line.list = {};
Line.getAllInit = function() {
	var data = [];
	for (var i in Line.list) {
		var line = Line.list[i];
		data.push(line.initData());
	}
	return data;
}

// Advanced classes
class Static extends Object {
	constructor(prefab, pos, rot, scale, script, id = Math.random()) {
		super(Prefab.list[prefab], pos, rot, scale);
		this.id = id;
		this.script = script;
		this.value;

		Static.list[id] = this;
		init.statics.push(this.initData());
	}

	remove() {
		delete Static.list[this.id];
		remove.statics.push(this.id);
	}

	update() {
		if (this.script) this.script.call(this);

		var acc_T = vec3d.multiply(this.acc, dt);
		this.vel = vec3d.add(acc_T, this.vel);
		var vel_T = vec3d.multiply(this.vel, dt);
		this.pos = vec3d.add(vel_T, this.pos);
		
		this.rot = Quaternion.multiply(this.rot, this.vRot);
	}
}
Static.list = {};
Static.getAllInit = function() {
	var data = [];
	for (var i in Static.list) {
		var static = Static.list[i];
		data.push(static.initData());
	}
	return data;
}
Static.update = function() {
	var data = [];
	for (var i in Static.list) {
		var static = Static.list[i];
		static.update();
		data.push(static.updateData());
	}
	return data;
}

class Projectile extends Object {
	constructor(prefab, pos, rot, scale, script, id = Math.random()) {
		super(Prefab.list[prefab], pos, rot, scale);
		this.id = id;
		this.script = script;
		this.lifeTime = 5;

		Projectile.list[id] = this;
		init.projectiles.push(this.initData());
	}

	remove() {
		delete Projectile.list[this.id];
		remove.projectiles.push(this.id);
	}

	update() {
		if (this.script) this.script.call(this);
		this.lifeTime -= dt;
		if (this.lifeTime < 0) this.remove(); 

		var acc_T = vec3d.multiply(this.acc, dt);
		this.vel = vec3d.add(acc_T, this.vel);
		var vel_T = vec3d.multiply(this.vel, dt);
		this.pos = vec3d.add(vel_T, this.pos);
		
		this.rot = Quaternion.multiply(this.rot, this.vRot);
	}
}
Projectile.list = {};
Projectile.getAllInit = function() {
	var data = [];
	for (var i in Projectile.list) {
		var proj = Projectile.list[i];
		data.push(proj.initData());
	}
	return data;
}
Projectile.update = function() {
	var data = [];
	for (var i in Projectile.list) {
		var proj = Projectile.list[i];
		proj.update();
		data.push(proj.updateData());
	}
	return data;
}

class Player {
	constructor(id, prefab, pos, child) {
		this.id = id;
		
		this.pos = pos;
		this.vel = new vec3d();
		this.acc = new vec3d();
		this.rot = new Quaternion();
		
		this.child = child;
		if (this.child) this.childId = this.child.id;
		
		this.speed = 30;
		this.rotSpeed = 0.5;
		//this.mesh = Prefab.list[prefab].mesh;
		
		Player.list[id] = this;
		init.players.push(this.initData());
	}
	
	remove() {
		delete Static.list[this.childId];
		remove.statics.push(this.childId);
		delete Player.list[this.id];
		remove.players.push(this.id);
	}
	
	shoot() {
		var p = new Projectile('cube', this.pos, this.rot);
		var vel = Quaternion.conjugate(this.rot).getForwardVector();
		p.vel = vec3d.multiply(vel, 100);
	}
	move(input, camera) { //, pos, rot) {
		var camRot = Quaternion.copy(camera.rot);
		var camUp = camRot.getUpVector();
		var camForward = camRot.getForwardVector();
		
		var mouseForward = camera.mouseVector;
		
		/*var targetPos = vec3d.add(vec3d.add(camera.pos, vec3d.multiply(camUp, -3)), vec3d.multiply(camForward, 7));
		//if (vec3d.distance(targetPos, this.pos) > 0) { 
			this.vel = vec3d.subtract(targetPos, this.pos);
			this.vel = vec3d.multiply(this.vel, camera.moveSpeed);
		/*} else {
			this.vel = vec3d.multiply(this.vel, 0);
		}*/
		
		var lookTarget = vec3d.add(vec3d.multiply(mouseForward, 100), camera.pos);
		//var lookTarget = vec3d.add(vec3d.multiply(camForward, 100), camera.pos);
		//var look = Quaternion.conjugate(Quaternion.lookAt(this.pos, lookTarget));
		var look = Quaternion.conjugate(Quaternion.lookRotation(this.pos, lookTarget, camUp));
		this.rot = look;
		//this.rot = Quaternion.slerp(Quaternion.conjugate(camRot), this.rot, dt);
		this.child.rot = this.rot;
		
		/*var camRot = new Quaternion(camera.rot.w, camera.rot.x, camera.rot.y, camera.rot.z);
		var target = vec3d.add(vec3d.multiply(camRot.getForwardVector(), 10), camera.pos);
		
		this.child.rot = Quaternion.slerp(this.child.rot, this.rot, dt); //Quaternion.lookAt(this.pos, target);*/
		
		var rot = Quaternion.conjugate(this.rot);
		var up = rot.getUpVector(), forward = rot.getForwardVector(), right = rot.getRightVector();
		var speed = this.speed;
		if (input[16]) speed *= 2;

		if (input[32]) this.vel = vec3d.multiply(forward, speed); //vec3d.add(this.vel, ); //space
		if (input[83]) this.pos = vec3d.subtract(this.pos, vec3d.multiply(forward, 5 * dt)); //s
		if (input[87]) this.pos = vec3d.add(this.pos, vec3d.multiply(forward, 5 * dt)); //w
		if (input[68]) this.pos = vec3d.subtract(this.pos, vec3d.multiply(right, 5 * dt)); //d
		if (input[65]) this.pos = vec3d.add(this.pos, vec3d.multiply(right, 5 * dt)); //a
		
		/*if (input[83]) rot = Quaternion.rotate(rot, right, -this.rotSpeed); //s
		if (input[87]) rot = Quaternion.rotate(rot, right, this.rotSpeed); //w
		if (input[81]) rot = Quaternion.rotate(rot, forward, -this.rotSpeed); //q
		if (input[69]) rot = Quaternion.rotate(rot, forward, this.rotSpeed); //e
		if (input[68]) rot = Quaternion.rotate(rot, up, -this.rotSpeed); //d
		if (input[65]) rot = Quaternion.rotate(rot, up, this.rotSpeed); //a
		//if (input[70]) rot = Quaternion.rotate(rot, right, 0.5 * dt); //f
		//if (input[82]) rot = Quaternion.rotate(rot, right, -0.5 * dt); //r
		if (input[88]) this.rot = new Quaternion() //x
		
		this.rot = Quaternion.slerp(this.rot, Quaternion.conjugate(rot), dt);*/
	}
	
	update() {
		/*this.vel = vec3d.multiply(this.vel, 0.95);
		if (vec3d.mag(this.vel) <= 0.05) this.vel = vec3d.multiply(this.vel, 0);*/
		var vel_T = vec3d.multiply(this.vel, dt);
		this.pos = vec3d.add(vel_T, this.pos);
		if (this.child) this.child.pos = this.pos;
		
		//if (this.child) this.child.pos = vec3d.add(vel_T, this.pos);
		
		this.acc = vec3d.multiply(this.acc, 0);
	}
	
	initData() {
		return {
			id: this.id,
			pos: this.pos,
			rot: this.rot,
			vel: this.vel,
			childId: this.childId,
			mesh: this.mesh,
		};
	}

	updateData() {
		return {
			id: this.id,
			pos: this.pos,
			rot: this.rot,
			vel: this.vel,
		};
	}
}
Player.list = {};
Player.onConnect = function(socket) {
	var pos = new vec3d(0, 0, 0);
	var player = new Player(socket.id, '', pos, new Static('spaceshipA', pos));
	//var player = new Player(socket.id, 'boid', pos);
	if (player) {
		socket.emit('selfid', socket.id);
		socket.on('keyPress', function(input, pos, rot) {
			player.move(input, pos, rot);
		});
		socket.on('shoot', function() {
			player.shoot();
		});
	}
}
Player.getAllInit = function() {
	var data = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		data.push(player.initData());
	}
	return data;
}
Player.update = function() {
	var data = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		player.update();
		data.push(player.updateData());
	}
	return data;
}

		/*for (var o in Static.list) {
			var obj = Static.list[o];
			var col = this.collider.intersect(obj.collider, obj.pos, vec3d.add(obj.vel, obj.pos), this.pos, vec3d.add(this.vel, this.pos));
			if (col == 'x') this.vel.x = 0;
			if (col == 'y') this.vel.y = 0;
			if (col == 'z') this.vel.z = 0;
		}
		for (var o in Player.list) {
			var obj = Player.list[o];
			if (obj.id == this.id) continue;
			var col = this.collider.intersect(obj.collider, obj.pos, vec3d.add(obj.vel, obj.pos), this.pos, vec3d.add(this.vel, this.pos));
			if (col == 'x') this.vel.x = 0;
			if (col == 'y') this.vel.y = 0;
			if (col == 'z') this.vel.z = 0;
		}*/

// Meshes
new Mesh('/public/models/cube.obj','cube');
new Mesh('/public/models/plane.obj','plane');
new Mesh('/public/models/boid.obj', 'boid');
new Mesh('/public/models/octahedron.obj','octahedron');
new Mesh('/public/models/dodecahedron.obj','dodecahedron');
new Mesh('/public/models/utahTeapot.obj','teapot');
new Mesh('/public/models/SuperMario64.obj', 'mario');
new Mesh('/public/models/worm.obj','worm');

new Mesh('/public/models/spaceshipM.obj','spaceship');
new Mesh('/public/models/spaceShipA.obj','spaceshipA');

// Prefabs
new Prefab('cube', Mesh.list['cube'], new Collider(new vec3d(-0.5, -0.5, -0.5), new vec3d(0.5, 0.5, 0.5)));
new Prefab('boid', Mesh.list['boid'], new Collider(new vec3d(-0.5, -0.5, -0.5), new vec3d(0.5, 0.5, 0.5)));
new Prefab('octahedron', Mesh.list['octahedron'], new Collider(new vec3d(-0.5, -0.5, -0.5), new vec3d(0.5, 0.5, 0.5)));
new Prefab('dodecahedron', Mesh.list['dodecahedron'], new Collider(new vec3d(-0.5, -0.5, -0.5), new vec3d(0.5, 0.5, 0.5)));
new Prefab('teapot', Mesh.list['teapot'], new Collider(new vec3d(-1, -1, -1), new vec3d(1, 1, 1)));
new Prefab('mario', Mesh.list['mario'], new Collider(new vec3d(-1, 0, -1), new vec3d(1, 4.75, 1)));
new Prefab('plane', Mesh.list['plane'], new Collider(new vec3d(-0.5 * 4, -0.05, -0.5 * 4)));
new Prefab('worm', Mesh.list['worm']);

new Prefab('spaceship', Mesh.list['spaceship']);
new Prefab('spaceshipA', Mesh.list['spaceshipA']);

io.on('connection', function(socket) {
	console.log('a user connected:', socket.id, new Date());
	socket.on('new player', function() {
		console.log('a player connected:', socket.id);
		Player.onConnect(socket);
		socket.emit('init', {
			meshes: Mesh.list,
			lines: Line.getAllInit(),
			players: Player.getAllInit(),
			projectiles: Projectile.getAllInit(),
			statics: Static.getAllInit(),
		});
	});
	socket.on('disconnect', function() {
		if (Player.list[socket.id])
			Player.list[socket.id].remove();
		console.log('a user disconnected:', socket.id);
	});
});

var init = {lines: [], statics: [], projectiles: [], players: []};
var remove = {lines: [], statics: [], projectiles: [], players: [], };

function randCoord(n) {
	return (Math.random() * n) - (n/2);
}
// Create here

/*new Static('mario', new vec3d(0, 0, 7), new Quaternion(), function() {
	this.vRot = Quaternion.localRotation(new vec3d(0, 1, 0), dt);
});*/
/*new Static('teapot', new vec3d(0, -0.5, 10), new Quaternion(), function() {
	this.vRot = Quaternion.localRotation(new vec3d(0, 1, 0), dt);
});*/
//new Static('cube', new vec3d(0, 0, 7));
//new Static('spaceship', new vec3d(0, 0, 7));
//new Static('cube', new vec3d(0, 0, 0), null, new vec3d(-100, -100, -100));
//new Static('plane', new vec3d(0, -4, 0));


// Arms -------------------------------
class Arm {
	constructor(pos, rot, head, mid, tail, length, numOfSegs, target) {
		this.id = Math.random();
		this.segs = [];
		this.targetobject = target;
		this.target;
		
		this.segs.push(new Segment(head, pos, length, rot));
		for (var i = 1; i <= numOfSegs; i++) {
			var previous = this.segs[i-1];
			
			var pos = previous.calcB(previous.realRot);
			
			var current;
			if (i != numOfSegs) current = new MidSegment(mid, pos, length, rot);
			else current = new MidSegment(tail, pos, length, rot);
			current.child = previous;
			previous.parent = current;
			
			this.segs.push(current);
			
			Arm.list[this.id] = this;
		}
	}
	update() {
		if (this.targetobject) this.target = this.targetobject.pos;
		this.segs.forEach((n, i) => {
			if (i == 0 && this.target) n.follow(this.target);
			n.update();
		});
	}
}
Arm.list = {};
Arm.update = function() {
	for (var i in Arm.list) {
		var arm = Arm.list[i];
		arm.update();
	}
}
class Segment extends Static {
	constructor(prefab, start = new vec3d(), length = 1, rot = new Quaternion()) {
		super(prefab, start, rot);
		this.pos = start;
		this.length = length;
		this.child;
		
		this.b;
	}
	update() {
		this.b = this.calcB();
		//io.sockets.emit('line', this.pos, this.b, false);
	}
	follow(target) {
		var dir = vec3d.subtract(target, this.pos);
		dir = vec3d.normalize(dir);
		dir = vec3d.multiply(dir, this.length);
		this.pos = vec3d.add(target, new vec3d(-dir.x, -dir.y, -dir.z));
		this.rot = Quaternion.conjugate(Quaternion.lookAt(this.pos, target));
	}
	calcB() {
		var worldMat = Quaternion.generateMatrix(this.rot, this.pos);
		var b = vec3d.matrix_MultiplyVector(worldMat, new vec3d(0, 0, this.length));
		return b;
	}
}
class MidSegment extends Segment {
	constructor(prefab, start, length, rot) {
		super(prefab, start, length, rot);
		this.parent;
	}
	update() {
		this.follow(this.child.pos);
		this.b = this.calcB();
	}
}

// OCTREE -----------------------------
class Octree {
	constructor(k, minSize, pos, size, O = []) {
		this.threshold = k;
		this.objects = O;
		this.minSize = minSize;
		this.root = new Node(pos, size, this.objects, minSize);
		
		Octree.list.push(this);
	}
	subdivide() {
		this.root.children = Octree.recursive_subdivide(this.root, this.threshold);
	}
	draw() {
		this.root.draw();
		var nodes = Node.findChildren(this.root);
		nodes.forEach((n) => {
			n.draw();
		});
	}
}
Octree.list = [];
Octree.update = function() {
	for (var i in Octree.list) {
		var tree = Octree.list[i];
		tree.subdivide();
	}
}
class Node {
	constructor(pos = new vec3d(), size = new vec3d(), points, min = 1) {
		this.pos = pos;
		this.size = size;
		this.points = points;
		this.min = min;
		this.children = [];
	}
	draw() {
		//io.sockets.emit('line', this.pos, vec3d.add(this.size, this.pos), true);
	}
}
Octree.recursive_subdivide = function(node, k) {
	if (node.points.length <= k) return [];
	if (node.size.x <= node.min || node.size.y <= node.min || node.size.z <= node.min) return [];
	
	var x_ = node.pos.x, y_ = node.pos.y, z_ = node.pos.z;
	var size_ = new vec3d(node.size.x/2, node.size.y/2, node.size.z/2);
	var Q1 = node.pos, Q2 = new vec3d(x_, y_ + size_.y, z_), Q3 = new vec3d(x_ + size_.x, y_, z_), Q4 = new vec3d(x_ + size_.x, y_ + size_.y, z_),
	Q5 = new vec3d(x_, y_, z_ + size_.z), Q6 = new vec3d(x_, y_ + size_.y, z_ + size_.z), Q7 = new vec3d(x_ + size_.x, y_, z_ + size_.z), Q8 = new vec3d(x_ + size_.x, y_ + size_.y, z_ + size_.z);
	
	var p = Node.contains(node, Q1, size_, node.points);
	var x1 = new Node(Q1, size_, p, node.min);
	x1.children = Octree.recursive_subdivide(x1, k);
	
	p = Node.contains(node, Q2, size_, node.points);
	var x2 = new Node(Q2, size_, p, node.min);
	x2.children = Octree.recursive_subdivide(x2, k);
	
	p = Node.contains(node, Q3, size_, node.points);
	var x3 = new Node(Q3, size_, p, node.min);
	x3.children = Octree.recursive_subdivide(x3, k);
	
	p = Node.contains(node, Q4, size_, node.points);
	var x4 = new Node(Q4, size_, p, node.min);
	x4.children = Octree.recursive_subdivide(x4, k);
	
	p = Node.contains(node, Q5, size_, node.points);
	var x5 = new Node(Q5, size_, p, node.min);
	x5.children = Octree.recursive_subdivide(x5, k);
	
	p = Node.contains(node, Q6, size_, node.points);
	var x6 = new Node(Q6, size_, p, node.min);
	x6.children = Octree.recursive_subdivide(x6, k);
	
	p = Node.contains(node, Q7, size_, node.points);
	var x7 = new Node(Q7, size_, p, node.min);
	x7.children = Octree.recursive_subdivide(x7, k);
	
	p = Node.contains(node, Q8, size_, node.points);
	var x8 = new Node(Q8, size_, p, node.min);
	x8.children = Octree.recursive_subdivide(x8, k);
	
	return [x1, x2, x3, x4, x5, x6, x7, x8];
}
Node.contains = function(node, pos, size, points) {
	var pts = [];
	for (var p in points) {
		var point = points[p];
		if (point.pos.x >= pos.x && point.pos.x <= pos.x + size.x && 
			point.pos.y >= pos.y && point.pos.y <= pos.y + size.y && 
			point.pos.z >= pos.z && point.pos.z <= pos.z + size.z) {
			//point.parent = node;
			pts.push(point);
		}
	}
	//io.sockets.emit('log', pts);
	return pts;
}
Node.findChildren = function(node) {
	if (!node.children.length) return [node];
	else {
		var c = [];
		node.children.forEach((child) => {
			c = c.concat(Node.findChildren(child));
		});
		return c;
	}
}
new Octree(2, 1, new vec3d(-50, -50, -50), new vec3d(100, 100, 100), Static.list);

// BOIDS ------------------------------
class Boid extends Static {
	constructor(prefab, pos, rot, scale, script, id = Math.random()) {
		super(prefab, pos, rot, scale, script);
		
		this.maxSpeed = 20;
		this.maxForce = 0.3;
		this.desiredSeparation = 25;
		this.neighborDist = 12;
		this.separation = 2;
		this.alignment = 2.3;
		this.cohesion = 2.5;
		
		Boid.list.push(this);
	}
	
	border(borderSize) {
		if(this.pos.x > borderSize) this.pos.x = -borderSize;
		if(this.pos.x < -borderSize) this.pos.x = borderSize;
		if(this.pos.y > borderSize) this.pos.y = -borderSize;
		if(this.pos.y < -borderSize) this.pos.y = borderSize;
		if(this.pos.z > borderSize) this.pos.z = -borderSize;
		if(this.pos.z < -borderSize) this.pos.z = borderSize;
	}
	
	flock() {
		var numOfBoids = 0;
		var numOfAvoid = 0;
		var averagePos = new vec3d();
		var averageVel = new vec3d();
		var steer = new vec3d();
		var average_pos, average_vel;
		for (var i in Boid.list) {
			var b = Boid.list[i];
			var d = vec3d.distance(this.pos, b.pos);
			if (d < this.neighborDist && d > 0) {
				numOfBoids++;
				averagePos = vec3d.add(averagePos, b.pos);
				averageVel = vec3d.add(averageVel, b.vel);
			}
			if (d < this.desiredSeparation && d > 0) {
				numOfAvoid++;
				let diff = vec3d.subtract(this.pos, b.pos);
				diff = vec3d.normalize(diff);
				diff = vec3d.divide(diff, d);
				steer = vec3d.add(diff, steer);
			}
		}
		if (numOfBoids > 0) {
			averagePos = vec3d.divide(averagePos, numOfBoids);
			average_pos = this.seek(averagePos); 
			
			averageVel = vec3d.divide(averageVel, numOfBoids);
			averageVel = vec3d.normalize(averageVel);
			averageVel = vec3d.multiply(averageVel, this.maxSpeed);
			average_vel = this.seek(averageVel);
			vec3d.limit(average_vel, this.maxForce);
		} else {
			average_pos = new vec3d();
			average_vel = new vec3d();
		}
		if (numOfAvoid > 0) {
			steer = vec3d.divide(steer, numOfAvoid);
		}
		if (vec3d.mag(steer) > 0) {
			steer = vec3d.normalize(steer);
			steer = vec3d.multiply(steer, this.maxSpeed);
			steer = vec3d.subtract(steer, this.vel);
			vec3d.limit(steer, this.maxForce);
		}
		
		average_pos = vec3d.multiply(average_pos, this.cohesion);
		average_vel = vec3d.multiply(average_vel, this.alignment);
		steer = vec3d.multiply(steer, this.separation);
		
		this.acc = vec3d.add(this.acc, average_pos);
		this.acc = vec3d.add(this.acc, average_vel);
		this.acc = vec3d.add(this.acc, steer);
	}
	
	seek(target) {
		let desired = vec3d.subtract(target, this.pos);
		desired = vec3d.normalize(desired);
		desired = vec3d.multiply(desired, this.maxSpeed);
		let steer =  vec3d.subtract(desired, this.vel);
		vec3d.limit(steer, this.maxForce);
		return steer;
	}

	update() {
		if (this.script) this.script.call(this);
		
		this.border(boxSize);
		
		this.flock();

		var acc_T = vec3d.multiply(this.acc, dt);
		this.acc = vec3d.multiply(this.acc, 0);
		this.vel = vec3d.add(acc_T, this.vel);
		var vel_T = vec3d.multiply(this.vel, dt);
		this.pos = vec3d.add(vel_T, this.pos);
		
		//var vRot_T = vec3d.multiply(this.vRot, dt);
		//this.rot = vec3d.add(vRot_T, this.rot);
		this.rot = Quaternion.conjugate(Quaternion.lookAt(new vec3d(), this.vel));
	}
}
Boid.list = [];
var boxSize = 50;
Boid.MakeFlock = function(num) {
	for (var h = num; h > 0; h--) {
		var o = new Boid('boid', new vec3d(randCoord(boxSize * 2), randCoord(boxSize * 2), randCoord(boxSize * 2))); 
		o.vel = vec3d.normalize(new vec3d(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1));
	}
}

//Boid.MakeFlock(100);
//for (var i = 0; i < 2; i++) new Arm(new vec3d(), new Quaternion(1, 0, 0, 0), 'worm', 'worm', 'octahedron', 1.5, 5, Boid.list[i]);

var a = boxSize;
new Line(new vec3d(a, a, a), new vec3d(a, -a, a));
new Line(new vec3d(a, a, -a), new vec3d(a, -a, -a));
new Line(new vec3d(-a, a, a), new vec3d(-a, -a, a));
new Line(new vec3d(-a, a, -a), new vec3d(-a, -a, -a));

new Line(new vec3d(a, a, a), new vec3d(-a, a, a));
new Line(new vec3d(a, a, -a), new vec3d(-a, a, -a));
new Line(new vec3d(a, -a, a), new vec3d(-a, -a, a));
new Line(new vec3d(a, -a, -a), new vec3d(-a, -a, -a));

new Line(new vec3d(a, a, a), new vec3d(a, a, -a));
new Line(new vec3d(-a, a, a), new vec3d(-a, a, -a));
new Line(new vec3d(a, -a, a), new vec3d(a, -a, -a));
new Line(new vec3d(-a, -a, a), new vec3d(-a, -a, -a));

// Update
var dt = 1;
var lastUpdate = Date.now();
setInterval(function() {
	var now = Date.now();
	dt = now - lastUpdate;
	dt /= 1000;
	lastUpdate = now;
	
	var update = {
		statics: Static.update(),
		projectiles: Projectile.update(),
		players: Player.update(),
	};

	io.sockets.emit('server_update');
	io.sockets.emit('init', init);
	io.sockets.emit('update', update);
	io.sockets.emit('remove', remove);
	
	Octree.update();
	Arm.update();

	init = {lines: [], statics: [], projectiles: [], players: [], };
	remove = {lines: [], statics: [], projectiles: [], players: [], };
}, 1000 / 10);
