import React, { useRef, useState } from 'react';
import { Physics, RigidBody, CuboidCollider, BallCollider, CapsuleCollider } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function PhysicsWorld({ children, gravity = [0, -9.81, 0], debug = false }) {
  return (
    <Physics gravity={gravity} debug={debug} timeStep={1/60}>
      {children}
    </Physics>
  );
}

export function PhysicsPlantPot({ position = [0, 0, 0], onCollision }) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider args={[0.35, 0.25, 0.35]} position={[0, 0.2, 0]} />
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.3, 0.45, 24]} />
        <meshStandardMaterial color={0x8b4513} roughness={0.8} />
      </mesh>
    </RigidBody>
  );
}

export function PhysicsSprayDroplet({ 
  position = [0, 0, 0], 
  velocity = [0, 0, 0], 
  onHit,
  lifespan = 2000 
}) {
  const rbRef = useRef();
  const [isAlive, setIsAlive] = useState(true);
  const birthTime = useRef(Date.now());

  useFrame(() => {
    if (Date.now() - birthTime.current > lifespan) {
      setIsAlive(false);
    }
  });

  if (!isAlive) return null;

  return (
    <RigidBody
      ref={rbRef}
      position={position}
      linearVelocity={velocity}
      gravityScale={0.8}
      colliders={false}
      onCollisionEnter={(e) => {
        if (onHit) onHit(e);
        setIsAlive(false);
      }}
    >
      <BallCollider args={[0.02]} />
      <mesh>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial 
          color={0x80d4ff} 
          emissive={0x4a9dff} 
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
    </RigidBody>
  );
}

export function PhysicsPest({ 
  position = [0, 1, -5], 
  targetPosition = [0, 0.5, -1.5],
  speed = 0.5,
  onReachTarget,
  health = 100,
  pestData
}) {
  const rbRef = useRef();
  const [currentHealth, setCurrentHealth] = useState(health);

  useFrame(() => {
    if (!rbRef.current || currentHealth <= 0) return;

    const currentPos = rbRef.current.translation();
    const direction = new THREE.Vector3(
      targetPosition[0] - currentPos.x,
      targetPosition[1] - currentPos.y,
      targetPosition[2] - currentPos.z
    );
    
    const distance = direction.length();
    
    if (distance < 0.5) {
      if (onReachTarget) onReachTarget();
      return;
    }
    
    direction.normalize().multiplyScalar(speed);
    
    rbRef.current.setLinvel({
      x: direction.x,
      y: direction.y,
      z: direction.z
    }, true);
  });

  if (currentHealth <= 0) return null;

  const pestSize = {
    tiny: 0.03,
    small: 0.05,
    medium: 0.08,
    large: 0.12
  }[pestData?.size_category || 'small'];

  return (
    <RigidBody
      ref={rbRef}
      position={position}
      colliders={false}
      type="dynamic"
      linearDamping={2}
      angularDamping={2}
    >
      <CapsuleCollider args={[pestSize * 0.5, pestSize]} />
      <mesh castShadow>
        <capsuleGeometry args={[pestSize, pestSize * 2, 8, 16]} />
        <meshStandardMaterial 
          color={pestData?.color || 0x88dd66}
          roughness={0.6}
          metalness={0.2}
          emissive={pestData?.color || 0x88dd66}
          emissiveIntensity={0.2}
        />
      </mesh>
    </RigidBody>
  );
}

export function PhysicsGround({ size = [100, 1, 100], position = [0, -0.5, 0] }) {
  return (
    <RigidBody type="fixed" position={position} colliders={false}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh receiveShadow visible={false}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={0x2a3a2a} />
      </mesh>
    </RigidBody>
  );
}

export function SprayParticleSystem({ 
  camera, 
  isSpraying, 
  onPestHit,
  activePests = [] 
}) {
  const [droplets, setDroplets] = useState([]);
  const sprayIntervalRef = useRef();
  const dropletIdCounter = useRef(0);

  useFrame(() => {
    if (isSpraying) {
      if (!sprayIntervalRef.current || Date.now() - sprayIntervalRef.current > 50) {
        sprayIntervalRef.current = Date.now();
        
        const sprayOrigin = camera.position.clone();
        sprayOrigin.add(new THREE.Vector3(0.15, -0.1, -0.3));
        
        const sprayDirection = new THREE.Vector3(0, 0, -1);
        sprayDirection.applyQuaternion(camera.quaternion);
        
        const spread = 0.15;
        const velocity = sprayDirection.multiplyScalar(6 + Math.random() * 2);
        velocity.x += (Math.random() - 0.5) * spread;
        velocity.y += (Math.random() - 0.5) * spread;
        velocity.z += (Math.random() - 0.5) * spread;
        
        for (let i = 0; i < 3; i++) {
          setDroplets(prev => [...prev, {
            id: dropletIdCounter.current++,
            position: [sprayOrigin.x, sprayOrigin.y, sprayOrigin.z],
            velocity: [velocity.x, velocity.y, velocity.z]
          }]);
        }
      }
    }
  });

  useFrame(() => {
    setDroplets(prev => prev.filter(d => Date.now() - d.birthTime < 2000));
  });

  const handleDropletHit = (collision, dropletId) => {
    const hitBody = collision.other.rigidBodyObject;
    
    activePests.forEach(pest => {
      if (hitBody?.userData?.pestId === pest.id && onPestHit) {
        onPestHit(pest.id, 25);
      }
    });
    
    setDroplets(prev => prev.filter(d => d.id !== dropletId));
  };

  return (
    <>
      {droplets.map(droplet => (
        <PhysicsSprayDroplet
          key={droplet.id}
          position={droplet.position}
          velocity={droplet.velocity}
          onHit={(collision) => handleDropletHit(collision, droplet.id)}
          lifespan={2000}
        />
      ))}
    </>
  );
}

export default {
  PhysicsWorld,
  PhysicsPlantPot,
  PhysicsSprayDroplet,
  PhysicsPest,
  PhysicsGround,
  SprayParticleSystem
};