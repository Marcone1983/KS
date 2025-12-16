import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { editable as e, SheetProvider, PerspectiveCamera as TheatreCamera } from '@theatre/r3f';
import { getProject, types } from '@theatre/core';
import studio from '@theatre/studio';
import gsap from 'gsap';
import * as THREE from 'three';

const theatreProject = getProject('KurstakiStrike');
const cinematicSheet = theatreProject.sheet('GameCinematics');

export function initTheatreStudio(enabled = false) {
  if (enabled && typeof window !== 'undefined') {
    studio.initialize();
  }
}

export function CinematicCamera({ 
  sequenceName = 'default',
  isPlaying = false,
  onComplete
}) {
  const cameraRef = useRef();

  useEffect(() => {
    if (isPlaying) {
      const sequence = cinematicSheet.sequence;
      sequence.position = 0;
      sequence.play({ iterationCount: 1 }).then(() => {
        if (onComplete) onComplete();
      });
    }
  }, [isPlaying, onComplete]);

  return (
    <TheatreCamera
      theatreKey="Camera"
      makeDefault={isPlaying}
      position={[0, 1.5, 3]}
      fov={75}
    />
  );
}

export function IntroSequence({ onComplete, skipIntro }) {
  const [stage, setStage] = useState(0);
  const cameraRef = useRef();

  useEffect(() => {
    if (skipIntro) {
      if (onComplete) onComplete();
      return;
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    if (cameraRef.current) {
      timeline
        .to(cameraRef.current.position, {
          duration: 3,
          x: 5,
          y: 8,
          z: 8,
          ease: 'power2.inOut'
        })
        .to(cameraRef.current.position, {
          duration: 2,
          x: 0,
          y: 2,
          z: 5,
          ease: 'power2.inOut'
        }, '-=0.5')
        .to(cameraRef.current.position, {
          duration: 1.5,
          x: 0,
          y: 1.4,
          z: 2.2,
          ease: 'power1.out'
        });
    }

    return () => {
      timeline.kill();
    };
  }, [skipIntro, onComplete]);

  return null;
}

export function WaveIntroSequence({ 
  waveNumber, 
  difficulty,
  onComplete 
}) {
  const [show, setShow] = useState(true);
  const textRef = useRef();

  useEffect(() => {
    const timeline = gsap.timeline({
      onComplete: () => {
        setShow(false);
        if (onComplete) onComplete();
      }
    });

    timeline
      .from('.wave-title', {
        duration: 0.8,
        scale: 0,
        rotation: -180,
        ease: 'back.out(1.7)'
      })
      .from('.wave-number', {
        duration: 0.6,
        y: 100,
        opacity: 0,
        ease: 'power3.out'
      }, '-=0.4')
      .from('.wave-difficulty', {
        duration: 0.4,
        scale: 0,
        opacity: 0,
        ease: 'back.out(2)'
      }, '-=0.2')
      .to({}, { duration: 1.5 })
      .to('.wave-container', {
        duration: 0.5,
        opacity: 0,
        scale: 0.8,
        ease: 'power2.in'
      });

    return () => timeline.kill();
  }, [waveNumber, onComplete]);

  if (!show) return null;

  return (
    <div className="wave-container fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-lg z-50 pointer-events-none">
      <div className="text-center">
        <div className="wave-title text-6xl font-black text-gray-500 mb-4">WAVE</div>
        <div className="wave-number text-[150px] font-black bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-none">
          {waveNumber}
        </div>
        <div className={`wave-difficulty inline-block px-6 py-3 rounded-full text-2xl font-bold mt-6 ${
          difficulty === 'nightmare' ? 'bg-gradient-to-r from-purple-600 to-pink-600' :
          difficulty === 'expert' ? 'bg-gradient-to-r from-red-600 to-orange-600' :
          difficulty === 'hard' ? 'bg-gradient-to-r from-orange-600 to-yellow-600' :
          difficulty === 'normal' ? 'bg-gradient-to-r from-yellow-600 to-green-600' :
          'bg-gradient-to-r from-green-600 to-blue-600'
        }`}>
          {difficulty.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

export function BossIntroSequence({ 
  boss, 
  onComplete 
}) {
  const [show, setShow] = useState(true);
  const cameraRef = useRef();

  useEffect(() => {
    const timeline = gsap.timeline({
      onComplete: () => {
        setShow(false);
        if (onComplete) onComplete();
      }
    });

    timeline
      .from('.boss-container', {
        duration: 0.5,
        opacity: 0,
        scale: 0.5,
        ease: 'power2.out'
      })
      .from('.boss-title', {
        duration: 0.8,
        x: -200,
        opacity: 0,
        ease: 'power3.out'
      }, '-=0.3')
      .from('.boss-name', {
        duration: 1,
        scale: 0,
        rotation: 360,
        ease: 'elastic.out(1, 0.5)'
      }, '-=0.5')
      .from('.boss-healthbar', {
        duration: 0.6,
        scaleX: 0,
        ease: 'power2.out'
      }, '-=0.3')
      .to({}, { duration: 1.5 })
      .to('.boss-container', {
        duration: 0.5,
        opacity: 0,
        y: -100,
        ease: 'power2.in'
      });

    return () => timeline.kill();
  }, [boss, onComplete]);

  if (!show) return null;

  return (
    <div className="boss-container fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl z-50 pointer-events-none">
      <div className="text-center max-w-4xl">
        <div className="boss-title text-4xl font-bold text-red-500 mb-6 tracking-wider">
          ⚠️ BOSS APPROACHING ⚠️
        </div>
        <div className="boss-name text-7xl font-black text-white mb-8 drop-shadow-2xl">
          {boss.name}
        </div>
        <div className="boss-healthbar w-full max-w-2xl mx-auto">
          <div className="h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-red-500">
            <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 w-full" />
          </div>
          <div className="text-xl text-gray-400 mt-3">{boss.description || 'Prepare for battle!'}</div>
        </div>
      </div>
    </div>
  );
}

export function VictorySequence({ 
  score, 
  level,
  rewards,
  onComplete 
}) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timeline = gsap.timeline({
      onComplete: () => {
        setShow(false);
        if (onComplete) onComplete();
      }
    });

    timeline
      .from('.victory-icon', {
        duration: 1,
        scale: 0,
        rotation: -360,
        ease: 'elastic.out(1, 0.5)'
      })
      .from('.victory-text', {
        duration: 0.8,
        y: 50,
        opacity: 0,
        ease: 'power3.out'
      }, '-=0.5')
      .from('.victory-score', {
        duration: 1,
        scale: 0,
        ease: 'back.out(1.7)'
      }, '-=0.4')
      .from('.victory-rewards', {
        duration: 0.6,
        y: 30,
        opacity: 0,
        stagger: 0.1,
        ease: 'power2.out'
      }, '-=0.3')
      .to({}, { duration: 2 })
      .to('.victory-container', {
        duration: 0.6,
        opacity: 0,
        scale: 1.2,
        ease: 'power2.in'
      });

    return () => timeline.kill();
  }, [score, onComplete]);

  if (!show) return null;

  return (
    <div className="victory-container fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-lg z-50">
      <div className="text-center">
        <div className="victory-icon text-9xl mb-6">🏆</div>
        <div className="victory-text text-6xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-6">
          VICTORY!
        </div>
        <div className="victory-score text-4xl font-bold text-white mb-8">
          Score: {score}
        </div>
        <div className="space-y-3">
          {rewards && Object.entries(rewards).map(([key, value]) => (
            <div key={key} className="victory-rewards text-2xl text-green-400 font-bold">
              +{value} {key}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CameraShake({ intensity = 1, duration = 300, enabled = false }) {
  const cameraRef = useRef();

  useEffect(() => {
    if (!enabled || !cameraRef.current) return;

    const originalPosition = cameraRef.current.position.clone();
    
    const shakeInterval = setInterval(() => {
      cameraRef.current.position.x = originalPosition.x + (Math.random() - 0.5) * 0.05 * intensity;
      cameraRef.current.position.y = originalPosition.y + (Math.random() - 0.5) * 0.05 * intensity;
      cameraRef.current.position.z = originalPosition.z + (Math.random() - 0.5) * 0.05 * intensity;
    }, 16);

    const resetTimeout = setTimeout(() => {
      clearInterval(shakeInterval);
      cameraRef.current.position.copy(originalPosition);
    }, duration);

    return () => {
      clearInterval(shakeInterval);
      clearTimeout(resetTimeout);
    };
  }, [enabled, intensity, duration]);

  return null;
}

export default {
  CinematicCamera,
  IntroSequence,
  WaveIntroSequence,
  BossIntroSequence,
  VictorySequence,
  CameraShake
};