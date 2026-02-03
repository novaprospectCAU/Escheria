/**
 * Debug information overlay component.
 */

import type { DebugInfo } from '@/types';

interface DebugOverlayProps {
  info: DebugInfo;
}

export default function DebugOverlay({ info }: DebugOverlayProps) {
  const formatNumber = (n: number, decimals: number = 3): string => {
    return n.toFixed(decimals);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '12px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.6',
        minWidth: '180px',
      }}
    >
      <div style={{ color: '#4f4', fontWeight: 'bold', marginBottom: '8px' }}>
        Escheria Debug
      </div>

      <div>
        <span style={{ color: '#888' }}>FPS:</span>{' '}
        <span style={{ color: info.fps >= 55 ? '#4f4' : info.fps >= 30 ? '#ff4' : '#f44' }}>
          {info.fps}
        </span>
      </div>

      <div>
        <span style={{ color: '#888' }}>WASM:</span>{' '}
        <span style={{ color: info.wasmLoaded ? '#4f4' : '#888' }}>
          {info.wasmLoaded ? 'Loaded' : 'JS Fallback'}
        </span>
      </div>

      <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }}>
        <div style={{ color: '#888', marginBottom: '4px' }}>Position (Poincaré)</div>
        <div>
          x: {formatNumber(info.position.x)}
        </div>
        <div>
          y: {formatNumber(info.position.y)}
        </div>
        <div>
          z: {formatNumber(info.position.z)}
        </div>
      </div>

      <div style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '8px' }}>
        <div>
          <span style={{ color: '#888' }}>Hyp. Dist:</span>{' '}
          {formatNumber(info.hyperbolicDistance)}
        </div>
        <div>
          <span style={{ color: '#888' }}>Visible Tiles:</span>{' '}
          {info.visibleTiles}
        </div>
      </div>

      <div
        style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: '1px solid #444',
          color: '#666',
          fontSize: '10px',
        }}
      >
        |p| = {formatNumber(Math.sqrt(
          info.position.x ** 2 +
          info.position.y ** 2 +
          info.position.z ** 2
        ))}
        {' '}(must be &lt; 1)
      </div>
    </div>
  );
}
