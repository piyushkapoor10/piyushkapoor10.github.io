import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import normalMapImage from '/ground/moss_groud_02_Normal_gl_2k.png'
import heightMapImage from '/ground/moss_groud_02_Height_2k.png'
import aormhMapImage from '/ground/moss_groud_02_ao_r_m_h_2k.png'
//import normalMapImage from '/ground/moss_groud_02_Normal_gl_2k.png'
//import roughnessMapImage from '/ground/moss_groud_02_Roughness_2k.png'

document.body.style.margin = 0;
document.body.style.padding = 0;
document.body.style.overflow = 'hidden';  // Hide scrollbars

document.documentElement.style.margin = 0;
document.documentElement.style.padding = 0;
document.documentElement.style.height = '100%';

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
const light = new THREE.DirectionalLight(0xffffff, 1);
//scene.background = new THREE.Color('white');
const loadingManager = new THREE.LoadingManager();
let orbit = new THREE.Object3D();

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

let isPointerLocked = false;
// When everything is loaded, start the animation
loadingManager.onLoad = function() {
    animate(); // Start the animation after everything is loaded
    //document.getElementById("loading-container").style.display = "none";
    const progressBar = document.querySelector('.progress');
    const loadingText = document.querySelector('.loading-text');
    if (progressBar && loadingText) {
        progressBar.style.display = "none"; // Update the progress bar width
        loadingText.style.display = "none";
    }
    document.getElementById("btn-explore").style.display = "inline-flex";
    addOrbitControls();
};

loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    document.getElementById("loading-container").style.display = "block"; // Show loading bar
    //console.log('Started loading:', url);
};


loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    // Update loading bar width as a percentage of items loaded
    const progress = (itemsLoaded / itemsTotal) * 100;
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = progress + '%'; // Update the progress bar width
    }
    console.log('Loading progress:', progress + '%');
};

loadingManager.onError = function (url) {
    console.error('Error loading resource:', url);
};
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
light.position.set(5, 10, 5);
light.target.position.set(0, 0, 0);
light.castShadow = true;
light.shadowDarkness = 0.8;
light.shadowCameraVisible = true; // only for debugging
// these six values define the boundaries of the yellow box seen above
light.shadow.camera.left = -2;
light.shadow.camera.right = 2;
light.shadow.camera.top = 2;
light.shadow.camera.bottom = -2;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 5;
light.shadow.camera.far = 15; 
light.shadow.bias = -0.003;
//renderer.setSize(3 * window.innerWidth / 4, 3 * window.innerHeight / 4);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// light.position.set(5, 10, 5); // Position of the light
// light.castShadow = true;
scene.add(light);
//scene.add(new THREE.CameraHelper(light.shadow.camera)) 
// Load a custom model (e.g., myModel.glb)
const loader = new GLTFLoader(loadingManager);
let obj;
let mixer; 
let walkAnimation;
let walkBackAnimation;
let idleAnimation;
let runAnimation;
let runBackAnimation;
let runJumpAnimation;
let jumpAnimation;
let targetQuaternion;


loader.load('characterAnimations.glb', (gltf) => {
    obj = gltf.scene; // The model is inside gltf.scene
    console.log(gltf.animations);
    scene.add(obj); // Add the model to the scene   
    obj.position.y = 0.2;
    obj.rotation.y = Math.PI;  
    gltf.scene.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
        }
     });
    mixer = new THREE.AnimationMixer(obj);        
    
    idleAnimation = mixer.clipAction( gltf.animations[0], obj);
    jumpAnimation = mixer.clipAction( gltf.animations[1], obj);
    runAnimation= mixer.clipAction( gltf.animations[2], obj);
    runBackAnimation= mixer.clipAction( gltf.animations[3], obj);
    runJumpAnimation= mixer.clipAction( gltf.animations[4], obj);
    walkAnimation = mixer.clipAction( gltf.animations[5], obj);
    walkBackAnimation = mixer.clipAction( gltf.animations[6], obj); 
    jumpAnimation.setLoop(THREE.LoopOnce);
    jumpAnimation.clampWhenFinished = true;
    runJumpAnimation.setLoop(THREE.LoopOnce);
    runJumpAnimation.clampWhenFinished = true;
    mixer.addEventListener('finished', stopUninterruptedAnimations);
    idleAnimation.play();       
}, undefined, (error) => {    
    console.error('Error loading model:', error);
});


