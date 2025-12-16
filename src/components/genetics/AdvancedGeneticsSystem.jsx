import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Dna, Beaker, Sparkles, TrendingUp, Shield, Droplets, Sun, Leaf, Award } from 'lucide-react';
import { toast } from 'sonner';
import gsap from 'gsap';

const GENETIC_TRAITS = {
  pest_resistance: { 
    name: 'Pest Resistance', 
    icon: Shield, 
    color: 0x8b5cf6,
    range: [0, 100],
    inheritance: 'dominant',
    mutationChance: 0.15
  },
  growth_speed: { 
    name: 'Growth Speed', 
    icon: TrendingUp, 
    color: 0x10b981,
    range: [0.5, 3.0],
    inheritance: 'additive',
    mutationChance: 0.12
  },
  water_efficiency: { 
    name: 'Water Efficiency', 
    icon: Droplets, 
    color: 0x06b6d4,
    range: [0.5, 2.0],
    inheritance: 'recessive',
    mutationChance: 0.18
  },
  yield_potential: { 
    name: 'Yield Potential', 
    icon: Leaf, 
    color: 0x22c55e,
    range: [50, 200],
    inheritance: 'additive',
    mutationChance: 0.10
  },
  thc_content: { 
    name: 'THC Content', 
    icon: Sparkles, 
    color: 0xf59e0b,
    range: [5, 30],
    inheritance: 'dominant',
    mutationChance: 0.20
  },
  color_variation: { 
    name: 'Color', 
    icon: Award, 
    color: 0xec4899,
    range: [0, 360],
    inheritance: 'co-dominant',
    mutationChance: 0.25
  },
  flowering_time: { 
    name: 'Flowering Time', 
    icon: Sun, 
    color: 0xeab308,
    range: [40, 90],
    inheritance: 'recessive',
    mutationChance: 0.08
  }
};

