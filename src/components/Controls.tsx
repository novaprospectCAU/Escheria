/**
 * UI control panel component.
 */

import type { TilingConfig } from '@/types';

interface ControlsProps {
  tilingConfig: TilingConfig;
  onTilingChange: (config: TilingConfig) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
}

// Predefined tiling options
const TILING_PRESETS: { label: string; p: number; q: number }[] = [
  { label: '{5,4} Pentagon', p: 5, q: 4 },
  { label: '{6,4} Hexagon', p: 6, q: 4 },
  { label: '{7,3} Heptagon', p: 7, q: 3 },
  { label: '{8,3} Octagon', p: 8, q: 3 },
  { label: '{4,5} Square', p: 4, q: 5 },
  { label: '{3,7} Triangle', p: 3, q: 7 },
];

export default function Controls({
  tilingConfig,
  onTilingChange,
  showDebug,
  onToggleDebug,
}: ControlsProps) {
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = TILING_PRESETS[parseInt(e.target.value)];
    if (preset) {
      onTilingChange({
        ...tilingConfig,
        p: preset.p,
        q: preset.q,
      });
    }
  };

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const depth = parseInt(e.target.value);
    onTilingChange({
      ...tilingConfig,
      maxDepth: Math.max(1, Math.min(8, depth)),
    });
  };

  const currentPresetIndex = TILING_PRESETS.findIndex(
    (p) => p.p === tilingConfig.p && p.q === tilingConfig.q
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '13px',
        minWidth: '200px',
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Controls</h3>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>
          Tiling Type
        </label>
        <select
          value={currentPresetIndex >= 0 ? currentPresetIndex : ''}
          onChange={handlePresetChange}
          style={{
            width: '100%',
            padding: '6px',
            background: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            fontFamily: 'monospace',
          }}
        >
          {TILING_PRESETS.map((preset, i) => (
            <option key={i} value={i}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>
          Tiling Depth: {tilingConfig.maxDepth}
        </label>
        <input
          type="range"
          min="1"
          max="6"
          value={tilingConfig.maxDepth}
          onChange={handleDepthChange}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={showDebug}
            onChange={onToggleDebug}
            style={{ marginRight: '8px' }}
          />
          Show Debug Info
        </label>
      </div>

      <div
        style={{
          marginTop: '15px',
          paddingTop: '15px',
          borderTop: '1px solid #444',
          color: '#666',
          fontSize: '11px',
        }}
      >
        <div>P = {tilingConfig.p} (polygon sides)</div>
        <div>Q = {tilingConfig.q} (at each vertex)</div>
        <div style={{ marginTop: '5px' }}>
          {(tilingConfig.p - 2) * (tilingConfig.q - 2) > 4
            ? 'Hyperbolic'
            : (tilingConfig.p - 2) * (tilingConfig.q - 2) === 4
            ? 'Euclidean'
            : 'Spherical'}
        </div>
      </div>
    </div>
  );
}
