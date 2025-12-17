import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Palette, Box, Sparkles, Leaf, Lock, Check, Sun, Moon, Lightbulb, Wand2, Cloud, Zap, Layers, Paintbrush } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import CannabisPlantR3F_AAA from '../components/game/CannabisPlantR3F_AAA';

const POT_SKINS = [
  { id: 'classic', name: 'Classic Terra Cotta', price: 0, color: '#8b4513', material: 'clay' },
  { id: 'ceramic_white', name: 'Ceramic White', price: 150, color: '#f5f5f5', material: 'ceramic' },
  { id: 'modern_black', name: 'Modern Black', price: 200, color: '#1a1a1a', material: 'ceramic' },
  { id: 'wooden_barrel', name: 'Wooden Barrel', price: 250, color: '#654321', material: 'wood' },
  { id: 'gold_luxury', name: 'Gold Luxury', price: 500, color: '#ffd700', material: 'metal' },
  { id: 'crystal', name: 'Crystal Glass', price: 400, color: '#e0f5ff', material: 'glass' },
  { id: 'neon_cyber', name: 'Neon Cyber', price: 600, color: '#ff00ff', material: 'tech' }
];

const PLANT_SKINS = [
  { id: 'default', name: 'Natural Green', price: 0, leafColor: '#4a9d4a', stemColor: '#5a7d4a' },
  { id: 'purple_haze', name: 'Purple Haze', price: 300, leafColor: '#9b59b6', stemColor: '#7d3c98' },
  { id: 'golden_harvest', name: 'Golden Harvest', price: 350, leafColor: '#f1c40f', stemColor: '#d4a017' },
  { id: 'frost_white', name: 'Frost White', price: 400, leafColor: '#ecf0f1', stemColor: '#bdc3c7' },
  { id: 'fire_red', name: 'Fire Red', price: 450, leafColor: '#e74c3c', stemColor: '#c0392b' },
  { id: 'ocean_blue', name: 'Ocean Blue', price: 500, leafColor: '#3498db', stemColor: '#2980b9' },
  { id: 'rainbow', name: 'Rainbow Spectrum', price: 800, leafColor: 'rainbow', stemColor: '#34495e' }
];

const DECORATIONS = [
  { id: 'garden_gnome', name: 'Garden Gnome', price: 100, icon: '🧙', category: 'statue' },
  { id: 'butterfly', name: 'Butterflies', price: 150, icon: '🦋', category: 'ambient' },
  { id: 'mushrooms', name: 'Magic Mushrooms', price: 120, icon: '🍄', category: 'ground' },
  { id: 'fairy_lights', name: 'Fairy Lights', price: 200, icon: '✨', category: 'lighting' },
  { id: 'zen_rocks', name: 'Zen Rock Garden', price: 180, icon: '🪨', category: 'ground' },
  { id: 'wind_chimes', name: 'Wind Chimes', price: 130, icon: '🎐', category: 'ambient' },
  { id: 'fountain', name: 'Water Fountain', price: 350, icon: '⛲', category: 'feature' },
  { id: 'fireflies', name: 'Fireflies', price: 250, icon: '✨', category: 'ambient' }
];

const LIGHTING_PRESETS = [
  { id: 'natural', name: 'Natural Daylight', price: 0, icon: Sun },
  { id: 'sunset', name: 'Golden Hour', price: 100, icon: Sun },
  { id: 'moonlight', name: 'Moonlight', price: 150, icon: Moon },
  { id: 'grow_light', name: 'Grow Light', price: 200, icon: Lightbulb },
  { id: 'neon', name: 'Neon Club', price: 300, icon: Sparkles }
];

