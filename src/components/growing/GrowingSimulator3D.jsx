import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import CannabisPlantAAA from '../game/CannabisPlantAAA';
import { Droplets, Sun, Wind, Thermometer, Heart, Leaf, Calendar, Clock, Play, Pause, FastForward, RotateCcw } from 'lucide-react';

// Growth stage definitions
const GROWTH_STAGES = [
  {
    name: 'Seed',
    stage: 0,
    duration: 3, // days
    description: 'Germination phase',
    requirements: { water: 80, light: 50, temp: 22 }
  },
  {
    name: 'Seedling',
    stage: 0.15,
    duration: 7,
    description: 'First leaves emerging',
    requirements: { water: 70, light: 60, temp: 24 }
  },
  {
    name: 'Vegetative Early',
    stage: 0.35,
    duration: 14,
    description: 'Rapid leaf growth',
    requirements: { water: 60, light: 80, temp: 26 }
  },
  {
    name: 'Vegetative',
    stage: 0.55,
    duration: 21,
    description: 'Building structure',
    requirements: { water: 65, light: 85, temp: 27 }
  },
  {
    name: 'Pre-Flowering',
    stage: 0.7,
    duration: 7,
    description: 'Transition to flowering',
    requirements: { water: 70, light: 70, temp: 25 }
  },
  {
    name: 'Flowering Early',
    stage: 0.8,
    duration: 14,
    description: 'Bud formation',
    requirements: { water: 60, light: 75, temp: 24 }
  },
  {
    name: 'Flowering',
    stage: 0.9,
    duration: 21,
    description: 'Bud development',
    requirements: { water: 55, light: 70, temp: 23 }
  },
  {
    name: 'Late Flowering',
    stage: 1.0,
    duration: 14,
    description: 'Final maturation',
    requirements: { water: 50, light: 65, temp: 22 }
  }
];

