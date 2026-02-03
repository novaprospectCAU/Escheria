/**
 * Wrapper for Three.js objects in hyperbolic space.
 * Handles position transformation and rendering.
 */

import * as THREE from 'three';
import type { Vec3 } from '@/types';
import { Gyrovector } from '@/core/gyrovector';

export class HyperbolicObject {
  private mesh: THREE.Mesh;
  private hyperbolicPosition: Gyrovector;
  private hyperbolicRotation: number = 0;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material) {
    this.mesh = new THREE.Mesh(geometry, material);
    this.hyperbolicPosition = new Gyrovector(0, 0, 0);
  }

  /** Get the underlying Three.js mesh */
  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  /** Set position in hyperbolic space (Poincaré ball coordinates) */
  setHyperbolicPosition(pos: Vec3): void {
    this.hyperbolicPosition = Gyrovector.fromVec3(pos).clamp();
    this.updateMeshTransform();
  }

  /** Get position in hyperbolic space */
  getHyperbolicPosition(): Vec3 {
    return this.hyperbolicPosition.toVec3();
  }

  /** Set rotation in hyperbolic space */
  setHyperbolicRotation(angle: number): void {
    this.hyperbolicRotation = angle;
    this.updateMeshTransform();
  }

  /**
   * Update Three.js mesh transform based on hyperbolic position.
   * For now, this is a direct mapping - will be replaced with proper
   * hyperbolic-to-Euclidean projection.
   */
  private updateMeshTransform(): void {
    const pos = this.hyperbolicPosition;

    // Direct mapping (Poincaré ball is already a projection)
    this.mesh.position.set(pos.x, pos.y, pos.z);

    // Apply rotation
    this.mesh.rotation.z = this.hyperbolicRotation;

    // Scale based on position (objects shrink as they approach boundary)
    // This approximates hyperbolic perspective distortion
    const distFromOrigin = pos.norm();
    const scale = 1 - distFromOrigin * 0.5; // Simple scaling
    this.mesh.scale.setScalar(Math.max(scale, 0.01));
  }

  /**
   * Update object position relative to camera.
   * Call this each frame to transform the object into camera space.
   */
  updateForCamera(cameraPosition: Vec3): void {
    // Transform position by inverse camera (for rendering)
    const camGyro = Gyrovector.fromVec3(cameraPosition);
    const relativePos = camGyro.negate().mobiusAdd(this.hyperbolicPosition);

    // Update mesh position
    this.mesh.position.set(relativePos.x, relativePos.y, relativePos.z);

    // Scale based on relative position
    const dist = relativePos.norm();
    const scale = 1 - dist * 0.5;
    this.mesh.scale.setScalar(Math.max(scale, 0.01));
  }

  /** Calculate hyperbolic distance to another point */
  distanceTo(other: Vec3): number {
    return this.hyperbolicPosition.hyperbolicDistance(other);
  }

  /** Dispose geometry and material */
  dispose(): void {
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
