import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { Zap, Shield, Clock, Flame, Snowflake, Heart, Bomb, Star } from 'lucide-react';

// 3D Powerup floating in game world
const PowerUp3D = ({ position, type, onCollect, scale = 1 }) => {
  const meshRef = useRef();
  const glowRef = useRef();

  const powerupConfig = {
    rapid_fire: {
      color: new THREE.Color(0xff6b35),
      emissive: new THREE.Color(0xff4500),
      icon: '⚡'
    },
    shield: {
      color: new THREE.Color(0x4a90e2),
      emissive: new THREE.Color(0x2563eb),
      icon: '🛡️'
    },
    slow_time: {
      color: new THREE.Color(0x9b59b6),
      emissive: new THREE.Color(0x8b00ff),
      icon: '⏰'
    },
    nuke: {
      color: new THREE.Color(0xe74c3c),
      emissive: new THREE.Color(0xff0000),
      icon: '💣'
    },
    freeze: {
      color: new THREE.Color(0x3498db),
      emissive: new THREE.Color(0x00bfff),
      icon: '❄️'
    },
    health: {
      color: new THREE.Color(0x2ecc71),
      emissive: new THREE.Color(0x00ff00),
      icon: '❤️'
    },
    triple_shot: {
      color: new THREE.Color(0xf39c12),
      emissive: new THREE.Color(0xffa500),
      icon: '⚡'
    },
    invincibility: {
      color: new THREE.Color(0xffd700),
      emissive: new THREE.Color(0xffff00),
      icon: '⭐'
    }
  };

  const config = powerupConfig[type] || powerupConfig.rapid_fire;

  // Floating and rotation animation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }

    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
    }
  });

  return (
    <group position={position}>
      {/* Main powerup sphere */}
      <mesh ref={meshRef} scale={scale} onClick={onCollect}>
        <icosahedronGeometry args={[0.3, 1]} />
        <MeshDistortMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={0.5}
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef} scale={scale * 1.5}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial
          color={config.color}
          transparent
          opacity={0.2}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Particle ring */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.5,
              0,
              Math.sin(angle) * 0.5
            ]}
            scale={0.1}
          >
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={config.color} />
          </mesh>
        );
      })}

      {/* 3D Text Label */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {config.icon}
      </Text>
    </group>
  );
};

