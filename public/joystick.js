class Joystick {
	constructor(x, y, i) {
		this.pos = {x, y};
		this.radius = 60;
		this.touch = i;
		this.touchPos = this.pos;
		this.angle = 0;

		Joystick.list[this.touch] = this;
	}

	render() {
		
	}

	calcAngle() {
		var tx = (this.touchPos.x - this.pos.x) | 0,
			ty = (this.touchPos.y - this.pos.y) | 0;
		this.angle = Math.atan2(ty, tx) * 180 / Math.PI;
	}

	kill() {
		delete Joystick.list[this.touch];
	}
}
Joystick.list = {};

/*var prevTouches;
canvas.ontouchstart = function(e) {
	e.preventDefault();
	prevTouches = e.touches;
	for (var i in e.changedTouches) {
		var touch = e.changedTouches[i];
		var x = touch.identifier + 1;
		var pos = screenToWorld(touch.clientX, touch.clientY);
		for (var i in NPC.list) {
			let npc = NPC.list[i];
			if (npc.text && distance(Player.list[selfId].pos, npc.pos) <= 80) {
				if (pos.x > npc.pos.x + npc.col.center.x - 20 && pos.y > npc.pos.y + npc.col.center.y - 20 && pos.x < npc.pos.x + 20 + npc.col.center.x + npc.col.width && pos.y < npc.pos.y + 20 + npc.col.center.y + npc.col.height) {
					npc.click();
					break;
				}
			}
		}
		if (x && touch.clientX < WIDTH/2 && !movementJoystick && touch.clientY > HEIGHT/2) {
			//socket.emit('log', touch.identifier);
			movementJoystick = new Joystick(touch.clientX, touch.clientY, touch.identifier);
		}
		if (x && touch.clientX > WIDTH/2 && !aimJoystick && touch.clientY > HEIGHT/2) {
			//socket.emit('log', touch.identifier);
			aimJoystick = new Joystick(touch.clientX, touch.clientY, touch.identifier);
		}
	}
	canvas.ontouchcancel = function(e) {
		for (var i in e.changedTouches) {
			var touch = e.changedTouches[i];
			Joystick.list[touch.identifier].kill();
		}
	}
	canvas.ontouchend = function(e) {
		for (var i in e.changedTouches) {
			var touch = e.changedTouches[i];
			Joystick.list[touch.identifier].kill();
		}
	}
	canvas.ontouchmove = function(e) {
		e.preventDefault();
		for (var i in e.changedTouches) {
			var touch = e.changedTouches[i];
			Joystick.list[touch.identifier].touchPos = {x: touch.clientX, y: touch.clientY};
		}
	}
}*/