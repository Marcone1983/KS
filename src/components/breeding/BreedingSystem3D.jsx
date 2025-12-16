import React, { useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Line, Sphere } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import { Dna, Sparkles, Plus, ArrowRight, Zap, TrendingUp, Shield, Droplets } from 'lucide-react';

// 3D DNA Helix Component
const DNAHelix = ({ genetics1, genetics2, breeding = false, offspring = null }) => {
  const helixRef = useRef();
  const particlesRef = useRef();

  const helixData = useMemo(() => {
    const points = 60;
    const radius = 0.3;
    const height = 2;
    const helixPoints = [];

    for (let i = 0; i < points; i++) {
      const t = i / points;
      const angle = t * Math.PI * 8; // 4 full rotations
      const y = (t - 0.5) * height;

      // Strand 1
      helixPoints.push({
        strand: 1,
        position: [
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ],
        color: new THREE.Color(genetics1?.color || 0x00ff00)
      });

      // Strand 2
      helixPoints.push({
        strand: 2,
        position: [
          Math.cos(angle + Math.PI) * radius,
          y,
          Math.sin(angle + Math.PI) * radius
        ],
        color: new THREE.Color(genetics2?.color || 0x0000ff)
      });
    }

    return helixPoints;
  }, [genetics1, genetics2]);

  // DNA rotation animation
  useFrame((state, delta) => {
    if (helixRef.current) {
      helixRef.current.rotation.y += breeding ? 0.02 : 0.005;

      if (breeding) {
        helixRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }

    // Particle effects during breeding
    if (particlesRef.current && breeding) {
      particlesRef.current.rotation.y -= 0.03;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <group ref={helixRef}>
      {/* DNA Strands */}
      {helixData.map((point, i) => (
        <Sphere
          key={`helix-${i}`}
          args={[0.03, 8, 8]}
          position={point.position}
        >
          <meshStandardMaterial
            color={point.color}
            emissive={point.color}
            emissiveIntensity={breeding ? 0.5 : 0.2}
            metalness={0.3}
            roughness={0.4}
          />
        </Sphere>
      ))}

      {/* Connecting base pairs */}
      {Array.from({ length: 30 }).map((_, i) => {
        const idx1 = i * 4;
        const idx2 = i * 4 + 1;
        if (helixData[idx1] && helixData[idx2]) {
          return (
            <Line
              key={`connector-${i}`}
              points={[helixData[idx1].position, helixData[idx2].position]}
              color={breeding ? 0xffd700 : 0xffffff}
              lineWidth={breeding ? 2 : 1}
              transparent
              opacity={0.4}
            />
          );
        }
        return null;
      })}

      {/* Offspring result display */}
      {offspring && !breeding && (
        <group position={[0, 1.5, 0]}>
          <Sphere args={[0.15, 16, 16]}>
            <meshPhysicalMaterial
              color={offspring.color || 0xffd700}
              emissive={offspring.color || 0xffd700}
              emissiveIntensity={0.5}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </Sphere>

          <Html center>
            <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg text-white text-sm font-bold whitespace-nowrap">
              {offspring.strain_name}
            </div>
          </Html>
        </group>
      )}

      {/* Breeding particle effects */}
      {breeding && (
        <group ref={particlesRef}>
          {Array.from({ length: 50 }).map((_, i) => {
            const angle = (i / 50) * Math.PI * 2;
            const radius = 0.6;
            const height = (Math.random() - 0.5) * 2;

            return (
              <Sphere
                key={`particle-${i}`}
                args={[0.02, 6, 6]}
                position={[
                  Math.cos(angle) * radius,
                  height,
                  Math.sin(angle) * radius
                ]}
              >
                <meshBasicMaterial
                  color={0xffd700}
                  transparent
                  opacity={0.8}
                />
              </Sphere>
            );
          })}
        </group>
      )}

      {/* Glow effect */}
      {breeding && (
        <pointLight position={[0, 0, 0]} color={0xffd700} intensity={2} distance={3} />
      )}
    </group>
  );
};

// Genetics Comparison Chart
const GeneticsComparison = ({ parent1, parent2, offspring }) => {
  const traits = [
    { key: 'growth_speed', label: 'Growth Speed', icon: TrendingUp, color: 'text-green-400' },
    { key: 'pest_resistance', label: 'Pest Resistance', icon: Shield, color: 'text-blue-400' },
    { key: 'water_efficiency', label: 'Water Efficiency', icon: Droplets, color: 'text-cyan-400' },
    { key: 'max_health_bonus', label: 'Health Bonus', icon: Sparkles, color: 'text-yellow-400' }
  ];

  const getBarWidth = (value) => `${Math.min((value / 10) * 100, 100)}%`;

  return (
    <div className="space-y-4">
      {traits.map((trait) => {
        const Icon = trait.icon;
        const val1 = parent1?.[trait.key] || 0;
        const val2 = parent2?.[trait.key] || 0;
        const valOff = offspring?.[trait.key] || 0;

        return (
          <div key={trait.key} className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Icon className={`w-4 h-4 ${trait.color}`} />
              <span>{trait.label}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Parent 1 */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Parent 1</div>
                <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                    style={{ width: getBarWidth(val1) }}
                  />
                </div>
                <div className="text-xs text-green-400 mt-1">{val1.toFixed(1)}</div>
              </div>

              {/* Parent 2 */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Parent 2</div>
                <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                    style={{ width: getBarWidth(val2) }}
                  />
                </div>
                <div className="text-xs text-blue-400 mt-1">{val2.toFixed(1)}</div>
              </div>

              {/* Offspring */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Offspring</div>
                <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: getBarWidth(valOff) }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="text-xs text-yellow-400 mt-1">{valOff.toFixed(1)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Main Breeding System Component
const BreedingSystem3D = ({
  availableSeeds = [],
  onBreed,
  playerCurrency = 0,
  unlockedSeeds = []
}) => {
  const [selectedParent1, setSelectedParent1] = useState(null);
  const [selectedParent2, setSelectedParent2] = useState(null);
  const [breeding, setBreeding] = useState(false);
  const [offspring, setOffspring] = useState(null);
  const [showResult, setShowResult] = useState(false);

  // Calculate offspring genetics
  const calculateOffspring = (seed1, seed2) => {
    if (!seed1 || !seed2) return null;

    const hybridVigor = 1.0 + Math.random() * 0.3;

    const offspring = {
      growth_speed: ((seed1.growth_speed + seed2.growth_speed) / 2) * hybridVigor,
      pest_resistance: Math.max(seed1.pest_resistance, seed2.pest_resistance) * 0.95,
      water_efficiency: (seed1.water_efficiency + seed2.water_efficiency) / 2,
      max_health_bonus: (seed1.max_health_bonus + seed2.max_health_bonus) / 2
    };

    // Rarity calculation
    const rarityTiers = { common: 0, rare: 1, legendary: 2 };
    const avgTier = (rarityTiers[seed1.rarity] + rarityTiers[seed2.rarity]) / 2;

    let resultRarity = 'common';
    if (avgTier >= 1.5) resultRarity = 'legendary';
    else if (avgTier >= 0.7) resultRarity = 'rare';

    // Color mixing
    const color1 = new THREE.Color(seed1.color || 0x2d5016);
    const color2 = new THREE.Color(seed2.color || 0x2d5016);
    const mixedColor = color1.clone().lerp(color2, 0.5);

    return {
      ...offspring,
      rarity: resultRarity,
      color: '#' + mixedColor.getHexString(),
      strain_name: `${seed1.strain_name.split(' ')[0]} x ${seed2.strain_name.split(' ')[0]}`,
      cost: 200 + (avgTier * 100),
      breedingTime: 300 * (1 + avgTier)
    };
  };

  const previewOffspring = useMemo(
    () => calculateOffspring(selectedParent1, selectedParent2),
    [selectedParent1, selectedParent2]
  );

  const startBreeding = async () => {
    if (!selectedParent1 || !selectedParent2 || !previewOffspring) return;

    if (playerCurrency < previewOffspring.cost) {
      return; // Not enough currency
    }

    setBreeding(true);
    setShowResult(false);

    // Breeding animation (5 seconds)
    setTimeout(() => {
      setBreeding(false);
      setOffspring(previewOffspring);
      setShowResult(true);

      if (onBreed) {
        onBreed(previewOffspring);
      }
    }, 5000);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2 flex items-center gap-3">
          <Dna className="w-10 h-10 text-purple-400" />
          Genetic Breeding Lab
        </h1>
        <p className="text-gray-400">Combine genetics to create superior strains</p>
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100%-120px)]">
        {/* Parent 1 Selection */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            Parent 1
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {availableSeeds.filter(s => unlockedSeeds.includes(s.id)).map((seed) => (
              <motion.div
                key={seed.id}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedParent1?.id === seed.id
                    ? 'bg-green-600 ring-2 ring-green-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedParent1(seed)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-white">{seed.strain_name}</div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    seed.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                    seed.rarity === 'rare' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {seed.rarity}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Growth: <span className="text-green-400">{seed.growth_speed.toFixed(1)}</span></div>
                  <div className="text-gray-400">Resist: <span className="text-blue-400">{seed.pest_resistance.toFixed(1)}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Center: DNA Helix & Breeding */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 flex flex-col">
          {/* 3D DNA Visualization */}
          <div className="flex-1 bg-black/40 rounded-xl mb-4 relative">
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
              <Suspense fallback={null}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {selectedParent1 && selectedParent2 && (
                  <DNAHelix
                    genetics1={selectedParent1}
                    genetics2={selectedParent2}
                    breeding={breeding}
                    offspring={offspring}
                  />
                )}

                <OrbitControls enableZoom={false} autoRotate={!breeding} autoRotateSpeed={0.5} />
              </Suspense>
            </Canvas>

            {/* Status Overlay */}
            {breeding && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center">
                  <motion.div
                    className="text-6xl mb-4"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    ⚗️
                  </motion.div>
                  <div className="text-2xl font-bold text-white mb-2">Breeding in Progress</div>
                  <div className="text-gray-400">Combining genetic material...</div>
                </div>
              </div>
            )}
          </div>

          {/* Breeding Button */}
          <button
            onClick={startBreeding}
            disabled={!selectedParent1 || !selectedParent2 || breeding || (playerCurrency < (previewOffspring?.cost || 0))}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-xl text-white font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            {breeding ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Breeding...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Start Breeding {previewOffspring && `(${previewOffspring.cost} Leaves)`}
              </>
            )}
          </button>
        </div>

        {/* Parent 2 Selection */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            Parent 2
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {availableSeeds.filter(s => unlockedSeeds.includes(s.id)).map((seed) => (
              <motion.div
                key={seed.id}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedParent2?.id === seed.id
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedParent2(seed)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-white">{seed.strain_name}</div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    seed.rarity === 'legendary' ? 'bg-yellow-500 text-black' :
                    seed.rarity === 'rare' ? 'bg-blue-500 text-white' :
                    'bg-gray-500 text-white'
                  }`}>
                    {seed.rarity}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-gray-400">Growth: <span className="text-green-400">{seed.growth_speed.toFixed(1)}</span></div>
                  <div className="text-gray-400">Resist: <span className="text-blue-400">{seed.pest_resistance.toFixed(1)}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Results Modal */}
      <AnimatePresence>
        {showResult && offspring && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResult(false)}
          >
            <motion.div
              className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-3xl p-8 max-w-4xl w-full"
              initial={{ scale: 0.5, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 180 }}
              transition={{ type: 'spring', duration: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <motion.div
                  className="text-6xl mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.3, times: [0, 0.6, 1] }}
                >
                  🧬
                </motion.div>
                <h2 className="text-4xl font-black text-white mb-2">Breeding Successful!</h2>
                <div className="text-2xl text-yellow-400 font-bold">{offspring.strain_name}</div>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold mt-2 ${
                  offspring.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black' :
                  offspring.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {offspring.rarity.toUpperCase()}
                </div>
              </div>

              <GeneticsComparison
                parent1={selectedParent1}
                parent2={selectedParent2}
                offspring={offspring}
              />

              <div className="mt-8 flex gap-4">
                <button
                  onClick={() => setShowResult(false)}
                  className="flex-1 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl text-white font-bold text-lg transition-all"
                >
                  Claim Seed
                </button>
                <button
                  onClick={() => {
                    setShowResult(false);
                    setSelectedParent1(null);
                    setSelectedParent2(null);
                    setOffspring(null);
                  }}
                  className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BreedingSystem3D;
