/**
 * HyperMath WASM module loader and interface.
 * Provides type-safe access to hyperbolic geometry operations.
 */

import type { Vec3, Vec4, Matrix4 } from '@/types';
import { Gyrovector } from '../gyrovector';
import * as hyperbolicUtils from '../hyperbolic';

/** WASM module interface */
interface HyperMathModule {
  getVersion(): string;

  // Gyrovector operations
  gyroAdd(a: number[], b: number[]): number[];
  gyroScale(v: number[], scalar: number): number[];
  gyroNegate(v: number[]): number[];
  gyroDistance(a: number[], b: number[]): number;
  gyroGeodesicPoint(start: number[], end: number[], t: number): number[];

  // Coordinate transformations
  poincareToHyperboloid(p: number[]): number[];
  hyperboloidToPoincare(h: number[]): number[];

  // Matrix operations
  createLorentzBoost(dx: number, dy: number, dz: number, distance: number): number[];
  createRotationMatrix(angle: number, axis: number): number[];
  multiplyMatrices(a: number[], b: number[]): number[];
  transformPoint(matrix: number[], point: number[]): number[];

  // Tiling utilities
  getTilingEdgeLength(p: number, q: number): number;
  getTilingCircumradius(p: number, q: number): number;
  getTilingInradius(p: number, q: number): number;
  getPolygonVertices(p: number, q: number): number[][];
}

/** Singleton class for WASM module access */
export class HyperMath {
  private static module: HyperMathModule | null = null;
  private static initPromise: Promise<boolean> | null = null;
  private static useWasm = false;

