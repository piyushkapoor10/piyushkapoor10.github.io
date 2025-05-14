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
const highResLight = new THREE.DirectionalLight(0xffffff, 1);
const ambientLight = new THREE.AmbientLight(0xFFB0FE, 0.8); // color, intensity
scene.add(ambientLight);
const loadingManager = new THREE.LoadingManager();
let orbit = new THREE.Object3D();

loadingManager.onLoad = function() {
    const progressBar = document.querySelector('.progress');
    const loadingText = document.querySelector('.loading-text');
    if (progressBar && loadingText) {
        progressBar.style.display = "none"; // Update the progress bar width
        loadingText.style.display = "none";
    }
    document.getElementById("btn-explore").style.display = "inline-flex";
    animate();
    addOrbitControls();    
};

loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    document.getElementById("loading-container").style.display = "block";
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

const shadowColor = 0x170117;
const shadowOpacity = 0.55;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
highResLight.position.set(5, 10, 5);
highResLight.target.position.set(0, 0, 0);
highResLight.shadowCameraVisible = true;
// these six values define the boundaries of the yellow box seen above

let highResShadowCamera = {
    left: -11,
    right: 11,
    top: 11,
    bottom: -11,
    near: 0.01,
    far: 22,
    width: 512,
    height: 512,
    bias : -0.001,
    castShadow : true,
};
highResLight.shadow.mapSize.width = highResShadowCamera.width;
highResLight.shadow.mapSize.height = highResShadowCamera.height;
highResLight.shadow.bias = highResShadowCamera.bias;
highResLight.castShadow=highResShadowCamera.castShadow;
//renderer.setSize(3 * window.innerWidth / 4, 3 * window.innerHeight / 4);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// light.position.set(5, 10, 5); // Position of the light
// light.castShadow = true;

scene.add(highResLight);
//scene.add(new THREE.CameraHelper(highResLight.shadow.camera)) 
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
groundTexture.minFilter = THREE.LinearMipMapLinearFilter;
groundTexture.magFilter = THREE.LinearFilter;
normalMap.minFilter = THREE.LinearMipMapLinearFilter;
normalMap.magFilter = THREE.LinearFilter;
heightMap.minFilter = THREE.LinearMipMapLinearFilter;
heightMap.magFilter = THREE.LinearFilter;
aormMap.minFilter = THREE.LinearMipMapLinearFilter;
aormMap.magFilter = THREE.LinearFilter;
const highDetailMaterial = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    displacementMap: heightMap,
    normalMap: normalMap,
    map: groundTexture,
    aoMap: aormMap,
    displacementScale: 0.3,
    flatShading: true,
});
const lowResTexture = groundTexture.clone();
lowResTexture.minFilter = THREE.LinearMipMapLinearFilter;
lowResTexture.magFilter = THREE.LinearFilter;
lowResTexture.anisotropy = 2; 
const lowResAO = aormMap.clone();
lowResAO.minFilter = THREE.LinearMipMapLinearFilter;
lowResAO.magFilter = THREE.LinearFilter;
lowResAO.anisotropy = 2; 
const lowDetailMaterial = new THREE.MeshPhongMaterial({    
    side: THREE.DoubleSide,
    map: lowResTexture,
    aoMap: aormMap,
    flatShading: true
});
const underPlaneMaterial= lowDetailMaterial.clone();
underPlaneMaterial.map.wrapS = THREE.RepeatWrapping;  // Horizontal repeat
underPlaneMaterial.map.wrapT = THREE.RepeatWrapping;  // Vertical repeat

underPlaneMaterial.map.repeat.set(10, 10);
const underPlane =new THREE.Mesh( new THREE.PlaneGeometry(planeWidth,planeHeight,1,1),underPlaneMaterial);  
underPlane.rotation.x = -Math.PI / 2;
underPlane.position.y = 0.13;
underPlane.receiveShadow = true;
scene.add(underPlane);

