import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';

export function useAdvancedGestureControls({ 
  onSpray, 
  onAim, 
  onReload,
  sensitivity = 1.0 
}) {
  const { camera, gl } = useThree();
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);

  const bind = useGesture({
    // Drag per aiming (mouse o touch)
    onDrag: ({ delta: [dx, dy], first, last, tap, elapsedTime }) => {
      if (tap && elapsedTime < 200) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          if (onReload) onReload();
        }
        lastTapRef.current = now;
        return;
      }

      const rotationSpeed = 0.003 * sensitivity;
      rotationRef.current.y -= dx * rotationSpeed;
      rotationRef.current.x -= dy * rotationSpeed;
      
      rotationRef.current.x = THREE.MathUtils.clamp(rotationRef.current.x, -Math.PI / 6, Math.PI / 6);
      rotationRef.current.y = THREE.MathUtils.clamp(rotationRef.current.y, -Math.PI / 4, Math.PI / 4);

      if (onAim) {
        onAim(rotationRef.current);
      }
    },

    // Pinch per zoom
    onPinch: ({ offset: [scale], first, last }) => {
      if (first || last) return;
      camera.fov = THREE.MathUtils.clamp(75 / scale, 50, 90);
      camera.updateProjectionMatrix();
    },

    // Click/Tap per spray
    onClick: ({ event, tap }) => {
      if (tap && onSpray) {
        onSpray();
      }
    },

    // Wheel per zoom
    onWheel: ({ delta: [, dy] }) => {
      camera.fov = THREE.MathUtils.clamp(camera.fov + dy * 0.05, 50, 90);
      camera.updateProjectionMatrix();
    }
  }, {
    target: gl.domElement,
    drag: { 
      pointer: { touch: true },
      filterTaps: true,
      threshold: 5
    },
    pinch: { 
      scaleBounds: { min: 0.5, max: 2 },
      rubberband: true
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const events = bind();
    
    Object.entries(events).forEach(([event, handler]) => {
      canvas.addEventListener(event.replace('on', '').toLowerCase(), handler);
    });

    return () => {
      Object.entries(events).forEach(([event, handler]) => {
        canvas.removeEventListener(event.replace('on', '').toLowerCase(), handler);
      });
    };
  }, [bind, gl.domElement]);

  return rotationRef;
}

// Keyboard shortcuts advanced
export function useKeyboardControls({ 
  onSpray, 
  onReload, 
  onPause,
  onNextWeapon,
  onPrevWeapon,
  onUseAbility
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.code) {
        case 'Space':
        case 'KeyE':
        case 'MouseLeft':
          if (onSpray) onSpray();
          break;
        case 'KeyR':
          if (onReload) onReload();
          break;
        case 'Escape':
        case 'KeyP':
          if (onPause) onPause();
          break;
        case 'KeyQ':
          if (onPrevWeapon) onPrevWeapon();
          break;
        case 'KeyF':
          if (onNextWeapon) onNextWeapon();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          if (onUseAbility) {
            const abilityIndex = parseInt(e.code.replace('Digit', '')) - 1;
            onUseAbility(abilityIndex);
          }
          break;
      }
    };

    const handleKeyUp = (e) => {
      // Handle key release if needed
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSpray, onReload, onPause, onNextWeapon, onPrevWeapon, onUseAbility]);
}

// Gamepad support
export function useGamepadControls({ onSpray, onAim, onReload }) {
  useEffect(() => {
    let animationFrame;
    
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0];
      
      if (gamepad) {
        const rightStickX = gamepad.axes[2];
        const rightStickY = gamepad.axes[3];
        
        if (Math.abs(rightStickX) > 0.1 || Math.abs(rightStickY) > 0.1) {
          if (onAim) {
            onAim({
              y: -rightStickX * 0.05,
              x: -rightStickY * 0.05
            });
          }
        }
        
        if (gamepad.buttons[7]?.pressed || gamepad.buttons[0]?.pressed) {
          if (onSpray) onSpray();
        }
        
        if (gamepad.buttons[1]?.pressed) {
          if (onReload) onReload();
        }
      }
      
      animationFrame = requestAnimationFrame(pollGamepad);
    };
    
    pollGamepad();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [onSpray, onAim, onReload]);
}