/**
 * Hyperbolic tiling generator.
 * Creates and manages tiles in a {p,q} hyperbolic tiling.
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

  // Debug settings (tracked for getter access)
  private _debugMode: boolean = false;
  private _debugType: number = 0;

  constructor(config: TilingConfig) {
    this.config = config;
    this.group = new THREE.Group();

    // Create shared hyperbolic material
    this.sharedMaterial = createHyperbolicMaterial({
      baseColor: 0x4488ff,
    });

    // Generate initial tiles
    this.generateBaseTile();
    this.generateTiling();
  }

  /** Get the Three.js group containing all tiles */
  getGroup(): THREE.Group {
    return this.group;
  }

  /** Generate the geometry for a single tile */
  private generateBaseTile(): void {
    const { p, q } = this.config;
    const vertices = getPolygonVertices(p, q);

    if (vertices.length < 3) {
      console.warn(`Invalid tiling {${p},${q}} - not hyperbolic`);
      return;
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Triangulate the polygon (fan triangulation from center)
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];

    // Center vertex
    const center = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < p; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % p];

      // Triangle: center, v1, v2
      positions.push(center.x, center.y, center.z);
      positions.push(v1.x, v1.y, v1.z);
      positions.push(v2.x, v2.y, v2.z);

      // Normals (pointing up in z direction)
      for (let j = 0; j < 3; j++) {
        normals.push(0, 0, 1);
      }

      // UVs
      uvs.push(0.5, 0.5);
      uvs.push(0.5 + v1.x, 0.5 + v1.y);
      uvs.push(0.5 + v2.x, 0.5 + v2.y);
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
  private createTile(id: string, center: Gyrovector, rotation: number, depth: number): void {
    if (this.tiles.has(id) || !this.baseTileGeometry) return;

    // Clone material for per-tile color variation
    const material = this.sharedMaterial.clone();

    // Set color based on depth using HSL
    const hue = (depth * 0.15) % 1;
    const color = new THREE.Color();
    color.setHSL(hue, 0.7, 0.5);
    material.uniforms.uBaseColor.value = color;

    // Create mesh
    const mesh = new THREE.Mesh(this.baseTileGeometry, material);

    // Position the tile in world space (Poincaré coordinates)
    mesh.position.set(center.x, center.y, center.z);
    mesh.rotation.z = rotation;

    this.group.add(mesh);

    this.tiles.set(id, {
      id,
      center,
      rotation,
      mesh,
      depth,
    });
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
      tile.mesh.geometry.dispose();
      if (Array.isArray(tile.mesh.material)) {
        tile.mesh.material.forEach((m) => m.dispose());
      } else {
        tile.mesh.material.dispose();
      }
    }
    this.tiles.clear();

    if (this.baseTileGeometry) {
      this.baseTileGeometry.dispose();
    }
    this.sharedMaterial.dispose();
  }
}
