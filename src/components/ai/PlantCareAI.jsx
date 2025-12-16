import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageCircle, Lightbulb, AlertTriangle, TrendingUp, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export function PlantCareAI({
  plantStats,
  environment,
  currentWeather,
  currentSeason,
  pestCount,
  activePests = [],
  growthStage = 0,
  position = 'bottom-right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoAdvice, setAutoAdvice] = useState(true);
  const [lastAutoAdviceTime, setLastAutoAdviceTime] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeConditions = async (includeUserQuestion = false, question = '') => {
    setIsAnalyzing(true);
    
    try {
      const context = {
      plant_health: plantStats?.nutrition_level || 0,
      water_level: plantStats?.water_level || 0,
      nutrition_level: plantStats?.nutrition_level || 0,
      light_exposure: plantStats?.light_exposure || 0,
      growth_stage: growthStage,
      growth_stage_name: 
        growthStage < 0.15 ? 'Seedling' :
        growthStage < 0.35 ? 'Vegetative' :
        growthStage < 0.65 ? 'Pre-Flowering' :
        growthStage < 0.85 ? 'Flowering' : 'Mature',
      current_weather: currentWeather,
      current_season: currentSeason,
      pest_count: pestCount,
      active_pests: activePests.map(p => p.type).slice(0, 5),
      temperature: environment?.temperature || 22,
      humidity: environment?.humidity || 55,
      resistance_bonus: plantStats?.resistance_bonus || 0
    };

    let prompt = `You are an expert cannabis cultivation AI assistant for the game "Kurstaki Strike". 
Analyze the current plant conditions and provide specific, actionable advice.

CURRENT CONDITIONS:
- Growth Stage: ${context.growth_stage_name} (${(context.growth_stage * 100).toFixed(0)}%)
- Plant Health: ${context.plant_health.toFixed(0)}%
- Water Level: ${context.water_level.toFixed(0)}%
- Nutrition Level: ${context.nutrition_level.toFixed(0)}%
- Light Exposure: ${context.light_exposure.toFixed(0)}%
- Temperature: ${context.temperature}°C
- Humidity: ${context.humidity}%
- Season: ${context.current_season}
- Weather: ${context.current_weather}
- Pest Count: ${context.pest_count}
- Active Pest Types: ${context.active_pests.join(', ') || 'None'}
- Pest Resistance: +${context.resistance_bonus}%

${includeUserQuestion ? `USER QUESTION: ${question}\n\nProvide a detailed answer to the user's question based on the current game mechanics and plant conditions.` : `TASK: Identify any issues or risks, and provide 2-3 specific actionable recommendations to optimize plant growth and health. Be concise but specific. Focus on the most critical issues first.`}

Format your response in markdown with:
- **Priority Issues** (if any critical problems exist)
- **Recommendations** (numbered list of specific actions)
- **Optimal Ranges** (what the player should aim for)
${includeUserQuestion ? '' : '- **Risk Assessment** (upcoming threats based on weather/season/pests)'}

Keep it under 200 words and game-focused.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      const aiMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        analysis: true
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsAnalyzing(false);
      setLastAutoAdviceTime(Date.now());
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setIsAnalyzing(false);
      toast.error('Failed to analyze conditions');
    }
  };

  useEffect(() => {
    if (autoAdvice && isOpen && Date.now() - lastAutoAdviceTime > 30000) {
      const criticalIssues = 
        (plantStats?.water_level < 20) ||
        (plantStats?.nutrition_level < 30) ||
        (pestCount > 5) ||
        (plantStats?.plant_health < 50);
      
      if (criticalIssues) {
        analyzeConditions(false);
      }
    }
  }, [plantStats, pestCount, autoAdvice, isOpen, lastAutoAdviceTime]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    
    await analyzeConditions(true, userInput);
  };

  const getQuickAdvice = () => {
    const advice = [];
    
    if (plantStats?.water_level < 30) {
      advice.push({ text: '💧 Water is low! Water your plant soon.', priority: 'high' });
    }
    
    if (plantStats?.nutrition_level < 40) {
      advice.push({ text: '🌿 Nutrients depleted. Add fertilizer.', priority: 'high' });
    }
    
    if (pestCount > 3) {
      advice.push({ text: '🐛 High pest activity! Spray immediately.', priority: 'critical' });
    }
    
    if (currentWeather === 'heatwave' && plantStats?.water_level < 60) {
      advice.push({ text: '🌡️ Heatwave! Double water intake needed.', priority: 'high' });
    }
    
    if (growthStage > 0.65 && plantStats?.light_exposure < 70) {
      advice.push({ text: '☀️ Flowering stage needs more light.', priority: 'medium' });
    }
    
    return advice.slice(0, 3);
  };

  const quickAdvice = getQuickAdvice();

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-24 right-6',
    'top-left': 'top-24 left-6'
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && quickAdvice.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed ${positionClasses[position]} z-30 pointer-events-auto space-y-2`}
          >
            {quickAdvice.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`px-4 py-2 rounded-lg backdrop-blur-md border-2 text-sm font-semibold flex items-center gap-2 cursor-pointer ${
                  tip.priority === 'critical' ? 'bg-red-900/80 border-red-500 text-white' :
                  tip.priority === 'high' ? 'bg-orange-900/80 border-orange-500 text-white' :
                  'bg-blue-900/80 border-blue-500 text-white'
                }`}
                onClick={() => setIsOpen(true)}
              >
                <AlertTriangle className="w-4 h-4" />
                {tip.text}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed ${positionClasses[position]} z-40 pointer-events-auto`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="relative">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center">
            <Bot className="w-8 h-8 text-white" />
          </div>
          
          {quickAdvice.length > 0 && !isOpen && (
            <motion.div
              className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {quickAdvice.length}
            </motion.div>
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed ${position.includes('right') ? 'right-6' : 'left-6'} ${position.includes('bottom') ? 'bottom-24' : 'top-24'} w-96 max-h-[600px] bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-purple-500/50 z-40 pointer-events-auto flex flex-col`}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-white font-bold">Plant Care AI</div>
                  <div className="text-xs text-gray-400">Real-time analysis</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoAdvice(!autoAdvice)}
                  className={`text-xs px-3 py-1 rounded-full ${
                    autoAdvice ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  Auto
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
                  <p className="text-sm">Ask me anything about plant care!</p>
                  <p className="text-xs mt-2">Or click "Analyze Now" for instant advice</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3 ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-white'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2 text-purple-400">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-bold">AI Analysis</span>
                      </div>
                    )}
                    <ReactMarkdown className="text-sm prose prose-invert prose-sm max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
              
              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-white text-sm">Analyzing conditions...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/10 space-y-3">
              {messages.length === 0 && (
                <button
                  onClick={() => analyzeConditions(false)}
                  disabled={isAnalyzing}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl text-white font-bold text-sm transition-all disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 inline mr-2" />
                      Analyze Now
                    </>
                  )}
                </button>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about plant care..."
                  className="flex-1 px-4 py-2 bg-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isAnalyzing}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || isAnalyzing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-xl text-white transition-all disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function AIInsightPanel({
  plantStats,
  currentWeather,
  currentSeason,
  pestTypes = []
}) {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    
    try {
      const prompt = `As a cannabis cultivation expert AI, provide 3 quick insights for the player based on:
- Water: ${plantStats?.water_level || 0}%
- Nutrients: ${plantStats?.nutrition_level || 0}%
- Weather: ${currentWeather}
- Season: ${currentSeason}
- Pests: ${pestTypes.join(', ') || 'None'}

Return ONLY a JSON array of 3 insights in this exact format:
[
  {"type": "warning|tip|success", "message": "Short insight text", "icon": "emoji"},
  {"type": "warning|tip|success", "message": "Short insight text", "icon": "emoji"},
  {"type": "warning|tip|success", "message": "Short insight text", "icon": "emoji"}
]`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  message: { type: "string" },
                  icon: { type: "string" }
                }
              }
            }
          }
        }
      });

      setInsights(response.insights || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Insights Error:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateInsights();
    const interval = setInterval(generateInsights, 45000);
    return () => clearInterval(interval);
  }, [plantStats, currentWeather, currentSeason]);

  if (isLoading && insights.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Generating insights...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`p-3 rounded-lg border-l-4 ${
            insight.type === 'warning' ? 'bg-orange-900/30 border-orange-500' :
            insight.type === 'success' ? 'bg-green-900/30 border-green-500' :
            'bg-blue-900/30 border-blue-500'
          }`}
        >
          <div className="flex items-start gap-2">
            <span className="text-xl">{insight.icon}</span>
            <p className="text-sm text-white flex-1">{insight.message}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default PlantCareAI;