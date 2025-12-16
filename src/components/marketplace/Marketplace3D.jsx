import React, { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, ContactShadows, Text, Html } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import gsap from 'gsap';
import { ShoppingCart, Sparkles, Lock, Check } from 'lucide-react';

// 3D Spray Bottle Model (detailed version for showcase)
const SprayBottle3DShowcase = ({ color = 0x4a90e2, isSelected = false, onClick }) => {
  const groupRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;

      if (isSelected) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      }
    }

    if (glowRef.current && isSelected) {
      glowRef.current.scale.setScalar(1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    }
  });

  return (
    <group ref={groupRef} onClick={onClick} scale={2}>
      {/* Glow effect when selected */}
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.3, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Bottle body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.3, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          transmission={0.9}
          thickness={0.5}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      {/* Liquid inside */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.11, 0.09, 0.25, 32]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={0.7}
          transmission={0.5}
        />
      </mesh>

      {/* Cap */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.12, 0.05, 32]} />
        <meshStandardMaterial color={0x333333} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Trigger */}
      <group position={[0, 0.25, 0.08]}>
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.15, 0.03]} />
          <meshStandardMaterial color={0x2a2a2a} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Nozzle */}
      <mesh position={[0, 0.3, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.08, 16]} />
        <meshStandardMaterial color={0x1a1a1a} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Sparkle particles */}
      {isSelected && (
        <>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * 0.25,
                  0.15,
                  Math.sin(angle) * 0.25
                ]}
              >
                <sphereGeometry args={[0.01, 8, 8]} />
                <meshBasicMaterial color={0xffd700} />
              </mesh>
            );
          })}
        </>
      )}
    </group>
  );
};

// 3D Seed Model (detailed showcase)
const Seed3DShowcase = ({ genetics, isSelected = false, onClick }) => {
  const groupRef = useRef();
  const glowRef = useRef();

  const seedColor = new THREE.Color(genetics?.color || 0x8b7355);
  const rarityColor = {
    common: 0x808080,
    rare: 0x4169e1,
    legendary: 0xffd700
  }[genetics?.rarity || 'common'];

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.008;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      if (isSelected) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      }
    }

    if (glowRef.current && isSelected) {
      glowRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 3) * 0.15);
    }
  });

  return (
    <group ref={groupRef} onClick={onClick} scale={3}>
      {/* Glow for rarity */}
      {isSelected && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshBasicMaterial
            color={rarityColor}
            transparent
            opacity={0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Main seed body */}
      <mesh castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={seedColor}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Seed details (stripes) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh
          key={i}
          rotation={[0, (i / 6) * Math.PI * 2, 0]}
          position={[0.075, 0, 0]}
        >
          <boxGeometry args={[0.01, 0.12, 0.005]} />
          <meshStandardMaterial
            color={seedColor.clone().multiplyScalar(0.7)}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Genetics indicator particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 0.12;
        return (
          <mesh
            key={`particle-${i}`}
            position={[
              Math.cos(angle) * radius,
              Math.sin((i / 12) * Math.PI * 4) * 0.05,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.005, 8, 8]} />
            <meshBasicMaterial color={rarityColor} />
          </mesh>
        );
      })}

      {/* DNA helix preview (for legendary seeds) */}
      {genetics?.rarity === 'legendary' && (
        <group>
          {Array.from({ length: 20 }).map((_, i) => {
            const t = i / 20;
            const angle1 = t * Math.PI * 4;
            const angle2 = angle1 + Math.PI;
            const height = (t - 0.5) * 0.2;
            const radius = 0.15;

            return (
              <React.Fragment key={i}>
                <mesh position={[Math.cos(angle1) * radius, height, Math.sin(angle1) * radius]}>
                  <sphereGeometry args={[0.003, 8, 8]} />
                  <meshBasicMaterial color={0xffd700} />
                </mesh>
                <mesh position={[Math.cos(angle2) * radius, height, Math.sin(angle2) * radius]}>
                  <sphereGeometry args={[0.003, 8, 8]} />
                  <meshBasicMaterial color={0xffd700} />
                </mesh>
              </React.Fragment>
            );
          })}
        </group>
      )}
    </group>
  );
};

// 3D Item Display Canvas
const ItemDisplay3D = ({ item, type, isSelected }) => {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 3], fov: 45 }}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 0, 3]} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <spotLight
          position={[5, 5, 5]}
          angle={0.3}
          penumbra={1}
          intensity={1}
          castShadow
        />
        <spotLight position={[-5, 5, -5]} angle={0.3} penumbra={1} intensity={0.5} />

        {/* Environment */}
        <Environment preset="studio" />

        {/* Item */}
        {type === 'skin' && (
          <SprayBottle3DShowcase
            color={parseInt(item.color.replace('#', '0x'))}
            isSelected={isSelected}
          />
        )}

        {type === 'seed' && (
          <Seed3DShowcase genetics={item} isSelected={isSelected} />
        )}

        {/* Ground shadow */}
        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.5}
          scale={3}
          blur={2}
          far={1}
        />

        {/* Controls */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
          autoRotate={!isSelected}
          autoRotateSpeed={2}
        />
      </Suspense>
    </Canvas>
  );
};

