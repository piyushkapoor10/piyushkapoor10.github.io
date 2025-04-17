import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene()
const renderer = new THREE.WebGLRenderer()
const camera = new THREE.PerspectiveCamera(30, 
               window.innerWidth / window.innerHeight, 0.1, 1000)
const light = new THREE.DirectionalLight()
scene.background = (new THREE.Color('white'))
renderer.setSize(3 * window.innerWidth / 4, 
                 3 * window.innerHeight / 4)
document.body.appendChild(renderer.domElement)
camera.position.z = 17
light.position.set(-1, 1, 1)

let box = new THREE.BoxGeometry(1, 1, 1)
let sphere = new THREE.SphereGeometry(0.5, 32, 32)
let torus = new THREE.TorusGeometry(0.5, 0.25, 32, 32, 2 * Math.PI)

let phong = new THREE.MeshPhongMaterial({
    color:'pink',
    emissive: 0,
    specular: 0x070707,
    shininess: 100
 })
 let basic = new THREE.MeshBasicMaterial({
    color: 'pink'
 })
 let lambert = new THREE.MeshLambertMaterial({
    color: 'pink',
    reflectivity: .5,
    refractionRatio: 1
 })

let obj, currentShape, currentMesh
currentShape = sphere
currentMesh = phong
obj = new THREE.Mesh(currentShape, currentMesh)
scene.add(light)
obj.position.set(0, 5, 0);
scene.add(obj)

let bounceControl = false
let up = true
let velocityY = 0; // Vertical velocity
let gravity = -0.01; // Gravity effect
let bounceFactor = 1; // How much velocity is retained after each bounce
let maxHeight = 10; // Maximum height
let minHeight = -1; // Minimum height (ground level)
let resetTime = 5000; // Time after which to reset the animation (in milliseconds)
let resetTimer;
let moveSpeed = 0.1; 

let keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    forward: false,
    backward: false
};

let resetAnimation = () => {
    obj.position.set(0, 0, 0); // Reset position to the center (or any initial position)
    velocityY = 0; // Reset velocity
    bounceControl = false; // Stop bouncing
    setTimeout(() => {
        bounceControl = true; // Restart bouncing after reset
    }, 100); // Restart bounce after a small delay
};
let animate = () => {
   requestAnimationFrame(animate);
   obj.rotation.y += 0.01;
   if (keys.left) obj.position.x -= moveSpeed;
   if (keys.right) obj.position.x += moveSpeed;
   if (keys.up) obj.position.z -= moveSpeed;
   if (keys.down) obj.position.z += moveSpeed;
   if (keys.forward) obj.position.y += moveSpeed;
   if (keys.backward) obj.position.y -= moveSpeed;

   if (bounceControl) {
      obj.rotation.x = 0;
      obj.rotation.y = 0;

      velocityY += gravity; // Gravity pulls the object down
      obj.position.y += velocityY; // Update position based on velocity

      if (obj.position.y <= minHeight) {
         obj.position.y = minHeight; // Ensure it doesn't go below the ground
         velocityY *= -bounceFactor; // Reverse and reduce velocity for bounce
      }

      // If the object reaches the max height, stop the upward motion
      if (obj.position.y >= maxHeight && velocityY > 0) {
         obj.position.y = maxHeight; // Ensure it doesn't go above max height
         velocityY *= -bounceFactor; // Reverse and reduce velocity for bounce
      }
   }
   controls.update();
   renderer.render(scene, camera);
};
resetTimer = setInterval(() => {
    //resetAnimation();
}, resetTime);
let controls = new OrbitControls(camera, renderer.domElement);

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 's':
            keys.down = true;
            break;
        case ' ':
            keys.forward = true;
            break;
        case 'Shift':
            keys.backward = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'w':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 's':
            keys.down = false;
            break;
        case ' ':
            keys.forward = false;
            break;
        case 'Shift':
            keys.backward = false;
            break;
    }
});

window.onload = () => {
    bounceControl=true;
    animate()
 }