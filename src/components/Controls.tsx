/**
 * UI control panel component.
 */

import { useState } from 'react';
import type { TilingConfig } from '@/types';

interface ControlsProps {
  tilingConfig: TilingConfig;
  onTilingChange: (config: TilingConfig) => void;
  showDebug: boolean;
  onToggleDebug: () => void;
  debugMode?: boolean;
  onToggleDebugMode?: () => void;
  debugType?: number;
  onDebugTypeChange?: (type: number) => void;
  showPoincare?: boolean;
  onTogglePoincare?: () => void;
  firstPerson?: boolean;
  onToggleFirstPerson?: () => void;
  surfaceMode?: 'flat' | 'hyperbolic' | 'hemisphere';
  onSurfaceModeChange?: (mode: 'flat' | 'hyperbolic' | 'hemisphere') => void;
  isMobile?: boolean;
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

// Debug visualization types
const DEBUG_TYPES = [
  { value: 0, label: 'Distance' },
  { value: 1, label: 'Normals' },
  { value: 2, label: 'UV' },
];

export default function Controls({
  tilingConfig,
  onTilingChange,
  showDebug,
  onToggleDebug,
  debugMode = false,
  onToggleDebugMode,
  debugType = 0,
  onDebugTypeChange,
  showPoincare = true,
  onTogglePoincare,
  firstPerson = true,
  onToggleFirstPerson,
  surfaceMode = 'flat',
  onSurfaceModeChange,
  isMobile = false,
}: ControlsProps) {
  const [collapsed, setCollapsed] = useState(isMobile);

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

  const handleDebugTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onDebugTypeChange?.(parseInt(e.target.value));
  };

  const currentPresetIndex = TILING_PRESETS.findIndex(
    (p) => p.p === tilingConfig.p && p.q === tilingConfig.q
  );

  const maxDepthSlider = isMobile ? 4 : 6;

  const controlsBody = (
    <>
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
          Tile Density: {tilingConfig.maxDepth}
        </label>
        <input
          type="range"
          min="1"
          max={maxDepthSlider}
          value={tilingConfig.maxDepth}
          onChange={handleDepthChange}
          style={{ width: '100%' }}
        />
      </div>

      {onToggleFirstPerson && (
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
              checked={firstPerson}
              onChange={onToggleFirstPerson}
              style={{ marginRight: '8px' }}
            />
            First Person View
          </label>
        </div>
      )}

      {firstPerson && onSurfaceModeChange && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>
            Surface Mode
          </label>
          <select
            value={surfaceMode}
            onChange={(e) => onSurfaceModeChange(e.target.value as 'flat' | 'hyperbolic' | 'hemisphere')}
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
            <option value="flat">Flat</option>
            <option value="hyperbolic">Hyperbolic</option>
            <option value="hemisphere">Hemisphere</option>
          </select>
        </div>
      )}

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

      {onTogglePoincare && (
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
              checked={showPoincare}
              onChange={onTogglePoincare}
              style={{ marginRight: '8px' }}
            />
            Show Poincar&eacute; Disk
          </label>
        </div>
      )}

      {onToggleDebugMode && (
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
              checked={debugMode}
              onChange={onToggleDebugMode}
              style={{ marginRight: '8px' }}
            />
            Shader Debug Mode
          </label>
        </div>
      )}

      {debugMode && onDebugTypeChange && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: '#aaa' }}>
            Debug Visualization
          </label>
          <select
            value={debugType}
            onChange={handleDebugTypeChange}
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
            {DEBUG_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      )}

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
    </>
  );

  // Mobile: collapsible panel
  if (isMobile) {
    if (collapsed) {
      return (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 200,
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Open controls"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <rect y="0" width="18" height="2" rx="1" fill="#fff" />
            <rect y="6" width="18" height="2" rx="1" fill="#fff" />
            <rect y="12" width="18" height="2" rx="1" fill="#fff" />
          </svg>
        </button>
      );
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 260,
          height: '100%',
          background: 'rgba(0, 0, 0, 0.85)',
          padding: '15px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '13px',
          overflowY: 'auto',
          zIndex: 200,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>Controls</h3>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            aria-label="Close controls"
          >
            &times;
          </button>
        </div>
        {controlsBody}
      </div>
    );
  }

  // Desktop: always-visible panel
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
      {controlsBody}
    </div>
  );
}
