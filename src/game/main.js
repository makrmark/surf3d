import * as THREE from 'three';
import { Pool } from './Pool.js';
import { Surfer } from './Surfer.js';

let gameState = "starting";
const pool = new Pool(); // Create a Pool instance
const surfer = new Surfer(pool); // Pass the Pool instance to the Surfer

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Set a sky-blue background for contrast
scene.background = new THREE.Color(0x87CEEB);

// Water mesh for wave pool
function createWaterMesh() {
    const positions = [];
    const indices = [];
    const segmentsX = 50;
    const segmentsZ = 50;

    for (let i = 0; i <= segmentsX; i++) {
        for (let j = 0; j <= segmentsZ; j++) {
            const x = (i / segmentsX - 0.5) * pool.width;
            const z = (j / segmentsZ) * pool.length;

            // Calculate the tilt based on z position
            // At z = 0 (north), tilt is 0
            // At z = pool.length (south), tilt is -tiltHeight
            const tilt = -(pool.tiltHeight * (z / pool.length));

            // Continuous cosine wave with tilt
            let y = pool.waveAmplitude * Math.cos((2 * Math.PI / pool.waveLength) * (pool.length - z)) + tilt;
            positions.push(x, y, z);
        }
    }

    for (let i = 0; i < segmentsX; i++) {
        for (let j = 0; j < segmentsZ; j++) {
            const a = i + j * (segmentsX + 1);
            const b = (i + 1) + j * (segmentsX + 1);
            const c = (i + 1) + (j + 1) * (segmentsX + 1);
            const d = i + (j + 1) * (segmentsX + 1);
            indices.push(a, b, c, a, c, d);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhongMaterial({
        color: 0x0000ff, // Blue
        specular: 0x111111,
        shininess: 50,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
}

const waterMesh = createWaterMesh();
scene.add(waterMesh);

// Add flowing white objects to represent water speed
const flowingObjects = [];
const numObjects = 50; // Number of objects
const objectGeometry = new THREE.SphereGeometry(0.2, 8, 8); // Small spheres
const objectMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White color

for (let i = 0; i < numObjects; i++) {
    const obj = new THREE.Mesh(objectGeometry, objectMaterial);
    obj.position.set(
        (Math.random() - 0.5) * pool.width, // Random x position within pool width
        Math.random() * 2, // Random y position slightly above water
        Math.random() * pool.length // Random z position within pool length
    );
    scene.add(obj);
    flowingObjects.push(obj);
}

// Update flowing objects to follow the wave profile
function updateFlowingObjects(dt) {
    const k = 2 * Math.PI / pool.waveLength; // Wave number

    flowingObjects.forEach(obj => {
        obj.position.z -= pool.waveSpeed * dt; // Move south
        if (obj.position.z < 0) {
            obj.position.z = pool.length; // Reset to the north end
            obj.position.x = (Math.random() - 0.5) * pool.width; // Randomize x position
        }

        // Calculate the tilt based on z position
        const tilt = -(pool.tiltHeight * (obj.position.z / pool.length));

        // Update y position to follow the wave profile with tilt
        obj.position.y = pool.waveAmplitude * Math.cos(k * (pool.length - obj.position.z)) + tilt;
    });
}

// Adjust the pool floor to align with all edges of the pool
const poolBottomGeometry = new THREE.PlaneGeometry(pool.width + 2 * pool.wallThickness, pool.length + 2 * pool.wallThickness);
const poolBottomMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, // White color
    roughness: 1,
    metalness: 0
});
const poolBottom = new THREE.Mesh(poolBottomGeometry, poolBottomMaterial);

// Rotate and position the bottom
poolBottom.rotation.x = -Math.PI / 2; // Make it horizontal
poolBottom.position.set(0, -14, pool.length / 2); // Align with the base of the extended walls
scene.add(poolBottom);

// Create foam as a surface
const foamHeight = pool.wallHeight - 2; // Slightly below the top of the walls
const waveEnd = pool.waveLength; // End of wave/Start of foam zone
const foamLength = pool.length - waveEnd; // Length from wave end to pool end

// Create a plane for the foam surface
const foamGeometry = new THREE.PlaneGeometry(pool.width, foamLength);
const foamMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1, // Very low roughness for high shine
    metalness: 0.2, // Slight metallic effect
    opacity: 0.9,
    transparent: true,
    emissive: 0xffffff, // Add white emission
    emissiveIntensity: 0.8, // Higher emission intensity
    side: THREE.DoubleSide // Make it visible from both sides
});
const foamMesh = new THREE.Mesh(foamGeometry, foamMaterial);

