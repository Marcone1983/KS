import React, { useRef, useEffect, useState } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Maximize2, RotateCcw, Hand, Move, ZoomIn, ZoomOut, Repeat } from 'lucide-react';
import gsap from 'gsap';

/**
 * ADVANCED GESTURE CONTROLS
 * - Swipe: Change weapon/powerup
 * - Pinch: Zoom camera
 * - Rotate: Rotate view
 * - Drag: Aim/pan camera
 * - Double Tap: Quick action (reload/power-up)
 * - Shake: Emergency reload
 * - Long Press: Special ability
 */

const GestureControls = ({
  onSwipe,
  onPinch,
  onRotate,
  onDrag,
  onDoubleTap,
  onShake,
  onLongPress,
  sensitivity = 1,
  children
}) => {
  const containerRef = useRef();
  const [gestureHint, setGestureHint] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Motion values for transformations
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const rotate = useMotionValue(0);

  // Shake detection state
  const lastShake = useRef(0);
  const shakeThreshold = 20;

  // Double tap detection
  const lastTap = useRef(0);
  const doubleTapDelay = 300;

  // Long press detection
  const pressTimer = useRef();
  const longPressDuration = 800;

  // Use-gesture configuration
  const bind = useGesture(
    {
      // Drag gesture (aiming/panning)
      onDrag: ({ movement: [mx, my], velocity: [vx, vy], direction: [dx, dy], tap, cancel }) => {
        if (tap) return; // Ignore single taps in drag

        x.set(mx * sensitivity);
        y.set(my * sensitivity);

        if (onDrag) {
          onDrag({
            x: mx * sensitivity,
            y: my * sensitivity,
            velocityX: vx,
            velocityY: vy,
            directionX: dx,
            directionY: dy
          });
        }

        setGestureHint({ type: 'drag', icon: Move });

        // Reset hint after gesture ends
        setTimeout(() => setGestureHint(null), 500);
      },

      // Pinch gesture (zoom)
      onPinch: ({ offset: [d, a], velocity: [vd, va], memo }) => {
        const zoomFactor = 1 + (d - 1) * sensitivity * 0.5;
        scale.set(Math.max(0.5, Math.min(2, zoomFactor)));

        if (onPinch) {
          onPinch({
            distance: d,
            angle: a,
            scale: zoomFactor,
            velocity: vd
          });
        }

        setGestureHint({ type: 'pinch', icon: d > 1 ? ZoomIn : ZoomOut });

        return memo;
      },

      // Wheel gesture (alternative zoom)
      onWheel: ({ delta: [, dy] }) => {
        const currentScale = scale.get();
        const newScale = Math.max(0.5, Math.min(2, currentScale - dy * 0.001 * sensitivity));
        scale.set(newScale);

        if (onPinch) {
          onPinch({
            scale: newScale,
            delta: dy
          });
        }
      },

      // Move gesture (for rotation on desktop)
      onMove: ({ movement: [mx, my], hovering }) => {
        if (!hovering) return;

        const rotationAmount = mx * 0.1 * sensitivity;
        rotate.set(rotationAmount);

        if (onRotate && Math.abs(mx) > 50) {
          onRotate({
            angle: rotationAmount,
            movementX: mx,
            movementY: my
          });
        }
      }
    },
    {
      drag: {
        filterTaps: true,
        threshold: 10
      },
      pinch: {
        scaleBounds: { min: 0.5, max: 2 },
        rubberband: true
      }
    }
  );

  // Touch event handlers for custom gestures
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let touches = [];

    const handleTouchStart = (e) => {
      const now = Date.now();
      touchStartTime = now;
      touches = Array.from(e.touches);

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };

        // Double tap detection
        if (now - lastTap.current < doubleTapDelay) {
          if (onDoubleTap) {
            onDoubleTap({ position: touchStartPos });

            // Visual feedback
            setGestureHint({ type: 'doubleTap', icon: Repeat });
            setTimeout(() => setGestureHint(null), 500);

            gsap.fromTo(
              container,
              { scale: 1 },
              { scale: 1.05, duration: 0.1, yoyo: true, repeat: 1 }
            );
          }
          lastTap.current = 0;
        } else {
          lastTap.current = now;
        }

        // Long press detection
        pressTimer.current = setTimeout(() => {
          if (onLongPress) {
            onLongPress({ position: touchStartPos });

            // Haptic feedback (if available)
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }

            setGestureHint({ type: 'longPress', icon: Hand });
            setTimeout(() => setGestureHint(null), 800);
          }
        }, longPressDuration);
      }
    };

    const handleTouchMove = (e) => {
      // Cancel long press if finger moves
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Swipe detection
        if (distance > 100) {
          const angle = Math.atan2(dy, dx);
          const direction =
            Math.abs(angle) < Math.PI / 4 ? 'right' :
            Math.abs(angle) > (3 * Math.PI) / 4 ? 'left' :
            angle > 0 ? 'down' : 'up';

          if (onSwipe) {
            onSwipe({ direction, distance, angle });

            setGestureHint({ type: 'swipe', direction });
            setTimeout(() => setGestureHint(null), 500);
          }

          // Reset to prevent multiple swipe triggers
          touchStartPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchEnd = () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
      }
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipe, onDoubleTap, onLongPress]);

  // Device motion for shake detection
  useEffect(() => {
    const handleDeviceMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;

      const magnitude = Math.sqrt(
        acc.x * acc.x + acc.y * acc.y + acc.z * acc.z
      );

      const now = Date.now();
      if (magnitude > shakeThreshold && now - lastShake.current > 1000) {
        lastShake.current = now;

        if (onShake) {
          onShake({ magnitude });

          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
          }

          setGestureHint({ type: 'shake', icon: RotateCcw });
          setTimeout(() => setGestureHint(null), 800);

          // Visual shake feedback
          gsap.fromTo(
            containerRef.current,
            { x: -5 },
            { x: 5, duration: 0.05, yoyo: true, repeat: 3 }
          );
        }
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [onShake]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'r':
        case 'R':
          if (onShake) onShake({ source: 'keyboard' });
          break;
        case ' ':
          if (onDoubleTap) onDoubleTap({ source: 'keyboard' });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onShake, onDoubleTap]);

  return (
    <motion.div
      ref={containerRef}
      {...bind()}
      className="relative w-full h-full touch-none select-none"
      style={{
        x,
        y,
        scale,
        rotate,
        cursor: 'crosshair'
      }}
    >
      {children}

      {/* Gesture Hint Overlay */}
      <AnimatePresence>
        {gestureHint && (
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-black/80 backdrop-blur-lg rounded-full p-6">
              {gestureHint.icon ? (
                <gestureHint.icon className="w-12 h-12 text-white" />
              ) : (
                <div className="text-4xl">
                  {gestureHint.direction === 'up' && '⬆️'}
                  {gestureHint.direction === 'down' && '⬇️'}
                  {gestureHint.direction === 'left' && '⬅️'}
                  {gestureHint.direction === 'right' && '➡️'}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Button */}
      <button
        onClick={() => setShowTutorial(true)}
        className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-all z-40"
      >
        <Hand className="w-5 h-5" />
      </button>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTutorial(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-2xl w-full"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-black text-white mb-6 text-center">Gesture Controls</h2>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Move, title: 'Drag', desc: 'Move cursor / Aim' },
                  { icon: ZoomIn, title: 'Pinch', desc: 'Zoom in/out' },
                  { icon: RotateCcw, title: 'Rotate', desc: 'Rotate view (2 fingers)' },
                  { icon: Repeat, title: 'Double Tap', desc: 'Quick reload' },
                  { icon: Hand, title: 'Long Press', desc: 'Special ability' },
                  { icon: RotateCcw, title: 'Shake', desc: 'Emergency reload' },
                  { icon: Maximize2, title: 'Swipe Left', desc: 'Previous weapon' },
                  { icon: Maximize2, title: 'Swipe Right', desc: 'Next weapon' }
                ].map((gesture, i) => {
                  const Icon = gesture.icon;
                  return (
                    <motion.div
                      key={i}
                      className="bg-gray-700/50 rounded-xl p-4 text-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Icon className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <div className="font-bold text-white mb-1">{gesture.title}</div>
                      <div className="text-xs text-gray-400">{gesture.desc}</div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold transition-all"
                >
                  Got It!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Gesture feedback hook for external components
export const useGestureFeedback = () => {
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, duration = 1000) => {
    setFeedback(type);
    setTimeout(() => setFeedback(null), duration);
  };

  return { feedback, showFeedback };
};

export default GestureControls;