function CustomPlantPreview({ potSkin, plantSkin, decorations, lighting }) {
  const potData = POT_SKINS.find(p => p.id === potSkin) || POT_SKINS[0];
  const plantData = PLANT_SKINS.find(p => p.id === plantSkin) || PLANT_SKINS[0];

  return (
    <Canvas shadows dpr={[1, 2]}>
      <Suspense fallback={null}>
        <PerspectiveCamera makeDefault position={[0, 1.8, 3.5]} fov={60} />
        <OrbitControls autoRotate autoRotateSpeed={1} enableZoom={true} />

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
        <pointLight position={[0, 3, 0]} intensity={0.5} color={plantData.leafColor !== 'rainbow' ? plantData.leafColor : '#ffffff'} />

        <group>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.5, 0.45, 0.6, 32]} />
            <meshStandardMaterial
              color={potData.color}
              roughness={potData.material === 'glass' ? 0.1 : potData.material === 'metal' ? 0.3 : 0.8}
              metalness={potData.material === 'metal' ? 0.9 : 0.1}
              transparent={potData.material === 'glass'}
              opacity={potData.material === 'glass' ? 0.6 : 1.0}
            />
          </mesh>

          <CannabisPlantR3F_AAA
            position={[0, 0.6, 0]}
            health={100}
            pestCount={0}
            windStrength={0.1}
            growthStage={0.75}
            trichomeMaturity={0.5}
            customColors={plantData.leafColor !== 'rainbow' ? {
              leaf: plantData.leafColor,
              stem: plantData.stemColor
            } : null}
            rainbow={plantData.leafColor === 'rainbow'}
          />
        </group>

        <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={5} blur={2} />
        <Environment preset={lighting || 'sunset'} />
      </Suspense>
    </Canvas>
  );
}

