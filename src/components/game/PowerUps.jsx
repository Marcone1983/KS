import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, MeshDistortMaterial, Sphere, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Clock, Flame, Snowflake, Heart, Bomb, Star, Wind, Droplet, Sparkles, Target, Skull } from 'lucide-react';

const PowerUp3D = ({ position, type, onCollect, scale = 1, rarity = 'common' }) => {
  const meshRef = useRef();
  const glowRef = useRef();
  const orbitRef = useRef();

  const powerupConfig = {
    speed: { color: new THREE.Color(0x00ffff), emissive: new THREE.Color(0x00ccff), icon: '⚡', particles: 8 },
    damage: { color: new THREE.Color(0xff4444), emissive: new THREE.Color(0xff0000), icon: '💥', particles: 12 },
    shield: { color: new THREE.Color(0x4444ff), emissive: new THREE.Color(0x0000ff), icon: '🛡️', particles: 10 },
    nuke: { color: new THREE.Color(0xff00ff), emissive: new THREE.Color(0xff00aa), icon: '💣', particles: 20 },
    health: { color: new THREE.Color(0x44ff44), emissive: new THREE.Color(0x00ff00), icon: '❤️', particles: 8 },
    slow: { color: new THREE.Color(0x88ccff), emissive: new THREE.Color(0x4488ff), icon: '🧊', particles: 12 },
    area_damage: { color: new THREE.Color(0xff8800), emissive: new THREE.Color(0xff4400), icon: '🌪️', particles: 15 },
    defense: { color: new THREE.Color(0x9966ff), emissive: new THREE.Color(0x6600ff), icon: '💎', particles: 10 },
    rage: { color: new THREE.Color(0xff0000), emissive: new THREE.Color(0xcc0000), icon: '😡', particles: 18 },
    pierce: { color: new THREE.Color(0xffff00), emissive: new THREE.Color(0xffaa00), icon: '🎯', particles: 12 },
    freeze: { color: new THREE.Color(0x00ccff), emissive: new THREE.Color(0x0088ff), icon: '❄️', particles: 16 },
    multishot: { color: new THREE.Color(0xff66ff), emissive: new THREE.Color(0xff00ff), icon: '✨', particles: 14 },
    lifesteal: { color: new THREE.Color(0xff6666), emissive: new THREE.Color(0xff0000), icon: '🩸', particles: 10 }
  };

  const config = powerupConfig[type] || powerupConfig.speed;
  const rarityScale = rarity === 'legendary' ? 1.3 : rarity === 'rare' ? 1.15 : 1.0;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.03;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.15;
      
      if (rarity === 'legendary') {
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
      }
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.3);
    }
    if (orbitRef.current && rarity !== 'common') {
      orbitRef.current.rotation.y = state.clock.elapsedTime * (rarity === 'legendary' ? 2 : 1.5);
    }
  });

  return (
    <group position={position}>
      <Trail
        width={rarity === 'legendary' ? 1.5 : 0.8}
        length={rarity === 'legendary' ? 20 : 10}
        color={config.color}
        attenuation={(t) => t * t}
      >
        <mesh ref={meshRef} scale={scale * rarityScale} onClick={onCollect}>
          <icosahedronGeometry args={[0.35, 2]} />
          <MeshDistortMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={rarity === 'legendary' ? 1.2 : 0.7}
            distort={0.5}
            speed={rarity === 'legendary' ? 3 : 2}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      </Trail>
      
      <mesh ref={glowRef} scale={scale * rarityScale * 1.6}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.25} side={THREE.BackSide} />
      </mesh>

      {rarity !== 'common' && (
        <group ref={orbitRef}>
          {Array.from({ length: rarity === 'legendary' ? 8 : 4 }).map((_, i) => {
            const angle = (i / (rarity === 'legendary' ? 8 : 4)) * Math.PI * 2;
            const radius = 0.6;
            return (
              <mesh key={i} position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]} scale={0.08}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color={config.color} />
              </mesh>
            );
          })}
        </group>
      )}

      {Array.from({ length: config.particles }).map((_, i) => {
        const angle = (i / config.particles) * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.2;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, Math.random() * 0.3 - 0.15, Math.sin(angle) * radius]} scale={0.06}>
            <sphereGeometry args={[0.05, 6, 6]} />
            <meshBasicMaterial color={config.color} transparent opacity={0.6} />
          </mesh>
        );
      })}
      
      <Text position={[0, 0.7, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
        {config.icon}
      </Text>

      {rarity === 'legendary' && (
        <pointLight position={[0, 0, 0]} intensity={2} distance={3} color={config.color} />
      )}
    </group>
  );
};

