/**
 * Hyperbolic tiling generator.
 * Creates and manages tiles in a {p,q} hyperbolic tiling.
 * Supports dynamic tile loading for infinite exploration.
 */

import * as THREE from 'three';
import type { Vec3, TilingConfig } from '@/types';
import { Gyrovector } from '@/core/gyrovector';
import { getTilingCircumradius, getPolygonVertices } from '@/core/hyperbolic';
import {
  createHyperbolicMaterial,
  updateHyperbolicMaterial,
  type HyperbolicMaterialUniforms,
} from './HyperbolicMaterial';

interface TileData {
  id: string;
  center: Gyrovector;
  rotation: number;
  mesh: THREE.Mesh;
  depth: number;
  createdTime: number; // When tile was created (for protection)
  lastAccessTime: number; // For LRU-based tile pruning
}

/** Configuration for dynamic tile loading */
interface DynamicTilingConfig {
  maxVisibleDistance: number; // Hyperbolic distance for tile visibility
  maxTileCount: number; // Maximum tiles to keep in memory
  maxTilesPerFrame: number; // Throttle tile creation per frame
  expansionDistance: number; // Distance threshold for tile expansion
}

/** Tile pool for mesh reuse */
class TilePool {
  private pool: THREE.Mesh[] = [];
  private geometry: THREE.BufferGeometry;
  private createMaterial: () => THREE.ShaderMaterial;
  private maxPoolSize: number = 100;

  constructor(geometry: THREE.BufferGeometry, createMaterial: () => THREE.ShaderMaterial) {
    this.geometry = geometry;
    this.createMaterial = createMaterial;
  }

  acquire(): THREE.Mesh {
    if (this.pool.length > 0) {
      const mesh = this.pool.pop()!;
      mesh.visible = true;
      return mesh;
    }
    return new THREE.Mesh(this.geometry, this.createMaterial());
  }

  release(mesh: THREE.Mesh): void {
    mesh.visible = false;
    if (this.pool.length < this.maxPoolSize) {
      this.pool.push(mesh);
    } else {
      (mesh.material as THREE.Material).dispose();
      mesh.geometry = null!;
    }
  }

  dispose(): void {
    for (const mesh of this.pool) {
      (mesh.material as THREE.Material).dispose();
    }
    this.pool = [];
  }
}

export interface TilingUniformUpdates {
  cameraPosition?: Vec3;
  cameraRotation?: { yaw: number; pitch: number };
  time?: number;
  debugMode?: boolean;
  debugType?: number;
}

export class HyperbolicTiling {
  private config: TilingConfig;
  private group: THREE.Group;
  private tiles: Map<string, TileData> = new Map();
  private baseTileGeometry: THREE.BufferGeometry | null = null;
  private sharedMaterial: THREE.ShaderMaterial;
  private tilePool: TilePool | null = null;

  // Dynamic tiling configuration
  private dynamicConfig: DynamicTilingConfig = {
    maxVisibleDistance: 5.0,
    maxTileCount: 800,
    maxTilesPerFrame: 8,
    expansionDistance: 4.0,
  };

  // Tile creation throttling
  private tilesCreatedThisFrame: number = 0;
  private tileIdCounter: number = 0;

  // Stability: prevent thrashing
  private lastCameraPos: Gyrovector = new Gyrovector(0, 0, 0);
  private tileProtectionTime: number = 2000; // ms before tile can be pruned

  // Spatial index for fast neighbor lookup
  private tilePositionIndex: Map<string, TileData> = new Map();

  // Debug settings (tracked for getter access)
  private _debugMode: boolean = false;
  private _debugType: number = 0;

  // Cached tiling parameters
  private circumradius: number = 0;
  private moveDistance: number = 0;
  private visibleRadius: number = 0.83;

  // Surface curvature mode
  private surfaceMode: 'flat' | 'hyperbolic' = 'flat';
  private static readonly CURVATURE_SCALE = 0.04;

  // Reusable math objects (GC prevention)
  private static readonly _tempAxis = new THREE.Vector3();
  private static readonly _tempQuat = new THREE.Quaternion();

  // Prism height for 3D tile extrusion
  private static readonly WALL_HEIGHT = 0.06;

  // Mapping: maxDepth → maxTileCount
  private static readonly DEPTH_TO_TILE_COUNT = [0, 150, 300, 500, 800, 1200, 1800];

  // Mapping: maxDepth → Euclidean visible radius in Poincaré disk
  private static readonly DEPTH_TO_VISIBLE_RADIUS = [0, 0.58, 0.72, 0.82, 0.90, 0.94, 0.97];

