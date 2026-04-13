import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom Hook: useDoubleTap
 *
 * This hook detects when the user double-taps (two taps within 300ms) anywhere on the screen.
 * When a double-tap is detected, it calls the provided callback function.
 *
 * Why? On mobile/iPhone, double-tap is a natural gesture (like in photos/maps),
 * so we use it to trigger voice recording without needing a button.
 *
 * Usage:
 *   const { isDoubleTapActive } = useDoubleTap(() => {
 *     // This runs when user double-taps
 *     startListening();
 *   });
 */

export const useDoubleTap = (onDoubleTap) => {
  const lastTapTimeRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef(null);
  const isDoubleTapActiveRef = useRef(false);

  // The maximum time between taps to count as a double-tap (300ms)
  const DOUBLE_TAP_DELAY = 300;

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // Reset tap count if too much time has passed
    if (timeSinceLastTap > DOUBLE_TAP_DELAY) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }

    lastTapTimeRef.current = now;

    // If this is the second tap within the time window
    if (tapCountRef.current === 2) {
      isDoubleTapActiveRef.current = true;
      onDoubleTap();
      tapCountRef.current = 0; // Reset for next double-tap
    }

    // Clear the tap counter after delay
    clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      if (tapCountRef.current !== 2) {
        tapCountRef.current = 0;
      }
    }, DOUBLE_TAP_DELAY);
  }, [onDoubleTap]);

  // Attach touch listener to window
  useEffect(() => {
    window.addEventListener('touchend', handleTap);
    return () => {
      window.removeEventListener('touchend', handleTap);
      clearTimeout(tapTimeoutRef.current);
    };
  }, [handleTap]);

  return {
    isDoubleTapActive: isDoubleTapActiveRef.current,
  };
};
