import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function GameScene({ pests, onPestHit, onSpray, sprayRange, isPaused, onPestClick, activeSkin, level }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const pestMeshesRef = useRef({});
  const plantRef = useRef(null);
  const sprayParticlesRef = useRef([]);
  const sprayBottleRef = useRef(null);
  const handRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const bgColor = level <= 3 ? 0x1a3d1a : level <= 6 ? 0x1a1a3d : 0x3d1a1a;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 8, 25);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, 5);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfff8e8, 1.8);
    mainLight.position.set(4, 10, 6);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    fillLight.position.set(-3, 5, -3);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0x66ff88, 0.6);
    rimLight.position.set(0, 8, -8);
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 0.5;
    rimLight.decay = 2;
    rimLight.distance = 20;
    scene.add(rimLight);

    const groundGeometry = new THREE.PlaneGeometry(50, 50, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2b1a,
      roughness: 0.9,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const createRealisticCannabisPlant = () => {
      const plantGroup = new THREE.Group();

      const potGeometry = new THREE.CylinderGeometry(0.5, 0.4, 0.8, 12);
      const potMaterial = new THREE.MeshLambertMaterial({
        color: 0x6b4423,
        flatShading: true,
      });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.y = 0.4;
      pot.castShadow = true;
      pot.receiveShadow = true;
      plantGroup.add(pot);

      const soilGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12);
      const soilMaterial = new THREE.MeshLambertMaterial({
        color: 0x3d2817,
        flatShading: true,
      });
      const soil = new THREE.Mesh(soilGeometry, soilMaterial);
      soil.position.y = 0.82;
      plantGroup.add(soil);

      const leafMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4A7F1B, 
        flatShading: true 
      });
      const stemMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x3A5F0B, 
        flatShading: true 
      });

      const stemGeo = new THREE.CylinderGeometry(0.08, 0.12, 3, 8);
      const stem = new THREE.Mesh(stemGeo, stemMaterial);
      stem.position.y = 1.5;
      stem.castShadow = true;
      plantGroup.add(stem);

      const createLeaf = () => {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.lineTo(0.1, 0.1);
        leafShape.lineTo(0.08, 0.25);
        leafShape.lineTo(0.15, 0.4);
        leafShape.lineTo(0, 0.8);
        leafShape.lineTo(-0.15, 0.4);
        leafShape.lineTo(-0.08, 0.25);
        leafShape.lineTo(-0.1, 0.1);
        leafShape.lineTo(0, 0);

        const extrudeSettings = {
          steps: 1,
          depth: 0.02,
          bevelEnabled: false,
        };
        const leafGeo = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
        const leaf = new THREE.Mesh(leafGeo, leafMaterial);
        leaf.castShadow = true;
        return leaf;
      };

      for (let i = 0; i < 6; i++) {
        const leaf = createLeaf();
        leaf.position.y = 0.5 + i * 0.5;
        leaf.rotation.x = Math.PI / 3;
        leaf.rotation.y = i * (Math.PI * 2 / 6);
        const scale = 1.2 - i * 0.1;
        leaf.scale.set(scale, scale, scale);
        plantGroup.add(leaf);
      }

      const budGroup = new THREE.Group();
      for (let j = 0; j < 20; j++) {
        const budGeo = new THREE.SphereGeometry(0.08, 5, 5);
        const bud = new THREE.Mesh(budGeo, leafMaterial);
        bud.position.set(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.4
        );
        budGroup.add(bud);
      }
      budGroup.position.y = 3;
      plantGroup.add(budGroup);

      return plantGroup;
    };

    const plant = createRealisticCannabisPlant();
    scene.add(plant);
    plantRef.current = plant;

    const createSprayBottleWithHand = () => {
      const group = new THREE.Group();

      const handGeometry = new THREE.BoxGeometry(0.25, 0.35, 0.15);
      const handMaterial = new THREE.MeshStandardMaterial({
        color: 0xd4a574,
        roughness: 0.7,
        metalness: 0.1,
      });
      const hand = new THREE.Mesh(handGeometry, handMaterial);
      hand.position.set(0, -0.3, 0.05);
      hand.castShadow = true;
      group.add(hand);
      handRef.current = hand;

      const thumbGeometry = new THREE.BoxGeometry(0.05, 0.12, 0.06);
      const fingerMaterial = new THREE.MeshStandardMaterial({ color: 0xc89b6a, roughness: 0.8 });
      const thumb = new THREE.Mesh(thumbGeometry, fingerMaterial);
      thumb.position.set(0.14, -0.25, 0.05);
      thumb.rotation.z = Math.PI / 4;
      thumb.castShadow = true;
      group.add(thumb);

      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), fingerMaterial);
        finger.position.set(-0.08 + i * 0.05, -0.15, 0.08);
        finger.castShadow = true;
        group.add(finger);
      }

      const bottleGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 20);
      const bottleMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe8f4ff,
        transparent: true,
        opacity: 0.4,
        transmission: 0.9,
        thickness: 0.5,
        roughness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
      });
      const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
      bottle.position.y = 0.1;
      bottle.castShadow = true;
      bottle.receiveShadow = true;
      group.add(bottle);

      const liquidGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.32, 20);
      const liquidMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.6,
        transmission: 0.8,
        roughness: 0.2,
      });
      const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
      liquid.position.y = 0.06;
      group.add(liquid);

      const capGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 20);
      const capMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.4,
        metalness: 0.6,
      });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.y = 0.33;
      cap.castShadow = true;
      group.add(cap);

      const triggerGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.18);
      const trigger = new THREE.Mesh(triggerGeometry, capMaterial);
      trigger.position.set(0, 0.15, 0.12);
      trigger.rotation.x = -Math.PI / 8;
      trigger.castShadow = true;
      group.add(trigger);

      const nozzleGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.1, 12);
      const nozzle = new THREE.Mesh(nozzleGeometry, capMaterial);
      nozzle.position.set(0, 0.3, 0.15);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.castShadow = true;
      group.add(nozzle);

      group.position.set(1.8, 0.5, 3.5);
      group.rotation.y = -Math.PI / 6;
      group.rotation.x = -Math.PI / 12;
      group.scale.set(1.3, 1.3, 1.3);

      return group;
    };

    const sprayBottle = createSprayBottleWithHand();
    scene.add(sprayBottle);
    sprayBottleRef.current = sprayBottle;

    const handleMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = (event) => {
      if (isPaused) return;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      if (sprayBottleRef.current) {
        sprayBottleRef.current.rotation.x = -Math.PI / 6;
        setTimeout(() => {
          if (sprayBottleRef.current) sprayBottleRef.current.rotation.x = -Math.PI / 12;
        }, 120);
      }

      if (onSpray()) {
        createAdvancedSprayEffect();

        const pestMeshes = Object.values(pestMeshesRef.current);
        const intersects = raycasterRef.current.intersectObjects(pestMeshes, true);

        if (intersects.length > 0) {
          let hitPest = intersects[0].object;
          while (hitPest.parent && hitPest.parent !== scene) {
            const pestId = Object.keys(pestMeshesRef.current).find(
              (key) => pestMeshesRef.current[key] === hitPest
            );
            if (pestId) {
              const damage = 25 + sprayRange * 5;
              onPestHit(pestId, damage);
              createHitEffect(intersects[0].point);

              const pest = pests.find((p) => p.id === pestId);
              if (pest && onPestClick) {
                onPestClick(pest);
              }
              break;
            }
            hitPest = hitPest.parent;
          }
        }
      }
    };

    const createAdvancedSprayEffect = () => {
      const particleCount = 150;
      const positions = [];
      const colors = [];
      const sizes = [];
      const velocities = [];

      const sprayOrigin = new THREE.Vector3();
      if (sprayBottleRef.current) {
        sprayOrigin.copy(sprayBottleRef.current.position);
        sprayOrigin.y += 0.4;
        sprayOrigin.z -= 0.3;
      }

      const targetPos = new THREE.Vector3();
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      targetPos.copy(raycasterRef.current.ray.direction).multiplyScalar(5).add(cameraRef.current.position);

      const direction = new THREE.Vector3().subVectors(targetPos, sprayOrigin).normalize();

      for (let i = 0; i < particleCount; i++) {
        positions.push(sprayOrigin.x, sprayOrigin.y, sprayOrigin.z);

        const spread = 0.35;
        const speedVariance = 0.2 + Math.random() * 0.15;
        const velocity = direction.clone()
          .multiplyScalar(speedVariance)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread * 0.7,
            (Math.random() - 0.5) * spread
          ));
        velocities.push(velocity);

        const cyan = 0.5 + Math.random() * 0.5;
        const brightness = 0.8 + Math.random() * 0.2;
        colors.push(cyan * 0.4 * brightness, cyan * brightness, cyan * 0.9 * brightness);
        sizes.push(0.1 + Math.random() * 0.08);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        map: createGlowTexture(),
      });

      const particles = new THREE.Points(geometry, material);
      particles.userData = { velocities, life: 1.2, isSpray: true };
      scene.add(particles);
      sprayParticlesRef.current.push(particles);

      const coneGeometry = new THREE.ConeGeometry(0.05, 0.3, 8);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
      });
      const sprayMist = new THREE.Mesh(coneGeometry, coneMaterial);
      sprayMist.position.copy(sprayOrigin);
      sprayMist.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      sprayMist.userData = { life: 0.4, isMist: true };
      scene.add(sprayMist);
      sprayParticlesRef.current.push(sprayMist);
    };

    const createHitEffect = (position) => {
      const particleCount = 50;
      const positions = [];
      const colors = [];
      const velocities = [];
      const sizes = [];

      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = Math.random() * 0.3;
        positions.push(
          position.x + Math.cos(angle) * distance * 0.5,
          position.y + Math.random() * 0.2,
          position.z + Math.sin(angle) * distance * 0.5
        );

        const explosionForce = 0.12 + Math.random() * 0.1;
        const velocity = new THREE.Vector3(
          Math.cos(angle) * explosionForce,
          Math.random() * 0.15 + 0.05,
          Math.sin(angle) * explosionForce
        );
        velocities.push(velocity);

        const green = 0.5 + Math.random() * 0.5;
        const yellow = Math.random() * 0.4;
        colors.push(yellow + green * 0.3, green, yellow);
        sizes.push(0.12 + Math.random() * 0.1);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        map: createGlowTexture(),
      });

      const particles = new THREE.Points(geometry, material);
      particles.userData = { velocities, life: 1.0, isHit: true };
      scene.add(particles);
      sprayParticlesRef.current.push(particles);

      const shockwaveGeometry = new THREE.RingGeometry(0.05, 0.15, 16);
      const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: 0x66ff66,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
      shockwave.position.copy(position);
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.userData = { life: 0.5, isShockwave: true, scale: 1 };
      scene.add(shockwave);
      sprayParticlesRef.current.push(shockwave);

      for (let i = 0; i < 3; i++) {
        const glowGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x88ff88,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        glow.userData = { life: 0.3 + i * 0.1, isGlow: true };
        scene.add(glow);
        sprayParticlesRef.current.push(glow);
      }
    };

    const createCircleTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    };

    const createGlowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      
      ctx.globalCompositeOperation = 'screen';
      const innerGradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 32);
      innerGradient.addColorStop(0, 'rgba(255,255,255,1)');
      innerGradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = innerGradient;
      ctx.fillRect(0, 0, 128, 128);
      
      return new THREE.CanvasTexture(canvas);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      timeRef.current += 0.016;
      const t = timeRef.current;

      if (!isPaused) {
        if (cameraRef.current) {
          const slowRotation = t * 0.08;
          const fastOscillation = Math.sin(t * 1.2) * 0.15;
          const verticalWave = Math.sin(t * 0.5) * 0.1;
          
          const baseRadius = 5.0;
          const radiusVariation = Math.sin(t * 0.3) * 0.4;
          const currentRadius = baseRadius + radiusVariation;
          
          cameraRef.current.position.x = Math.sin(slowRotation) * currentRadius + fastOscillation;
          cameraRef.current.position.z = Math.cos(slowRotation) * currentRadius + Math.cos(t * 0.9) * 0.2;
          
          const baseHeight = 2.5;
          const heightVariation = Math.sin(t * 0.4) * 0.15;
          cameraRef.current.position.y = baseHeight + heightVariation + verticalWave;
          
          const lookAtTarget = new THREE.Vector3(
            Math.sin(t * 0.15) * 0.1,
            2.5 + Math.sin(t * 0.6) * 0.05,
            Math.cos(t * 0.2) * 0.1
          );
          cameraRef.current.lookAt(lookAtTarget);
        }

        if (plantRef.current) {
          plantRef.current.children.forEach((child, index) => {
            if (child.type === 'Group' && child.children.length > 0) {
              const sway = Math.sin(t * 1.5 + index * 0.8) * 0.015;
              child.rotation.z = sway;
            }
          });
        }

        if (sprayBottleRef.current) {
          const targetX = 1.8 + mouseRef.current.x * 0.4;
          const targetY = 0.5 + mouseRef.current.y * 0.3;
          sprayBottleRef.current.position.x += (targetX - sprayBottleRef.current.position.x) * 0.08;
          sprayBottleRef.current.position.y += (targetY - sprayBottleRef.current.position.y) * 0.08;

          const idleBob = Math.sin(t * 1.2) * 0.015;
          sprayBottleRef.current.position.y += idleBob;
        }

        Object.keys(pestMeshesRef.current).forEach((id) => {
          const mesh = pestMeshesRef.current[id];
          const pestData = pests.find((p) => p.id === id);
          if (pestData && mesh) {
            const target = new THREE.Vector3(0, mesh.position.y, 0);
            const direction = new THREE.Vector3().subVectors(target, mesh.position).normalize();
            const distance = mesh.position.distanceTo(target);

            const speed = pestData.speed * 0.012;
            mesh.position.add(direction.multiplyScalar(speed));

            if (distance > 0.5) {
              const targetRotation = Math.atan2(direction.x, direction.z);
              mesh.rotation.y += (targetRotation - mesh.rotation.y) * 0.1;
            }

            const crawlSpeed = pestData.speed * 2;
            const crawl = Math.sin(t * crawlSpeed + parseInt(id.slice(-3)) * 0.5);
            const wiggle = Math.sin(t * crawlSpeed * 1.5 + parseInt(id.slice(-3)) * 0.3) * 0.1;
            
            mesh.scale.set(1 + crawl * 0.12, 1 - crawl * 0.1, 1 + crawl * 0.06);
            mesh.rotation.z = wiggle;

            mesh.children.forEach((child, index) => {
              if (child.type === 'Mesh' && index > 0) {
                const segmentWave = Math.sin(t * crawlSpeed - index * 0.5);
                child.position.x = Math.sin(segmentWave * 0.3) * 0.05;
                child.rotation.y = segmentWave * 0.2;
              }
            });

            if (distance < 2) {
              const attackAnim = Math.sin(t * 10);
              mesh.scale.y += attackAnim * 0.05;
              mesh.rotation.x = Math.sin(t * 8) * 0.1;
            }
          }
        });

        for (let i = sprayParticlesRef.current.length - 1; i >= 0; i--) {
          const particleSystem = sprayParticlesRef.current[i];
          particleSystem.userData.life -= 0.016;

          if (particleSystem.userData.life <= 0) {
            scene.remove(particleSystem);
            if (particleSystem.geometry) particleSystem.geometry.dispose();
            if (particleSystem.material) particleSystem.material.dispose();
            sprayParticlesRef.current.splice(i, 1);
            continue;
          }

          if (particleSystem.material && particleSystem.material.opacity !== undefined) {
            particleSystem.material.opacity = Math.max(0, particleSystem.userData.life);
          }

          if (particleSystem.userData.isMist) {
            const scale = 1 + (1 - particleSystem.userData.life) * 2;
            particleSystem.scale.set(scale, 1, scale);
          }

          if (particleSystem.userData.isShockwave) {
            const scale = 1 + (1 - particleSystem.userData.life) * 4;
            particleSystem.scale.set(scale, scale, 1);
            particleSystem.material.opacity = particleSystem.userData.life * 0.6;
          }

          if (particleSystem.userData.isGlow) {
            const scale = 1 + (1 - particleSystem.userData.life) * 1.5;
            particleSystem.scale.set(scale, scale, scale);
            particleSystem.material.opacity = particleSystem.userData.life * 0.4;
          }

          if (particleSystem.userData.isDeath && particleSystem.userData.velocity) {
            particleSystem.position.add(particleSystem.userData.velocity);
            particleSystem.userData.velocity.y -= 0.012;
            particleSystem.userData.velocity.multiplyScalar(0.96);
            particleSystem.scale.multiplyScalar(0.95);
            if (particleSystem.material) {
              particleSystem.material.opacity = particleSystem.userData.life;
            }
          }

          if (particleSystem.userData.velocities) {
            const positions = particleSystem.geometry.attributes.position.array;
            for (let j = 0; j < particleSystem.userData.velocities.length; j++) {
              const velocity = particleSystem.userData.velocities[j];
              positions[j * 3] += velocity.x;
              positions[j * 3 + 1] += velocity.y;
              positions[j * 3 + 2] += velocity.z;

              if (particleSystem.userData.isSpray) {
                velocity.y -= 0.01;
                velocity.multiplyScalar(0.97);
              } else if (particleSystem.userData.isHit) {
                velocity.y -= 0.015;
                velocity.multiplyScalar(0.95);
              }
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isPaused, activeSkin, level]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const currentIds = pests.map((p) => p.id);
    Object.keys(pestMeshesRef.current).forEach((id) => {
      if (!currentIds.includes(id)) {
        const mesh = pestMeshesRef.current[id];
        const deathPos = mesh.position.clone();
        
        for (let i = 0; i < 15; i++) {
          const angle = (i / 15) * Math.PI * 2;
          const radius = Math.random() * 0.3;
          const particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
          const particleMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.8, 0.5),
            transparent: true,
            opacity: 0.9,
          });
          const particle = new THREE.Mesh(particleGeometry, particleMaterial);
          particle.position.copy(deathPos);
          particle.userData = {
            velocity: new THREE.Vector3(
              Math.cos(angle) * 0.1,
              Math.random() * 0.15 + 0.05,
              Math.sin(angle) * 0.1
            ),
            life: 1.0,
            isDeath: true,
          };
          scene.add(particle);
          sprayParticlesRef.current.push(particle);
        }
        
        let scale = 1;
        let rotX = 0;
        let rotZ = 0;
        let posY = mesh.position.y;
        const deathAnim = setInterval(() => {
          scale -= 0.12;
          rotX += 0.3;
          rotZ += 0.25;
          posY -= 0.08;
          
          if (mesh && mesh.parent === scene) {
            mesh.scale.setScalar(Math.max(0, scale));
            mesh.rotation.x = rotX;
            mesh.rotation.z = rotZ;
            mesh.position.y = posY;
            
            if (mesh.material && mesh.material.opacity !== undefined) {
              mesh.material.opacity = scale;
              mesh.material.transparent = true;
            }
            
            mesh.children.forEach((child) => {
              if (child.material) {
                child.material.transparent = true;
                child.material.opacity = scale;
              }
            });
            
            if (scale <= 0) {
              clearInterval(deathAnim);
              scene.remove(mesh);
            }
          } else {
            clearInterval(deathAnim);
          }
        }, 35);

        delete pestMeshesRef.current[id];
      }
    });

    pests.forEach((pest) => {
      if (!pestMeshesRef.current[pest.id]) {
        const mesh = createRealisticPest(pest);
        mesh.position.set(pest.position.x, pest.position.y, pest.position.z);
        scene.add(mesh);
        pestMeshesRef.current[pest.id] = mesh;
      } else {
        const healthPercent = pest.health / pest.maxHealth;
        const scale = 0.7 + healthPercent * 0.3;
        pestMeshesRef.current[pest.id].scale.setScalar(scale);
      }
    });
  }, [pests]);

  const createRealisticPest = (pest) => {
    const caterpillarGroup = new THREE.Group();
    const baseColor = new THREE.Color(pest.color || '#8B9F3B');
    const darkColor = baseColor.clone().multiplyScalar(0.3);

    const sizeMap = { tiny: 0.25, small: 0.35, medium: 0.5, large: 0.7 };
    const baseSize = sizeMap[pest.size] || 0.4;

    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: baseColor, 
      flatShading: true 
    });
    const stripeMaterial = new THREE.MeshLambertMaterial({ 
      color: darkColor, 
      flatShading: true 
    });

    const segmentCount = 6;
    for (let i = 0; i < segmentCount; i++) {
      const segmentGeo = new THREE.IcosahedronGeometry(baseSize * 0.3, 1);
      const segment = new THREE.Mesh(segmentGeo, bodyMaterial);
      segment.position.z = i * baseSize * 0.45;
      segment.castShadow = true;
      caterpillarGroup.add(segment);

      if (i < segmentCount - 1) {
        const stripeGeo = new THREE.TorusGeometry(baseSize * 0.33, baseSize * 0.05, 4, 12);
        const stripe = new THREE.Mesh(stripeGeo, stripeMaterial);
        stripe.position.z = i * baseSize * 0.45 + baseSize * 0.225;
        caterpillarGroup.add(stripe);
      }
    }

    const headGeo = new THREE.IcosahedronGeometry(baseSize * 0.35, 1);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.z = segmentCount * baseSize * 0.45;
    head.castShadow = true;
    caterpillarGroup.add(head);

    const eyeGeo = new THREE.IcosahedronGeometry(baseSize * 0.08, 0);
    const eyeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x000000, 
      flatShading: true 
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(baseSize * 0.15, baseSize * 0.1, segmentCount * baseSize * 0.45 + baseSize * 0.2);
    caterpillarGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-baseSize * 0.15, baseSize * 0.1, segmentCount * baseSize * 0.45 + baseSize * 0.2);
    caterpillarGroup.add(rightEye);

    const antennaGeo = new THREE.CylinderGeometry(baseSize * 0.025, baseSize * 0.025, baseSize * 0.2, 4);
    const antenna1 = new THREE.Mesh(antennaGeo, stripeMaterial);
    antenna1.position.set(baseSize * 0.15, baseSize * 0.2, segmentCount * baseSize * 0.45 + baseSize * 0.125);
    antenna1.rotation.x = Math.PI / 3;
    antenna1.rotation.z = -Math.PI / 5;
    antenna1.castShadow = true;
    caterpillarGroup.add(antenna1);

    const antenna2 = new THREE.Mesh(antennaGeo, stripeMaterial);
    antenna2.position.set(-baseSize * 0.15, baseSize * 0.2, segmentCount * baseSize * 0.45 + baseSize * 0.125);
    antenna2.rotation.x = Math.PI / 3;
    antenna2.rotation.z = Math.PI / 5;
    antenna2.castShadow = true;
    caterpillarGroup.add(antenna2);

    const legPairs = 4;
    for (let i = 0; i < legPairs; i++) {
      for (let side = -1; side <= 1; side += 2) {
        const legGeo = new THREE.CylinderGeometry(baseSize * 0.04, baseSize * 0.03, baseSize * 0.4, 4);
        const leg = new THREE.Mesh(legGeo, stripeMaterial);
        leg.position.set(
          side * baseSize * 0.25,
          -baseSize * 0.2,
          i * baseSize * 0.6 + baseSize * 0.3
        );
        leg.rotation.z = side * (Math.PI / 3);
        leg.rotation.x = Math.PI / 8;
        leg.castShadow = true;
        caterpillarGroup.add(leg);
      }
    }

    caterpillarGroup.rotation.x = Math.PI / 2;
    caterpillarGroup.scale.set(1.5, 1.5, 1.5);

    return caterpillarGroup;
  };

  return <div ref={mountRef} className="w-full h-full absolute inset-0" />;
}