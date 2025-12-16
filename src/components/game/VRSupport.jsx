import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { VRButton, XR, Controllers, Hands, RayGrab, useXR } from '@react-three/xr';
import { Interactive } from '@react-three/xr';
import * as THREE from 'three';
import { toast } from 'sonner';

export function VRSprayBottle({ onSpray }) {
  const bottleRef = useRef();
  const [isGrabbed, setIsGrabbed] = useState(false);

  return (
    <RayGrab onSelectStart={() => setIsGrabbed(true)} onSelectEnd={() => setIsGrabbed(false)}>
      <group ref={bottleRef}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.15, 16]} />
          <meshPhysicalMaterial
            color={isGrabbed ? 0x4a90e2 : 0x80c0ff}
            transmission={0.9}
            thickness={0.3}
            roughness={0.1}
            clearcoat={1}
          />
        </mesh>
        
        <Interactive onSelect={() => onSpray && onSpray()}>
          <mesh position={[0.03, 0.05, 0]}>
            <boxGeometry args={[0.02, 0.04, 0.02]} />
            <meshStandardMaterial color={0x2a2a2a} />
          </mesh>
        </Interactive>
      </group>
    </RayGrab>
  );
}

export function VRGameScene({ 
  children,
  onSpray,
  plantPosition = [0, 0, -1.5] 
}) {
  const { player } = useXR();

  return (
    <>
      <Controllers />
      <Hands />
      
      <VRSprayBottle onSpray={onSpray} />
      
      <group position={plantPosition}>
        {children}
      </group>
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={0x2a3a2a} />
      </mesh>
    </>
  );
}

export function VRCanvas({ children, enableVR = false }) {
  const [vrSupported, setVrSupported] = useState(false);

  React.useEffect(() => {
    if ('xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setVrSupported(supported);
        if (supported && enableVR) {
          toast.success('VR Ready! Click VR button to enter');
        }
      });
    }
  }, [enableVR]);

  if (!enableVR) {
    return <>{children}</>;
  }

  return (
    <>
      <VRButton />
      <Canvas>
        <XR>
          {children}
        </XR>
      </Canvas>
    </>
  );
}

export default {
  VRSprayBottle,
  VRGameScene,
  VRCanvas
};