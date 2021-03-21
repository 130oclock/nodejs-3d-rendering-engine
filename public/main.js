
// HTMl Element Functions
var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var canvas = document.getElementById('canvas');
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = WIDTH;
canvas.style.height = HEIGHT;
var ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

var infoPanel = document.getElementById('infoPanel');

function resize() {
	WIDTH = window.innerWidth;
	HEIGHT = window.innerHeight;
	canvas.width = WIDTH;
	canvas.height = HEIGHT;
	pDepthBuffer = new Array(WIDTH * HEIGHT);
	pDepthBufferLength = WIDTH * HEIGHT | 0;
	matProj = mat4x4.matrix_MakeProjection(90, HEIGHT/WIDTH, 0.1, 1000);
}
window.onresize = resize;
window.onorientationchange = resize;

function v_distance(v1, v2) {
	var dx = v1.x - v2.x;
	var dy = v1.y - v2.y;
	var dz = v1.z - v2.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function v_dotProduct(v1, v2) {
	return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}
function v_length(v) {
	return Math.sqrt(v_dotProduct(v, v));
}

class color {
	constructor(r, g, b, a) {
		this.r = r || 0;
		this.g = g || 0;
		this.b = b || 0;
		this.a = a || 0;
	}
}

// Matrix Functions
class mat4x4 {
	constructor() {
		this.m =
	   [[0,0,0,0,],
		[0,0,0,0,],
		[0,0,0,0,],
		[0,0,0,0,]];
	}
}
mat4x4.matrix_MakeIdentity = function() {
	var matrix = new mat4x4();
	matrix.m[0][0] = 1;
	matrix.m[1][1] = 1;
	matrix.m[2][2] = 1;
	matrix.m[3][3] = 1;
	return matrix;
}
mat4x4.matrix_makeRotationX = function(angle) {
	//roll
	var matrix = new mat4x4();
	matrix.m[0][0] = 1;
	matrix.m[1][1] = Math.cos(angle);
	matrix.m[1][2] = Math.sin(angle);
	matrix.m[2][1] = -Math.sin(angle);
	matrix.m[2][2] = Math.cos(angle);
	matrix.m[3][3] = 1;
	return matrix;
}
mat4x4.matrix_makeRotationY = function(angle) {
	//pitch
	var matrix = new mat4x4();
	matrix.m[0][0] = Math.cos(angle);
	matrix.m[0][2] = Math.sin(angle);
	matrix.m[1][1] = 1;
	matrix.m[2][0] = -Math.sin(angle);
	matrix.m[2][2] = Math.cos(angle);
	matrix.m[3][3] = 1;
	return matrix;
}
mat4x4.matrix_makeRotationZ = function(angle) {
	//yaw
	var matrix = new mat4x4();
	matrix.m[0][0] = Math.cos(angle);
	matrix.m[0][1] = Math.sin(angle);
	matrix.m[1][0] = -Math.sin(angle);
	matrix.m[1][1] = Math.cos(angle);
	matrix.m[2][2] = 1;
	matrix.m[3][3] = 1;
	return matrix;
}
mat4x4.matrix_MakeTranslation = function(x, y, z) {
	var matrix = new mat4x4();
	matrix.m[0][0] = 1;
	matrix.m[1][1] = 1;
	matrix.m[2][2] = 1;
	matrix.m[3][3] = 1;
	matrix.m[3][0] = x;
	matrix.m[3][1] = y;
	matrix.m[3][2] = z;
	return matrix;
}
mat4x4.matrix_MakeProjection = function(FovDegrees, AspectRatio, Near, Far) {
	var FovRad = 1 / Math.tan(FovDegrees * 0.5 / 180 * Math.PI);
	var matrix = new mat4x4();
	matrix.m[0][0] = AspectRatio * FovRad;
	matrix.m[1][1] = FovRad;
	matrix.m[2][2] = Far / (Far - Near);
	matrix.m[3][2] = (-Far * Near) / (Far - Near);
	matrix.m[2][3] = 1;
	matrix.m[3][3] = 0;
	return matrix;
}
mat4x4.matrix_MultiplyMatrix = function(m1, m2) {
	var matrix = new mat4x4();
	for (var brightness = 0; brightness < 4; brightness++) {
		for (var r = 0; r < 4; r++) {
			matrix.m[r][brightness] = m1.m[r][0] * m2.m[0][brightness] + m1.m[r][1] * m2.m[1][brightness] + m1.m[r][2] * m2.m[2][brightness] + m1.m[r][3] * m2.m[3][brightness];
		}
	}
	return matrix;
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
	matrix.m[3][0] = pos.x;			matrix.m[3][1] = pos.y;			matrix.m[3][2] = pos.z;			matrix.m[3][3] = 1;
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

// 2D Vector Functions
class vec2d {
	constructor(u = 0, v = 0) {
		this.u = u;
		this.v = v;
		this.w = 1;
	}
}

// 3D Vector Functions
class vec3d {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = 1;
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
vec3d.lerp = function(v1, v2, value) { // from, to, time
	return {x: (1 - value) * v1.x + value * v2.x, y: (1 - value) * v1.y + value * v2.y, z: (1 - value) * v1.z + value * v2.z, w: 1};
}
vec3d.normalize = function(v) {
	var l = v_length(v);
	return {x: v.x / l, y: v.y / l, z: v.z / l, w: 1};
}
vec3d.crossProduct = function(v1, v2) {
	var v = new vec3d();
	v.x = v1.y * v2.z - v1.z * v2.y;
	v.y = v1.z * v2.x - v1.x * v2.z;
	v.z = v1.x * v2.y - v1.y * v2.x;
	return v;
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
vec3d.intersectPlane = function(plane_p, plane_n, lineStart, lineEnd, t = {t:0}) {
	plane_n = vec3d.normalize(plane_n);
	var plane_d = -v_dotProduct(plane_n, plane_p);
	var ad = v_dotProduct(lineStart, plane_n);
	var bd = v_dotProduct(lineEnd, plane_n);
	t.t = (-plane_d - ad) / (bd - ad);
	var lineStartToEnd = vec3d.subtract(lineEnd, lineStart);
	var lineToIntersect = vec3d.multiply(lineStartToEnd, t.t);
	return vec3d.add(lineStart, lineToIntersect);
}

class line {
	constructor(vec1 = new vec3d(), vec2 = new vec3d()) {
		this.p = [vec1, vec2];
		
		var _vec4 = new vec2d(0, 0);
		var _vec5 = new vec2d(0, 0);
		this.t = [_vec4, _vec5];
		
		this.color = new color(255, 255, 255, 255);
		this.brightness = new color();
	}
	copyVec(num) {
		var vec = new vec3d(this.p[num].x, this.p[num].y, this.p[num].z);

		return vec;
	}
}
line.clipAgainstPlane = function(plane_p, plane_n, in_line, out_line) {
	plane_n = vec3d.normalize(plane_n);

	function dist(p) {
		var n = vec3d.normalize(p);
		return (plane_n.x * p.x + plane_n.y * p.y + plane_n.z * p.z - v_dotProduct(plane_n, plane_p));
	}

	var inside_points = new Array(3);	var nInsidePointCount = 0;
	var outside_points = new Array(3);	var nOutsidePointCount = 0;
	var inside_tex = new Array(3);		var nInsideTexCount = 0;
	var outside_tex = new Array(3);		var nOutsideTexCount = 0;

	var d0 = dist(in_line.p[0]);
	var d1 = dist(in_line.p[1]);

	if (d0 >= 0) { inside_points[nInsidePointCount++] = in_line.p[0]; inside_tex[nInsideTexCount++] = in_line.t[0];}
	else { outside_points[nOutsidePointCount++] = in_line.p[0]; outside_tex[nOutsideTexCount++] = in_line.t[0];}
	if (d1 >= 0) { inside_points[nInsidePointCount++] = in_line.p[1]; inside_tex[nInsideTexCount++] = in_line.t[1];}
	else { outside_points[nOutsidePointCount++] = in_line.p[1]; outside_tex[nOutsideTexCount++] = in_line.t[1];}

	if (nInsidePointCount == 0) {
		return 0;
	}
	if (nInsidePointCount == 2) {
		out_line.brightness = in_line.brightness;
		out_line.p[0] = in_line.p[0];
		out_line.t[0] = in_line.t[0];
		
		out_line.p[1] = in_line.p[1];
		out_line.t[1] = in_line.t[1];
		return 1;
	}
	if (nInsidePointCount == 1 && nOutsidePointCount == 1) {
		out_line.brightness = in_line.brightness;
		out_line.p[0] = inside_points[0];
		out_line.t[0] = inside_tex[0];

		var t = {t: 0};
		out_line.p[1] = vec3d.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], t);
		out_line.t[1].u = t.t * (outside_tex[0].u - inside_tex[0].u) + inside_tex[0].u;
		out_line.t[1].v = t.t * (outside_tex[0].v - inside_tex[0].v) + inside_tex[0].v;
		out_line.t[1].w = t.t * (outside_tex[0].w - inside_tex[0].w) + inside_tex[0].w;
		
		return 1;
	}
}

class triangle {
	constructor(vec1 = [0,0,0], vec2 = [0,0,0], vec3 = [0,0,0], vec4 = [0,0], vec5 = [0,0], vec6 = [0,0], normal) {
		var _vec1 = new vec3d(vec1[0], vec1[1], vec1[2]);
		var _vec2 = new vec3d(vec2[0], vec2[1], vec2[2]);
		var _vec3 = new vec3d(vec3[0], vec3[1], vec3[2]);
		this.p = [_vec1, _vec2, _vec3, normal];
		
		var _vec4 = new vec2d(vec4[0], vec4[1]);
		var _vec5 = new vec2d(vec5[0], vec5[1]);
		var _vec6 = new vec2d(vec6[0], vec6[1]);
		this.t = [_vec4, _vec5, _vec6];
		
		this.color = new color(255, 255, 255, 255);
		this.brightness = new color();
	}
	copyVec(num) {
		var vec = new vec3d(this.p[num].x, this.p[num].y, this.p[num].z);

		return vec;
	}
}
triangle.copy = function(t1) {
	var vec1 = [t1.p[0].x, t1.p[0].y, t1.p[0].z],
		vec2 = [t1.p[1].x, t1.p[1].y, t1.p[1].z],
		vec3 = [t1.p[2].x, t1.p[2].y, t1.p[2].z],
		vec4 = [t1.t[0].x, t1.t[0].y, t1.t[0].z],
		vec5 = [t1.t[1].x, t1.t[1].y, t1.t[1].z],
		vec6 = [t1.t[2].x, t1.t[2].y, t1.t[2].z],
		normal = t1.p[3];
	var t2 = new triangle(vec1, vec2, vec3, vec4, vec5, vec6, normal);
	return t2;
}
triangle.matrix_MultiplyVector = function(m, p) {
	var m00 = m.m[0][0], m10 = m.m[1][0], m20 = m.m[2][0], m30 = m.m[3][0];
	var m01 = m.m[0][1], m11 = m.m[1][1], m21 = m.m[2][1], m31 = m.m[3][1];
	var m02 = m.m[0][2], m12 = m.m[1][2], m22 = m.m[2][2], m32 = m.m[3][2];
	var m03 = m.m[0][3], m13 = m.m[1][3], m23 = m.m[2][3], m33 = m.m[3][3];
	
	var v1 = new vec3d(), v2 = new vec3d(), v3 = new vec3d();
	
	var i = p[0];
	var x = i.x, y = i.y, z = i.z, w = i.w;
	v1.x = (x * m00) + (y * m10) + (z * m20) + (w * m30);
	v1.y = (x * m01) + (y * m11) + (z * m21) + (w * m31);
	v1.z = (x * m02) + (y * m12) + (z * m22) + (w * m32);
	v1.w = (x * m03) + (y * m13) + (z * m23) + (w * m33);

	i = p[1];
	x = i.x, y = i.y, z = i.z, w = i.w;
	v2.x = (x * m00) + (y * m10) + (z * m20) + (w * m30);
	v2.y = (x * m01) + (y * m11) + (z * m21) + (w * m31);
	v2.z = (x * m02) + (y * m12) + (z * m22) + (w * m32);
	v2.w = (x * m03) + (y * m13) + (z * m23) + (w * m33);

	i = p[2];
	x = i.x, y = i.y, z = i.z, w = i.w;
	v3.x = (x * m00) + (y * m10) + (z * m20) + (w * m30);
	v3.y = (x * m01) + (y * m11) + (z * m21) + (w * m31);
	v3.z = (x * m02) + (y * m12) + (z * m22) + (w * m32);
	v3.w = (x * m03) + (y * m13) + (z * m23) + (w * m33);
	
	return [v1, v2, v3];
}
triangle.clipAgainstPlane = function(plane_p, plane_n, in_tri, out_tri1, out_tri2) {
	plane_n = vec3d.normalize(plane_n);

	function dist(p) {
		var n = vec3d.normalize(p);
		return (plane_n.x * p.x + plane_n.y * p.y + plane_n.z * p.z - v_dotProduct(plane_n, plane_p));
	}

	var inside_points = new Array(3);	var nInsidePointCount = 0;
	var outside_points = new Array(3);	var nOutsidePointCount = 0;
	var inside_tex = new Array(3);		var nInsideTexCount = 0;
	var outside_tex = new Array(3);		var nOutsideTexCount = 0;

	var d0 = dist(in_tri.p[0]);
	var d1 = dist(in_tri.p[1]);
	var d2 = dist(in_tri.p[2]);

	if (d0 >= 0) { inside_points[nInsidePointCount++] = in_tri.p[0]; inside_tex[nInsideTexCount++] = in_tri.t[0];}
	else { outside_points[nOutsidePointCount++] = in_tri.p[0]; outside_tex[nOutsideTexCount++] = in_tri.t[0];}
	if (d1 >= 0) { inside_points[nInsidePointCount++] = in_tri.p[1]; inside_tex[nInsideTexCount++] = in_tri.t[1];}
	else { outside_points[nOutsidePointCount++] = in_tri.p[1]; outside_tex[nOutsideTexCount++] = in_tri.t[1];}
	if (d2 >= 0) { inside_points[nInsidePointCount++] = in_tri.p[2]; inside_tex[nInsideTexCount++] = in_tri.t[2];}
	else { outside_points[nOutsidePointCount++] = in_tri.p[2]; outside_tex[nOutsideTexCount++] = in_tri.t[2];}

	if (nInsidePointCount == 0) {
		return 0;
	}
	if (nInsidePointCount == 3) {
		out_tri1.p[0] = in_tri.p[0];
		out_tri1.p[1] = in_tri.p[1];
		out_tri1.p[2] = in_tri.p[2];
		out_tri1.t[0] = in_tri.t[0];
		out_tri1.t[1] = in_tri.t[1];
		out_tri1.t[2] = in_tri.t[2];
		out_tri1.brightness = in_tri.brightness;
		return 1;
	}
	if (nInsidePointCount == 1 && nOutsidePointCount == 2) {

		if (showI) out_tri1.brightness = {r: 0, g: 0, b: in_tri.brightness.b, a: 255};//'blue';
		else out_tri1.brightness = in_tri.brightness;
		out_tri1.p[0] = inside_points[0];
		out_tri1.t[0] = inside_tex[0];

		var t = {t: 0};
		out_tri1.p[1] = vec3d.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], t);
		out_tri1.t[1].u = t.t * (outside_tex[0].u - inside_tex[0].u) + inside_tex[0].u;
		out_tri1.t[1].v = t.t * (outside_tex[0].v - inside_tex[0].v) + inside_tex[0].v;
		out_tri1.t[1].w = t.t * (outside_tex[0].w - inside_tex[0].w) + inside_tex[0].w;
		
		out_tri1.p[2] = vec3d.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[1], t);
		out_tri1.t[2].u = t.t * (outside_tex[1].u - inside_tex[0].u) + inside_tex[0].u;
		out_tri1.t[2].v = t.t * (outside_tex[1].v - inside_tex[0].v) + inside_tex[0].v;
		out_tri1.t[2].w = t.t * (outside_tex[1].w - inside_tex[0].w) + inside_tex[0].w;
		
		return 1;
	}
	if (nInsidePointCount == 2 && nOutsidePointCount == 1) {

		if (showI) {
			out_tri1.brightness = {r: in_tri.brightness.r, g: in_tri.brightness.g, b: 0, a: 255};//'yellow';
			out_tri2.brightness = {r: 0, g: in_tri.brightness.g, b: 0, a: 255};//'green';
		} else {
			out_tri1.brightness = in_tri.brightness;
			out_tri2.brightness = in_tri.brightness;
		}
		

		out_tri1.p[0] = inside_points[0];
		out_tri1.p[1] = inside_points[1];
		out_tri1.t[0] = inside_tex[0];
		out_tri1.t[1] = inside_tex[1];
		
		var t = {t: 0};
		//problem with output tri 1
		out_tri1.p[2] = vec3d.intersectPlane(plane_p, plane_n, inside_points[0], outside_points[0], t);
		out_tri1.t[2].u = t.t * (outside_tex[0].u - inside_tex[0].u) + inside_tex[0].u;
		out_tri1.t[2].v = t.t * (outside_tex[0].v - inside_tex[0].v) + inside_tex[0].v;
		out_tri1.t[2].w = t.t * (outside_tex[0].w - inside_tex[0].w) + inside_tex[0].w;

		out_tri2.p[0] = inside_points[1];
		out_tri2.p[1] = out_tri1.p[2];
		out_tri2.t[0] = inside_tex[1];
		out_tri2.t[1] = out_tri1.t[2];
		t = {t: 0};
		out_tri2.p[2] = vec3d.intersectPlane(plane_p, plane_n, inside_points[1], outside_points[0], t);
		out_tri2.t[2].u = t.t * (outside_tex[0].u - inside_tex[1].u) + inside_tex[1].u;
		out_tri2.t[2].v = t.t * (outside_tex[0].v - inside_tex[1].v) + inside_tex[1].v;
		out_tri2.t[2].w = t.t * (outside_tex[0].w - inside_tex[1].w) + inside_tex[1].w;
		
		return 2;
	}
}