  constructor(config: TilingConfig) {
    this.config = config;
    this.group = new THREE.Group();

    // Calculate and cache tiling parameters
    const { p, q } = this.config;
    this.circumradius = getTilingCircumradius(p, q);
    this.moveDistance = this.circumradius * 2 * Math.tanh(this.circumradius / 2);

    // Map maxDepth to dynamic tile count and visible radius
    this.dynamicConfig.maxTileCount =
      HyperbolicTiling.DEPTH_TO_TILE_COUNT[config.maxDepth] ?? 500;
    this.visibleRadius =
      HyperbolicTiling.DEPTH_TO_VISIBLE_RADIUS[config.maxDepth] ?? 0.83;

    // Allow external override of maxTilesPerFrame (for mobile throttling)
    if (config.maxTilesPerFrame !== undefined) {
      this.dynamicConfig.maxTilesPerFrame = config.maxTilesPerFrame;
    }

    // Create shared hyperbolic material
    this.sharedMaterial = createHyperbolicMaterial({
      baseColor: 0x4488ff,
    });

    // Generate initial tiles
    this.generateBaseTile();

    // Initialize tile pool after geometry is created
    if (this.baseTileGeometry) {
      this.tilePool = new TilePool(this.baseTileGeometry, () => {
        const mat = this.sharedMaterial.clone();
        return mat;
      });
    }

    this.generateTiling();
  }

  /** Get the Three.js group containing all tiles */
  getGroup(): THREE.Group {
    return this.group;
  }

  /** Generate the geometry for a single tile (3D prism) */
  private generateBaseTile(): void {
    const { p, q } = this.config;
    const vertices = getPolygonVertices(p, q);

    if (vertices.length < 3) {
      console.warn(`Invalid tiling {${p},${q}} - not hyperbolic`);
      return;
    }

    const H = HyperbolicTiling.WALL_HEIGHT;
    const geometry = new THREE.BufferGeometry();

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < p; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % p];

      // === Top face (z = H), normal (0, 0, +1) ===
      positions.push(0, 0, H);
      positions.push(v1.x, v1.y, H);
      positions.push(v2.x, v2.y, H);
      for (let j = 0; j < 3; j++) normals.push(0, 0, 1);
      uvs.push(0.5, 0.5);
      uvs.push(0.5 + v1.x, 0.5 + v1.y);
      uvs.push(0.5 + v2.x, 0.5 + v2.y);

      // === Bottom face (z = 0), normal (0, 0, -1), reversed winding ===
      positions.push(0, 0, 0);
      positions.push(v2.x, v2.y, 0);
      positions.push(v1.x, v1.y, 0);
      for (let j = 0; j < 3; j++) normals.push(0, 0, -1);
      uvs.push(0.5, 0.5);
      uvs.push(0.5 + v2.x, 0.5 + v2.y);
      uvs.push(0.5 + v1.x, 0.5 + v1.y);

      // === Side wall (quad as 2 triangles) ===
      // Outward normal: midpoint of edge normalized to (nx, ny, 0)
      const mx = (v1.x + v2.x) * 0.5;
      const my = (v1.y + v2.y) * 0.5;
      const mLen = Math.sqrt(mx * mx + my * my);
      const nx = mLen > 0 ? mx / mLen : 0;
      const ny = mLen > 0 ? my / mLen : 0;

      // Triangle 1: v1_bottom, v2_bottom, v2_top
      positions.push(v1.x, v1.y, 0);
      positions.push(v2.x, v2.y, 0);
      positions.push(v2.x, v2.y, H);
      for (let j = 0; j < 3; j++) normals.push(nx, ny, 0);
      uvs.push(0, 0);
      uvs.push(1, 0);
      uvs.push(1, 1);

      // Triangle 2: v1_bottom, v2_top, v1_top
      positions.push(v1.x, v1.y, 0);
      positions.push(v2.x, v2.y, H);
      positions.push(v1.x, v1.y, H);
      for (let j = 0; j < 3; j++) normals.push(nx, ny, 0);
      uvs.push(0, 0);
      uvs.push(1, 1);
      uvs.push(0, 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    this.baseTileGeometry = geometry;
  }

  /** Generate the initial tiling around the origin */
  private generateTiling(): void {
    if (!this.baseTileGeometry) return;

    // Create central tile
    this.createTile('center', new Gyrovector(0, 0, 0), 0, 0);

    // Generate surrounding tiles up to maxDepth
    if (this.config.maxDepth > 0) {
      this.generateNeighbors('center', 1);
    }
  }

