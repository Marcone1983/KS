import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Zap, Target, Droplets, Shield, Clock, Flame, Snowflake, TrendingUp, Leaf, Award, Lock, Check } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import SkillTreeVisualizer from '../components/progression/SkillTreeVisualizer';

const SKILL_TREE_DATA = {
  combat: [
    {
      id: 'rapid_fire',
      name: 'Rapid Fire',
      icon: Zap,
      description: 'Increase spray rate by 25% per level',
      maxLevel: 5,
      cost: 2,
      prerequisites: [],
      effect: { spray_speed_bonus: 0.25 }
    },
    {
      id: 'sharpshooter',
      name: 'Sharpshooter',
      icon: Target,
      description: 'Increase spray accuracy and range',
      maxLevel: 3,
      cost: 3,
      prerequisites: ['rapid_fire'],
      effect: { spray_radius_bonus: 0.3, accuracy_bonus: 0.2 }
    },
    {
      id: 'devastation',
      name: 'Devastation',
      icon: Flame,
      description: '+50% damage per level',
      maxLevel: 5,
      cost: 3,
      prerequisites: ['sharpshooter'],
      effect: { damage_multiplier: 0.5 }
    },
    {
      id: 'frost_spray',
      name: 'Frost Spray',
      icon: Snowflake,
      description: 'Spray slows enemies by 40%',
      maxLevel: 1,
      cost: 5,
      prerequisites: ['devastation'],
      effect: { slow_effect: 40, slow_duration: 5 }
    },
    {
      id: 'chain_reaction',
      name: 'Chain Reaction',
      icon: Zap,
      description: 'Kills spread damage to nearby pests',
      maxLevel: 3,
      cost: 4,
      prerequisites: ['devastation'],
      effect: { chain_damage: 0.5, chain_radius: 1.5 }
    }
  ],
  cultivation: [
    {
      id: 'green_thumb',
      name: 'Green Thumb',
      icon: Leaf,
      description: '+15% plant growth rate per level',
      maxLevel: 5,
      cost: 2,
      prerequisites: [],
      effect: { growth_rate_bonus: 0.15 }
    },
    {
      id: 'water_retention',
      name: 'Water Retention',
      icon: Droplets,
      description: 'Reduce water consumption by 20%',
      maxLevel: 3,
      cost: 2,
      prerequisites: ['green_thumb'],
      effect: { water_efficiency: 0.2 }
    },
    {
      id: 'fortified_roots',
      name: 'Fortified Roots',
      icon: Shield,
      description: '+30% pest resistance per level',
      maxLevel: 5,
      cost: 3,
      prerequisites: ['green_thumb'],
      effect: { pest_resistance: 30 }
    },
    {
      id: 'photosynthesis_boost',
      name: 'Enhanced Photosynthesis',
      icon: TrendingUp,
      description: 'Generate health from light exposure',
      maxLevel: 3,
      cost: 4,
      prerequisites: ['fortified_roots', 'water_retention'],
      effect: { light_to_health: 0.1 }
    },
    {
      id: 'adaptive_growth',
      name: 'Adaptive Growth',
      icon: Award,
      description: 'Plant adapts to weather changes',
      maxLevel: 1,
      cost: 6,
      prerequisites: ['photosynthesis_boost'],
      effect: { weather_resistance: 0.5, seasonal_bonus: 0.3 }
    }
  ],
  utility: [
    {
      id: 'quick_refill',
      name: 'Quick Refill',
      icon: Clock,
      description: '+30% faster spray refill',
      maxLevel: 5,
      cost: 2,
      prerequisites: [],
      effect: { refill_speed_bonus: 0.3 }
    },
    {
      id: 'double_capacity',
      name: 'Double Capacity',
      icon: Droplets,
      description: '+20% max spray capacity per level',
      maxLevel: 3,
      cost: 3,
      prerequisites: ['quick_refill'],
      effect: { max_ammo_bonus: 20 }
    },
    {
      id: 'leaf_magnet',
      name: 'Leaf Magnet',
      icon: Leaf,
      description: '+25% Leaf currency earned',
      maxLevel: 5,
      cost: 3,
      prerequisites: [],
      effect: { leaf_multiplier: 0.25 }
    },
    {
      id: 'experience_boost',
      name: 'Fast Learner',
      icon: TrendingUp,
      description: '+50% skill points from matches',
      maxLevel: 3,
      cost: 4,
      prerequisites: ['leaf_magnet'],
      effect: { skill_point_multiplier: 0.5 }
    }
  ]
};

