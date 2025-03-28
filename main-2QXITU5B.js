// main.js
import * as THREE2 from "three";

// Pool.js
var Pool = class {
  constructor() {
    this.width = 100;
    this.length = 100;
    this.waveLength = 75;
    this.waveAmplitude = 9;
    this.wallHeight = 10;
    this.wallThickness = 1;
    this.tiltHeight = 3;
  }
};

// Surfer.js
import * as THREE from "three";
var Surfer = class {
  constructor(pool2) {
    this.pool = pool2;
    this.g = -9.8;
    this.baseTurnRate = 1.5;
    this.C_long = 0.4;
    this.C_lat = 0.9;
    this.driveFactor = 200;
    this.waterSpeed = -10;
    this.mass = 70;
    this.height = 1.8;
    this.pumpingForceMagnitude = 100;
    this.tiltFactor = 0.5;
    this.velocity = { vx: 0, vz: 0 };
    this.lastPositionInput = 0;
    this.boardLength = 2.5;
    this.boardWidth = 0.45;
    this.boardThickness = 0.05;
    this.boardArea = 0.7 * this.boardLength * this.boardWidth;
    this.boardLiftCoefficient = 0.05;
    this.waterDensity = 1025;
    this.reset();
  }
  reset() {
    this.x = 0;
    this.z = this.pool.length - 3 * this.pool.waveLength / 4;
    this.theta = Math.PI;
    this.velocity.vx = 0;
    this.velocity.vz = 0;
    this.positionOnBoard = 0;
    this.lastPositionInput = 0;
  }
  calculateGravityForce() {
    const slopeAngle = this.calculateWaveSlope();
    const gravityForce = this.mass * this.g;
    const tiltAngle = Math.atan2(-this.pool.tiltHeight, this.pool.length);
    return {
      x: gravityForce * Math.sin(this.theta),
      z: gravityForce * (Math.sin(slopeAngle) + Math.sin(tiltAngle)) * Math.cos(this.theta)
    };
  }
  calculateWaterForce() {
    const slopeAngle = this.calculateWaveSlope();
    const relativeVelocity = this.velocity.vz - this.waterSpeed;
    if (Math.abs(relativeVelocity) < 0.1) {
      return { x: 0, z: 0 };
    }
    const baseForce = 3 * Math.pow(relativeVelocity, 2);
    const backwardForce = -baseForce * Math.abs(Math.sin(this.theta));
    const sidewaysForce = baseForce * Math.sin(2 * this.theta);
    return {
      x: sidewaysForce,
      z: backwardForce
    };
  }
  calculateDragForce(turnInput) {
    const relativeVelocity = {
      vx: this.velocity.vx,
      vz: this.velocity.vz - this.waterSpeed
    };
    const relativeSpeed = Math.sqrt(
      Math.pow(relativeVelocity.vx, 2) + Math.pow(relativeVelocity.vz, 2)
    );
    const { dragMultiplier } = this.getStanceMultipliers();
    const C_long = this.C_long * dragMultiplier;
    const C_lat = this.C_lat;
    const dragMagnitude = (C_long * Math.abs(Math.cos(this.theta)) + C_lat * Math.abs(Math.sin(this.theta))) * relativeSpeed * relativeSpeed;
    return {
      x: -dragMagnitude * relativeVelocity.vx / relativeSpeed,
      z: -dragMagnitude * relativeVelocity.vz / relativeSpeed
    };
  }
  calculateLiftForce() {
    const total_relative_velocity = Math.sqrt(
      Math.pow(this.velocity.vx, 2) + Math.pow(this.velocity.vz - this.waterSpeed, 2)
    );
    const liftForce = 0.5 * this.waterDensity * Math.pow(total_relative_velocity, 2) * this.boardArea * this.boardLiftCoefficient;
    const l = { x: Math.cos(this.theta), z: Math.sin(this.theta) };
    return {
      x: liftForce * l.x,
      z: liftForce * l.z
    };
  }
  calculateWaveSlope() {
    const k = 2 * Math.PI / this.pool.waveLength;
    const df_dz = -this.pool.waveAmplitude * k * Math.sin(k * (this.pool.length - this.z));
    const tiltSlope = this.pool.tiltHeight / this.pool.length;
    const totalSlope = df_dz + tiltSlope;
    this.waveSlope = Math.atan(totalSlope);
    return this.waveSlope;
  }
  update(dt, turnInput, positionInput) {
    this.positionOnBoard = positionInput;
    const { turnMultiplier } = this.getStanceMultipliers();
    const turnRate = this.baseTurnRate * turnMultiplier;
    this.theta += turnInput * turnRate * dt;
    const F_gravity = this.calculateGravityForce();
    const F_water = this.calculateWaterForce();
    const F_drag = this.calculateDragForce(turnInput);
    const F_net = {
      x: F_water.x + F_gravity.x + F_drag.x,
      z: F_water.z + F_gravity.z + F_drag.z
    };
    const acceleration = { x: F_net.x / this.mass, z: F_net.z / this.mass };
    this.velocity.vx += acceleration.x * dt;
    this.velocity.vz += acceleration.z * dt;
    this.x += this.velocity.vx * dt;
    this.z += this.velocity.vz * dt;
    const wallTolerance = 1;
    const halfWidth = this.pool.width / 2 - wallTolerance;
    if (Math.abs(this.x) > halfWidth) {
      this.x = Math.sign(this.x) * halfWidth;
      this.velocity.vx = 0;
    }
  }
  getStanceMultipliers() {
    if (this.positionOnBoard === 1) {
      return { dragMultiplier: 0.7, turnMultiplier: 0.8 };
    } else if (this.positionOnBoard === -1) {
      return { dragMultiplier: 1.3, turnMultiplier: 1.2 };
    } else {
      return { dragMultiplier: 1, turnMultiplier: 1 };
    }
  }
  getBoardPosition() {
    const k = 2 * Math.PI / this.pool.waveLength;
    const tilt = -(this.pool.tiltHeight * (this.z / this.pool.length));
    const y = this.pool.waveAmplitude * Math.cos(k * (this.pool.length - this.z)) + tilt;
    return new THREE.Vector3(this.x, y, this.z);
  }
  getBoardPitch() {
    const slopeAngle = this.calculateWaveSlope();
    let pitch = slopeAngle * Math.cos(this.theta);
    if (this.positionOnBoard === 1) {
      pitch += 5 * Math.PI / 180;
    } else if (this.positionOnBoard === -1) {
      pitch += 25 * Math.PI / 180;
    } else {
      pitch += 15 * Math.PI / 180;
    }
    return new THREE.Euler(pitch, this.theta, 0, "YXZ");
  }
  getStanceName() {
    if (this.positionOnBoard === 1)
      return "Forward";
    if (this.positionOnBoard === -1)
      return "Back";
    return "Neutral";
  }
};

