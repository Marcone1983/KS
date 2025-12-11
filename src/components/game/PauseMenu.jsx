import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, RefreshCw, Settings, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function PauseMenu({ onResume, onRestart }) {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 bg-gray-900 border-green-500/30 text-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Pausa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            onClick={onResume}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
          >
            <Play className="h-6 w-6 mr-2" />
            Riprendi
          </Button>
          
          <Button 
            onClick={onRestart}
            variant="outline"
            className="w-full border-gray-600 text-white hover:bg-gray-800 py-6"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Ricomincia Livello
          </Button>

          <Button 
            onClick={() => navigate(createPageUrl('Home'))}
            variant="outline"
            className="w-full border-gray-600 text-white hover:bg-gray-800 py-6"
          >
            <Home className="h-5 w-5 mr-2" />
            Torna alla Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}