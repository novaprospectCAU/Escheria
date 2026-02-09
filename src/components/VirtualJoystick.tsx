/**
 * Virtual joystick for mobile touch controls.
 * Left half: movement joystick (appears at touch position)
 * Right half: rotation drag area
 */

import { useEffect, useRef, useCallback } from 'react';
import type { HyperbolicCamera } from '@/engine/HyperbolicCamera';

interface VirtualJoystickProps {
  camera: HyperbolicCamera;
}

const JOYSTICK_BASE_RADIUS = 50;
const JOYSTICK_KNOB_RADIUS = 20;
const MAX_DRAG_RADIUS = 50;
const ROTATION_SENSITIVITY = 0.004;

export default function VirtualJoystick({ camera }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);

  // Track touch identifiers
  const moveTouch = useRef<number | null>(null);
  const lookTouch = useRef<number | null>(null);
  const moveTouchOrigin = useRef({ x: 0, y: 0 });
  const lookTouchPrev = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Let UI elements (buttons, inputs, selects) handle their own touches
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, label, [data-controls]')) return;

      e.preventDefault();
      const screenMid = window.innerWidth / 2;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.clientX < screenMid && moveTouch.current === null) {
          // Left half → movement joystick
          moveTouch.current = touch.identifier;
          moveTouchOrigin.current = { x: touch.clientX, y: touch.clientY };

          // Show joystick base at touch position
          if (baseRef.current) {
            baseRef.current.style.display = 'block';
            baseRef.current.style.left = `${touch.clientX - JOYSTICK_BASE_RADIUS}px`;
            baseRef.current.style.top = `${touch.clientY - JOYSTICK_BASE_RADIUS}px`;
          }
          if (knobRef.current) {
            knobRef.current.style.display = 'block';
            knobRef.current.style.left = `${touch.clientX - JOYSTICK_KNOB_RADIUS}px`;
            knobRef.current.style.top = `${touch.clientY - JOYSTICK_KNOB_RADIUS}px`;
          }
        } else if (touch.clientX >= screenMid && lookTouch.current === null) {
          // Right half → rotation drag
          lookTouch.current = touch.identifier;
          lookTouchPrev.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, label, [data-controls]')) return;

      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === moveTouch.current) {
          const dx = touch.clientX - moveTouchOrigin.current.x;
          const dy = touch.clientY - moveTouchOrigin.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const clamped = Math.min(dist, MAX_DRAG_RADIUS);
          const nx = dist > 0 ? (dx / dist) * clamped : 0;
          const ny = dist > 0 ? (dy / dist) * clamped : 0;

          // Update knob position directly (no React re-render)
          if (knobRef.current) {
            knobRef.current.style.left = `${moveTouchOrigin.current.x + nx - JOYSTICK_KNOB_RADIUS}px`;
            knobRef.current.style.top = `${moveTouchOrigin.current.y + ny - JOYSTICK_KNOB_RADIUS}px`;
          }

          // Normalized [-1, 1]
          camera.setExternalMovement(nx / MAX_DRAG_RADIUS, -ny / MAX_DRAG_RADIUS);
        }

        if (touch.identifier === lookTouch.current) {
          const dx = touch.clientX - lookTouchPrev.current.x;
          const dy = touch.clientY - lookTouchPrev.current.y;
          camera.setExternalRotation(-dx * ROTATION_SENSITIVITY, -dy * ROTATION_SENSITIVITY);
          lookTouchPrev.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    },
    [camera]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === moveTouch.current) {
          moveTouch.current = null;
          camera.setExternalMovement(0, 0);

          // Hide joystick
          if (baseRef.current) baseRef.current.style.display = 'none';
          if (knobRef.current) knobRef.current.style.display = 'none';
        }

        if (touch.identifier === lookTouch.current) {
          lookTouch.current = null;
        }
      }
    },
    [camera]
  );

  useEffect(() => {
    const opts: AddEventListenerOptions = { passive: false };
    document.addEventListener('touchstart', handleTouchStart, opts);
    document.addEventListener('touchmove', handleTouchMove, opts);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <>
      {/* Joystick base */}
      <div
        ref={baseRef}
        style={{
          display: 'none',
          position: 'fixed',
          width: JOYSTICK_BASE_RADIUS * 2,
          height: JOYSTICK_BASE_RADIUS * 2,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />
      {/* Joystick knob */}
      <div
        ref={knobRef}
        style={{
          display: 'none',
          position: 'fixed',
          width: JOYSTICK_KNOB_RADIUS * 2,
          height: JOYSTICK_KNOB_RADIUS * 2,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          border: '1px solid rgba(255,255,255,0.4)',
          pointerEvents: 'none',
          zIndex: 101,
        }}
      />
    </>
  );
}
