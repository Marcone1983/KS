import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  PerspectiveCamera, 
  Sky,
  Cloud,
  Stars,
  ContactShadows,
  Sparkles
} from '@react-three/drei';
import PostProcessingEffects, { PostProcessingPresets } from './PostProcessingEffects';
import * as THREE from 'three';
import CannabisPlantR3F_AAA from './CannabisPlantR3F_AAA';
import SprayBottleR3F from './SprayBottleR3F';
import ProceduralTerrain from './ProceduralTerrain';
import SprayParticles from './SprayParticles';
import RainSystem from './RainSystem';
import Pests3D from './Pests3D';
import PowerUpSystem from './PowerUps';

function CameraController({ onPestKilled, activePests }) {
  const { camera } = useThree();
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isSpraying, setIsSpraying] = useState(false);
  const sprayParticlesRef = useRef();
  const sprayBottleRef = useRef();

  useEffect(() => {
    camera.position.set(0, 1.4, 2.2);
    camera.rotation.order = 'YXZ';

    const handleMouseMove = (e) => {
      const sensitivity = 0.002;
      setMouseX(prev => THREE.MathUtils.clamp(prev - e.movementX * sensitivity, -0.3, 0.3));
      setMouseY(prev => THREE.MathUtils.clamp(prev - e.movementY * sensitivity, -0.3, 0.3));
    };

    const handlePointerDown = () => setIsSpraying(true);
    const handlePointerUp = () => setIsSpraying(false);
    const handleKeyDown = (e) => {
      if (e.code === 'Space') setIsSpraying(true);
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') setIsSpraying(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera]);

  useFrame(() => {
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, mouseX, 0.1);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, mouseY, 0.1);

    if (isSpraying && sprayParticlesRef.current && sprayBottleRef.current) {
      sprayParticlesRef.current.emit(camera);
      sprayBottleRef.current.triggerAnimation(true);

      const sprayOrigin = new THREE.Vector3(0.6, 1.15, 1.5);
      sprayOrigin.applyQuaternion(camera.quaternion);
      sprayOrigin.add(camera.position);
      
      const sprayDirection = new THREE.Vector3(0, 0, -1);
      sprayDirection.applyQuaternion(camera.quaternion);

      const raycaster = new THREE.Raycaster(sprayOrigin, sprayDirection, 0, 4);

      activePests.forEach((pest) => {
        if (pest.health <= 0 || pest.underground) return;
        
        const pestPos = new THREE.Vector3(pest.position.x, pest.position.y, pest.position.z);
        const distance = sprayOrigin.distanceTo(pestPos);
        
        let hitRadius = 0.3;
        let damage = 35;
        
        if (pest.behavior === 'flying') {
          hitRadius = 0.4;
        } else if (pest.behavior === 'fast') {
          hitRadius = 0.25;
          damage = 40;
        } else if (pest.behavior === 'resistant') {
          damage = 20;
        } else if (pest.behavior === 'camouflaged') {
          hitRadius = 0.2;
          damage = 45;
        }
        
        if (distance < 4) {
          const toPest = pestPos.clone().sub(sprayOrigin).normalize();
          const angle = sprayDirection.angleTo(toPest);
          
          if (angle < hitRadius && distance < 3.5) {
            if (onPestKilled) {
              onPestKilled(pest.id, damage);
            }
          }
        }
      });
    } else if (sprayBottleRef.current) {
      sprayBottleRef.current.triggerAnimation(false);
    }
  });

  return (
    <>
      <SprayParticles ref={sprayParticlesRef} />
      <SprayBottleR3F ref={sprayBottleRef} camera={camera} />
    </>
  );
}

