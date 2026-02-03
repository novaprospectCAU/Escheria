/**
 * Hyperbolic camera controller.
 * Handles movement along geodesics in hyperbolic space.
 */

import type { Vec3 } from '@/types';
import { Gyrovector } from '@/core/gyrovector';

export interface CameraRotation {
  yaw: number;   // Rotation around Y axis (radians)
  pitch: number; // Rotation around X axis (radians)
}

export class HyperbolicCamera {
  private position: Gyrovector;
  private yaw: number = 0;
  private pitch: number = 0;

  // Movement state
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;

  // Movement speed (hyperbolic distance per second)
  private moveSpeed: number = 0.5;

  // Mouse state
  private isPointerLocked: boolean = false;

  constructor() {
    this.position = new Gyrovector(0, 0, 0);
    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    // Keyboard controls
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // Mouse controls
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.handleMouseMove(e);
      }
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
      case 'Space':
        this.moveUp = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = true;
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
      case 'Space':
        this.moveUp = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.moveDown = false;
        break;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    const sensitivity = 0.002;
    this.yaw -= event.movementX * sensitivity;
    this.pitch -= event.movementY * sensitivity;

    // Clamp pitch to prevent flipping
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  /** Request pointer lock for mouse control */
  requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  /** Release pointer lock */
  exitPointerLock(): void {
    document.exitPointerLock();
  }

  /** Update camera position based on input */
  update(deltaTime: number): void {
    // For 2D top-down view: X is left/right, Y is forward/back
    let dx = 0;
    let dy = 0;

    // W/S for Y axis (up/down on screen = forward/back)
    if (this.moveForward) dy += 1;
    if (this.moveBackward) dy -= 1;
    // A/D for X axis (left/right)
    if (this.moveLeft) dx -= 1;
    if (this.moveRight) dx += 1;

    // Only move if there's input
    if (dx !== 0 || dy !== 0) {
      // Normalize
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;

      // Apply yaw rotation (rotation around Z axis for 2D view)
      const cy = Math.cos(this.yaw);
      const sy = Math.sin(this.yaw);
      const worldDx = dx * cy - dy * sy;
      const worldDy = dx * sy + dy * cy;

      // Create movement vector in hyperbolic space (2D, z=0)
      const moveDistance = this.moveSpeed * deltaTime;
      const moveDirection = new Gyrovector(worldDx, worldDy, 0);
      const norm = moveDirection.norm();
      if (norm > 0.001) {
        const normalizedDir = moveDirection.scale(1 / norm);
        const scaledMove = normalizedDir.mobiusScale(moveDistance);

        // Apply hyperbolic movement (Möbius addition)
        this.position = this.position.mobiusAdd(scaledMove);
      }
    }
  }

  /** Get current position */
  getPosition(): Vec3 {
    return this.position.toVec3();
  }

  /** Set position */
  setPosition(pos: Vec3): void {
    this.position = Gyrovector.fromVec3(pos);
  }

  /** Get current rotation */
  getRotation(): CameraRotation {
    return { yaw: this.yaw, pitch: this.pitch };
  }

  /** Set rotation */
  setRotation(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  }

  /** Get hyperbolic distance from origin */
  getDistanceFromOrigin(): number {
    const origin = new Gyrovector(0, 0, 0);
    return origin.hyperbolicDistance(this.position);
  }

  /** Set movement speed */
  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }

  /** Check if pointer is locked */
  isLocked(): boolean {
    return this.isPointerLocked;
  }
}
