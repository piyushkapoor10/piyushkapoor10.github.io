import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(30, 
               window.innerWidth / window.innerHeight, 0.1, 1000);
const light = new THREE.DirectionalLight();
scene.background = new THREE.Color('white');
renderer.setSize(3 * window.innerWidth / 4, 
                 3 * window.innerHeight / 4);
document.body.appendChild(renderer.domElement);
camera.position.z = 17;
light.position.set(-1, 1, 1);

scene.add(light);

// Load a custom model (e.g., myModel.glb)
const loader = new GLTFLoader();
let obj;
let mixer; // Declare mixer here, so it can be accessed later in the animation loop
let walkAnimation;
let action;


loader.load('/Cute_Demon.glb', (gltf) => {
    obj = gltf.scene; // The model is inside gltf.scene
    console.log(gltf.animations);
    scene.add(obj); // Add the model to the scene    
    walkAnimation= gltf.animations[0];
    mixer = new THREE.AnimationMixer(obj);
       console.log(walkAnimation);
       action = mixer.clipAction( walkAnimation , obj);
       console.log(action.isRunning());
       action.play();        
       console.log(walkAnimation.tracks);
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

let bounceControl = false;
let velocityY = 0; // Vertical velocity
let gravity = -0.01; // Gravity effect
let bounceFactor = 0.8; // How much velocity is retained after each bounce
let maxHeight = 3.4; // Maximum height
let minHeight = -3.4; // Minimum height (ground level)
let moveSpeed = 0.1; // Speed at which the object moves

let keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    forward: false,
    backward: false
};

// Handle keyboard input
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

let animate = () => {
   requestAnimationFrame(animate);
    console.log(obj);
   if (obj) {
       obj.rotation.y += 0.01; // Rotate the custom object
       controls.update();
       
    }

   // Move the object based on key press
   if (obj) {
       if (keys.left) obj.position.x -= moveSpeed;
       if (keys.right) obj.position.x += moveSpeed;
       if (keys.up) obj.position.z -= moveSpeed;
       if (keys.down) obj.position.z += moveSpeed;
       if (keys.forward) obj.position.y += moveSpeed;
       if (keys.backward) obj.position.y -= moveSpeed;
   }
   
   mixer.update( 1/60 );
   renderer.render(scene, camera);
};

let controls = new OrbitControls(camera, renderer.domElement);

window.onload = () => {
    bounceControl = true;
    animate();
};