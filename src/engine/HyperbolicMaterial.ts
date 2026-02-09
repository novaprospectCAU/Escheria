/**
 * Hyperbolic ShaderMaterial factory.
 * Creates Three.js ShaderMaterial with proper uniforms for hyperbolic rendering.
 */

import * as THREE from 'three';
import vertexShader from '@/shaders/hyperbolic.vert.glsl';
import fragmentShader from '@/shaders/hyperbolic.frag.glsl';

export interface HyperbolicMaterialUniforms {
  cameraPosition: THREE.Vector3;
  cameraRotation: THREE.Vector2;
  lightPosition: THREE.Vector3;
  lightColor: THREE.Color;
  ambientColor: THREE.Color;
  baseColor: THREE.Color;
  fogStart: number;
  fogEnd: number;
  fogColor: THREE.Color;
  time: number;
  debugMode: boolean;
  debugType: number;
  renderDistance: number;
}

export interface HyperbolicMaterialOptions {
  baseColor?: THREE.Color | number;
  debugMode?: boolean;
  debugType?: number;
}

const DEFAULT_UNIFORMS: HyperbolicMaterialUniforms = {
  cameraPosition: new THREE.Vector3(0, 0, 0),
  cameraRotation: new THREE.Vector2(0, 0),
  lightPosition: new THREE.Vector3(0, 0, 0.5),
  lightColor: new THREE.Color(1, 1, 1),
  ambientColor: new THREE.Color(0.5, 0.5, 0.5),
  baseColor: new THREE.Color(0x4488ff),
  fogStart: 3.5,
  fogEnd: 7.0,
  fogColor: new THREE.Color(0x000000),
  time: 0,
  debugMode: false,
  debugType: 0,
  renderDistance: 10.0,
};

/**
 * Create a ShaderMaterial for hyperbolic rendering.
 */
export function createHyperbolicMaterial(
  options: HyperbolicMaterialOptions = {}
): THREE.ShaderMaterial {
  const baseColor =
    options.baseColor instanceof THREE.Color
      ? options.baseColor
      : new THREE.Color(options.baseColor ?? 0x4488ff);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uCameraPosition: { value: DEFAULT_UNIFORMS.cameraPosition.clone() },
      uCameraRotation: { value: DEFAULT_UNIFORMS.cameraRotation.clone() },
      uLightPosition: { value: DEFAULT_UNIFORMS.lightPosition.clone() },
      uLightColor: { value: DEFAULT_UNIFORMS.lightColor.clone() },
      uAmbientColor: { value: DEFAULT_UNIFORMS.ambientColor.clone() },
      uBaseColor: { value: baseColor.clone() },
      uFogStart: { value: DEFAULT_UNIFORMS.fogStart },
      uFogEnd: { value: DEFAULT_UNIFORMS.fogEnd },
      uFogColor: { value: DEFAULT_UNIFORMS.fogColor.clone() },
      uTime: { value: DEFAULT_UNIFORMS.time },
      uDebugMode: { value: options.debugMode ?? false },
      uDebugType: { value: options.debugType ?? 0 },
      uRenderDistance: { value: DEFAULT_UNIFORMS.renderDistance },
    },
    side: THREE.FrontSide,
    transparent: false,
  });

  return material;
}

/**
 * Update uniforms on a hyperbolic material.
 */
export function updateHyperbolicMaterial(
  material: THREE.ShaderMaterial,
  updates: Partial<HyperbolicMaterialUniforms>
): void {
  if (updates.cameraPosition !== undefined) {
    material.uniforms.uCameraPosition.value.copy(updates.cameraPosition);
  }
  if (updates.cameraRotation !== undefined) {
    material.uniforms.uCameraRotation.value.copy(updates.cameraRotation);
  }
  if (updates.lightPosition !== undefined) {
    material.uniforms.uLightPosition.value.copy(updates.lightPosition);
  }
  if (updates.lightColor !== undefined) {
    material.uniforms.uLightColor.value.copy(updates.lightColor);
  }
  if (updates.ambientColor !== undefined) {
    material.uniforms.uAmbientColor.value.copy(updates.ambientColor);
  }
  if (updates.baseColor !== undefined) {
    material.uniforms.uBaseColor.value.copy(updates.baseColor);
  }
  if (updates.fogStart !== undefined) {
    material.uniforms.uFogStart.value = updates.fogStart;
  }
  if (updates.fogEnd !== undefined) {
    material.uniforms.uFogEnd.value = updates.fogEnd;
  }
  if (updates.fogColor !== undefined) {
    material.uniforms.uFogColor.value.copy(updates.fogColor);
  }
  if (updates.time !== undefined) {
    material.uniforms.uTime.value = updates.time;
  }
  if (updates.debugMode !== undefined) {
    material.uniforms.uDebugMode.value = updates.debugMode;
  }
  if (updates.debugType !== undefined) {
    material.uniforms.uDebugType.value = updates.debugType;
  }
  if (updates.renderDistance !== undefined) {
    material.uniforms.uRenderDistance.value = updates.renderDistance;
  }
}
