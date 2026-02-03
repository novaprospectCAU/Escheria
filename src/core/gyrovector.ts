/**
 * Gyrovector class for hyperbolic geometry operations.
 * JavaScript implementation for use as fallback when WASM is unavailable.
 *
 * Represents a point/vector in the Poincaré ball model of hyperbolic space.
 */

import type { Vec3 } from '@/types';

export class Gyrovector implements Vec3 {
  constructor(
    public x: number = 0,
    public y: number = 0,
    public z: number = 0
  ) {}

  /** Squared Euclidean magnitude */
  normSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /** Euclidean magnitude (not hyperbolic distance!) */
  norm(): number {
    return Math.sqrt(this.normSquared());
  }

  /** Clamp to stay inside the Poincaré ball (|v| < 1) */
  clamp(maxNorm: number = 0.999): Gyrovector {
    const n = this.norm();
    if (n > maxNorm) {
      const scale = maxNorm / n;
      return new Gyrovector(this.x * scale, this.y * scale, this.z * scale);
    }
    return this;
  }

  /** Negate (hyperbolic inverse) */
  negate(): Gyrovector {
    return new Gyrovector(-this.x, -this.y, -this.z);
  }

  /** Scalar multiplication (Euclidean, not hyperbolic) */
  scale(s: number): Gyrovector {
    return new Gyrovector(this.x * s, this.y * s, this.z * s);
  }

  /** Dot product */
  dot(other: Vec3): number {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  /** Cross product */
  cross(other: Vec3): Gyrovector {
    return new Gyrovector(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  /**
   * Möbius addition (hyperbolic vector addition)
   *
   * Formula: a ⊕ b = ((1 + 2<a,b> + |b|²)a + (1 - |a|²)b) / (1 + 2<a,b> + |a|²|b|²)
   *
   * Note: Möbius addition is NOT commutative! a ⊕ b ≠ b ⊕ a
   */
  mobiusAdd(other: Vec3): Gyrovector {
    const aSq = this.normSquared();
    const bSq = other.x * other.x + other.y * other.y + other.z * other.z;
    const ab = this.dot(other);

    const denom = 1.0 + 2.0 * ab + aSq * bSq;

    if (Math.abs(denom) < 1e-10) {
      return new Gyrovector(0, 0, 0);
    }

    const coeffA = 1.0 + 2.0 * ab + bSq;
    const coeffB = 1.0 - aSq;

    return new Gyrovector(
      (coeffA * this.x + coeffB * other.x) / denom,
      (coeffA * this.y + coeffB * other.y) / denom,
      (coeffA * this.z + coeffB * other.z) / denom
    ).clamp();
  }

  /**
   * Möbius scalar multiplication (hyperbolic scaling)
   *
   * Formula: r ⊗ v = tanh(r * atanh(|v|)) * (v / |v|)
   */
  mobiusScale(scalar: number): Gyrovector {
    const n = this.norm();
    if (n < 1e-10) {
      return new Gyrovector(0, 0, 0);
    }

    const clampedNorm = Math.min(n, 0.9999);
    const newNorm = Math.tanh(scalar * Math.atanh(clampedNorm));
    const scale = newNorm / n;

    return new Gyrovector(this.x * scale, this.y * scale, this.z * scale);
  }

  /**
   * Hyperbolic distance to another point
   *
   * Formula: d(a, b) = 2 * atanh(|(-a) ⊕ b|)
   */
  hyperbolicDistance(other: Vec3): number {
    const diff = this.negate().mobiusAdd(other);
    const n = Math.min(diff.norm(), 0.9999);
    return 2.0 * Math.atanh(n);
  }

  /**
   * Point on geodesic between this point and end at parameter t
   */
  geodesicPoint(end: Vec3, t: number): Gyrovector {
    const direction = this.negate().mobiusAdd(end);
    const dirGyro = new Gyrovector(direction.x, direction.y, direction.z);
    const scaledDir = dirGyro.mobiusScale(t);
    return this.mobiusAdd(scaledDir);
  }

  /** Create from Vec3 */
  static fromVec3(v: Vec3): Gyrovector {
    return new Gyrovector(v.x, v.y, v.z);
  }

  /** Convert to plain object */
  toVec3(): Vec3 {
    return { x: this.x, y: this.y, z: this.z };
  }

  /** Create a copy */
  clone(): Gyrovector {
    return new Gyrovector(this.x, this.y, this.z);
  }
}
