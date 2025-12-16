import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Star, Trophy, Zap, Shield, Target, TrendingUp, Award, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_TREE = {
  combat: [
    { id: 'spray_damage_1', name: 'Spray Damage I', description: '+10% spray damage', cost: 1, maxLevel: 5, bonus: { spray_damage: 0.1 }, prerequisite: null },
    { id: 'spray_speed_1', name: 'Spray Speed I', description: '+15% fire rate', cost: 1, maxLevel: 5, bonus: { spray_speed: 0.15 }, prerequisite: null },
    { id: 'spray_damage_2', name: 'Spray Damage II', description: '+15% spray damage', cost: 2, maxLevel: 3, bonus: { spray_damage: 0.15 }, prerequisite: 'spray_damage_1' },
    { id: 'critical_hit', name: 'Critical Hit', description: '20% chance for 2x damage', cost: 3, maxLevel: 1, bonus: { critical_chance: 0.2 }, prerequisite: 'spray_damage_2' },
    { id: 'multishot', name: 'Multi-Shot', description: 'Fire 2 sprays at once', cost: 5, maxLevel: 1, bonus: { multishot: 2 }, prerequisite: 'spray_speed_1' }
  ],
  defense: [
    { id: 'plant_health_1', name: 'Fortify I', description: '+20 max health', cost: 1, maxLevel: 5, bonus: { max_health: 20 }, prerequisite: null },
    { id: 'damage_reduction_1', name: 'Armor I', description: '-10% damage taken', cost: 1, maxLevel: 5, bonus: { damage_reduction: 0.1 }, prerequisite: null },
    { id: 'regeneration', name: 'Regeneration', description: '+0.5 HP/s regen', cost: 2, maxLevel: 3, bonus: { health_regen: 0.5 }, prerequisite: 'plant_health_1' },
    { id: 'thorns', name: 'Thorns', description: 'Reflect 20% damage', cost: 3, maxLevel: 1, bonus: { thorns: 0.2 }, prerequisite: 'damage_reduction_1' }
  ],
  utility: [
    { id: 'resource_boost_1', name: 'Leaf Boost I', description: '+20% Leaf currency', cost: 1, maxLevel: 5, bonus: { resource_bonus: 0.2 }, prerequisite: null },
    { id: 'xp_boost', name: 'Experience', description: '+15% XP gain', cost: 2, maxLevel: 3, bonus: { xp_multiplier: 0.15 }, prerequisite: null },
    { id: 'powerup_magnet', name: 'Power-Up Magnet', description: '+50% pickup range', cost: 2, maxLevel: 1, bonus: { pickup_range: 0.5 }, prerequisite: null },
    { id: 'slow_aura', name: 'Slow Aura', description: 'Slow nearby pests 20%', cost: 4, maxLevel: 1, bonus: { slow_aura: 0.2 }, prerequisite: 'resource_boost_1' }
  ]
};

const COSMETICS = [
  { id: 'golden_plant', name: 'Golden Plant', description: 'Shiny golden plant skin', requirement: { type: 'level', value: 10 }, icon: '🌟' },
  { id: 'crystal_plant', name: 'Crystal Plant', description: 'Crystalline beauty', requirement: { type: 'level', value: 20 }, icon: '💎' },
  { id: 'neon_spray', name: 'Neon Spray', description: 'Neon spray effects', requirement: { type: 'achievement', value: 'wave_master' }, icon: '⚡' },
  { id: 'fire_terrain', name: 'Volcanic Terrain', description: 'Fiery environment', requirement: { type: 'level', value: 15 }, icon: '🌋' },
  { id: 'ice_terrain', name: 'Frozen Tundra', description: 'Icy landscape', requirement: { type: 'level', value: 15 }, icon: '❄️' },
  { id: 'rainbow_plant', name: 'Rainbow Plant', description: 'Colorful spectrum', requirement: { type: 'achievement', value: 'perfect_10' }, icon: '🌈' }
];