// Position foam surface at the top of where the foam block was
foamMesh.position.set(0, foamHeight, foamLength / 2);
// Rotate to be horizontal
foamMesh.rotation.x = -Math.PI / 2;

// Add foam to the scene
scene.add(foamMesh);

// Create foam bubbles
const foamBubbles = [];
const numBubbles = 50; // Number of foam bubbles
const bubbleGeometry = new THREE.SphereGeometry(1.0, 16, 16); // 1m radius bubbles
const bubbleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1, // Very low roughness for high shine
    metalness: 0.2, // Slight metallic effect
    opacity: 0.9,
    transparent: true,
    emissive: 0xffffff, // Add white emission
    emissiveIntensity: 0.8 // Higher emission intensity for bubbles
});

// Create and position foam bubbles
for (let i = 0; i < numBubbles; i++) {
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);

    // Random position within foam zone at the northern end
    const x = (Math.random() - 0.5) * pool.width;
    const z = Math.random() * foamLength; // Position above the foam surface
    const y = foamHeight + 1; // Start just above the foam surface

    bubble.position.set(x, y, z);

    // Add oscillation parameters
    bubble.userData = {
        baseY: y,
        phase: Math.random() * Math.PI * 2, // Random starting phase
        speed: 5.0, // Oscillation speed
        emissiveIntensity: 0.8 + Math.random() * 0.4 // Random variation in glow intensity
    };

    scene.add(bubble);
    foamBubbles.push(bubble);
}

// Function to update foam bubbles
function updateFoamBubbles(dt) {
    foamBubbles.forEach(bubble => {
        const data = bubble.userData;
        // Simple vertical oscillation around foam surface
        bubble.position.y = data.baseY + Math.sin(data.phase + data.speed * dt) * 1.0; // 1.0 is bubble radius
        data.phase += dt; // Update phase

        // Pulse the emissive intensity
        bubble.material.emissiveIntensity = data.emissiveIntensity + Math.sin(data.phase * 2) * 0.2;
    });
}

// Create wooden material for pool sides
const woodMaterial = new THREE.MeshStandardMaterial({
    color: 0x00BFFF,  // Deep sky blue color for side walls
    roughness: 0.7,
    metalness: 0.1
});

// Create glass material for wall tops
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.1,
    transmission: 0.5, // Makes it semi-transparent
    thickness: 0.5,    // Adds some depth to the glass
    clearcoat: 1.0,    // Adds a glossy layer
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.8
});

// Adjust wall height to extend 14m lower (10m + 4m for tilt)
const extendedWallHeight = pool.wallHeight + 14;
const glassHeight = 4; // Height of the glass section (increased from 2m to 4m)
const solidWallHeight = extendedWallHeight - glassHeight; // Height of the solid wall section

// Create side walls (solid part)
const westWallSolid = new THREE.Mesh(
    new THREE.BoxGeometry(pool.wallThickness, solidWallHeight, pool.length),
    woodMaterial
);
westWallSolid.position.set(-pool.width / 2 - pool.wallThickness / 2, solidWallHeight / 2 - 14, pool.length / 2);

const eastWallSolid = new THREE.Mesh(
    new THREE.BoxGeometry(pool.wallThickness, solidWallHeight, pool.length),
    woodMaterial
);
eastWallSolid.position.set(pool.width / 2 + pool.wallThickness / 2, solidWallHeight / 2 - 14, pool.length / 2);

// Create side walls (glass part)
const westWallGlass = new THREE.Mesh(
    new THREE.BoxGeometry(pool.wallThickness, glassHeight, pool.length),
    glassMaterial
);
westWallGlass.position.set(-pool.width / 2 - pool.wallThickness / 2, solidWallHeight + glassHeight / 2 - 14, pool.length / 2);

const eastWallGlass = new THREE.Mesh(
    new THREE.BoxGeometry(pool.wallThickness, glassHeight, pool.length),
    glassMaterial
);
eastWallGlass.position.set(pool.width / 2 + pool.wallThickness / 2, solidWallHeight + glassHeight / 2 - 14, pool.length / 2);

// Create end walls (solid part)
const northWallSolid = new THREE.Mesh(
    new THREE.BoxGeometry(pool.width + 2 * pool.wallThickness, solidWallHeight, pool.wallThickness),
    new THREE.MeshStandardMaterial({
        color: 0xFF4500,  // Orange red color (north end)
        roughness: 0.7,
        metalness: 0.1
    })
);
northWallSolid.position.set(0, solidWallHeight / 2 - 14, 0);

