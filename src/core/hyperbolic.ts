/**
 * Hyperbolic geometry utility functions.
 * JavaScript implementation for use as fallback when WASM is unavailable.
 */

import type { Vec3, Vec4, Matrix4 } from '@/types';
import { Gyrovector } from './gyrovector';

const PI = Math.PI;
const EPSILON = 1e-10;

/**
 * Convert from Poincaré ball to hyperboloid model (Minkowski space)
 */
export function poincareToHyperboloid(p: Vec3): Vec4 {
  const pSq = p.x * p.x + p.y * p.y + p.z * p.z;
  const denom = 1.0 - pSq;

  if (Math.abs(denom) < EPSILON) {
    const norm = Math.sqrt(pSq);
    const scale = 1000.0 / norm;
    return { x: p.x * scale, y: p.y * scale, z: p.z * scale, w: 1000.0 };
  }

  const w = (1.0 + pSq) / denom;
  const scale = 2.0 / denom;

  return { x: p.x * scale, y: p.y * scale, z: p.z * scale, w };
}

/**
 * Convert from hyperboloid model to Poincaré ball
 */
export function hyperboloidToPoincare(h: Vec4): Vec3 {
  const denom = 1.0 + h.w;

  if (Math.abs(denom) < EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }

  const gyro = new Gyrovector(h.x / denom, h.y / denom, h.z / denom);
  return gyro.clamp().toVec3();
}

/**
 * Create Lorentz boost matrix (hyperbolic translation)
 */
export function createLorentzBoost(dx: number, dy: number, dz: number, distance: number): Matrix4 {
  const result = new Float64Array(16);

  // Initialize to identity
  result[0] = 1; result[5] = 1; result[10] = 1; result[15] = 1;

  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < EPSILON) {
    return result;
  }

  const nx = dx / len;
  const ny = dy / len;
  const nz = dz / len;

  const c = Math.cosh(distance);
  const s = Math.sinh(distance);

  // Column-major order
  result[0] = 1.0 + (c - 1.0) * nx * nx;
  result[1] = (c - 1.0) * ny * nx;
  result[2] = (c - 1.0) * nz * nx;
  result[3] = s * nx;

  result[4] = (c - 1.0) * nx * ny;
  result[5] = 1.0 + (c - 1.0) * ny * ny;
  result[6] = (c - 1.0) * nz * ny;
  result[7] = s * ny;

  result[8] = (c - 1.0) * nx * nz;
  result[9] = (c - 1.0) * ny * nz;
  result[10] = 1.0 + (c - 1.0) * nz * nz;
  result[11] = s * nz;

  result[12] = s * nx;
  result[13] = s * ny;
  result[14] = s * nz;
  result[15] = c;

  return result;
}

/**
 * Create rotation matrix
 */
export function createRotationMatrix(angle: number, axis: 'x' | 'y' | 'z'): Matrix4 {
  const result = new Float64Array(16);
  result[0] = 1; result[5] = 1; result[10] = 1; result[15] = 1;

  const c = Math.cos(angle);
  const s = Math.sin(angle);

  switch (axis) {
    case 'x':
      result[5] = c; result[6] = s;
      result[9] = -s; result[10] = c;
      break;
    case 'y':
      result[0] = c; result[2] = -s;
      result[8] = s; result[10] = c;
      break;
    case 'z':
      result[0] = c; result[1] = s;
      result[4] = -s; result[5] = c;
      break;
  }

  return result;
}

/**
 * Multiply two 4x4 matrices (column-major)
 */
export function multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
  const result = new Float64Array(16);

  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      result[col * 4 + row] = sum;
    }
  }

  return result;
}

/**
 * Transform a 4D point by a matrix
 */
export function transformPoint(matrix: Matrix4, point: Vec4): Vec4 {
  const p = [point.x, point.y, point.z, point.w];
  const result = [0, 0, 0, 0];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[i] += matrix[j * 4 + i] * p[j];
    }
  }

  return { x: result[0], y: result[1], z: result[2], w: result[3] };
}

/**
 * Calculate edge length for {p,q} tiling
 */
export function getTilingEdgeLength(p: number, q: number): number {
  const angleP = PI / p;
  const angleQ = PI / q;

  const ratio = Math.cos(angleQ) / Math.sin(angleP);
  if (ratio <= 1.0) {
    return 0.0;
  }

  return 2.0 * Math.acosh(ratio);
}

/**
 * Calculate circumradius for {p,q} tiling
 */
export function getTilingCircumradius(p: number, q: number): number {
  const angleP = PI / p;
  const angleQ = PI / q;

  const numerator = Math.cos(angleP) * Math.cos(angleQ);
  const denominator = Math.sin(angleP) * Math.sin(angleQ);

  if (denominator < EPSILON || numerator / denominator <= 1.0) {
    return 0.0;
  }

  return Math.acosh(numerator / denominator);
}

/**
 * Calculate inradius for {p,q} tiling
 */
export function getTilingInradius(p: number, q: number): number {
  const angleP = PI / p;
  const angleQ = PI / q;

  const ratio = Math.cos(angleP) / Math.sin(angleQ);
  if (ratio <= 1.0) {
    return 0.0;
  }

  return Math.acosh(ratio);
}

/**
 * Generate vertices of central polygon in {p,q} tiling
 */
export function getPolygonVertices(p: number, q: number): Vec3[] {
  const R = getTilingCircumradius(p, q);
  const euclideanR = Math.tanh(R / 2.0);

  const vertices: Vec3[] = [];
  for (let i = 0; i < p; i++) {
    const angle = (2.0 * PI * i) / p;
    vertices.push({
      x: euclideanR * Math.cos(angle),
      y: euclideanR * Math.sin(angle),
      z: 0.0,
    });
  }

  return vertices;
}
