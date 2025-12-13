import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Leaf, Lock, Check, Zap, Target, Droplets, Clock, Timer, Snowflake, Flame, Box, Sprout } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import PlantCarePanel from '../components/plant/PlantCarePanel';

const SKINS = [
  { id: 'default', name: 'Classico', price: 0, description: 'Spruzzino base', color: '#00BFFF' },
  { id: 'neon', name: 'Neon', price: 100, description: 'Effetto neon futuristico', color: '#FF00FF' },
  { id: 'gold', name: 'Oro', price: 250, description: 'Spruzzino d\'oro lucente', color: '#FFD700' },
  { id: 'rainbow', name: 'Arcobaleno', price: 500, description: 'Colori cangianti', color: 'linear-gradient(45deg, red, yellow, green, blue)' },
  { id: 'stealth', name: 'Stealth', price: 350, description: 'Nero opaco tattico', color: '#1a1a1a' },
  { id: 'fire', name: 'Fuoco', price: 400, description: 'Fiamme infuocate', color: '#FF4500' },
];

const UPGRADES = [
  { 
    id: 'spray_speed', 
    name: 'Velocità Sparo', 
    icon: Zap,
    description: 'Aumenta la velocità di fuoco del proiettile',
    maxLevel: 10,
    baseCost: 50,
    costMultiplier: 1.5,
    category: 'basic'
  },
  { 
    id: 'spray_radius', 
    name: 'Raggio Spray', 
    icon: Target,
    description: 'Aumenta l\'area di effetto dello spray',
    maxLevel: 10,
    baseCost: 75,
    costMultiplier: 1.6,
    category: 'basic'
  },
  { 
    id: 'spray_potency', 
    name: 'Potenza Spray', 
    icon: Droplets,
    description: 'Aumenta il danno per proiettile',
    maxLevel: 10,
    baseCost: 80,
    costMultiplier: 1.7,
    category: 'basic'
  },
  { 
    id: 'refill_speed', 
    name: 'Velocità Ricarica', 
    icon: Clock,
    description: 'Ricarica più velocemente le munizioni spray',
    maxLevel: 10,
    baseCost: 60,
    costMultiplier: 1.5,
    category: 'advanced'
  },
  { 
    id: 'spray_duration', 
    name: 'Durata Spray', 
    icon: Timer,
    description: 'Prolunga l\'effetto dannoso dello spray sui parassiti',
    maxLevel: 10,
    baseCost: 70,
    costMultiplier: 1.6,
    category: 'advanced'
  },
  { 
    id: 'slow_effect', 
    name: 'Effetto Gelo', 
    icon: Snowflake,
    description: 'Lo spray rallenta i parassiti colpiti',
    maxLevel: 5,
    baseCost: 150,
    costMultiplier: 2.0,
    category: 'special'
  },
  { 
    id: 'area_damage', 
    name: 'Danno ad Area', 
    icon: Flame,
    description: 'Infligge danno continuo ai parassiti nell\'area',
    maxLevel: 5,
    baseCost: 180,
    costMultiplier: 2.2,
    category: 'special'
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('skins');
  const [upgradeFilter, setUpgradeFilter] = useState('all');

  const { data: allPots } = useQuery({
    queryKey: ['plantPots'],
    queryFn: () => base44.entities.PlantPot.list(),
    initialData: []
  });

  const { data: allSeeds } = useQuery({
    queryKey: ['seeds'],
    queryFn: () => base44.entities.Seed.list(),
    initialData: []
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      if (progressList.length === 0) {
        return await base44.entities.GameProgress.create({
          current_level: 1,
          total_score: 0,
          high_score: 0,
          has_premium: false,
          unlocked_skins: ['default'],
          active_skin: 'default',
          upgrades: {
            spray_speed: 1,
            spray_radius: 1,
            spray_potency: 1,
            refill_speed: 1,
            spray_duration: 1,
            slow_effect: 0,
            area_damage: 0
          },
          plant_stats: {
            growth_level: 1,
            nutrition_level: 100,
            light_exposure: 50,
            water_level: 100,
            pruned_leaves: 0,
            resistance_bonus: 0
          },
          day_night_cycle: {
            current_hour: 12,
            cycle_speed: 1
          },
          pests_encountered: [],
          leaf_currency: 0
        });
      }
      return progressList[0];
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const handleBuySkin = async (skin) => {
    if (!progress) return;
    
    if (progress.unlocked_skins?.includes(skin.id)) {
      const updatedData = { ...progress, active_skin: skin.id };
      await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
      toast.success(`Skin ${skin.name} equipaggiata!`);
      return;
    }

    if (progress.leaf_currency < skin.price) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const updatedData = {
      ...progress,
      leaf_currency: progress.leaf_currency - skin.price,
      unlocked_skins: [...(progress.unlocked_skins || ['default']), skin.id],
      active_skin: skin.id
    };

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
    toast.success(`Skin ${skin.name} acquistata!`);
  };

  const handleBuyUpgrade = async (upgrade) => {
    if (!progress) return;

    const currentLevel = progress.upgrades[upgrade.id] || 1;
    
    if (currentLevel >= upgrade.maxLevel) {
      toast.error('Livello massimo raggiunto!');
      return;
    }

    const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel - 1));

    if (progress.leaf_currency < cost) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const updatedData = {
      ...progress,
      leaf_currency: progress.leaf_currency - cost,
      upgrades: {
        ...progress.upgrades,
        [upgrade.id]: currentLevel + 1
      }
    };

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
    toast.success(`${upgrade.name} potenziato a livello ${currentLevel + 1}!`);
  };

  const getUpgradeCost = (upgrade) => {
    const currentLevel = progress?.upgrades[upgrade.id] || 1;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel - 1));
  };

  const handleBuyPot = async (pot) => {
    if (!progress) return;
    
    if (progress.unlocked_pots?.includes(pot.id)) {
      const updatedData = { ...progress, active_pot: pot.id };
      await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
      toast.success(`Vaso ${pot.name} equipaggiato!`);
      return;
    }

    if (progress.leaf_currency < pot.price) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const updatedData = {
      ...progress,
      leaf_currency: progress.leaf_currency - pot.price,
      unlocked_pots: [...(progress.unlocked_pots || ['basic']), pot.id],
      active_pot: pot.id
    };

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
    toast.success(`Vaso ${pot.name} acquistato!`);
  };

  const handleBuySeed = async (seed) => {
    if (!progress) return;
    
    if (progress.unlocked_seeds?.includes(seed.id)) {
      const updatedData = { ...progress, active_seed: seed.id };
      await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
      toast.success(`Seme ${seed.strain_name} selezionato!`);
      return;
    }

    if (progress.leaf_currency < seed.price) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const updatedData = {
      ...progress,
      leaf_currency: progress.leaf_currency - seed.price,
      unlocked_seeds: [...(progress.unlocked_seeds || ['basic_strain']), seed.id],
      active_seed: seed.id
    };

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
    toast.success(`Seme ${seed.strain_name} acquistato!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Indietro
            </Button>
            <h1 className="text-4xl font-bold text-white">Shop</h1>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-lg px-6 py-3 flex items-center gap-3">
            <Leaf className="h-6 w-6 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">I tuoi Leaf</div>
              <div className="text-2xl font-bold text-white">{progress?.leaf_currency || 0}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-8 flex-wrap">
          <Button
            onClick={() => setSelectedTab('skins')}
            variant={selectedTab === 'skins' ? 'default' : 'outline'}
            className={selectedTab === 'skins' ? 'bg-purple-600' : 'border-purple-600 text-white'}
          >
            Skin Spruzzino
          </Button>
          <Button
            onClick={() => setSelectedTab('pots')}
            variant={selectedTab === 'pots' ? 'default' : 'outline'}
            className={selectedTab === 'pots' ? 'bg-orange-600' : 'border-orange-600 text-white'}
          >
            <Box className="h-4 w-4 mr-2" />
            Vasi
          </Button>
          <Button
            onClick={() => setSelectedTab('seeds')}
            variant={selectedTab === 'seeds' ? 'default' : 'outline'}
            className={selectedTab === 'seeds' ? 'bg-green-600' : 'border-green-600 text-white'}
          >
            <Sprout className="h-4 w-4 mr-2" />
            Semi
          </Button>
          <Button
            onClick={() => setSelectedTab('upgrades')}
            variant={selectedTab === 'upgrades' ? 'default' : 'outline'}
            className={selectedTab === 'upgrades' ? 'bg-purple-600' : 'border-purple-600 text-white'}
          >
            Potenziamenti
          </Button>
          <Button
            onClick={() => setSelectedTab('plant')}
            variant={selectedTab === 'plant' ? 'default' : 'outline'}
            className={selectedTab === 'plant' ? 'bg-green-600' : 'border-green-600 text-white'}
          >
            Cura Pianta
          </Button>
        </div>

        {selectedTab === 'upgrades' && (
          <div className="flex gap-2 mb-6">
            <Button
              onClick={() => setUpgradeFilter('all')}
              variant={upgradeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={upgradeFilter === 'all' ? 'bg-purple-500' : 'border-purple-400 text-white'}
            >
              Tutti
            </Button>
            <Button
              onClick={() => setUpgradeFilter('basic')}
              variant={upgradeFilter === 'basic' ? 'default' : 'outline'}
              size="sm"
              className={upgradeFilter === 'basic' ? 'bg-blue-500' : 'border-blue-400 text-white'}
            >
              Base
            </Button>
            <Button
              onClick={() => setUpgradeFilter('advanced')}
              variant={upgradeFilter === 'advanced' ? 'default' : 'outline'}
              size="sm"
              className={upgradeFilter === 'advanced' ? 'bg-cyan-500' : 'border-cyan-400 text-white'}
            >
              Avanzati
            </Button>
            <Button
              onClick={() => setUpgradeFilter('special')}
              variant={upgradeFilter === 'special' ? 'default' : 'outline'}
              size="sm"
              className={upgradeFilter === 'special' ? 'bg-orange-500' : 'border-orange-400 text-white'}
            >
              Speciali
            </Button>
          </div>
        )}

        {selectedTab === 'skins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SKINS.map(skin => {
              const isUnlocked = progress?.unlocked_skins?.includes(skin.id);
              const isActive = progress?.active_skin === skin.id;

              return (
                <Card key={skin.id} className="bg-black/40 backdrop-blur border-purple-500/30 hover:border-purple-500/60 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{skin.name}</CardTitle>
                      {isActive && <Badge className="bg-green-600">Equipaggiato</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="w-full h-32 rounded-lg mb-4"
                      style={{ background: skin.color }}
                    />
                    <p className="text-gray-300 text-sm mb-4">{skin.description}</p>
                    
                    {isUnlocked ? (
                      <Button
                        onClick={() => handleBuySkin(skin)}
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            In Uso
                          </>
                        ) : (
                          'Equipaggia'
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuySkin(skin)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        disabled={skin.price > (progress?.leaf_currency || 0)}
                      >
                        {skin.price > (progress?.leaf_currency || 0) ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            {skin.price} Leaf
                          </>
                        ) : (
                          <>
                            <Leaf className="h-4 w-4 mr-2" />
                            Acquista ({skin.price} Leaf)
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedTab === 'upgrades' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UPGRADES.filter(u => upgradeFilter === 'all' || u.category === upgradeFilter).map(upgrade => {
              const currentLevel = progress?.upgrades[upgrade.id] || 1;
              const cost = getUpgradeCost(upgrade);
              const isMaxLevel = currentLevel >= upgrade.maxLevel;
              const Icon = upgrade.icon;

              return (
                <Card key={upgrade.id} className="bg-black/40 backdrop-blur border-purple-500/30 hover:border-purple-500/60 transition-all">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {upgrade.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm mb-4">{upgrade.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">Livello</span>
                        <span className="text-white font-bold">{currentLevel} / {upgrade.maxLevel}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${(currentLevel / upgrade.maxLevel) * 100}%` }}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => handleBuyUpgrade(upgrade)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      disabled={isMaxLevel || cost > (progress?.leaf_currency || 0)}
                    >
                      {isMaxLevel ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Massimo
                        </>
                      ) : cost > (progress?.leaf_currency || 0) ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {cost} Leaf
                        </>
                      ) : (
                        <>
                          <Leaf className="h-4 w-4 mr-2" />
                          Potenzia ({cost} Leaf)
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedTab === 'pots' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPots.map(pot => {
              const isUnlocked = progress?.unlocked_pots?.includes(pot.id);
              const isActive = progress?.active_pot === pot.id;

              return (
                <Card key={pot.id} className="bg-black/40 backdrop-blur border-orange-500/30 hover:border-orange-500/60 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{pot.name}</CardTitle>
                      {isActive && <Badge className="bg-green-600">Equipaggiato</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="w-full h-32 rounded-lg mb-4 flex items-center justify-center"
                      style={{ backgroundColor: pot.color || '#8B4513' }}
                    >
                      <Box className="h-16 w-16 text-white/30" />
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{pot.description}</p>

                    <div className="space-y-1 mb-4 text-xs">
                      {pot.water_retention > 0 && (
                        <div className="flex justify-between text-cyan-400">
                          <span>Ritenzione Acqua:</span>
                          <span>+{Math.round(pot.water_retention * 100)}%</span>
                        </div>
                      )}
                      {pot.size_bonus > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Bonus Crescita:</span>
                          <span>+{Math.round(pot.size_bonus * 100)}%</span>
                        </div>
                      )}
                    </div>

                    {isUnlocked ? (
                      <Button
                        onClick={() => handleBuyPot(pot)}
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            In Uso
                          </>
                        ) : (
                          'Equipaggia'
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuyPot(pot)}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        disabled={pot.price > (progress?.leaf_currency || 0)}
                      >
                        {pot.price > (progress?.leaf_currency || 0) ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            {pot.price} Leaf
                          </>
                        ) : (
                          <>
                            <Leaf className="h-4 w-4 mr-2" />
                            Acquista ({pot.price} Leaf)
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedTab === 'seeds' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allSeeds.map(seed => {
              const isUnlocked = progress?.unlocked_seeds?.includes(seed.id);
              const isActive = progress?.active_seed === seed.id;
              const rarityColors = {
                common: 'border-gray-500/30',
                rare: 'border-blue-500/30',
                legendary: 'border-yellow-500/30'
              };

              return (
                <Card key={seed.id} className={`bg-black/40 backdrop-blur ${rarityColors[seed.rarity]} hover:brightness-110 transition-all`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white">{seed.strain_name}</CardTitle>
                      {isActive && <Badge className="bg-green-600">Attivo</Badge>}
                    </div>
                    <Badge variant="outline" className={`w-fit ${seed.rarity === 'legendary' ? 'text-yellow-400 border-yellow-400' : seed.rarity === 'rare' ? 'text-blue-400 border-blue-400' : 'text-gray-400'}`}>
                      {seed.rarity.toUpperCase()}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-green-900/20 rounded-lg p-4 mb-4 flex items-center justify-center">
                      <Sprout className="h-16 w-16 text-green-400" />
                    </div>
                    <p className="text-gray-300 text-sm mb-3">{seed.description}</p>

                    <div className="space-y-1 mb-4 text-xs">
                      <div className="flex justify-between text-green-400">
                        <span>Velocità Crescita:</span>
                        <span>x{seed.growth_speed}</span>
                      </div>
                      <div className="flex justify-between text-purple-400">
                        <span>Resistenza Parassiti:</span>
                        <span>+{seed.pest_resistance}%</span>
                      </div>
                      {seed.water_efficiency > 0 && (
                        <div className="flex justify-between text-cyan-400">
                          <span>Efficienza Idrica:</span>
                          <span>+{Math.round(seed.water_efficiency * 100)}%</span>
                        </div>
                      )}
                      {seed.max_health_bonus > 0 && (
                        <div className="flex justify-between text-red-400">
                          <span>Salute Max:</span>
                          <span>+{seed.max_health_bonus}</span>
                        </div>
                      )}
                    </div>

                    {isUnlocked ? (
                      <Button
                        onClick={() => handleBuySeed(seed)}
                        className="w-full"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Piantato
                          </>
                        ) : (
                          'Seleziona'
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleBuySeed(seed)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                        disabled={seed.price > (progress?.leaf_currency || 0)}
                      >
                        {seed.price > (progress?.leaf_currency || 0) ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            {seed.price} Leaf
                          </>
                        ) : (
                          <>
                            <Leaf className="h-4 w-4 mr-2" />
                            Acquista ({seed.price} Leaf)
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedTab === 'plant' && (
          <PlantCarePanel 
            progress={progress}
            onUpdate={async (updatedData) => {
              await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
            }}
          />
        )}
        </div>
        </div>
        );
        }