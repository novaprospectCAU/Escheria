/**
 * Poincaré Disk Debug Overlay
 * Shows a 2D minimap of the hyperbolic space with camera position and tile locations.
 */

import { useEffect, useRef } from 'react';
import type { Vec3 } from '@/types';

interface PoincareDebugProps {
  cameraPosition: Vec3;
  tilePositions: Vec3[];
  size?: number;
}

export default function PoincareDebug({
  cameraPosition,
  tilePositions,
  size = 150,
}: PoincareDebugProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 10;

    // Draw Poincaré disk boundary
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw coordinate axes
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Draw concentric circles for distance reference
    ctx.strokeStyle = 'rgba(70, 70, 70, 0.5)';
    ctx.setLineDash([2, 4]);
    for (let r = 0.25; r < 1; r += 0.25) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Helper function to map Poincaré coordinates to canvas
    const toCanvas = (x: number, y: number): [number, number] => {
      return [
        centerX + x * radius,
        centerY - y * radius, // Flip Y for canvas coordinates
      ];
    };

    // Draw tile positions
    for (const pos of tilePositions) {
      const [cx, cy] = toCanvas(pos.x, pos.y);

      // Skip if outside disk (shouldn't happen but safety check)
      const norm = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      if (norm >= 1) continue;

      // Color based on distance from origin
      const hue = (norm * 120) % 360; // Green to red
      ctx.fillStyle = `hsla(${120 - hue}, 70%, 50%, 0.6)`;

      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw camera position (larger, distinct color)
    const [camX, camY] = toCanvas(cameraPosition.x, cameraPosition.y);

    // Camera outer glow
    ctx.beginPath();
    ctx.arc(camX, camY, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Camera dot
    ctx.beginPath();
    ctx.arc(camX, camY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw camera direction indicator (optional: based on rotation)
    // For now, just draw a simple arrow pointing forward

    // Draw legend
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Poincaré Disk', 5, 12);

    // Show camera coordinates
    const camNorm = Math.sqrt(
      cameraPosition.x * cameraPosition.x +
      cameraPosition.y * cameraPosition.y
    );
    ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
    ctx.fillText(`|p| = ${camNorm.toFixed(3)}`, 5, size - 5);

  }, [cameraPosition, tilePositions, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '8px',
        border: '1px solid rgba(100, 150, 255, 0.5)',
        pointerEvents: 'none',
      }}
    />
  );
}