function DNAHelix3D({ parent1Genes = {}, parent2Genes = {}, offspringGenes = {}, animationProgress = 0 }) {
  const helixGroup1 = useRef();
  const helixGroup2 = useRef();
  const helixGroupOffspring = useRef();
  const basePairs = useRef([]);

  const createHelixStructure = (genes, color1 = 0x00ff00, color2 = 0x0088ff) => {
    const pairs = [];
    const segments = 30;
    const radius = 0.3;
    const height = 3;
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const y = -height / 2 + t * height;
      const angle = t * Math.PI * 8;
      
      const x1 = Math.cos(angle) * radius;
      const z1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle + Math.PI) * radius;
      const z2 = Math.sin(angle + Math.PI) * radius;
      
      pairs.push({
        pos1: [x1, y, z1],
        pos2: [x2, y, z2],
        angle: angle,
        segment: i,
        geneInfo: Object.keys(genes)[i % Object.keys(genes).length]
      });
    }
    
    return pairs;
  };

  const pairs1 = useMemo(() => createHelixStructure(parent1Genes, 0x00ff88, 0x0088ff), [parent1Genes]);
  const pairs2 = useMemo(() => createHelixStructure(parent2Genes, 0xff0088, 0xff8800), [parent2Genes]);
  const pairsOffspring = useMemo(() => createHelixStructure(offspringGenes, 0xffff00, 0x88ff00), [offspringGenes]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    if (helixGroup1.current) {
      helixGroup1.current.rotation.y = time * 0.3;
      helixGroup1.current.position.x = -1.5 + Math.sin(animationProgress * Math.PI) * 0.5;
    }
    
    if (helixGroup2.current) {
      helixGroup2.current.rotation.y = time * 0.3;
      helixGroup2.current.position.x = 1.5 - Math.sin(animationProgress * Math.PI) * 0.5;
    }
    
    if (helixGroupOffspring.current) {
      helixGroupOffspring.current.rotation.y = time * 0.5;
      helixGroupOffspring.current.scale.setScalar(0.5 + animationProgress * 0.8);
      helixGroupOffspring.current.material?.opacity && (helixGroupOffspring.current.material.opacity = animationProgress);
    }
  });

  const renderHelix = (pairs, groupRef, color1, color2) => (
    <group ref={groupRef}>
      {pairs.map((pair, i) => (
        <group key={i}>
          <mesh position={pair.pos1}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color1}
              emissive={color1}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={pair.pos2}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color2}
              emissive={color2}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[(pair.pos1[0] + pair.pos2[0]) / 2, pair.pos1[1], (pair.pos1[2] + pair.pos2[2]) / 2]}>
            <cylinderGeometry args={[0.02, 0.02, Math.hypot(pair.pos2[0] - pair.pos1[0], pair.pos2[2] - pair.pos1[2]), 8]} />
            <meshStandardMaterial color={0xffffff} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
      
      {pairs.map((pair, i) => {
        if (i === pairs.length - 1) return null;
        const next = pairs[i + 1];
        return (
          <group key={`strand_${i}`}>
            <mesh position={[(pair.pos1[0] + next.pos1[0]) / 2, (pair.pos1[1] + next.pos1[1]) / 2, (pair.pos1[2] + next.pos1[2]) / 2]}>
              <cylinderGeometry args={[0.03, 0.03, Math.hypot(next.pos1[0] - pair.pos1[0], next.pos1[1] - pair.pos1[1], next.pos1[2] - pair.pos1[2]), 8]} />
              <meshStandardMaterial color={color1} emissive={color1} emissiveIntensity={0.3} />
            </mesh>
            
            <mesh position={[(pair.pos2[0] + next.pos2[0]) / 2, (pair.pos2[1] + next.pos2[1]) / 2, (pair.pos2[2] + next.pos2[2]) / 2]}>
              <cylinderGeometry args={[0.03, 0.03, Math.hypot(next.pos2[0] - pair.pos2[0], next.pos2[1] - pair.pos2[1], next.pos2[2] - pair.pos2[2]), 8]} />
              <meshStandardMaterial color={color2} emissive={color2} emissiveIntensity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );

  return (
    <>
      {renderHelix(pairs1, helixGroup1, 0x00ff88, 0x0088ff)}
      {renderHelix(pairs2, helixGroup2, 0xff0088, 0xff8800)}
      {animationProgress > 0 && renderHelix(pairsOffspring, helixGroupOffspring, 0xffff00, 0x88ff00)}
    </>
  );
}

export function AdvancedGeneticsSystem({
  parent1,
  parent2,
  onBreedingComplete
}) {
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedingProgress, setBreedingProgress] = useState(0);
  const [offspring, setOffspring] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const calculateOffspring = (p1, p2) => {
    if (!p1 || !p2) return null;
    
    const offspring = {
      strain_name: `${p1.strain_name} × ${p2.strain_name}`,
      genes: {}
    };
    
    Object.keys(GENETIC_TRAITS).forEach(trait => {
      const trait1 = p1[trait] || (GENETIC_TRAITS[trait].range[0] + GENETIC_TRAITS[trait].range[1]) / 2;
      const trait2 = p2[trait] || (GENETIC_TRAITS[trait].range[0] + GENETIC_TRAITS[trait].range[1]) / 2;
      const traitData = GENETIC_TRAITS[trait];
      
      let offspringValue;
      
      if (traitData.inheritance === 'dominant') {
        offspringValue = Math.random() > 0.5 ? Math.max(trait1, trait2) : Math.min(trait1, trait2);
      } else if (traitData.inheritance === 'recessive') {
        offspringValue = Math.random() > 0.75 ? Math.min(trait1, trait2) : (trait1 + trait2) / 2;
      } else if (traitData.inheritance === 'additive') {
        const hybridVigor = 1.1 + Math.random() * 0.2;
        offspringValue = ((trait1 + trait2) / 2) * hybridVigor;
      } else if (traitData.inheritance === 'co-dominant') {
        offspringValue = (trait1 + trait2) / 2;
      }
      
      if (Math.random() < traitData.mutationChance) {
        const mutationStrength = (Math.random() - 0.5) * 0.3;
        offspringValue += offspringValue * mutationStrength;
      }
      
      offspringValue = Math.max(
        traitData.range[0],
        Math.min(traitData.range[1], offspringValue)
      );
      
      offspring.genes[trait] = offspringValue;
    });
    
    const rarityScore = Object.values(offspring.genes).reduce((sum, val, i) => {
      const traitKey = Object.keys(offspring.genes)[i];
      const maxVal = GENETIC_TRAITS[traitKey].range[1];
      return sum + (val / maxVal);
    }, 0) / Object.keys(offspring.genes).length;
    
    if (rarityScore > 0.85) {
      offspring.rarity = 'mythic';
    } else if (rarityScore > 0.70) {
      offspring.rarity = 'legendary';
    } else if (rarityScore > 0.55) {
      offspring.rarity = 'rare';
    } else {
      offspring.rarity = 'common';
    }
    
    return offspring;
  };

  const startBreeding = () => {
    if (!parent1 || !parent2) {
      toast.error('Select two parent plants!');
      return;
    }
    
    setIsBreeding(true);
    setBreedingProgress(0);
    
    const duration = 5000;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      setBreedingProgress(progress);
      
      if (progress >= 1) {
        clearInterval(interval);
        
        const result = calculateOffspring(parent1, parent2);
        if (!result) {
          setIsBreeding(false);
          toast.error('Breeding failed');
          return;
        }
        
        setOffspring(result);
        setIsBreeding(false);
        setShowResults(true);
        
        gsap.fromTo('.offspring-card',
          { scale: 0, rotation: -180 },
          { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)' }
        );
        
        toast.success(`🧬 New strain created: ${result.strain_name}!`, {
          duration: 5000
        });
        
        if (onBreedingComplete) {
          onBreedingComplete(result);
        }
      }
    }, 50);
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="grid lg:grid-cols-2 gap-6 p-6 h-full">
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-purple-500/50 p-6">
          <h2 className="text-3xl font-black text-white mb-4 flex items-center gap-3">
            <Dna className="w-8 h-8 text-purple-400" />
            DNA Visualization
          </h2>
          
          <div className="h-[500px] bg-black/30 rounded-xl overflow-hidden">
            <Canvas>
              <Suspense fallback={null}>
                <PerspectiveCamera makeDefault position={[0, 0, 6]} />
                <OrbitControls
                  autoRotate
                  autoRotateSpeed={2}
                  enableZoom={false}
                  enablePan={false}
                />
                
                <ambientLight intensity={0.4} />
                <pointLight position={[0, 3, 0]} intensity={1} color={0xffffff} />
                <pointLight position={[-3, 0, 3]} intensity={0.8} color={0x00ffff} />
                <pointLight position={[3, 0, -3]} intensity={0.8} color={0xff00ff} />
                
                <DNAHelix3D
                  parent1Genes={parent1?.genes || {}}
                  parent2Genes={parent2?.genes || {}}
                  offspringGenes={offspring?.genes || {}}
                  animationProgress={breedingProgress}
                />
                
                <Environment preset="night" />
              </Suspense>
            </Canvas>
          </div>
          
          {isBreeding && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">Genetic Recombination</span>
                <span className="text-purple-400 font-bold">{Math.round(breedingProgress * 100)}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-400"
                  animate={{ width: `${breedingProgress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl border-2 border-cyan-500/50 p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Genetic Traits</h3>
            
            <div className="space-y-4">
              {parent1 && parent2 && Object.keys(GENETIC_TRAITS).map(traitKey => {
                const trait = GENETIC_TRAITS[traitKey];
                const val1 = parent1[traitKey] || parent1.genes?.[traitKey] || (trait.range[0] + trait.range[1]) / 2;
                const val2 = parent2[traitKey] || parent2.genes?.[traitKey] || (trait.range[0] + trait.range[1]) / 2;
                const offspringVal = offspring?.genes?.[traitKey];
                const Icon = trait.icon;
                
                return (
                  <div key={traitKey} className="bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-5 h-5" style={{ color: `#${trait.color.toString(16).padStart(6, '0')}` }} />
                      <span className="text-white font-bold">{trait.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">{trait.inheritance}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Parent 1</div>
                        <div className="text-lg font-bold text-cyan-400">
                          {trait.range[1] > 10 ? val1.toFixed(0) : val1.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Parent 2</div>
                        <div className="text-lg font-bold text-pink-400">
                          {trait.range[1] > 10 ? val2.toFixed(0) : val2.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-1">Offspring</div>
                        {offspringVal !== undefined ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-lg font-bold text-yellow-400"
                          >
                            {trait.range[1] > 10 ? offspringVal.toFixed(0) : offspringVal.toFixed(1)}
                          </motion.div>
                        ) : (
                          <div className="text-lg text-gray-600">?</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
                        style={{ width: `${((val1 + val2) / 2 / trait.range[1]) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {showResults && offspring && (
              <motion.div
                className="offspring-card bg-black/60 backdrop-blur-lg rounded-2xl border-4 border-yellow-500/50 p-6 shadow-2xl"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
              >
                <div className="text-center mb-4">
                  <div className="text-5xl mb-3">🌿</div>
                  <h3 className="text-3xl font-black text-white mb-2">{offspring.strain_name}</h3>
                  <div className={`inline-block px-4 py-2 rounded-full font-bold ${
                    offspring.rarity === 'mythic' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' :
                    offspring.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white' :
                    offspring.rarity === 'rare' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {offspring.rarity.toUpperCase()}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {Object.keys(offspring.genes).slice(0, 4).map(trait => {
                    const Icon = GENETIC_TRAITS[trait].icon;
                    return (
                      <div key={trait} className="bg-gray-800/50 rounded-lg p-3 flex items-center gap-2">
                        <Icon className="w-4 h-4 text-green-400" />
                        <div>
                          <div className="text-gray-400 text-xs">{GENETIC_TRAITS[trait].name}</div>
                          <div className="text-white font-bold">
                            {offspring.genes[trait].toFixed(1)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isBreeding && !showResults && (
            <button
              onClick={startBreeding}
              disabled={!parent1 || !parent2}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-bold text-lg transition-all disabled:cursor-not-allowed"
            >
              <Beaker className="w-6 h-6 inline mr-2" />
              Start Breeding
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GeneticTraitBadge({ trait, value }) {
  const traitData = GENETIC_TRAITS[trait];
  if (!traitData) return null;
  
  const Icon = traitData.icon;
  const percentage = ((value - traitData.range[0]) / (traitData.range[1] - traitData.range[0])) * 100;
  
  return (
    <div className="inline-flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-full">
      <Icon className="w-4 h-4" style={{ color: `#${traitData.color.toString(16).padStart(6, '0')}` }} />
      <span className="text-white text-sm font-bold">{value.toFixed(1)}</span>
      <div className="h-1 w-12 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: `#${traitData.color.toString(16).padStart(6, '0')}`
          }}
        />
      </div>
    </div>
  );
}

export { GENETIC_TRAITS };
export default AdvancedGeneticsSystem;