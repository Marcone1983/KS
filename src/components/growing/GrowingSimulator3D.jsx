import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text, Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import { Droplets, Sun, Wind, Thermometer, Heart, Zap, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import CannabisPlantR3F_AAA from '../game/CannabisPlantR3F_AAA';
import DynamicWeatherSystem, { useWeatherEffects } from '../environment/DynamicWeatherSystem';
import PlantCareAI, { AIInsightPanel } from '../ai/PlantCareAI';

const GrowthTimelineMarker = ({ stage, isActive, position, label }) => {
  const markerRef = useRef();

  useFrame((state) => {
    if (markerRef.current && isActive) {
      markerRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={markerRef}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={isActive ? 0x00ff00 : 0x666666}
          emissive={isActive ? 0x00ff00 : 0x000000}
          emissiveIntensity={isActive ? 0.5 : 0}
        />
      </mesh>
      <Html center distanceFactor={8}>
        <div className={`text-xs font-bold whitespace-nowrap ${isActive ? 'text-green-400' : 'text-gray-500'}`}>
          {label}
        </div>
      </Html>
    </group>
  );
};

const EnvironmentalFactorVisualizer = ({ type, value, position }) => {
  const meshRef = useRef();
  
  const config = {
    water: { color: 0x3498db, icon: '💧', intensity: value / 100 },
    light: { color: 0xffd700, icon: '☀️', intensity: value / 100 },
    nutrients: { color: 0x2ecc71, icon: '🌿', intensity: value / 100 },
    temperature: { color: 0xe74c3c, icon: '🌡️', intensity: value / 100 }
  }[type] || { color: 0xffffff, icon: '?', intensity: 0.5 };

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.color}
          emissiveIntensity={config.intensity}
          transparent
          opacity={0.6 + config.intensity * 0.4}
        />
      </mesh>
      <pointLight color={config.color} intensity={config.intensity * 2} distance={2} />
      <Html center distanceFactor={10}>
        <div className="text-2xl">{config.icon}</div>
      </Html>
    </group>
  );
};

const PlantPot3D = ({ potType = 'basic', wetness = 0 }) => {
  const potColors = {
    basic: 0x8b4513,
    ceramic: 0xd4a574,
    terracotta: 0xc44e3a,
    smart: 0x2c3e50
  };

  const soilColor = new THREE.Color(0x3d2817).lerp(new THREE.Color(0x2a1a0a), 1 - wetness);

  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.4, 0.35, 0.5, 32]} />
        <meshStandardMaterial 
          color={potColors[potType] || potColors.basic}
          roughness={0.75}
          metalness={potType === 'smart' ? 0.3 : 0.05}
        />
      </mesh>
      
      <mesh position={[0, 0.46, 0]} receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 32]} />
        <meshStandardMaterial 
          color={soilColor}
          roughness={0.95 - wetness * 0.3}
          metalness={wetness * 0.1}
        />
      </mesh>

      {potType === 'smart' && (
        <>
          <mesh position={[0.35, 0.25, 0]}>
            <boxGeometry args={[0.05, 0.08, 0.02]} />
            <meshStandardMaterial color={0x00ff00} emissive={0x00ff00} emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0.35, 0.25, 0]} color={0x00ff00} intensity={0.3} distance={0.5} />
        </>
      )}
    </group>
  );
};

