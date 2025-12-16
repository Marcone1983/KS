import React, { useRef, useMemo } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import { Text } from 'troika-three-text';
import * as THREE from 'three';

extend({ Text });

export function TroikaText3D({
  text = '',
  position = [0, 0, 0],
  fontSize = 0.5,
  color = 0xffffff,
  outlineColor = 0x000000,
  outlineWidth = 0.02,
  anchorX = 'center',
  anchorY = 'middle',
  maxWidth = Infinity,
  textAlign = 'center',
  font = null,
  onSync
}) {
  const textRef = useRef();

  useFrame(() => {
    if (textRef.current) {
      textRef.current.sync();
    }
  });

  return (
    <text
      ref={textRef}
      text={text}
      fontSize={fontSize}
      color={color}
      position={position}
      anchorX={anchorX}
      anchorY={anchorY}
      maxWidth={maxWidth}
      textAlign={textAlign}
      font={font}
      outlineWidth={outlineWidth}
      outlineColor={outlineColor}
      onSync={onSync}
    >
      <meshStandardMaterial attach="material" color={color} />
    </text>
  );
}

export function AnimatedScore({ 
  score = 0, 
  position = [0, 2, 0], 
  color = 0xffd700 
}) {
  const textRef = useRef();
  const [displayScore, setDisplayScore] = useState(0);

  useFrame(() => {
    const diff = score - displayScore;
    if (Math.abs(diff) > 0.1) {
      setDisplayScore(prev => prev + diff * 0.15);
    }
  });

  return (
    <TroikaText3D
      ref={textRef}
      text={Math.floor(displayScore).toString()}
      position={position}
      fontSize={0.8}
      color={color}
      outlineWidth={0.03}
      outlineColor={0x000000}
    />
  );
}

export function FloatingDamageNumber({ 
  damage, 
  position = [0, 0, 0],
  critical = false,
  onComplete
}) {
  const textRef = useRef();
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const birthTime = useRef(Date.now());

  useFrame(() => {
    const elapsed = (Date.now() - birthTime.current) / 1000;
    setOffset(elapsed * 0.5);
    setOpacity(Math.max(0, 1 - elapsed));

    if (elapsed > 1 && onComplete) {
      onComplete();
    }
  });

  return (
    <TroikaText3D
      text={`-${damage}`}
      position={[position[0], position[1] + offset, position[2]]}
      fontSize={critical ? 0.4 : 0.25}
      color={critical ? 0xff0000 : 0xffffff}
      outlineWidth={critical ? 0.025 : 0.015}
      outlineColor={0x000000}
    >
      <meshBasicMaterial attach="material" transparent opacity={opacity} />
    </TroikaText3D>
  );
}

export function WaveAnnouncement3D({ 
  waveNumber, 
  position = [0, 3, -5],
  onComplete 
}) {
  const groupRef = useRef();
  const [scale, setScale] = useState(0);

  useEffect(() => {
    gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    })
      .to({ scale: 0 }, {
        scale: 1,
        duration: 0.8,
        ease: 'back.out(1.7)',
        onUpdate: function() {
          setScale(this.targets()[0].scale);
        }
      })
      .to({}, { duration: 2 })
      .to({ scale: scale }, {
        scale: 0,
        duration: 0.5,
        ease: 'power2.in',
        onUpdate: function() {
          setScale(this.targets()[0].scale);
        }
      });
  }, [waveNumber, onComplete]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <TroikaText3D
        text="WAVE"
        position={[0, 0.5, 0]}
        fontSize={0.6}
        color={0xcccccc}
      />
      <TroikaText3D
        text={waveNumber.toString()}
        position={[0, -0.5, 0]}
        fontSize={1.5}
        color={0x00ffff}
        outlineWidth={0.05}
      />
    </group>
  );
}

export function PowerUpLabel3D({ 
  text, 
  position = [0, 0, 0],
  color = 0xffd700 
}) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime;
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <TroikaText3D
        text={text}
        fontSize={0.15}
        color={color}
        outlineWidth={0.02}
        outlineColor={0x000000}
      />
    </group>
  );
}

export function ComboText3D({ 
  combo, 
  position = [0, 3, 0] 
}) {
  const groupRef = useRef();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    gsap.fromTo(
      { scale: 1 },
      {
        scale: 1.3,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
        onUpdate: function() {
          setScale(this.targets()[0].scale);
        }
      }
    );
  }, [combo]);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      <TroikaText3D
        text={`${combo}x COMBO!`}
        fontSize={0.5}
        color={combo >= 20 ? 0xff00ff : combo >= 10 ? 0xff6600 : 0xffd700}
        outlineWidth={0.03}
        outlineColor={0x000000}
      />
    </group>
  );
}

export default {
  TroikaText3D,
  AnimatedScore,
  FloatingDamageNumber,
  WaveAnnouncement3D,
  PowerUpLabel3D,
  ComboText3D
};