// Load texture
 const textureLoader = new THREE.TextureLoader(loadingManager);
 const exrLoader = new EXRLoader(loadingManager);

 textureLoader.load('sky_41_2k.png', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
});

// Initialize the size of the entire ground plane
const planeWidth = 100;
const planeHeight = 100;

// Divide the ground into tiles (patches) - You can adjust the number of rows and columns
const rows = 10; // Number of tiles vertically
const cols = 10; // Number of tiles horizontally

// Define the tile size
const tileWidth = planeWidth / cols;
const tileHeight = planeHeight / rows;
const groundTiles = [];

const groundTexture = textureLoader.load('ground/moss_groud_02_Base_Color_2k.png'); // Replace with your texture path
const normalMap = textureLoader.load(normalMapImage);
//const roughnessMap = textureLoader.load(roughnessMapImage);
const heightMap = textureLoader.load(heightMapImage);
//const aoMap = textureLoader.load('ground/moss_groud_02_Ambient_Occlusion_2k.png');  
const aormMap = textureLoader.load(aormhMapImage);  

// const groundTexture = textureLoader.load('ground2/rocky_terrain_diff_4k.jpg'); // Replace with your texture path
// const normalMap = exrLoader.load('ground2/rocky_terrain_nor_gl_4k.exr');
// const roughnessMap = exrLoader.load('ground2/rocky_terrain_rough_4k.exr');
// const heightMap = textureLoader.load('ground2/rocky_terrain_disp_4k.png');
const textures = [groundTexture, normalMap, aormMap, heightMap];
textures.forEach((texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Set the repeat to 1, which means the texture will be applied once
    texture.repeat.set(1, 1);

    // Enable mipmaps for better performance
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; // Use mipmaps for scaling
    texture.magFilter = THREE.LinearFilter;
  });


function createGroundTile(x, z, resolution) {
    const geometry = new THREE.PlaneGeometry(tileWidth, tileHeight, resolution, resolution);
    const material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        displacementMap: heightMap,
        normalMap: normalMap,
        map: groundTexture,
        aoMap: aormMap,
        displacementScale: 0.3,
        flatShading: true
    });

    const tile = new THREE.Mesh(geometry, material);
    const baseOverlap = 0.01;  // Minimum overlap
    const overlapFactor = 0.1;  // Overlap factor to increase as distance increases
    
    // Calculate distance from origin (or another point) to determine overlap
    const distanceFromOrigin = Math.sqrt(x * x + z * z); // Distance to (0, 0)
    const dynamicOverlap = baseOverlap + distanceFromOrigin * overlapFactor;
    tile.position.set(x<0?x + dynamicOverlap:x-dynamicOverlap, 0, z<0?z + dynamicOverlap:z-dynamicOverlap);  // Apply overlap to both x and z

    tile.rotation.x = -Math.PI / 2;  // Rotate the tile to make it horizontal
    tile.receiveShadow = true;

    return tile;
}
// Create a grid of ground tiles
for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
        const tile = createGroundTile(
            j * tileWidth - planeWidth / 2,  // x position: space tiles horizontally across columns
            i * tileHeight - planeHeight / 2,  // z position: space tiles vertically across rows
            2  // Start with a lower resolution for all tiles initially
        );
        groundTiles.push(tile);
        scene.add(tile);
    }
}

function updateGroundGeometry() {
    groundTiles.forEach(tile => {        
        const distanceToTile = orbit.position.distanceTo(tile.position);
        let resolution = 1;        
        if (distanceToTile < 10) {
            resolution = 64;  // High resolution for nearby tiles
        } else if (distanceToTile < 20) {
            resolution = 16;  // Medium resolution for mid-range tiles
        }
        // Only update the tile's geometry if the resolution has changed
        if (tile.geometry.parameters.width !== resolution) {
            const newGeometry = new THREE.PlaneGeometry(tileWidth, tileHeight, resolution, resolution);
            tile.geometry.dispose();  
            tile.geometry = newGeometry;
        }
    });
}

const cameraDirection = new THREE.Vector3(0, 0, -1);
const cameraRight = new THREE.Vector3();
let keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    forward: false,
    run: false,
    jump: false
};
function stopUninterruptedAnimations (e) {    
    if (e.action === jumpAnimation) {        
        jumpAnimation.stop();
        jumpAnimation.reset();
        playAnimation(idleAnimation);
    }
    else if (e.action === runJumpAnimation) {        
        runJumpAnimation.stop();
        runJumpAnimation.reset();
        playAnimation(idleAnimation);
    }
}
// Handle keyboard input
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = true;
            break;        
        case 'Shift':
            keys.run = true;
            break;
        case ' ':
            keys.jump = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = false;
            break;
        case 'Shift':
            keys.run = false;
            break;
        case ' ':
            keys.jump = false;
            break;
    }
});



