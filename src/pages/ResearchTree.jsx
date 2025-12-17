import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Leaf, Lock, Check, Zap, Shield, TrendingUp, Sparkles } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function ResearchTree() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedNode, setSelectedNode] = useState(null);

  const { data: allNodes } = useQuery({
    queryKey: ['researchNodes'],
    queryFn: () => base44.entities.ResearchNode.list(),
    initialData: []
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GameProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
    }
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ResearchNode.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchNodes'] });
    }
  });

  const unlockedNodes = progress?.unlocked_research || [];
  const researchPoints = progress?.research_points || 0;

  const canUnlock = (node) => {
    if (unlockedNodes.includes(node.node_id)) return false;
    
    const hasPrerequisites = (node.prerequisites || []).every(prereq => 
      unlockedNodes.includes(prereq)
    );
    
    const hasResources = 
      progress.leaf_currency >= node.cost_leaf &&
      researchPoints >= (node.cost_research_points || 0);
    
    return hasPrerequisites && hasResources;
  };

  const unlockResearch = async (node) => {
    if (!canUnlock(node)) {
      toast.error('Prerequisiti non soddisfatti');
      return;
    }

    const updates = {
      ...progress,
      leaf_currency: progress.leaf_currency - node.cost_leaf,
      research_points: researchPoints - (node.cost_research_points || 0),
      unlocked_research: [...unlockedNodes, node.node_id]
    };

    if (node.bonuses) {
      updates.research_bonuses = {
        ...progress.research_bonuses,
        [node.node_id]: node.bonuses
      };
    }

    if (node.unlocks) {
      node.unlocks.forEach(unlock => {
        if (unlock.startsWith('seed_')) {
          updates.unlocked_seeds = [...(progress.unlocked_seeds || []), unlock];
        }
      });
    }

    await updateProgressMutation.mutateAsync({ id: progress.id, data: updates });
    
    const updatedNode = {
      ...node,
      unlocked_by_users: [...(node.unlocked_by_users || []), progress.created_by]
    };
    await updateNodeMutation.mutateAsync({ id: node.id, data: updatedNode });

    toast.success(`Ricerca sbloccata: ${node.name}`);
  };

  const categoryIcons = {
    growth: TrendingUp,
    defense: Shield,
    efficiency: Zap,
    special: Sparkles
  };

  const tierColors = {
    1: 'border-gray-500',
    2: 'border-green-500',
    3: 'border-blue-500',
    4: 'border-purple-500',
    5: 'border-yellow-500'
  };

  const groupedNodes = allNodes.reduce((acc, node) => {
    if (!acc[node.category]) acc[node.category] = {};
    if (!acc[node.category][node.tier]) acc[node.category][node.tier] = [];
    acc[node.category][node.tier].push(node);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 md:mb-8 gap-4 w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('Shop'))}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Indietro
            </Button>
            <h1 className="text-4xl font-bold text-white">Albero Ricerche</h1>
          </div>

          <div className="flex gap-4">
            <div className="bg-black/50 backdrop-blur rounded-lg px-6 py-3">
              <div className="text-sm text-gray-400">Punti Ricerca</div>
              <div className="text-2xl font-bold text-cyan-400">{researchPoints}</div>
            </div>
            <div className="bg-black/50 backdrop-blur rounded-lg px-6 py-3">
              <div className="text-sm text-gray-400">Leaf</div>
              <div className="text-2xl font-bold text-green-400">{progress?.leaf_currency || 0}</div>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {Object.entries(groupedNodes).map(([category, tiers]) => {
            const Icon = categoryIcons[category] || Sparkles;
            
            return (
              <div key={category}>
                <div className="flex items-center gap-3 mb-6">
                  <Icon className="h-8 w-8 text-white" />
                  <h2 className="text-3xl font-bold text-white capitalize">{category}</h2>
                </div>

                <div className="space-y-6">
                  {Object.entries(tiers).sort(([a], [b]) => a - b).map(([tier, nodes]) => (
                    <div key={tier}>
                      <div className="text-sm text-gray-400 mb-3">Tier {tier}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {nodes.map(node => {
                          const isUnlocked = unlockedNodes.includes(node.node_id);
                          const canUnlockNode = canUnlock(node);
                          
                          return (
                            <Card
                              key={node.id}
                              className={`cursor-pointer transition-all ${
                                isUnlocked
                                  ? 'bg-green-900/30 border-green-500'
                                  : canUnlockNode
                                  ? 'bg-blue-900/30 border-blue-500 hover:border-blue-400'
                                  : 'bg-gray-900/30 border-gray-700'
                              } ${tierColors[node.tier]}`}
                              onClick={() => setSelectedNode(node)}
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-white text-sm flex items-center justify-between">
                                  <span>{node.name}</span>
                                  {isUnlocked && <Check className="h-4 w-4 text-green-400" />}
                                  {!isUnlocked && !canUnlockNode && <Lock className="h-4 w-4 text-gray-500" />}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-xs text-gray-300 mb-3">{node.description}</p>
                                
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Costo:</span>
                                    <span className="text-green-400">{node.cost_leaf} Leaf</span>
                                  </div>
                                  {node.cost_research_points > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Ricerca:</span>
                                      <span className="text-cyan-400">{node.cost_research_points} RP</span>
                                    </div>
                                  )}
                                </div>

                                {!isUnlocked && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unlockResearch(node);
                                    }}
                                    disabled={!canUnlockNode}
                                    className="w-full mt-3 text-xs"
                                    size="sm"
                                  >
                                    {canUnlockNode ? 'Sblocca' : 'Bloccato'}
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedNode && (
          <Card className="fixed inset-0 m-auto w-[500px] h-fit bg-gray-900 border-2 border-purple-500 z-50">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                {selectedNode.name}
                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">{selectedNode.description}</p>
              
              {selectedNode.bonuses && (
                <div className="bg-black/40 rounded p-3 mb-4">
                  <div className="text-white font-semibold mb-2">Bonus:</div>
                  <div className="space-y-1 text-sm">
                    {Object.entries(selectedNode.bonuses).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-400">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-green-400">+{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.unlocks && selectedNode.unlocks.length > 0 && (
                <div className="bg-purple-900/30 rounded p-3">
                  <div className="text-white font-semibold mb-2">Sblocca:</div>
                  <div className="space-y-1 text-sm text-purple-300">
                    {selectedNode.unlocks.map((unlock, idx) => (
                      <div key={idx}>• {unlock}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}