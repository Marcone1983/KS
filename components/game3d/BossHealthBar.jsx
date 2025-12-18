import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Shield, Skull, Cloud } from 'lucide-react';

export default function BossHealthBar({ boss, health, maxHealth, armorSegments }) {
  const healthPercent = (health / maxHealth) * 100;
  
  const getBossIcon = () => {
    switch(boss.type) {
      case 'colossus': return Shield;
      case 'swarm': return Skull;
      case 'toxic': return Cloud;
      default: return Skull;
    }
  };

  const Icon = getBossIcon();

  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-96 pointer-events-auto z-20">
      <div className="bg-black/60 backdrop-blur-md rounded-lg p-4 border-2 border-red-500/50 shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-600/20 p-2 rounded-lg">
            <Icon className="h-6 w-6 text-red-400" />
          </div>
          <div className="flex-1">
            <div className="text-red-400 text-lg font-bold">{boss.name}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">{boss.type} Boss</div>
          </div>
          <div className="text-right">
            <div className="text-white text-xl font-bold">{Math.round(health)}</div>
            <div className="text-xs text-gray-400">/ {maxHealth}</div>
          </div>
        </div>

        <Progress 
          value={healthPercent} 
          className="h-4 bg-gray-800 border border-red-900"
          indicatorClassName="bg-gradient-to-r from-red-600 to-red-400"
        />

        {boss.type === 'colossus' && armorSegments > 0 && (
          <div className="mt-3 flex gap-2">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Corazza:
            </div>
            <div className="flex gap-1">
              {Array.from({ length: armorSegments }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-6 h-6 bg-orange-600 rounded border border-orange-400"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}