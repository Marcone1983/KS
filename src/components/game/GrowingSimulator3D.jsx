import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Droplets, Sun, Zap, Heart, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';
import CannabisPlantR3F_AAA from './CannabisPlantR3F_AAA';

export default function GrowingSimulator3D({ progress, onUpdate }) {
  const [plantGrowth, setPlantGrowth] = useState(progress?.plant_stats?.growth_level / 10 || 0.3);
  const [waterLevel, setWaterLevel] = useState(progress?.plant_stats?.water_level || 100);
  const [nutritionLevel, setNutritionLevel] = useState(progress?.plant_stats?.nutrition_level || 100);
  const [lightExposure, setLightExposure] = useState(progress?.plant_stats?.light_exposure || 50);
  const [trichomeMaturity, setTrichomeMaturity] = useState(0.2);
  const [autoGrow, setAutoGrow] = useState(false);
  const [showStats, setShowStats] = useState(true);

  const plantHealth = Math.min(100, (waterLevel + nutritionLevel + lightExposure) / 3);

  useEffect(() => {
    if (!autoGrow) return;

    const growthInterval = setInterval(() => {
      if (waterLevel > 20 && nutritionLevel > 20 && lightExposure > 40) {
        setPlantGrowth(prev => {
          const newGrowth = Math.min(1.0, prev + 0.01);
          
          if (onUpdate) {
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
        
        if (plantGrowth > 0.6) {
          setTrichomeMaturity(prev => Math.min(1.0, prev + 0.005));
        }
      }
      
      setWaterLevel(prev => Math.max(0, prev - 0.5));
      setNutritionLevel(prev => Math.max(0, prev - 0.2));
    }, 2000);

    return () => clearInterval(growthInterval);
  }, [autoGrow, waterLevel, nutritionLevel, lightExposure, plantGrowth]);

  const handleWater = () => {
    setWaterLevel(prev => Math.min(100, prev + 30));
    toast.success('Pianta innaffiata! 💧');
  };

  const handleFertilize = () => {
    if (progress?.leaf_currency < 10) {
      toast.error('Servono 10 Leaf per fertilizzare');
      return;
    }
    setNutritionLevel(prev => Math.min(100, prev + 40));
    toast.success('Fertilizzante applicato! 🌱');
  };

  const handleLight = (amount) => {
    setLightExposure(prev => Math.max(0, Math.min(100, prev + amount)));
  };

  const getGrowthStageLabel = () => {
    if (plantGrowth < 0.2) return { label: 'Seedling', color: 'text-green-300', icon: '🌱' };
    if (plantGrowth < 0.4) return { label: 'Vegetative', color: 'text-green-400', icon: '🌿' };
    if (plantGrowth < 0.7) return { label: 'Pre-Flowering', color: 'text-yellow-400', icon: '🌻' };
    if (plantGrowth < 0.9) return { label: 'Flowering', color: 'text-orange-400', icon: '🌺' };
    return { label: 'Mature', color: 'text-purple-400', icon: '👑' };
  };

  const getTrichomeLabel = () => {
    if (trichomeMaturity < 0.3) return { label: 'Clear', color: 'text-blue-300' };
    if (trichomeMaturity < 0.7) return { label: 'Cloudy', color: 'text-gray-300' };
    return { label: 'Amber', color: 'text-amber-400' };
  };

  const stage = getGrowthStageLabel();
  const trichomeStage = getTrichomeLabel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-teal-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-3 flex items-center justify-center gap-3">
            <Sparkles className="w-12 h-12 text-green-400" />
            Growing Simulator 3D
          </h1>
          <p className="text-xl text-emerald-200">Coltiva la tua pianta in tempo reale</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 3D Plant View */}
          <div className="lg:col-span-2">
            <Card className="bg-black/40 backdrop-blur border-2 border-green-500/50 h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-white flex items-center gap-2">
                    {stage.icon} {stage.label}
                  </CardTitle>
                  <Button
                    onClick={() => setAutoGrow(!autoGrow)}
                    variant={autoGrow ? "default" : "outline"}
                    className={autoGrow ? "bg-green-600" : ""}
                  >
                    {autoGrow ? 'Auto-Grow ON' : 'Auto-Grow OFF'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] bg-black/60 rounded-xl overflow-hidden relative">
                  <Canvas shadows dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 1.5, 3]} />
                    <OrbitControls 
                      autoRotate
                      autoRotateSpeed={0.5}
                      minDistance={2}
                      maxDistance={6}
                      maxPolarAngle={Math.PI / 2}
                    />
                    
                    <ambientLight intensity={0.4} />
                    <directionalLight 
                      position={[8, 12, 6]} 
                      intensity={1.8} 
                      castShadow
                      shadow-mapSize-width={2048}
                      shadow-mapSize-height={2048}
                    />
                    <spotLight position={[0, 8, 0]} intensity={0.8} angle={0.6} penumbra={1} castShadow />
                    
                    {/* Pot */}
                    <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                      <cylinderGeometry args={[0.35, 0.3, 0.45, 24]} />
                      <meshStandardMaterial color={0x8b4513} roughness={0.8} />
                    </mesh>
                    
                    {/* Soil */}
                    <mesh position={[0, 0.445, 0]} receiveShadow>
                      <cylinderGeometry args={[0.32, 0.32, 0.05, 24]} />
                      <meshStandardMaterial color={0x3d2817} roughness={0.95} />
                    </mesh>
                    
                    {/* Cannabis Plant */}
                    <CannabisPlantR3F_AAA
                      position={[0, 0.47, 0]}
                      health={plantHealth}
                      pestCount={0}
                      windStrength={0.15}
                      growthStage={plantGrowth}
                      trichomeMaturity={trichomeMaturity}
                      genetics={progress?.active_seed_genetics || {}}
                    />
                    
                    <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={3} blur={2} />
                    <Environment preset="sunset" />
                  </Canvas>
                  
                  {/* Growth Stage Indicator */}
                  <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                    <div className={`text-2xl font-bold ${stage.color}`}>{stage.label}</div>
                    <div className="text-sm text-gray-400">Growth: {Math.round(plantGrowth * 100)}%</div>
                  </div>
                  
                  {/* Trichome Maturity */}
                  {plantGrowth > 0.6 && (
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                      <div className="text-xs text-gray-400 mb-1">Trichomes</div>
                      <div className={`text-xl font-bold ${trichomeStage.color}`}>{trichomeStage.label}</div>
                      <div className="text-xs text-gray-400">{Math.round(trichomeMaturity * 100)}%</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Water Control */}
            <Card className="bg-black/40 backdrop-blur border-2 border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                  Idratazione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={waterLevel} className="h-3" />
                <div className="text-2xl font-bold text-white">{Math.round(waterLevel)}%</div>
                <Button onClick={handleWater} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  <Droplets className="w-4 h-4 mr-2" />
                  Innaffia (+30%)
                </Button>
              </CardContent>
            </Card>

            {/* Nutrition Control */}
            <Card className="bg-black/40 backdrop-blur border-2 border-yellow-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Nutrizione
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={nutritionLevel} className="h-3" />
                <div className="text-2xl font-bold text-white">{Math.round(nutritionLevel)}%</div>
                <Button onClick={handleFertilize} className="w-full bg-yellow-600 hover:bg-yellow-700">
                  <Zap className="w-4 h-4 mr-2" />
                  Fertilizza (10 Leaf)
                </Button>
              </CardContent>
            </Card>

            {/* Light Control */}
            <Card className="bg-black/40 backdrop-blur border-2 border-orange-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sun className="w-5 h-5 text-orange-400" />
                  Esposizione Luce
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={lightExposure} className="h-3" />
                <div className="text-2xl font-bold text-white">{Math.round(lightExposure)}%</div>
                <div className="flex gap-2">
                  <Button onClick={() => handleLight(-20)} variant="outline" className="flex-1">
                    - Luce
                  </Button>
                  <Button onClick={() => handleLight(20)} className="flex-1 bg-orange-600 hover:bg-orange-700">
                    + Luce
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Overall Health */}
            <Card className="bg-black/40 backdrop-blur border-2 border-pink-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-400" />
                  Salute Totale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={plantHealth} className="h-4" />
                <div className="text-3xl font-bold text-white">{Math.round(plantHealth)}%</div>
                <div className="text-xs text-gray-400">
                  Media di acqua, nutrizione e luce
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}