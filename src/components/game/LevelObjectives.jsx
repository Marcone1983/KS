import React from 'react';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Target, Clock, Heart } from 'lucide-react';

export default function LevelObjectives({ objectives, currentStats }) {
  if (!objectives || objectives.length === 0) return null;

  const checkObjective = (objective) => {
    switch (objective.type) {
      case 'survive':
        return currentStats.timeElapsed >= objective.duration;
      case 'eliminate_pests':
        return currentStats.pestsKilled >= objective.count;
      case 'maintain_health':
        return currentStats.plantHealth >= objective.threshold;
      default:
        return false;
    }
  };

  const getObjectiveIcon = (type) => {
    switch (type) {
      case 'survive':
        return Clock;
      case 'eliminate_pests':
        return Target;
      case 'maintain_health':
        return Heart;
      default:
        return Circle;
    }
  };

  const getObjectiveText = (objective) => {
    switch (objective.type) {
      case 'survive':
        return `Sopravvivi ${objective.duration}s`;
      case 'eliminate_pests':
        return `Elimina ${objective.count} parassiti`;
      case 'maintain_health':
        return `Mantieni salute ≥ ${objective.threshold}%`;
      default:
        return 'Obiettivo sconosciuto';
    }
  };

  return (
    <div className="absolute top-32 right-6 w-72 pointer-events-auto z-20">
      <Card className="bg-black/60 backdrop-blur-md border-purple-500/30 p-4">
        <div className="text-purple-400 font-bold mb-3 text-sm">OBIETTIVI LIVELLO</div>
        <div className="space-y-2">
          {objectives.map((objective, idx) => {
            const completed = checkObjective(objective);
            const Icon = getObjectiveIcon(objective.type);
            
            return (
              <div 
                key={idx} 
                className={`flex items-center gap-3 p-2 rounded ${completed ? 'bg-green-900/30' : 'bg-gray-900/30'}`}
              >
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                ) : (
                  <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className={`text-sm ${completed ? 'text-green-300 line-through' : 'text-white'}`}>
                    {getObjectiveText(objective)}
                  </div>
                  {!completed && objective.type === 'survive' && (
                    <div className="text-xs text-gray-400 mt-1">
                      {currentStats.timeElapsed}/{objective.duration}s
                    </div>
                  )}
                  {!completed && objective.type === 'eliminate_pests' && (
                    <div className="text-xs text-gray-400 mt-1">
                      {currentStats.pestsKilled}/{objective.count}
                    </div>
                  )}
                  {!completed && objective.type === 'maintain_health' && (
                    <div className="text-xs text-gray-400 mt-1">
                      {Math.round(currentStats.plantHealth)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}