  /** Create a single tile */
  private createTile(id: string, center: Gyrovector, rotation: number, depth: number): TileData | null {
    if (this.tiles.has(id) || !this.baseTileGeometry) return null;

    // Get mesh from pool or create new
    let mesh: THREE.Mesh;
    if (this.tilePool) {
      mesh = this.tilePool.acquire();
    } else {
      mesh = new THREE.Mesh(this.baseTileGeometry, this.sharedMaterial.clone());
    }

    // Set color based on position hash for distinct tile colors
    const material = mesh.material as THREE.ShaderMaterial;
    const posKey = this.getPositionKey(center);
    let hash = 0;
    for (let i = 0; i < posKey.length; i++) {
      hash = ((hash << 5) - hash + posKey.charCodeAt(i)) | 0;
    }
    const hue = ((hash & 0x7fffffff) % 360) / 360;
    const color = new THREE.Color();
    color.setHSL(hue, 0.7, 0.5);
    material.uniforms.uBaseColor.value = color;

    // Apply current debug settings to new tile
    material.uniforms.uDebugMode.value = this._debugMode;
    material.uniforms.uDebugType.value = this._debugType;

    // Position the tile in world space (Poincaré coordinates)
    mesh.position.set(center.x, center.y, center.z);
    mesh.rotation.z = rotation;

    this.group.add(mesh);

    const now = performance.now();
    const tileData: TileData = {
      id,
      center,
      rotation,
      mesh,
      depth,
      createdTime: now,
      lastAccessTime: now,
    };

    this.tiles.set(id, tileData);

    // Add to spatial index
    this.tilePositionIndex.set(posKey, tileData);

    return tileData;
  }

  /** Generate a unique position key for spatial indexing */
  private getPositionKey(pos: Gyrovector): string {
    // Quantize position for spatial hashing (precision ~0.01)
    const qx = Math.round(pos.x * 100);
    const qy = Math.round(pos.y * 100);
    return `${qx},${qy}`;
  }

  /** Check if a tile exists near the given position */
  private hasTileNear(pos: Gyrovector, minDistance: number): boolean {
    for (const tile of this.tiles.values()) {
      if (tile.center.hyperbolicDistance(pos) < minDistance) {
        return true;
      }
    }
    return false;
  }

  /** Generate neighboring tiles recursively */
  private generateNeighbors(parentId: string, currentDepth: number): void {
    if (currentDepth > this.config.maxDepth) return;

    const parent = this.tiles.get(parentId);
    if (!parent) return;

    const { p, q } = this.config;
    const R = getTilingCircumradius(p, q);
    const moveDistance = R * 2 * Math.tanh(R / 2); // Approximate edge-to-edge distance

    // Generate p neighbors (one per edge)
    for (let i = 0; i < p; i++) {
      const angle = parent.rotation + (2 * Math.PI * i) / p + Math.PI / p;
      const direction = new Gyrovector(
        Math.cos(angle) * 0.5,
        Math.sin(angle) * 0.5,
        0
      );

      // Move in hyperbolic space
      const scaledDir = direction.mobiusScale(moveDistance);
      const neighborCenter = parent.center.mobiusAdd(scaledDir);

      // Skip if too close to boundary
      if (neighborCenter.norm() > 0.95) continue;

      // Create unique ID
      const neighborId = `${parentId}_${i}_${currentDepth}`;

      // Check if tile already exists nearby
      let tooClose = false;
      for (const tile of this.tiles.values()) {
        if (tile.center.hyperbolicDistance(neighborCenter) < R * 0.5) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        const neighborRotation = angle + Math.PI; // Face back towards parent
        this.createTile(neighborId, neighborCenter, neighborRotation, currentDepth);

        // Recurse
        if (currentDepth < this.config.maxDepth) {
          this.generateNeighbors(neighborId, currentDepth + 1);
        }
      }
    }
  }

  // ===== Dynamic Tile Loading System =====

  /** Get neighbor positions for a tile */
  private getNeighborPositions(tile: TileData): { center: Gyrovector; rotation: number }[] {
    const { p } = this.config;
    const positions: { center: Gyrovector; rotation: number }[] = [];

    for (let i = 0; i < p; i++) {
      const angle = tile.rotation + (2 * Math.PI * i) / p + Math.PI / p;
      const direction = new Gyrovector(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);

      const scaledDir = direction.mobiusScale(this.moveDistance);
      const neighborCenter = tile.center.mobiusAdd(scaledDir);

      // Skip if outside valid Poincaré disk
      if (neighborCenter.norm() > 0.98) continue;

      positions.push({
        center: neighborCenter,
        rotation: angle + Math.PI,
      });
    }

    return positions;
  }

