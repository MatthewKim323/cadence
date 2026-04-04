/*
===============================================================================
Script: script.js
Purpose: To create an interactive particle system using Three.js and GPU computation.
Audience: Students learning Three.js and interactive web development.
Author: Ryan The Developer
Date: [Insert Date]
===============================================================================

Description:
This script demonstrates the use of Three.js for rendering a particle system with GPU computation.
Key concepts covered include:
- Using shaders for vertex and fragment manipulation.
- Leveraging GPU computation for particle dynamics.
- Adding interactivity with mouse movements and window resizing.
- Structuring a real-time rendering loop.

Dependencies:
- Three.js library
- OrbitControls.js (for camera interaction)
- CCapture.js (optional, for video capture)
===============================================================================
*/

// 6048 * 6048 = 36,578,304
const texturesize = 2048; // Size of the texture (2048x2048 pixels)

// const texturesize = 6048; // Size of the texture (2048x2048 pixels)
const particles = texturesize * texturesize; // Total number of particles in the system

// Reference to the Three.js GPUComputationRenderer
const GPUComputationRenderer = THREE.GPUComputationRenderer;

// Declare variables for essential Three.js objects
let container; // HTML container where the Three.js canvas will be appended
let camera, scene, renderer, controls; // Core Three.js components
let cloud_obj; // Object to represent the particle system
let uniforms; // Shader uniforms for interactivity and animation

// Variables for GPU-computed textures
let gpuComputationRenderer,
  dataPos,
  dataVel,
  textureArraySize = texturesize * texturesize * 4;
let textureVelocity, texturePosition; // Textures for velocity and position data

// Load shaders for particle behavior
const particleVert = document.getElementById(
  "vertexShaderParticle"
).textContent; // Vertex shader
const particleFrag = document.getElementById(
  "fragmentShaderParticle"
).textContent; // Fragment shader
const velocityFrag = document.getElementById(
  "fragmentShaderVelocity"
).textContent; // Velocity shader
const positionFrag = document.getElementById(
  "fragmentShaderPosition"
).textContent; // Position shader

// Texture loader for external noise texture
let loader = new THREE.TextureLoader();
let texture;

// Load a noise texture for additional randomness in particle behavior
loader.setCrossOrigin("anonymous"); // Allow cross-origin resource loading
loader.load(
  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/982762/noise.png", // URL of the noise texture
  function do_something_with_texture(tex) {
    texture = tex; // Assign loaded texture
    texture.wrapS = THREE.RepeatWrapping; // Enable horizontal wrapping
    texture.wrapT = THREE.RepeatWrapping; // Enable vertical wrapping
    texture.minFilter = THREE.LinearFilter; // Set filter for better performance
    init(); // Initialize the Three.js scene
    animate(); // Start the animation loop
  }
);

/**
 * Initializes the Three.js scene, camera, renderer, and GPU computation renderer.
 */