// main.js
var pool = new Pool();
var surfer = new Surfer(pool);
var scene = new THREE2.Scene();
var camera = new THREE2.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1e3);
var renderer = new THREE2.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE2.Color(8900331);
function createWaterMesh() {
  const positions = [];
  const indices = [];
  const segmentsX = 50;
  const segmentsZ = 50;
  for (let i = 0; i <= segmentsX; i++) {
    for (let j = 0; j <= segmentsZ; j++) {
      const x = (i / segmentsX - 0.5) * pool.width;
      const z = j / segmentsZ * pool.length;
      const tilt = -(pool.tiltHeight * (z / pool.length));
      let y = pool.waveAmplitude * Math.cos(2 * Math.PI / pool.waveLength * (pool.length - z)) + tilt;
      positions.push(x, y, z);
    }
  }
  for (let i = 0; i < segmentsX; i++) {
    for (let j = 0; j < segmentsZ; j++) {
      const a = i + j * (segmentsX + 1);
      const b = i + 1 + j * (segmentsX + 1);
      const c = i + 1 + (j + 1) * (segmentsX + 1);
      const d = i + (j + 1) * (segmentsX + 1);
      indices.push(a, b, c, a, c, d);
    }
  }
  const geometry = new THREE2.BufferGeometry();
  geometry.setAttribute("position", new THREE2.BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(new THREE2.BufferAttribute(new Uint16Array(indices), 1));
  geometry.computeVertexNormals();
  const material = new THREE2.MeshPhongMaterial({
    color: 255,
    specular: 1118481,
    shininess: 50,
    transparent: true,
    opacity: 0.8,
    side: THREE2.DoubleSide
  });
  return new THREE2.Mesh(geometry, material);
}
var waterMesh = createWaterMesh();
scene.add(waterMesh);
var flowingObjects = [];
var numObjects = 50;
var objectGeometry = new THREE2.SphereGeometry(0.2, 8, 8);
var objectMaterial = new THREE2.MeshBasicMaterial({ color: 16777215 });
for (let i = 0; i < numObjects; i++) {
  const obj = new THREE2.Mesh(objectGeometry, objectMaterial);
  obj.position.set(
    (Math.random() - 0.5) * pool.width,
    Math.random() * 2,
    Math.random() * pool.length
  );
  scene.add(obj);
  flowingObjects.push(obj);
}
function updateFlowingObjects(dt) {
  const flowSpeed = 10;
  const k = 2 * Math.PI / pool.waveLength;
  flowingObjects.forEach((obj) => {
    obj.position.z -= flowSpeed * dt;
    if (obj.position.z < 0) {
      obj.position.z = pool.length;
      obj.position.x = (Math.random() - 0.5) * pool.width;
    }
    const tilt = -(pool.tiltHeight * (obj.position.z / pool.length));
    obj.position.y = pool.waveAmplitude * Math.cos(k * (pool.length - obj.position.z)) + tilt;
  });
}
var poolBottomGeometry = new THREE2.PlaneGeometry(pool.width + 2 * pool.wallThickness, pool.length + 2 * pool.wallThickness);
var poolBottomMaterial = new THREE2.MeshStandardMaterial({
  color: 16777215,
  roughness: 1,
  metalness: 0
});
var poolBottom = new THREE2.Mesh(poolBottomGeometry, poolBottomMaterial);
poolBottom.rotation.x = -Math.PI / 2;
poolBottom.position.set(0, -10, pool.length / 2);
scene.add(poolBottom);
var foamHeight = pool.wallHeight - 2;
var waveEnd = pool.waveLength;
var foamLength = pool.length - waveEnd;
var foamGeometry = new THREE2.PlaneGeometry(pool.width, foamLength);
var foamMaterial = new THREE2.MeshStandardMaterial({
  color: 16777215,
  roughness: 0.1,
  metalness: 0.2,
  opacity: 0.9,
  transparent: true,
  emissive: 16777215,
  emissiveIntensity: 0.8,
  side: THREE2.DoubleSide
});
var foamMesh = new THREE2.Mesh(foamGeometry, foamMaterial);
foamMesh.position.set(0, foamHeight, foamLength / 2);
foamMesh.rotation.x = -Math.PI / 2;
scene.add(foamMesh);
var foamBubbles = [];
var numBubbles = 50;
var bubbleGeometry = new THREE2.SphereGeometry(1, 16, 16);
var bubbleMaterial = new THREE2.MeshStandardMaterial({
  color: 16777215,
  roughness: 0.1,
  metalness: 0.2,
  opacity: 0.9,
  transparent: true,
  emissive: 16777215,
  emissiveIntensity: 0.8
});
for (let i = 0; i < numBubbles; i++) {
  const bubble = new THREE2.Mesh(bubbleGeometry, bubbleMaterial);
  const x = (Math.random() - 0.5) * pool.width;
  const z = Math.random() * foamLength;
  const y = foamHeight + 1;
  bubble.position.set(x, y, z);
  bubble.userData = {
    baseY: y,
    phase: Math.random() * Math.PI * 2,
    speed: 5,
    emissiveIntensity: 0.8 + Math.random() * 0.4
  };
  scene.add(bubble);
  foamBubbles.push(bubble);
}
function updateFoamBubbles(dt) {
  foamBubbles.forEach((bubble) => {
    const data = bubble.userData;
    bubble.position.y = data.baseY + Math.sin(data.phase + data.speed * dt) * 1;
    data.phase += dt;
    bubble.material.emissiveIntensity = data.emissiveIntensity + Math.sin(data.phase * 2) * 0.2;
  });
}
var woodMaterial = new THREE2.MeshStandardMaterial({
  color: 49151,
  roughness: 0.7,
  metalness: 0.1
});
var glassMaterial = new THREE2.MeshPhysicalMaterial({
  color: 16777215,
  metalness: 0,
  roughness: 0.1,
  transmission: 0.5,
  thickness: 0.5,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.8
});
var extendedWallHeight = pool.wallHeight + 14;
var glassHeight = 4;
var solidWallHeight = extendedWallHeight - glassHeight;
var westWallSolid = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.wallThickness, solidWallHeight, pool.length),
  woodMaterial
);
westWallSolid.position.set(-pool.width / 2 - pool.wallThickness / 2, solidWallHeight / 2 - 14, pool.length / 2);
var eastWallSolid = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.wallThickness, solidWallHeight, pool.length),
  woodMaterial
);
eastWallSolid.position.set(pool.width / 2 + pool.wallThickness / 2, solidWallHeight / 2 - 14, pool.length / 2);
var westWallGlass = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.wallThickness, glassHeight, pool.length),
  glassMaterial
);
westWallGlass.position.set(-pool.width / 2 - pool.wallThickness / 2, solidWallHeight + glassHeight / 2 - 14, pool.length / 2);
var eastWallGlass = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.wallThickness, glassHeight, pool.length),
  glassMaterial
);
eastWallGlass.position.set(pool.width / 2 + pool.wallThickness / 2, solidWallHeight + glassHeight / 2 - 14, pool.length / 2);
var northWallSolid = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.width + 2 * pool.wallThickness, solidWallHeight, pool.wallThickness),
  new THREE2.MeshStandardMaterial({
    color: 16729344,
    roughness: 0.7,
    metalness: 0.1
  })
);
northWallSolid.position.set(0, solidWallHeight / 2 - 14, 0);
var southWallSolid = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.width + 2 * pool.wallThickness, solidWallHeight, pool.wallThickness),
  new THREE2.MeshStandardMaterial({
    color: 16766720,
    roughness: 0.7,
    metalness: 0.1
  })
);
southWallSolid.position.set(0, solidWallHeight / 2 - 14, pool.length);
var northWallGlass = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.width + 2 * pool.wallThickness, glassHeight, pool.wallThickness),
  glassMaterial
);
northWallGlass.position.set(0, solidWallHeight + glassHeight / 2 - 14, 0);
var southWallGlass = new THREE2.Mesh(
  new THREE2.BoxGeometry(pool.width + 2 * pool.wallThickness, glassHeight, pool.wallThickness),
  glassMaterial
);
southWallGlass.position.set(0, solidWallHeight + glassHeight / 2 - 14, pool.length);
scene.add(westWallSolid);
scene.add(eastWallSolid);
scene.add(westWallGlass);
scene.add(eastWallGlass);
scene.add(northWallSolid);
scene.add(southWallSolid);
scene.add(northWallGlass);
scene.add(southWallGlass);
poolBottom.position.y = -14;
var pointLight = new THREE2.PointLight(16777215, 1, 200);
pointLight.position.set(0, 20, pool.length / 2);
scene.add(pointLight);
var spotLight = new THREE2.SpotLight(16777215, 0.8);
spotLight.position.set(50, 30, 50);
spotLight.target = waterMesh;
scene.add(spotLight);
var ambientLight = new THREE2.AmbientLight(16777215, 0.5);
scene.add(ambientLight);
var directionalLight = new THREE2.DirectionalLight(16777215, 0.8);
directionalLight.position.set(50, 50, 50);
scene.add(directionalLight);
function createCloud() {
  const cloud = new THREE2.Group();
  const cloudMaterial = new THREE2.MeshStandardMaterial({
    color: 16777215,
    emissive: 16777215,
    emissiveIntensity: 0.5,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: 0.9
  });
  for (let i = 0; i < 5; i++) {
    const sphereGeometry = new THREE2.SphereGeometry(Math.random() * 2 + 2, 16, 16);
    const sphere = new THREE2.Mesh(sphereGeometry, cloudMaterial);
    sphere.position.set(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 5
    );
    cloud.add(sphere);
  }
  return cloud;
}
function addClouds() {
  const numClouds = 50;
  for (let i = 0; i < numClouds; i++) {
    const cloud = createCloud();
    cloud.position.set(
      (Math.random() - 0.5) * 200,
      30 + Math.random() * 20,
      (Math.random() - 0.5) * 200
    );
    scene.add(cloud);
  }
}
addClouds();
var surfboardProfile = [];
var boardLength = surfer.boardLength;
var boardWidth = surfer.boardWidth;
var boardThickness = surfer.boardThickness;
surfboardProfile.push(new THREE2.Vector2(0, -boardLength / 2));
for (let i = 0; i <= 20; i++) {
  const t = i / 20;
  const x = boardWidth * Math.sin(Math.PI * t);
  const y = -boardLength / 2 + t * boardLength;
  surfboardProfile.push(new THREE2.Vector2(x, y));
}
surfboardProfile.push(new THREE2.Vector2(0, boardLength / 2));
var surfboardGeometry = new THREE2.LatheGeometry(surfboardProfile, 32);
surfboardGeometry.translate(0, 0, -boardLength * (1 / 4));
var surfboardMaterial = new THREE2.MeshStandardMaterial({ color: 16777215 });
var surfboard = new THREE2.Mesh(surfboardGeometry, surfboardMaterial);
surfboard.rotation.x = Math.PI / 2;
var armLength = 1;
var armGeometry = new THREE2.CylinderGeometry(0.05, 0.05, armLength, 8);
var armMaterial = new THREE2.MeshStandardMaterial({ color: 0 });
var arm = new THREE2.Mesh(armGeometry, armMaterial);
arm.position.set(0, 0, 0);
var shoulderPivot = new THREE2.Group();
shoulderPivot.add(arm);
var handGeometry = new THREE2.SphereGeometry(0.1, 4, 4);
var handMaterial = new THREE2.MeshStandardMaterial({ color: 9127187 });
var hand = new THREE2.Mesh(handGeometry, handMaterial);
hand.position.y = armLength / 2;
arm.add(hand);
surfboard.add(shoulderPivot);
scene.add(surfboard);
updateCamera(1);
var gridHelper = new THREE2.GridHelper(200, 50);
gridHelper.position.y = -14;
scene.add(gridHelper);
var axesHelper = new THREE2.AxesHelper(10);
axesHelper.position.set(0, 10, pool.length - 10);
scene.add(axesHelper);
var leftPressed = false;
var rightPressed = false;
var upPressed = false;
var downPressed = false;
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")
    leftPressed = true;
  else if (e.key === "ArrowRight")
    rightPressed = true;
  else if (e.key === "ArrowUp")
    upPressed = true;
  else if (e.key === "ArrowDown")
    downPressed = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft")
    leftPressed = false;
  else if (e.key === "ArrowRight")
    rightPressed = false;
  else if (e.key === "ArrowUp")
    upPressed = false;
  else if (e.key === "ArrowDown")
    downPressed = false;
});
var nippleOptions = {
  zone: document.getElementById("nipple"),
  mode: "static",
  position: { right: "50px", bottom: "50px" },
  color: "white",
  size: 120
};
var nipple = nipplejs.create(nippleOptions);
nipple.on("move", (evt, data) => {
  const angle = data.angle.radian;
  const turnInput = Math.cos(angle);
  const postureInput = Math.sin(angle);
  leftPressed = turnInput < -0.5;
  rightPressed = turnInput > 0.5;
  upPressed = postureInput > 0.5;
  downPressed = postureInput < -0.5;
});
nipple.on("end", () => {
  leftPressed = false;
  rightPressed = false;
  upPressed = false;
  downPressed = false;
});
function updateCamera(smooth_factor) {
  const CAMERA_TILT = 0;
  const headOffset = new THREE2.Vector3(0, surfer.height, 0);
  const cameraLocalPos = surfboard.worldToLocal(camera.position.clone());
  cameraLocalPos.copy(headOffset);
  const cameraWorldPos = surfboard.localToWorld(cameraLocalPos);
  camera.position.lerp(cameraWorldPos, smooth_factor);
  const forward = new THREE2.Vector3(0, 0, -1);
  const lookDir = forward.clone();
  lookDir.y -= CAMERA_TILT;
  const worldLookDir = surfboard.localToWorld(lookDir.clone()).sub(surfboard.position);
  const targetPos = camera.position.clone().add(worldLookDir);
  camera.lookAt(targetPos);
}
function updateSurfboard() {
  surfboard.position.copy(surfer.getBoardPosition());
  surfboard.rotation.copy(surfer.getBoardPitch());
  shoulderPivot.position.set(
    -0.3,
    1.5,
    0
  );
}
function updateArm() {
  const turnInput = (leftPressed ? 1 : 0) - (rightPressed ? 1 : 0);
  const armRotation = turnInput * (15 * Math.PI / 180);
  arm.rotation.x = -Math.PI / 2;
  arm.rotation.y = 0;
  arm.rotation.z = armRotation;
}
function resetGame() {
  console.log("Game over!");
  surfer.reset();
  camera.position.set(0, 10, pool.length / 2);
  camera.lookAt(0, 0, 0);
  beachBallsPopped = 0;
}
function isInFoam(position) {
  const waveEnd2 = pool.length - pool.waveLength;
  return position.z <= waveEnd2;
}
var beachBalls = [];
var beachBallGeometry = new THREE2.SphereGeometry(2, 16, 16);
var beachBallMaterial = new THREE2.MeshStandardMaterial({
  color: 16711680,
  roughness: 0.2,
  metalness: 0.9
});
function createBeachBall() {
  const beachBall = new THREE2.Mesh(beachBallGeometry, beachBallMaterial);
  beachBall.position.set(
    (Math.random() - 0.5) * pool.width,
    0,
    pool.length
  );
  scene.add(beachBall);
  beachBalls.push(beachBall);
}
var beachBallsPopped = 0;
var popMessageOverlay = document.getElementById("pop-message-overlay");
var particleGeometry = new THREE2.BufferGeometry();
var particleCount = 50;
var particlePositions = new Float32Array(particleCount * 3);
var particleVelocities = [];
var particleLifetimes = [];
var particleMaterial = new THREE2.PointsMaterial({
  color: 16711680,
  size: 0.2,
  transparent: true,
  opacity: 1,
  blending: THREE2.AdditiveBlending
});
var particles = new THREE2.Points(particleGeometry, particleMaterial);
scene.add(particles);
particleGeometry.setAttribute("position", new THREE2.BufferAttribute(particlePositions, 3));
particles.visible = false;
function createPopEffect(position) {
  for (let i = 0; i < particleCount; i++) {
    const radius = 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 2;
    particlePositions[i * 3] = position.x + radius * Math.sin(theta) * Math.cos(phi);
    particlePositions[i * 3 + 1] = position.y + radius * Math.sin(theta) * Math.sin(phi);
    particlePositions[i * 3 + 2] = position.z + radius * Math.cos(theta);
    const speed = 5 + Math.random() * 5;
    particleVelocities[i] = {
      x: (particlePositions[i * 3] - position.x) * speed,
      y: (particlePositions[i * 3 + 1] - position.y) * speed,
      z: (particlePositions[i * 3 + 2] - position.z) * speed
    };
    particleLifetimes[i] = 0.5 + Math.random();
  }
  particleGeometry.attributes.position.needsUpdate = true;
  particles.visible = true;
}
function updateParticles(dt) {
  if (!particles.visible)
    return;
  let allDead = true;
  for (let i = 0; i < particleCount; i++) {
    if (particleLifetimes[i] > 0) {
      allDead = false;
      particlePositions[i * 3] += particleVelocities[i].x * dt;
      particlePositions[i * 3 + 1] += particleVelocities[i].y * dt;
      particlePositions[i * 3 + 2] += particleVelocities[i].z * dt;
      particleLifetimes[i] -= dt;
      const opacity = particleLifetimes[i] / (0.5 + Math.random());
      particleMaterial.opacity = opacity;
    }
  }
  particleGeometry.attributes.position.needsUpdate = true;
  if (allDead) {
    particles.visible = false;
  }
}
function showPopMessage() {
  beachBallsPopped++;
  popMessageOverlay.textContent = `${beachBallsPopped} Popped!`;
  popMessageOverlay.classList.add("visible");
  setTimeout(() => {
    popMessageOverlay.classList.remove("visible");
  }, 1e3);
}
function checkCollision(surfboardPos, beachBallPos) {
  const boardLength2 = surfer.boardLength;
  const boardWidth2 = surfer.boardWidth;
  const ballRadius = 2;
  const corners = [
    { x: -boardWidth2 / 2, z: -boardLength2 / 2 },
    { x: boardWidth2 / 2, z: -boardLength2 / 2 },
    { x: boardWidth2 / 2, z: boardLength2 / 2 },
    { x: -boardWidth2 / 2, z: boardLength2 / 2 }
  ];
  const rotatedCorners = corners.map((corner) => {
    return {
      x: corner.x * Math.cos(surfer.theta) - corner.z * Math.sin(surfer.theta) + surfboardPos.x,
      y: surfboardPos.y,
      z: corner.x * Math.sin(surfer.theta) + corner.z * Math.cos(surfer.theta) + surfboardPos.z
    };
  });
  for (const corner of rotatedCorners) {
    const dx = corner.x - beachBallPos.x;
    const dy = corner.y - beachBallPos.y;
    const dz = corner.z - beachBallPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance < ballRadius) {
      return true;
    }
  }
  const localBallX = (beachBallPos.x - surfboardPos.x) * Math.cos(-surfer.theta) - (beachBallPos.z - surfboardPos.z) * Math.sin(-surfer.theta);
  const localBallZ = (beachBallPos.x - surfboardPos.x) * Math.sin(-surfer.theta) + (beachBallPos.z - surfboardPos.z) * Math.cos(-surfer.theta);
  if (Math.abs(localBallX) <= boardWidth2 / 2 && Math.abs(localBallZ) <= boardLength2 / 2) {
    return true;
  }
  return false;
}
function updateBeachBalls(dt) {
  const flowSpeed = 10;
  const k = 2 * Math.PI / pool.waveLength;
  if (Math.random() < dt / 5) {
    createBeachBall();
  }
  const surfboardPos = surfer.getBoardPosition();
  for (let i = beachBalls.length - 1; i >= 0; i--) {
    const beachBall = beachBalls[i];
    beachBall.position.z -= flowSpeed * dt;
    const tilt = -(pool.tiltHeight * (beachBall.position.z / pool.length));
    beachBall.position.y = pool.waveAmplitude * Math.cos(k * (pool.length - beachBall.position.z)) + tilt;
    if (checkCollision(surfboardPos, beachBall.position)) {
      createPopEffect(beachBall.position);
      scene.remove(beachBall);
      beachBalls.splice(i, 1);
      showPopMessage();
    }
    if (beachBall.position.z <= pool.length - pool.waveLength) {
      scene.remove(beachBall);
      beachBalls.splice(i, 1);
    }
  }
}
var clock = new THREE2.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);
  updateFlowingObjects(dt);
  updateFoamBubbles(dt);
  updateBeachBalls(dt);
  updateParticles(dt);
  const turnInput = (leftPressed ? 1 : 0) - (rightPressed ? 1 : 0);
  const positionInput = (upPressed ? 1 : 0) - (downPressed ? 1 : 0);
  surfer.update(dt, turnInput, positionInput);
  updateSurfboard();
  updateArm();
  updateCamera(0.9);
  let heading = surfer.theta * 180 / Math.PI % 360;
  if (heading > 180)
    heading -= 360;
  else if (heading < -180)
    heading += 360;
  const gravityForce = surfer.calculateGravityForce();
  const dragForce = surfer.calculateDragForce(0);
  const waterForce = surfer.calculateWaterForce();
  const gravityMagnitude = Math.sqrt(gravityForce.x ** 2 + gravityForce.z ** 2);
  const dragMagnitude = Math.sqrt(dragForce.x ** 2 + dragForce.z ** 2);
  const waterMagnitude = Math.sqrt(waterForce.x ** 2 + waterForce.z ** 2);
  const netVelocityMagnitude = Math.sqrt(surfer.velocity.vx ** 2 + surfer.velocity.vz ** 2);
  const waveSlope = surfer.calculateWaveSlope();
  document.getElementById("hud").innerHTML = `
        Speed: ${netVelocityMagnitude.toFixed(2)} m/s<br>
        Water Speed: ${surfer.waterSpeed.toFixed(2)} m/s<br>
        Heading: ${heading.toFixed(1)} deg<br>
        Position: (${surfer.x.toFixed(1)}, ${surfer.z.toFixed(1)})<br>
        Stance: ${surfer.getStanceName()}<br>
        Wave Slope: ${(waveSlope * 180 / Math.PI).toFixed(1)}\xB0<br>
        Forces (N):<br>
        - Gravity: ${gravityMagnitude.toFixed(1)}<br>
        - Drag: ${dragMagnitude.toFixed(1)}<br>
        - Water: ${waterMagnitude.toFixed(1)}<br>
        Net Velocity: ${netVelocityMagnitude.toFixed(2)} m/s<br>
        Beachballs Popped: ${beachBallsPopped}<br>
    `;
  const surferPosition = surfer.getBoardPosition();
  const foamOverlay = document.getElementById("foam-zone-overlay");
  if (isInFoam(surferPosition)) {
    scene.background.lerp(new THREE2.Color(16777215), 0.1);
    foamOverlay.classList.add("visible");
  } else {
    scene.background.lerp(new THREE2.Color(8900331), 0.1);
    foamOverlay.classList.remove("visible");
  }
  const halfWidth = pool.width / 2;
  if (Math.abs(surfer.x) > halfWidth || surfer.z < 0 || surfer.z > pool.length) {
    resetGame();
  }
  renderer.render(scene, camera);
}
animate();
