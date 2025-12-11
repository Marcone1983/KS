import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Droplets } from 'lucide-react';

export default function GameUI({ score, level, plantHealth, sprayAmmo, activeSkin, onPause }) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
      <div className="flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 text-white pointer-events-auto">
          <div className="text-3xl font-bold mb-1">{score}</div>
          <div className="text-sm text-gray-300">Punteggio</div>
          <div className="mt-3 text-xl font-semibold">Livello {level}</div>
        </div>

        <Button 
          onClick={onPause}
          variant="ghost"
          size="icon"
          className="bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 pointer-events-auto"
        >
          <Pause className="h-6 w-6" />
        </Button>
      </div>

      <div className="mt-4 max-w-md">
        <div className="bg-black/60 backdrop-blur-sm rounded-xl p-4 pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-white font-semibold">Salute Pianta</div>
            <div className="text-white font-bold">{Math.round(plantHealth)}%</div>
          </div>
          <Progress 
            value={plantHealth} 
            className="h-3 bg-gray-700"
            indicatorClassName={
              plantHealth > 60 ? "bg-green-500" :
              plantHealth > 30 ? "bg-yellow-500" :
              "bg-red-500"
            }
          />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-sm rounded-full p-4 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-3 rounded-full">
              <Droplets className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <div className="text-cyan-400 text-sm font-medium">Spray Btk</div>
              <Progress 
                value={sprayAmmo} 
                className="h-2 w-32 bg-gray-700 mt-1"
                indicatorClassName="bg-cyan-400"
              />
            </div>
          </div>
          {activeSkin !== 'default' && (
            <div className="text-white text-sm px-3 py-1 bg-purple-600/40 rounded-full">
              {activeSkin}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}