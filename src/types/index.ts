/**
 * Core type definitions for Escheria
 */

/** 3D vector in Euclidean space */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 4D vector in Minkowski space (x, y, z, w) where w² = x² + y² + z² + 1 */
export interface Vec4 {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 4x4 matrix stored in column-major order */
export type Matrix4 = Float64Array;

/** Gyrovector representing a point/vector in hyperbolic space */
export interface GyrovectorData {
  x: number;
  y: number;
  z: number;
}

/** Configuration for the hyperbolic engine */
export interface EngineConfig {
  /** Canvas element or selector */
  canvas: HTMLCanvasElement | string;
  /** Initial field of view in radians */
  fov?: number;
  /** Maximum render distance in hyperbolic units */
  renderDistance?: number;
  /** Enable debug overlay */
  debug?: boolean;
}

/** Camera state in hyperbolic space */
export interface CameraState {
  /** Position as gyrovector */
  position: GyrovectorData;
  /** View direction (yaw) in radians */
  yaw: number;
  /** View direction (pitch) in radians */
  pitch: number;
}

/** Tiling configuration */
export interface TilingConfig {
  /** Number of sides per polygon (p in {p,q} notation) */
  p: number;
  /** Number of polygons meeting at each vertex (q in {p,q} notation) */
  q: number;
  /** Maximum depth of tiling generation */
  maxDepth: number;
}

/** Debug information displayed in overlay */
export interface DebugInfo {
  fps: number;
  position: GyrovectorData;
  hyperbolicDistance: number;
  visibleTiles: number;
  wasmLoaded: boolean;
}
