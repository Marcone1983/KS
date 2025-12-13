import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Brain, Target, Leaf, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, BookOpen, Sprout } from 'lucide-react';
import { toast } from 'sonner';

export default function StrategyAdvisor({ gameContext, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [advice, setAdvice] = useState(null);

  const { data: progress } = useQuery({
    queryKey: ['gameProgress'],
    queryFn: async () => {
      const progressList = await base44.entities.GameProgress.list();
      return progressList.length > 0 ? progressList[0] : null;
    }
  });

  const { data: recentSessions } = useQuery({
    queryKey: ['recentSessions'],
    queryFn: () => base44.entities.GameSession.list('-created_date', 5),
    initialData: []
  });

  const analyzeStrategy = async () => {
    if (!progress) {
      toast.error('Nessun progresso di gioco disponibile');
      return;
    }

    setIsAnalyzing(true);

    const context = {
      current_level: progress.current_level,
      plant_stats: progress.plant_stats,
      upgrades: progress.upgrades,
      encountered_pests: progress.pests_encountered || [],
      unlocked_seeds: progress.unlocked_seeds || [],
      unlocked_research: progress.unlocked_research || [],
      research_points: progress.research_points || 0,
      current_season: progress.current_season || 'spring',
      leaf_currency: progress.leaf_currency,
      recent_sessions: recentSessions.slice(0, 3),
      high_score: progress.high_score,
      total_score: progress.total_score,
      ...gameContext
    };

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizza questo stato di gioco e fornisci consigli strategici specifici:

CONTESTO GIOCATORE:
- Livello corrente: ${context.current_level}
- Salute pianta: ${context.plant_stats?.nutrition_level || 0}% nutrizione, ${context.plant_stats?.water_level || 0}% acqua
- Resistenza parassiti: +${context.plant_stats?.resistance_bonus || 0}%
- Upgrade spray: Velocità ${context.upgrades?.spray_speed || 1}, Raggio ${context.upgrades?.spray_radius || 1}, Potenza ${context.upgrades?.spray_potency || 1}
- Upgrade speciali: Slow Effect ${context.upgrades?.slow_effect || 0}, Area Damage ${context.upgrades?.area_damage || 0}
- Punti Ricerca: ${progress?.research_points || 0}
- Ricerche sbloccate: ${progress?.unlocked_research?.length || 0}
- Stagione corrente: ${progress?.current_season || 'spring'}
- Parassiti incontrati: ${context.encountered_pests.length} tipi
- Leaf disponibili: ${context.leaf_currency}
- Ultime 3 sessioni: ${recentSessions.map(s => `Lvl ${s.level} - ${s.completed ? 'Vinto' : 'Perso'} - ${s.score} punti`).join(', ')}

${gameContext?.current_pests ? `PARASSITI ATTIVI: ${gameContext.current_pests.join(', ')} - Analizza comportamenti specifici` : ''}
${gameContext?.current_weather ? `METEO: ${gameContext.current_weather} - Suggerisci adattamenti` : ''}
${gameContext?.plant_health ? `SALUTE PIANTA IN GIOCO: ${gameContext.plant_health}%` : ''}

Fornisci consigli strategici DETTAGLIATI su:
1. Upgrade prioritario spray da fare ADESSO
2. Ricerca prioritaria nell'albero tecnologico
3. Semi consigliati per stagione/livello corrente
4. Strategia spray per parassiti specifici attivi
5. Breeding combinations ottimali
6. Adattamenti per meteo/stagione
7. Warning su vulnerabilità critiche
8. Azioni immediate se in pericolo

Sii ULTRA-SPECIFICO: "Sblocca 'Toxic Resistance' (Tier 2) per contrastare Night Crawler" non "migliora difese"`,
        response_json_schema: {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
            category: { type: "string" },
            main_advice: { type: "string" },
            immediate_actions: { type: "array", items: { type: "string" } },
            upgrade_recommendation: { type: "string" },
            research_recommendation: { type: "string" },
            seed_recommendation: { type: "string" },
            breeding_recommendation: { type: "string" },
            spray_strategy: { type: "string" },
            seasonal_tips: { type: "string" },
            pest_specific_tactics: { type: "array", items: { type: "string" } },
            vulnerabilities: { type: "array", items: { type: "string" } },
            encyclopedia_links: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAdvice(response);
      setIsExpanded(true);
    } catch (error) {
      console.error('Strategy analysis failed:', error);
      toast.error('Errore durante l\'analisi strategica');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'critical': return 'bg-red-600 border-red-400';
      case 'high': return 'bg-orange-600 border-orange-400';
      case 'medium': return 'bg-yellow-600 border-yellow-400';
      case 'low': return 'bg-green-600 border-green-400';
      default: return 'bg-gray-600 border-gray-400';
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'critical': return AlertTriangle;
      case 'high': return Target;
      case 'medium': return TrendingUp;
      default: return Brain;
    }
  };

  if (!isExpanded && !advice) {
    return (
      <Button
        onClick={analyzeStrategy}
        disabled={isAnalyzing}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg z-40"
        size="lg"
      >
        {isAnalyzing ? (
          <>
            <Brain className="h-5 w-5 mr-2 animate-pulse" />
            Analisi in corso...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            Strategy Advisor
          </>
        )}
      </Button>
    );
  }

  if (!advice) return null;

  const PriorityIcon = getPriorityIcon(advice.priority);

  return (
    <Card className={`fixed bottom-6 right-6 w-96 max-h-[70vh] overflow-y-auto shadow-2xl border-2 ${getPriorityColor(advice.priority)} z-40`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            Strategy Advisor
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:bg-white/10"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
        <Badge className={`w-fit mt-2 ${getPriorityColor(advice.priority)}`}>
          <PriorityIcon className="h-3 w-3 mr-1" />
          {advice.priority?.toUpperCase() || 'MEDIUM'} PRIORITY
        </Badge>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4 text-sm">
          <div className="bg-black/40 rounded-lg p-3 border border-white/10">
            <div className="text-white font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-400" />
              Consiglio Principale
            </div>
            <p className="text-gray-200 leading-relaxed">{advice.main_advice}</p>
          </div>

          {advice.immediate_actions && advice.immediate_actions.length > 0 && (
            <div>
              <div className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Azioni Immediate
              </div>
              <ul className="space-y-1">
                {advice.immediate_actions.map((action, idx) => (
                  <li key={idx} className="text-gray-200 flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advice.upgrade_recommendation && (
            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Upgrade Consigliato
              </div>
              <p className="text-gray-200">{advice.upgrade_recommendation}</p>
            </div>
          )}

          {advice.research_recommendation && (
            <div className="bg-cyan-900/30 rounded-lg p-3 border border-cyan-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <Brain className="h-4 w-4 text-cyan-400" />
                Ricerca Consigliata
              </div>
              <p className="text-gray-200">{advice.research_recommendation}</p>
            </div>
          )}

          {advice.seed_recommendation && (
            <div className="bg-green-900/30 rounded-lg p-3 border border-green-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <Sprout className="h-4 w-4 text-green-400" />
                Seme Consigliato
              </div>
              <p className="text-gray-200">{advice.seed_recommendation}</p>
            </div>
          )}

          {advice.breeding_recommendation && (
            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <Sprout className="h-4 w-4 text-purple-400" />
                Breeding Consigliato
              </div>
              <p className="text-gray-200">{advice.breeding_recommendation}</p>
            </div>
          )}

          {advice.spray_strategy && (
            <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                Strategia Spray
              </div>
              <p className="text-gray-200">{advice.spray_strategy}</p>
            </div>
          )}

          {advice.seasonal_tips && (
            <div className="bg-amber-900/30 rounded-lg p-3 border border-amber-500/30">
              <div className="text-white font-semibold mb-1 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-amber-400" />
                Suggerimenti Stagionali
              </div>
              <p className="text-gray-200">{advice.seasonal_tips}</p>
            </div>
          )}

          {advice.pest_specific_tactics && advice.pest_specific_tactics.length > 0 && (
            <div>
              <div className="text-white font-semibold mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-400" />
                Tattiche Anti-Parassita
              </div>
              <ul className="space-y-1">
                {advice.pest_specific_tactics.map((tactic, idx) => (
                  <li key={idx} className="text-gray-200 flex items-start gap-2 text-xs">
                    <span className="text-orange-400 mt-0.5">→</span>
                    <span>{tactic}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {advice.vulnerabilities && advice.vulnerabilities.length > 0 && (
            <div className="bg-red-900/30 rounded-lg p-3 border border-red-500/30">
              <div className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Vulnerabilità
              </div>
              <ul className="space-y-1">
                {advice.vulnerabilities.map((vuln, idx) => (
                  <li key={idx} className="text-gray-200 text-xs">⚠️ {vuln}</li>
                ))}
              </ul>
            </div>
          )}

          {advice.encyclopedia_links && advice.encyclopedia_links.length > 0 && (
            <div>
              <div className="text-white font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                Risorse Utili
              </div>
              <div className="space-y-1">
                {advice.encyclopedia_links.map((link, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate && onNavigate('Encyclopedia', link)}
                    className="w-full justify-start text-xs"
                  >
                    <BookOpen className="h-3 w-3 mr-2" />
                    {link}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={analyzeStrategy}
              disabled={isAnalyzing}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
              size="sm"
            >
              Rianalizza
            </Button>
            <Button
              onClick={() => setAdvice(null)}
              variant="outline"
              size="sm"
            >
              Chiudi
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}