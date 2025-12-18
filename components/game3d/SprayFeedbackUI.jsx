import React from 'react';
import { Target, Droplets } from 'lucide-react';

export default function SprayFeedbackUI({ targetedPlant, sprayedCount, totalPlants, targetedState }) {
  const getTargetStateInfo = () => {
    if (!targetedPlant) return null;
    
    const stateConfig = {
      healthy: { label: 'HEALTHY', color: 'bg-green-500/80', border: 'border-green-400' },
      infested: { label: 'INFESTED', color: 'bg-orange-500/80', border: 'border-orange-400' },
      diseased: { label: 'DISEASED', color: 'bg-red-500/80', border: 'border-red-400' },
      treating: { label: 'TREATING', color: 'bg-cyan-500/80', border: 'border-cyan-400' },
      treated: { label: 'TREATED', color: 'bg-emerald-500/80', border: 'border-emerald-400' },
      mature: { label: 'MATURE', color: 'bg-yellow-500/80', border: 'border-yellow-400' }
    };
    
    return stateConfig[targetedState] || stateConfig.healthy;
  };
  
  const stateInfo = getTargetStateInfo();
  
  return (
    <>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className={`w-8 h-8 border-2 rounded-full transition-all ${
          targetedPlant ? `${stateInfo?.border || 'border-green-400'} scale-125 shadow-lg` : 'border-white/50'
        }`}>
          <div className="w-1 h-1 bg-white rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          {targetedPlant && (
            <>
              <div className="absolute -top-1 -left-1 w-2 h-2 bg-white rounded-full animate-ping" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.15s' }} />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.45s' }} />
            </>
          )}
        </div>
        {targetedPlant && stateInfo && (
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className={`${stateInfo.color} backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg border ${stateInfo.border}`}>
              <Target className="w-4 h-4" />
              <span>{stateInfo.label}</span>
              <Droplets className="w-4 h-4 animate-pulse" />
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
            style={{ width: `${(sprayedCount / totalPlants) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}