let animate = () => {
    let velocityY = 0; // Vertical velocity
    let gravity = -0.01; // Gravity effect
    let bounceFactor = 0.8; // How much velocity is retained after each bounce
    let maxHeight = 3.4; // Maximum height
    let minHeight = -3.4; // Minimum height (ground level)
    let moveSpeed = 0.03; // Speed at which the object moves
    let rotationSpeed =0.5;
    let smoothnessFactor = 0.2; 

    requestAnimationFrame(animate);
    // Default forward direction (negative Z-axis)
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0; // Restrict to horizontal movement (no vertical movement)
    cameraDirection.normalize();
    
    cameraRight.crossVectors(cameraDirection, camera.up);
    cameraRight.normalize();
    // Move the object based on key press
    if (obj && !isMovementPaused()) {
        if((keys.up && keys.left)){
            obj.rotateY(0.2);
            moveSpeed=moveSpeed/2;
            moveDiagonally(moveSpeed,moveSpeed);
        }else if((keys.up && keys.right)){
            obj.rotateY(-0.2);
            moveSpeed=moveSpeed/2;
            moveDiagonally(moveSpeed,-moveSpeed);
        }
        else if( (keys.down && keys.right)){
            obj.rotateY(0.2);
            moveSpeed=moveSpeed/2;
            moveDiagonally(-moveSpeed,-moveSpeed);
        }
        else if((keys.down && keys.left)){
            obj.rotateY(-0.2);
            moveSpeed=moveSpeed/2;
            moveDiagonally(-moveSpeed,moveSpeed);
        }
        else if (keys.right) {
            moveLeftRight(-moveSpeed);
            obj.rotateY(-0.4);
        }
        else if (keys.left) {
            moveLeftRight(moveSpeed);
            obj.rotateY(0.4);
        }
        else if (keys.up) {
            moveForwardBackward(moveSpeed);
        }
        else if (keys.down) {
            moveForwardBackward(-moveSpeed);            
        }
        if(keys.jump){
            jump();
        }        
        if (!keys.left && !keys.right && !keys.up && !keys.down) {            
            playAnimation(idleAnimation);            
        }
        cameraDirection.add( obj.position );
        if(keys.left || keys.right || keys.up || keys.down){
            //obj.lookAt( cameraDirection );    
            const mock = new THREE.Object3D();

            obj.parent.add(mock);
            mock.position.copy(obj.position);
            mock.lookAt(cameraDirection);

            targetQuaternion = mock.quaternion.clone();

            mock.parent.remove(mock);
            obj.quaternion.slerp(targetQuaternion, 0.2);
          
        }
    }
    updateGroundGeometry(camera);
    updateOrbitPosition();
    mixer.update(1 / 60);
    updateLightPosition();
    renderer.render(scene, camera);    
};

function addOrbitControls(){
    orbit.rotation.order = "YXZ";
    scene.add(orbit);    
    orbit.add( camera );   
}

function updateOrbitPosition(){
    orbit.position.copy(obj.position);
    orbit.position.y +=2;
    camera.position.set(0, 0, 10);    
    camera.lookAt(orbit.position);
}

function updateLightPosition() {
    light.position.set(obj.position.x + 5, obj.position.y + 10, obj.position.z + 5);
    light.target.position.copy(obj.position);
    light.target.updateMatrixWorld();

    // Move shadow camera with the object — center frustum around object
    const shadowCam = light.shadow.camera;
    shadowCam.left = -10;
    shadowCam.right = 10;
    shadowCam.top = 10;
    shadowCam.bottom = -10;
    shadowCam.near = 1;
    shadowCam.far = 30;

    // Make sure the projection matrix updates
    shadowCam.updateProjectionMatrix();
}