function GameLighting({ dayNightHour = 12, currentWeather = 'clear' }) {
  const sunRef = useRef();
  
  const { sunColor, sunIntensity, ambientIntensity, skyParams, timeOfDay } = useMemo(() => {
    const isDawn = dayNightHour >= 5 && dayNightHour < 7;
    const isDay = dayNightHour >= 7 && dayNightHour < 17;
    const isDusk = dayNightHour >= 17 && dayNightHour < 19;
    const isNight = dayNightHour < 5 || dayNightHour >= 19;
    
    const timeOfDay = (dayNightHour >= 6 && dayNightHour < 17)
      ? 'day'
      : (dayNightHour >= 17 && dayNightHour < 20)
        ? 'sunset'
        : 'night';

    if (isDawn) {
      return {
        sunColor: '#ff9966',
        sunIntensity: 1.2,
        ambientIntensity: 0.4,
        skyParams: { turbidity: 8, rayleigh: 2, mieCoefficient: 0.005, mieDirectionalG: 0.8, elevation: 2, azimuth: 180 },
        timeOfDay
      };
    } else if (isDay) {
      return {
        sunColor: '#fffacd',
        sunIntensity: currentWeather === 'rain' ? 0.8 : currentWeather === 'fog' ? 0.6 : 2.0,
        ambientIntensity: currentWeather === 'rain' ? 0.5 : 0.7,
        skyParams: { turbidity: 10, rayleigh: 3, mieCoefficient: 0.005, mieDirectionalG: 0.7, elevation: 30, azimuth: 180 },
        timeOfDay
      };
    } else if (isDusk) {
      return {
        sunColor: '#ff7733',
        sunIntensity: 1.0,
        ambientIntensity: 0.35,
        skyParams: { turbidity: 10, rayleigh: 2, mieCoefficient: 0.005, mieDirectionalG: 0.82, elevation: -2, azimuth: 180 },
        timeOfDay
      };
    } else {
      return {
        sunColor: '#6a6aaa',
        sunIntensity: 0.3,
        ambientIntensity: 0.15,
        skyParams: { turbidity: 2, rayleigh: 1, mieCoefficient: 0.005, mieDirectionalG: 0.8, elevation: -30, azimuth: 180 },
        timeOfDay
      };
    }
  }, [dayNightHour, currentWeather]);

  useFrame((state) => {
    if (sunRef.current) {
      const time = state.clock.elapsedTime;
      sunRef.current.position.x = 10 + Math.sin(time * 0.1) * 2;
      sunRef.current.position.z = 5 + Math.cos(time * 0.1) * 2;
    }
  });

  const isNight = dayNightHour < 5 || dayNightHour >= 19;

  return (
    <>
      <Sky {...skyParams} />
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      <ambientLight intensity={ambientIntensity} color="#ffffff" />
      <hemisphereLight args={['#87ceeb', '#2d5016', 0.4]} />
      
      <directionalLight
        ref={sunRef}
        position={[10, 15, 5]}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0005}
        shadow-radius={3}
      />
      
      <directionalLight position={[-8, 8, -8]} intensity={0.3} color="#ffffff" />
      <directionalLight position={[8, 8, -8]} intensity={0.3} color="#ffffff" />
      
      <pointLight position={[0, 5, 0]} intensity={0.5} distance={10} decay={2} color="#ffe8c0" />
      
      <fog attach="fog" args={[currentWeather === 'fog' ? '#b0b0b0' : '#87ceeb', 8, currentWeather === 'fog' ? 15 : 30]} />
    </>
  );
}

export default function AAA_GameScene3D({
  activePests = [], 
  plantHealth = 100,
  plantGrowthStage = 0.8,
  currentWeather = 'clear',
  dayNightHour = 12,
  windStrength = 0.2,
  rainIntensity = 0,
  spawnedPowerUps = [],
  onPestKilled,
  onPowerUpCollect,
  postFxPreset = 'realistic'
}) {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 1.4, 2.2]} fov={75} near={0.01} far={100} />
        
        <GameLighting dayNightHour={dayNightHour} currentWeather={currentWeather} />
        
        {(function() {
          const lightingData = useMemo(() => {
            const isDawn = dayNightHour >= 5 && dayNightHour < 7;
            const isDay = dayNightHour >= 7 && dayNightHour < 17;
            const isDusk = dayNightHour >= 17 && dayNightHour < 19;
            return (dayNightHour >= 6 && dayNightHour < 17) ? 'day' : (dayNightHour >= 17 && dayNightHour < 20) ? 'sunset' : 'night';
          }, [dayNightHour]);
          return null;
        })()}
        
        <ProceduralTerrain windStrength={windStrength} />
        
        <CannabisPlantR3F_AAA
          position={[0, 0.47, -1.5]}
          health={plantHealth}
          pestCount={activePests.length}
          windStrength={windStrength}
          growthStage={plantGrowthStage}
          trichomeMaturity={0.6}
          genetics={{}}
        />
        
        <Pests3D pests={activePests} onPestHit={onPestKilled} />
        
        {spawnedPowerUps && spawnedPowerUps.length > 0 && (
          <PowerUpSystem
            powerUps={spawnedPowerUps}
            onCollect={onPowerUpCollect}
          />
        )}
        
        {rainIntensity > 0 && <RainSystem intensity={rainIntensity} windStrength={windStrength} />}
        
        {currentWeather === 'fog' && (
          <>
            <Cloud opacity={0.3} speed={0.2} width={15} depth={1.5} segments={20} position={[0, 3, -10]} />
            <Cloud opacity={0.25} speed={0.3} width={12} depth={1.5} segments={20} position={[5, 4, -8]} />
            <Cloud opacity={0.28} speed={0.25} width={14} depth={1.5} segments={20} position={[-5, 3.5, -9]} />
          </>
        )}
        
        <Sparkles count={150} scale={15} size={2} speed={0.3} opacity={0.4} color="#ffffff" />
        
        <ContactShadows 
          position={[0, 0, 0]} 
          opacity={0.5} 
          scale={20} 
          blur={2} 
          far={8} 
          resolution={512}
          color="#000000"
        />
        
        <CameraController onPestKilled={onPestKilled} activePests={activePests} />
        
        {/* KS-style post FX: cleaner + quality presets (mobile-friendly) */}
          <PostProcessingEffects
            {...(PostProcessingPresets[postFxPreset] || PostProcessingPresets.realistic)}
            timeOfDay={timeOfDay}
            focusTarget={[0, 1, 0]}
          />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-black/75 text-white p-2 rounded text-xs font-mono backdrop-blur-sm pointer-events-none">
        <div className="font-bold text-green-400">AAA Graphics</div>
        <div>R3F + Postprocessing</div>
        <div>Time: {Math.floor(dayNightHour)}:00</div>
        <div>Weather: {currentWeather}</div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-black/75 text-white p-2 rounded text-xs backdrop-blur-sm pointer-events-none">
        <div className="font-bold text-green-400">Controls</div>
        <div>MOUSE — Look Around</div>
        <div>CLICK/SPACE — Spray</div>
      </div>
    </div>
  );
}