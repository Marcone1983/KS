import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { ChevronLeft, ChevronRight, ShoppingCart, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function RotatingItem3D({ item, isSelected }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const color = item.color || '#8B4513';

  return (
    <group>
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.6, 0.5, 0.8, 32]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.3}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>
      
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {item.name}
      </Text>
      
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.15}
        color={item.price === 0 ? '#4ade80' : '#fbbf24'}
        anchorX="center"
        anchorY="middle"
      >
        {item.price === 0 ? 'FREE' : `${item.price} Leaf`}
      </Text>
      
      <ContactShadows position={[0, -0.4, 0]} opacity={0.5} scale={2} blur={2} />
    </group>
  );
}

export default function Marketplace3D({
  playerCurrency = 0,
  unlockedSkins = [],
  unlockedSeeds = [],
  onPurchase
}) {
  const [currentCategory, setCurrentCategory] = useState('pots');
  const [currentIndex, setCurrentIndex] = useState(0);

  const ITEMS = {
    pots: [
      { id: 'classic', name: 'Classic', price: 0, color: '#8B4513' },
      { id: 'ceramic', name: 'Ceramic', price: 150, color: '#F5F5F5' },
      { id: 'modern', name: 'Modern', price: 200, color: '#1A1A1A' },
      { id: 'gold', name: 'Gold', price: 500, color: '#FFD700' }
    ],
    skins: [
      { id: 'default', name: 'Default', price: 0, color: '#00BFFF' },
      { id: 'neon', name: 'Neon', price: 100, color: '#FF00FF' },
      { id: 'gold', name: 'Gold', price: 250, color: '#FFD700' },
      { id: 'rainbow', name: 'Rainbow', price: 500, color: '#FF69B4' }
    ]
  };

  const currentItems = ITEMS[currentCategory] || ITEMS.pots;
  const currentItem = currentItems[currentIndex];
  const isUnlocked = currentCategory === 'skins' 
    ? unlockedSkins.includes(currentItem.id)
    : unlockedSeeds.includes(currentItem.id);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % currentItems.length);
  };

  const handlePurchase = async () => {
    if (isUnlocked) return;
    
    const success = await onPurchase(currentCategory.slice(0, -1), currentItem.id, currentItem.price);
    if (success) {
      toast.success(`${currentItem.name} unlocked!`);
    }
  };

  return (
    <div className="w-full h-[600px] bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl overflow-hidden relative">
      <div className="h-full">
        <Canvas shadows dpr={[1, 2]}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 1.5, 3]} fov={50} />
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate={false}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 2}
            />

            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
            <pointLight position={[-3, 3, -3]} intensity={0.8} color="#00ffff" />
            <pointLight position={[3, 3, -3]} intensity={0.8} color="#ff00ff" />

            <RotatingItem3D item={currentItem} isSelected={true} />

            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={handlePrevious}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <div className="text-center">
            <div className="text-2xl font-black text-white mb-2">{currentItem.name}</div>
            <div className="text-sm text-gray-400">
              {currentIndex + 1} / {currentItems.length}
            </div>
          </div>

          <Button
            onClick={handleNext}
            variant="ghost"
            className="text-white hover:bg-white/10"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        <Button
          onClick={handlePurchase}
          className="w-full"
          disabled={isUnlocked || currentItem.price > playerCurrency}
        >
          {isUnlocked ? (
            <>
              <Check className="h-5 w-5 mr-2" />
              Owned
            </>
          ) : currentItem.price > playerCurrency ? (
            <>
              <Lock className="h-5 w-5 mr-2" />
              Need {currentItem.price - playerCurrency} more Leaf
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Purchase ({currentItem.price} Leaf)
            </>
          )}
        </Button>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          onClick={() => setCurrentCategory('pots')}
          size="sm"
          variant={currentCategory === 'pots' ? 'default' : 'outline'}
          className={currentCategory === 'pots' ? 'bg-orange-600' : 'border-white text-white'}
        >
          Pots
        </Button>
        <Button
          onClick={() => setCurrentCategory('skins')}
          size="sm"
          variant={currentCategory === 'skins' ? 'default' : 'outline'}
          className={currentCategory === 'skins' ? 'bg-purple-600' : 'border-white text-white'}
        >
          Skins
        </Button>
      </div>
    </div>
  );
}