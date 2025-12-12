import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Droplets } from 'lucide-react';

export default function GameUI({ score, level, plantHealth, sprayAmmo, activeSkin, onPause }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white pointer-events-auto">
        <div className="text-2xl font-bold">{score}</div>
        <div className="text-xs text-gray-300">Punteggio</div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white pointer-events-auto">
        <div className="text-lg font-semibold">Livello {level}</div>
      </div>

      <Button 
        onClick={onPause}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 pointer-events-auto"
      >
        <Pause className="h-5 w-5" />
      </Button>

      <div className="absolute top-20 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-white pointer-events-auto min-w-[200px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs">Salute Pianta</span>
          <span className="text-sm font-bold">{Math.round(plantHealth)}%</span>
        </div>
        <Progress 
          value={plantHealth} 
          className="h-2 bg-gray-700"
          indicatorClassName={
            plantHealth > 60 ? "bg-green-500" :
            plantHealth > 30 ? "bg-yellow-500" :
            "bg-red-500"
          }
        />
      </div>

      <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white pointer-events-auto">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-5 w-5 text-cyan-400" />
          <span className="text-xs font-medium">Spray Btk</span>
        </div>
        <Progress 
          value={sprayAmmo} 
          className="h-2 w-32 bg-gray-700"
          indicatorClassName="bg-cyan-400"
        />
        {activeSkin !== 'default' && (
          <div className="mt-2 text-xs px-2 py-1 bg-purple-600/40 rounded text-center">
            {activeSkin}
          </div>
        )}
      </div>
    </div>
  );
}