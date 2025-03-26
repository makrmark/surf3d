import { Pool } from './Pool.js';
import * as THREE from 'three';

export class Surfer {
    constructor(pool) {
        this.pool = pool;
        this.g = -9.8;
        this.baseTurnRate = 1.5;
        this.C_long = 0.4; // Longitudinal drag coefficient
        this.C_lat = 0.9; // Lateral drag coefficient, higher than longitudinal
        this.driveFactor = 200;
        this.waterSpeed = -10; // Constant, possibly wave effect
        this.mass = 70;
        this.height = 1.8;
        this.pumpingForceMagnitude = 100; // Forward force when pumping
        this.tiltFactor = 0.5; // Increases lateral drag when turning
        this.velocity = { vx: 0, vz: 0 }; // Velocity in world coordinates
        this.lastPositionInput = 0;

        // Add surfboard dimensions
        this.boardLength = 2.5;  // 2.5m long
        this.boardWidth = 0.45;  // Half of 90cm wide
        this.boardThickness = 0.05;  // 5cm thick
        this.boardArea = 0.7 * this.boardLength * this.boardWidth; // Area in m^2 (rough est)
        this.boardLiftCoefficient = 0.05; // Lift coefficient
        this.waterDensity = 1025; // Salt Water density in kg/m^3

        this.reset();
    }

    reset() {
        this.x = 0;
        this.z = this.pool.length - (3 * this.pool.waveLength / 4);
        this.theta = Math.PI; // Board points toward +z
        this.velocity.vx = 0;
        this.velocity.vz = 0;
        this.positionOnBoard = 0;
        this.lastPositionInput = 0;
    }

    calculateGravityForce() {
        const slopeAngle = this.calculateWaveSlope(); // Get the slope angle
        const gravityForce = this.mass * this.g; // Total gravity force in y direction

        // Project gravity force onto the slope
        // When slope is negative (wave going up), force should be negative in z
        // When slope is positive (wave going down), force should be positive in z
        return {
            x: gravityForce * Math.sin(this.theta),
            z: gravityForce * Math.sin(slopeAngle) * Math.cos(this.theta)
        };
    }

    calculateWaterForce() {
        // Get the wave slope angle
        const slopeAngle = this.calculateWaveSlope();

        // Calculate relative velocity between board and water
        // we only care about z direction since waterSpeed is only in z direction
        const relativeVelocity = this.velocity.vz - this.waterSpeed;

        // If board is at water speed then return early with zero force
        if (Math.abs(relativeVelocity) < 0.1) {
            return { x: 0, z: 0 };
        }

        // Base force on square of relative velocity
        const baseForce = 3 * Math.pow(relativeVelocity, 2);

        // Calculate components of force
        // There is zero force when the board is parallel to the water flow
        // Backward force (z) is maximum at 90 degrees to water flow
        // Sideways force (x) is maximum at 45 degrees to water flow
        const backwardForce = -baseForce * Math.abs(Math.sin(this.theta));
        const sidewaysForce = baseForce * Math.sin(2 * this.theta); // This will peak at 45 degrees

        return {
            x: sidewaysForce,
            z: backwardForce
        };
    }

    calculateDragForce(turnInput) {
        // Calculate relative velocity between board and water
        const relativeVelocity = {
            vx: this.velocity.vx,
            vz: this.velocity.vz - this.waterSpeed
        };

        // Calculate relative speed
        const relativeSpeed = Math.sqrt(
            Math.pow(relativeVelocity.vx, 2) +
            Math.pow(relativeVelocity.vz, 2)
        );

        // Apply drag coefficients (longitudinal drag is reduced when forward)
        const { dragMultiplier } = this.getStanceMultipliers();
        const C_long = this.C_long * dragMultiplier;
        const C_lat = this.C_lat;

        // Calculate drag force magnitude
        const dragMagnitude = (C_long * Math.abs(Math.cos(this.theta)) + C_lat * Math.abs(Math.sin(this.theta))) * relativeSpeed * relativeSpeed;

        // Apply drag in the direction opposite to relative velocity
        return {
            x: -dragMagnitude * relativeVelocity.vx / relativeSpeed,
            z: -dragMagnitude * relativeVelocity.vz / relativeSpeed
        };
    }

