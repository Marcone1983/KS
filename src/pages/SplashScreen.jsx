import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';

export default function SplashScreen() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            navigate(createPageUrl('Game'));
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-green-900 via-green-700 to-emerald-600 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-green-400 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, type: "spring" }}
        className="z-10 mb-16"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693a98c31d0729f805dd02ce/b4e51f644_1000240991.png"
          alt="Kurstaki Strike"
          className="w-80 h-auto drop-shadow-2xl"
        />
      </motion.div>

      <div className="w-full max-w-md px-8 z-10">
        <div className="relative h-16 bg-black/30 rounded-full overflow-hidden backdrop-blur-sm border-4 border-green-400/50">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </motion.div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-2xl drop-shadow-lg z-10">
              {progress}%
            </span>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-green-100 mt-6 text-lg font-medium"
        >
          Caricamento in corso...
        </motion.p>
      </div>
    </div>
  );
}