function moveForwardBackward(moveSpeed){
    if(keys.run && moveSpeed>=0){
        moveSpeed=getRunSpeed(moveSpeed);
        playAnimation(runAnimation);
    }
    else if(keys.run && moveSpeed<=0){
        moveSpeed=getRunSpeed(moveSpeed);
        playAnimation(runBackAnimation);
    }
    else if(moveSpeed>=0){        
        playAnimation(walkAnimation);
    }else{        
        playReverseAnimation(walkAnimation);      
    }    
    obj.position.addScaledVector(cameraDirection, moveSpeed); // Move forward
    orbit.position.addScaledVector(cameraDirection, moveSpeed);
}
function moveDiagonally(moveFwdBackSpeed,moveLeftRightSpeed){    
    if(keys.run && moveFwdBackSpeed>=0){
        moveFwdBackSpeed=getRunSpeed(moveFwdBackSpeed);
        moveLeftRightSpeed=getRunSpeed(moveLeftRightSpeed);
        playAnimation(runAnimation);
    }
    else if(keys.run && moveFwdBackSpeed<0){
        moveFwdBackSpeed=getRunSpeed(moveFwdBackSpeed);
        moveLeftRightSpeed=getRunSpeed(moveLeftRightSpeed);
        playAnimation(runBackAnimation);
    }
    else if(moveFwdBackSpeed>=0){        
        playAnimation(walkAnimation);
    }else{    
        playReverseAnimation(walkAnimation);        
    }
    obj.position.addScaledVector(cameraDirection, moveFwdBackSpeed); // Move forward
    orbit.position.addScaledVector(cameraDirection, moveFwdBackSpeed);    
    obj.position.addScaledVector(cameraRight, -moveLeftRightSpeed);
    orbit.position.addScaledVector(cameraRight, -moveLeftRightSpeed);
}
function moveLeftRight(moveSpeed){
    if(keys.run){
        moveSpeed=getRunSpeed(moveSpeed);
        playAnimation(runAnimation);
    }else{
        playAnimation(walkAnimation);
    }    
    obj.position.addScaledVector(cameraRight, -moveSpeed);
    orbit.position.addScaledVector(cameraRight, -moveSpeed);
}
function jump(){ 
    if(keys.run && keys.down){
        playReverseAnimation(runJumpAnimation);        
    }else if(keys.run){        
        playAnimation(runJumpAnimation);
    }else{
        playAnimation(jumpAnimation);    
    }
}
function getRunSpeed(moveSpeed){
    return moveSpeed*3;
}
function isUninterruptedActionAnimationRunning(){    
    if(jumpAnimation.isRunning()||runJumpAnimation.isRunning()){        
        return true;
    }else{
        return false;
    }
}
function isMovementPaused(){
    if(jumpAnimation.isRunning()){        
        const currentTime = jumpAnimation.time;
        const animationDuration = jumpAnimation.getClip().duration;
        const startTime = 0;             // Start of the animation (0 seconds)
        const midTime = 1;               // 1 second in (start of the middle section)
        const endTime = animationDuration - 1.5; 
        if ((currentTime >= startTime && currentTime <= midTime) || 
            (currentTime >= endTime && currentTime <= animationDuration)) {
            return true;
        }
    }
    return false;
}
function playAnimation(animation){    
    if((!isUninterruptedActionAnimationRunning() && !animation.isRunning())||(animation.timeScale<0)){        
        mixer.stopAllAction();
        animation.timeScale = 1;        
        animation.play();
    }
}
function playReverseAnimation(animation){    
    if((!isUninterruptedActionAnimationRunning() && !animation.isRunning())||(animation.timeScale>0)){
        mixer.stopAllAction();
        animation.time = animation._clip.duration;
        animation.timeScale = -1;
        animation.play();
    }
}
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight); // Resize renderer to full screen
    camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
    camera.updateProjectionMatrix(); // Recalculate the camera projection matrix
});


document.addEventListener('mousemove', function(e){
    let scale = -0.01;
    if (document.pointerLockElement) {
        orbit.rotateY(e.movementX * scale);  // Rotate based on horizontal movement
        orbit.rotateX(e.movementY * scale);  // Rotate based on vertical movement
        orbit.rotation.z = 0; // Keep the camera level by locking the Z-axis rotation
        const minRotationX = -Math.PI / 3;  // Example: -45 degrees
        const maxRotationX = Math.PI / 16;   // Example: 45 degrees
        orbit.rotation.x = Math.max(minRotationX, Math.min(maxRotationX, orbit.rotation.x));
    }
})
   

document.getElementById('btn-explore').addEventListener('click',()=>{
    document.getElementById('waiting-screen').classList.add('hidden');
    document.documentElement.requestPointerLock();
});
document.addEventListener('click', function() {
    if(document.getElementById('waiting-screen').classList.contains('hidden'))
        document.documentElement.requestPointerLock();  // Request pointer lock on click
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.pointerLockElement) {
        document.exitPointerLock();  // Allow the user to exit pointer lock
    }
});