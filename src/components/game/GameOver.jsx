import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, RefreshCw, Home, Swords, Share2, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function GameOver({ score, level, pestsEliminated, duration, onRestart }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [shareEmail, setShareEmail] = useState('');
  const totalPests = Object.values(pestsEliminated).reduce((sum, count) => sum + count, 0);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const submitLeaderboardMutation = useMutation({
    mutationFn: (entryData) => base44.entities.LeaderboardEntry.create(entryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: (challengeData) => base44.entities.PlayerChallenge.create(challengeData),
    onSuccess: () => {
      toast.success('Challenge sent!');
      setShareEmail('');
    }
  });

  const handleSubmitToLeaderboard = async () => {
    if (!currentUser) {
      toast.error('Must be logged in');
      return;
    }

    await submitLeaderboardMutation.mutateAsync({
      player_name: currentUser.full_name || currentUser.email,
      player_email: currentUser.email,
      category: 'high_score',
      level_number: level,
      score_value: score,
      metadata: {
        duration,
        pests_eliminated: totalPests,
        pest_breakdown: pestsEliminated
      },
      verified: true
    });

    toast.success('Score submitted to leaderboard!');
  };

  const handleChallengePlayer = async () => {
    if (!currentUser || !shareEmail) {
      toast.error('Enter an email to challenge');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await createChallengeMutation.mutateAsync({
      challenger_email: currentUser.email,
      challenger_name: currentUser.full_name || currentUser.email,
      target_email: shareEmail,
      challenge_type: 'beat_score',
      level_number: level,
      target_score: score,
      status: 'pending',
      challenger_result: {
        score,
        duration,
        pests_eliminated: totalPests
      },
      expires_at: expiresAt.toISOString()
    });
  };

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg mx-4"
      >
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 text-white">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-500/20 p-4 rounded-full">
              <Trophy className="h-12 w-12 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Partita Terminata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-green-400">{score}</div>
              <div className="text-sm text-gray-400 mt-1">Punteggio</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-blue-400">{level}</div>
              <div className="text-sm text-gray-400 mt-1">Livello</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-purple-400">{totalPests}</div>
              <div className="text-sm text-gray-400 mt-1">Parassiti Eliminati</div>
            </div>
            <div className="bg-black/30 rounded-lg p-4 text-center">
              <div className="text-4xl font-bold text-yellow-400">{duration}s</div>
              <div className="text-sm text-gray-400 mt-1">Durata</div>
            </div>
          </div>

          {Object.keys(pestsEliminated).length > 0 && (
            <div className="bg-black/30 rounded-lg p-4">
              <div className="text-sm font-semibold mb-3 text-gray-300">Dettaglio Eliminazioni</div>
              <div className="space-y-2">
                {Object.entries(pestsEliminated).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-gray-400 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-green-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={onRestart}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Rigioca
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Home'))}
              variant="outline"
              className="flex-1 border-gray-600 text-white hover:bg-gray-700"
            >
              <Home className="h-5 w-5 mr-2" />
              Home
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            Guadagnati {Math.floor(score / 10)} Leaf token
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700 space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={handleSubmitToLeaderboard}
                className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
              >
                <Award className="h-5 w-5 mr-2" />
                Submit to Leaderboard
              </Button>
              
              <Button
                onClick={() => navigate(createPageUrl('Leaderboards'))}
                variant="outline"
                className="border-yellow-500 text-white hover:bg-yellow-500/20"
              >
                <Trophy className="h-5 w-5 mr-2" />
                View Rankings
              </Button>
            </div>

            <div className="bg-black/30 backdrop-blur rounded-xl p-4">
              <div className="text-white font-bold mb-3 flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                Challenge a Friend
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Friend's email..."
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-500"
                />
                <Button
                  onClick={handleChallengePlayer}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Challenge them to beat your score of {score} on Level {level}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}