  /** Get tiles at the boundary of the visible area */
  private getBoundaryTiles(_cameraPos: Gyrovector): TileData[] {
    const boundary: TileData[] = [];
    const R = this.visibleRadius;

    for (const tile of this.tiles.values()) {
      // Use Euclidean distance (screen space) for consistency
      const euclideanDist = tile.mesh.position.length();

      // Tile is in expansion zone (visible but near edge)
      if (euclideanDist > R * 0.55 && euclideanDist < R * 0.95) {
        boundary.push(tile);
      }
    }

    // Also include tiles close to camera for initial expansion
    if (boundary.length === 0) {
      for (const tile of this.tiles.values()) {
        const euclideanDist = tile.mesh.position.length();
        if (euclideanDist < R * 0.8) {
          boundary.push(tile);
        }
      }
    }

    return boundary;
  }

  /** Check if a tile should be created at the given position */
  private shouldCreateTile(pos: Gyrovector, cameraPos: Gyrovector): boolean {
    // Calculate where this tile would appear relative to camera
    const relativePos = cameraPos.negate().mobiusAdd(pos);
    const euclideanDist = relativePos.norm();

    // Don't create if it would be outside visible radius (density-dependent)
    if (euclideanDist > this.visibleRadius) return false;

    // Outside valid disk in absolute coordinates
    if (pos.norm() > 0.98) return false;

    // Already have a tile there
    if (this.hasTileNear(pos, this.circumradius * 0.5)) return false;

    return true;
  }

  /** Create a tile at the specified position (for dynamic loading) */
  private createTileAt(center: Gyrovector, rotation: number, depth: number): TileData | null {
    const id = `dyn_${this.tileIdCounter++}`;
    return this.createTile(id, center, rotation, depth);
  }

  /** Remove a tile and return its mesh to the pool */
  private removeTile(tile: TileData): void {
    this.group.remove(tile.mesh);

    if (this.tilePool) {
      this.tilePool.release(tile.mesh);
    } else {
      (tile.mesh.material as THREE.Material).dispose();
    }

    this.tiles.delete(tile.id);

    const posKey = this.getPositionKey(tile.center);
    this.tilePositionIndex.delete(posKey);
  }

  /** Expand tiles around the camera */
  private expandTilesAroundCamera(cameraPos: Gyrovector): void {
    this.tilesCreatedThisFrame = 0;

    const boundaryTiles = this.getBoundaryTiles(cameraPos);

    for (const boundaryTile of boundaryTiles) {
      if (this.tilesCreatedThisFrame >= this.dynamicConfig.maxTilesPerFrame) break;

      const neighborPositions = this.getNeighborPositions(boundaryTile);

      for (const neighbor of neighborPositions) {
        if (this.tilesCreatedThisFrame >= this.dynamicConfig.maxTilesPerFrame) break;

        if (this.shouldCreateTile(neighbor.center, cameraPos)) {
          // Calculate depth based on distance from origin
          const distFromOrigin = neighbor.center.norm();
          const depth = Math.floor(distFromOrigin * 10) + 1;

          const newTile = this.createTileAt(neighbor.center, neighbor.rotation, depth);
          if (newTile) {
            // Immediately set camera-relative position so the tile doesn't
            // render at absolute coordinates for 1 frame (flicker fix)
            const relativePos = cameraPos.negate().mobiusAdd(newTile.center);

            if (this.surfaceMode === 'hyperbolic') {
              const r2 = relativePos.x ** 2 + relativePos.y ** 2;
              const K = HyperbolicTiling.CURVATURE_SCALE;
              const zOffset = K * 2 * r2 / (1 - r2);
              newTile.mesh.position.set(relativePos.x, relativePos.y, zOffset);

              const denom2 = (1 - r2) * (1 - r2);
              const gradMag = K * 4 * Math.sqrt(r2) / denom2;
              const tiltAngle = Math.atan(gradMag);
              const r = Math.sqrt(r2);
              if (r > 0.001) {
                HyperbolicTiling._tempAxis.set(relativePos.y / r, -relativePos.x / r, 0);
                HyperbolicTiling._tempQuat.setFromAxisAngle(HyperbolicTiling._tempAxis, tiltAngle);
                newTile.mesh.quaternion.copy(HyperbolicTiling._tempQuat);
                newTile.mesh.rotateZ(newTile.rotation);
              }
            } else {
              newTile.mesh.position.set(relativePos.x, relativePos.y, relativePos.z);
            }

            const scale = 1 - relativePos.normSquared();
            newTile.mesh.scale.setScalar(scale);
            newTile.mesh.visible = relativePos.norm() < 0.95;
          }
          this.tilesCreatedThisFrame++;
        }
      }
    }
  }