// UI component to display active powerups
const ActivePowerUpHUD = ({ activePowerUps = [] }) => {
  const powerupDetails = {
    rapid_fire: {
      name: 'Rapid Fire',
      icon: Zap,
      color: 'text-orange-500',
      bg: 'bg-orange-500/20'
    },
    shield: {
      name: 'Shield',
      icon: Shield,
      color: 'text-blue-500',
      bg: 'bg-blue-500/20'
    },
    slow_time: {
      name: 'Slow Time',
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-500/20'
    },
    nuke: {
      name: 'Nuke',
      icon: Bomb,
      color: 'text-red-500',
      bg: 'bg-red-500/20'
    },
    freeze: {
      name: 'Freeze',
      icon: Snowflake,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/20'
    },
    health: {
      name: 'Health',
      icon: Heart,
      color: 'text-green-500',
      bg: 'bg-green-500/20'
    },
    triple_shot: {
      name: 'Triple Shot',
      icon: Flame,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/20'
    },
    invincibility: {
      name: 'Invincible',
      icon: Star,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/20'
    }
  };

  return (
    <div className="fixed top-32 right-6 z-40 space-y-2">
      {activePowerUps.map((powerup, index) => {
        const details = powerupDetails[powerup.type] || powerupDetails.rapid_fire;
        const Icon = details.icon;
        const timeRemaining = Math.max(0, powerup.duration - (Date.now() - powerup.startTime) / 1000);
        const progress = (timeRemaining / powerup.duration) * 100;

        return (
          <div
            key={`${powerup.type}-${index}`}
            className={`${details.bg} backdrop-blur-sm rounded-lg p-3 min-w-[180px] border border-white/20 shadow-lg`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon className={`w-5 h-5 ${details.color}`} />
              <div className="flex-1">
                <div className={`text-sm font-bold ${details.color}`}>
                  {details.name}
                </div>
                <div className="text-xs text-gray-400">
                  {Math.ceil(timeRemaining)}s
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-black/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${details.color.replace('text-', 'bg-')} transition-all duration-100`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// PowerUp Manager Component
const PowerUpSystem = ({
  spawnedPowerUps = [],
  activePowerUps = [],
  onPowerUpCollect,
  playerPosition = [0, 0, 0]
}) => {
  const containerRef = useRef();

  // Check for collision with player
  useFrame(() => {
    spawnedPowerUps.forEach(powerup => {
      const distance = Math.sqrt(
        Math.pow(powerup.position[0] - playerPosition[0], 2) +
        Math.pow(powerup.position[1] - playerPosition[1], 2) +
        Math.pow(powerup.position[2] - playerPosition[2], 2)
      );

      // Collect if close enough
      if (distance < 0.8 && onPowerUpCollect) {
        onPowerUpCollect(powerup);
      }
    });
  });

  return (
    <>
      {/* 3D PowerUps in game world */}
      <group ref={containerRef}>
        {spawnedPowerUps.map((powerup, index) => (
          <PowerUp3D
            key={`powerup-${powerup.id || index}`}
            position={powerup.position}
            type={powerup.type}
            scale={powerup.scale || 1}
            onCollect={() => onPowerUpCollect && onPowerUpCollect(powerup)}
          />
        ))}
      </group>
    </>
  );
};

// PowerUp spawning logic hook
export const usePowerUpSpawner = (waveNumber, onPowerUpSpawn) => {
  const spawnTimerRef = useRef();

  useEffect(() => {
    // Spawn powerups periodically during wave
    const spawnInterval = Math.max(15000 - (waveNumber * 500), 8000); // Faster spawns in later waves

    spawnTimerRef.current = setInterval(() => {
      const powerupTypes = ['rapid_fire', 'shield', 'slow_time', 'freeze', 'health', 'triple_shot'];

      // Rare powerups in later waves
      if (waveNumber >= 5) {
        powerupTypes.push('nuke');
      }
      if (waveNumber >= 8) {
        powerupTypes.push('invincibility');
      }

      const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];

      // Random spawn position around the plant
      const angle = Math.random() * Math.PI * 2;
      const distance = 3 + Math.random() * 2;

      const powerup = {
        id: `powerup-${Date.now()}`,
        type: randomType,
        position: [
          Math.cos(angle) * distance,
          0.5,
          Math.sin(angle) * distance
        ],
        spawnTime: Date.now()
      };

      if (onPowerUpSpawn) {
        onPowerUpSpawn(powerup);
      }
    }, spawnInterval);

    return () => {
      if (spawnTimerRef.current) {
        clearInterval(spawnTimerRef.current);
      }
    };
  }, [waveNumber, onPowerUpSpawn]);
};

// PowerUp effects definitions
export const POWERUP_EFFECTS = {
  rapid_fire: {
    duration: 10,
    apply: (gameState) => ({
      ...gameState,
      spraySpeed: gameState.spraySpeed * 3,
      sprayRefillSpeed: gameState.sprayRefillSpeed * 2
    })
  },
  shield: {
    duration: 15,
    apply: (gameState) => ({
      ...gameState,
      damageReduction: 0.75, // 75% damage reduction
      shieldActive: true
    })
  },
  slow_time: {
    duration: 8,
    apply: (gameState) => ({
      ...gameState,
      pestSpeedMultiplier: 0.3, // Pests move at 30% speed
      timeScale: 0.5
    })
  },
  nuke: {
    duration: 0, // Instant effect
    apply: (gameState) => ({
      ...gameState,
      nukeActivated: true // Triggers instant kill of all pests on screen
    })
  },
  freeze: {
    duration: 5,
    apply: (gameState) => ({
      ...gameState,
      pestsFrozen: true, // All pests frozen in place
      freezeEffect: true
    })
  },
  health: {
    duration: 0, // Instant effect
    apply: (gameState) => ({
      ...gameState,
      plantHealth: Math.min(100, gameState.plantHealth + 50)
    })
  },
  triple_shot: {
    duration: 12,
    apply: (gameState) => ({
      ...gameState,
      projectileCount: 3, // Shoot 3 projectiles at once
      spreadAngle: 15
    })
  },
  invincibility: {
    duration: 8,
    apply: (gameState) => ({
      ...gameState,
      invincible: true,
      damageReduction: 1.0 // 100% damage reduction
    })
  }
};

export { PowerUp3D, ActivePowerUpHUD, PowerUpSystem };
export default PowerUpSystem;
