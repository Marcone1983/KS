import React, { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  useProgress,
  Html
} from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';

// Import custom AAA components
import CannabisPlant3D from './CannabisPlant3D';
import SprayBottle3D from './SprayBottle3D';
import Pests3D from './Pests3D';
import Environment3D from './Environment3D';
import PostProcessingEffects, { PostProcessingPresets } from './PostProcessingEffects';
import CustomShaders, { createShaderMaterial } from './CustomShaders';
import FreneticGameplay from './FreneticGameplay';
import WaveSystem from './WaveSystem';
import PowerUps, { POWERUP_EFFECTS } from './PowerUps';
import GestureControls from '../controls/GestureControls';

// Loading screen component
const LoadingScreen = () => {
  const { progress } = useProgress();

  return (
    <Html center>
      <div style={{
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px 40px',
        borderRadius: '10px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        textAlign: 'center'
      }}>
        <h2>Loading AAA Graphics...</h2>
        <div style={{
          width: '200px',
          height: '20px',
          background: '#333',
          borderRadius: '10px',
          overflow: 'hidden',
          marginTop: '10px'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4a7028, #2d5016)',
            transition: 'width 0.3s'
          }} />
        </div>
        <p style={{ marginTop: '10px', fontSize: '14px' }}>
          {Math.round(progress)}%
        </p>
      </div>
    </Html>
  );
};