const southWallSolid = new THREE.Mesh(
    new THREE.BoxGeometry(pool.width + 2 * pool.wallThickness, solidWallHeight, pool.wallThickness),
    new THREE.MeshStandardMaterial({
        color: 0xFFD700,  // Gold color (south end)
        roughness: 0.7,
        metalness: 0.1
    })
);
southWallSolid.position.set(0, solidWallHeight / 2 - 14, pool.length);

// Create end walls (glass part)
const northWallGlass = new THREE.Mesh(
    new THREE.BoxGeometry(pool.width + 2 * pool.wallThickness, glassHeight, pool.wallThickness),
    glassMaterial
);
northWallGlass.position.set(0, solidWallHeight + glassHeight / 2 - 14, 0);

const southWallGlass = new THREE.Mesh(
    new THREE.BoxGeometry(pool.width + 2 * pool.wallThickness, glassHeight, pool.wallThickness),
    glassMaterial
);
southWallGlass.position.set(0, solidWallHeight + glassHeight / 2 - 14, pool.length);

// Add walls to scene
scene.add(westWallSolid);
scene.add(eastWallSolid);
scene.add(westWallGlass);
scene.add(eastWallGlass);
scene.add(northWallSolid);
scene.add(southWallSolid);
scene.add(northWallGlass);
scene.add(southWallGlass);

// Adjust pool floor to align with the base of the walls
poolBottom.position.y = -14; // Align with the base of the extended walls

// Add additional lighting
const pointLight = new THREE.PointLight(0xffffff, 1, 200); // Bright white point light
pointLight.position.set(0, 20, pool.length / 2); // Position above the pool
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0xffffff, 0.8); // Spotlight for directional lighting
spotLight.position.set(50, 30, 50); // Position at an angle
spotLight.target = waterMesh; // Point towards the water
scene.add(spotLight);

// Add lighting to see materials properly
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);

// Function to create a fluffy cloud
function createCloud() {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff, // Glow effect
        emissiveIntensity: 0.5,
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9
    });

    // Add multiple spheres to form a fluffy cloud
    for (let i = 0; i < 5; i++) {
        const sphereGeometry = new THREE.SphereGeometry(Math.random() * 2 + 2, 16, 16);
        const sphere = new THREE.Mesh(sphereGeometry, cloudMaterial);
        sphere.position.set(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 5
        );
        cloud.add(sphere);
    }

    return cloud;
}

// Add clouds to the scene
function addClouds() {
    const numClouds = 50;
    for (let i = 0; i < numClouds; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 200, // Spread clouds across the sky
            30 + Math.random() * 20,    // Height above the pool
            (Math.random() - 0.5) * 200
        );
        scene.add(cloud);
    }
}

// Call the function to add clouds
addClouds();

