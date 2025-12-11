import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function GameOver({ score, level, pestsEliminated, duration, onRestart }) {
  const navigate = useNavigate();
  const totalPests = Object.values(pestsEliminated).reduce((sum, count) => sum + count, 0);

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4 bg-gradient-to-br from-gray-900 to-gray-800 border-green-500/30 text-white">
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
        </CardContent>
      </Card>
    </div>
  );
}