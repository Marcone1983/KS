import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Target, AlertTriangle, Trophy, Skull } from 'lucide-react';

const WaveSystem = ({ currentWave = 1, totalWaves = 10, waveProgress = 0, pestsRemaining = 0, totalPests = 0, waveState = 'preparing', onWaveStart, onWaveComplete, rewards = {} }) => {
  const [showWaveAlert, setShowWaveAlert] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (waveState === 'preparing') {
      setShowWaveAlert(true);
      setCountdown(5);

      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowWaveAlert(false);
            if (onWaveStart) onWaveStart();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [waveState, onWaveStart]);

  useEffect(() => {
    if (waveState === 'completed' && onWaveComplete) {
      setTimeout(() => onWaveComplete(), 2000);
    }
  }, [waveState, onWaveComplete]);

  const difficultyLevel = Math.min(Math.floor(currentWave / 2) + 1, 5);
  const difficultyColor = { 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-orange-400', 4: 'text-red-400', 5: 'text-purple-400' }[difficultyLevel];
  const difficultyLabel = { 1: 'Easy', 2: 'Normal', 3: 'Hard', 4: 'Expert', 5: 'Nightmare' }[difficultyLevel];

  return (
    <>
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-2xl border border-white/20 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-gray-400">Wave</div>
                <div className="text-2xl font-bold text-white">{currentWave}<span className="text-sm text-gray-400">/{totalWaves}</span></div>
              </div>
            </div>
            {waveState === 'active' && (
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-orange-400" />
                <div className="w-48">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Pests</span>
                    <span>{totalPests - pestsRemaining}/{totalPests}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-orange-500 to-red-500" initial={{ width: 0 }} animate={{ width: `${((totalPests - pestsRemaining) / totalPests) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${difficultyColor}`} />
              <div>
                <div className="text-xs text-gray-400">Difficulty</div>
                <div className={`text-sm font-bold ${difficultyColor}`}>{difficultyLabel}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showWaveAlert && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center">
              <motion.div className="mb-8" initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}>
                <div className="text-6xl font-black text-gray-500 mb-2">WAVE</div>
                <div className="text-[120px] font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-none">{currentWave}</div>
              </motion.div>
              <motion.div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${difficultyLevel === 5 ? 'from-purple-600 to-pink-600' : difficultyLevel === 4 ? 'from-red-600 to-orange-600' : difficultyLevel === 3 ? 'from-orange-600 to-yellow-600' : difficultyLevel === 2 ? 'from-yellow-600 to-green-600' : 'from-green-600 to-blue-600'} mb-8`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, duration: 0.4, type: 'spring' }}>
                <AlertTriangle className="w-6 h-6" />
                <span className="text-2xl font-bold">{difficultyLabel}</span>
              </motion.div>
              <motion.div className="text-xl text-gray-400 mb-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                Incoming: <span className="text-white font-bold">{totalPests}</span> pests
              </motion.div>
              <motion.div className="text-8xl font-black text-white" key={countdown} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>{countdown}</motion.div>
              <motion.div className="mt-8 text-2xl font-bold text-blue-400" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>GET READY!</motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {waveState === 'completed' && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="text-center" initial={{ scale: 0.5, y: 100 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', duration: 0.8 }}>
              <motion.div className="flex justify-center mb-6" initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
                <Trophy className="w-32 h-32 text-yellow-400" />
              </motion.div>
              <motion.div className="text-6xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>WAVE {currentWave} CLEARED!</motion.div>
              {rewards && Object.keys(rewards).length > 0 && (
                <motion.div className="bg-white/10 rounded-xl p-6 mb-6 inline-block" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}>
                  <div className="text-xl font-bold text-gray-300 mb-4">Rewards</div>
                  <div className="flex gap-6 justify-center">
                    {rewards.leaves && <div className="text-center"><div className="text-3xl font-bold text-green-400">+{rewards.leaves}</div><div className="text-sm text-gray-400">Leaves</div></div>}
                    {rewards.experience && <div className="text-center"><div className="text-3xl font-bold text-blue-400">+{rewards.experience}</div><div className="text-sm text-gray-400">XP</div></div>}
                  </div>
                </motion.div>
              )}
              <motion.div className="text-lg text-gray-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>Preparing next wave...</motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WaveSystem;