// Create stadium seating around the pool
function createStadiumSeating() {
    const seatingSections = new THREE.Group();

    // Parameters for the seating and deck
    const deckWidth = 3; // Width of the walkway around the pool
    const rowHeight = 1; // Height of each seating row
    const rowDepth = 2; // Depth of each row
    const numRows = 8; // Number of seating rows
    const deckHeight = 0.2; // Height of the deck
    const baseHeight = 6; // Start at the bottom of the glass walls
    const stairWidth = 2;

    // Colors for seats (vibrant stadium colors)
    const seatColors = [0xFF0000, 0x0000FF, 0xFFFF00, 0x00FF00, 0xFF00FF, 0x00FFFF, 0xFF8C00, 0xFF1493];

    // Create a single section (will be rotated for different sides)
    const createSection = (direction) => {
        const sectionGroup = new THREE.Group();

        // Create deck
        const deckMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            specular: 0x333333,
            shininess: 30
        });

        const deckGeometry = new THREE.BoxGeometry(pool.width + 2 * pool.wallThickness, deckHeight, deckWidth);
        const deck = new THREE.Mesh(deckGeometry, deckMaterial);
        deck.position.set(0, baseHeight + deckHeight / 2, deckWidth / 2);
        sectionGroup.add(deck);

        // Create seating rows
        for (let row = 0; row < numRows; row++) {
            const seatGeometry = new THREE.BoxGeometry(
                pool.width + 2 * pool.wallThickness,
                rowHeight,
                rowDepth
            );

            const seatMaterial = new THREE.MeshPhongMaterial({
                color: seatColors[row % seatColors.length],
                specular: 0x333333,
                shininess: 30
            });

            const seatRow = new THREE.Mesh(seatGeometry, seatMaterial);
            seatRow.position.set(
                0,
                baseHeight + deckHeight + row * rowHeight + rowHeight / 2,
                deckWidth + row * rowDepth + rowDepth / 2
            );
            sectionGroup.add(seatRow);
        }

        // Add stairs on both ends
        const stairGeometry = new THREE.BoxGeometry(
            stairWidth,
            numRows * rowHeight,
            numRows * rowDepth
        );
        const stairMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            specular: 0x333333,
            shininess: 30
        });

        // Left stairs
        const leftStairs = new THREE.Mesh(stairGeometry, stairMaterial);
        leftStairs.position.set(
            -(pool.width + 2 * pool.wallThickness) / 2 - stairWidth / 2,
            baseHeight + deckHeight + (numRows * rowHeight) / 2,
            deckWidth + (numRows * rowDepth) / 2
        );
        sectionGroup.add(leftStairs);

        // Right stairs
        const rightStairs = new THREE.Mesh(stairGeometry, stairMaterial);
        rightStairs.position.set(
            (pool.width + 2 * pool.wallThickness) / 2 + stairWidth / 2,
            baseHeight + deckHeight + (numRows * rowHeight) / 2,
            deckWidth + (numRows * rowDepth) / 2
        );
        sectionGroup.add(rightStairs);

        // Position and rotate the section based on direction
        switch (direction) {
            case 'north':
                sectionGroup.position.z = pool.length;
                break;
            case 'south':
                sectionGroup.rotation.y = Math.PI;
                break;
            case 'east':
                sectionGroup.rotation.y = Math.PI / 2;  // Changed from -Math.PI/2
                sectionGroup.position.x = pool.width / 2;
                sectionGroup.position.z = pool.length / 2;
                break;
            case 'west':
                sectionGroup.rotation.y = -Math.PI / 2;  // Changed from Math.PI/2
                sectionGroup.position.x = -pool.width / 2;
                sectionGroup.position.z = pool.length / 2;
                break;
        }

        seatingSections.add(sectionGroup);
    };

    // Create all sections
    ['north', 'south', 'east', 'west'].forEach(createSection);

    return seatingSections;
}

// Add stadium seating to the scene
const stadiumSeating = createStadiumSeating();
scene.add(stadiumSeating);

// Create a simple surfboard from primitives
const surfboardGroup = new THREE.Group();

// Create the main board shape using a box
const boardGeometry = new THREE.BoxGeometry(surfer.boardWidth, surfer.boardThickness, surfer.boardLength);
const boardMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,      // Pure white
    roughness: 0.05,      // Very smooth
    metalness: 0.2,       // Slight metallic sheen for gelcoat look
    envMapIntensity: 1.5, // Enhance reflections
    clearcoat: 1.0,       // Add gelcoat layer
    clearcoatRoughness: 0.1, // Make gelcoat glossy
    transmission: 0.1,    // Slight translucency for wet look
    thickness: 0.5        // Add some depth
});
const surfboard = new THREE.Mesh(boardGeometry, boardMaterial);

// Add a circular end cap at the front
const endCapGeometry = new THREE.CylinderGeometry(
    surfer.boardWidth / 2,  // top radius (half the board width)
    surfer.boardWidth / 2,  // bottom radius
    surfer.boardThickness, // height (same as board thickness)
    32  // more segments for smoother circle
);
// Rotate cylinder to lie flat on board
endCapGeometry.rotateY(Math.PI / 2);
const endCapMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,      // Pure white
    roughness: 0.05,      // Very smooth
    metalness: 0.2,       // Slight metallic sheen for gelcoat look
    envMapIntensity: 1.5, // Enhance reflections
    clearcoat: 1.0,       // Add gelcoat layer
    clearcoatRoughness: 0.1, // Make gelcoat glossy
    transmission: 0.1,    // Slight translucency for wet look
    thickness: 0.5        // Add some depth
});
const endCap = new THREE.Mesh(endCapGeometry, endCapMaterial);
// Position at front of board (negative Z)
endCap.position.set(0, 0, -surfer.boardLength / 2);
surfboard.add(endCap);

// Add the board to the group
surfboardGroup.add(surfboard);

// Add to the scene
scene.add(surfboardGroup);

// Create the surfer's left arm
// Notes on orientation:
// - Surfboard faces negative Z direction
// - Arm is a cylinder where the circular ends are shoulder and hand
// - Shoulder (pivot point) should be at positive Z
// - Hand should be at negative Z (same direction as surfboard)
// - Arm will pivot left/right ±5 degrees when turning

