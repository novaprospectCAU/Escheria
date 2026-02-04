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
  private startTime: number = 0;

  private onDebugUpdate: ((info: Partial<DebugInfo>) => void) | null = null;

  // Debug settings
  private debugMode: boolean = false;
  private debugType: number = 0;

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
    // Position camera to look at the XY plane (where tiles are)
    this.threeCamera.position.z = 2;
    this.threeCamera.lookAt(0, 0, 0);

    this.hyperbolicCamera = new HyperbolicCamera();

    // Handle resize
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
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

    // Apply current debug settings
    this.tiling.setDebugMode(this.debugMode, this.debugType);
  }

  /** Set debug callback */
  setDebugCallback(callback: (info: Partial<DebugInfo>) => void): void {
    this.onDebugUpdate = callback;
  }

  /** Get hyperbolic camera for external control */
  getCamera(): HyperbolicCamera {
    return this.hyperbolicCamera;
  }

  /** Set debug mode */
  setDebugMode(enabled: boolean, type: number = 0): void {
    this.debugMode = enabled;
    this.debugType = type;
    this.tiling?.setDebugMode(enabled, type);
  }

  /** Get tiling for external access (e.g., Poincaré debug) */
  getTiling(): HyperbolicTiling | null {
    return this.tiling;
  }

  /** Start animation loop */
  start(): void {
    if (this.animationId !== null) return;

    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.fpsUpdateTime = this.startTime;
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

      // Get camera state
      const pos = this.hyperbolicCamera.getPosition();
      const rotation = this.hyperbolicCamera.getRotation();

      // Update tiling uniforms
      if (this.tiling) {
        // Dynamic tile loading - replaces static update
        this.tiling.updateDynamic(pos);

        // Update shader uniforms
        this.tiling.updateUniforms({
          cameraPosition: pos,
          cameraRotation: rotation,
          time: (time - this.startTime) / 1000,
        });

        // Apply yaw rotation to the tiling group (for 2D view rotation)
        this.tiling.getGroup().rotation.z = -rotation.yaw;
      }

      // Update Three.js camera - fixed overhead view
      this.threeCamera.position.set(0, 0, 2);
      this.threeCamera.lookAt(0, 0, 0);

      // Render
      this.renderer.render(this.scene, this.threeCamera);

      // Update debug info
      if (this.onDebugUpdate) {
        this.onDebugUpdate({
          fps: this.currentFps,
          position: pos,
          hyperbolicDistance: this.hyperbolicCamera.getDistanceFromOrigin(),
          visibleTiles: this.tiling?.getVisibleTileCount() ?? 0,
          totalTiles: this.tiling?.getTotalTileCount() ?? 0,
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
