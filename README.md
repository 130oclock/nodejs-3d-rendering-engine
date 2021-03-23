# Node.js 3D Rendering Engine
A node.js and HTML5 based 3d rendering engine loosely based on javidx9's 3d rendering YouTube tutorial.

## Table of contents
* [General info](#general-info)
* [Languages](#languages)
* [Dependencies](#dependencies)
* [Inspiration](#inspiration)
* [Visuals](#visuals)

## General info
This is a 3d rendering engine with a few extra features. It utilizes node.js to create a browser based 3d rendering engine in the HTML5 canvas. This 3d rendering engine is multiplayer and can be accessed by multiple web browser clients at the same time. All of the object positions are handled by the server. All rendering is handled by the client. Each client has its own spaceship model rendered at its location so that users can see each other. 
<br>
I also created a .obj file reading system for this project so that any .obj model can be added to the project and be rendered. All models need to be in "./public/models/".
<br>
This project uses [Quaternion](https://en.wikipedia.org/wiki/Quaternion) rotations instead of [Euler angles](https://en.wikipedia.org/wiki/Euler_angles).
<br>
I have also implemented [Boids](https://en.wikipedia.org/wiki/Boids), an artificial life program, developed by Craig Reynolds in 1986, which simulates the flocking behaviour of birds. 

### Languages
* Javascript
* HTML5
* CSS

### Dependencies
* [node.js](https://nodejs.org/en)
* [Socket.io](https://socket.io)

## Inspiration
* [javidx9](https://www.youtube.com/channel/UC-yuWVUplUJZvieEligKBkA) (OneLoneCoder)
* [The Coding Train](https://www.youtube.com/channel/UCvjgXvBlbQiydffZU7m1_aw)

## Visuals
<details>
<summary>This is a screenshot of the Utah Teapot.</summary>
<br>
<img src="./images/UtahTeapotScreenshot.png">
</details>

<details>
<summary>This is a screenshot of Boids.</summary>
<br>
<img src="./images/BoidExample.png">
</details>

