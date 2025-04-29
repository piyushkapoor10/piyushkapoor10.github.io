import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const axesHelper = new THREE.AxesHelper(5); // 5 is the size of the axes
scene.add(axesHelper);

// Set up the renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 10).normalize();
scene.add(directionalLight);

// Load the model using GLTFLoader
const loader = new GLTFLoader();

// Path to the .glb or .gltf model (ensure you provide the correct file path)
const modelPath = 'road_sign_stylized.glb';  
loader.load(
  modelPath,
  (gltf) => {
    const model = gltf.scene;  // Get the scene from the loaded gltf file
    model.scale.set(1, 1, 1);   // Adjust scale if necessary
    model.position.set(0, 0, 0); // Position the model in the scene

    scene.add(model);  // Add the model to the scene

    // Access the meshes inside the model (group)
    model.traverse((child) => {
      if (child.isMesh) {
        // Perform operations on meshes here
        console.log(child); // Log each mesh to the console

        // For example, you can change the material of all meshes
        child.material.color.set(0xff0000);  // Set material color to red
      }
    });
  },
  // onProgress callback (optional)
  (xhr) => {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  // onError callback (optional)
  (error) => {
    console.error('An error happened while loading the model:', error);
  }
);

// Position the camera
camera.position.z = 5;

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Update controls
  renderer.render(scene, camera);
}

animate();