// Player controller for first-person spray view
const PlayerController = ({ onSpray, sprayActive }) => {
  const controlsRef = useRef();
  const [playerPosition, setPlayerPosition] = useState([0, 1.6, 3]);

  useFrame((state) => {
    // Camera shake when spraying
    if (sprayActive && controlsRef.current) {
      const shake = Math.sin(state.clock.elapsedTime * 30) * 0.002;
      state.camera.position.x += shake;
      state.camera.position.y += shake;
    }
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={playerPosition}
        fov={75}
        near={0.1}
        far={1000}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={15}
        target={[0, 0.5, 0]}
      />
    </>
  );
};

// Main game scene component
const GameScene = ({
  gameLevel = 1,
  plantHealth = 100,
  plantGrowthStage = 0.5,
  pestInfestation = 0,
  onPestKilled,
  onPlantDamaged
}) => {
  const [sprayActive, setSprayActive] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [weatherEffect, setWeatherEffect] = useState('clear');
  const [qualityPreset, setQualityPreset] = useState('high');

  // Wave system state
  const [currentWave, setCurrentWave] = useState(1);
  const [waveState, setWaveState] = useState('preparing');
  const [wavePestsRemaining, setWavePestsRemaining] = useState(0);

  // Frenetic gameplay state
  const freneticApiRef = useRef();
  const [activePowerUps, setActivePowerUps] = useState([]);
  const [powerUpEffects, setPowerUpEffects] = useState({});

  // Score tracking
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  // Generate pest positions around plants
  const pestData = useMemo(() => {
    if (pestInfestation === 0) return [];

    const pests = [];
    const pestCount = Math.floor((pestInfestation / 100) * 50);
    const pestTypes = ['aphid', 'spiderMite', 'caterpillar', 'whitefly', 'thrips'];

    for (let i = 0; i < pestCount; i++) {
      const angle = (i / pestCount) * Math.PI * 2;
      const radius = 0.2 + Math.random() * 0.3;
      const height = 0.2 + Math.random() * 0.8;

      pests.push({
        type: pestTypes[Math.floor(Math.random() * pestTypes.length)],
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        ],
        scale: 1.0 + Math.random() * 0.5
      });
    }

    return pests;
  }, [pestInfestation]);

  // Handle spray action
  const handleSpray = () => {
    setSprayActive(true);
    setTimeout(() => setSprayActive(false), 500);

    // Check for pest hits
    if (pestData.length > 0) {
      const baseKillCount = Math.floor(Math.random() * 3) + 1;
      const powerUpMultiplier = powerUpEffects.rapid_fire ? 3 : 1;
      const finalKillCount = baseKillCount * powerUpMultiplier;

      // Register kill with frenetic gameplay system
      if (freneticApiRef.current) {
        for (let i = 0; i < finalKillCount; i++) {
          const randomX = 50 + (Math.random() - 0.5) * 20;
          const randomY = 50 + (Math.random() - 0.5) * 20;
          freneticApiRef.current.registerKill({ x: randomX, y: randomY }, false);
        }
      }

      setScore(s => s + (finalKillCount * 10));
      setWavePestsRemaining(p => Math.max(0, p - finalKillCount));

      if (onPestKilled) {
        onPestKilled(finalKillCount);
      }
    }
  };

  // Handle power-up collection
  const handlePowerUpCollect = (powerUpType) => {
    const effect = POWERUP_EFFECTS[powerUpType];
    if (!effect) return;

    setPowerUpEffects(prev => ({ ...prev, [powerUpType]: true }));

    if (effect.duration > 0) {
      setTimeout(() => {
        setPowerUpEffects(prev => {
          const newEffects = { ...prev };
          delete newEffects[powerUpType];
          return newEffects;
        });
      }, effect.duration * 1000);
    } else {
      // Instant effects (like nuke)
      if (powerUpType === 'nuke') {
        setWavePestsRemaining(0);
        setScore(s => s + 500);
        if (freneticApiRef.current) {
          freneticApiRef.current.registerKill({ x: 50, y: 50 }, true);
        }
      }
      setTimeout(() => {
        setPowerUpEffects(prev => {
          const newEffects = { ...prev };
          delete newEffects[powerUpType];
          return newEffects;
        });
      }, 100);
    }
  };

  // Wave progression
  useEffect(() => {
    if (waveState === 'active' && wavePestsRemaining <= 0) {
      setWaveState('completed');
      setTimeout(() => {
        setCurrentWave(w => w + 1);
        setWaveState('preparing');
      }, 3000);
    }
  }, [waveState, wavePestsRemaining]);

  // Start wave
  const handleWaveStart = (wave) => {
    const pestsForWave = 10 + (wave * 5);
    setWavePestsRemaining(pestsForWave);
    setWaveState('active');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'e') {
        handleSpray();
      }
      if (e.key === 't') {
        setTimeOfDay(prev => {
          if (prev === 'day') return 'sunset';
          if (prev === 'sunset') return 'night';
          return 'day';
        });
      }
      if (e.key === 'w') {
        setWeatherEffect(prev => {
          if (prev === 'clear') return 'cloudy';
          if (prev === 'cloudy') return 'foggy';
          return 'clear';
        });
      }
      if (e.key === 'q') {
        setQualityPreset(prev => {
          const presets = ['low', 'medium', 'high', 'ultra'];
          const idx = presets.indexOf(prev);
          return presets[(idx + 1) % presets.length];
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pestData]);

  return (
    <>
      {/* Player Controls */}
      <PlayerController onSpray={handleSpray} sprayActive={sprayActive} />

      {/* Physics World */}
      <Physics gravity={[0, -9.81, 0]}>
        {/* Ground plane collider */}
        <RigidBody type="fixed" colliders="cuboid">
          <mesh position={[0, -0.5, 0]} visible={false}>
            <boxGeometry args={[100, 1, 100]} />
          </mesh>
        </RigidBody>

        {/* Cannabis Plants - Multiple plants based on level */}
        {Array.from({ length: Math.min(gameLevel, 5) }).map((_, idx) => {
          const angle = (idx / Math.min(gameLevel, 5)) * Math.PI * 2;
          const radius = idx === 0 ? 0 : 1.5;

          return (
            <RigidBody key={`plant-${idx}`} type="fixed">
              <CannabisPlant3D
                position={[
                  Math.cos(angle) * radius,
                  0,
                  Math.sin(angle) * radius
                ]}
                scale={idx === 0 ? 1.2 : 1.0}
                growthStage={plantGrowthStage}
                health={plantHealth}
                pestInfestation={pestInfestation}
              />
            </RigidBody>
          );
        })}

        {/* Spray Bottle in hand (FPV position) */}
        <SprayBottle3D
          position={[0.4, -0.3, -0.5]}
          rotation={[0, -0.5, 0]}
          scale={0.8}
          isSpraying={sprayActive}
          sprayColor={powerUpEffects.fire_spray ? 0xff4500 : 0x4a90e2}
          onSprayComplete={() => setSprayActive(false)}
        />

        {/* Pests */}
        <Pests3D pestData={pestData} />
      </Physics>

      {/* Environment (terrain, trees, grass, sky) */}
      <Environment3D
        timeOfDay={timeOfDay}
        weatherEffect={weatherEffect}
        showBackgroundTrees={true}
        showGrass={qualityPreset !== 'low'}
        showParticles={qualityPreset === 'high' || qualityPreset === 'ultra'}
      />

      {/* Post-Processing Effects */}
      <PostProcessingEffects
        {...PostProcessingPresets.cinematic}
        qualityPreset={qualityPreset}
        timeOfDay={timeOfDay}
      />
    </>
  );
};

// Main Canvas Wrapper Component
const AAA_GameScene3D = (props) => {
  const [gameState, setGameState] = useState({
    score: 0,
    wave: 1,
    combo: 0,
    streak: 0
  });

  return (
    <div style={{ width: '100%', height: '100vh', background: '#000' }}>
      {/* Wrap entire game in Gesture Controls */}
      <GestureControls
        onSwipe={({ direction }) => {
          console.log('Swipe:', direction);
        }}
        onPinch={({ scale }) => {
          console.log('Pinch zoom:', scale);
        }}
        onDoubleTap={() => {
          console.log('Double tap: Quick reload');
        }}
        onLongPress={() => {
          console.log('Long press: Special ability');
        }}
        onShake={() => {
          console.log('Shake: Emergency reload');
        }}
      >
        <Canvas
          shadows
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
          }}
          dpr={[1, 2]}
        >
          <Suspense fallback={<LoadingScreen />}>
            <GameScene {...props} />
          </Suspense>
        </Canvas>

        {/* Frenetic Gameplay Overlay */}
        <FreneticGameplay
          onComboUpdate={({ combo, multiplier }) => {
            setGameState(prev => ({ ...prev, combo, multiplier }));
          }}
          onStreakUpdate={(streak) => {
            setGameState(prev => ({ ...prev, streak }));
          }}
          timeLimit={props.timeLimit || 180}
        >
          {(api) => {
            // Expose API for game scene to call registerKill
            if (api) window.freneticGameplayApi = api;
            return null;
          }}
        </FreneticGameplay>

        {/* Wave System Overlay */}
        <WaveSystem
          currentWave={gameState.wave}
          waveState="active"
          onWaveStart={(wave) => {
            console.log('Wave started:', wave);
            setGameState(prev => ({ ...prev, wave }));
          }}
        />

        {/* Power-Ups System */}
        <PowerUps
          spawnPowerUps={true}
          onPowerUpCollect={(type) => {
            console.log('Power-up collected:', type);
          }}
        />

        {/* UI Overlay */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontFamily: 'monospace',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          <div><strong>🎮 CONTROLS</strong></div>
          <div style={{ marginTop: '10px' }}>
            <div>🖱️ Mouse: Look Around</div>
            <div>SPACE / E: Spray</div>
            <div>T: Change Time of Day</div>
            <div>W: Change Weather</div>
            <div>Q: Toggle Quality</div>
          </div>
          <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.3)', paddingTop: '10px' }}>
            <div>🌿 Plant Health: {props.plantHealth}%</div>
            <div>📈 Growth: {Math.round(props.plantGrowthStage * 100)}%</div>
            <div>🐛 Pests: {props.pestInfestation}%</div>
            <div>🎯 Level: {props.gameLevel}</div>
            <div>💯 Score: {gameState.score}</div>
            <div>🔥 Combo: {gameState.combo}x</div>
          </div>
        </div>

        {/* Performance Stats */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: '#4a7028',
          fontFamily: 'monospace',
          fontSize: '12px',
          background: 'rgba(0, 0, 0, 0.6)',
          padding: '10px',
          borderRadius: '5px'
        }}>
          <div>AAA Graphics Enabled ✓</div>
          <div>Frenetic Gameplay Active ✓</div>
          <div>Wave {gameState.wave}</div>
        </div>
      </GestureControls>
    </div>
  );
};

export default AAA_GameScene3D;