const armLength = 0.7; // 70cm
// Create cylinder where the circular faces will be shoulder/hand
// By default cylinder is along Y with circular faces on top/bottom
const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, armLength, 8);
const armMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 }); // Black
const arm = new THREE.Mesh(armGeometry, armMaterial);
// Move the arm so its shoulder end (bottom circular face) is at the pivot point
arm.position.y = armLength / 2;

// Create a shoulder pivot point
const shoulderPivot = new THREE.Group();

shoulderPivot.add(arm);

// Create the hand at the negative Z end (front end)
const handGeometry = new THREE.SphereGeometry(0.07); // 7cm radius sphere
const handMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
const hand = new THREE.Mesh(handGeometry, handMaterial);
// Position hand at the top circular face
hand.position.y = armLength / 2;
arm.add(hand);

// Add the shoulder pivot to the surfboard
surfboardGroup.add(shoulderPivot);

// Update shoulder pivot position relative to surfboard
shoulderPivot.position.set(
    -0.3,  // 30cm to the left of surfboard center
    1.5,   // 1.5m above surfboard
    1.0    // 1m back from surfboard center
);

// Apply base rotation and turn rotation to the shoulder pivot
shoulderPivot.rotation.x = -Math.PI / 2; // Pivot down 90 degrees
shoulderPivot.rotation.y = 0;            // Point forward

// Set initial camera position with no smoothing
updateCamera(1.0);

// Debugging helpers
const gridHelper = new THREE.GridHelper(200, 50); // Create a grid helper
gridHelper.position.y = -14; // Position the grid at the pool floor level
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(10);
axesHelper.position.set(0, 10, pool.length - 10); // Position axes closer to the north end of the pool
scene.add(axesHelper);
// The AxesHelper colors:
// - X-axis: Red
// - Y-axis: Green
// - Z-axis: Blue

// Debug mode state
let debugMode = false;

// Add default HUD style
document.getElementById('hud').style.display = 'none';

// Add debug mode toggle
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'd') {
        debugMode = !debugMode;
        document.getElementById('hud').style.display = debugMode ? 'block' : 'none';
    }
});

// Keyboard input
let leftPressed = false, rightPressed = false, upPressed = false, downPressed = false;
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = true;
    else if (e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'ArrowUp') upPressed = true;
    else if (e.key === 'ArrowDown') downPressed = true; // Changed from false to true
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = false;
    else if (e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'ArrowUp') upPressed = false;
    else if (e.key === 'ArrowDown') downPressed = false;
});

// Add nipple control
const nippleOptions = {
    zone: document.getElementById('nipple'),
    mode: 'static',
    position: { left: '50px', bottom: '50px' },
    color: 'white',
    size: 120
};

const nipple = nipplejs.create(nippleOptions);

nipple.on('move', (evt, data) => {
    // Convert angle to radians
    const angle = data.angle.radian;
    // Calculate turn input based on angle
    // -1 to 1 range, where -1 is full left turn and 1 is full right turn
    const turnInput = Math.cos(angle);
    // Calculate posture input based on angle
    // -1 to 1 range, where -1 is back and 1 is forward
    const postureInput = Math.sin(angle);

    // Update the turn state (left/right)
    leftPressed = turnInput < -0.5;  // Left gesture turns left
    rightPressed = turnInput > 0.5;  // Right gesture turns right

    // Update the posture state (forward/back)
    upPressed = postureInput > 0.5;    // Up gesture moves forward
    downPressed = postureInput < -0.5; // Down gesture moves back
});

nipple.on('end', () => {
    leftPressed = false;
    rightPressed = false;
    upPressed = false;
    downPressed = false;
});

// Animation helper functions
function updateCamera(smooth_factor) {
    const CAMERA_TILT = 0;// 0.2;

    // Position camera directly above surfer position in board space
    const headOffset = new THREE.Vector3(0, surfer.height, 1);
    const cameraLocalPos = surfboardGroup.worldToLocal(camera.position.clone());
    cameraLocalPos.copy(headOffset);
    const cameraWorldPos = surfboardGroup.localToWorld(cameraLocalPos);

    // Smooth camera movement
    camera.position.lerp(cameraWorldPos, smooth_factor);

    // Calculate look direction in board space
    const forward = new THREE.Vector3(0, 0, -1);
    const lookDir = forward.clone();
    lookDir.y -= CAMERA_TILT;

    // Transform look direction to world space
    const worldLookDir = surfboardGroup.localToWorld(lookDir.clone()).sub(surfboardGroup.position);
    const targetPos = camera.position.clone().add(worldLookDir);
    camera.lookAt(targetPos);
}

