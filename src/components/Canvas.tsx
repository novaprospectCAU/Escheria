/**
 * Three.js canvas wrapper component.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { DebugInfo, TilingConfig } from '@/types';
import { HyperbolicEngine } from '@/engine/HyperbolicEngine';

interface CanvasProps {
  tilingConfig: TilingConfig;
  onDebugUpdate: (info: Partial<DebugInfo>) => void;
}

export default function Canvas({ tilingConfig, onDebugUpdate }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HyperbolicEngine | null>(null);

  // Handle pointer lock
  const handleClick = useCallback(() => {
    if (canvasRef.current && engineRef.current) {
      engineRef.current.getCamera().requestPointerLock(canvasRef.current);
    }
  }, []);

  // Handle escape to exit pointer lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && engineRef.current) {
        engineRef.current.getCamera().exitPointerLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new HyperbolicEngine({
      canvas: canvasRef.current,
      fov: Math.PI / 3,
      renderDistance: 5,
      debug: true,
    });

    engine.setDebugCallback(onDebugUpdate);
    engine.setTiling(tilingConfig);
    engine.start();

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Update tiling when config changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTiling(tilingConfig);
    }
  }, [tilingConfig]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#888',
          fontSize: '12px',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Click to capture mouse • WASD to move • Mouse to look • ESC to release
      </div>
    </div>
  );
}