function createGroundTile(x, z, resolution) {
    const geometry = new THREE.PlaneGeometry(tileWidth, tileHeight, resolution, resolution);
    const tile = new THREE.Mesh(geometry, lowDetailMaterial.clone());
    tile.position.set(x,0,z);  // Apply overlap to both x and z
    tile.rotation.x = -Math.PI / 2;  // Rotate the tile to make it horizontal
    tile.receiveShadow = true;
    tile.currentResolution = resolution;
    tile.isHighDetail = false;
    tile.visible=false;
    return tile;
}
// Create a grid of ground tiles
for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
        const tile = createGroundTile(
            j * tileWidth - (planeWidth / 2) + (tileWidth / 2),
            i * tileHeight - (planeHeight / 2) + (tileHeight / 2),
            1  // Start with a lower resolution for all tiles initially
        );
        groundTiles.push(tile);
        scene.add(tile);
    }
}
function updateGroundGeometry() {
    groundTiles.forEach(tile => {
        const distance = orbit.position.distanceTo(tile.position);
        let desiredResolution=1;        
        //let needsHighDetail=false;
        if (distance < 20) {
            if(!tile.isHighDetail){
                desiredResolution = 32;         
                //needsHighDetail=true;
                const newGeometry = new THREE.PlaneGeometry(tileWidth, tileHeight, desiredResolution, desiredResolution);
                tile.geometry.dispose();
                tile.geometry = newGeometry;
                tile.currentResolution = desiredResolution;
                tile.material = highDetailMaterial;
                tile.isHighDetail = true;
                tile.visible=true;
            }
        }else{
            tile.geometry.dispose();
            tile.isHighDetail = false;
            tile.visible=false;
        }
    });
}

loader.load('road_sign.glb', function(gltf) {       
    const shadowTexture = new THREE.TextureLoader().load('shadows/road_sign_shadow.png');
    // Create a transparent material with the shadow image
    const shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        color: new THREE.Color(shadowColor),
        transparent: true,     // Enable PNG transparency
        depthWrite: false,     // Prevent z-fighting with ground
        opacity: shadowOpacity,           // Optional: control shadow darkness
    });
    // Create a plane geometry for the shadow
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2), // Adjust size as needed
        shadowMaterial
    );
    // Position the shadow plane slightly above the ground to avoid z-fighting
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.rotation.z = -Math.PI / 3;
    shadowPlane.position.y = 0.2175; // Just above the ground
    shadowPlane.position.z = -2.5;
    shadowPlane.position.x = -0.9;
    scene.add(shadowPlane);
    gltf.scene.position.z = -2;
    scene.add(gltf.scene);     
});

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

let leftTouchId = null;
let rightTouchId = null;
let leftStartX = 0, leftStartY = 0, leftSwiped = false;
let rightLastX = 0, rightLastY = 0;
let scale = -0.01;

const isLandscape = () => window.innerWidth > window.innerHeight;

