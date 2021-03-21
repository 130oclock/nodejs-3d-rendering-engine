function rgbToHex(rgb) { 
	var hex = Number(rgb).toString(16);
	if (hex.length < 2) {
		hex = "0" + hex;
	}
	return hex;
}
function fullColorHex(r,g,b) {   
	var red = rgbToHex(r);
	var green = rgbToHex(g);
	var blue = rgbToHex(b);
	return '#' + red+green+blue;
}

// Context Drawing Functions
function drawLine(x1, y1, x2, y2, c = 1, col = "#FFF") {
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.lineWidth = c;
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.closePath();
}
function drawTriangle(x1, y1, x2, y2, x3, y3, c, col) {
	drawLine(x1, y1, x2, y2, c, "rgb("+col.r+","+col.g+","+col.b+")");
	drawLine(x2, y2, x3, y3, c, "rgb("+col.r+","+col.g+","+col.b+")");
	drawLine(x3, y3, x1, y1, c, "rgb("+col.r+","+col.g+","+col.b+")");
	ctx.beginPath();
}
function fillTriangle(x1, y1, x2, y2, x3, y3, col = 255) {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.fillStyle = "rgb("+col.r+","+col.g+","+col.b+")";
	//ctx.fillStyle = col;
	ctx.fill();
	ctx.strokeStyle = "rgb("+col.r+","+col.g+","+col.b+")";
	//ctx.strokeStyle = col;
	ctx.lineWidth = 1;
	ctx.closePath();
	ctx.stroke();
}

// Image Data Drawing Functions
function setPixel(imageData, t, r, g, b, a) {
	if (t >= imageData.length) return;
	imageData[t] = r;
	imageData[t + 1] = g;
	imageData[t + 2] = b;
	imageData[t + 3] = a;
}

function fillPixelRect(imageData, x1, y1, sx, sy, r = 255, g = 255, b = 255, a = 255) {
	x1 |= 0;
	y1 |= 0;
	for (var i = y1; i < (y1 + sy); i++) {
		for (var j = x1; j < (x1 + sx); j++) {
			if (i < 0 || i >= HEIGHT || j < 0 || j >= WIDTH) continue;
			var t = ((i * WIDTH) + j | 0) * 4;
			setPixel(backbufferdata, t, r, g, b, a);
		}
	}
}
// Bresenham's Line Algorithm
function setPixelLine(x1, y1, x2, y2, w1, w2, col) {
	x1 |= 0;
	y1 |= 0;
	x2 |= 0;
	y2 |= 0;
	
	if (y2 < y1) {
		y2 = [y1, y1 = y2][0];
		x2 = [x1, x1 = x2][0];
		w2 = [w1, w1 = w2][0];
	}
	
	var dx = Math.abs(x2 - x1);
	var dy = -Math.abs(y2 - y1);
	var dw = w2 - w1;
	
	var sx = (x1 < x2) ? 1 : -1, sy = (y1 < y2) ? 1 : -1;
	var err = dx + dy;
	
	var bx = x1, by = y1, bw, dw_step = 0;
	
	if (dy) dw_step = dw / Math.abs(dy);

	while(true) {
		bw = w1 + (by - y1) * dw_step;
		
		if (by > 0 && by <= HEIGHT && bx > 0 && bx <= WIDTH ) { 
			var h = ((by * WIDTH) + bx | 0);
			if (bw > pDepthBuffer[h]) {
				var g4 = h * 4;
				var green = 0;
				if (showW) green = 15300 * bw * (col.g/255);
				else green = col.g;
				setPixel(backbufferdata, g4, col.r, green, col.b, 255);
				pDepthBuffer[h] = bw;
			}
		}

		if ((bx == x2) && (by == y2)) break;
		var e2 = 2 * err;
		if (e2 >= dy) {
			err += dy; 
			bx += sx;
		}
		if (e2 <= dx) {
			err += dx;
			by += sy;
		}
	}
}
// Mid-point Ellipse Algorithm
function setPixelEllipse(rx, ry, c) {
	rx |= 0;
	ry |= 0;
	var xc = c.x | 0;
	var yc = c.y | 0;
	
	var dx, dy, d1, d2, x, y;
	x = 0;
	y = ry;
	
	d1 = (ry * ry) + (0.25 * rx * rx) - (rx * rx * ry);
	
	dx = 2 * ry * ry * x;
	dy = 2 * rx * rx * y;
	
	while (dx < dy) {
		for (var p = 0; p < 4; p++) {
			var gx = x, gy = y;
			switch(p) {
				case 1: gx *= -1; break;
				case 2: gy *= -1; break;
				case 3: gx *= -1; gy *= -1; break;
			}
			gx += xc, gy += yc;
			if (gy > 0 && gy <= HEIGHT && gx > 0 && gx <= WIDTH ) {
				g4 = (((gy) * WIDTH) + (gx) | 0) * 4;
				setPixel(backbufferdata, g4, 255, 255, 255, 255);
			}
		}
		
		if (d1 < 0) {
			x++;
			dx = dx + (2 * ry * ry);
			d1 = d1 + dx + (ry * ry);
		} else {
			x++;
			y--;
			dx = dx + (2 * ry * ry);
			dy = dy - (2 * rx * rx);
			d1 = d1 + dx - dy + (ry * ry);
		}
	}
	
	d2 = ((ry * ry) * ((x + 0.5) * (x + 0.5))) + ((rx * rx) * ((y - 1) * (y - 1))) - (rx * rx * ry * ry); 
	while (y >= 0) {
		for (var p = 0; p < 4; p++) {
			var gx = x, gy = y;
			switch(p) {
				case 1: gx *= -1; break;
				case 2: gy *= -1; break;
				case 3: gx *= -1; gy *= -1; break;
			}
			gx += xc, gy += yc;
			if (gy > 0 && gy <= HEIGHT && gx > 0 && gx <= WIDTH ) {
				g4 = (((gy) * WIDTH) + (gx) | 0) * 4;
				setPixel(backbufferdata, g4, 255, 255, 255, 255);
			}
		}
		
		if (d2 > 0) {
			y--;
			dy = dy - (2 * rx * rx);
			d2 = d2 + (rx * rx) - dy;
		} else {
			y--;
			x++;
			dx = dx + (2 * ry * ry);
			dy = dy - (2 * rx * rx);
			d2 = d2 + dx - dy + (rx * rx);
		}
	}
}

