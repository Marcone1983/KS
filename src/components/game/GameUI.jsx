import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Pause, Droplets, Sun, Moon } from 'lucide-react';

export default function GameUI({ score, level, plantHealth, sprayAmmo, activeSkin, onPause, dayNightHour, plantStats }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="absolute top-3 left-3 space-y-2 pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-sm rounded-md px-3 py-1.5 border border-white/10">
          <div className="text-white text-lg font-bold">{score}</div>
          <div className="text-gray-300 text-[10px] uppercase tracking-wide">Punteggio</div>
        </div>
        
        <div className="bg-black/40 backdrop-blur-sm rounded-md px-3 py-1.5 border border-white/10">
          <div className="text-white text-base font-semibold">Livello {level}</div>
        </div>

        {dayNightHour !== undefined && (
          <div className="bg-black/40 backdrop-blur-sm rounded-md px-3 py-1.5 border border-white/10">
            <div className="flex items-center gap-2">
              {dayNightHour >= 6 && dayNightHour < 18 ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-blue-300" />
              )}
              <div className="text-white text-sm">{Math.floor(dayNightHour)}:00</div>
            </div>
          </div>
        )}
        </div>

      <div className="absolute top-3 right-3 pointer-events-auto">
        <Button
          onClick={onPause}
          variant="ghost"
          size="icon"
          className="bg-black/40 backdrop-blur-sm hover:bg-black/60 text-white border border-white/10 h-9 w-9"
        >
          <Pause className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-3 left-3 space-y-2 pointer-events-auto">
        <div className="bg-black/40 backdrop-blur-sm rounded-md px-3 py-2 border border-white/10 w-40">
          <div className="text-white text-[10px] uppercase tracking-wide mb-1.5">Salute Pianta</div>
          <Progress 
            value={plantHealth} 
            className="h-2 bg-gray-700/50"
            indicatorClassName={
              plantHealth > 60 ? "bg-green-500" :
              plantHealth > 30 ? "bg-yellow-500" :
              "bg-red-500"
            }
          />
          <div className="text-white text-xs font-semibold mt-1">{Math.round(plantHealth)}%</div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm rounded-md px-3 py-2 border border-white/10 w-40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Droplets className="h-3 w-3 text-cyan-400" />
            <div className="text-white text-[10px] uppercase tracking-wide">Spray</div>
          </div>
          <Progress 
            value={sprayAmmo} 
            className="h-2 bg-gray-700/50"
            indicatorClassName="bg-cyan-400"
          />
          <div className="text-white text-xs font-semibold mt-1">{Math.round(sprayAmmo)}%</div>
        </div>
      </div>
    </div>
  );
}