import React from 'react';
import { Target, Droplets } from 'lucide-react';

export default function SprayFeedbackUI({ targetedPlant, sprayedCount, totalPlants }) {
  return (
    <>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className={`w-8 h-8 border-2 rounded-full transition-all ${
          targetedPlant ? 'border-green-400 scale-125' : 'border-white/50'
        }`}>
          <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        {targetedPlant && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-green-500/80 backdrop-blur text-white text-xs px-2 py-1 rounded flex items-center gap-1">
              <Target className="w-3 h-3" />
              SPRAY NOW
            </div>
          </div>
        )}
      </div>

      <div className="fixed top-4 right-4 bg-black/75 backdrop-blur text-white p-4 rounded-lg border border-green-500/30">
        <div className="flex items-center gap-3">
          <Droplets className="w-6 h-6 text-green-400" />
          <div>
            <div className="text-xs text-gray-400">Plants Treated</div>
            <div className="text-2xl font-bold">
              {sprayedCount} / {totalPlants}
            </div>
          </div>
        </div>
        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${(sprayedCount / totalPlants)