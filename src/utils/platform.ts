/**
 * Platform detection utilities.
 */

let _isMobile: boolean | null = null;

function isTouchPrimary(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

function isMobileDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 1024
  );
}

/** Detect if the current device is mobile (memoized). */
export function isMobile(): boolean {
  if (_isMobile === null) {
    _isMobile = isTouchPrimary() || isMobileDevice();
  }
  return _isMobile;
}