  /** Remove tiles that are too far from camera */
  private pruneDistantTiles(_cameraPos: Gyrovector): void {
    const { maxTileCount } = this.dynamicConfig;
    const now = performance.now();

    // Collect tiles to remove
    const toRemove: TileData[] = [];

    for (const tile of this.tiles.values()) {
      // Don't remove recently CREATED tiles (protection period based on creation, not access)
      if (now - tile.createdTime < this.tileProtectionTime) continue;

      // Use Euclidean distance of the mesh position (relative to camera)
      // This matches what we use for visibility
      const euclideanDist = tile.mesh.position.length();

      // Remove if outside visible radius + hysteresis margin
      if (euclideanDist > this.visibleRadius + 0.08) {
        toRemove.push(tile);
      }
    }

    // Remove excess tiles based on LRU if over limit
    if (this.tiles.size > maxTileCount) {
      const sortedByAccess = Array.from(this.tiles.values())
        .filter(t => now - t.createdTime >= this.tileProtectionTime)
        .sort((a, b) => a.lastAccessTime - b.lastAccessTime);

      const excess = this.tiles.size - maxTileCount + 50; // Remove 50 extra for buffer
      for (let i = 0; i < excess && i < sortedByAccess.length; i++) {
        const tile = sortedByAccess[i];
        // Don't remove tiles very close to camera (in screen space)
        if (tile.mesh.position.length() > 0.3) {
          toRemove.push(tile);
        }
      }
    }

    // Remove unique tiles only
    const removed = new Set<string>();
    for (const tile of toRemove) {
      if (!removed.has(tile.id)) {
        this.removeTile(tile);
        removed.add(tile.id);
      }
    }
  }

  /** Main dynamic update method - call every frame */
  updateDynamic(cameraPosition: Vec3): void {
    const camGyro = Gyrovector.fromVec3(cameraPosition);
    const now = performance.now();

    // Update tile positions relative to camera and track access time
    const isHyperbolic = this.surfaceMode === 'hyperbolic';
    const K = HyperbolicTiling.CURVATURE_SCALE;

    for (const tile of this.tiles.values()) {
      const relativePos = camGyro.negate().mobiusAdd(tile.center);

      if (isHyperbolic) {
        const r2 = relativePos.x ** 2 + relativePos.y ** 2;
        const zOffset = K * 2 * r2 / (1 - r2);
        tile.mesh.position.set(relativePos.x, relativePos.y, zOffset);

        // Tilt tile to follow surface normal (surface rises outward → bowl)
        const denom2 = (1 - r2) * (1 - r2);
        const gradMag = K * 4 * Math.sqrt(r2) / denom2;
        const tiltAngle = Math.atan(gradMag);
        const r = Math.sqrt(r2);
        if (r > 0.001) {
          HyperbolicTiling._tempAxis.set(relativePos.y / r, -relativePos.x / r, 0);
          HyperbolicTiling._tempQuat.setFromAxisAngle(HyperbolicTiling._tempAxis, tiltAngle);
          tile.mesh.quaternion.copy(HyperbolicTiling._tempQuat);
          tile.mesh.rotateZ(tile.rotation);
        } else {
          tile.mesh.rotation.set(0, 0, tile.rotation);
        }
      } else {
        tile.mesh.position.set(relativePos.x, relativePos.y, relativePos.z);
        tile.mesh.rotation.set(0, 0, tile.rotation);
      }

      // Conformal scale factor: tiles near disk boundary shrink
      const scale = 1 - relativePos.normSquared();
      tile.mesh.scale.setScalar(scale);

      // Use Euclidean distance of relative position for visibility
      // This is what actually matters for rendering (screen space)
      // Hysteresis: separate on/off thresholds to prevent toggling at boundary
      const euclideanDist = relativePos.norm();
      if (tile.mesh.visible) {
        tile.mesh.visible = euclideanDist < this.visibleRadius + 0.04;
      } else {
        tile.mesh.visible = euclideanDist < this.visibleRadius;
      }

      // Update access time for visible tiles
      if (tile.mesh.visible) {
        tile.lastAccessTime = now;
      }
    }

    // Only do dynamic loading if camera has moved significantly
    const cameraMoved = this.lastCameraPos.hyperbolicDistance(camGyro) > 0.05;
    if (cameraMoved) {
      this.expandTilesAroundCamera(camGyro);
      this.pruneDistantTiles(camGyro);
      this.lastCameraPos = camGyro.clone();
    }
  }