// Main Marketplace Component
const Marketplace3D = ({
  items = [],
  type = 'skin', // 'skin', 'seed', 'upgrade'
  playerCurrency = 0,
  unlockedItems = [],
  onPurchase,
  onSelect
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleItemClick = (item) => {
    setSelectedItem(item);
    if (onSelect) onSelect(item);
  };

  const handlePurchase = (item) => {
    if (unlockedItems.includes(item.id)) {
      return; // Already owned
    }

    if (playerCurrency >= item.price) {
      if (onPurchase) onPurchase(item);

      // Purchase animation
      gsap.fromTo(
        `#item-${item.id}`,
        { scale: 1, rotation: 0 },
        { scale: 1.2, rotation: 360, duration: 0.5, ease: 'back.out' }
      );
    }
  };

  const getRarityColor = (rarity) => {
    return {
      common: 'from-gray-600 to-gray-800',
      rare: 'from-blue-600 to-blue-800',
      legendary: 'from-yellow-500 to-orange-600'
    }[rarity] || 'from-gray-600 to-gray-800';
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">
            {type === 'skin' ? '🎨 Spray Skins' : type === 'seed' ? '🌱 Premium Seeds' : '⚡ Upgrades'}
          </h1>
          <p className="text-gray-400">Collect rare items to enhance your arsenal</p>
        </div>

        {/* Currency Display */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 px-6 py-3 rounded-xl flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-xs text-green-200">Your Leaves</div>
            <div className="text-2xl font-bold text-white">{playerCurrency}</div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item, index) => {
          const isOwned = unlockedItems.includes(item.id);
          const canAfford = playerCurrency >= item.price;
          const isSelected = selectedItem?.id === item.id;
          const isHovered = hoveredItem === item.id;

          return (
            <motion.div
              key={item.id}
              id={`item-${item.id}`}
              className={`relative bg-gradient-to-br ${
                item.rarity ? getRarityColor(item.rarity) : 'from-gray-800 to-gray-900'
              } rounded-2xl overflow-hidden cursor-pointer transition-all ${
                isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => handleItemClick(item)}
            >
              {/* 3D Preview */}
              <div className="h-64 relative">
                <ItemDisplay3D item={item} type={type} isSelected={isSelected} />

                {/* Rarity Badge */}
                {item.rarity && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      item.rarity === 'legendary' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' :
                      item.rarity === 'rare' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {item.rarity}
                    </div>
                  </div>
                )}

                {/* Owned Badge */}
                {isOwned && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-green-500 rounded-full p-2">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Locked Overlay */}
                {!isOwned && !canAfford && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10">
                    <Lock className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Item Info */}
              <div className="p-4 bg-black/40 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-white mb-1">
                  {item.name || item.strain_name}
                </h3>
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                  {item.description}
                </p>

                {/* Stats (for seeds) */}
                {type === 'seed' && item.growth_speed && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="text-xs">
                      <div className="text-gray-500">Growth</div>
                      <div className="text-green-400 font-bold">★ {item.growth_speed.toFixed(1)}</div>
                    </div>
                    <div className="text-xs">
                      <div className="text-gray-500">Resistance</div>
                      <div className="text-blue-400 font-bold">★ {item.pest_resistance.toFixed(1)}</div>
                    </div>
                  </div>
                )}

                {/* Price & Purchase */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className={`font-bold ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                      {item.price}
                    </span>
                  </div>

                  {isOwned ? (
                    <div className="px-4 py-2 bg-green-600 rounded-lg text-white text-sm font-bold flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Owned
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePurchase(item);
                      }}
                      disabled={!canAfford}
                      className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                          : 'bg-gray-700 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 inline mr-1" />
                      Buy
                    </button>
                  )}
                </div>
              </div>

              {/* Hover Sparkle Effect */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 max-w-4xl w-full"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-2 gap-8">
                {/* 3D Preview */}
                <div className="h-96 bg-black/40 rounded-2xl">
                  <ItemDisplay3D item={selectedItem} type={type} isSelected={true} />
                </div>

                {/* Details */}
                <div>
                  <h2 className="text-4xl font-black text-white mb-4">
                    {selectedItem.name || selectedItem.strain_name}
                  </h2>
                  <p className="text-gray-300 mb-6">{selectedItem.description}</p>

                  {/* Full stats for seeds */}
                  {type === 'seed' && selectedItem.growth_speed && (
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Growth Speed</span>
                        <span className="text-green-400 font-bold">
                          ★ {selectedItem.growth_speed.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Pest Resistance</span>
                        <span className="text-blue-400 font-bold">
                          ★ {selectedItem.pest_resistance.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Water Efficiency</span>
                        <span className="text-cyan-400 font-bold">
                          ★ {selectedItem.water_efficiency.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={() => handlePurchase(selectedItem)}
                      disabled={unlockedItems.includes(selectedItem.id) || playerCurrency < selectedItem.price}
                      className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-xl text-white font-bold text-lg transition-all"
                    >
                      {unlockedItems.includes(selectedItem.id) ? 'Owned' : `Buy for ${selectedItem.price} Leaves`}
                    </button>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-bold transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace3D;
