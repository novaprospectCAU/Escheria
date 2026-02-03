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
    // Calculate movement direction in camera space
    let dx = 0;
    let dy = 0;
    let dz = 0;

    if (this.moveForward) dz -= 1;
    if (this.moveBackward) dz += 1;
    if (this.moveLeft) dx -= 1;
    if (this.moveRight) dx += 1;
    if (this.moveUp) dy += 1;
    if (this.moveDown) dy -= 1;

    // Only move if there's input
    if (dx !== 0 || dy !== 0 || dz !== 0) {
      // Normalize
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      dx /= len;
      dy /= len;
      dz /= len;

      // Transform direction by camera rotation
      const cy = Math.cos(this.yaw);
      const sy = Math.sin(this.yaw);
      const cp = Math.cos(this.pitch);
      const sp = Math.sin(this.pitch);

      // Apply yaw rotation
      const worldDx = dx * cy + dz * sy;
      const worldDz = -dx * sy + dz * cy;

      // Apply pitch rotation (only to forward/back)
      const worldDy = dy + worldDz * sp;
      const finalDz = worldDz * cp;

      // Create movement vector in hyperbolic space
      const moveDistance = this.moveSpeed * deltaTime;
      const moveDirection = new Gyrovector(worldDx, worldDy, finalDz);
      const normalizedDir = moveDirection.scale(1 / moveDirection.norm());
      const scaledMove = normalizedDir.mobiusScale(moveDistance);

      // Apply hyperbolic movement (Möbius addition)
      this.position = this.position.mobiusAdd(scaledMove);
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
