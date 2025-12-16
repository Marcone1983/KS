import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Trophy, Settings, Leaf, Shield, BookOpen, FlaskConical, TrendingUp, Beaker, Sparkles } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function Home() {
  const navigate = useNavigate();

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: sessions } = useQuery({
    queryKey: ['recentSessions'],
    queryFn: () => base44.entities.GameSession.list('-created_date', 5),
    initialData: []
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-emerald-600 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693a98c31d0729f805dd02ce/b4e51f644_1000240991.png"
            alt="Kurstaki Strike"
            className="w-96 h-auto mx-auto drop-shadow-2xl mb-6"
          />
          <p className="text-green-100 text-xl max-w-2xl mx-auto">
            Difendi la tua pianta di cannabis dai parassiti usando Bacillus thuringiensis kurstaki
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
                Progressi
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progress ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Livello Attuale</div>
                    <div className="text-3xl font-bold text-green-700">{progress.current_level}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Punteggio Totale</div>
                    <div className="text-2xl font-bold">{progress.total_score}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Record Personale</div>
                    <div className="text-2xl font-bold text-yellow-600">{progress.high_score}</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">Inizia a giocare per vedere i tuoi progressi</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-6 w-6 text-green-600" />
                Leaf Token
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progress ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Saldo</div>
                    <div className="text-4xl font-bold text-green-600">{progress.leaf_currency}</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Guadagna Leaf giocando e usali per sbloccare skin e potenziamenti
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">Guadagna Leaf giocando</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                Statistiche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Partite Giocate</div>
                  <div className="text-3xl font-bold text-blue-600">{sessions.length}</div>
                </div>
                {progress && (
                  <div>
                    <div className="text-sm text-gray-600">Parassiti Scoperti</div>
                    <div className="text-2xl font-bold">{progress.pests_encountered?.length || 0}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center gap-4 flex-wrap">
          <Button 
            onClick={() => navigate(createPageUrl('SplashScreen'))}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white text-xl px-12 py-8"
          >
            <Play className="h-8 w-8 mr-3" />
            Gioca Ora
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white/10 text-xl px-12 py-8"
          >
            <Trophy className="h-8 w-8 mr-3" />
            Dashboard
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Shop'))}
            size="lg"
            variant="outline"
            className="border-2 border-purple-400 text-white hover:bg-purple-500/20 text-xl px-12 py-8"
          >
            <Settings className="h-8 w-8 mr-3" />
            Shop
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Encyclopedia'))}
            size="lg"
            variant="outline"
            className="border-2 border-green-400 text-white hover:bg-green-500/20 text-xl px-12 py-8"
          >
            <BookOpen className="h-8 w-8 mr-3" />
            Enciclopedia
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('ResearchTree'))}
            size="lg"
            variant="outline"
            className="border-2 border-cyan-400 text-white hover:bg-cyan-500/20 text-xl px-12 py-8"
          >
            <FlaskConical className="h-8 w-8 mr-3" />
            Ricerca
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('PlantUpgrades'))}
            size="lg"
            variant="outline"
            className="border-2 border-emerald-400 text-white hover:bg-emerald-500/20 text-xl px-12 py-8"
          >
            <TrendingUp className="h-8 w-8 mr-3" />
            Potenzia Pianta
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Crafting'))}
            size="lg"
            variant="outline"
            className="border-2 border-pink-400 text-white hover:bg-pink-500/20 text-xl px-12 py-8"
          >
            <Beaker className="h-8 w-8 mr-3" />
            Crafting
          </Button>
          </div>

        {sessions.length > 0 && (
          <Card className="mt-8 bg-white/95 backdrop-blur">
            <CardHeader>
              <CardTitle>Ultime Partite</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${session.completed ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <div className="font-semibold">Livello {session.level}</div>
                        <div className="text-sm text-gray-600">{session.duration_seconds}s</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{session.score}</div>
                      <div className="text-sm text-gray-600">punti</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}