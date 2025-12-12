import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; // Not using fiber as we are in vanilla threejs setup in useEffect
// We are sticking to the existing vanilla three.js setup to avoid rewriting the whole rendering logic to R3F right now, 
// but we will significantly upgrade the visual quality.

export default function GameScene({ pests, onPestHit, onSpray, sprayRange, isPaused, onPestClick, activeSkin }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const pestMeshesRef = useRef({});
  const plantRef = useRef(null);
  const sprayParticlesRef = useRef([]);
  const sprayerRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const timeRef = useRef(0);

  // Asset loading placeholders (in a real enterprise app, we'd use a TextureLoader/GLTFLoader here)
  // For procedural generation, we will create high-quality geometries.

  useEffect(() => {
    if (!mountRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    // Dynamic sky gradient using vertex colors or simple fog for depth
    scene.background = new THREE.Color(0x1a2b1a); // Darker, moodier background
    scene.fog = new THREE.FogExp2(0x1a2b1a, 0.03);
    sceneRef.current = scene;

    // --- CAMERA (FPS-like perspective but focused on plant) ---
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 6); // Slightly lower and closer
    cameraRef.current = camera;

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance opt
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffebc2, 1.5); // Warm sun light
    mainLight.position.set(5, 8, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    const rimLight = new THREE.SpotLight(0x4455ff, 2); // Cool rim light for depth
    rimLight.position.set(-5, 5, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    // --- ENVIRONMENT ---
    // High quality ground
    const groundGeo = new THREE.PlaneGeometry(100, 100, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x0a1a0a,
      roughness: 0.8,
      metalness: 0.1,
    });
    // Displace vertices for terrain feel
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i); // This is Z in world space before rotation
        const z = 0; // Height
        // Simple noise approximation
        const height = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.5 + Math.random() * 0.1;
        pos.setZ(i, height);
    }
    groundGeo.computeVertexNormals();
    
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // --- HERO PLANT (Procedural High Quality) ---
    const createHighQualityPlant = () => {
        const plantGroup = new THREE.Group();

        // 1. Pot
        const potGeo = new THREE.CylinderGeometry(0.8, 0.6, 1.2, 16);
        const potMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = 0.6;
        pot.castShadow = true;
        pot.receiveShadow = true;
        plantGroup.add(pot);

        // Soil
        const soilGeo = new THREE.CircleGeometry(0.75, 16);
        const soilMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, roughness: 1 });
        const soil = new THREE.Mesh(soilGeo, soilMat);
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = 1.15;
        plantGroup.add(soil);

        // 2. Main Stem
        const stemCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.0, 0),
            new THREE.Vector3(0.1, 2.5, 0.1),
            new THREE.Vector3(-0.05, 4.0, -0.05),
            new THREE.Vector3(0, 5.5, 0)
        ]);
        const stemGeo = new THREE.TubeGeometry(stemCurve, 20, 0.15, 8, false);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a8a2a, roughness: 0.6 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.castShadow = true;
        plantGroup.add(stem);

        // 3. Leaves (Cannabis shape approximation)
        const createLeaf = () => {
            const shape = new THREE.Shape();
            // Complex leaf shape drawing
            shape.moveTo(0, 0);
            shape.bezierCurveTo(0.2, 0.2, 0.3, 0.6, 0, 1.5); // Right side
            shape.bezierCurveTo(-0.3, 0.6, -0.2, 0.2, 0, 0); // Left side
            
            const geometry = new THREE.ShapeGeometry(shape);
            // Add some subdivisions for bending
            
            const mat = new THREE.MeshStandardMaterial({ 
                color: 0x5cb33d, 
                side: THREE.DoubleSide,
                roughness: 0.4,
                metalness: 0.1
            });
            const mesh = new THREE.Mesh(geometry, mat);
            return mesh;
        };

        // Add 5-finger leaves in tiers
        for (let tier = 0; tier < 5; tier++) {
            const height = 1.8 + tier * 0.8;
            const scale = 1.0 - tier * 0.15;
            const rotationOffset = tier * Math.PI / 3;

            for (let i = 0; i < 4; i++) { // 4 leaves per tier
                const angle = (i / 4) * Math.PI * 2 + rotationOffset;
                
                const leafGroup = new THREE.Group();
                // Create the 5 fingers
                for(let f = -2; f <= 2; f++) {
                    const finger = createLeaf();
                    const fingerScale = 1 - Math.abs(f) * 0.2;
                    finger.scale.set(0.3 * scale * fingerScale, 0.8 * scale * fingerScale, 0.3 * scale * fingerScale);
                    finger.rotation.z = f * 0.3; // Fan out
                    finger.position.y = Math.abs(f) * 0.1;
                    leafGroup.add(finger);
                }
                
                leafGroup.position.set(Math.cos(angle) * 0.1, height, Math.sin(angle) * 0.1);
                leafGroup.rotation.y = -angle + Math.PI/2; // Face outward
                leafGroup.rotation.x = Math.PI / 4; // Droop slightly
                
                plantGroup.add(leafGroup);
            }
        }
        
        // Cola/Buds
        const budGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
        const budMat = new THREE.MeshStandardMaterial({ color: 0xaacc99 }); // Trichome look
        const topBud = new THREE.Mesh(budGeo, budMat);
        topBud.position.y = 5.6;
        plantGroup.add(topBud);

        return plantGroup;
    };

    const plant = createHighQualityPlant();
    scene.add(plant);
    plantRef.current = plant;

    // --- FPS SPRAYER (The "Weapon") ---
    const createSprayer = () => {
        const group = new THREE.Group();
        
        // Bottle
        const bottleGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 12);
        const bottleMat = new THREE.MeshPhysicalMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.6, 
            transmission: 0.5,
            roughness: 0.1 
        });
        const bottle = new THREE.Mesh(bottleGeo, bottleMat);
        bottle.rotation.x = Math.PI / 2;
        group.add(bottle);

        // Liquid inside
        const liquidGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12);
        const liquidMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
        const liquid = new THREE.Mesh(liquidGeo, liquidMat);
        liquid.rotation.x = Math.PI / 2;
        liquid.position.z = -0.05;
        group.add(liquid);

        // Nozzle/Trigger
        const nozzleGeo = new THREE.BoxGeometry(0.1, 0.3, 0.3);
        const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
        nozzle.position.set(0, 0.15, 0.4);
        group.add(nozzle);

        // Positioning it relative to camera
        // Note: We add it to camera so it stays fixed in view
        group.position.set(0.8, -0.8, -1.5); // Bottom right
        group.rotation.y = -0.2;
        
        return group;
    };

    const sprayer = createSprayer();
    camera.add(sprayer); // Add to camera for FPS feel
    scene.add(camera); // Add camera to scene
    sprayerRef.current = sprayer;


    // --- EVENT LISTENERS ---
    const handleMouseMove = (event) => {
        // Normalize mouse for raycasting
        mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Sway camera slightly based on mouse
        if (cameraRef.current && !isPaused) {
            const targetX = mouseRef.current.x * 0.5;
            const targetY = mouseRef.current.y * 0.5 + 2;
            // Smooth lerp in animation loop
        }

        // Sway sprayer
        if (sprayerRef.current && !isPaused) {
            sprayerRef.current.rotation.z = -mouseRef.current.x * 0.1;
            sprayerRef.current.rotation.x = mouseRef.current.y * 0.1;
        }
    };

    const handleResize = () => {
        if (!cameraRef.current || !rendererRef.current) return;
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    const handleClick = (event) => {
        if (isPaused) return;
        
        // Recoil animation
        if (sprayerRef.current) {
            sprayerRef.current.position.z += 0.2;
            setTimeout(() => {
                if (sprayerRef.current) sprayerRef.current.position.z -= 0.2;
            }, 100);
        }

        // Raycast
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        
        // Create spray effect
        if (onSpray()) {
            createSprayParticles();
            
            // Check collisions
            const meshes = Object.values(pestMeshesRef.current).map(obj => obj.children[0] || obj); // Target the main body
            const intersects = raycasterRef.current.intersectObjects(meshes, true);
            
            if (intersects.length > 0) {
                // Find parent group id
                let hitObj = intersects[0].object;
                while(hitObj.parent && hitObj.parent.type !== 'Scene') {
                     // Check if this group is in our ref
                     const id = Object.keys(pestMeshesRef.current).find(key => pestMeshesRef.current[key] === hitObj);
                     if (id) {
                         const damage = 25 + (sprayRange * 5); // Base damage + range bonus
                         onPestHit(id, damage);
                         createHitEffect(intersects[0].point);
                         break;
                     }
                     hitObj = hitObj.parent;
                }
            }
        }
    };

    const createSprayParticles = () => {
        // Create a burst of particles from the sprayer position projected into world
        if (!sprayerRef.current) return;
        
        const nozzlePos = new THREE.Vector3(0, 0.15, 0.4);
        nozzlePos.applyMatrix4(sprayerRef.current.matrixWorld);
        
        // Direction from camera/mouse
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const direction = raycasterRef.current.ray.direction.clone();

        const count = 30;
        const geo = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for(let i=0; i<count; i++) {
            positions.push(nozzlePos.x, nozzlePos.y, nozzlePos.z);
            // Spread
            const spread = 0.2;
            const v = direction.clone().add(new THREE.Vector3(
                (Math.random()-0.5)*spread, 
                (Math.random()-0.5)*spread, 
                (Math.random()-0.5)*spread
            )).multiplyScalar(0.5 + Math.random() * 0.5); // Speed
            velocities.push(v);
        }

        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const mat = new THREE.PointsMaterial({
            color: 0xccffff,
            size: 0.15,
            transparent: true,
            opacity: 0.8,
            map: getParticleTexture(), // Procedural circular texture
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geo, mat);
        points.userData = { velocities, life: 1.0 };
        scene.add(points);
        sprayParticlesRef.current.push(points);
    };

    const createHitEffect = (pos) => {
        // Green splatter
        const count = 10;
        const geo = new THREE.BufferGeometry();
        const positions = [];
        for(let i=0; i<count; i++) {
             positions.push(
                 pos.x + (Math.random()-0.5)*0.5,
                 pos.y + (Math.random()-0.5)*0.5,
                 pos.z + (Math.random()-0.5)*0.5
             );
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: 0x55ff55,
            size: 0.2,
            transparent: true
        });
        const points = new THREE.Points(geo, mat);
        points.userData = { life: 0.5, velocities: [] }; // Simple fade out
        scene.add(points);
        sprayParticlesRef.current.push(points);
    }

    // Helper for texture
    const getParticleTexture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(16,16,0,16,16,16);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,32,32);
        const tex = new THREE.CanvasTexture(canvas);
        return tex;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleClick); // mousedown better for games
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    let frameId;
    const animate = () => {
        frameId = requestAnimationFrame(animate);
        timeRef.current += 0.016;
        const t = timeRef.current;

        if (!isPaused) {
            // Camera gentle sway (breathing)
            if (cameraRef.current) {
                cameraRef.current.position.y = 2 + Math.sin(t * 0.5) * 0.05;
                // Follow mouse slightly
                cameraRef.current.rotation.y = THREE.MathUtils.lerp(cameraRef.current.rotation.y, mouseRef.current.x * -0.1, 0.05);
                cameraRef.current.rotation.x = THREE.MathUtils.lerp(cameraRef.current.rotation.x, mouseRef.current.y * 0.1, 0.05);
            }

            // Pests Animation
            Object.keys(pestMeshesRef.current).forEach(id => {
                const mesh = pestMeshesRef.current[id];
                const pestData = pests.find(p => p.id === id);
                if (pestData && mesh) {
                    // Move towards center (plant)
                    const target = new THREE.Vector3(0, mesh.position.y, 0); // Aim for trunk at same height
                    const dir = new THREE.Vector3().subVectors(target, mesh.position).normalize();
                    
                    const speed = pestData.speed * 0.01;
                    mesh.position.add(dir.multiplyScalar(speed));
                    mesh.lookAt(target);

                    // Crawl animation (sinusoidal)
                    const walkCycle = Math.sin(t * 10 + id.charCodeAt(id.length-1)); // randomize phase
                    mesh.scale.set(1 + walkCycle * 0.1, 1 - walkCycle * 0.1, 1); // Squish and stretch

                    // Respawn/Attack logic is handled in Game.js, here just visual loop
                    if (mesh.position.distanceTo(new THREE.Vector3(0,mesh.position.y,0)) < 0.3) {
                        // Reached plant - stop moving or circle?
                        // For visual simplicity, they just stick to it
                        mesh.position.sub(dir.multiplyScalar(speed)); // Undo move
                    }
                }
            });

            // Particles Animation
            for (let i = sprayParticlesRef.current.length - 1; i >= 0; i--) {
                const pSystem = sprayParticlesRef.current[i];
                pSystem.userData.life -= 0.02;
                
                if (pSystem.userData.life <= 0) {
                    scene.remove(pSystem);
                    sprayParticlesRef.current.splice(i, 1);
                    continue;
                }

                pSystem.material.opacity = pSystem.userData.life;
                
                // Move positions
                if (pSystem.userData.velocities) {
                    const positions = pSystem.geometry.attributes.position.array;
                    for(let j=0; j<pSystem.userData.velocities.length; j++) {
                        const v = pSystem.userData.velocities[j];
                        positions[j*3] += v.x;
                        positions[j*3+1] += v.y;
                        positions[j*3+2] += v.z;
                        
                        // Gravity
                        v.y -= 0.01;
                    }
                    pSystem.geometry.attributes.position.needsUpdate = true;
                }
            }
        }

        renderer.render(scene, camera);
    };
    animate();

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleClick);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(frameId);
        if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        // Cleanup Three.js resources
        renderer.dispose();
    };
  }, [isPaused, activeSkin]); // Re-init on skin change would be better with specific hook, but ok for now

  // --- SYNC PESTS ---
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    // Remove dead
    const currentIds = pests.map(p => p.id);
    Object.keys(pestMeshesRef.current).forEach(id => {
        if (!currentIds.includes(id)) {
            // Death animation?
            scene.remove(pestMeshesRef.current[id]);
            delete pestMeshesRef.current[id];
        }
    });

    // Add new
    pests.forEach(pest => {
        if (!pestMeshesRef.current[pest.id]) {
            const mesh = createPestMesh(pest);
            mesh.position.set(pest.position.x, pest.position.y, pest.position.z);
            scene.add(mesh);
            pestMeshesRef.current[pest.id] = mesh;
        } else {
             // Update damage visual?
             // pestMeshesRef.current[pest.id].material.color...
        }
    });

  }, [pests]);

  const createPestMesh = (pest) => {
      // Caterpillar style: Segmented
      const group = new THREE.Group();
      const color = new THREE.Color(pest.color || '#ff0000');
      const segments = 5;
      const size = 0.25;

      const mat = new THREE.MeshStandardMaterial({ 
          color: color,
          roughness: 0.5 
      });

      for(let i=0; i<segments; i++) {
          const geo = new THREE.SphereGeometry(size * (1 - i*0.1), 8, 8);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.z = -i * (size * 1.5);
          mesh.castShadow = true;
          group.add(mesh);
      }
      
      // Spikes/Hair
      const hairGeo = new THREE.ConeGeometry(0.02, 0.1, 4);
      const hairMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
      for(let i=0; i<10; i++) {
          const hair = new THREE.Mesh(hairGeo, hairMat);
          hair.position.set(
              (Math.random()-0.5)*size*2,
              size*0.8,
              (Math.random()-0.5)*size*3
          );
          hair.rotation.x = (Math.random()-0.5);
          group.add(hair);
      }

      return group;
  };

  return <div ref={mountRef} className="w-full h-full absolute inset-0 z-0" />;
}