export default function PlayerProgression() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTree, setSelectedTree] = useState('combat');

  const { data: skillTree } = useQuery({
    queryKey: ['playerSkillTree'],
    queryFn: async () => {
      const trees = await base44.entities.PlayerSkillTree.list();
      if (trees.length === 0) {
        return await base44.entities.PlayerSkillTree.create({
          skill_points: 0,
          total_points_earned: 0,
          unlocked_skills: {},
          active_abilities: [],
          combat_tree: {},
          cultivation_tree: {},
          utility_tree: {}
        });
      }
      return trees[0];
    }
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const updateSkillTreeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerSkillTree.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerSkillTree'] });
    }
  });

  const handleUnlockSkill = async (skill) => {
    if (!skillTree) return;

    const currentLevel = skillTree.unlocked_skills[skill.id] || 0;

    if (currentLevel >= skill.maxLevel) {
      toast.error('Max level reached!');
      return;
    }

    if (skillTree.skill_points < skill.cost) {
      toast.error(`Need ${skill.cost} skill points!`);
      return;
    }

    const prerequisitesMet = skill.prerequisites.every(prereqId => {
      return (skillTree.unlocked_skills[prereqId] || 0) > 0;
    });

    if (!prerequisitesMet) {
      toast.error('Unlock prerequisites first!');
      return;
    }

    const updatedSkills = {
      ...skillTree.unlocked_skills,
      [skill.id]: currentLevel + 1
    };

    const treeKey = `${selectedTree}_tree`;
    const updatedTree = {
      ...skillTree[treeKey],
      [skill.id]: currentLevel + 1
    };

    await updateSkillTreeMutation.mutateAsync({
      id: skillTree.id,
      data: {
        skill_points: skillTree.skill_points - skill.cost,
        unlocked_skills: updatedSkills,
        [treeKey]: updatedTree
      }
    });

    toast.success(`${skill.name} upgraded to level ${currentLevel + 1}!`);
  };

  const getSkillLevel = (skillId) => {
    return skillTree?.unlocked_skills[skillId] || 0;
  };

  const isSkillAvailable = (skill) => {
    if (!skillTree) return false;
    return skill.prerequisites.every(prereqId => getSkillLevel(prereqId) > 0);
  };

  const treeData = SKILL_TREE_DATA[selectedTree] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Home'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <h1 className="text-5xl font-black text-white flex items-center gap-3">
              <Award className="w-12 h-12 text-purple-400" />
              Player Progression
            </h1>
          </div>

          <div className="bg-black/50 backdrop-blur rounded-lg px-6 py-3">
            <div className="text-sm text-gray-400">Available Skill Points</div>
            <div className="text-3xl font-black text-white">{skillTree?.skill_points || 0}</div>
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setSelectedTree('combat')}
            variant={selectedTree === 'combat' ? 'default' : 'outline'}
            className={selectedTree === 'combat' ? 'bg-red-600' : 'border-red-600 text-white'}
          >
            <Zap className="h-4 w-4 mr-2" />
            Combat
          </Button>
          <Button
            onClick={() => setSelectedTree('cultivation')}
            variant={selectedTree === 'cultivation' ? 'default' : 'outline'}
            className={selectedTree === 'cultivation' ? 'bg-green-600' : 'border-green-600 text-white'}
          >
            <Leaf className="h-4 w-4 mr-2" />
            Cultivation
          </Button>
          <Button
            onClick={() => setSelectedTree('utility')}
            variant={selectedTree === 'utility' ? 'default' : 'outline'}
            className={selectedTree === 'utility' ? 'bg-cyan-600' : 'border-cyan-600 text-white'}
          >
            <Clock className="h-4 w-4 mr-2" />
            Utility
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-black/40 backdrop-blur border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white text-2xl capitalize">{selectedTree} Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {treeData.map(skill => {
                  const currentLevel = getSkillLevel(skill.id);
                  const isAvailable = isSkillAvailable(skill);
                  const isMaxed = currentLevel >= skill.maxLevel;
                  const Icon = skill.icon;

                  return (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isMaxed ? 'bg-gradient-to-r from-yellow-900/30 to-green-900/30 border-yellow-500/50' :
                        currentLevel > 0 ? 'bg-purple-900/30 border-purple-500/50' :
                        isAvailable ? 'bg-gray-800/50 border-gray-600 hover:border-purple-500/50' :
                        'bg-gray-900/30 border-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${
                            isMaxed ? 'text-yellow-400' :
                            currentLevel > 0 ? 'text-purple-400' :
                            isAvailable ? 'text-white' : 'text-gray-600'
                          }`} />
                          <div>
                            <div className="text-white font-bold text-lg">{skill.name}</div>
                            <div className="text-sm text-gray-400">{skill.description}</div>
                          </div>
                        </div>
                        
                        {isMaxed && (
                          <Check className="w-6 h-6 text-yellow-400" />
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-400">
                          Level: <span className="text-white font-bold">{currentLevel} / {skill.maxLevel}</span>
                        </div>

                        <Button
                          onClick={() => handleUnlockSkill(skill)}
                          size="sm"
                          disabled={!isAvailable || isMaxed || (skillTree?.skill_points || 0) < skill.cost}
                          className={`${
                            isMaxed ? 'bg-gray-600' :
                            isAvailable ? 'bg-purple-600 hover:bg-purple-700' :
                            'bg-gray-700'
                          }`}
                        >
                          {isMaxed ? (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Maxed
                            </>
                          ) : !isAvailable ? (
                            <>
                              <Lock className="w-4 h-4 mr-1" />
                              Locked
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-1" />
                              Unlock ({skill.cost} SP)
                            </>
                          )}
                        </Button>
                      </div>

                      {skill.prerequisites.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Requires: {skill.prerequisites.map(p => 
                            treeData.find(s => s.id === p)?.name
                          ).join(', ')}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-black/40 backdrop-blur border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-white">Progression Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Skill Points:</span>
                  <span className="text-2xl font-black text-yellow-400">{skillTree?.skill_points || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Earned:</span>
                  <span className="text-lg font-bold text-white">{skillTree?.total_points_earned || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Level:</span>
                  <span className="text-lg font-bold text-white">{progress?.current_level || 1}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white text-sm">How to Earn Skill Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <div className="flex items-start gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <span>Complete levels (1-3 points based on performance)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-red-400 mt-0.5" />
                  <span>Eliminate 100 pests (1 point)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Award className="w-4 h-4 text-purple-400 mt-0.5" />
                  <span>Defeat bosses (2-5 points)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 mt-0.5" />
                  <span>Perfect health completion (bonus 2 points)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur border-cyan-500/30">
              <CardHeader>
                <CardTitle className="text-white text-sm">Active Bonuses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(skillTree?.unlocked_skills || {}).filter(id => (skillTree?.unlocked_skills[id] || 0) > 0).map(skillId => {
                  const skill = [...SKILL_TREE_DATA.combat, ...SKILL_TREE_DATA.cultivation, ...SKILL_TREE_DATA.utility].find(s => s.id === skillId);
                  if (!skill) return null;
                  
                  const level = skillTree.unlocked_skills[skillId];
                  const Icon = skill.icon;
                  
                  return (
                    <div key={skillId} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
                      <Icon className="w-4 h-4 text-purple-400" />
                      <span className="text-white text-xs flex-1">{skill.name}</span>
                      <span className="text-xs text-gray-400">Lv.{level}</span>
                    </div>
                  );
                })}
                
                {Object.keys(skillTree?.unlocked_skills || {}).filter(id => (skillTree?.unlocked_skills[id] || 0) > 0).length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No skills unlocked yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}