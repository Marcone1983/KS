import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text, Stage } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Sparkles, Zap, Leaf, Eye, RotateCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import gsap from 'gsap';
import CannabisPlantR3F_AAA from './CannabisPlantR3F_AAA';

// 3D Preview per Seed
function SeedPreview3D({ seed, autoRotate = true }) {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  const genetics = {
    fingerCount: seed.genetics?.fingerCount || 7,
    leafWidth: seed.genetics?.leafWidth || 1.0,
    leafLength: seed.genetics?.leafLength || 1.0
  };

  return (
    <group ref={groupRef}>
      <CannabisPlantR3F_AAA
        position={[0, -1.2, 0]}
        health={100}
        pestCount={0}
        windStrength={0.15}
        growthStage={0.85}
        trichomeMaturity={0.7}
        genetics={genetics}
      />
    </group>
  );
}

// 3D Preview per Spray Bottle Skin
function SprayBottleSkinPreview({ skin }) {
  const bottleRef = useRef();
  
  useFrame((state, delta) => {
    if (bottleRef.current) {
      bottleRef.current.rotation.y += delta * 0.6;
      bottleRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(skin.glassColor || 0xe8f5ff),
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.8,
    ior: 1.52,
    clearcoat: 1.0,
    reflectivity: 0.85
  });

  const plasticMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skin.plasticColor || 0x2a2a2a),
    roughness: 0.25,
    metalness: 0.5,
    emissive: new THREE.Color(skin.emissiveColor || 0x0a0a0a),
    emissiveIntensity: 0.2
  });

  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(skin.liquidColor || 0x70c4ff),
    roughness: 0.1,
    transmission: 0.88,
    thickness: 0.6,
    ior: 1.35
  });

  return (
    <group ref={bottleRef} scale={2.5}>
      <mesh material={glassMaterial} castShadow receiveShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.4, 24]} />
      </mesh>
      
      <mesh position-y={-0.05} material={liquidMaterial}>
        <cylinderGeometry args={[0.085, 0.095, 0.32, 24]} />
      </mesh>
      
      <mesh position={[0.105, 0.12, 0]} material={plasticMaterial} castShadow>
        <boxGeometry args={[0.055, 0.11, 0.09]} />
      </mesh>
      
      <mesh position-y={0.24} material={plasticMaterial} castShadow>
        <cylinderGeometry args={[0.078, 0.092, 0.075, 24]} />
      </mesh>
      
      <mesh position={[0.13, 0.24, 0]} rotation-z={-Math.PI / 2} material={plasticMaterial} castShadow>
        <coneGeometry args={[0.016, 0.045, 16]} />
      </mesh>
    </group>
  );
}

// 3D Preview per Plant Pot
function PlantPotPreview({ pot }) {
  const potRef = useRef();
  
  useFrame((state, delta) => {
    if (potRef.current) {
      potRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={potRef} scale={2}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.28, 0.45, 24]} />
        <meshStandardMaterial 
          color={pot.color || 0x8b4513} 
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      <mesh position-y={0.235}>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 24]} />
        <meshStandardMaterial color={0x3d2817} roughness={0.95} />
      </mesh>
    </group>
  );
}

// Componente Card Prodotto con 3D Preview
function Product3DCard({ item, type, onPurchase, onEquip, isOwned, isEquipped, playerLeaves }) {
  const [isHovered, setIsHovered] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const cardRef = useRef();

  const canAfford = playerLeaves >= item.price;

  const get3DPreview = () => {
    switch(type) {
      case 'seed':
        return <SeedPreview3D seed={item} autoRotate />;
      case 'skin':
        return <SprayBottleSkinPreview skin={item} />;
      case 'pot':
        return <PlantPotPreview pot={item} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
    >
      <Card className="overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-gray-700 hover:border-purple-500 transition-all h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start mb-2">
            <CardTitle className="text-white text-lg">{item.name || item.strain_name}</CardTitle>
            {item.rarity && (
              <Badge className={
                item.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                item.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                'bg-gray-600'
              }>
                {item.rarity.toUpperCase()}
              </Badge>
            )}
          </div>
          
          {/* 3D Preview Container */}
          <div 
            className="h-48 bg-black/40 rounded-lg overflow-hidden cursor-pointer relative group"
            onClick={() => setShow3D(!show3D)}
          >
            {show3D ? (
              <Suspense fallback={
                <div className="h-full flex items-center justify-center text-gray-400">
                  Caricamento 3D...
                </div>
              }>
                <Canvas shadows dpr={[1, 2]}>
                  <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={50} />
                  <OrbitControls 
                    enableZoom={false} 
                    enablePan={false}
                    minPolarAngle={Math.PI / 4}
                    maxPolarAngle={Math.PI / 1.5}
                  />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
                  <spotLight position={[0, 5, 0]} intensity={0.5} angle={0.6} penumbra={1} castShadow />
                  
                  {get3DPreview()}
                  
                  <ContactShadows position={[0, -1.5, 0]} opacity={0.6} scale={5} blur={2} />
                  <Environment preset="sunset" />
                </Canvas>
              </Suspense>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                  <div className="text-sm text-gray-400">Click per Preview 3D</div>
                </div>
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end justify-center pb-3">
              <div className="flex items-center gap-2 text-white text-sm">
                <RotateCw className="w-4 h-4" />
                <span>Ruota per vedere</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Description */}
          <p className="text-sm text-gray-400 line-clamp-2">{item.description}</p>
          
          {/* Stats */}
          {type === 'seed' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {item.growth_speed && (
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-gray-300">Speed: {item.growth_speed}x</span>
                </div>
              )}
              {item.pest_resistance && (
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-gray-300">Resist: +{Math.round(item.pest_resistance * 100)}%</span>
                </div>
              )}
            </div>
          )}

          {/* Price and Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">{item.price}</span>
            </div>
            
            <div className="flex gap-2">
              {isOwned ? (
                isEquipped ? (
                  <Badge className="bg-green-600">Equipaggiato</Badge>
                ) : (
                  <Button
                    onClick={() => onEquip(item)}
                    size="sm"
                    variant="outline"
                    className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                  >
                    Equipaggia
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => onPurchase(item)}
                  disabled={!canAfford}
                  size="sm"
                  className={canAfford 
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700" 
                    : "bg-gray-700 cursor-not-allowed"
                  }
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Acquista
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Marketplace3D({ progress, items, type, onPurchase, onEquip }) {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {items.map((item) => {
        const isOwned = type === 'seed' 
          ? progress?.unlocked_seeds?.includes(item.id)
          : type === 'pot'
          ? progress?.unlocked_pots?.includes(item.id)
          : progress?.unlocked_skins?.includes(item.id);
        
        const isEquipped = type === 'seed'
          ? progress?.active_seed === item.id
          : type === 'pot'
          ? progress?.active_pot === item.id
          : progress?.active_skin === item.id;

        return (
          <Product3DCard
            key={item.id}
            item={item}
            type={type}
            onPurchase={onPurchase}
            onEquip={onEquip}
            isOwned={isOwned}
            isEquipped={isEquipped}
            playerLeaves={progress?.leaf_currency || 0}
          />
        );
      })}
    </div>
  );
}