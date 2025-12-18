import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text, Line, Sphere } from '@react-three/drei';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dna, Sparkles, Zap, Heart, Plus } from 'lucide-react';
import gsap from 'gsap';
import * as THREE from 'three';
import CannabisPlantR3F_AAA from './CannabisPlantR3F_AAA';

// Visualizzazione DNA Helix
function DNAHelix({ gene1, gene2, progress = 0 }) {
  const helixRef = useRef();
  const particlesRef = useRef();
  
  useFrame((state) => {
    if (helixRef.current) {
      helixRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
    
    if (particlesRef.current) {
      particlesRef.current.children.forEach((particle, i) => {
        particle.position.y = Math.sin(state.clock.elapsedTime * 2 + i * 0.5) * 0.05;
      });
    }
  });

  const segments = 20;
  const helixPoints1 = [];
  const helixPoints2 = [];
  const connectionPoints = [];

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 4;
    const y = t * 2 - 1;
    const radius = 0.3;
    
    helixPoints1.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    ));
    
    helixPoints2.push(new THREE.Vector3(
      Math.cos(angle + Math.PI) * radius,
      y,
      Math.sin(angle + Math.PI) * radius
    ));
    
    if (i % 2 === 0) {
      connectionPoints.push([helixPoints1[i], helixPoints2[i]]);
    }
  }

  return (
    <group ref={helixRef}>
      {/* Helix strands */}
      <Line points={helixPoints1} color={gene1?.color || "#4a90e2"} lineWidth={3} />
      <Line points={helixPoints2} color={gene2?.color || "#9b59b6"} lineWidth={3} />
      
      {/* Base pair connections */}
      {connectionPoints.map((points, i) => (
        <Line key={i} points={points} color="#ffffff" lineWidth={1.5} opacity={0.6} transparent />
      ))}
      
      {/* Gene markers (spheres) */}
      <group ref={particlesRef}>
        {Array.from({ length: 12 }).map((_, i) => {
          const t = i / 12;
          const angle = t * Math.PI * 4;
          const y = t * 2 - 1;
          const radius = 0.3;
          
          return (
            <Sphere
              key={i}
              position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}
              args={[0.04, 16, 16]}
            >
              <meshStandardMaterial 
                color={i % 2 === 0 ? gene1?.color || "#4a90e2" : gene2?.color || "#9b59b6"}
                emissive={i % 2 === 0 ? gene1?.color || "#4a90e2" : gene2?.color || "#9b59b6"}
                emissiveIntensity={0.5}
              />
            </Sphere>
          );
        })}
      </group>
      
      {/* Progress indicator */}
      {progress > 0 && progress < 1 && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
        >
          {`Breeding: ${Math.round(progress * 100)}%`}
        </Text>
      )}
    </group>
  );
}