function init() {
  container = document.getElementById("container"); // Reference to the HTML container element

  // Set up the camera with a perspective projection
  camera = new THREE.PerspectiveCamera(
    45, // Field of view
    1, // Aspect ratio
    0.001, // Near clipping plane
    Math.pow(2, 16) // Far clipping plane
  );
  camera.position.set(-10, -10, -30); // Set the initial position of the camera

  // Create the scene and set its background color
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Define particle positions and texture references
  let vertices = new Float32Array(particles * 3).fill(0); // Initialize all particle positions at the origin
  let references = new Float32Array(particles * 2); // Store UV references for texture lookup

  // Assign UV references to each particle
  for (let i = 0; i < references.length; i += 2) {
    let index = i / 2; // Calculate the particle index
    references[i] = (index % texturesize) / texturesize; // X-coordinate in the texture
    references[i + 1] = Math.floor(index / texturesize) / texturesize; // Y-coordinate in the texture
  }

  // Create a BufferGeometry to store the particle data
  let geometry = new THREE.BufferGeometry();
  geometry.addAttribute("position", new THREE.BufferAttribute(vertices, 3)); // Create a BufferGeometry to store the particle data

  geometry.addAttribute("reference", new THREE.BufferAttribute(references, 2)); // Attribute for texture references

  // Define uniforms to be shared with shaders
  uniforms = {
    u_time: { type: "f", value: 1.0 }, // Time uniform for animation
    u_resolution: { type: "v2", value: new THREE.Vector2() }, // Resolution uniform for scaling
    u_noise: { type: "t", value: texture }, // Noise texture uniform
    u_mouse: { type: "v2", value: new THREE.Vector2() }, // Mouse position uniform
    u_texturePosition: { value: null }, // Texture for particle positions
    u_clicked: { type: "b", value: true }, // Toggle for interaction
  };

  // Create a ShaderMaterial for the particle system
  let particleMaterial = new THREE.ShaderMaterial({
    uniforms: uniforms, // Shared uniforms
    vertexShader: particleVert, // Vertex shader code
    fragmentShader: particleFrag, // Fragment shader code
    blending: THREE.AdditiveBlending,
    depthTest: false,
    extensions: { derivatives: true },
    transparent: true, // Enable transparency
    side: THREE.DoubleSide, // Double-sided rendering
  });

  // Create the particle cloud object
  cloud_obj = new THREE.Points(geometry, particleMaterial); // Points represent individual particles
  scene.add(cloud_obj); // Add the particle system to the scene

  // Set up the renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio); // Adjust pixel ratio for high-DPI displays
  renderer.setSize(window.innerWidth, window.innerHeight); // Set the canvas size
  // Add orbit controls for camera interaction
  controls = new THREE.OrbitControls(camera, renderer.domElement);

  container.appendChild(renderer.domElement); // Append the renderer to the container

  // Initialize GPU computation renderer
  gpuComputationRenderer = new GPUComputationRenderer(
    texturesize,
    texturesize,
    renderer
  );

  // Initialize textures for position and velocity
  dataPos = gpuComputationRenderer.createTexture(); // Texture for particle positions
  dataVel = gpuComputationRenderer.createTexture(); // Texture for particle velocities

  dataPos_orig = gpuComputationRenderer.createTexture();

  for (let i = 0; i < textureArraySize; i += 4) {
    let radius = 1;
    let phi = Math.random() * Math.PI * 2;
    let costheta = Math.random() * 2 - 1;
    let u = Math.random();

    let theta = Math.acos(costheta);
    let r = radius * Math.cbrt(u);

    let x = r * Math.sin(theta) * Math.cos(phi);
    let y = r * Math.sin(theta) * Math.sin(phi);
    let z = r * Math.cos(theta);

    dataPos.image.data[i] = x;
    dataPos.image.data[i + 1] = y;
    dataPos.image.data[i + 2] = z;
    dataPos.image.data[i + 3] = 1;

    dataPos_orig.image.data[i] = x;
    dataPos_orig.image.data[i + 1] = y;
    dataPos_orig.image.data[i + 2] = z;
    dataPos_orig.image.data[i + 3] = 1;

    dataVel.image.data[i] = x * 3;
    dataVel.image.data[i + 1] = y * 3;
    dataVel.image.data[i + 2] = z * 3;
    dataVel.image.data[i + 3] = 1;
  }

  textureVelocity = gpuComputationRenderer.addVariable(
    "v_samplerVelocity",
    velocityFrag,
    dataVel
  );
  texturePosition = gpuComputationRenderer.addVariable(
    "v_samplerPosition",
    positionFrag,
    dataPos
  );

  texturePosition.material.uniforms.delta = { value: 0 };
  texturePosition.material.uniforms.v_samplerPosition_orig = {
    type: "t",
    value: dataPos_orig,
  };
  textureVelocity.material.uniforms.u_time = { value: -1000 };
  textureVelocity.material.uniforms.u_mousex = { value: 0 };
  texturePosition.material.uniforms.u_time = { value: 0 };

  gpuComputationRenderer.setVariableDependencies(textureVelocity, [
    textureVelocity,
    texturePosition,
  ]);
  gpuComputationRenderer.setVariableDependencies(texturePosition, [
    textureVelocity,
    texturePosition,
  ]);

  texturePosition.wrapS = THREE.RepeatWrapping;
  texturePosition.wrapT = THREE.RepeatWrapping;
  textureVelocity.wrapS = THREE.RepeatWrapping;
  textureVelocity.wrapT = THREE.RepeatWrapping;

  const gpuComputationRendererError = gpuComputationRenderer.init();
  if (gpuComputationRendererError) {
    console.error("ERROR", gpuComputationRendererError);
  }

  // Add event listeners for resize and mouse move
  // ----------------------------
  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);
  document.addEventListener("pointermove", pointerMove);
  // document.addEventListener('click', onClick);

  // initialise the video renderer
  // toggleCapture();
}