    calculateLiftForce() {
        // Total relative velocity between the board and the water
        const total_relative_velocity = Math.sqrt(
            Math.pow(this.velocity.vx, 2) + Math.pow(this.velocity.vz - this.waterSpeed, 2)
        );

        // Lift force formula: F_L = 1/2 * rho * v^2 * A * C_L
        const liftForce = 0.5 * this.waterDensity * Math.pow(total_relative_velocity, 2) * this.boardArea * this.boardLiftCoefficient;

        // Direction of lift force (perpendicular to the board's motion)
        const l = { x: Math.cos(this.theta), z: Math.sin(this.theta) };

        return {
            x: liftForce * l.x,
            z: liftForce * l.z
        };
    }

    // negative slope means the wave is going up (increasing y)
    calculateWaveSlope() {
        const k = 2 * Math.PI / this.pool.waveLength; // Wave number
        const df_dz = -this.pool.waveAmplitude * k * Math.sin(k * (this.pool.length - this.z)); // Wave slope
        this.waveSlope = Math.atan(df_dz); // Store and return the slope angle
        return this.waveSlope;
    }

    update(dt, turnInput, positionInput) {
        this.positionOnBoard = positionInput;

        // Turning
        const { turnMultiplier } = this.getStanceMultipliers();
        const turnRate = this.baseTurnRate * turnMultiplier;
        this.theta += turnInput * turnRate * dt;

        // Forces
        const F_gravity = this.calculateGravityForce();
        const F_water = this.calculateWaterForce();
        const F_drag = this.calculateDragForce(turnInput);

        // Net force and acceleration
        const F_net = {
            x: F_water.x + F_gravity.x + F_drag.x,
            z: F_water.z + F_gravity.z + F_drag.z
        };
        const acceleration = { x: F_net.x / this.mass, z: F_net.z / this.mass };

        // Update velocity and position
        this.velocity.vx += acceleration.x * dt;
        this.velocity.vz += acceleration.z * dt;
        this.x += this.velocity.vx * dt;
        this.z += this.velocity.vz * dt;

        // Handle side wall collisions with 1m tolerance
        const wallTolerance = 1.0; // 1 meter buffer from walls
        const halfWidth = this.pool.width / 2 - wallTolerance;
        if (Math.abs(this.x) > halfWidth) {
            // If we've gone past the wall, move back to the wall
            this.x = Math.sign(this.x) * halfWidth;
            // Zero out sideways velocity
            this.velocity.vx = 0;
        }
    }

    getStanceMultipliers() {
        if (this.positionOnBoard === 1) { // Forward
            return { dragMultiplier: 0.7, turnMultiplier: 0.8 };
        } else if (this.positionOnBoard === -1) { // Back
            return { dragMultiplier: 1.3, turnMultiplier: 1.2 };
        } else { // Neutral
            return { dragMultiplier: 1.0, turnMultiplier: 1.0 };
        }
    }

    getBoardPosition() {
        const k = 2 * Math.PI / this.pool.waveLength;
        const y = (this.z >= this.pool.length - this.pool.waveLength) ?
            this.pool.waveAmplitude * Math.cos(k * (this.pool.length - this.z)) : 0;
        return new THREE.Vector3(this.x, y, this.z);
    }

    getBoardPitch() {
        const slopeAngle = this.calculateWaveSlope(); // Use calculateWaveSlope to get the slope angle
        let pitch = slopeAngle * Math.cos(this.theta);
        if (this.positionOnBoard === 1) {
            pitch += (5 * Math.PI / 180); // Forward: +5 degrees
        } else if (this.positionOnBoard === -1) {
            pitch += (25 * Math.PI / 180); // Back: +25 degrees
        } else {
            pitch += (15 * Math.PI / 180); // Neutral: +15 degrees
        }
        return new THREE.Euler(pitch, this.theta, 0, 'YXZ');
    }

    getStanceName() {
        if (this.positionOnBoard === 1) return 'Forward';
        if (this.positionOnBoard === -1) return 'Back';
        return 'Neutral';
    }
}