export default function Progression() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('combat');

  const { data: progression } = useQuery({
    queryKey: ['playerProgression'],
    queryFn: async () => {
      const list = await base44.entities.PlayerProgression.list();
      if (list.length === 0) {
        return await base44.entities.PlayerProgression.create({
          player_level: 1,
          total_xp: 0,
          current_xp: 0,
          xp_to_next_level: 100,
          skill_points: 0,
          unlocked_skills: {},
          unlocked_cosmetics: [],
          active_cosmetics: {
            plant_skin: 'default',
            terrain_theme: 'forest',
            spray_effect: 'default'
          },
          achievements_unlocked: [],
          stats: {
            total_games: 0,
            total_waves_completed: 0,
            total_pests_killed: 0,
            total_time_played: 0,
            highest_wave: 0,
            perfect_waves: 0
          }
        });
      }
      return list[0];
    }
  });

  const unlockSkillMutation = useMutation({
    mutationFn: async ({ skillId, cost }) => {
      if (!progression) return;
      
      if (progression.skill_points < cost) {
        throw new Error('Punti abilità insufficienti');
      }

      const unlockedSkills = { ...progression.unlocked_skills };
      const currentLevel = unlockedSkills[skillId] || 0;
      unlockedSkills[skillId] = currentLevel + 1;

      return await base44.entities.PlayerProgression.update(progression.id, {
        skill_points: progression.skill_points - cost,
        unlocked_skills: unlockedSkills
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerProgression'] });
      toast.success('Abilità sbloccata!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const unlockCosmeticMutation = useMutation({
    mutationFn: async (cosmeticId) => {
      if (!progression) return;

      const unlocked = [...progression.unlocked_cosmetics, cosmeticId];

      return await base44.entities.PlayerProgression.update(progression.id, {
        unlocked_cosmetics: unlocked
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerProgression'] });
      toast.success('Cosmetico sbloccato!');
    }
  });

  const activateCosmeticMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      if (!progression) return;

      const active = { ...progression.active_cosmetics };
      active[type] = id;

      return await base44.entities.PlayerProgression.update(progression.id, {
        active_cosmetics: active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerProgression'] });
      toast.success('Cosmetico attivato!');
    }
  });

  if (!progression) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  const levelProgress = (progression.current_xp / progression.xp_to_next_level) * 100;

  const canUnlockSkill = (skill) => {
    if (!skill.prerequisite) return true;
    const prereqLevel = progression.unlocked_skills[skill.prerequisite] || 0;
    return prereqLevel > 0;
  };

  const canUnlockCosmetic = (cosmetic) => {
    if (cosmetic.requirement.type === 'level') {
      return progression.player_level >= cosmetic.requirement.value;
    } else if (cosmetic.requirement.type === 'achievement') {
      return progression.achievements_unlocked.includes(cosmetic.requirement.value);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-2">
              Player Progression
            </h1>
            <p className="text-gray-400">Level up, unlock skills, and customize your game</p>
          </div>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="bg-gray-900 border-purple-500 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl text-white">Level {progression.player_level}</CardTitle>
                  <p className="text-gray-400">{progression.current_xp} / {progression.xp_to_next_level} XP</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-400">{progression.skill_points}</div>
                <div className="text-sm text-gray-400">Skill Points</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={levelProgress} className="h-4" />
          </CardContent>
        </Card>

        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-800">
            <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600">
              <Zap className="w-4 h-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="cosmetics" className="data-[state=active]:bg-pink-600">
              <Trophy className="w-4 h-4 mr-2" />
              Cosmetics
            </TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600">
              <TrendingUp className="w-4 h-4 mr-2" />
              Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="skills">
            <div className="mb-4 flex gap-2">
              {Object.keys(SKILL_TREE).map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category ? 'bg-purple-600' : 'bg-gray-800'}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SKILL_TREE[selectedCategory].map((skill) => {
                const currentLevel = progression.unlocked_skills[skill.id] || 0;
                const canUnlock = canUnlockSkill(skill) && currentLevel < skill.maxLevel && progression.skill_points >= skill.cost;
                const isMaxed = currentLevel >= skill.maxLevel;

                return (
                  <Card key={skill.id} className={`${canUnlock ? 'bg-gray-800 border-purple-500' : isMaxed ? 'bg-green-900 border-green-500' : 'bg-gray-900 border-gray-700'}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-white">{skill.name}</CardTitle>
                        {isMaxed ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : !canUnlockSkill(skill) ? (
                          <Lock className="w-6 h-6 text-gray-500" />
                        ) : (
                          <Badge className="bg-purple-600">{skill.cost} SP</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{skill.description}</p>
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Level {currentLevel}/{skill.maxLevel}</div>
                        <Progress value={(currentLevel / skill.maxLevel) * 100} className="h-2" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        disabled={!canUnlock}
                        onClick={() => unlockSkillMutation.mutate({ skillId: skill.id, cost: skill.cost })}
                      >
                        {isMaxed ? 'Maxed' : canUnlockSkill(skill) ? 'Unlock' : 'Locked'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="cosmetics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COSMETICS.map((cosmetic) => {
                const isUnlocked = progression.unlocked_cosmetics.includes(cosmetic.id);
                const canUnlock = canUnlockCosmetic(cosmetic);

                return (
                  <Card key={cosmetic.id} className={`${isUnlocked ? 'bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500' : canUnlock ? 'bg-gray-800 border-green-500' : 'bg-gray-900 border-gray-700'}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-4xl">{cosmetic.icon}</div>
                        <div className="flex-1">
                          <CardTitle className="text-white">{cosmetic.name}</CardTitle>
                          <p className="text-xs text-gray-400">{cosmetic.description}</p>
                        </div>
                        {isUnlocked && <CheckCircle className="w-6 h-6 text-green-400" />}
                      </div>
                      <Badge className={canUnlock || isUnlocked ? 'bg-green-600' : 'bg-gray-600'}>
                        {cosmetic.requirement.type === 'level' ? `Level ${cosmetic.requirement.value}` : cosmetic.requirement.value}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      {isUnlocked ? (
                        <Button className="w-full bg-purple-600" onClick={() => activateCosmeticMutation.mutate({ type: 'plant_skin', id: cosmetic.id })}>
                          Activate
                        </Button>
                      ) : canUnlock ? (
                        <Button className="w-full bg-green-600" onClick={() => unlockCosmeticMutation.mutate(cosmetic.id)}>
                          Unlock
                        </Button>
                      ) : (
                        <Button className="w-full" disabled>
                          <Lock className="w-4 h-4 mr-2" />
                          Locked
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gray-900 border-blue-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-blue-400" />
                    Games Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{progression.stats.total_games}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-green-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-400" />
                    Waves Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{progression.stats.total_waves_completed}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-red-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-red-400" />
                    Pests Killed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{progression.stats.total_pests_killed}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-purple-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Highest Wave
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{progression.stats.highest_wave}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-yellow-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Perfect Waves
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{progression.stats.perfect_waves}</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-pink-500">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-pink-400" />
                    Time Played
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-white">{Math.floor(progression.stats.total_time_played / 60)}m</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}