export default function GardenCustomization() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('pots');
  
  const { data: allSeeds } = useQuery({
    queryKey: ['seeds'],
    queryFn: () => base44.entities.Seed.list(),
    initialData: []
  });

  const { data: customization } = useQuery({
    queryKey: ['gardenCustomization'],
    queryFn: async () => {
      const customs = await base44.entities.GardenCustomization.list();
      if (customs.length === 0) {
        return await base44.entities.GardenCustomization.create({
          unlocked_pot_skins: ['classic'],
          active_pot_skin: 'classic',
          unlocked_plant_skins: ['default'],
          active_plant_skin: 'default',
          decorative_items: [],
          background_theme: 'garden',
          lighting_preset: 'natural',
          unlocked_decorations: []
        });
      }
      return customs[0];
    }
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: progression } = useQuery({
    queryKey: ['playerProgression'],
    queryFn: async () => {
      const list = await base44.entities.PlayerProgression.list();
      return list.length > 0 ? list[0] : null;
    }
  });

  const updateCustomizationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GardenCustomization.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gardenCustomization'] });
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const handlePurchasePotSkin = async (skin) => {
    if (!customization || !progress) return;

    if (customization.unlocked_pot_skins.includes(skin.id)) {
      await updateCustomizationMutation.mutateAsync({
        id: customization.id,
        data: { active_pot_skin: skin.id }
      });
      toast.success(`${skin.name} equipped!`);
      return;
    }

    if (progress.leaf_currency < skin.price) {
      toast.error('Not enough Leaf!');
      return;
    }

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: {
        unlocked_pot_skins: [...customization.unlocked_pot_skins, skin.id],
        active_pot_skin: skin.id
      }
    });

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: { leaf_currency: progress.leaf_currency - skin.price }
    });

    toast.success(`${skin.name} unlocked!`);
  };

  const handlePurchasePlantSkin = async (skin) => {
    if (!customization || !progress) return;

    if (customization.unlocked_plant_skins.includes(skin.id)) {
      await updateCustomizationMutation.mutateAsync({
        id: customization.id,
        data: { active_plant_skin: skin.id }
      });
      toast.success(`${skin.name} equipped!`);
      return;
    }

    if (progress.leaf_currency < skin.price) {
      toast.error('Not enough Leaf!');
      return;
    }

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: {
        unlocked_plant_skins: [...customization.unlocked_plant_skins, skin.id],
        active_plant_skin: skin.id
      }
    });

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: { leaf_currency: progress.leaf_currency - skin.price }
    });

    toast.success(`${skin.name} unlocked!`);
  };

  const handlePurchaseDecoration = async (decoration) => {
    if (!customization || !progress) return;

    if (customization.unlocked_decorations.includes(decoration.id)) {
      const isActive = customization.decorative_items.some(d => d.id === decoration.id);
      
      if (isActive) {
        await updateCustomizationMutation.mutateAsync({
          id: customization.id,
          data: {
            decorative_items: customization.decorative_items.filter(d => d.id !== decoration.id)
          }
        });
        toast.success(`${decoration.name} removed`);
      } else {
        await updateCustomizationMutation.mutateAsync({
          id: customization.id,
          data: {
            decorative_items: [...customization.decorative_items, decoration]
          }
        });
        toast.success(`${decoration.name} added to garden`);
      }
      return;
    }

    if (progress.leaf_currency < decoration.price) {
      toast.error('Not enough Leaf!');
      return;
    }

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: {
        unlocked_decorations: [...customization.unlocked_decorations, decoration.id],
        decorative_items: [...customization.decorative_items, decoration]
      }
    });

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: { leaf_currency: progress.leaf_currency - decoration.price }
    });

    toast.success(`${decoration.name} unlocked!`);
  };

  const handleSetLighting = async (preset) => {
    if (!customization || !progress) return;

    if (preset.price > 0 && progress.leaf_currency < preset.price && customization.lighting_preset !== preset.id) {
      toast.error('Not enough Leaf!');
      return;
    }

    const needsPurchase = preset.price > 0 && customization.lighting_preset !== preset.id;

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: { lighting_preset: preset.id }
    });

    if (needsPurchase) {
      await updateProgressMutation.mutateAsync({
        id: progress.id,
        data: { leaf_currency: progress.leaf_currency - preset.price }
      });
    }

    toast.success(`${preset.name} lighting activated!`);
  };

  const handleCosmeticPurchase = async (item, unlockedField, activeField) => {
    if (!customization || !progress) return;

    if ((progress.leaf_currency || 0) < item.price) {
      toast.error('Not enough Leaf!');
      return;
    }

    const isArray = Array.isArray(customization[activeField]);

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: {
        [unlockedField]: [...(customization[unlockedField] || []), item.id],
        [activeField]: isArray ? [...(customization[activeField] || []), item.id] : item.id
      }
    });

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: { leaf_currency: (progress.leaf_currency || 0) - item.price }
    });

    toast.success(`${item.name} unlocked!`);
  };

  const handleCosmeticEquip = async (item, activeField) => {
    if (!customization) return;

    const isArray = Array.isArray(customization[activeField]);

    await updateCustomizationMutation.mutateAsync({
      id: customization.id,
      data: {
        [activeField]: isArray 
          ? (customization[activeField]?.includes(item.id) 
              ? customization[activeField].filter(id => id !== item.id)
              : [...(customization[activeField] || []), item.id])
          : item.id
      }
    });

    toast.success(isArray && customization[activeField]?.includes(item.id) ? `${item.name} removed` : `${item.name} equipped!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4 md:p-6 w-full overflow-x-hidden">
      <div className="max-w-full md:max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
              <span className="hidden md:inline">Back</span>
            </Button>
            <Palette className="w-8 h-8 md:w-12 md:h-12 text-emerald-400" />
            <h1 className="text-2xl md:text-5xl font-black text-white">Customize</h1>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-lg px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
            <Leaf className="h-5 w-5 md:h-6 md:w-6 text-green-400" />
            <div>
              <div className="text-xs md:text-sm text-gray-400">Leaf</div>
              <div className="text-lg md:text-2xl font-bold text-white">{progress?.leaf_currency || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
          <div className="lg:col-span-2 w-full">
            <Card className="bg-black/40 backdrop-blur border-emerald-500/30 h-[300px] md:h-[500px] w-full">
              <CardHeader>
                <CardTitle className="text-white">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="h-[240px] md:h-[400px] w-full">
                <CustomPlantPreview
                  potSkin={customization?.active_pot_skin || 'classic'}
                  plantSkin={customization?.active_plant_skin || 'default'}
                  decorations={customization?.decorative_items || []}
                  lighting={customization?.lighting_preset || 'natural'}
                />
              </CardContent>
            </Card>
          </div>

          <div className="w-full">
            <div className="flex gap-1 md:gap-2 mb-4 flex-wrap overflow-x-auto">
              <Button
                onClick={() => setSelectedTab('pots')}
                variant={selectedTab === 'pots' ? 'default' : 'outline'}
                className={selectedTab === 'pots' ? 'bg-orange-600' : 'border-orange-600 text-white text-xs md:text-sm'}
                size="sm"
              >
                <Box className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                <span className="hidden sm:inline">Pots</span>
              </Button>
              <Button onClick={() => setSelectedTab('plants')} variant={selectedTab === 'plants' ? 'default' : 'outline'} className={selectedTab === 'plants' ? 'bg-green-600' : 'border-green-600 text-white text-xs md:text-sm'} size="sm"><Leaf className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline ml-1">Plants</span></Button>
              <Button onClick={() => setSelectedTab('decor')} variant={selectedTab === 'decor' ? 'default' : 'outline'} className={selectedTab === 'decor' ? 'bg-purple-600' : 'border-purple-600 text-white text-xs md:text-sm'} size="sm"><Sparkles className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline ml-1">Decor</span></Button>
              <Button onClick={() => setSelectedTab('lighting')} variant={selectedTab === 'lighting' ? 'default' : 'outline'} className={selectedTab === 'lighting' ? 'bg-yellow-600' : 'border-yellow-600 text-white text-xs md:text-sm'} size="sm"><Sun className="w-3 h-3 md:w-4 md:h-4" /><span className="hidden sm:inline ml-1">Light</span></Button>
            </div>

            <Card className="bg-black/40 backdrop-blur border-cyan-500/30 w-full">
              <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3 max-h-[300px] md:max-h-[440px] overflow-y-auto w-full">
                {selectedTab === 'pots' && POT_SKINS.map(skin => {
                  const isUnlocked = customization?.unlocked_pot_skins?.includes(skin.id);
                  const isActive = customization?.active_pot_skin === skin.id;

                  return (
                    <div key={skin.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg"
                            style={{ backgroundColor: skin.color }}
                          />
                          <div>
                            <div className="text-white font-bold text-sm">{skin.name}</div>
                            <div className="text-xs text-gray-400">{skin.material}</div>
                          </div>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-green-400" />}
                      </div>
                      <Button
                        onClick={() => handlePurchasePotSkin(skin)}
                        size="sm"
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isUnlocked ? (isActive ? 'Equipped' : 'Equip') : `${skin.price} Leaf`}
                      </Button>
                    </div>
                  );
                })}

                {selectedTab === 'plants' && PLANT_SKINS.map(skin => {
                  const isUnlocked = customization?.unlocked_plant_skins?.includes(skin.id);
                  const isActive = customization?.active_plant_skin === skin.id;

                  return (
                    <div key={skin.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg"
                            style={{ 
                              background: skin.leafColor === 'rainbow' 
                                ? 'linear-gradient(45deg, red, yellow, green, blue, purple)' 
                                : skin.leafColor 
                            }}
                          />
                          <div className="text-white font-bold text-sm">{skin.name}</div>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-green-400" />}
                      </div>
                      <Button
                        onClick={() => handlePurchasePlantSkin(skin)}
                        size="sm"
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isUnlocked ? (isActive ? 'Equipped' : 'Equip') : `${skin.price} Leaf`}
                      </Button>
                    </div>
                  );
                })}

                {selectedTab === 'decor' && DECORATIONS.map(decor => {
                  const isUnlocked = customization?.unlocked_decorations?.includes(decor.id);
                  const isActive = customization?.decorative_items?.some(d => d.id === decor.id);

                  return (
                    <div key={decor.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{decor.icon}</span>
                          <div>
                            <div className="text-white font-bold text-sm">{decor.name}</div>
                            <div className="text-xs text-gray-400">{decor.category}</div>
                          </div>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-green-400" />}
                      </div>
                      <Button
                        onClick={() => handlePurchaseDecoration(decor)}
                        size="sm"
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                      >
                        {isUnlocked ? (isActive ? 'Remove' : 'Add to Garden') : `${decor.price} Leaf`}
                      </Button>
                    </div>
                  );
                })}

                {selectedTab === 'lighting' && LIGHTING_PRESETS.map(preset => {
                  const isActive = customization?.lighting_preset === preset.id;
                  const Icon = preset.icon;

                  return (
                    <div key={preset.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-8 h-8 text-yellow-400" />
                          <div className="text-white font-bold text-sm">{preset.name}</div>
                        </div>
                        {isActive && <Check className="w-5 h-5 text-green-400" />}
                      </div>
                      <Button
                        onClick={() => handleSetLighting(preset)}
                        size="sm"
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isActive ? 'Active' : preset.price > 0 ? `${preset.price} Leaf` : 'Free'}
                      </Button>
                    </div>
                  );
                })}


              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}