import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function GameScene({ pests, onPestHit, onSpray, sprayRange, isPaused, onPestClick }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const pestMeshesRef = useRef({});
  const plantRef = useRef(null);
  const sprayParticlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c4e });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const createPlant = () => {
      const plant = new THREE.Group();

      const potGeometry = new THREE.CylinderGeometry(0.8, 0.6, 1, 8);
      const potMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const pot = new THREE.Mesh(potGeometry, potMaterial);
      pot.position.y = 0.5;
      pot.castShadow = true;
      plant.add(pot);

      const stemGeometry = new THREE.CylinderGeometry(0.1, 0.15, 3, 8);
      const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = 2.5;
      stem.castShadow = true;
      plant.add(stem);

      for (let i = 0; i < 7; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x32CD32 });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        
        const angle = (i / 7) * Math.PI * 2;
        const height = 1.5 + i * 0.3;
        leaf.position.set(
          Math.cos(angle) * 0.6,
          height,
          Math.sin(angle) * 0.6
        );
        leaf.scale.set(1, 0.3, 0.6);
        leaf.castShadow = true;
        plant.add(leaf);
      }

      const budGeometry = new THREE.ConeGeometry(0.3, 0.6, 8);
      const budMaterial = new THREE.MeshStandardMaterial({ color: 0x9370DB });
      const bud = new THREE.Mesh(budGeometry, budMaterial);
      bud.position.y = 4.5;
      bud.castShadow = true;
      plant.add(bud);

      return plant;
    };

    const plant = createPlant();
    scene.add(plant);
    plantRef.current = plant;

    const handleMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleClick = (event) => {
      if (isPaused) return;

      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      raycasterRef.current.setFromCamera(mouse, camera);
      const pestMeshes = Object.values(pestMeshesRef.current);
      const intersects = raycasterRef.current.intersectObjects(pestMeshes, true);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const pestId = Object.keys(pestMeshesRef.current).find(
          key => pestMeshesRef.current[key] === clickedMesh.parent || pestMeshesRef.current[key] === clickedMesh
        );
        
        if (pestId) {
          const pest = pests.find(p => p.id === pestId);
          if (pest && onPestClick) {
            onPestClick(pest);
          }
        }

        if (onSpray()) {
          const sprayDamage = 20 + sprayRange * 5;
          if (pestId) {
            onPestHit(pestId, sprayDamage);
          }

          createSprayEffect(intersects[0].point);
        }
      }
    };

    const createSprayEffect = (position) => {
      const particleCount = 20;
      const particles = new THREE.Group();

      for (let i = 0; i < particleCount; i++) {
        const geometry = new THREE.SphereGeometry(0.05, 4, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.8 });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        particle.life = 1.0;
        
        particles.add(particle);
      }

      scene.add(particles);
      sprayParticlesRef.current.push({ group: particles, particles: particles.children });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!isPaused) {
        Object.entries(pestMeshesRef.current).forEach(([id, mesh]) => {
          const pest = pests.find(p => p.id === id);
          if (pest) {
            mesh.position.z += pest.speed * 0.016;
            mesh.rotation.y += 0.05;

            if (mesh.position.z > 5) {
              mesh.position.z = -15;
              mesh.position.x = (Math.random() - 0.5) * 10;
            }
          }
        });

        sprayParticlesRef.current = sprayParticlesRef.current.filter(({ group, particles }) => {
          let allDead = true;
          particles.forEach(particle => {
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            particle.position.add(particle.velocity);
            particle.velocity.y -= 0.01;
            
            if (particle.life > 0) {
              allDead = false;
            }
          });

          if (allDead) {
            scene.remove(group);
            return false;
          }
          return true;
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isPaused]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const currentPestIds = new Set(pests.map(p => p.id));
    
    Object.keys(pestMeshesRef.current).forEach(id => {
      if (!currentPestIds.has(id)) {
        scene.remove(pestMeshesRef.current[id]);
        delete pestMeshesRef.current[id];
      }
    });

    pests.forEach(pest => {
      if (!pestMeshesRef.current[pest.id]) {
        const pestMesh = createPestMesh(pest);
        pestMesh.position.set(pest.position.x, pest.position.y, pest.position.z);
        scene.add(pestMesh);
        pestMeshesRef.current[pest.id] = pestMesh;
      } else {
        const scale = pest.health / pest.maxHealth;
        pestMeshesRef.current[pest.id].scale.setScalar(0.3 + scale * 0.7);
      }
    });
  }, [pests]);

  const createPestMesh = (pest) => {
    const group = new THREE.Group();
    
    const sizeMap = { tiny: 0.2, small: 0.35, medium: 0.5, large: 0.7 };
    const size = sizeMap[pest.size] || 0.3;

    const color = pest.color || '#ff0000';
    const material = new THREE.MeshStandardMaterial({ color });

    const bodyGeometry = new THREE.SphereGeometry(size, 8, 8);
    const body = new THREE.Mesh(bodyGeometry, material);
    body.castShadow = true;
    group.add(body);

    for (let i = 0; i < 6; i++) {
      const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, size * 1.5, 4);
      const leg = new THREE.Mesh(legGeometry, material);
      const angle = (i / 6) * Math.PI * 2;
      leg.position.set(
        Math.cos(angle) * size * 0.8,
        -size * 0.3,
        Math.sin(angle) * size * 0.8
      );
      leg.rotation.z = Math.PI / 4;
      group.add(leg);
    }

    const eyeGeometry = new THREE.SphereGeometry(size * 0.15, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eye1 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye1.position.set(size * 0.3, size * 0.3, size * 0.7);
    group.add(eye1);
    
    const eye2 = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye2.position.set(-size * 0.3, size * 0.3, size * 0.7);
    group.add(eye2);

    return group;
  };

  return <div ref={mountRef} className="w-full h-full" />;
}