  /** Initialize the WASM module */
  static async init(): Promise<boolean> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadModule();
    return this.initPromise;
  }

  private static async loadModule(): Promise<boolean> {
    try {
      // Fetch and execute the WASM loader module
      const response = await fetch('/wasm/hypermath.js');
      if (!response.ok) {
        throw new Error('Failed to fetch WASM module');
      }

      const moduleText = await response.text();

      // Create a blob URL and import as ES module
      const blob = new Blob([moduleText], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      try {
        const wasmModule = await import(/* @vite-ignore */ blobUrl);
        const createModule = wasmModule.default;
        this.module = await createModule();
        this.useWasm = true;
        console.log('WASM module loaded:', this.module!.getVersion());
        return true;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.warn('WASM module not available, using JavaScript fallback:', e);
      this.useWasm = false;
      return false;
    }
  }

  /** Check if WASM is loaded */
  static isLoaded(): boolean {
    return this.useWasm && this.module !== null;
  }

  /** Get version string */
  static getVersion(): string {
    if (this.module) {
      return this.module.getVersion();
    }
    return 'HyperMath 0.1.0 (JS fallback)';
  }

  // ===========================================================================
  // Gyrovector operations
  // ===========================================================================

  /** Möbius addition of two gyrovectors */
  static gyroAdd(a: Vec3, b: Vec3): Vec3 {
    if (this.module) {
      const result = this.module.gyroAdd([a.x, a.y, a.z], [b.x, b.y, b.z]);
      return { x: result[0], y: result[1], z: result[2] };
    }
    // JS fallback
    const va = new Gyrovector(a.x, a.y, a.z);
    const vb = new Gyrovector(b.x, b.y, b.z);
    return va.mobiusAdd(vb);
  }

  /** Möbius scalar multiplication */
  static gyroScale(v: Vec3, scalar: number): Vec3 {
    if (this.module) {
      const result = this.module.gyroScale([v.x, v.y, v.z], scalar);
      return { x: result[0], y: result[1], z: result[2] };
    }
    const vec = new Gyrovector(v.x, v.y, v.z);
    return vec.mobiusScale(scalar);
  }

  /** Negate a gyrovector */
  static gyroNegate(v: Vec3): Vec3 {
    if (this.module) {
      const result = this.module.gyroNegate([v.x, v.y, v.z]);
      return { x: result[0], y: result[1], z: result[2] };
    }
    return { x: -v.x, y: -v.y, z: -v.z };
  }

  /** Calculate hyperbolic distance between two points */
  static gyroDistance(a: Vec3, b: Vec3): number {
    if (this.module) {
      return this.module.gyroDistance([a.x, a.y, a.z], [b.x, b.y, b.z]);
    }
    const va = new Gyrovector(a.x, a.y, a.z);
    const vb = new Gyrovector(b.x, b.y, b.z);
    return va.hyperbolicDistance(vb);
  }

  /** Get point on geodesic between two points at parameter t */
  static gyroGeodesicPoint(start: Vec3, end: Vec3, t: number): Vec3 {
    if (this.module) {
      const result = this.module.gyroGeodesicPoint(
        [start.x, start.y, start.z],
        [end.x, end.y, end.z],
        t
      );
      return { x: result[0], y: result[1], z: result[2] };
    }
    const vStart = new Gyrovector(start.x, start.y, start.z);
    const vEnd = new Gyrovector(end.x, end.y, end.z);
    return vStart.geodesicPoint(vEnd, t);
  }

  // ===========================================================================
  // Coordinate transformations
  // ===========================================================================

  /** Convert from Poincaré ball to hyperboloid model */
  static poincareToHyperboloid(p: Vec3): Vec4 {
    if (this.module) {
      const result = this.module.poincareToHyperboloid([p.x, p.y, p.z]);
      return { x: result[0], y: result[1], z: result[2], w: result[3] };
    }
    return hyperbolicUtils.poincareToHyperboloid(p);
  }

  /** Convert from hyperboloid model to Poincaré ball */
  static hyperboloidToPoincare(h: Vec4): Vec3 {
    if (this.module) {
      const result = this.module.hyperboloidToPoincare([h.x, h.y, h.z, h.w]);
      return { x: result[0], y: result[1], z: result[2] };
    }
    return hyperbolicUtils.hyperboloidToPoincare(h);
  }

  // ===========================================================================
  // Matrix operations
  // ===========================================================================

  /** Create Lorentz boost matrix */
  static createLorentzBoost(dx: number, dy: number, dz: number, distance: number): Matrix4 {
    if (this.module) {
      const result = this.module.createLorentzBoost(dx, dy, dz, distance);
      return new Float64Array(result);
    }
    return hyperbolicUtils.createLorentzBoost(dx, dy, dz, distance);
  }

  /** Create rotation matrix */
  static createRotationMatrix(angle: number, axis: 'x' | 'y' | 'z'): Matrix4 {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    if (this.module) {
      const result = this.module.createRotationMatrix(angle, axisIndex);
      return new Float64Array(result);
    }
    return hyperbolicUtils.createRotationMatrix(angle, axis);
  }

  /** Multiply two 4x4 matrices */
  static multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    if (this.module) {
      const result = this.module.multiplyMatrices(Array.from(a), Array.from(b));
      return new Float64Array(result);
    }
    return hyperbolicUtils.multiplyMatrices(a, b);
  }

  /** Transform a 4D point by a matrix */
  static transformPoint(matrix: Matrix4, point: Vec4): Vec4 {
    if (this.module) {
      const result = this.module.transformPoint(
        Array.from(matrix),
        [point.x, point.y, point.z, point.w]
      );
      return { x: result[0], y: result[1], z: result[2], w: result[3] };
    }
    return hyperbolicUtils.transformPoint(matrix, point);
  }

  // ===========================================================================
  // Tiling utilities
  // ===========================================================================

  /** Get edge length for {p,q} tiling */
  static getTilingEdgeLength(p: number, q: number): number {
    if (this.module) {
      return this.module.getTilingEdgeLength(p, q);
    }
    return hyperbolicUtils.getTilingEdgeLength(p, q);
  }

  /** Get circumradius for {p,q} tiling */
  static getTilingCircumradius(p: number, q: number): number {
    if (this.module) {
      return this.module.getTilingCircumradius(p, q);
    }
    return hyperbolicUtils.getTilingCircumradius(p, q);
  }

  /** Get inradius for {p,q} tiling */
  static getTilingInradius(p: number, q: number): number {
    if (this.module) {
      return this.module.getTilingInradius(p, q);
    }
    return hyperbolicUtils.getTilingInradius(p, q);
  }

  /** Get vertices of central polygon in {p,q} tiling */
  static getPolygonVertices(p: number, q: number): Vec3[] {
    if (this.module) {
      const result = this.module.getPolygonVertices(p, q);
      return result.map((v: number[]) => ({ x: v[0], y: v[1], z: v[2] }));
    }
    return hyperbolicUtils.getPolygonVertices(p, q);
  }
}