function onWindowResize(event) {
  let w = window.innerWidth;
  let h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  uniforms.u_resolution.value.x = renderer.domElement.width;
  uniforms.u_resolution.value.y = renderer.domElement.height;
}

function pointerMove(event) {
  let ratio = window.innerHeight / window.innerWidth;
  textureVelocity.material.uniforms.u_mousex.value = event.pageX;
  uniforms.u_mouse.value.x =
    (event.pageX - window.innerWidth / 2) / window.innerWidth / ratio;
  uniforms.u_mouse.value.y =
    ((event.pageY - window.innerHeight / 2) / window.innerHeight) * -1;

  event.preventDefault();
}

function onClick() {
  // return;
  let newval = !uniforms.u_clicked.value;
  uniforms.u_clicked.value = newval;
  console.log(cloud_obj.material.blending);
  if (newval === false) {
    scene.background = new THREE.Color(0xffffff);
    cloud_obj.material.blending = THREE.MultiplyBlending;
  } else {
    scene.background = new THREE.Color(0x000000);
    cloud_obj.material.blending = THREE.AdditiveBlending;
  }
}

function animate(delta) {
  requestAnimationFrame(animate);
  render(delta);
}

let capturer = new CCapture({
  verbose: true,
  framerate: 30,
  // motionBlurFrames: 4,
  quality: 90,
  format: "webm",
  workersPath: "js/",
});

let capturing = false;

isCapturing = function (val) {
  if (val === false && window.capturing === true) {
    capturer.stop();
    capturer.save();
    // renderer.setPixelRatio( window.devicePixelRatio );
  } else if (val === true && window.capturing === false) {
    capturer.start();
    controls.enabled = false;
    // renderer.setPixelRatio( 1 );
  }
  capturing = val;
};
toggleCapture = function () {
  isCapturing(!capturing);
};
let b = document.querySelector("button");
if (b) b.addEventListener("click", (e) => toggleCapture());

window.addEventListener("keyup", function (e) {
  if (e.keyCode == 68) toggleCapture();
});

let then = 0;
function render(delta) {
  let now = Date.now() / 1000;
  let _delta = now - then;
  then = now;

  gpuComputationRenderer.compute();

  texturePosition.material.uniforms.delta.value = Math.min(_delta, 0.5);
  textureVelocity.material.uniforms.u_time.value += 0.0005;
  texturePosition.material.uniforms.u_time.value += _delta;

  uniforms.u_time.value += _delta;
  uniforms.u_texturePosition.value =
    gpuComputationRenderer.getCurrentRenderTarget(texturePosition).texture;

  window.pos = gpuComputationRenderer.getCurrentRenderTarget(texturePosition);

  renderer.render(scene, camera);

  if (capturing) {
    capturer.capture(renderer.domElement);
  }
}
