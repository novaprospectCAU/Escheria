/**
 * Main hyperbolic rendering engine using Three.js.
 */

import * as THREE from 'three';
import type { EngineConfig, DebugInfo, TilingConfig } from '@/types';
import { HyperbolicCamera } from './HyperbolicCamera';
import { HyperbolicTiling } from './HyperbolicTiling';

export class HyperbolicEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private threeCamera: THREE.PerspectiveCamera;
  private hyperbolicCamera: HyperbolicCamera;
  private tiling: HyperbolicTiling | null = null;

  private animationId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;

  private onDebugUpdate: ((info: Partial<DebugInfo>) => void) | null = null;

  constructor(config: EngineConfig) {
    // Get canvas element
    const canvas = typeof config.canvas === 'string'
      ? document.querySelector<HTMLCanvasElement>(config.canvas)
      : config.canvas;

    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000);

    // Initialize scene
    this.scene = new THREE.Scene();

    // Initialize cameras
    const aspect = canvas.clientWidth / canvas.clientHeight;
    this.threeCamera = new THREE.PerspectiveCamera(
      (config.fov ?? 75) * (180 / Math.PI),
      aspect,
      0.01,
      100
    );
    this.threeCamera.position.z = 2;

    this.hyperbolicCamera = new HyperbolicCamera();

    // Add basic lighting
    this.setupLighting();

    // Handle resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private setupLighting(): void {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambient);

    // Directional light
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(1, 2, 3);
    this.scene.add(directional);

    // Point light at origin (for hyperbolic effect)
    const point = new THREE.PointLight(0xffffff, 0.5);
    point.position.set(0, 0, 0);
    this.scene.add(point);
  }

  private handleResize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.renderer.setSize(width, height, false);
    this.threeCamera.aspect = width / height;
    this.threeCamera.updateProjectionMatrix();
  }

  /** Set tiling configuration */
  setTiling(config: TilingConfig): void {
    // Remove old tiling
    if (this.tiling) {
      this.tiling.dispose();
      this.scene.remove(this.tiling.getGroup());
    }

    // Create new tiling
    this.tiling = new HyperbolicTiling(config);
    this.scene.add(this.tiling.getGroup());
  }

  /** Set debug callback */
  setDebugCallback(callback: (info: Partial<DebugInfo>) => void): void {
    this.onDebugUpdate = callback;
  }

  /** Get hyperbolic camera for external control */
  getCamera(): HyperbolicCamera {
    return this.hyperbolicCamera;
  }

  /** Start animation loop */
  start(): void {
    if (this.animationId !== null) return;

    this.lastTime = performance.now();
    this.fpsUpdateTime = this.lastTime;
    this.frameCount = 0;

    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);

      // Calculate delta time
      const deltaTime = (time - this.lastTime) / 1000;
      this.lastTime = time;

      // Update FPS counter
      this.frameCount++;
      if (time - this.fpsUpdateTime >= 1000) {
        this.currentFps = this.frameCount;
        this.frameCount = 0;
        this.fpsUpdateTime = time;
      }

      // Update camera
      this.hyperbolicCamera.update(deltaTime);

      // Update tiling based on camera position
      if (this.tiling) {
        this.tiling.update(this.hyperbolicCamera.getPosition());
      }

      // Update Three.js camera based on hyperbolic camera
      const pos = this.hyperbolicCamera.getPosition();
      const rotation = this.hyperbolicCamera.getRotation();

      // Simple mapping for now - will be replaced with proper projection
      this.threeCamera.position.set(pos.x * 2, pos.y * 2, 2 - pos.z * 2);
      this.threeCamera.rotation.set(rotation.pitch, rotation.yaw, 0, 'YXZ');

      // Render
      this.renderer.render(this.scene, this.threeCamera);

      // Update debug info
      if (this.onDebugUpdate) {
        this.onDebugUpdate({
          fps: this.currentFps,
          position: pos,
          hyperbolicDistance: this.hyperbolicCamera.getDistanceFromOrigin(),
          visibleTiles: this.tiling?.getVisibleTileCount() ?? 0,
        });
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /** Stop animation loop */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /** Dispose all resources */
  dispose(): void {
    this.stop();

    if (this.tiling) {
      this.tiling.dispose();
    }

    this.renderer.dispose();
    window.removeEventListener('resize', () => this.handleResize());
  }
}