// Mesh Functions
class Mesh {
	constructor(triangles, src, id) {
		this.triangles = triangles;
		this.src = src;
		this.id = id;

		Mesh.list[id] = this;
	}
	copy(scale) {
		var copy = {};
		copy.triangles = [];
		for (var i in this.triangles) {
			var tri = triangle.copy(this.triangles[i]);
			if (scale) for (var v = 0; v < 3; v++) {
				var vec = tri.p[v];
				if (scale.x) vec.x *= scale.x;
				if (scale.y) vec.y *= scale.y;
				if (scale.z) vec.z *= scale.z;
			}
			copy.triangles.push(tri);
		}
		copy.src = this.src;
		copy.id = this.id;
		
		return copy;
	}
}
Mesh.list = {};
Mesh.loadFile = function(src, id) {
	var rawFile = new XMLHttpRequest();
	var mesh;
	rawFile.open("GET", src, false);
	rawFile.onreadystatechange = function () {
		if(rawFile.readyState === 4) {
			if(rawFile.status === 200 || rawFile.status === 0) {
				var text = rawFile.responseText;

				let vertices = [];
				let textureVertices = [];
				let normals = [];
				let triangles = [];
				var lines = text.split('\n');

				//console.log(lines);
				for (var i in lines) {
					var line = lines[i];
					var segs = line.split(/(\s+)/).filter( function(e) { return e.trim().length > 0; } );
					var identifier = segs.shift();
					
					// vertex : v # # #
					if (identifier == 'v') {
						var x = segs[0], y = segs[1], z = segs[2];
						vertices.push([x, y, z]);
					}
					// texture vertex : vt # #
					if (identifier == 'vt') {
						var x = segs[0], y = segs[1];
						textureVertices.push([x, y]);
					}
					// normal : vn # # #
					if (identifier == 'vn') normals.push([segs[0], segs[1], segs[2]]);
					
					// face   : f #/#/# #/#/# #/#/#
					if (identifier == 'f') {
						var verticesIndex = [];
						var textureIndex = [];
						var normalsIndex = [];
						
						for (var j in segs) {
							var seg = segs[j];
							var indices = seg.split("/");
							if (indices[0]) verticesIndex.push(indices[0]-1);
							if (indices[1]) textureIndex.push(indices[1]-1);
							if (indices[2]) normalsIndex.push(indices[2]-1);
						}
						
						let num_Triangles = verticesIndex.length - 2;
						
						for (var i = 1; i <= num_Triangles; i++) {
							let hasNorm = false, hasText = false;
							var index1 = 0, index2 = i, index3 = i+1;
							var norm, text1, text2, text3, tri;
							if (normalsIndex.length) {
								hasNorm = true;
								norm = new vec3d(normals[normalsIndex[0]][0], normals[normalsIndex[0]][1], normals[normalsIndex[0]][2]);
							}
							if (textureIndex.length) {
								hasText = true;
								text1 = textureVertices[textureIndex[index1]];
								text2 = textureVertices[textureIndex[index2]];
								text3 = textureVertices[textureIndex[index3]];
							}
							if (hasNorm && hasText) tri = new triangle(vertices[verticesIndex[index1]], vertices[verticesIndex[index2]], vertices[verticesIndex[index3]], text1, text2, text3, norm);
							else if (hasNorm && !hasText) tri = new triangle(vertices[verticesIndex[index1]], vertices[verticesIndex[index2]], vertices[verticesIndex[index3]], [0, 0], [0, 0], [0, 0], norm);
							else if (!hasNorm && hasText) tri = new triangle(vertices[verticesIndex[index1]], vertices[verticesIndex[index2]], vertices[verticesIndex[index3]], text1, text2, text3);
							else tri = new triangle(vertices[verticesIndex[index1]], vertices[verticesIndex[index2]], vertices[verticesIndex[index3]]);
							
							triangles.push(tri);
						}
					}
				}
				mesh = new Mesh(triangles, src, id);
			}
		}
	}
	rawFile.send();

	//console.log(mesh);
	return mesh;
}