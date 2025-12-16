import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, Timer, Target, Heart, Shield, Medal, Crown, Award, Swords, Send } from 'lucide-react';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Leaderboards() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('high_score');
  const [selectedLevel, setSelectedLevel] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['leaderboard', selectedCategory, selectedLevel],
    queryFn: async () => {
      const query = { category: selectedCategory };
      if (selectedLevel) query.level_number = selectedLevel;
      
      const entries = await base44.entities.LeaderboardEntry.filter(query, '-score_value', 100);
      return entries;
    },
    initialData: []
  });

  const { data: myChallenges } = useQuery({
    queryKey: ['myChallenges'],
    queryFn: async () => {
      if (!currentUser) return [];
      const challenges = await base44.entities.PlayerChallenge.list('-created_date', 20);
      return challenges;
    },
    initialData: []
  });

  const createChallengeMutation = useMutation({
    mutationFn: (challengeData) => base44.entities.PlayerChallenge.create(challengeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChallenges'] });
      toast.success('Challenge sent!');
    }
  });

  const updateChallengeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayerChallenge.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myChallenges'] });
    }
  });

  const handleChallengePlayer = (entry) => {
    if (!currentUser || !progress) {
      toast.error('You must be logged in to send challenges');
      return;
    }

    if (entry.player_email === currentUser.email) {
      toast.error("You can't challenge yourself!");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    createChallengeMutation.mutate({
      challenger_email: currentUser.email,
      challenger_name: currentUser.full_name || currentUser.email,
      target_email: entry.player_email,
      challenge_type: selectedCategory === 'high_score' ? 'beat_score' : 
                      selectedCategory === 'fastest_level' ? 'beat_time' : 'pest_elimination',
      level_number: entry.level_number || progress.current_level,
      target_score: selectedCategory === 'high_score' ? entry.score_value : null,
      target_time: selectedCategory === 'fastest_level' ? entry.score_value : null,
      status: 'pending',
      challenger_result: entry.metadata,
      expires_at: expiresAt.toISOString()
    });
  };

  const getRankIcon = (rank) => {
    if (rank === 0) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 2) return <Award className="w-6 h-6 text-amber-700" />;
    return <Trophy className="w-5 h-5 text-gray-500" />;
  };

  const categories = [
    { id: 'high_score', name: 'High Score', icon: Trophy, color: 'yellow' },
    { id: 'fastest_level', name: 'Speed Run', icon: Timer, color: 'blue' },
    { id: 'most_pests', name: 'Pest Eliminator', icon: Target, color: 'red' },
    { id: 'survival_time', name: 'Survival Master', icon: Heart, color: 'green' },
    { id: 'perfect_health', name: 'Perfect Health', icon: Shield, color: 'purple' }
  ];

  const pendingChallenges = myChallenges.filter(c => c.status === 'pending' && c.target_email === currentUser?.email);
  const sentChallenges = myChallenges.filter(c => c.challenger_email === currentUser?.email);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
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
              <Trophy className="w-12 h-12 text-yellow-400" />
              Leaderboards
            </h1>
          </div>

          {pendingChallenges.length > 0 && (
            <div className="bg-red-600/80 backdrop-blur rounded-full px-4 py-2 flex items-center gap-2">
              <Swords className="w-5 h-5 text-white" />
              <span className="text-white font-bold">{pendingChallenges.length} New Challenges</span>
            </div>
          )}
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="grid grid-cols-5 w-full bg-black/40 backdrop-blur">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {cat.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-black/40 backdrop-blur border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white text-2xl">
                  {categories.find(c => c.id === selectedCategory)?.name} Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboardData.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl flex items-center justify-between ${
                        entry.player_email === currentUser?.email
                          ? 'bg-gradient-to-r from-purple-600/50 to-pink-600/50 border-2 border-purple-400'
                          : 'bg-gray-800/50 hover:bg-gray-700/50'
                      } transition-all`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 text-center">
                          {getRankIcon(index)}
                        </div>
                        
                        <div>
                          <div className="text-white font-bold text-lg">
                            {entry.player_name}
                            {entry.player_email === currentUser?.email && (
                              <span className="ml-2 text-xs bg-green-600 px-2 py-1 rounded-full">YOU</span>
                            )}
                          </div>
                          {entry.level_number && (
                            <div className="text-sm text-gray-400">Level {entry.level_number}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-3xl font-black text-white">
                            {selectedCategory === 'fastest_level' 
                              ? `${Math.floor(entry.score_value / 60)}:${(entry.score_value % 60).toString().padStart(2, '0')}`
                              : entry.score_value.toLocaleString()}
                          </div>
                          {entry.metadata?.season && (
                            <div className="text-xs text-gray-400">
                              {entry.metadata.season} season
                            </div>
                          )}
                        </div>

                        {entry.player_email !== currentUser?.email && (
                          <Button
                            onClick={() => handleChallengePlayer(entry)}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Swords className="w-4 h-4 mr-1" />
                            Challenge
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {leaderboardData.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>No entries yet. Be the first!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-black/40 backdrop-blur border-green-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Swords className="w-5 h-5" />
                  Your Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {pendingChallenges.map(challenge => (
                  <div key={challenge.id} className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <div className="text-white font-bold mb-1">{challenge.challenger_name}</div>
                    <div className="text-sm text-gray-300 mb-2">
                      {challenge.challenge_type === 'beat_score' && `Beat ${challenge.target_score} points`}
                      {challenge.challenge_type === 'beat_time' && `Complete in under ${challenge.target_time}s`}
                      Level {challenge.level_number}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateChallengeMutation.mutate({
                          id: challenge.id,
                          data: { status: 'accepted' }
                        });
                        navigate(createPageUrl('Game'));
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Accept Challenge
                    </Button>
                  </div>
                ))}

                {sentChallenges.length > 0 && (
                  <>
                    <div className="text-sm text-gray-400 font-bold mt-4 mb-2">Sent Challenges</div>
                    {sentChallenges.map(challenge => (
                      <div key={challenge.id} className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="text-white text-sm">
                          Challenged: {challenge.target_email}
                        </div>
                        <div className="text-xs text-gray-400">
                          Status: <span className={`font-bold ${
                            challenge.status === 'completed' ? 'text-green-400' :
                            challenge.status === 'accepted' ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>{challenge.status}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {pendingChallenges.length === 0 && sentChallenges.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No active challenges</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-white">Your Best</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">High Score:</span>
                  <span className="text-white font-bold">{progress?.high_score || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Current Level:</span>
                  <span className="text-white font-bold">{progress?.current_level || 1}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Score:</span>
                  <span className="text-white font-bold">{progress?.total_score || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}