// Update the surfboard's position and rotation to pivot around the surfer
function updateSurfboard() {
    // Update main surfboard
    surfboardGroup.position.copy(surfer.getBoardPosition());
    surfboardGroup.rotation.copy(surfer.getBoardPitch());
}

// Update the surfer's arm position and rotation
function updateArm() {
    // Calculate arm rotation based on turn input
    const turnInput = (leftPressed ? 1 : 0) - (rightPressed ? 1 : 0);
    const armRotation = turnInput * (15 * Math.PI / 180); // 15 degrees in radians

    shoulderPivot.rotation.z = armRotation;  // Apply turn rotation
}

// Function to reset the game
function resetGame() {
    surfer.reset(); // Reset surfer's position and state
    updateCamera(1.0);
    beachBallsPopped = 0; // Reset beach balls popped counter
    scene.background = new THREE.Color(0x87CEEB);
    gameState = "playing";
}

// Update the isInFoam function to use the fixed foam zone
function isInFoam(position) {
    const waveEnd = pool.length - pool.waveLength;
    return position.z <= waveEnd;
}

// Create beach balls
const beachBalls = [];
const beachBallGeometry = new THREE.SphereGeometry(2.0, 16, 16); // 4m diameter (doubled from 2m)
const beachBallMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000, // Red color
    roughness: 0.2,  // Lower roughness for more shininess
    metalness: 0.9  // Higher metalness for more reflectivity
});

// Function to create a new beach ball
function createBeachBall() {
    const beachBall = new THREE.Mesh(beachBallGeometry, beachBallMaterial);
    // Position at south end of wave
    beachBall.position.set(
        (Math.random() - 0.5) * pool.width, // Random x position
        0, // Will be updated to wave height
        pool.length // South end
    );
    scene.add(beachBall);
    beachBalls.push(beachBall);
}

// Initialize game state
let beachBallsPopped = 0;

// Create pop message element
const popMessage = document.getElementById('pop-message');
popMessage.classList.add('arcade-text');
popMessage.textContent = 'POP!';

// Create foam zone overlay
const foamOverlay = document.getElementById('foam-zone-overlay');
foamOverlay.classList.add('arcade-text');
foamOverlay.textContent = 'FOAM ZONE!';

// Create arcade-style score display
const scoreDisplay = document.getElementById('score-display');
scoreDisplay.classList.add('arcade-text');

// Show pop message
function showPopMessage() {
    beachBallsPopped++;
    popMessage.style.opacity = '1';
    setTimeout(() => {
        popMessage.style.opacity = '0';
    }, 500);
}

// Function to check collision between surfboard and beach ball
function checkCollision(surfboardPos, beachBallPos) {
    // Get surfboard dimensions from surfer instance
    const boardLength = surfer.boardLength;
    const boardWidth = surfer.boardWidth;
    const ballRadius = 2.0; // Beach ball radius (4m diameter / 2)

    // Calculate surfboard corners in local space
    const corners = [
        { x: -boardWidth / 2, z: -boardLength / 2 },
        { x: boardWidth / 2, z: -boardLength / 2 },
        { x: boardWidth / 2, z: boardLength / 2 },
        { x: -boardWidth / 2, z: boardLength / 2 }
    ];

    // Rotate corners based on surfer's theta
    const rotatedCorners = corners.map(corner => {
        return {
            x: corner.x * Math.cos(surfer.theta) - corner.z * Math.sin(surfer.theta) + surfboardPos.x,
            y: surfboardPos.y,
            z: corner.x * Math.sin(surfer.theta) + corner.z * Math.cos(surfer.theta) + surfboardPos.z
        };
    });

    // Check if any corner is within ball radius
    for (const corner of rotatedCorners) {
        const dx = corner.x - beachBallPos.x;
        const dy = corner.y - beachBallPos.y;
        const dz = corner.z - beachBallPos.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance < ballRadius) {
            return true;
        }
    }

    // Check if ball center is within the rotated board rectangle
    const localBallX = (beachBallPos.x - surfboardPos.x) * Math.cos(-surfer.theta) -
        (beachBallPos.z - surfboardPos.z) * Math.sin(-surfer.theta);
    const localBallZ = (beachBallPos.x - surfboardPos.x) * Math.sin(-surfer.theta) +
        (beachBallPos.z - surfboardPos.z) * Math.cos(-surfer.theta);

    if (Math.abs(localBallX) <= boardWidth / 2 && Math.abs(localBallZ) <= boardLength / 2) {
        return true;
    }

    return false;
}

