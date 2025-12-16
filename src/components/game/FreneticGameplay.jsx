import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { Flame, Zap, Target, Skull, Trophy, AlertTriangle } from 'lucide-react';

/**
 * FRENETIC GAMEPLAY SYSTEM
 * Makes the game intense and exciting with:
 * - Combo system
 * - Kill streaks
 * - Time pressure
 * - Screen shake effects
 * - Slow motion on big kills
 * - Explosive visual feedback
 */

// Combo System
const ComboMeter = ({ combo, multiplier, onComboEnd }) => {
  const [comboTimer, setComboTimer] = useState(100);
  const timerRef = useRef();

  useEffect(() => {
    if (combo > 0) {
      setComboTimer(100);

      timerRef.current = setInterval(() => {
        setComboTimer((prev) => {
          const newValue = prev - 2;
          if (newValue <= 0) {
            if (onComboEnd) onComboEnd();
            return 0;
          }
          return newValue;
        });
      }, 100);

      return () => clearInterval(timerRef.current);
    }
  }, [combo, onComboEnd]);

  if (combo === 0) return null;

  const getComboColor = (c) => {
    if (c >= 50) return 'from-purple-600 to-pink-600';
    if (c >= 30) return 'from-red-600 to-orange-600';
    if (c >= 15) return 'from-orange-600 to-yellow-600';
    if (c >= 5) return 'from-yellow-600 to-green-600';
    return 'from-green-600 to-blue-600';
  };

  const getComboLabel = (c) => {
    if (c >= 50) return 'UNSTOPPABLE!';
    if (c >= 30) return 'LEGENDARY!';
    if (c >= 15) return 'MEGA KILL!';
    if (c >= 10) return 'ULTRA KILL!';
    if (c >= 5) return 'MULTI KILL!';
    return 'COMBO!';
  };

  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <motion.div
        className={`bg-gradient-to-r ${getComboColor(combo)} px-8 py-4 rounded-2xl shadow-2xl`}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        key={combo}
      >
        <div className="text-center">
          <div className="text-white text-sm font-bold mb-1">{getComboLabel(combo)}</div>
          <div className="text-6xl font-black text-white mb-2">{combo}x</div>
          <div className="text-yellow-300 text-lg font-bold">Multiplier: {multiplier.toFixed(1)}x</div>

          {/* Timer bar */}
          <div className="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${comboTimer}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Kill Streak Announcements
const KillStreakAnnouncement = ({ streak, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [streak, onComplete]);

  const streaks = {
    5: { label: 'KILLING SPREE!', icon: '🔥', color: 'from-orange-600 to-red-600' },
    10: { label: 'RAMPAGE!', icon: '⚡', color: 'from-red-600 to-purple-600' },
    15: { label: 'DOMINATING!', icon: '💀', color: 'from-purple-600 to-pink-600' },
    20: { label: 'UNSTOPPABLE!', icon: '👑', color: 'from-pink-600 to-yellow-600' },
    25: { label: 'GODLIKE!', icon: '⭐', color: 'from-yellow-400 to-white' }
  };

  const announcement = streaks[streak] || streaks[5];

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`bg-gradient-to-r ${announcement.color} px-16 py-8 rounded-3xl shadow-2xl border-4 border-white`}
        initial={{ scale: 0, rotate: -360 }}
        animate={{ scale: [0, 1.2, 1], rotate: 0 }}
        exit={{ scale: 0, rotate: 360 }}
        transition={{ times: [0, 0.6, 1], duration: 0.6 }}
      >
        <div className="text-center">
          <motion.div
            className="text-8xl mb-4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            {announcement.icon}
          </motion.div>
          <div className="text-6xl font-black text-white drop-shadow-lg">
            {announcement.label}
          </div>
          <div className="text-3xl font-bold text-yellow-300 mt-2">
            {streak} KILLS!
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Time Pressure Indicator
const TimePressure = ({ timeRemaining, totalTime, critical = false }) => {
  const percentage = (timeRemaining / totalTime) * 100;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
      <div className={`bg-black/80 backdrop-blur-sm px-6 py-3 rounded-xl border-2 ${
        critical ? 'border-red-500 animate-pulse' : 'border-white/20'
      }`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-5 h-5 ${critical ? 'text-red-400 animate-bounce' : 'text-yellow-400'}`} />
          <div>
            <div className="text-xs text-gray-400 mb-1">Time Remaining</div>
            <div className={`text-2xl font-bold ${critical ? 'text-red-400' : 'text-white'}`}>
              {Math.ceil(timeRemaining)}s
            </div>
          </div>
        </div>

        <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden w-48">
          <motion.div
            className={`h-full ${
              critical ? 'bg-gradient-to-r from-red-600 to-orange-600' :
              percentage < 30 ? 'bg-gradient-to-r from-orange-600 to-yellow-600' :
              'bg-gradient-to-r from-green-600 to-blue-600'
            }`}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

// Screen Shake Effect
export const useScreenShake = () => {
  const shakeElement = (intensity = 1, duration = 300) => {
    const element = document.body;
    if (!element) return;

    gsap.to(element, {
      x: `+=${Math.random() * 10 * intensity - 5 * intensity}`,
      y: `+=${Math.random() * 10 * intensity - 5 * intensity}`,
      duration: 0.05,
      repeat: duration / 50,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(element, { x: 0, y: 0 });
      }
    });
  };

  return { shakeScreen: shakeElement };
};

// Slow Motion Effect
export const useSlowMotion = () => {
  const [isSlowMo, setIsSlowMo] = useState(false);

  const activateSlowMotion = (duration = 2000) => {
    setIsSlowMo(true);

    // Visual filter
    document.body.style.filter = 'saturate(0.5) contrast(1.2)';

    setTimeout(() => {
      setIsSlowMo(false);
      document.body.style.filter = '';
    }, duration);
  };

  return { isSlowMo, activateSlowMotion };
};

// Explosive Kill Effect
const ExplosiveKillEffect = ({ position, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 3, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {/* Explosion ring */}
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 rounded-full blur-xl" />

        {/* Particles */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-yellow-400 rounded-full"
              style={{
                left: '50%',
                top: '50%'
              }}
              animate={{
                x: Math.cos(angle) * 100,
                y: Math.sin(angle) * 100,
                scale: [1, 0],
                opacity: [1, 0]
              }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          );
        })}
      </div>
    </motion.div>
  );
};

// Main Frenetic Gameplay Manager
const FreneticGameplay = ({
  onComboUpdate,
  onStreakUpdate,
  timeLimit,
  children
}) => {
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [killStreak, setKillStreak] = useState(0);
  const [showStreakAnnouncement, setShowStreakAnnouncement] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit || 60);
  const [explosions, setExplosions] = useState([]);

  const { shakeScreen } = useScreenShake();
  const { isSlowMo, activateSlowMotion } = useSlowMotion();

  // Timer countdown
  useEffect(() => {
    if (!timeLimit) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimit]);

  // Combo multiplier calculation
  useEffect(() => {
    const newMultiplier = 1 + (combo * 0.1);
    setMultiplier(newMultiplier);

    if (onComboUpdate) {
      onComboUpdate({ combo, multiplier: newMultiplier });
    }
  }, [combo, onComboUpdate]);

  // Kill streak announcements
  useEffect(() => {
    const streakMilestones = [5, 10, 15, 20, 25];

    if (streakMilestones.includes(killStreak)) {
      setShowStreakAnnouncement(killStreak);
      shakeScreen(2, 500);

      // Slow motion for epic kills
      if (killStreak >= 15) {
        activateSlowMotion(1500);
      }
    }

    if (onStreakUpdate) {
      onStreakUpdate(killStreak);
    }
  }, [killStreak, onStreakUpdate]);

  // Public API for registering kills
  const registerKill = (position = { x: 50, y: 50 }, isSpecial = false) => {
    setCombo((c) => c + 1);
    setKillStreak((s) => s + 1);

    // Screen shake
    shakeScreen(isSpecial ? 1.5 : 0.5, isSpecial ? 200 : 100);

    // Explosion effect
    setExplosions((prev) => [...prev, { id: Date.now(), position }]);

    // Special kill slow-mo
    if (isSpecial) {
      activateSlowMotion(1000);
    }
  };

  const resetCombo = () => {
    setCombo(0);
    setMultiplier(1);
  };

  const resetStreak = () => {
    setKillStreak(0);
  };

  return (
    <>
      {/* Render children with API */}
      {typeof children === 'function' ? children({ registerKill, resetCombo, resetStreak }) : children}

      {/* Combo Meter */}
      <AnimatePresence>
        {combo > 0 && (
          <ComboMeter
            combo={combo}
            multiplier={multiplier}
            onComboEnd={resetCombo}
          />
        )}
      </AnimatePresence>

      {/* Kill Streak Announcements */}
      <AnimatePresence>
        {showStreakAnnouncement && (
          <KillStreakAnnouncement
            streak={showStreakAnnouncement}
            onComplete={() => setShowStreakAnnouncement(null)}
          />
        )}
      </AnimatePresence>

      {/* Time Pressure */}
      {timeLimit && timeRemaining > 0 && (
        <TimePressure
          timeRemaining={timeRemaining}
          totalTime={timeLimit}
          critical={timeRemaining <= 10}
        />
      )}

      {/* Explosion Effects */}
      <AnimatePresence>
        {explosions.map((explosion) => (
          <ExplosiveKillEffect
            key={explosion.id}
            position={explosion.position}
            onComplete={() => {
              setExplosions((prev) => prev.filter((e) => e.id !== explosion.id));
            }}
          />
        ))}
      </AnimatePresence>

      {/* Slow Motion Overlay */}
      <AnimatePresence>
        {isSlowMo && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-40 bg-blue-900/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FreneticGameplay;
export { ComboMeter, KillStreakAnnouncement, TimePressure };
