import { useEffect, useRef } from 'react';

const AudioManager = ({ isPlaying, onSpray, onHit, onDeath, plantHealth }) => {
  const audioContextRef = useRef(null);
  const backgroundMusicRef = useRef(null);
  const previousHealthRef = useRef(100);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    
    if (isPlaying) {
      startBackgroundMusic();
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (plantHealth < previousHealthRef.current && plantHealth < 50) {
      playPlantDamageSound();
    }
    previousHealthRef.current = plantHealth;
  }, [plantHealth]);

  const startBackgroundMusic = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00];
    const bassNotes = [130.81, 146.83, 164.81];

    let noteIndex = 0;
    let bassIndex = 0;
    const interval = 2;

    oscillator1.frequency.value = notes[0];
    oscillator2.frequency.value = bassNotes[0];

    setInterval(() => {
      noteIndex = (noteIndex + 1) % notes.length;
      bassIndex = (bassIndex + 1) % bassNotes.length;
      
      oscillator1.frequency.setValueAtTime(notes[noteIndex], ctx.currentTime);
      oscillator2.frequency.setValueAtTime(bassNotes[bassIndex], ctx.currentTime);
    }, interval * 1000);

    gainNode.gain.value = 0.08;

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start();
    oscillator2.start();

    backgroundMusicRef.current = { stop: () => { oscillator1.stop(); oscillator2.stop(); } };
  };

  const playSpraySound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = 'white' in OscillatorNode ? 'white' : 'sawtooth';
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.frequency.setValueAtTime(4000, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.3);
  };

  const playHitSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const playDeathSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
  };

  const playPlantDamageSound = () => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 150;

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  };

  useEffect(() => {
    if (onSpray) {
      const unsubscribe = onSpray(() => playSpraySound());
      return unsubscribe;
    }
  }, [onSpray]);

  useEffect(() => {
    if (onHit) {
      const unsubscribe = onHit(() => playHitSound());
      return unsubscribe;
    }
  }, [onHit]);

  useEffect(() => {
    if (onDeath) {
      const unsubscribe = onDeath(() => playDeathSound());
      return unsubscribe;
    }
  }, [onDeath]);

  return null;
};

export default AudioManager;