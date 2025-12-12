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
  const lastSprayTimeRef = useRef(0);

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

      const potGeometry = new THREE.CylinderGeometry(0.6, 0.5, 0.9, 32);
      const potMaterial = new THREE.MeshPhongMaterial({
        color: 0x6b4423,
        shininess: 30,
        specular: 0x222222,
      });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.y = 0.45;
      pot.castShadow = true;
      pot.receiveShadow = true;
      plantGroup.add(pot);

      const soilGeometry = new THREE.CylinderGeometry(0.58, 0.58, 0.1, 32);
      const soilMaterial = new THREE.MeshPhongMaterial({
        color: 0x3d2817,
        shininess: 5,
      });
      const soil = new THREE.Mesh(soilGeometry, soilMaterial);
      soil.position.y = 0.92;
      plantGroup.add(soil);

      const leafMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x32CD32,
        shininess: 60,
        specular: 0x88FF88,
      });
      const stemMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x228B22,
        shininess: 40,
        specular: 0x66DD66,
      });

      const stemGeo = new THREE.CylinderGeometry(0.09, 0.13, 3.2, 16);
      const stem = new THREE.Mesh(stemGeo, stemMaterial);
      stem.position.y = 1.6;
      stem.castShadow = true;
      plantGroup.add(stem);

      const createLeaf = () => {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.lineTo(0.15, 0.15);
        leafShape.lineTo(0.12, 0.35);
        leafShape.lineTo(0.2, 0.55);
        leafShape.lineTo(0, 1.0);
        leafShape.lineTo(-0.2, 0.55);
        leafShape.lineTo(-0.12, 0.35);
        leafShape.lineTo(-0.15, 0.15);
        leafShape.lineTo(0, 0);

        const extrudeSettings = {
          steps: 2,
          depth: 0.04,
          bevelEnabled: true,
          bevelThickness: 0.01,
          bevelSize: 0.01,
          bevelSegments: 3,
        };
        const leafGeo = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
        const leaf = new THREE.Mesh(leafGeo, leafMaterial);
        leaf.castShadow = true;
        leaf.receiveShadow = true;
        return leaf;
      };

      for (let i = 0; i < 8; i++) {
        const leaf = createLeaf();
        leaf.position.y = 0.6 + i * 0.45;
        leaf.rotation.x = Math.PI / 3.5;
        leaf.rotation.y = i * (Math.PI * 2 / 8);
        const scale = 1.3 - i * 0.08;
        leaf.scale.set(scale, scale, scale);
        plantGroup.add(leaf);
      }

      const budMaterial = new THREE.MeshPhongMaterial({
        color: 0x9ACD32,
        shininess: 80,
        specular: 0xAAFF88,
      });

      const budGroup = new THREE.Group();
      for (let j = 0; j < 30; j++) {
        const budGeo = new THREE.SphereGeometry(0.09, 12, 12);
        const bud = new THREE.Mesh(budGeo, budMaterial);
        bud.position.set(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.5
        );
        bud.castShadow = true;
        budGroup.add(bud);
      }
      budGroup.position.y = 3.2;
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

      const bottleGeometry = new THREE.CylinderGeometry(0.15, 0.14, 0.5, 32);
      const bottleMaterial = new THREE.MeshPhongMaterial({
        color: 0xADD8E6,
        transparent: true,
        opacity: 0.7,
        shininess: 90,
        specular: 0xFFFFFF,
      });
      const bottle = new THREE.Mesh(bottleGeometry, bottleMaterial);
      bottle.position.y = 0.15;
      bottle.castShadow = true;
      bottle.receiveShadow = true;
      group.add(bottle);

      const liquidGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.4, 32);
      const liquidMaterial = new THREE.MeshPhongMaterial({
        color: 0x00CED1,
        transparent: true,
        opacity: 0.8,
        shininess: 100,
        specular: 0xFFFFFF,
      });
      const liquid = new THREE.Mesh(liquidGeometry, liquidMaterial);
      liquid.position.y = 0.1;
      group.add(liquid);

      const capGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 32);
      const capMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a1a,
        shininess: 80,
        specular: 0x666666,
      });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.y = 0.44;
      cap.castShadow = true;
      group.add(cap);

      const triggerGeometry = new THREE.BoxGeometry(0.1, 0.18, 0.22);
      const trigger = new THREE.Mesh(triggerGeometry, capMaterial);
      trigger.position.set(0, 0.2, 0.15);
      trigger.rotation.x = -Math.PI / 8;
      trigger.castShadow = true;
      group.add(trigger);

      const nozzleGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.12, 16);
      const nozzle = new THREE.Mesh(nozzleGeometry, capMaterial);
      nozzle.position.set(0, 0.4, 0.18);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.castShadow = true;
      group.add(nozzle);

      group.position.set(2.2, 1.2, 4);
      group.rotation.y = -Math.PI / 6;
      group.rotation.x = -Math.PI / 12;
      group.scale.set(2.5, 2.5, 2.5);

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

      const currentTime = Date.now();
      const sprayDelay = Math.max(50, 500 - (spraySpeed - 1) * 45);
      
      if (currentTime - lastSprayTimeRef.current < sprayDelay) {
        return;
      }
      lastSprayTimeRef.current = currentTime;

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
              const baseDamage = 25;
              const damage = baseDamage + (sprayPotency - 1) * 15;
              onPestHit(pestId, damage);
              createHitEffect(intersects[0].point);
              break;
            }
            hitPest = hitPest.parent;
          }
        }
      }
    };

    const createAdvancedSprayEffect = () => {
      const baseParticleCount = 150;
      const particleCount = Math.floor(baseParticleCount * (1 + (sprayRadius - 1) * 0.3));
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

      const potencyColorMultiplier = 0.5 + (sprayPotency / 10) * 0.5;
      const baseSpread = 0.35;
      const spread = baseSpread * (1 + (sprayRadius - 1) * 0.15);

      for (let i = 0; i < particleCount; i++) {
        positions.push(sprayOrigin.x, sprayOrigin.y, sprayOrigin.z);

        const speedVariance = 0.2 + Math.random() * 0.15;
        const velocity = direction.clone()
          .multiplyScalar(speedVariance)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread * 0.7,
            (Math.random() - 0.5) * spread
          ));
        velocities.push(velocity);

        const cyan = (0.5 + Math.random() * 0.5) * potencyColorMultiplier;
        const brightness = (0.8 + Math.random() * 0.2) * potencyColorMultiplier;
        const greenBoost = Math.min(1, sprayPotency / 5);
        colors.push(
          cyan * 0.4 * brightness + greenBoost * 0.3, 
          cyan * brightness + greenBoost * 0.5, 
          cyan * 0.9 * brightness
        );
        
        const baseSize = 0.1 + Math.random() * 0.08;
        sizes.push(baseSize * (1 + (sprayRadius - 1) * 0.1));
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.15 * (1 + (sprayRadius - 1) * 0.1),
        vertexColors: true,
        transparent: true,
        opacity: 0.85 + (sprayPotency - 1) * 0.01,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        map: createGlowTexture(),
      });

      const particles = new THREE.Points(geometry, material);
      particles.userData = { velocities, life: 1.2, isSpray: true };
      scene.add(particles);
      sprayParticlesRef.current.push(particles);

      const coneSize = 0.05 * (1 + (sprayRadius - 1) * 0.2);
      const coneHeight = 0.3 * (1 + (sprayRadius - 1) * 0.15);
      const coneGeometry = new THREE.ConeGeometry(coneSize, coneHeight, 8);
      const coneColor = new THREE.Color(0x00ffff).lerp(new THREE.Color(0x00ff88), (sprayPotency - 1) / 9);
      const coneMaterial = new THREE.MeshBasicMaterial({
        color: coneColor,
        transparent: true,
        opacity: 0.3 + (sprayPotency - 1) * 0.02,
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
      const baseParticleCount = 50;
      const particleCount = Math.floor(baseParticleCount * (1 + (sprayPotency - 1) * 0.2));
      const positions = [];
      const colors = [];
      const velocities = [];
      const sizes = [];

      const impactIntensity = 1 + (sprayPotency - 1) * 0.15;

      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = Math.random() * 0.3;
        positions.push(
          position.x + Math.cos(angle) * distance * 0.5,
          position.y + Math.random() * 0.2,
          position.z + Math.sin(angle) * distance * 0.5
        );

        const explosionForce = (0.12 + Math.random() * 0.1) * impactIntensity;
        const velocity = new THREE.Vector3(
          Math.cos(angle) * explosionForce,
          Math.random() * 0.15 + 0.05,
          Math.sin(angle) * explosionForce
        );
        velocities.push(velocity);

        const potencyFactor = sprayPotency / 10;
        const green = (0.5 + Math.random() * 0.5) * (1 + potencyFactor * 0.5);
        const yellow = Math.random() * 0.4 * (1 + potencyFactor);
        const red = potencyFactor * 0.3;
        colors.push(yellow + green * 0.3 + red, green, yellow * 0.5);
        sizes.push((0.12 + Math.random() * 0.1) * impactIntensity);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.2 * impactIntensity,
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

      const shockwaveSize = 0.25 * (1 + (sprayPotency - 1) * 0.1);
      const shockwaveGeometry = new THREE.RingGeometry(0.05, shockwaveSize, 16);
      const shockwaveColor = new THREE.Color(0xffff00).lerp(new THREE.Color(0xff6600), (sprayPotency - 1) / 9);
      const shockwaveMaterial = new THREE.MeshBasicMaterial({
        color: shockwaveColor,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
      shockwave.position.copy(position);
      shockwave.rotation.x = -Math.PI / 2;
      shockwave.userData = { life: 0.6, isShockwave: true, scale: 1 };
      scene.add(shockwave);
      sprayParticlesRef.current.push(shockwave);

      const glowCount = 5 + Math.floor((sprayPotency - 1) * 0.5);
      for (let i = 0; i < glowCount; i++) {
        const glowSize = 0.25 * (1 + (sprayPotency - 1) * 0.08);
        const glowGeometry = new THREE.SphereGeometry(glowSize, 8, 8);
        const glowColor = new THREE.Color(0xffaa00).lerp(new THREE.Color(0xff3300), (sprayPotency - 1) / 9);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.7,
          blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(position);
        glow.userData = { life: 0.4 + i * 0.1, isGlow: true };
        scene.add(glow);
        sprayParticlesRef.current.push(glow);
      }

      const flashSize = 0.5 * impactIntensity;
      const flashGeometry = new THREE.SphereGeometry(flashSize, 16, 16);
      const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const flash = new THREE.Mesh(flashGeometry, flashMaterial);
      flash.position.copy(position);
      flash.userData = { life: 0.15, isFlash: true };
      scene.add(flash);
      sprayParticlesRef.current.push(flash);
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
          const targetX = 2.2 + mouseRef.current.x * 0.6;
          const targetY = 1.2 + mouseRef.current.y * 0.5;
          sprayBottleRef.current.position.x += (targetX - sprayBottleRef.current.position.x) * 0.12;
          sprayBottleRef.current.position.y += (targetY - sprayBottleRef.current.position.y) * 0.12;

          const idleBob = Math.sin(t * 1.2) * 0.02;
          sprayBottleRef.current.position.y += idleBob;
        }

        Object.keys(pestMeshesRef.current).forEach((id) => {
          const mesh = pestMeshesRef.current[id];
          const pestData = pests.find((p) => p.id === id);
          if (pestData && mesh) {
            if (!mesh.userData.targetAngle) {
              mesh.userData.targetAngle = Math.random() * Math.PI * 2;
              mesh.userData.changeTime = t + Math.random() * 3 + 2;
              mesh.userData.approachPhase = Math.random() > 0.3;
            }

            if (t > mesh.userData.changeTime) {
              mesh.userData.targetAngle = Math.random() * Math.PI * 2;
              mesh.userData.changeTime = t + Math.random() * 3 + 2;
              mesh.userData.approachPhase = !mesh.userData.approachPhase;
            }

            const distanceToCenter = Math.sqrt(
              Math.pow(mesh.position.x, 2) + Math.pow(mesh.position.z, 2)
            );

            let direction;
            if (mesh.userData.approachPhase || distanceToCenter > 10) {
              const target = new THREE.Vector3(
                Math.cos(mesh.userData.targetAngle) * 1.5,
                mesh.position.y,
                Math.sin(mesh.userData.targetAngle) * 1.5
              );
              direction = new THREE.Vector3().subVectors(target, mesh.position).normalize();
            } else {
              direction = new THREE.Vector3(
                Math.cos(mesh.userData.targetAngle),
                0,
                Math.sin(mesh.userData.targetAngle)
              );
            }

            const speed = pestData.speed * 0.015;
            mesh.position.add(direction.multiplyScalar(speed));

            const targetRotation = Math.atan2(direction.x, direction.z);
            mesh.rotation.y += (targetRotation - mesh.rotation.y) * 0.1;

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

            if (distanceToCenter < 2) {
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
            particleSystem.material.opacity = particleSystem.userData.life * 0.7;
          }

          if (particleSystem.userData.isFlash) {
            const scale = 1 + (1 - particleSystem.userData.life) * 0.5;
            particleSystem.scale.set(scale, scale, scale);
            particleSystem.material.opacity = particleSystem.userData.life * 2;
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
  }, [isPaused, activeSkin, level, spraySpeed, sprayRadius, sprayPotency]);

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
    const baseColor = new THREE.Color(pest.color || '#FFA500');
    const darkColor = baseColor.clone().multiplyScalar(0.5);

    const sizeMap = { tiny: 0.3, small: 0.4, medium: 0.55, large: 0.75 };
    const baseSize = sizeMap[pest.size] || 0.45;

    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: baseColor,
      shininess: 70,
      specular: 0xFFFFFF,
    });
    const stripeMaterial = new THREE.MeshPhongMaterial({ 
      color: darkColor,
      shininess: 60,
      specular: 0xCCCCCC,
    });

    const segmentCount = 7;
    for (let i = 0; i < segmentCount; i++) {
      const segmentGeo = new THREE.SphereGeometry(baseSize * 0.32, 16, 16);
      const segment = new THREE.Mesh(segmentGeo, bodyMaterial);
      segment.position.z = i * baseSize * 0.5;
      segment.castShadow = true;
      segment.receiveShadow = true;
      caterpillarGroup.add(segment);

      if (i < segmentCount - 1) {
        const stripeGeo = new THREE.TorusGeometry(baseSize * 0.34, baseSize * 0.06, 8, 16);
        const stripe = new THREE.Mesh(stripeGeo, stripeMaterial);
        stripe.position.z = i * baseSize * 0.5 + baseSize * 0.25;
        stripe.castShadow = true;
        caterpillarGroup.add(stripe);
      }
    }

    const headGeo = new THREE.SphereGeometry(baseSize * 0.38, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMaterial);
    head.position.z = segmentCount * baseSize * 0.5;
    head.castShadow = true;
    head.receiveShadow = true;
    caterpillarGroup.add(head);

    const eyeGeo = new THREE.SphereGeometry(baseSize * 0.09, 12, 12);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x000000,
      shininess: 100,
      specular: 0xFFFFFF,
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    leftEye.position.set(baseSize * 0.18, baseSize * 0.12, segmentCount * baseSize * 0.5 + baseSize * 0.22);
    leftEye.castShadow = true;
    caterpillarGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMaterial);
    rightEye.position.set(-baseSize * 0.18, baseSize * 0.12, segmentCount * baseSize * 0.5 + baseSize * 0.22);
    rightEye.castShadow = true;
    caterpillarGroup.add(rightEye);

    const antennaGeo = new THREE.CylinderGeometry(baseSize * 0.03, baseSize * 0.03, baseSize * 0.25, 8);
    const antennaMaterial = new THREE.MeshPhongMaterial({
      color: darkColor,
      shininess: 50,
    });
    const antenna1 = new THREE.Mesh(antennaGeo, antennaMaterial);
    antenna1.position.set(baseSize * 0.16, baseSize * 0.24, segmentCount * baseSize * 0.5 + baseSize * 0.15);
    antenna1.rotation.x = Math.PI / 3;
    antenna1.rotation.z = -Math.PI / 5;
    antenna1.castShadow = true;
    caterpillarGroup.add(antenna1);

    const antenna2 = new THREE.Mesh(antennaGeo, antennaMaterial);
    antenna2.position.set(-baseSize * 0.16, baseSize * 0.24, segmentCount * baseSize * 0.5 + baseSize * 0.15);
    antenna2.rotation.x = Math.PI / 3;
    antenna2.rotation.z = Math.PI / 5;
    antenna2.castShadow = true;
    caterpillarGroup.add(antenna2);

    const legPairs = 5;
    for (let i = 0; i < legPairs; i++) {
      for (let side = -1; side <= 1; side += 2) {
        const legGeo = new THREE.CylinderGeometry(baseSize * 0.045, baseSize * 0.035, baseSize * 0.45, 8);
        const leg = new THREE.Mesh(legGeo, antennaMaterial);
        leg.position.set(
          side * baseSize * 0.28,
          -baseSize * 0.22,
          i * baseSize * 0.55 + baseSize * 0.35
        );
        leg.rotation.z = side * (Math.PI / 3);
        leg.rotation.x = Math.PI / 8;
        leg.castShadow = true;
        caterpillarGroup.add(leg);
      }
    }

    caterpillarGroup.rotation.x = Math.PI / 2;
    caterpillarGroup.scale.set(1.6, 1.6, 1.6);

    return caterpillarGroup;
  };

  return <div ref={mountRef} className="w-full h-full absolute inset-0" />;
}