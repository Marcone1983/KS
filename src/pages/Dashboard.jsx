import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Trophy, Leaf, Target, TrendingUp, Clock, Bug, ShoppingBag } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: sessions } = useQuery({
    queryKey: ['allSessions'],
    queryFn: () => base44.entities.GameSession.list('-created_date', 20),
    initialData: []
  });

  const totalPlayTime = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalPestsKilled = sessions.reduce((sum, s) => {
    const pestsElim = s.pests_eliminated || {};
    return sum + Object.values(pestsElim).reduce((a, b) => a + b, 0);
  }, 0);
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length) : 0;
  const completionRate = sessions.length > 0 ? Math.round((sessions.filter(s => s.completed).length / sessions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Home'))}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Indietro
          </Button>
          <h1 className="text-4xl font-bold text-white">Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-8 w-8 text-yellow-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{progress?.high_score || 0}</div>
                  <div className="text-sm text-yellow-200">Record Personale</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Leaf className="h-8 w-8 text-green-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{progress?.leaf_currency || 0}</div>
                  <div className="text-sm text-green-200">Leaf Token</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="h-8 w-8 text-blue-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{progress?.current_level || 1}</div>
                  <div className="text-sm text-blue-200">Livello Attuale</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Bug className="h-8 w-8 text-purple-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{totalPestsKilled}</div>
                  <div className="text-sm text-purple-200">Parassiti Eliminati</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-black/40 backdrop-blur border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Statistiche Generali
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Punteggio Totale</span>
                  <span className="text-white font-bold">{progress?.total_score || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Punteggio Medio</span>
                  <span className="text-white font-bold">{avgScore}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Partite Giocate</span>
                  <span className="text-white font-bold">{sessions.length}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Tempo Totale</span>
                  <span className="text-white font-bold">{Math.floor(totalPlayTime / 60)}m {totalPlayTime % 60}s</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Tasso Completamento</span>
                  <span className="text-white font-bold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2 bg-gray-700" indicatorClassName="bg-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 backdrop-blur border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Potenziamenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Velocità Sparo</span>
                  <span className="text-white font-bold">Livello {progress?.upgrades?.spray_speed || 1}</span>
                </div>
                <Progress value={(progress?.upgrades?.spray_speed || 1) * 10} className="h-2 bg-gray-700" indicatorClassName="bg-cyan-500" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Raggio Spray</span>
                  <span className="text-white font-bold">Livello {progress?.upgrades?.spray_radius || 1}</span>
                </div>
                <Progress value={(progress?.upgrades?.spray_radius || 1) * 10} className="h-2 bg-gray-700" indicatorClassName="bg-blue-500" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Potenza Spray</span>
                  <span className="text-white font-bold">Livello {progress?.upgrades?.spray_potency || 1}</span>
                </div>
                <Progress value={(progress?.upgrades?.spray_potency || 1) * 10} className="h-2 bg-gray-700" indicatorClassName="bg-purple-500" />
              </div>

              <Button 
                onClick={() => navigate(createPageUrl('Shop'))}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Vai allo Shop
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black/40 backdrop-blur border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Storico Partite</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sessions.map((session, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${session.completed ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <div className="text-white font-semibold">Livello {session.level}</div>
                      <div className="text-gray-400 text-sm">{session.duration_seconds}s - Salute finale: {Math.round(session.plant_health_final)}%</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{session.score}</div>
                    <div className="text-gray-400 text-sm">punti</div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nessuna partita giocata ancora
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}