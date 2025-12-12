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

      const potGeometry = new THREE.CylinderGeometry(0.5, 0.4, 0.8, 32);
      const potMaterial = new THREE.MeshStandardMaterial({
        color: 0x6b4423,
        roughness: 0.85,
        metalness: 0.05,
      });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.y = 0.4;
      pot.castShadow = true;
      pot.receiveShadow = true;
      plantGroup.add(pot);

      const soilGeometry = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 32);
      const soilMaterial = new THREE.MeshStandardMaterial({
        color: 0x3d2817,
        roughness: 1,
      });
      const soil = new THREE.Mesh(soilGeometry, soilMaterial);
      soil.position.y = 0.82;
      plantGroup.add(soil);

      const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.8, 0),
        new THREE.Vector3(0.02, 1.5, 0.01),
        new THREE.Vector3(-0.01, 2.3, -0.01),
        new THREE.Vector3(0.01, 3.2, 0.02),
        new THREE.Vector3(0, 4.0, 0),
      ]);
      const stemGeometry = new THREE.TubeGeometry(stemCurve, 40, 0.08, 16, false);
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a8a2a,
        roughness: 0.7,
        metalness: 0.05,
      });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.castShadow = true;
      plantGroup.add(stem);

      const createCannabisLeafShape = () => {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.bezierCurveTo(0.05, 0.2, 0.08, 0.5, 0.03, 0.9);
        shape.bezierCurveTo(0.01, 1.0, -0.01, 1.0, -0.03, 0.9);
        shape.bezierCurveTo(-0.08, 0.5, -0.05, 0.2, 0, 0);
        return shape;
      };

      const createDetailedLeaf = (scale = 1) => {
        const leafGroup = new THREE.Group();
        const fingerCount = 7;
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: 0x4CAF50,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.1,
          emissive: 0x0a1a0a,
          emissiveIntensity: 0.1,
        });

        for (let i = 0; i < fingerCount; i++) {
          const fingerIndex = i - Math.floor(fingerCount / 2);
          const shape = createCannabisLeafShape();
          const extrudeSettings = {
            steps: 1,
            depth: 0.01,
            bevelEnabled: true,
            bevelThickness: 0.005,
            bevelSize: 0.005,
            bevelSegments: 2,
          };
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const finger = new THREE.Mesh(geometry, leafMaterial);

          const isCenter = i === Math.floor(fingerCount / 2);
          const fingerLength = isCenter ? 1.0 : 0.85 - Math.abs(fingerIndex) * 0.12;
          finger.scale.set(scale * 0.8, scale * fingerLength, scale);

          const angle = fingerIndex * 0.25;
          finger.rotation.z = angle;
          finger.position.x = Math.sin(angle) * 0.15 * scale;
          finger.position.y = -Math.abs(fingerIndex) * 0.08 * scale;

          finger.castShadow = true;
          finger.receiveShadow = true;
          leafGroup.add(finger);
        }

        const petioleGeometry = new THREE.CylinderGeometry(0.02 * scale, 0.025 * scale, 0.2 * scale, 8);
        const petioleMaterial = new THREE.MeshStandardMaterial({ color: 0x3d6b2f, roughness: 0.7 });
        const petiole = new THREE.Mesh(petioleGeometry, petioleMaterial);
        petiole.position.y = -0.1 * scale;
        petiole.rotation.x = Math.PI / 2;
        petiole.castShadow = true;
        leafGroup.add(petiole);

        return leafGroup;
      };

      const leafConfigs = [
        { height: 1.2, count: 2, size: 0.6, spread: 0.15 },
        { height: 1.7, count: 3, size: 0.8, spread: 0.2 },
        { height: 2.2, count: 4, size: 1.0, spread: 0.25 },
        { height: 2.8, count: 5, size: 1.1, spread: 0.3 },
        { height: 3.4, count: 6, size: 1.0, spread: 0.28 },
        { height: 3.9, count: 5, size: 0.85, spread: 0.22 },
      ];

      leafConfigs.forEach((config, tierIndex) => {
        for (let i = 0; i < config.count; i++) {
          const angle = (i / config.count) * Math.PI * 2 + (tierIndex * Math.PI / 6);
          const leaf = createDetailedLeaf(config.size);

          const x = Math.cos(angle) * config.spread;
          const z = Math.sin(angle) * config.spread;

          leaf.position.set(x, config.height, z);
          leaf.rotation.y = angle + Math.PI / 2;
          leaf.rotation.x = -Math.PI / 3 + Math.sin(angle * 3) * 0.2;
          leaf.rotation.z = Math.cos(angle * 2) * 0.15;

          plantGroup.add(leaf);
        }
      });

      const budGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const budMaterial = new THREE.MeshStandardMaterial({
        color: 0x8BC34A,
        roughness: 0.8,
        metalness: 0.0,
      });
      for (let i = 0; i < 3; i++) {
        const bud = new THREE.Mesh(budGeometry, budMaterial);
        bud.position.y = 4.0 + i * 0.1;
        bud.position.x = Math.sin(i) * 0.05;
        bud.position.z = Math.cos(i) * 0.05;
        bud.scale.set(1 - i * 0.2, 1 - i * 0.15, 1 - i * 0.2);
        bud.castShadow = true;
        plantGroup.add(bud);
      }

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
      const particleCount = 80;
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

        const spread = 0.3;
        const velocity = direction.clone()
          .multiplyScalar(0.15 + Math.random() * 0.1)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
          ));
        velocities.push(velocity);

        const cyan = 0.6 + Math.random() * 0.4;
        colors.push(cyan * 0.3, cyan * 0.9, cyan);
        sizes.push(0.08 + Math.random() * 0.06);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
        map: createCircleTexture(),
      });

      const particles = new THREE.Points(geometry, material);
      particles.userData = { velocities, life: 1.0, isSpray: true };
      scene.add(particles);
      sprayParticlesRef.current.push(particles);
    };

    const createHitEffect = (position) => {
      const particleCount = 25;
      const positions = [];
      const colors = [];
      const velocities = [];

      for (let i = 0; i < particleCount; i++) {
        positions.push(
          position.x + (Math.random() - 0.5) * 0.2,
          position.y + (Math.random() - 0.5) * 0.2,
          position.z + (Math.random() - 0.5) * 0.2
        );

        const velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          Math.random() * 0.1,
          (Math.random() - 0.5) * 0.15
        );
        velocities.push(velocity);

        const green = 0.6 + Math.random() * 0.4;
        colors.push(green * 0.4, green, green * 0.3);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createCircleTexture(),
      });

      const particles = new THREE.Points(geometry, material);
      particles.userData = { velocities, life: 0.8, isHit: true };
      scene.add(particles);
      sprayParticlesRef.current.push(particles);
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
          const rotationRadius = 0.3;
          const rotationSpeed = 0.15;
          cameraRef.current.position.x = Math.sin(t * rotationSpeed) * rotationRadius;
          cameraRef.current.position.z = 5 + Math.cos(t * rotationSpeed) * rotationRadius;
          cameraRef.current.lookAt(0, 2.5, 0);

          const breathe = Math.sin(t * 0.8) * 0.05;
          cameraRef.current.position.y = 2.5 + breathe;
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

            const speed = pestData.speed * 0.012;
            mesh.position.add(direction.multiplyScalar(speed));

            const distance = mesh.position.distanceTo(target);
            if (distance > 0.5) {
              mesh.lookAt(target);
            }

            const crawl = Math.sin(t * 8 + parseInt(id.slice(-3)) * 0.1);
            mesh.scale.set(1 + crawl * 0.08, 1 - crawl * 0.08, 1 + crawl * 0.04);

            mesh.rotation.y += 0.01;
          }
        });

        for (let i = sprayParticlesRef.current.length - 1; i >= 0; i--) {
          const particleSystem = sprayParticlesRef.current[i];
          particleSystem.userData.life -= 0.018;

          if (particleSystem.userData.life <= 0) {
            scene.remove(particleSystem);
            particleSystem.geometry.dispose();
            particleSystem.material.dispose();
            sprayParticlesRef.current.splice(i, 1);
            continue;
          }

          particleSystem.material.opacity = particleSystem.userData.life * 0.8;

          if (particleSystem.userData.velocities) {
            const positions = particleSystem.geometry.attributes.position.array;
            for (let j = 0; j < particleSystem.userData.velocities.length; j++) {
              const velocity = particleSystem.userData.velocities[j];
              positions[j * 3] += velocity.x;
              positions[j * 3 + 1] += velocity.y;
              positions[j * 3 + 2] += velocity.z;

              velocity.y -= 0.008;
              velocity.multiplyScalar(0.98);
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
        
        let scale = 1;
        let rotation = 0;
        const deathAnim = setInterval(() => {
          scale -= 0.15;
          rotation += 0.5;
          if (mesh && mesh.parent === scene) {
            mesh.scale.setScalar(Math.max(0, scale));
            mesh.rotation.x += rotation;
            mesh.rotation.z += rotation * 0.7;
            if (scale <= 0) {
              clearInterval(deathAnim);
              scene.remove(mesh);
            }
          } else {
            clearInterval(deathAnim);
          }
        }, 40);

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
    const group = new THREE.Group();
    const baseColor = new THREE.Color(pest.color || '#88cc44');
    const darkColor = baseColor.clone().multiplyScalar(0.4);
    const lightColor = baseColor.clone().multiplyScalar(1.3);

    const sizeMap = { tiny: 0.2, small: 0.3, medium: 0.45, large: 0.65 };
    const baseSize = sizeMap[pest.size] || 0.35;

    const segmentCount = 10;
    for (let i = 0; i < segmentCount; i++) {
      const segmentSize = baseSize * (1 - i * 0.06);
      const segmentGeometry = new THREE.SphereGeometry(segmentSize, 16, 16);
      const isStripe = i % 2 === 0;
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: isStripe ? lightColor : darkColor,
        roughness: 0.7,
        metalness: 0.1,
      });
      const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
      segment.position.z = -i * baseSize * 0.4;
      segment.castShadow = true;
      segment.receiveShadow = true;
      group.add(segment);
    }

    const headGeometry = new THREE.SphereGeometry(baseSize * 0.9, 16, 16);
    headGeometry.scale(1, 0.9, 1.2);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: darkColor,
      roughness: 0.6,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.z = baseSize * 0.5;
    head.castShadow = true;
    group.add(head);

    const eyeGeometry = new THREE.SphereGeometry(baseSize * 0.15, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.3,
      metalness: 0.7,
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(baseSize * 0.35, baseSize * 0.25, baseSize * 0.8);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-baseSize * 0.35, baseSize * 0.25, baseSize * 0.8);
    group.add(rightEye);

    const legPairs = 6;
    for (let i = 0; i < legPairs; i++) {
      const segmentIndex = i + 1;
      const legLength = baseSize * 1.5;

      for (let side = -1; side <= 1; side += 2) {
        const legGeometry = new THREE.CylinderGeometry(
          baseSize * 0.05,
          baseSize * 0.03,
          legLength,
          8
        );
        const legMaterial = new THREE.MeshStandardMaterial({
          color: darkColor,
          roughness: 0.8,
        });
        const leg = new THREE.Mesh(legGeometry, legMaterial);

        leg.position.set(
          side * baseSize * 0.6,
          -baseSize * 0.5,
          -segmentIndex * baseSize * 0.35
        );
        leg.rotation.z = side * (Math.PI / 2.5);
        leg.rotation.x = Math.PI / 6;
        leg.castShadow = true;
        group.add(leg);
      }
    }

    const hairCount = 15;
    for (let i = 0; i < hairCount; i++) {
      const hairGeometry = new THREE.CylinderGeometry(0.005, 0.002, baseSize * 0.3, 4);
      const hairMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      const hair = new THREE.Mesh(hairGeometry, hairMaterial);
      
      const segmentIndex = Math.floor(Math.random() * 5);
      hair.position.set(
        (Math.random() - 0.5) * baseSize * 1.5,
        baseSize * 0.6,
        -segmentIndex * baseSize * 0.4
      );
      hair.rotation.x = (Math.random() - 0.5) * Math.PI / 3;
      hair.rotation.z = (Math.random() - 0.5) * Math.PI / 3;
      group.add(hair);
    }

    group.scale.set(1.4, 1.4, 1.4);

    return group;
  };

  return <div ref={mountRef} className="w-full h-full absolute inset-0" />;
}