document.addEventListener('touchstart', (e) => {
    if (!isLandscape()) return;
    if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
    }    
    for (let touch of e.changedTouches) {
        const midX = window.innerWidth / 2;

        if (touch.pageX <= midX && leftTouchId === null) {
            // Left-side touch (swipe)
            leftTouchId = touch.identifier;
            leftStartX = touch.pageX;
            leftStartY = touch.pageY;
            leftSwiped = false;
        } else if (touch.pageX > midX && rightTouchId === null) {
            // Right-side touch (camera)
            rightTouchId = touch.identifier;
            rightLastX = touch.pageX;
            rightLastY = touch.pageY;
        }
    }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
    if (!isLandscape()) return;
    if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
    }
    for (let touch of e.changedTouches) {
        const id = touch.identifier;

        if (id === leftTouchId) {
            const diffX = touch.pageX - leftStartX;
            const diffY = touch.pageY - leftStartY;
            const threshold = 30;
            const shiftDistance = 100; // Distance required for "shift"
            const distance = Math.hypot(diffX, diffY);
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            keys.run = distance > shiftDistance;

            // Reset all directions first
            keys.left = false;
            keys.right = false;
            keys.up = false;
            keys.down = false;

            if (absX > threshold || absY > threshold) {
                if (absX > threshold && absY > threshold) {
                    // Diagonal swipe
                    if (diffX > 0 && diffY < 0) {       // ↗
                        keys.right = true;
                        keys.up = true;
                    } else if (diffX < 0 && diffY < 0) { // ↖
                        keys.left = true;
                        keys.up = true;
                    } else if (diffX > 0 && diffY > 0) { // ↘
                        keys.right = true;
                        keys.down = true;
                    } else if (diffX < 0 && diffY > 0) { // ↙
                        keys.left = true;
                        keys.down = true;
                    }
                } else if (absX > absY) {
                    // Horizontal swipe
                    if (diffX > threshold) {
                        keys.right = true;
                    } else if (diffX < -threshold) {
                        keys.left = true;
                    }
                } else {
                    // Vertical swipe
                    if (diffY > threshold) {
                        keys.down = true;
                    } else if (diffY < -threshold) {
                        keys.up = true;
                    }
                }
            }
        } else if (id === rightTouchId) {
            // Camera rotation
            const diffX = touch.pageX - rightLastX;
            const diffY = touch.pageY - rightLastY;

            orbit.rotateY(diffX * scale);
            orbit.rotateX(diffY * scale);
            orbit.rotation.z = 0;

            const minRotationX = -Math.PI / 3;
            const maxRotationX = Math.PI / 16;
            orbit.rotation.x = Math.max(minRotationX, Math.min(maxRotationX, orbit.rotation.x));

            rightLastX = touch.pageX;
            rightLastY = touch.pageY;
        }
    }
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!isLandscape()) return;

    for (let touch of e.changedTouches) {
        if (touch.identifier === leftTouchId) {
            keys.left = keys.right = keys.up = keys.down = false;
            leftTouchId = null;
            leftSwiped = false;
        }
        if (touch.identifier === rightTouchId) {
            rightTouchId = null;
        }
    }
});

function showOrientationMessage() {
    // Create a message div dynamically
    const messageDiv = document.createElement('div');
    messageDiv.textContent = 'Please switch to landscape mode for a better experience.';
    messageDiv.id = 'orientationMessage';
    // Apply styles dynamically to the message
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageDiv.style.color = 'white';
    messageDiv.style.fontSize = '18px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.zIndex = '1000';

    // Add the message to the body of the document
    document.body.appendChild(messageDiv);

    // Store the message div in a global variable for later removal
    window.orientationMessage = messageDiv;
}

function hideOrientationMessage() {
    const messageDiv = document.getElementById('orientationMessage');
    if (messageDiv) {
        messageDiv.remove();  // Remove the message div from the DOM
    } else {
        console.log("Message div not found.");
    }
}

function checkOrientation() {
    console.log(window.orientationMessage);
    if (isLandscape()) {
        hideOrientationMessage();
    } else {
        showOrientationMessage();
    }
}

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
    highResLight.position.set(obj.position.x + 5, obj.position.y + 10, obj.position.z + 5);
    highResLight.target.position.copy(obj.position);
    highResLight.target.updateMatrixWorld();
    // Move shadow camera with the object — center frustum around object
    const highResShadowCam = highResLight.shadow.camera;
    highResShadowCam.left = highResShadowCamera.left;
    highResShadowCam.right = highResShadowCamera.right;
    highResShadowCam.top = highResShadowCamera.top;
    highResShadowCam.bottom = highResShadowCamera.bottom;
    highResShadowCam.near = highResShadowCamera.near;
    highResShadowCam.far = highResShadowCamera.far;
    highResShadowCam.updateProjectionMatrix();
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
    checkOrientation();
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
window.addEventListener('load', checkOrientation);