// Environmental controls panel
const EnvironmentPanel = ({ environment, onUpdate, autoMode }) => {
  const controls = [
    { key: 'water', label: 'Water', icon: Droplets, unit: '%', color: 'text-blue-400', max: 100 },
    { key: 'light', label: 'Light', icon: Sun, unit: '%', color: 'text-yellow-400', max: 100 },
    { key: 'temperature', label: 'Temp', icon: Thermometer, unit: '°C', color: 'text-red-400', max: 40 },
    { key: 'humidity', label: 'Humidity', icon: Wind, unit: '%', color: 'text-cyan-400', max: 100 }
  ];

  return (
    <div className="space-y-4">
      {controls.map((control) => {
        const Icon = control.icon;
        const value = environment[control.key] || 0;

        return (
          <div key={control.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${control.color}`} />
                <span className="text-sm text-gray-300">{control.label}</span>
              </div>
              <span className={`text-sm font-bold ${control.color}`}>
                {value.toFixed(0)}{control.unit}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={control.max}
              value={value}
              onChange={(e) => !autoMode && onUpdate(control.key, parseFloat(e.target.value))}
              disabled={autoMode}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: autoMode ? '#374151' : `linear-gradient(to right, ${
                  control.key === 'water' ? '#3b82f6' :
                  control.key === 'light' ? '#fbbf24' :
                  control.key === 'temperature' ? '#ef4444' :
                  '#06b6d4'
                } 0%, ${
                  control.key === 'water' ? '#3b82f6' :
                  control.key === 'light' ? '#fbbf24' :
                  control.key === 'temperature' ? '#ef4444' :
                  '#06b6d4'
                } ${(value / control.max) * 100}%, #374151 ${(value / control.max) * 100}%, #374151 100%)`
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

// Plant health indicator
const HealthIndicator = ({ health, stress, growthRate }) => {
  const getHealthColor = (h) => {
    if (h >= 80) return 'from-green-600 to-green-400';
    if (h >= 60) return 'from-yellow-600 to-yellow-400';
    if (h >= 40) return 'from-orange-600 to-orange-400';
    return 'from-red-600 to-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Health Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-300">Health</span>
          </div>
          <span className="text-sm font-bold text-white">{health.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${getHealthColor(health)}`}
            initial={{ width: 0 }}
            animate={{ width: `${health}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Stress Level */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/>
            </svg>
            <span className="text-sm text-gray-300">Stress</span>
          </div>
          <span className="text-sm font-bold text-orange-400">{stress.toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-600 to-red-600"
            animate={{ width: `${stress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Growth Rate */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-300">Growth Rate</span>
          </div>
          <span className="text-sm font-bold text-green-400">{growthRate.toFixed(1)}x</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-600 to-green-400"
            animate={{ width: `${Math.min(growthRate * 50, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

// Main Growing Simulator Component
const GrowingSimulator3D = ({
  genetics = {
    strain_name: 'Hybrid',
    growth_speed: 5,
    color: 0x2d5016
  },
  onHarvest
}) => {
  const [growthStage, setGrowthStage] = useState(0);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [daysPassed, setDaysPassed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x
  const [autoEnvironment, setAutoEnvironment] = useState(true);

  const [environment, setEnvironment] = useState({
    water: 70,
    light: 60,
    temperature: 24,
    humidity: 55
  });

  const [plantHealth, setPlantHealth] = useState(100);
  const [plantStress, setPlantStress] = useState(0);
  const [growthRate, setGrowthRate] = useState(1.0);
  const [maturationStage, setMaturationStage] = useState(0);

  const timerRef = useRef();

  // Growth simulation loop
  useEffect(() => {
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      setDaysPassed((prev) => {
        const newDays = prev + (0.1 * speed); // 0.1 days per tick

        // Calculate growth progress
        const currentStage = GROWTH_STAGES[currentStageIdx];
        if (!currentStage) return prev;

        const daysInStage = newDays - (GROWTH_STAGES.slice(0, currentStageIdx).reduce((sum, s) => sum + s.duration, 0));

        if (daysInStage >= currentStage.duration && currentStageIdx < GROWTH_STAGES.length - 1) {
          setCurrentStageIdx((idx) => idx + 1);
        }

        // Update growth stage (0-1)
        const totalDays = GROWTH_STAGES.reduce((sum, s) => sum + s.duration, 0);
        const newGrowthStage = Math.min(newDays / totalDays, 1);
        setGrowthStage(newGrowthStage);

        // Maturation (for trichomes)
        if (newGrowthStage > 0.7) {
          setMaturationStage((newGrowthStage - 0.7) / 0.3);
        }

        return newDays;
      });
    }, 1000 / speed); // Faster ticks at higher speeds

    return () => clearInterval(timerRef.current);
  }, [isPlaying, speed, currentStageIdx]);

  // Auto environment adjustment
  useEffect(() => {
    if (!autoEnvironment) return;

    const currentStage = GROWTH_STAGES[currentStageIdx];
    if (!currentStage) return;

    // Smoothly adjust environment to optimal levels
    const adjust = (current, target, rate = 0.1) => {
      return current + (target - current) * rate;
    };

    const interval = setInterval(() => {
      setEnvironment((env) => ({
        water: adjust(env.water, currentStage.requirements.water, 0.05),
        light: adjust(env.light, currentStage.requirements.light, 0.05),
        temperature: adjust(env.temperature, currentStage.requirements.temp, 0.03),
        humidity: adjust(env.humidity, 55, 0.05)
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [autoEnvironment, currentStageIdx]);

  // Calculate plant health and stress
  useEffect(() => {
    const currentStage = GROWTH_STAGES[currentStageIdx];
    if (!currentStage) return;

    const req = currentStage.requirements;

    // Calculate stress from environmental factors
    const waterStress = Math.abs(environment.water - req.water) / 100;
    const lightStress = Math.abs(environment.light - req.light) / 100;
    const tempStress = Math.abs(environment.temperature - req.temp) / 40;

    const totalStress = ((waterStress + lightStress + tempStress) / 3) * 100;
    setPlantStress(totalStress);

    // Health degrades with high stress
    const healthChange = -totalStress * 0.05;
    setPlantHealth((h) => Math.max(0, Math.min(100, h + healthChange * 0.1)));

    // Growth rate affected by conditions
    const optimalness = 1 - (totalStress / 100);
    setGrowthRate(optimalness * (genetics.growth_speed / 5));
  }, [environment, currentStageIdx, genetics]);

  const reset = () => {
    setGrowthStage(0);
    setCurrentStageIdx(0);
    setDaysPassed(0);
    setPlantHealth(100);
    setPlantStress(0);
    setMaturationStage(0);
    setIsPlaying(false);
  };

  const currentStage = GROWTH_STAGES[currentStageIdx];

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-green-900/10 to-gray-900 grid grid-cols-4 gap-6 p-6">
      {/* Left Panel - Environment Controls */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Environment</h2>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Auto Optimize</span>
            <button
              onClick={() => setAutoEnvironment(!autoEnvironment)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoEnvironment ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  autoEnvironment ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <EnvironmentPanel
            environment={environment}
            onUpdate={(key, value) => setEnvironment({ ...environment, [key]: value })}
            autoMode={autoEnvironment}
          />
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-white mb-4">Plant Status</h3>
          <HealthIndicator health={plantHealth} stress={plantStress} growthRate={growthRate} />
        </div>
      </div>

      {/* Center - 3D Plant Viewer */}
      <div className="col-span-2 bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden relative">
        <Canvas shadows camera={{ position: [2, 1.5, 2], fov: 50 }}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[2, 1.5, 2]} />

            {/* Lighting setup */}
            <ambientLight intensity={environment.light / 150} />
            <directionalLight
              position={[5, 8, 5]}
              intensity={environment.light / 100}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <pointLight position={[-5, 3, -5]} intensity={0.3} />

            {/* Environment */}
            <Sky
              distance={450000}
              sunPosition={[100, 20, 100]}
              inclination={0}
              azimuth={0.25}
            />

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[10, 10]} />
              <meshStandardMaterial color={0x2a1810} roughness={0.9} />
            </mesh>

            <ContactShadows
              position={[0, 0, 0]}
              opacity={0.5}
              scale={5}
              blur={2}
              far={5}
            />

            {/* The Plant */}
            <CannabisPlantAAA
              position={[0, 0, 0]}
              scale={1}
              growthStage={growthStage}
              health={plantHealth}
              pestInfestation={plantStress * 0.3}
              genetics={genetics}
              maturationStage={maturationStage}
            />

            {/* Interactive camera controls */}
            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 2.2}
              minDistance={1}
              maxDistance={5}
              target={[0, growthStage * 0.8, 0]}
            />

            {/* HDRI Environment */}
            <Environment preset="sunset" background={false} />
          </Suspense>
        </Canvas>

        {/* Stage Info Overlay */}
        <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-sm px-4 py-3 rounded-xl">
          <div className="text-xs text-gray-400 mb-1">Growth Stage</div>
          <div className="text-2xl font-bold text-white">{currentStage?.name}</div>
          <div className="text-xs text-gray-400 mt-1">{currentStage?.description}</div>
        </div>

        {/* Day Counter */}
        <div className="absolute top-6 right-6 bg-black/70 backdrop-blur-sm px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-xs text-gray-400">Day</div>
              <div className="text-xl font-bold text-white">{daysPassed.toFixed(1)}</div>
            </div>
          </div>
        </div>

        {/* Completion Banner */}
        {growthStage >= 1.0 && (
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="text-8xl mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ times: [0, 0.6, 1], duration: 0.8 }}
              >
                🌿
              </motion.div>
              <div className="text-4xl font-black text-white mb-4">Ready to Harvest!</div>
              <div className="text-lg text-gray-400 mb-8">
                Your {genetics.strain_name} has reached full maturity
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => onHarvest && onHarvest({ growthStage, health: plantHealth, days: daysPassed })}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl text-white font-bold text-lg transition-all"
                >
                  Harvest Plant
                </button>
                <button
                  onClick={reset}
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-bold text-lg transition-all"
                >
                  Grow Again
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right Panel - Timeline & Controls */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-6">
        {/* Playback Controls */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Controls</h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                isPlaying
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 inline mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 inline mr-2" />
                  Grow
                </>
              )}
            </button>

            <button
              onClick={reset}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Control */}
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <FastForward className="w-4 h-4" />
              Speed: {speed}x
            </div>
            <div className="flex gap-2">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                    speed === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Growth Timeline */}
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-white mb-4">Growth Timeline</h3>

          <div className="space-y-3">
            {GROWTH_STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const percentage = isCurrent
                ? ((daysPassed - GROWTH_STAGES.slice(0, idx).reduce((sum, s) => sum + s.duration, 0)) / stage.duration) * 100
                : isPast
                  ? 100
                  : 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-green-500 bg-green-900/20'
                      : isPast
                        ? 'border-blue-500 bg-blue-900/10'
                        : 'border-gray-700 bg-gray-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-sm font-bold ${
                      isCurrent ? 'text-green-400' : isPast ? 'text-blue-400' : 'text-gray-500'
                    }`}>
                      {stage.name}
                    </div>
                    <div className="text-xs text-gray-500">{stage.duration}d</div>
                  </div>

                  {isCurrent && (
                    <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-600 to-green-400"
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrowingSimulator3D;
