import { useEffect, useState } from 'react';
import Canvas from './components/Canvas';
import Controls from './components/Controls';
import DebugOverlay from './components/DebugOverlay';
import { HyperMath } from './core/wasm/HyperMath';
import type { DebugInfo, TilingConfig } from './types';

const DEFAULT_TILING: TilingConfig = {
  p: 7,  // heptagon
  q: 3,  // 3 at each vertex
  maxDepth: 4,
};

function App() {
  const [, setWasmLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    fps: 0,
    position: { x: 0, y: 0, z: 0 },
    hyperbolicDistance: 0,
    visibleTiles: 0,
    wasmLoaded: false,
  });
  const [showDebug, setShowDebug] = useState(true);
  const [tilingConfig, setTilingConfig] = useState<TilingConfig>(DEFAULT_TILING);

  useEffect(() => {
    // Initialize WASM module
    HyperMath.init()
      .then((loaded) => {
        setWasmLoaded(loaded);
        setDebugInfo((prev) => ({ ...prev, wasmLoaded: loaded }));
        if (loaded) {
          console.log('HyperMath WASM loaded:', HyperMath.getVersion());
        } else {
          console.log('Using JavaScript fallback for HyperMath');
        }
      })
      .catch((error) => {
        console.warn('WASM initialization failed, using JS fallback:', error);
        setWasmLoaded(false);
      });
  }, []);

  const handleDebugUpdate = (info: Partial<DebugInfo>) => {
    setDebugInfo((prev) => ({ ...prev, ...info }));
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        tilingConfig={tilingConfig}
        onDebugUpdate={handleDebugUpdate}
      />
      <Controls
        tilingConfig={tilingConfig}
        onTilingChange={setTilingConfig}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
      />
      {showDebug && <DebugOverlay info={debugInfo} />}
    </div>
  );
}

export default App;
