import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { Leaf, Sparkles, Box, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MARKETPLACE_ITEMS = [
  {
    id: 'gold_skin',
    name: 'Gold Spray',
    type: 'skin',
    price: 250,
    color: '#FFD700',
    description: 'Spruzzino dorato di lusso'
  },
  {
    id: 'neon_skin',
    name: 'Neon Spray',
    type: 'skin',
    price: 300,
    color: '#FF00FF',
    description: 'Effetto neon futuristico'
  },
  {
    id: 'fire_skin',
    name: 'Fire Spray',
    type: 'skin',
    price: 400,
    color: '#FF4500',
    description: 'Fiamme ardenti'
  }
];

function RotatingItem3D({ item, isSelected }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 16]} />
        <meshStandardMaterial
          color={item.color}
          metalness={0.7}
          roughness={0.2}
          emissive={item.color}
          emissiveIntensity={isSelected ? 0.5 : 0.2}
        />
      </mesh>
      <mesh position={[0.15, 0.2, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.03, 0.04, 0.12, 12]} />
        <meshStandardMaterial color="#333333" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function Marketplace3D({
  playerCurrency = 0,
  unlockedSkins = [],
  unlockedSeeds = [],
  onPurchase
}) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const handlePurchase = async () => {
    if (!selectedItem) return;

    const success = await onPurchase(selectedItem.type, selectedItem.id, selectedItem.price);
    if (success) {
      setSelectedItem(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-black/30 rounded-2xl border-2 border-cyan-500/50 h-[500px]">
        <Canvas shadows dpr={[1, 2]}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 1, 3]} fov={50} />
            <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} />
            
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
            <pointLight position={[-3, 2, -3]} intensity={0.5} color="#00ffff" />
            
            {selectedItem && (
              <RotatingItem3D item={selectedItem} isSelected={true} />
            )}
            
            <ContactShadows position={[0, -0.5, 0]} opacity={0.6} scale={3} blur={2} />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      <div className="space-y-4">
        <div className="bg-black/40 backdrop-blur rounded-xl p-4 flex items-center justify-between">
          <span className="text-white font-bold">Your Leaf</span>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" />
            <span className="text-2xl font-black text-white">{playerCurrency}</span>
          </div>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {MARKETPLACE_ITEMS.map(item => {
            const isUnlocked = unlockedSkins.includes(item.id);
            const isSelected = selectedItem?.id === item.id;

            return (
              <motion.div
                key={item.id}
                onHoverStart={() => setHoveredItem(item)}
                onHoverEnd={() => setHoveredItem(null)}
                onClick={() => setSelectedItem(item)}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  isSelected ? 'bg-purple-600 border-2 border-purple-400' :
                  isUnlocked ? 'bg-green-900/30 border-2 border-green-500/50' :
                  'bg-gray-800/50 border-2 border-gray-600 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-white font-bold">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                    </div>
                  </div>
                  {isUnlocked && <Check className="w-5 h-5 text-green-400" />}
                </div>

                {!isUnlocked && (
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Leaf className="w-4 h-4" />
                      <span className="font-bold">{item.price}</span>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase();
                      }}
                      size="sm"
                      disabled={playerCurrency < item.price || !isSelected}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      Buy
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}