const ActivePowerUpHUD = ({ activePowerUps = [] }) => {
  const powerupDetails = {
    speed: { name: 'Speed Boost', icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-400' },
    damage: { name: 'Damage Boost', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-400' },
    shield: { name: 'Shield', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/20', border: 'border-blue-400' },
    nuke: { name: 'Nuke', icon: Bomb, color: 'text-pink-500', bg: 'bg-pink-500/20', border: 'border-pink-400' },
    health: { name: 'Health', icon: Heart, color: 'text-green-500', bg: 'bg-green-500/20', border: 'border-green-400' },
    slow: { name: 'Slow Field', icon: Wind, color: 'text-sky-400', bg: 'bg-sky-500/20', border: 'border-sky-400' },
    area_damage: { name: 'Area Damage', icon: Sparkles, color: 'text-orange-500', bg: 'bg-orange-500/20', border: 'border-orange-400' },
    defense: { name: 'Defense', icon: Shield, color: 'text-purple-500', bg: 'bg-purple-500/20', border: 'border-purple-400' },
    rage: { name: 'Rage Mode', icon: Skull, color: 'text-red-600', bg: 'bg-red-600/20', border: 'border-red-500' },
    pierce: { name: 'Pierce', icon: Target, color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400' },
    freeze: { name: 'Freeze', icon: Snowflake, color: 'text-cyan-300', bg: 'bg-cyan-400/20', border: 'border-cyan-300' },
    multishot: { name: 'Multi-Shot', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400' },
    lifesteal: { name: 'Life Steal', icon: Droplet, color: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400' }
  };

  return (
    <div className="fixed top-32 right-6 z-40 space-y-2 pointer-events-none">
      <AnimatePresence>
        {activePowerUps.map((powerup, index) => {
          const details = powerupDetails[powerup.type] || powerupDetails.speed;
          const Icon = details.icon;
          const timeRemaining = Math.max(0, powerup.duration - (Date.now() - powerup.startTime) / 1000);
          const progress = (timeRemaining / powerup.duration) * 100;

          return (
            <motion.div
              key={`${powerup.id}-${index}`}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`${details.bg} backdrop-blur-md rounded-xl p-4 min-w-[200px] border-2 ${details.border} shadow-2xl`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${details.bg} border ${details.border}`}>
                  <Icon className={`w-6 h-6 ${details.color}`} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-bold ${details.color}`}>{details.name}</div>
                  <div className="text-xs text-gray-300 font-mono">{Math.ceil(timeRemaining)}s remaining</div>
                </div>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  className={`h-full ${details.color.replace('text-', 'bg-')}`} 
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

const PowerUpSystem = ({ powerUps = [], onCollect }) => {
  const containerRef = useRef();

  return (
    <group ref={containerRef}>
      {powerUps.map((powerup, index) => (
        <PowerUp3D
          key={powerup.id || index}
          position={[powerup.position.x, powerup.position.y, powerup.position.z]}
          type={powerup.type}
          rarity={powerup.rarity}
          scale={powerup.scale || 1}
          onCollect={() => onCollect && onCollect(powerup)}
        />
      ))}
    </group>
  );
};

export const usePowerUpSpawner = (currentWave, onSpawn, gameContext = {}) => {
  useEffect(() => {
    if (!currentWave || currentWave < 1) return;

    const { 
      plantHealth = 100, 
      pestCount = 0, 
      score = 0,
      recentDamage = 0,
      difficulty = 1 
    } = gameContext;

    let baseInterval = 15000;
    let spawnChanceMultiplier = 1.0;

    if (plantHealth < 30) {
      baseInterval *= 0.5;
      spawnChanceMultiplier *= 2.0;
    } else if (plantHealth < 60) {
      baseInterval *= 0.7;
      spawnChanceMultiplier *= 1.3;
    }

    if (pestCount > 15) {
      baseInterval *= 0.6;
      spawnChanceMultiplier *= 1.5;
    }

    if (recentDamage > 20) {
      baseInterval *= 0.4;
      spawnChanceMultiplier *= 1.8;
    }

    const waveMultiplier = Math.max(0.3, 1 - (currentWave * 0.04));
    const finalInterval = Math.max(baseInterval * waveMultiplier, 4000);
    
    const interval = setInterval(() => {
      if (Math.random() > 0.25 / spawnChanceMultiplier) return;

      let powerupTypes = Object.keys(POWERUP_EFFECTS);
      let rarity = 'common';
      
      if (plantHealth < 35) {
        powerupTypes = ['health', 'defense', 'shield', 'lifesteal'];
        rarity = 'rare';
      } else if (pestCount > 20) {
        powerupTypes = ['nuke', 'freeze', 'area_damage', 'slow', 'multishot'];
        rarity = Math.random() > 0.6 ? 'rare' : 'common';
      } else if (currentWave > 5) {
        const roll = Math.random();
        if (roll > 0.85) {
          powerupTypes = ['rage', 'multishot', 'pierce', 'lifesteal', 'nuke'];
          rarity = 'legendary';
        } else if (roll > 0.6) {
          powerupTypes = ['freeze', 'area_damage', 'slow', 'defense'];
          rarity = 'rare';
        }
      }
      
      const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
      
      const angle = Math.random() * Math.PI * 2;
      const distance = 2.5 + Math.random() * 5;
      
      const powerup = {
        id: `powerup_${Date.now()}_${Math.random()}`,
        type: randomType,
        position: {
          x: Math.cos(angle) * distance,
          y: 0.5,
          z: Math.sin(angle) * distance
        },
        spawnTime: Date.now(),
        rarity
      };
      
      onSpawn(powerup);
    }, finalInterval);
    
    return () => clearInterval(interval);
  }, [currentWave, onSpawn, JSON.stringify(gameContext)]);
};

export const POWERUP_EFFECTS = {
  speed: { name: 'Speed Boost', duration: 10, color: '#00ffff', icon: '⚡' },
  damage: { name: 'Damage Boost', duration: 15, color: '#ff4444', icon: '💥' },
  shield: { name: 'Shield', duration: 20, color: '#4444ff', icon: '🛡️' },
  nuke: { name: 'Nuke', duration: 0, color: '#ff00ff', icon: '💣' },
  health: { name: 'Health', duration: 0, color: '#44ff44', icon: '❤️' },
  slow: { name: 'Slow Enemies', duration: 12, color: '#88ccff', icon: '🧊' },
  area_damage: { name: 'Area Damage', duration: 15, color: '#ff8800', icon: '🌪️' },
  defense: { name: 'Temporary Defense', duration: 18, color: '#9966ff', icon: '💎' },
  rage: { name: 'Rage Mode', duration: 8, color: '#ff0000', icon: '😡' },
  pierce: { name: 'Piercing Shots', duration: 12, color: '#ffff00', icon: '🎯' },
  freeze: { name: 'Freeze Blast', duration: 0, color: '#00ccff', icon: '❄️' },
  multishot: { name: 'Multi-Shot', duration: 10, color: '#ff66ff', icon: '✨' },
  lifesteal: { name: 'Life Steal', duration: 15, color: '#ff6666', icon: '🩸' }
};

export { PowerUp3D, ActivePowerUpHUD, PowerUpSystem };
export default PowerUpSystem;