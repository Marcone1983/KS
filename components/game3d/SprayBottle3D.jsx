import * as THREE from 'three';

export function createSprayBottle(camera, options = {}) {
  const {
    position = [0.45, -0.5, -0.6],
    rotation = [0.15, -0.3, 0.05],
    scale = 1.3
  } = options;

  const handGroup = new THREE.Group();
  handGroup.position.set(...position);
  handGroup.rotation.set(...rotation);
  handGroup.scale.setScalar(scale);
  camera.add(handGroup);

  // Mano (pelle)
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a589,
    roughness: 0.65,
    metalness: 0.0
  });

  const palm = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 0.06),
    skinMat
  );
  palm.castShadow = true;
  handGroup.add(palm);

  const thumb = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.09, 0.035),
    skinMat
  );
  thumb.position.set(-0.06, 0.05, 0.025);
  thumb.rotation.z = -0.6;
  thumb.castShadow = true;
  handGroup.add(thumb);

  const fingerPositions = [
    { x: 0.04, y: 0.12 },
    { x: 0.018, y: 0.14 },
    { x: -0.01, y: 0.13 },
    { x: -0.035, y: 0.11 }
  ];

  fingerPositions.forEach(pos => {
    const finger = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.11, 0.028),
      skinMat
    );
    finger.position.set(pos.x, pos.y, 0);
    finger.rotation.x = -0.25;
    finger.castShadow = true;
    handGroup.add(finger);
  });

  // Bottiglia spray
  const bottleGroup = new THREE.Group();
  bottleGroup.position.set(0, 0.05, 0.06);
  bottleGroup.rotation.set(0.15, 0.05, 0);
  handGroup.add(bottleGroup);

  // Corpo bottiglia (vetro trasparente)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8f5ff,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.8,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.85,
    transparent: true,
    opacity: 0.15
  });

  const bottleBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.4, 20),
    glassMat
  );
  bottleBody.castShadow = true;
  bottleBody.receiveShadow = true;
  bottleGroup.add(bottleBody);

  // Liquido interno
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0x70c4ff,
    roughness: 0.08,
    transmission: 0.88,
    thickness: 0.6,
    ior: 1.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.7
  });

  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.095, 0.32, 20),
    liquidMat
  );
  liquid.position.y = -0.05;
  bottleGroup.add(liquid);

  // Parti in plastica (nero)
  const plasticMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.25,
    metalness: 0.45,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.15
  });

  // Grilletto
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.11, 0.09),
    plasticMat
  );
  trigger.position.set(0.105, 0.12, 0);
  trigger.castShadow = true;
  bottleGroup.add(trigger);

  // Cappuccio
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.092, 0.075, 20),
    plasticMat
  );
  cap.position.y = 0.24;
  cap.castShadow = true;
  bottleGroup.add(cap);

  // Base ugello
  const nozzleBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.028, 0.045, 16),
    plasticMat
  );
  nozzleBase.position.set(0.08, 0.24, 0);
  nozzleBase.rotation.z = Math.PI / 2;
  nozzleBase.castShadow = true;
  bottleGroup.add(nozzleBase);

  // Punta ugello
  const nozzleTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.016, 0.045, 12),
    plasticMat
  );
  nozzleTip.position.set(0.145, 0.24, 0);
  nozzleTip.rotation.z = -Math.PI / 2;
  nozzleTip.castShadow = true;
  bottleGroup.add(nozzleTip);

  // Punto di emissione spray
  const sprayEmitPoint = new THREE.Object3D();
  sprayEmitPoint.position.set(0.17, 0.24, 0);
  bottleGroup.add(sprayEmitPoint);

  // Sistema particelle spray
  const particleCount = 800;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const lifetimes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;
    lifetimes[i] = 0;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMat = new THREE.PointsMaterial({
    color: 0xc8e8ff,
    size: 0.14,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(particleGeometry, particleMat);
  handGroup.add(particles);

  let particleHead = 0;

  return {
    group: handGroup,
    bottleGroup,
    trigger,
    sprayEmitPoint,
    particles,
    velocities,
    lifetimes,
    particleHead,
    
    spray: (camera, count = 25) => {
      const worldPos = new THREE.Vector3();
      sprayEmitPoint.getWorldPosition(worldPos);
      
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);

      const positions = particles.geometry.attributes.position.array;

      for (let i = 0; i < count; i++) {
        const id = particleHead % particleCount;
        particleHead++;

        const spread = 0.25;
        const speed = 0.75;
        
        const vx = direction.x * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;
        const vy = direction.y * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread * 0.5;
        const vz = direction.z * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;

        positions[id * 3] = worldPos.x;
        positions[id * 3 + 1] = worldPos.y;
        positions[id * 3 + 2] = worldPos.z;

        velocities[id * 3] = vx * speed;
        velocities[id * 3 + 1] = vy * speed;
        velocities[id * 3 + 2] = vz * speed;

        lifetimes[id] = 1.0;
      }

      particles.geometry.attributes.position.needsUpdate = true;
      return particleHead;
    },

    updateParticles: (deltaTime) => {
      const positions = particles.geometry.attributes.position.array;
      const drag = 0.97;
      const gravity = -0.6;

      for (let i = 0; i < particleCount; i++) {
        if (lifetimes[i] <= 0) continue;

        velocities[i * 3] *= drag;
        velocities[i * 3 + 1] = velocities[i * 3 + 1] * drag + gravity * deltaTime;
        velocities[i * 3 + 2] *= drag;

        positions[i * 3] += velocities[i * 3] * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;

        lifetimes[i] -= deltaTime * 1.4;

        if (positions[i * 3 + 1] < 0.01) {
          lifetimes[i] = 0;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
    },

    animateTrigger: (progress) => {
      trigger.rotation.x = -Math.sin(progress * Math.PI) * 0.65;
      bottleGroup.rotation.x = 0.15 - progress * 0.15;
    },

    resetTrigger: () => {
      trigger.rotation.x = 0;
      bottleGroup.rotation.x = 0.15;
    }
  };
}