function texturedTriangle(x1, y1, u1, v1, w1,
						x2, y2, u2, v2, w2,
						x3, y3, u3, v3, w3,
						col, src) {
	x1 |= 0;
	y1 |= 0;
	x2 |= 0;
	y2 |= 0;
	x3 |= 0;
	y3 |= 0;
	
	if (y2 < y1) {
		y2 = [y1, y1 = y2][0];
		x2 = [x1, x1 = x2][0];
		u2 = [u1, u1 = u2][0];
		v2 = [v1, v1 = v2][0];
		w2 = [w1, w1 = w2][0];
	}
	if (y3 < y1) {
		y3 = [y1, y1 = y3][0];
		x3 = [x1, x1 = x3][0];
		u3 = [u1, u1 = u3][0];
		v3 = [v1, v1 = v3][0];
		w3 = [w1, w1 = w3][0];
	}
	if (y3 < y2) {
		y3 = [y2, y2 = y3][0];
		x3 = [x2, x2 = x3][0];
		u3 = [u2, u2 = u3][0];
		v3 = [v2, v2 = v3][0];
		w3 = [w2, w2 = w3][0];
	}
	
	var dy1 = y2 - y1 | 0;
	var dx1 = x2 - x1 | 0;
	var dv1 = v2 - v1;
	var du1 = u2 - u1;
	var dw1 = w2 - w1;
	
	var dy2 = y3 - y1 | 0;
	var dx2 = x3 - x1 | 0;
	var dv2 = v3 - v1;
	var du2 = u3 - u1;
	var dw2 = w3 - w1;
	
	var tex_u, tex_v, tex_w;
	
	var dax_step = 0, dbx_step = 0,
		du1_step = 0, dv1_step = 0,
		du2_step = 0, dv2_step = 0,
		dw1_step = 0, dw2_step = 0;
		
	if (dy1) dax_step = dx1 / Math.abs(dy1);
	if (dy2) dbx_step = dx2 / Math.abs(dy2);
	
	if (dy1) du1_step = du1 / Math.abs(dy1);
	if (dy1) dv1_step = dv1 / Math.abs(dy1);
	if (dy1) dw1_step = dw1 / Math.abs(dy1);
	
	if (dy2) du2_step = du2 / Math.abs(dy2);
	if (dy2) dv2_step = dv2 / Math.abs(dy2);
	if (dy2) dw2_step = dw2 / Math.abs(dy2);
	
	if (dy1) {
		for (var i = y1; i <= y2; i++) {
			var ax = x1 + (i - y1) * dax_step | 0;
			var bx = x1 + (i - y1) * dbx_step | 0;
			
			var tex_su = u1 + (i - y1) * du1_step;
			var tex_sv = v1 + (i - y1) * dv1_step;
			var tex_sw = w1 + (i - y1) * dw1_step;
			
			var tex_eu = u1 + (i - y1) * du2_step;
			var tex_ev = v1 + (i - y1) * dv2_step;
			var tex_ew = w1 + (i - y1) * dw2_step;
			
			if (ax > bx) {
				bx = [ax, ax = bx][0];
				tex_eu = [tex_su, tex_su = tex_eu][0];
				tex_ev = [tex_sv, tex_sv = tex_ev][0];
				tex_ew = [tex_sw, tex_sw = tex_ew][0];
			}
			
			tex_u = tex_su;
			tex_v = tex_sv;
			tex_w = tex_sw;
			
			var tstep = 1 / (bx - ax);
			var t = 0;
			
			for (var j = ax; j < bx; j++) {
				if (i > 0 && i <= HEIGHT && j > 0 && j <= WIDTH ) { 
					tex_u = ((1 - t) * tex_su) + (t * tex_eu);
					tex_v = ((1 - t) * tex_sv) + (t * tex_ev);
					tex_w = ((1 - t) * tex_sw) + (t * tex_ew);
					var g = (i * WIDTH) + j | 0;
					if (tex_w > pDepthBuffer[g]) {
						var g4 = g * 4;
						var green = 0;
						if (showW) {
							green = (15300 * tex_w);
							green *= col.g / 255;
							green = Math.min(green, col.g);
						}
						else green = col.g;
						setPixel(backbufferdata, g4, col.r, green, col.b, 255);
						pDepthBuffer[g] = tex_w;
					}
					t += tstep;
				}
			}
		}
	}
	
	dy1 = y3 - y2;
	dx1 = x3 - x2;
	dv1 = v3 - v2;
	du1 = u3 - u2;
	dw1 = w3 - w2;
	
	if (dy1) dax_step = dx1 / Math.abs(dy1);
	if (dy2) dbx_step = dx2 / Math.abs(dy2);
	
	du1_step = 0, dv1_step = 0;
	if (dy1) du1_step = du1 / Math.abs(dy1);
	if (dy1) dv1_step = dv1 / Math.abs(dy1);
	if (dy1) dw1_step = dw1 / Math.abs(dy1);
		
	if (dy1) {
		for (var i = y2; i <= y3; i++) {
			var ax = x2 + (i - y2) * dax_step | 0;
			var bx = x1 + (i - y1) * dbx_step | 0;
			
			var tex_su = u2 + (i - y2) * du1_step;
			var tex_sv = v2 + (i - y2) * dv1_step;
			var tex_sw = w2 + (i - y2) * dw1_step;
			
			var tex_eu = u1 + (i - y1) * du2_step;
			var tex_ev = v1 + (i - y1) * dv2_step;
			var tex_ew = w1 + (i - y1) * dw2_step;
			
			if (ax > bx) {
				bx = [ax, ax = bx][0];
				tex_eu = [tex_su, tex_su = tex_eu][0];
				tex_ev = [tex_sv, tex_sv = tex_ev][0];
				tex_ew = [tex_sw, tex_sw = tex_ew][0];
			}
			
			tex_u = tex_su;
			tex_v = tex_sv;
			tex_w = tex_sw;
			
			var tstep = 1 / (bx - ax);
			var t = 0;
			for (var j = ax; j < bx; j++) {
				if (i > 0 && i <= HEIGHT && j > 0 && j <= WIDTH) {
					tex_u = ((1 - t) * tex_su) + (t * tex_eu);
					tex_v = ((1 - t) * tex_sv) + (t * tex_ev);
					tex_w = ((1 - t) * tex_sw) + (t * tex_ew);
					var g = (i * WIDTH) + j | 0;
					if (tex_w > pDepthBuffer[g]) {
						var g4 = g * 4;
						var green = 0;
						if (showW) {
							green = (15300 * tex_w);
							green *= col.g / 255;
							green = Math.min(green, col.g);
						}
						else green = col.g;
						setPixel(backbufferdata, g4, col.r, green, col.b, 255);
						pDepthBuffer[g] = tex_w;
					}
					t += tstep;
				}
			}
		}
	}
	if (showV) {
		fillPixelRect(backbuffer, x1, y1, 2, 2, 255, 0, 0, 255);
		fillPixelRect(backbuffer, x2, y2 + 5, 2, 2, 0, 255, 0, 255);
		fillPixelRect(backbuffer, x3 + 5, y3, 2, 2, 0, 0, 255, 255);
	}
}