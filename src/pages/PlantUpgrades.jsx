import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Leaf, TrendingUp, Shield, Droplets, Sun, Sparkles, Lock } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

const PLANT_UPGRADES = [
  {
    id: 'max_health',
    name: 'Salute Massima',
    icon: Shield,
    category: 'defense',
    stat: 'max_health_bonus',
    description: 'Aumenta la salute massima della pianta',
    boost_per_level: 10,
    max_level: 20,
    base_cost: 100,
    cost_multiplier: 1.4
  },
  {
    id: 'pest_resistance',
    name: 'Resistenza Parassiti',
    icon: Shield,
    category: 'defense',
    stat: 'resistance_bonus',
    description: 'Riduce il danno subito dai parassiti',
    boost_per_level: 2,
    max_level: 25,
    base_cost: 80,
    cost_multiplier: 1.5
  },
  {
    id: 'growth_speed',
    name: 'Velocità Crescita',
    icon: TrendingUp,
    category: 'growth',
    stat: 'growth_speed',
    description: 'Accelera la crescita della pianta',
    boost_per_level: 0.1,
    max_level: 15,
    base_cost: 120,
    cost_multiplier: 1.6
  },
  {
    id: 'water_efficiency',
    name: 'Efficienza Idrica',
    icon: Droplets,
    category: 'resource',
    stat: 'water_efficiency',
    description: 'Riduce il consumo di acqua',
    boost_per_level: 2,
    max_level: 15,
    base_cost: 90,
    cost_multiplier: 1.5
  },
  {
    id: 'nutrient_absorption',
    name: 'Assorbimento Nutrienti',
    icon: Sparkles,
    category: 'resource',
    stat: 'nutrient_efficiency',
    description: 'Migliora l\'assorbimento dei nutrienti',
    boost_per_level: 3,
    max_level: 15,
    base_cost: 100,
    cost_multiplier: 1.5
  },
  {
    id: 'light_efficiency',
    name: 'Efficienza Luminosa',
    icon: Sun,
    category: 'resource',
    stat: 'light_efficiency',
    description: 'Ottimizza l\'uso della luce solare',
    boost_per_level: 2,
    max_level: 15,
    base_cost: 85,
    cost_multiplier: 1.4
  },
  {
    id: 'auto_defense',
    name: 'Difesa Automatica',
    icon: Shield,
    category: 'passive',
    stat: 'auto_defense_chance',
    description: 'Chance di respingere automaticamente i parassiti',
    boost_per_level: 1,
    max_level: 10,
    base_cost: 200,
    cost_multiplier: 2.0
  },
  {
    id: 'regeneration',
    name: 'Rigenerazione',
    icon: Sparkles,
    category: 'passive',
    stat: 'regeneration_rate',
    description: 'Rigenera salute nel tempo',
    boost_per_level: 0.5,
    max_level: 10,
    base_cost: 250,
    cost_multiplier: 2.2
  }
];