// Update the beach ball collision handling in updateBeachBalls
function updateBeachBalls(dt) {
    const k = 2 * Math.PI / pool.waveLength; // Wave number

    // Spawn new beach ball every 5 seconds
    if (Math.random() < dt / 5) {
        createBeachBall();
    }

    // Get surfboard position
    const surfboardPos = surfer.getBoardPosition();

    // Update existing beach balls
    for (let i = beachBalls.length - 1; i >= 0; i--) {
        const beachBall = beachBalls[i];

        // Move north
        beachBall.position.z -= pool.waveSpeed * dt;

        // Calculate the tilt based on z position
        const tilt = -(pool.tiltHeight * (beachBall.position.z / pool.length));

        // Update y position to follow the wave profile with tilt
        beachBall.position.y = pool.waveAmplitude * Math.cos(k * (pool.length - beachBall.position.z)) + tilt;

        // Check for collision with surfboard
        if (checkCollision(surfboardPos, beachBall.position)) {
            createPopEffect(beachBall.position); // Create particle effect at ball position
            scene.remove(beachBall);
            beachBalls.splice(i, 1);
            showPopMessage();
        }

        // Remove beach ball if it reaches the north end of the wave
        if (beachBall.position.z <= pool.length - pool.waveLength) {
            scene.remove(beachBall);
            beachBalls.splice(i, 1);
        }
    }
}

// Create particle system for pop effects
const particleGeometry = new THREE.BufferGeometry();
const particleCount = 50; // Number of particles per pop
const particlePositions = new Float32Array(particleCount * 3);
const particleVelocities = [];
const particleLifetimes = [];
const particleMaterial = new THREE.PointsMaterial({
    color: 0xff0000, // Red color like the beach balls
    size: 0.2, // Small particle size
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending // Makes particles glow
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Initialize particle geometry with empty positions
particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
particles.visible = false; // Start with particles hidden

// Function to create pop effect
function createPopEffect(position) {
    // Reset particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
        // Random position around the beach ball
        const radius = 2.0; // Same as beach ball radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;

        particlePositions[i * 3] = position.x + radius * Math.sin(theta) * Math.cos(phi);
        particlePositions[i * 3 + 1] = position.y + radius * Math.sin(theta) * Math.sin(phi);
        particlePositions[i * 3 + 2] = position.z + radius * Math.cos(theta);

        // Random velocity outward
        const speed = 5 + Math.random() * 5; // 5-10 m/s
        particleVelocities[i] = {
            x: (particlePositions[i * 3] - position.x) * speed,
            y: (particlePositions[i * 3 + 1] - position.y) * speed,
            z: (particlePositions[i * 3 + 2] - position.z) * speed
        };

        // Random lifetime between 0.5 and 1.5 seconds
        particleLifetimes[i] = 0.5 + Math.random();
    }

    // Update geometry with new positions
    particleGeometry.attributes.position.needsUpdate = true;

    // Make particles visible
    particles.visible = true;
}

// Function to update particles
function updateParticles(dt) {
    if (!particles.visible) return;

    let allDead = true;
    for (let i = 0; i < particleCount; i++) {
        if (particleLifetimes[i] > 0) {
            allDead = false;
            // Update position
            particlePositions[i * 3] += particleVelocities[i].x * dt;
            particlePositions[i * 3 + 1] += particleVelocities[i].y * dt;
            particlePositions[i * 3 + 2] += particleVelocities[i].z * dt;

            // Update lifetime and opacity
            particleLifetimes[i] -= dt;
            const opacity = particleLifetimes[i] / (0.5 + Math.random());
            particleMaterial.opacity = opacity;
        }
    }

    // Update geometry with new positions
    particleGeometry.attributes.position.needsUpdate = true;

    // Hide particles when all are dead
    if (allDead) {
        particles.visible = false;
    }
}

// Create sharks
const sharks = [];
const sharkGeometry = new THREE.ConeGeometry(1, 2, 3); // Base radius 1m, height 2m, 3 segments
const sharkMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x000000, // Black color
    roughness: 0.2,  // Lower roughness for more shininess
    metalness: 0.9  // Higher metalness for more reflectivity
});

