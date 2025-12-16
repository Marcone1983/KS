import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { useGesture } from '@use-gesture/react';
import * as THREE from 'three';
import { toast } from 'sonner';

export function useAdvancedGestureControls({
  onSpray,
  onAim,
  onReload,
  onPause,
  onSpecialAbility,
  sensitivity = 1.0,
  enableHaptics = true
}) {
  const { camera, gl } = useThree();
  const rotationRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const tapCountRef = useRef(0);
  const touchStartRef = useRef(null);
  const hapticSupportRef = useRef(false);

  useEffect(() => {
    if ('vibrate' in navigator) {
      hapticSupportRef.current = true;
    }
  }, []);

  const triggerHaptic = useCallback((pattern) => {
    if (enableHaptics && hapticSupportRef.current) {
      navigator.vibrate(pattern);
    }
  }, [enableHaptics]);

  const bind = useGesture({
    onDrag: ({ delta: [dx, dy], tap, elapsedTime, distance, velocity: [vx, vy] }) => {
      if (tap && elapsedTime < 200) {
        const now = Date.now();
        
        if (now - lastTapRef.current < 300) {
          tapCountRef.current++;
          
          if (tapCountRef.current === 2) {
            if (onReload) {
              onReload();
              triggerHaptic([50, 30, 50]);
            }
            tapCountRef.current = 0;
          } else if (tapCountRef.current === 3) {
            if (onSpecialAbility) {
              onSpecialAbility();
              triggerHaptic([100, 50, 100, 50, 100]);
            }
            tapCountRef.current = 0;
          }
        } else {
          tapCountRef.current = 1;
        }
        
        lastTapRef.current = now;
        return;
      }

      if (distance > 10) {
        const rotationSpeed = 0.003 * sensitivity;
        velocityRef.current.x = vx;
        velocityRef.current.y = vy;
        
        rotationRef.current.y -= dx * rotationSpeed;
        rotationRef.current.x -= dy * rotationSpeed;
        
        rotationRef.current.x = THREE.MathUtils.clamp(rotationRef.current.x, -Math.PI / 4, Math.PI / 4);
        rotationRef.current.y = THREE.MathUtils.clamp(rotationRef.current.y, -Math.PI / 3, Math.PI / 3);

        if (onAim) {
          onAim(rotationRef.current);
        }
      }
    },

    onPinch: ({ offset: [scale], first, last, distance, memo }) => {
      if (first) return distance;
      
      const delta = distance - memo;
      camera.fov = THREE.MathUtils.clamp(camera.fov - delta * 0.05, 45, 90);
      camera.updateProjectionMatrix();
      
      return distance;
    },

    onClick: ({ event, tap }) => {
      if (tap && onSpray) {
        onSpray();
        triggerHaptic(30);
      }
    },

    onWheel: ({ delta: [, dy] }) => {
      camera.fov = THREE.MathUtils.clamp(camera.fov + dy * 0.05, 45, 90);
      camera.updateProjectionMatrix();
    },

    onMove: ({ xy: [x, y], first, last }) => {
      if (first) {
        touchStartRef.current = { x, y, time: Date.now() };
      }
    }
  }, {
    target: gl.domElement,
    drag: {
      pointer: { touch: true },
      filterTaps: true,
      threshold: 5,
      rubberband: true
    },
    pinch: {
      scaleBounds: { min: 0.5, max: 2 },
      rubberband: true
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const handlers = bind();
    
    return () => {};
  }, [bind, gl.domElement]);

  useFrame(() => {
    velocityRef.current.x *= 0.95;
    velocityRef.current.y *= 0.95;
  });

  return { rotation: rotationRef, velocity: velocityRef };
}

export function useKeyboardControls({
  onSpray,
  onReload,
  onPause,
  onNextWeapon,
  onPrevWeapon,
  onUseAbility,
  onToggleAim
}) {
  const keysPressed = useRef(new Set());

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (keysPressed.current.has(e.code)) return;
      keysPressed.current.add(e.code);

      switch(e.code) {
        case 'Space':
        case 'KeyE':
        case 'Mouse0':
          e.preventDefault();
          if (onSpray) onSpray();
          break;
        case 'KeyR':
          e.preventDefault();
          if (onReload) onReload();
          break;
        case 'Escape':
        case 'KeyP':
          e.preventDefault();
          if (onPause) onPause();
          break;
        case 'KeyQ':
          e.preventDefault();
          if (onPrevWeapon) onPrevWeapon();
          break;
        case 'KeyF':
          e.preventDefault();
          if (onNextWeapon) onNextWeapon();
          break;
        case 'ShiftRight':
        case 'ShiftLeft':
          e.preventDefault();
          if (onToggleAim) onToggleAim(true);
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          e.preventDefault();
          if (onUseAbility) {
            const abilityIndex = parseInt(e.code.replace('Digit', '')) - 1;
            onUseAbility(abilityIndex);
          }
          break;
        case 'KeyC':
          e.preventDefault();
          if (onUseAbility) onUseAbility('crouch');
          break;
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.code);
      
      if ((e.code === 'ShiftRight' || e.code === 'ShiftLeft') && onToggleAim) {
        onToggleAim(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSpray, onReload, onPause, onNextWeapon, onPrevWeapon, onUseAbility, onToggleAim]);

  return keysPressed;
}

export function useGamepadControls({
  onSpray,
  onAim,
  onReload,
  onPause,
  onAbility
}) {
  const gamepadStateRef = useRef({
    connected: false,
    index: -1,
    lastButtons: []
  });

  useEffect(() => {
    const handleGamepadConnected = (e) => {
      gamepadStateRef.current.connected = true;
      gamepadStateRef.current.index = e.gamepad.index;
      toast.success(`🎮 Gamepad connected: ${e.gamepad.id}`);
    };

    const handleGamepadDisconnected = (e) => {
      gamepadStateRef.current.connected = false;
      gamepadStateRef.current.index = -1;
      toast.info('🎮 Gamepad disconnected');
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, []);

  useFrame(() => {
    if (!gamepadStateRef.current.connected) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[gamepadStateRef.current.index];

    if (!gamepad) return;

    const rightStickX = gamepad.axes[2];
    const rightStickY = gamepad.axes[3];

    if (Math.abs(rightStickX) > 0.15 || Math.abs(rightStickY) > 0.15) {
      if (onAim) {
        onAim({
          y: -rightStickX * 0.04,
          x: -rightStickY * 0.04
        });
      }
    }

    const buttonMappings = [
      { index: 0, action: onSpray, name: 'A' },
      { index: 1, action: onReload, name: 'B' },
      { index: 7, action: onSpray, name: 'RT' },
      { index: 6, action: onAim, name: 'LT' },
      { index: 9, action: onPause, name: 'Start' },
      { index: 2, action: () => onAbility && onAbility(0), name: 'X' },
      { index: 3, action: () => onAbility && onAbility(1), name: 'Y' }
    ];

    buttonMappings.forEach(({ index, action }) => {
      const button = gamepad.buttons[index];
      const wasPressed = gamepadStateRef.current.lastButtons[index];
      
      if (button && button.pressed && !wasPressed && action) {
        action();
        if ('vibrationActuator' in gamepad) {
          gamepad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: 50,
            weakMagnitude: 0.3,
            strongMagnitude: 0.5
          });
        }
      }
    });

    gamepadStateRef.current.lastButtons = gamepad.buttons.map(b => b.pressed);
  });

  return gamepadStateRef;
}

export function useMotionControls({ onShake, onTilt }) {
  useEffect(() => {
    if (!window.DeviceMotionEvent || !window.DeviceOrientationEvent) {
      return;
    }

    let lastShakeTime = 0;
    const shakeThreshold = 20;

    const handleMotion = (e) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const totalAcc = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
      
      if (totalAcc > shakeThreshold) {
        const now = Date.now();
        if (now - lastShakeTime > 1000) {
          lastShakeTime = now;
          if (onShake) onShake();
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      }
    };

    const handleOrientation = (e) => {
      if (onTilt) {
        onTilt({
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma
        });
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [onShake, onTilt]);
}

export default {
  useAdvancedGestureControls,
  useKeyboardControls,
  useGamepadControls,
  useMotionControls
};