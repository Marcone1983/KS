import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Target, Clock, Trophy, Zap, Award, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Challenges() {
  const queryClient = useQueryClient();

  const { data: allChallenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => base44.entities.Challenge.list(),
    initialData: []
  });

  const { data: playerChallenges } = useQuery({
    queryKey: ['playerChallenges'],
    queryFn: () => base44.entities.PlayerChallenge.list(),
    initialData: []
  });

  const { data: progression } = useQuery({
    queryKey: ['playerProgression'],
    queryFn: async () => {
      const list = await base44.entities.PlayerProgression.list();
      return list.length > 0 ? list[0] : null;
    }
  });

  const { data: gameProgress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const list = await base44.entities.GameProgress.list();
      return list.length > 0 ? list[0] : null;
    }
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (challenge) => {
      return await base44.entities.PlayerChallenge.create({
        challenge_id: challenge.id,
        challenge_name: challenge.challenge_name,
        status: 'active',
        progress: { current: 0, target: Object.values(challenge.requirements)[0] },
        started_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerChallenges'] });
      toast.success('Challenge started!');
    }
  });

  const claimRewardsMutation = useMutation({
    mutationFn: async ({ playerChallengeId, rewards }) => {
      const playerChallenge = playerChallenges.find(pc => pc.id === playerChallengeId);
      if (!playerChallenge) return;

      await base44.entities.PlayerChallenge.update(playerChallengeId, {
        rewards_claimed: true
      });

      if (progression?.id) {
        const updates = {
          total_xp: (progression.total_xp || 0) + (rewards.xp || 0),
          current_xp: (progression.current_xp || 0) + (rewards.xp || 0)
        };

        if (updates.current_xp >= (progression.xp_to_next_level || 100)) {
          updates.player_level = (progression.player_level || 1) + 1;
          updates.current_xp = updates.current_xp - (progression.xp_to_next_level || 100);
          updates.xp_to_next_level = Math.floor((progression.xp_to_next_level || 100) * 1.5);
          updates.skill_points = (progression.skill_points || 0) + 1;
        }

        await base44.entities.PlayerProgression.update(progression.id, updates);
      }

      if (gameProgress?.id && rewards.leaf) {
        await base44.entities.GameProgress.update(gameProgress.id, {
          leaf_currency: (gameProgress.leaf_currency || 0) + rewards.leaf
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerChallenges'] });
      queryClient.invalidateQueries({ queryKey: ['playerProgression'] });
      queryClient.invalidateQueries({ queryKey: ['gameProgress'] });
      toast.success('Rewards claimed!');
    }
  });

  const activeChallenges = useMemo(() => {
    return playerChallenges.filter(pc => pc.status === 'active');
  }, [playerChallenges]);

  const completedChallenges = useMemo(() => {
    return playerChallenges.filter(pc => pc.status === 'completed');
  }, [playerChallenges]);

  const dailyChallenges = useMemo(() => {
    return allChallenges.filter(c => c.type === 'daily' && c.is_active);
  }, [allChallenges]);

  const weeklyChallenges = useMemo(() => {
    return allChallenges.filter(c => c.type === 'weekly' && c.is_active);
  }, [allChallenges]);

  const standardChallenges = useMemo(() => {
    return allChallenges.filter(c => !['daily', 'weekly'].includes(c.type) && c.is_active);
  }, [allChallenges]);

  const getDifficultyColor = (difficulty) => {
    return {
      easy: 'bg-green-600',
      medium: 'bg-yellow-600',
      hard: 'bg-orange-600',
      expert: 'bg-red-600'
    }[difficulty] || 'bg-gray-600';
  };

  const getRarityColor = (rarity) => {
    return {
      common: 'text-gray-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-yellow-400'
    }[rarity] || 'text-gray-400';
  };

  const renderChallengeCard = (challenge, playerChallenge = null) => {
    const isStarted = !!playerChallenge;
    const isCompleted = playerChallenge?.status === 'completed';
    const progress = playerChallenge?.progress || { current: 0, target: Object.values(challenge.requirements)[0] };
    const progressPercent = (progress.current / progress.target) * 100;

    return (
      <motion.div
        key={challenge.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={`${isCompleted ? 'bg-gradient-to-br from-green-900 to-emerald-900 border-green-500' : 'bg-gray-900 border-gray-700'} hover:shadow-2xl transition-all`}>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`w-6 h-6 ${getRarityColor(challenge.rarity)}`} />
                <CardTitle className="text-white">{challenge.challenge_name}</CardTitle>
              </div>
              <Badge className={getDifficultyColor(challenge.difficulty)}>
                {challenge.difficulty}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">{challenge.description}</p>

            {isStarted && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{progress.current} / {progress.target}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1 text-sm">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-white">{challenge.rewards?.xp || 0} XP</span>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Award className="w-4 h-4 text-green-400" />
                <span className="text-white">{challenge.rewards?.leaf || 0} Leaf</span>
              </div>
            </div>

            {!isStarted ? (
              <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => startChallengeMutation.mutate(challenge)}>
                Start Challenge
              </Button>
            ) : isCompleted && !playerChallenge.rewards_claimed ? (
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => claimRewardsMutation.mutate({ playerChallengeId: playerChallenge.id, rewards: challenge.rewards })}>
                Claim Rewards
              </Button>
            ) : isCompleted ? (
              <Button className="w-full" disabled>
                Completed
              </Button>
            ) : (
              <Button className="w-full" variant="outline">
                In Progress
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent mb-2">
              Challenges
            </h1>
            <p className="text-gray-400">Complete objectives for bonus rewards</p>
          </div>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="bg-gray-800 border-gray-700 hover:bg-gray-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-900 to-cyan-900 border-blue-500">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{activeChallenges.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900 to-emerald-900 border-green-500">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{completedChallenges.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Available
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{allChallenges.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-800">
            <TabsTrigger value="daily" className="data-[state=active]:bg-orange-600">
              <Calendar className="w-4 h-4 mr-2" />
              Daily
            </TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-red-600">
              <Clock className="w-4 h-4 mr-2" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="standard" className="data-[state=active]:bg-purple-600">
              <Target className="w-4 h-4 mr-2" />
              Standard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyChallenges.map(challenge => {
                const playerChallenge = playerChallenges.find(pc => pc.challenge_id === challenge.id);
                return renderChallengeCard(challenge, playerChallenge);
              })}
              {dailyChallenges.length === 0 && (
                <div className="col-span-3 text-center text-gray-400 py-12">
                  No daily challenges available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="weekly">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weeklyChallenges.map(challenge => {
                const playerChallenge = playerChallenges.find(pc => pc.challenge_id === challenge.id);
                return renderChallengeCard(challenge, playerChallenge);
              })}
              {weeklyChallenges.length === 0 && (
                <div className="col-span-3 text-center text-gray-400 py-12">
                  No weekly challenges available
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="standard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {standardChallenges.map(challenge => {
                const playerChallenge = playerChallenges.find(pc => pc.challenge_id === challenge.id);
                return renderChallengeCard(challenge, playerChallenge);
              })}
              {standardChallenges.length === 0 && (
                <div className="col-span-3 text-center text-gray-400 py-12">
                  No standard challenges available
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}