// Function to create sharks
function createSharks() {
    const numSharks = 5; // Number of sharks
    for (let i = 0; i < numSharks; i++) {
        const shark = new THREE.Mesh(sharkGeometry, sharkMaterial);
        shark.position.set(
            (Math.random() - 0.5) * pool.width, // Random x position within pool width
            0, // Start at water level
            Math.random() * pool.length // Random z position within pool length
        );
        scene.add(shark);
        sharks.push(shark);
    }
}

// Add sharks to the scene
createSharks();

// Function to update sharks
function updateSharks(dt) {
    const k = 2 * Math.PI / pool.waveLength; // Wave number

    sharks.forEach(shark => {
        // Move south
        shark.position.z -= pool.waveSpeed * dt;

        // Calculate the tilt based on z position
        const tilt = -(pool.tiltHeight * (shark.position.z / pool.length));

        // Update y position to follow the wave profile with tilt
        shark.position.y = pool.waveAmplitude * Math.cos(k * (pool.length - shark.position.z)) + tilt + 0.5;

        // Reset to north end when reaching south
        if (shark.position.z < 0) {
            shark.position.z = pool.length;
            shark.position.x = (Math.random() - 0.5) * pool.width; // Randomize x position
        }
    });
}

// Function to check shark collisions
function checkSharkCollisions() {
    // Get the shark attack message element
    const sharkAttackMessage = document.getElementById('shark-attack-message');
    const boardPosition = surfboardGroup.position;
    const boardDimensions = {
        width: surfer.boardWidth,
        length: surfer.boardLength,
        height: surfer.boardThickness
    };

    sharks.forEach(shark => {
        // Calculate distance between shark and board
        const dx = shark.position.x - boardPosition.x;
        const dz = shark.position.z - boardPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Check if shark is within collision range
        const collisionRange = 2; // 2m collision range
        if (distance < collisionRange) {
            // Show shark attack message
            sharkAttackMessage.style.opacity = 1;
            scene.background.lerp(new THREE.Color(0xff0000), 0.9);
            gameState = "restarting";

            // Reset game after 1 second
            setTimeout(() => {
                sharkAttackMessage.style.opacity = 0;
                resetGame();
            }, 1000);
        }
    });
}

// Animation loop
const clock = new THREE.Clock();
gameState = "playing";
function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);

    // Process input
    const turnInput = (leftPressed ? 1 : 0) - (rightPressed ? 1 : 0);
    const positionInput = (upPressed ? 1 : 0) - (downPressed ? 1 : 0);

    surfer.update(dt, turnInput, positionInput);

    // Update flowing objects
    updateFlowingObjects(dt);

    // Update foam bubbles
    updateFoamBubbles(dt);

    // Update beach balls
    updateBeachBalls(dt);
    // Update particles
    updateParticles(dt);
    // Update sharks
    updateSharks(dt);

    // Update surfboard
    updateSurfboard();
    // Update arm
    updateArm();


    if (gameState === "playing") {

        // Check collisions
        checkSharkCollisions();

        // Check if surfer is in foam zone
        const surferPosition = surfer.getBoardPosition();
        if (isInFoam(surferPosition)) {
            gameState = "restarting";
            foamOverlay.style.opacity = 1;
            scene.background.lerp(new THREE.Color(0xffffff), 0.1); // Smoothly transition to white
            // Reset game after 1 second
            setTimeout(() => {
                foamOverlay.style.opacity = 0;
                resetGame();
            }, 1000);
        }
    }

    // Update camera with smoothing
    updateCamera(1.0);

    // Update HUD
    if (debugMode) {
        document.getElementById('hud').innerHTML = `
            Speed: ${netVelocityMagnitude.toFixed(2)} m/s<br>
            Water Speed: ${surfer.waterSpeed.toFixed(2)} m/s<br>
            Heading: ${heading.toFixed(1)} deg<br>
            Position: (${surfer.x.toFixed(1)}, ${surfer.z.toFixed(1)})<br>
            Stance: ${surfer.getStanceName()}<br>
            Wave Slope: ${(waveSlope * 180 / Math.PI).toFixed(1)}°<br>
            Forces (N):<br>
            - Gravity: ${gravityMagnitude.toFixed(1)}<br>
            - Drag: ${dragMagnitude.toFixed(1)}<br>
            - Water: ${waterMagnitude.toFixed(1)}<br>
            Net Velocity: ${netVelocityMagnitude.toFixed(2)} m/s<br>
            Beachballs Popped: ${beachBallsPopped}<br>
        `;
    }

    // Update score display
    scoreDisplay.innerHTML = `Beach Balls × ${beachBallsPopped}`;

    renderer.render(scene, camera);
}

animate();
