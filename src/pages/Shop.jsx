import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Leaf, Lock, Check, Zap, Target, Clock } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

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
    name: 'Velocità Spray', 
    icon: Zap,
    description: 'Aumenta la velocità di spruzzamento',
    maxLevel: 5,
    baseCost: 50,
    costMultiplier: 1.5
  },
  { 
    id: 'spray_range', 
    name: 'Raggio Spray', 
    icon: Target,
    description: 'Aumenta il raggio d\'azione dello spray',
    maxLevel: 5,
    baseCost: 75,
    costMultiplier: 1.5
  },
  { 
    id: 'refill_speed', 
    name: 'Ricarica Rapida', 
    icon: Clock,
    description: 'Ricarica più veloce della munizione',
    maxLevel: 5,
    baseCost: 60,
    costMultiplier: 1.5
  },
];

export default function Shop() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('skins');

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
            spray_range: 1,
            refill_speed: 1
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

        <div className="flex gap-3 mb-8">
          <Button
            onClick={() => setSelectedTab('skins')}
            variant={selectedTab === 'skins' ? 'default' : 'outline'}
            className={selectedTab === 'skins' ? 'bg-purple-600' : 'border-purple-600 text-white'}
          >
            Skin Spruzzino
          </Button>
          <Button
            onClick={() => setSelectedTab('upgrades')}
            variant={selectedTab === 'upgrades' ? 'default' : 'outline'}
            className={selectedTab === 'upgrades' ? 'bg-purple-600' : 'border-purple-600 text-white'}
          >
            Potenziamenti
          </Button>
        </div>

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
            {UPGRADES.map(upgrade => {
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
      </div>
    </div>
  );
}