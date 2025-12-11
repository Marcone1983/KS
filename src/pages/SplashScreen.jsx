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
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-emerald-400 rounded-full blur-3xl animate-pulse delay-1000" />
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
          />
          
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-20 h-16 flex items-center justify-center"
            animate={{ x: `calc(${progress}% - 40px)` }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <div className="w-12 h-16 bg-gradient-to-b from-blue-500 to-blue-700 rounded-lg border-2 border-blue-300 shadow-lg" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-3 bg-cyan-200 rounded-full" />
              <motion.div
                className="absolute -right-8 top-1/2 -translate-y-1/2"
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 1.5] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-cyan-300 rounded-full"
                    style={{
                      top: Math.random() * 20 - 10,
                      left: i * 5,
                    }}
                    animate={{
                      x: [0, 20],
                      opacity: [1, 0],
                      scale: [1, 0.3]
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.1,
                      repeat: Infinity
                    }}
                  />
                ))}
              </motion.div>
            </div