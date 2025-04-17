import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.body.style.margin = 0;
document.body.style.padding = 0;
document.body.style.overflow = 'hidden';  // Hide scrollbars

document.documentElement.style.margin = 0;
document.documentElement.style.padding = 0;
document.documentElement.style.height = '100%';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
const light = new THREE.DirectionalLight();
scene.background = new THREE.Color('white');
//renderer.setSize(3 * window.innerWidth / 4, 3 * window.innerHeight / 4);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 5, 10);
light.position.set(-1, 1, 1);

scene.add(light);

// Load a custom model (e.g., myModel.glb)
const loader = new GLTFLoader();
let obj;
let mixer; // Declare mixer here, so it can be accessed later in the animation loop
let Animations;
let walkAnimation;
let idleAnimation;
let action;
let targetQuaternion;
   

loader.load('characterAnimations.glb', (gltf) => {
    obj = gltf.scene; // The model is inside gltf.scene
    console.log(gltf.animations);
    scene.add(obj); // Add the model to the scene   
    obj.position.y = -3;
    obj.rotation.y = Math.PI;    
    mixer = new THREE.AnimationMixer(obj);    
    walkAnimation = mixer.clipAction( gltf.animations[0], obj); 
    idleAnimation = mixer.clipAction( gltf.animations[1], obj); 
    idleAnimation.play();
}, undefined, (error) => {
    console.error('Error loading model:', error);
});

const groundGeometry = new THREE.PlaneGeometry(100, 100);  // Large plane to act as the ground

// Load texture
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('rocky_terrain_diff_4k.jpg'); // Replace with your texture path

// Repeat the texture to fill the plane
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(10, 10); // Adjust this to control how many times the texture repeats across the plane

// Use a MeshStandardMaterial for better lighting/shading effects
const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;  // Rotate the plane to make it horizontal
ground.position.y = -3;  // Position the ground just below the character (adjust as needed)
scene.add(ground);

let bounceControl = false;
let velocityY = 0; // Vertical velocity
let gravity = -0.01; // Gravity effect
let bounceFactor = 0.8; // How much velocity is retained after each bounce
let maxHeight = 3.4; // Maximum height
let minHeight = -3.4; // Minimum height (ground level)
let moveSpeed = 0.05; // Speed at which the object moves
let rotationSpeed =0.5;
let smoothnessFactor = 0.2; 

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
    const cameraDirection = new THREE.Vector3(0, 0, -1); // Default forward direction (negative Z-axis)
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Restrict to horizontal movement (no vertical movement)
    cameraDirection.normalize();
    // Move the object based on key press
    if (obj) {
        if (keys.left) {
            obj.position.x -= moveSpeed;
            camera.position.x -= moveSpeed;
        }
        if (keys.right) {
            obj.position.x += moveSpeed;
            camera.position.x += moveSpeed;
        }
        if (keys.up) {
            obj.position.addScaledVector(cameraDirection, moveSpeed); // Move forward
            camera.position.addScaledVector(cameraDirection, moveSpeed); // Move forward
        }
        if (keys.down) {
            obj.position.addScaledVector(cameraDirection, -moveSpeed); // Move backward
            camera.position.addScaledVector(cameraDirection, -moveSpeed); // Move backward
        }
        if (!keys.left && !keys.right && !keys.up && !keys.down) {

            idleAnimation.play();
            walkAnimation.stop();
        }
        cameraDirection.add( obj.position );
        if(keys.left || keys.right || keys.up || keys.down){
            //obj.lookAt( cameraDirection );
            
            idleAnimation.stop();
            walkAnimation.play();    
            const mock = new THREE.Object3D();

            obj.parent.add(mock);
            mock.position.copy(obj.position);
            mock.lookAt(cameraDirection);

            targetQuaternion = mock.quaternion.clone();

            mock.parent.remove(mock);
            obj.quaternion.slerp(targetQuaternion, 0.2);
        }
            controls.target.copy(obj.position);
        //   if (keys.forward) obj.position.y += moveSpeed;
        //   if (keys.backward) obj.position.y -= moveSpeed;
    }
    controls.update();
    mixer.update(1 / 60);
    renderer.render(scene, camera);
};

let controls = new OrbitControls(camera, renderer.domElement);

window.onload = () => {
    bounceControl = true;
    animate();
};

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer to full screen
    camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
    camera.updateProjectionMatrix(); // Recalculate the camera projection matrix
});