  /** Get total tile count (for debug) */
  getTotalTileCount(): number {
    return this.tiles.size;
  }

  // ===== End Dynamic Tile Loading System =====

  /** Update uniforms for all tiles */
  updateUniforms(updates: TilingUniformUpdates): void {
    const uniformUpdates: Partial<HyperbolicMaterialUniforms> = {};

    if (updates.cameraPosition) {
      uniformUpdates.cameraPosition = new THREE.Vector3(
        updates.cameraPosition.x,
        updates.cameraPosition.y,
        updates.cameraPosition.z
      );
    }

    if (updates.cameraRotation) {
      uniformUpdates.cameraRotation = new THREE.Vector2(
        updates.cameraRotation.yaw,
        updates.cameraRotation.pitch
      );
    }

    if (updates.time !== undefined) {
      uniformUpdates.time = updates.time;
    }

    if (updates.debugMode !== undefined) {
      this._debugMode = updates.debugMode;
      uniformUpdates.debugMode = updates.debugMode;
    }

    if (updates.debugType !== undefined) {
      this._debugType = updates.debugType;
      uniformUpdates.debugType = updates.debugType;
    }

    // Update all tile materials
    for (const tile of this.tiles.values()) {
      const material = tile.mesh.material as THREE.ShaderMaterial;
      updateHyperbolicMaterial(material, uniformUpdates);
    }
  }

  /** Set surface curvature mode */
  setSurfaceMode(mode: 'flat' | 'hyperbolic'): void {
    this.surfaceMode = mode;
  }

  /** Set the maximum tile count for dynamic tiling */
  setMaxTileCount(count: number): void {
    this.dynamicConfig.maxTileCount = count;
  }

  /** Set debug mode */
  setDebugMode(enabled: boolean, type: number = 0): void {
    this._debugMode = enabled;
    this._debugType = type;
    this.updateUniforms({ debugMode: enabled, debugType: type });
  }

  /** Get current debug mode state */
  getDebugMode(): boolean {
    return this._debugMode;
  }

  /** Get current debug type */
  getDebugType(): number {
    return this._debugType;
  }

  /** Update tiling based on camera position */
  update(cameraPosition: Vec3): void {
    const camGyro = Gyrovector.fromVec3(cameraPosition);

    for (const tile of this.tiles.values()) {
      // Calculate relative position using Möbius subtraction (hyperbolic translation)
      const relativePos = camGyro.negate().mobiusAdd(tile.center);

      // Update mesh position
      tile.mesh.position.set(relativePos.x, relativePos.y, relativePos.z);

      // Conformal scale factor: tiles near disk boundary shrink
      const scale = 1 - relativePos.normSquared();
      tile.mesh.scale.setScalar(scale);

      // Calculate hyperbolic distance for visibility culling
      const dist = camGyro.hyperbolicDistance(tile.center);
      tile.mesh.visible = dist < 6.0;
    }
  }

  /** Get number of visible tiles */
  getVisibleTileCount(): number {
    let count = 0;
    for (const tile of this.tiles.values()) {
      if (tile.mesh.visible) count++;
    }
    return count;
  }

  /** Get all tile positions (for debug overlay) */
  getTilePositions(): Vec3[] {
    const positions: Vec3[] = [];
    for (const tile of this.tiles.values()) {
      positions.push({
        x: tile.center.x,
        y: tile.center.y,
        z: tile.center.z,
      });
    }
    return positions;
  }

  /** Dispose all resources */
  dispose(): void {
    for (const tile of this.tiles.values()) {
      // Don't dispose shared geometry
      if (Array.isArray(tile.mesh.material)) {
        tile.mesh.material.forEach((m) => m.dispose());
      } else {
        tile.mesh.material.dispose();
      }
    }
    this.tiles.clear();
    this.tilePositionIndex.clear();

    if (this.tilePool) {
      this.tilePool.dispose();
    }

    if (this.baseTileGeometry) {
      this.baseTileGeometry.dispose();
    }
    this.sharedMaterial.dispose();
  }
}