// Trait Visualization (visualizza traits genetici)
function GeneticTraitsVisualization({ traits }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 bg-black/60 rounded-lg">
      {traits.map((trait, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2"
        >
          <div className={`w-2 h-2 rounded-full ${
            trait.dominant ? 'bg-yellow-400' : 'bg-blue-400'
          }`} />
          <div className="text-xs text-gray-300">{trait.name}</div>
          <div className="text-xs font-bold text-white">{trait.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function BreedingSystem3D({ 
  availableSeeds = [],
  onBreed,
  progress,
  activeBreeding = null
}) {
  const [parent1, setParent1] = useState(null);
  const [parent2, setParent2] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [predictedOffspring, setPredictedOffspring] = useState(null);

  const handlePredictOffspring = () => {
    if (!parent1 || !parent2) return;

    const offspring = {
      strain_name: `${parent1.strain_name} x ${parent2.strain_name}`,
      growth_speed: (parent1.growth_speed + parent2.growth_speed) / 2 + (Math.random() - 0.5) * 0.2,
      pest_resistance: (parent1.pest_resistance + parent2.pest_resistance) / 2 + (Math.random() - 0.5) * 0.1,
      water_efficiency: (parent1.water_efficiency + parent2.water_efficiency) / 2,
      max_health_bonus: (parent1.max_health_bonus + parent2.max_health_bonus) / 2,
      rarity: parent1.rarity === 'legendary' || parent2.rarity === 'legendary' ? 'legendary' : 
              parent1.rarity === 'rare' || parent2.rarity === 'rare' ? 'rare' : 'common',
      genetics: {
        fingerCount: Math.round((parent1.genetics?.fingerCount || 7) + (parent2.genetics?.fingerCount || 7)) / 2,
        leafWidth: ((parent1.genetics?.leafWidth || 1.0) + (parent2.genetics?.leafWidth || 1.0)) / 2,
        leafLength: ((parent1.genetics?.leafLength || 1.0) + (parent2.genetics?.leafLength || 1.0)) / 2
      },
      traits: [
        { name: 'Growth', value: `${Math.round(((parent1.growth_speed + parent2.growth_speed) / 2) * 100)}%`, dominant: parent1.growth_speed > parent2.growth_speed },
        { name: 'Resistance', value: `+${Math.round(((parent1.pest_resistance + parent2.pest_resistance) / 2) * 100)}%`, dominant: parent1.pest_resistance > parent2.pest_resistance },
        { name: 'Water Eff.', value: `${Math.round(((parent1.water_efficiency + parent2.water_efficiency) / 2) * 100)}%`, dominant: parent1.water_efficiency > parent2.water_efficiency },
        { name: 'Health', value: `+${Math.round(((parent1.max_health_bonus + parent2.max_health_bonus) / 2))}`, dominant: parent1.max_health_bonus > parent2.max_health_bonus }
      ]
    };

    setPredictedOffspring(offspring);
  };

  const startBreeding = () => {
    if (!parent1 || !parent2) {
      toast.error('Seleziona 2 semi per il breeding');
      return;
    }

    if (onBreed) {
      onBreed(parent1, parent2, predictedOffspring);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-black text-white mb-3 flex items-center justify-center gap-3">
            <Dna className="w-12 h-12 text-pink-400" />
            Breeding Lab 3D
          </h1>
          <p className="text-xl text-purple-200">Crea ibridi leggendari combinando genetiche</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Parent 1 Selector */}
          <Card className="bg-black/40 backdrop-blur border-2 border-purple-500/50">
            <CardHeader>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                Genitore 1
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {parent1 ? (
                <>
                  <div className="h-48 bg-black/60 rounded">
                    <Canvas shadows>
                      <PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
                      <OrbitControls autoRotate autoRotateSpeed={2} />
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[3, 3, 3]} intensity={1} />
                      <SeedPreview3D seed={parent1} />
                      <Environment preset="sunset" />
                    </Canvas>
                  </div>
                  <div className="text-white font-semibold">{parent1.strain_name}</div>
                  <Button onClick={() => setParent1(null)} variant="outline" size="sm" className="w-full">
                    Cambia
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {availableSeeds.slice(0, 4).map(seed => (
                    <Button
                      key={seed.id}
                      onClick={() => setParent1(seed)}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                    >
                      {seed.strain_name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* DNA Helix Visualization */}
          <Card className="bg-black/40 backdrop-blur border-2 border-pink-500/50">
            <CardHeader>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Dna className="w-5 h-5 text-cyan-400" />
                DNA Fusion
              </h3>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-black/60 rounded">
                {parent1 && parent2 ? (
                  <Canvas>
                    <PerspectiveCamera makeDefault position={[0, 0, 3]} />
                    <ambientLight intensity={0.4} />
                    <pointLight position={[2, 2, 2]} intensity={1} />
                    <DNAHelix 
                      gene1={{ color: "#4a90e2" }}
                      gene2={{ color: "#9b59b6" }}
                      progress={activeBreeding?.progress || 0}
                    />
                  </Canvas>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Plus className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <div>Seleziona 2 genitori</div>
                    </div>
                  </div>
                )}
              </div>
              
              {parent1 && parent2 && (
                <Button
                  onClick={startBreeding}
                  className="w-full mt-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Avvia Breeding
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Parent 2 Selector */}
          <Card className="bg-black/40 backdrop-blur border-2 border-blue-500/50">
            <CardHeader>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-blue-400" />
                Genitore 2
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {parent2 ? (
                <>
                  <div className="h-48 bg-black/60 rounded">
                    <Canvas shadows>
                      <PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
                      <OrbitControls autoRotate autoRotateSpeed={-2} />
                      <ambientLight intensity={0.6} />
                      <directionalLight position={[3, 3, 3]} intensity={1} />
                      <SeedPreview3D seed={parent2} />
                      <Environment preset="sunset" />
                    </Canvas>
                  </div>
                  <div className="text-white font-semibold">{parent2.strain_name}</div>
                  <Button onClick={() => setParent2(null)} variant="outline" size="sm" className="w-full">
                    Cambia
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {availableSeeds.slice(0, 4).map(seed => (
                    <Button
                      key={seed.id}
                      onClick={() => setParent2(seed)}
                      variant="outline"
                      size="sm"
                      className="justify-start"
                      disabled={seed.id === parent1?.id}
                    >
                      {seed.strain_name}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Predicted Offspring Preview */}
        {predictedOffspring && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 backdrop-blur border-2 border-yellow-500/50">
              <CardHeader>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  Offspring Previsto
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* 3D Preview */}
                  <div className="h-80 bg-black/60 rounded-lg">
                    <Canvas shadows>
                      <PerspectiveCamera makeDefault position={[0, 0, 3]} />
                      <OrbitControls autoRotate autoRotateSpeed={1} />
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
                      <spotLight position={[0, 8, 0]} intensity={1} angle={0.6} penumbra={1} />
                      
                      <SeedPreview3D seed={predictedOffspring} />
                      
                      <Environment preset="sunset" />
                    </Canvas>
                  </div>
                  
                  {/* Traits */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-white mb-2">{predictedOffspring.strain_name}</div>
                      <div className="text-sm text-gray-400">{predictedOffspring.description || 'Ibrido genetico unico'}</div>
                    </div>
                    
                    <GeneticTraitsVisualization traits={predictedOffspring.traits} />
                    
                    <div className="flex items-center gap-2 pt-4 border-t border-white/20">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span className="text-white">Breeding Time:</span>
                      <span className="text-yellow-400 font-bold">~15 min</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SeedPreview3D({ seed }) {
  return (
    <CannabisPlantR3F_AAA
      position={[0, -1.2, 0]}
      health={100}
      pestCount={0}
      windStrength={0.12}
      growthStage={0.88}
      trichomeMaturity={0.65}
      genetics={seed.genetics || {}}
    />
  );
}

function GeneticTraitsVisualization({ traits }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {traits.map((trait, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 bg-white/5 rounded px-3 py-2"
        >
          <div className={`w-2 h-2 rounded-full ${
            trait.dominant ? 'bg-yellow-400' : 'bg-blue-400'
          }`} />
          <div className="text-xs text-gray-300 flex-1">{trait.name}</div>
          <div className="text-xs font-bold text-white">{trait.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

export { DNAHelix, GeneticTraitsVisualization };