export default function GrowingSimulator3D({ 
  progress, 
  onUpdate,
  activeSeed = null
}) {
  const [plantGrowth, setPlantGrowth] = useState((progress?.plant_stats?.growth_level || 1) / 10);
  const [waterLevel, setWaterLevel] = useState(progress?.plant_stats?.water_level || 100);
  const [nutritionLevel, setNutritionLevel] = useState(progress?.plant_stats?.nutrition_level || 100);
  const [lightExposure, setLightExposure] = useState(progress?.plant_stats?.light_exposure || 50);
  const [temperature, setTemperature] = useState(22);
  const [trichomeMaturity, setTrichomeMaturity] = useState(0.3);
  const [autoGrow, setAutoGrow] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentWeather, setCurrentWeather] = useState('clear');
  const [currentSeason, setCurrentSeason] = useState('spring');
  const [activeEvent, setActiveEvent] = useState(null);
  const [weatherEffects, setWeatherEffects] = useState({});
  
  const effects = useWeatherEffects(currentWeather, activeEvent);
  
  useEffect(() => {
    if (progress?.current_season) {
      setCurrentSeason(progress.current_season);
    }
  }, [progress]);

  const plantHealth = Math.min(100, (waterLevel * 0.4) + (nutritionLevel * 0.3) + (lightExposure * 0.3));
  const growthRate = activeSeed?.growth_speed || 1.0;

  const getGrowthStage = () => {
    if (plantGrowth < 0.15) return { name: 'Seedling', emoji: '🌱', color: 'text-green-300' };
    if (plantGrowth < 0.35) return { name: 'Vegetative', emoji: '🌿', color: 'text-green-400' };
    if (plantGrowth < 0.65) return { name: 'Pre-Flowering', emoji: '🌸', color: 'text-yellow-400' };
    if (plantGrowth < 0.85) return { name: 'Flowering', emoji: '🌺', color: 'text-orange-400' };
    return { name: 'Mature', emoji: '👑', color: 'text-purple-400' };
  };

  const getTrichomeStage = () => {
    if (trichomeMaturity < 0.35) return { name: 'Clear', color: 'text-blue-300', ready: false };
    if (trichomeMaturity < 0.75) return { name: 'Cloudy', color: 'text-gray-300', ready: false };
    return { name: 'Amber', color: 'text-amber-400', ready: true };
  };

  const stage = getGrowthStage();
  const trichStage = getTrichomeStage();

  useEffect(() => {
    if (!autoGrow) return;

    const growthInterval = setInterval(() => {
      const optimalWater = waterLevel > 30 && waterLevel < 80;
      const optimalNutrition = nutritionLevel > 40;
      const optimalLight = lightExposure > 50 && lightExposure < 85;
      const optimalTemp = temperature > 18 && temperature < 28;

      const growthModifier = (effects.growthModifier || 1.0) * growthRate;

      if (optimalWater && optimalNutrition && optimalLight && optimalTemp) {
        setPlantGrowth(prev => {
          const newGrowth = Math.min(1.0, prev + (0.008 * growthModifier));
          
          if (onUpdate && progress) {
            onUpdate({
              plant_stats: {
                ...progress.plant_stats,
                growth_level: newGrowth * 10,
                water_level: waterLevel,
                nutrition_level: nutritionLevel,
                light_exposure: lightExposure
              }
            });
          }
          
          return newGrowth;
        });

        if (plantGrowth > 0.65) {
          setTrichomeMaturity(prev => Math.min(1.0, prev + 0.004));
        }
      }

      const waterDrain = (0.3 + (temperature - 20) * 0.05) * Math.max(0, effects.waterModifier || 1.0);
      const nutritionBonus = Math.max(0, effects.nutritionBonus || 0);
      
      setWaterLevel(prev => Math.max(0, prev - waterDrain));
      setNutritionLevel(prev => Math.min(100, Math.max(0, prev - 0.15 + (nutritionBonus / 10))));
      setLightExposure(prev => Math.max(0, prev - 0.08));
      setTemperature(prev => Math.max(10, Math.min(35, prev + (effects.tempModifier || 0) * 0.1)));
      setTimeElapsed(prev => prev + 2);
      
      if (effects.healthDrainRate && plantHealth > 0) {
        const drain = Math.max(0, effects.healthDrainRate);
        if (drain > 0) {
          const newHealth = Math.max(0, plantHealth - drain);
          if (newHealth !== plantHealth) {
            // Only update if actually changing
            setPlantHealth(newHealth);
          }
        }
      }
    }, 2000);

    return () => clearInterval(growthInterval);
  }, [autoGrow, waterLevel, nutritionLevel, lightExposure, temperature, plantGrowth, growthRate, effects]);

  const handleWater = () => {
    const newLevel = Math.min(100, waterLevel + 35);
    setWaterLevel(newLevel);
    
    gsap.fromTo('#water-indicator', 
      { scale: 1, backgroundColor: '#3498db' },
      { scale: 1.2, backgroundColor: '#2ecc71', duration: 0.3, yoyo: true, repeat: 1 }
    );
  };

  const handleFertilize = () => {
    if (!progress || progress.leaf_currency < 15) return;
    
    const newLevel = Math.min(100, nutritionLevel + 45);
    setNutritionLevel(newLevel);
    
    gsap.fromTo('#nutrition-indicator',
      { scale: 1, backgroundColor: '#2ecc71' },
      { scale: 1.2, backgroundColor: '#f39c12', duration: 0.3, yoyo: true, repeat: 1 }
    );
  };

  const handleLightAdjust = (delta) => {
    setLightExposure(prev => Math.max(0, Math.min(100, prev + delta)));
  };

  const handleTempAdjust = (delta) => {
    setTemperature(prev => Math.max(10, Math.min(35, prev + delta)));
  };

  const handleHarvest = () => {
    if (plantGrowth >= 0.85 && trichStage.ready) {
      const harvestYield = Math.floor(plantGrowth * 100 + trichomeMaturity * 50);
      
      gsap.timeline()
        .to('.plant-container', { scale: 1.1, duration: 0.3 })
        .to('.plant-container', { scale: 0, opacity: 0, duration: 0.5 })
        .call(() => {
          setPlantGrowth(0);
          setTrichomeMaturity(0);
          if (onUpdate && progress) {
            onUpdate({
              leaf_currency: progress.leaf_currency + harvestYield,
              plant_stats: {
                ...progress.plant_stats,
                growth_level: 0
              }
            });
          }
        });
    }
  };

  const handleWeatherChange = (weather, pattern) => {
    setCurrentWeather(weather);
    setWeatherEffects(pattern);
  };

  const handleRandomEvent = (event, effects) => {
    setActiveEvent({ ...event, ...effects });
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 p-6 overflow-hidden">
      <DynamicWeatherSystem
        currentSeason={currentSeason}
        onWeatherChange={handleWeatherChange}
        onRandomEvent={handleRandomEvent}
        plantGrowthStage={plantGrowth}
        hasSmartPot={progress?.active_pot === 'smart'}
      />
      
      <PlantCareAI
        plantStats={{
          nutrition_level: nutritionLevel,
          water_level: waterLevel,
          light_exposure: lightExposure,
          plant_health: plantHealth
        }}
        environment={{ temperature, humidity: 55 }}
        currentWeather={currentWeather}
        currentSeason={currentSeason}
        pestCount={0}
        activePests={[]}
        growthStage={plantGrowth}
        position="bottom-right"
      />
      
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl font-black text-white mb-2 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 text-green-400" />
            Growing Simulator 3D
          </h1>
          <p className="text-xl text-emerald-200">Watch your plant grow in real-time with AAA graphics</p>
        </motion.div>

        <div className="flex-1 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-green-500/50 h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className={`text-3xl ${stage.color}`}>{stage.emoji}</div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stage.name}</div>
                    <div className="text-sm text-gray-400">Growth: {Math.round(plantGrowth * 100)}%</div>
                  </div>
                </div>
                
                <button
                  onClick={() => setAutoGrow(!autoGrow)}
                  className={`px-6 py-3 rounded-xl font-bold transition-all ${
                    autoGrow 
                      ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {autoGrow ? '⏸️ Pause Auto-Grow' : '▶️ Start Auto-Grow'}
                </button>
              </div>

              <div className="flex-1 relative plant-container">
                <Canvas shadows dpr={[1, 2]}>
                  <Suspense fallback={null}>
                    <PerspectiveCamera makeDefault position={[0, 1.8, 3.5]} fov={60} />
                    <OrbitControls
                      autoRotate={autoGrow}
                      autoRotateSpeed={0.8}
                      minDistance={2}
                      maxDistance={7}
                      maxPolarAngle={Math.PI / 2}
                      enablePan={false}
                    />

                    <ambientLight intensity={0.3 + (lightExposure / 100) * 0.3} />
                    <directionalLight
                      position={[8, 12, 6]}
                      intensity={0.8 + (lightExposure / 100) * 1}
                      castShadow
                      shadow-mapSize-width={4096}
                      shadow-mapSize-height={4096}
                      shadow-camera-far={30}
                      shadow-camera-left={-10}
                      shadow-camera-right={10}
                      shadow-camera-top={10}
                      shadow-camera-bottom={-10}
                    />
                    <spotLight position={[0, 10, 0]} angle={0.5} penumbra={1} intensity={0.6} castShadow />
                    <pointLight position={[3, 2, 3]} color={0xffd700} intensity={lightExposure / 100} />

                    <PlantPot3D potType={progress?.active_pot || 'basic'} wetness={waterLevel / 100} />

                    <CannabisPlantR3F_AAA
                      position={[0, 0.5, 0]}
                      health={plantHealth}
                      pestCount={0}
                      windStrength={0.15}
                      growthStage={plantGrowth}
                      trichomeMaturity={trichomeMaturity}
                      genetics={activeSeed?.genetics || {}}
                    />

                    <EnvironmentalFactorVisualizer type="water" value={waterLevel} position={[-1.5, 1, -1]} />
                    <EnvironmentalFactorVisualizer type="light" value={lightExposure} position={[1.5, 2, -1]} />
                    <EnvironmentalFactorVisualizer type="nutrients" value={nutritionLevel} position={[-1.5, 1.5, 1]} />
                    <EnvironmentalFactorVisualizer type="temperature" value={(temperature / 35) * 100} position={[1.5, 1, 1]} />

                    <GrowthTimelineMarker stage="seedling" isActive={plantGrowth < 0.15} position={[-2, 0, -2]} label="Seedling" />
                    <GrowthTimelineMarker stage="vegetative" isActive={plantGrowth >= 0.15 && plantGrowth < 0.35} position={[-2, 0.5, -1]} label="Vegetative" />
                    <GrowthTimelineMarker stage="preflower" isActive={plantGrowth >= 0.35 && plantGrowth < 0.65} position={[-2, 1, 0]} label="Pre-Flower" />
                    <GrowthTimelineMarker stage="flowering" isActive={plantGrowth >= 0.65 && plantGrowth < 0.85} position={[-2, 1.5, 1]} label="Flowering" />
                    <GrowthTimelineMarker stage="mature" isActive={plantGrowth >= 0.85} position={[-2, 2, 2]} label="Mature" />

                    <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={6} blur={3} far={4} />
                    <Environment preset="sunset" />
                  </Suspense>
                </Canvas>

                {plantGrowth >= 0.85 && trichStage.ready && (
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
                    <motion.button
                      onClick={handleHarvest}
                      className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-2xl text-white font-black text-xl shadow-2xl"
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      🌿 HARVEST READY! 🌿
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                { stage: 'Seedling', threshold: 0.15 },
                { stage: 'Vegetative', threshold: 0.35 },
                { stage: 'Pre-Flower', threshold: 0.65 },
                { stage: 'Flowering', threshold: 0.85 },
                { stage: 'Mature', threshold: 1.0 }
              ].map((s, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg text-center transition-all ${
                    plantGrowth >= (i > 0 ? [0, 0.15, 0.35, 0.65, 0.85][i] : 0)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <div className="text-xs font-bold">{s.stage}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-cyan-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                  <span className="text-white font-bold">Water</span>
                </div>
                <span className="text-2xl font-bold text-white">{Math.round(waterLevel)}%</span>
              </div>
              <div id="water-indicator" className="h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${waterLevel}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <button
                onClick={handleWater}
                className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white font-bold transition-all"
              >
                💧 Water Plant (+35%)
              </button>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-yellow-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Nutrients</span>
                </div>
                <span className="text-2xl font-bold text-white">{Math.round(nutritionLevel)}%</span>
              </div>
              <div id="nutrition-indicator" className="h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                  animate={{ width: `${nutritionLevel}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <button
                onClick={handleFertilize}
                disabled={!progress || progress.leaf_currency < 15}
                className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-bold transition-all"
              >
                🌿 Fertilize (15 Leaf)
              </button>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-orange-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-orange-400" />
                  <span className="text-white font-bold">Light</span>
                </div>
                <span className="text-2xl font-bold text-white">{Math.round(lightExposure)}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                  animate={{ width: `${lightExposure}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleLightAdjust(-15)} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold">
                  ☁️ -15%
                </button>
                <button onClick={() => handleLightAdjust(15)} className="py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white font-bold">
                  ☀️ +15%
                </button>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-red-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-red-400" />
                  <span className="text-white font-bold">Temperature</span>
                </div>
                <span className="text-2xl font-bold text-white">{temperature}°C</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleTempAdjust(-2)} className="py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold">
                  ❄️ -2°C
                </button>
                <button onClick={() => handleTempAdjust(2)} className="py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold">
                  🔥 +2°C
                </button>
              </div>
            </div>

            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-pink-500/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span className="text-white font-bold">Overall Health</span>
                </div>
                <span className={`text-2xl font-bold ${
                  plantHealth > 75 ? 'text-green-400' :
                  plantHealth > 40 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>{Math.round(plantHealth)}%</span>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    plantHealth > 75 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                    plantHealth > 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                    'bg-gradient-to-r from-red-600 to-red-400'
                  }`}
                  animate={{ width: `${plantHealth}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {plantGrowth > 0.65 && (
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-amber-500/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-white font-bold">Trichomes</span>
                  </div>
                  <span className={`text-xl font-bold ${trichStage.color}`}>{trichStage.name}</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">Maturity: {Math.round(trichomeMaturity * 100)}%</div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-400 via-gray-300 to-amber-500"
                    animate={{ width: `${trichomeMaturity * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {trichStage.ready && (
                  <div className="mt-2 text-xs text-green-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Perfect harvest window!
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-purple-500/50 p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Insights
              </h3>
              <AIInsightPanel
                plantStats={{ water_level: waterLevel, nutrition_level: nutritionLevel, plant_health: plantHealth }}
                currentWeather={currentWeather}
                currentSeason={currentSeason}
                pestTypes={[]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}