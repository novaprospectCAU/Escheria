import { useEffect, useState, useCallback } from 'react';
import Canvas from './components/Canvas';
import Controls from './components/Controls';
import DebugOverlay from './components/DebugOverlay';
import PoincareDebug from './components/PoincareDebug';
import { HyperMath } from './core/wasm/HyperMath';
import { HyperbolicEngine } from './engine/HyperbolicEngine';
import type { DebugInfo, TilingConfig, Vec3 } from './types';

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
  const [showPoincare, setShowPoincare] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [debugType, setDebugType] = useState(0);
  const [tilingConfig, setTilingConfig] = useState<TilingConfig>(DEFAULT_TILING);
  const [tilePositions, setTilePositions] = useState<Vec3[]>([]);
  const [engine, setEngine] = useState<HyperbolicEngine | null>(null);

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

  const handleDebugUpdate = useCallback((info: Partial<DebugInfo>) => {
    setDebugInfo((prev) => ({ ...prev, ...info }));
  }, []);

  const handleEngineReady = useCallback((eng: HyperbolicEngine) => {
    setEngine(eng);
    // Get initial tile positions
    const tiling = eng.getTiling();
    if (tiling) {
      setTilePositions(tiling.getTilePositions());
    }
  }, []);

  // Update tile positions when tiling config changes
  useEffect(() => {
    if (engine) {
      const tiling = engine.getTiling();
      if (tiling) {
        setTilePositions(tiling.getTilePositions());
      }
    }
  }, [engine, tilingConfig]);

  const handleToggleDebugMode = useCallback(() => {
    setDebugMode((prev) => !prev);
  }, []);

  const handleDebugTypeChange = useCallback((type: number) => {
    setDebugType(type);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        tilingConfig={tilingConfig}
        onDebugUpdate={handleDebugUpdate}
        onEngineReady={handleEngineReady}
        debugMode={debugMode}
        debugType={debugType}
      />
      <Controls
        tilingConfig={tilingConfig}
        onTilingChange={setTilingConfig}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug(!showDebug)}
        debugMode={debugMode}
        onToggleDebugMode={handleToggleDebugMode}
        debugType={debugType}
        onDebugTypeChange={handleDebugTypeChange}
        showPoincare={showPoincare}
        onTogglePoincare={() => setShowPoincare(!showPoincare)}
      />
      {showDebug && <DebugOverlay info={debugInfo} />}
      {showPoincare && (
        <PoincareDebug
          cameraPosition={debugInfo.position}
          tilePositions={tilePositions}
          size={150}
        />
      )}
    </div>
  );
}

export default App;
