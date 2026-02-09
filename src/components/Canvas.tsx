/**
 * Three.js canvas wrapper component.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { DebugInfo, TilingConfig } from '@/types';
import { HyperbolicEngine } from '@/engine/HyperbolicEngine';
import type { HyperbolicCamera } from '@/engine/HyperbolicCamera';
import VirtualJoystick from './VirtualJoystick';

interface CanvasProps {
  tilingConfig: TilingConfig;
  onDebugUpdate: (info: Partial<DebugInfo>) => void;
  onEngineReady?: (engine: HyperbolicEngine) => void;
  debugMode?: boolean;
  debugType?: number;
  isMobile?: boolean;
  firstPerson?: boolean;
}

export default function Canvas({
  tilingConfig,
  onDebugUpdate,
  onEngineReady,
  debugMode = false,
  debugType = 0,
  isMobile = false,
  firstPerson = true,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HyperbolicEngine | null>(null);
  const [camera, setCamera] = useState<HyperbolicCamera | null>(null);

  // Handle pointer lock (desktop only)
  const handleClick = useCallback(() => {
    if (!isMobile && canvasRef.current && engineRef.current) {
      engineRef.current.getCamera().requestPointerLock(canvasRef.current);
    }
  }, [isMobile]);

  // Handle escape to exit pointer lock
  useEffect(() => {
    if (isMobile) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && engineRef.current) {
        engineRef.current.getCamera().exitPointerLock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new HyperbolicEngine({
      canvas: canvasRef.current,
      fov: Math.PI / 3,
      renderDistance: 5,
      debug: true,
      mobile: isMobile,
    });

    engine.setDebugCallback(onDebugUpdate);
    engine.setTiling(tilingConfig);
    engine.start();

    engineRef.current = engine;
    setCamera(engine.getCamera());

    // Notify parent that engine is ready
    onEngineReady?.(engine);

    return () => {
      engine.dispose();
      engineRef.current = null;
      setCamera(null);
    };
  }, []);

  // Update tiling when config changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTiling(tilingConfig);
    }
  }, [tilingConfig]);

  // Update debug mode
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDebugMode(debugMode, debugType);
    }
  }, [debugMode, debugType]);

  // Update first-person mode
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setFirstPerson(firstPerson);
    }
  }, [firstPerson]);

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
          cursor: isMobile ? 'default' : 'pointer',
        }}
      />
      {!isMobile && (
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
      )}
      {isMobile && camera && <VirtualJoystick camera={camera} />}
    </div>
  );
}