export default function PlantUpgrades() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');

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
          plant_upgrades: {},
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

  const getUpgradeLevel = (upgradeId) => {
    return progress?.plant_upgrades?.[upgradeId] || 0;
  };

  const getUpgradeCost = (upgrade) => {
    const currentLevel = getUpgradeLevel(upgrade.id);
    return Math.floor(upgrade.base_cost * Math.pow(upgrade.cost_multiplier, currentLevel));
  };

  const handleBuyUpgrade = async (upgrade) => {
    if (!progress) return;

    const currentLevel = getUpgradeLevel(upgrade.id);
    
    if (currentLevel >= upgrade.max_level) {
      toast.error('Livello massimo raggiunto!');
      return;
    }

    const cost = getUpgradeCost(upgrade);

    if (progress.leaf_currency < cost) {
      toast.error('Leaf insufficienti!');
      return;
    }

    const newLevel = currentLevel + 1;
    const newPlantUpgrades = {
      ...progress.plant_upgrades,
      [upgrade.id]: newLevel
    };

    const updatedPlantStats = { ...progress.plant_stats };
    
    if (upgrade.stat === 'resistance_bonus') {
      updatedPlantStats.resistance_bonus = (updatedPlantStats.resistance_bonus || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'max_health_bonus') {
      updatedPlantStats.max_health_bonus = (updatedPlantStats.max_health_bonus || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'water_efficiency') {
      updatedPlantStats.water_efficiency = (updatedPlantStats.water_efficiency || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'nutrient_efficiency') {
      updatedPlantStats.nutrient_efficiency = (updatedPlantStats.nutrient_efficiency || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'light_efficiency') {
      updatedPlantStats.light_efficiency = (updatedPlantStats.light_efficiency || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'growth_speed') {
      updatedPlantStats.growth_speed_bonus = (updatedPlantStats.growth_speed_bonus || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'auto_defense_chance') {
      updatedPlantStats.auto_defense_chance = (updatedPlantStats.auto_defense_chance || 0) + upgrade.boost_per_level;
    } else if (upgrade.stat === 'regeneration_rate') {
      updatedPlantStats.regeneration_rate = (updatedPlantStats.regeneration_rate || 0) + upgrade.boost_per_level;
    }

    const updatedData = {
      ...progress,
      leaf_currency: progress.leaf_currency - cost,
      plant_upgrades: newPlantUpgrades,
      plant_stats: updatedPlantStats
    };

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updatedData });
    toast.success(`${upgrade.name} potenziato a livello ${newLevel}!`);
  };

  const filteredUpgrades = selectedCategory === 'all' 
    ? PLANT_UPGRADES 
    : PLANT_UPGRADES.filter(u => u.category === selectedCategory);

  const categoryColors = {
    defense: 'border-red-500/30 hover:border-red-500/60',
    growth: 'border-green-500/30 hover:border-green-500/60',
    resource: 'border-blue-500/30 hover:border-blue-500/60',
    passive: 'border-purple-500/30 hover:border-purple-500/60'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Shop'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Indietro
            </Button>
            <h1 className="text-4xl font-bold text-white">Potenziamenti Pianta</h1>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-lg px-6 py-3 flex items-center gap-3">
            <Leaf className="h-6 w-6 text-green-400" />
            <div>
              <div className="text-sm text-gray-400">I tuoi Leaf</div>
              <div className="text-2xl font-bold text-white">{progress?.leaf_currency || 0}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          <Button
            onClick={() => setSelectedCategory('all')}
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className={selectedCategory === 'all' ? 'bg-green-600' : 'border-green-400 text-white'}
          >
            Tutti
          </Button>
          <Button
            onClick={() => setSelectedCategory('defense')}
            variant={selectedCategory === 'defense' ? 'default' : 'outline'}
            className={selectedCategory === 'defense' ? 'bg-red-600' : 'border-red-400 text-white'}
          >
            <Shield className="h-4 w-4 mr-2" />
            Difesa
          </Button>
          <Button
            onClick={() => setSelectedCategory('growth')}
            variant={selectedCategory === 'growth' ? 'default' : 'outline'}
            className={selectedCategory === 'growth' ? 'bg-green-600' : 'border-green-400 text-white'}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Crescita
          </Button>
          <Button
            onClick={() => setSelectedCategory('resource')}
            variant={selectedCategory === 'resource' ? 'default' : 'outline'}
            className={selectedCategory === 'resource' ? 'bg-blue-600' : 'border-blue-400 text-white'}
          >
            <Droplets className="h-4 w-4 mr-2" />
            Risorse
          </Button>
          <Button
            onClick={() => setSelectedCategory('passive')}
            variant={selectedCategory === 'passive' ? 'default' : 'outline'}
            className={selectedCategory === 'passive' ? 'bg-purple-600' : 'border-purple-400 text-white'}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Passivi
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUpgrades.map(upgrade => {
            const currentLevel = getUpgradeLevel(upgrade.id);
            const cost = getUpgradeCost(upgrade);
            const isMaxLevel = currentLevel >= upgrade.max_level;
            const Icon = upgrade.icon;

            return (
              <Card key={upgrade.id} className={`bg-black/40 backdrop-blur ${categoryColors[upgrade.category]} transition-all`}>
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
                      <span className="text-white font-bold">{currentLevel} / {upgrade.max_level}</span>
                    </div>
                    <Progress 
                      value={(currentLevel / upgrade.max_level) * 100} 
                      className="h-2 bg-gray-700"
                      indicatorClassName="bg-gradient-to-r from-green-500 to-emerald-500"
                    />
                  </div>

                  {currentLevel > 0 && (
                    <div className="mb-4 p-2 bg-green-900/30 rounded border border-green-500/30">
                      <div className="text-xs text-green-400">
                        Bonus Attuale: +{(currentLevel * upgrade.boost_per_level).toFixed(1)}
                        {upgrade.stat.includes('chance') ? '%' : ''}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => handleBuyUpgrade(upgrade)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    disabled={isMaxLevel || cost > (progress?.leaf_currency || 0)}
                  >
                    {isMaxLevel ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
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
      </div>
    </div>
  );
}