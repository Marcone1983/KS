import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const HempSprayFPV_Base44Safe = () => {
  const containerRef = useRef(null);
  const rafRef = useRef(0);

  const [stats, setStats] = useState({ fps: 0, particles: 0, caterpillars: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const size = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || window.innerHeight,
    });

    const disposeObject = (obj) => {
      if (!obj) return;
      obj.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
          else o.material.dispose?.();
        }
      });
    };

    const { w, h } = size();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2820);
    scene.fog = new THREE.FogExp2(0x1a2820, 0.05);

    const camera = new THREE.PerspectiveCamera(70, w / h, 0.01, 100);
    camera.position.set(0, 1.2, 1.8);
    camera.rotation.order = "YXZ";
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8d9f87, 0.6);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff8dc, 1.8);
    sun.position.set(5, 8, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 30;
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.bias = -0.0005;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x9fd4e6, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const groundGeo = new THREE.PlaneGeometry(50, 50, 30, 30);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d5a3d,
      roughness: 0.95,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    
    const pos = ground.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.15);
    }
    pos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    const leafletMat = new THREE.MeshStandardMaterial({
      color: 0x5cb85c,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide,
      emissive: 0x1a3d1a,
      emissiveIntensity: 0.08
    });

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x4a6e3d,
      roughness: 0.85,
      metalness: 0.0
    });

    const branchMat = new THREE.MeshStandardMaterial({
      color: 0x5a7d4a,
      roughness: 0.8,
      metalness: 0.0
    });

    const makeLeaflet = (length, width) => {
      const shape = new THREE.Shape();
      const serrationsPerSide = 12;
      
      shape.moveTo(0, 0);
      
      for (let i = 0; i <= serrationsPerSide; i++) {
        const t = i / serrationsPerSide;
        const y = t * length;
        const baseWidth = Math.sin(t * Math.PI) * width * (1 - t * 0.2);
        const serration = (i % 2 === 0) ? baseWidth * 0.08 : 0;
        shape.lineTo(baseWidth + serration, y);
      }
      
      for (let i = serrationsPerSide; i >= 0; i--) {
        const t = i / serrationsPerSide;
        const y = t * length;
        const baseWidth = Math.sin(t * Math.PI) * width * (1 - t * 0.2);
        const serration = (i % 2 === 0) ? baseWidth * 0.08 : 0;
        shape.lineTo(-baseWidth - serration, y);
      }
      
      shape.closePath();
      
      const geo = new THREE.ShapeGeometry(shape, 8);
      const posAttr = geo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const curl = (y / length) * 0.02 + Math.abs(x) * 0.015;
        posAttr.setZ(i, curl);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      
      return geo;
    };

    const makeCannabisLeaf = (scale = 1.0, leafletCount = 7) => {
      const group = new THREE.Group();
      
      const mainLength = 0.45 * scale;
      const mainWidth = 0.09 * scale;
      const mainGeo = makeLeaflet(mainLength, mainWidth);
      const mainLeaf = new THREE.Mesh(mainGeo, leafletMat);
      mainLeaf.rotation.x = -Math.PI / 2;
      mainLeaf.castShadow = true;
      group.add(mainLeaf);
      
      const sideConfigs = [
        { angle: -0.35, length: 0.42, width: 0.085, offsetY: 0.08 },
        { angle: 0.35, length: 0.42, width: 0.085, offsetY: 0.08 },
        { angle: -0.65, length: 0.38, width: 0.078, offsetY: 0.15 },
        { angle: 0.65, length: 0.38, width: 0.078, offsetY: 0.15 },
        { angle: -0.95, length: 0.32, width: 0.068, offsetY: 0.22 },
        { angle: 0.95, length: 0.32, width: 0.068, offsetY: 0.22 }
      ];
      
      for (let i = 0; i < Math.min(leafletCount - 1, sideConfigs.length); i++) {
        const cfg = sideConfigs[i];
        const geo = makeLeaflet(cfg.length * scale, cfg.width * scale);
        const mesh = new THREE.Mesh(geo, leafletMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = cfg.angle;
        mesh.position.y = cfg.offsetY * scale;
        mesh.castShadow = true;
        group.add(mesh);
      }
      
      return group;
    };

    const plant = new THREE.Group();
    plant.position.set(0, 0, -1.5);
    scene.add(plant);

    const trunkHeight = 2.2;
    const trunkRadius = 0.04;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 12),
      stemMat
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    plant.add(trunk);

    const branchLevels = [
      { height: 0.5, rotation: 0, branchLength: 0.35, leafScale: 0.8 },
      { height: 0.85, rotation: Math.PI / 2, branchLength: 0.40, leafScale: 0.9 },
      { height: 1.2, rotation: 0, branchLength: 0.42, leafScale: 1.0 },
      { height: 1.5, rotation: Math.PI / 2, branchLength: 0.38, leafScale: 0.95 },
      { height: 1.75, rotation: 0, branchLength: 0.32, leafScale: 0.85 },
      { height: 1.95, rotation: Math.PI / 2, branchLength: 0.25, leafScale: 0.7 }
    ];

    const branches = [];
    
    branchLevels.forEach((level, idx) => {
      const branchGroup = new THREE.Group();
      branchGroup.position.y = level.height;
      branchGroup.rotation.y = level.rotation;
      
      for (let side = 0; side < 2; side++) {
        const direction = side === 0 ? 1 : -1;
        
        const branchGeo = new THREE.CylinderGeometry(0.018, 0.025, level.branchLength, 8);
        const branch = new THREE.Mesh(branchGeo, branchMat);
        branch.position.x = direction * level.branchLength / 2;
        branch.rotation.z = direction * Math.PI / 2;
        branch.castShadow = true;
        branchGroup.add(branch);
        
        for (let i = 0; i < 3; i++) {
          const leaf = makeCannabisLeaf(level.leafScale, 7);
          const t = (i + 1) / 4;
          leaf.position.x = direction * level.branchLength * t;
          leaf.position.y = Math.random() * 0.05;
          leaf.rotation.y = direction * (Math.PI / 2 + (Math.random() - 0.5) * 0.4);
          leaf.rotation.x = (Math.random() - 0.5) * 0.3;
          leaf.rotation.z = (Math.random() - 0.5) * 0.2;
          leaf.userData.windOffset = Math.random() * Math.PI * 2;
          branchGroup.add(leaf);
        }
      }
      
      branchGroup.userData.windOffset = Math.random() * Math.PI * 2;
      branches.push(branchGroup);
      plant.add(branchGroup);
    });

    const topLeaf = makeCannabisLeaf(0.85, 7);
    topLeaf.position.y = trunkHeight;
    topLeaf.rotation.x = Math.PI / 6;
    topLeaf.userData.windOffset = Math.random() * Math.PI * 2;
    plant.add(topLeaf);

    const caterpillars = [];

    const catMatA = new THREE.MeshStandardMaterial({ 
      color: 0x88dd77, 
      roughness: 0.6,
      metalness: 0.0,
      emissive: 0x2d5a2d,
      emissiveIntensity: 0.15
    });
    const catMatB = new THREE.MeshStandardMaterial({ 
      color: 0x5a9d5a, 
      roughness: 0.65,
      metalness: 0.0,
      emissive: 0x1d3a1d,
      emissiveIntensity: 0.12
    });
    const catHeadMat = new THREE.MeshStandardMaterial({ 
      color: 0x2d3a2d, 
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x1a1f1a,
      emissiveIntensity: 0.25
    });

    const makeCaterpillar = () => {
      const g = new THREE.Group();
      const segCount = 9;

      for (let i = 0; i < segCount; i++) {
        const r = 0.022 * (1 - i * 0.04);
        const geo = new THREE.SphereGeometry(r, 12, 10);
        const mat = i % 2 === 0 ? catMatA : catMatB;
        const s = new THREE.Mesh(geo, mat);
        s.position.x = i * 0.028;
        s.castShadow = true;
        g.add(s);
      }

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), catHeadMat);
      head.position.x = segCount * 0.028;
      head.castShadow = true;
      g.add(head);

      g.scale.setScalar(1.1);

      g.userData = {
        alive: true,
        dying: false,
        fallVel: 0,
        spinVel: 0,
        wiggle: Math.random() * Math.PI * 2,
        radius: 0.08,
      };

      return g;
    };

    const spawnCaterpillars = (n = 10) => {
      branchLevels.forEach((level, levelIdx) => {
        const numOnLevel = Math.floor(n / branchLevels.length) + (levelIdx < (n % branchLevels.length) ? 1 : 0);
        
        for (let i = 0; i < numOnLevel; i++) {
          const c = makeCaterpillar();
          const side = Math.random() > 0.5 ? 1 : -1;
          const branchT = 0.3 + Math.random() * 0.6;
          
          const branchLength = level.branchLength;
          const localX = side * branchLength * branchT;
          const localY = (Math.random() - 0.5) * 0.1;
          
          const angle = level.rotation;
          const worldX = Math.cos(angle) * localX;
          const worldZ = Math.sin(angle) * localX;
          
          c.position.set(worldX, level.height + localY, worldZ);
          c.rotation.y = angle + side * Math.PI / 2 + (Math.random() - 0.5) * 0.5;
          
          plant.add(c);
          caterpillars.push(c);
        }
      });
    };

    const killCaterpillar = (c) => {
      if (!c?.userData?.alive || c.userData.dying) return;
      c.userData.dying = true;
      c.userData.fallVel = 0.1 + Math.random() * 0.1;
      c.userData.spinVel = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2);
    };

    spawnCaterpillars(12);

    const fpvHand = new THREE.Group();
    fpvHand.position.set(0.4, -0.45, -0.5);
    fpvHand.rotation.set(0.15, -0.3, 0.05);
    camera.add(fpvHand);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a076,
      roughness: 0.6,
      metalness: 0.0
    });

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.05), skinMat);
    palm.castShadow = true;
    fpvHand.add(palm);

    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.03), skinMat);
    thumb.position.set(-0.05, 0.04, 0.02);
    thumb.rotation.z = -0.5;
    thumb.castShadow = true;
    fpvHand.add(thumb);

    const fingerPositions = [
      { x: 0.035, y: 0.1 },
      { x: 0.015, y: 0.12 },
      { x: -0.01, y: 0.11 },
      { x: -0.03, y: 0.09 }
    ];

    fingerPositions.forEach(p => {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.1, 0.025), skinMat);
      finger.position.set(p.x, p.y, 0);
      finger.rotation.x = -0.2;
      finger.castShadow = true;
      fpvHand.add(finger);
    });

    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(0, -0.05, 0);
    fpvHand.add(bottleGroup);

    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4f0ff,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.92,
      thickness: 0.8,
      ior: 1.45,
      clearcoat: 1.0,
      reflectivity: 0.9
    });

    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.35, 16),
      bottleMat
    );
    bottleBody.castShadow = true;
    bottleGroup.add(bottleBody);

    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd4ff,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.8,
      thickness: 0.5,
      ior: 1.33
    });

    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.085, 0.27, 16),
      liquidMat
    );
    liquid.position.y = -0.05;
    bottleGroup.add(liquid);

    const plasticDark = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.2
    });

    const trigger = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.08, 0.06),
      plasticDark
    );
    trigger.position.set(0.085, 0.1, 0);
    trigger.castShadow = true;
    bottleGroup.add(trigger);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.08, 0.055, 16),
      plasticDark
    );
    cap.position.y = 0.2;
    cap.castShadow = true;
    bottleGroup.add(cap);

    const nozzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.025, 0.025),
      plasticDark
    );
    nozzle.position.set(0.05, 0.2, 0);
    nozzle.castShadow = true;
    bottleGroup.add(nozzle);

    const nozzleTip = new THREE.Object3D();
    nozzleTip.position.set(0.1, 0.2, 0);
    bottleGroup.add(nozzleTip);

    const getNozzleWorldPos = (out = new THREE.Vector3()) => {
      nozzleTip.getWorldPosition(out);
      return out;
    };

    const makeSprayTexture = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, "rgba(200, 235, 255, 1.0)");
      gradient.addColorStop(0.3, "rgba(180, 225, 250, 0.7)");
      gradient.addColorStop(0.6, "rgba(150, 210, 240, 0.4)");
      gradient.addColorStop(1, "rgba(120, 190, 220, 0.0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const sprayTex = makeSprayTexture();

    const MAXP = 2500;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(MAXP * 3);
    const pVel = new Float32Array(MAXP * 3);
    const pLife = new Float32Array(MAXP);
    let pHead = 0;

    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

    const pMat = new THREE.PointsMaterial({
      map: sprayTex,
      transparent: true,
      depthWrite: false,
      size: 0.1,
      opacity: 0.9,
      color: 0xc8e8ff,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const sprayPoints = new THREE.Points(pGeo, pMat);
    scene.add(sprayPoints);

    const emit = (start, dir, count = 22) => {
      for (let i = 0; i < count; i++) {
        const id = pHead++ % MAXP;
        const spread = 0.18;
        const speed = 0.6;

        const vx = dir.x * (0.85 + Math.random() * 0.7) + (Math.random() - 0.5) * spread;
        const vy = dir.y * (0.85 + Math.random() * 0.7) + (Math.random() - 0.5) * spread * 0.5;
        const vz = dir.z * (0.85 + Math.random() * 0.7) + (Math.random() - 0.5) * spread;

        pPos[id * 3 + 0] = start.x;
        pPos[id * 3 + 1] = start.y;
        pPos[id * 3 + 2] = start.z;

        pVel[id * 3 + 0] = vx * speed;
        pVel[id * 3 + 1] = vy * speed;
        pVel[id * 3 + 2] = vz * speed;

        pLife[id] = 1.0;
      }
      pGeo.attributes.position.needsUpdate = true;
    };

    const updateParticles = (dt) => {
      const drag = 0.98;
      const gravity = -0.4;
      for (let i = 0; i < MAXP; i++) {
        if (pLife[i] <= 0) continue;

        pVel[i * 3 + 0] *= drag;
        pVel[i * 3 + 1] = pVel[i * 3 + 1] * drag + gravity * dt;
        pVel[i * 3 + 2] *= drag;

        pPos[i * 3 + 0] += pVel[i * 3 + 0] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;

        pLife[i] -= dt * 1.2;
        if (pPos[i * 3 + 1] < 0.02) pLife[i] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
    };

    const input = {
      lookX: 0,
      lookY: 0,
      targetX: 0,
      targetY: 0,
      spraying: false,
      sprayT: 0,
      cooldown: 0
    };

    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      input.targetY = clamp(nx * 0.25, -0.25, 0.25);
      input.targetX = clamp(ny * 0.18, -0.18, 0.18);
    };

    const startSpray = () => {
      if (input.spraying || input.cooldown > 0) return;
      input.spraying = true;
      input.sprayT = 0;
    };

    const onDown = () => startSpray();
    const onKey = (e) => {
      if (e.code === "Space") startSpray();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);

    const tmpNoz = new THREE.Vector3();
    const tmpForward = new THREE.Vector3();
    const tmpTo = new THREE.Vector3();

    const rayPointDistance = (rayOrigin, rayDir, point) => {
      tmpTo.subVectors(point, rayOrigin);
      const proj = tmpTo.dot(rayDir);
      if (proj < 0) return { dist: Infinity, proj };
      const closest = rayDir.clone().multiplyScalar(proj);
      const perp = tmpTo.sub(closest);
      return { dist: perp.length(), proj };
    };

    const clock = new THREE.Clock();
    let fpsFrames = 0;
    let fpsAcc = 0;

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);

      const dt = Math.min(0.033, clock.getDelta());
      const t = clock.getElapsedTime();

      fpsFrames++;
      fpsAcc += dt;
      if (fpsAcc >= 0.5) {
        let alive = 0;
        for (const c of caterpillars) if (c.userData.alive) alive++;
        setStats({
          fps: Math.round(fpsFrames / fpsAcc),
          particles: Math.min(pHead, MAXP),
          caterpillars: alive
        });
        fpsFrames = 0;
        fpsAcc = 0;
      }

      input.lookX += (input.targetX - input.lookX) * 0.1;
      input.lookY += (input.targetY - input.lookY) * 0.1;
      camera.rotation.x = input.lookX;
      camera.rotation.y = input.lookY;

      branches.forEach((branch, idx) => {
        const offset = branch.userData.windOffset;
        const heightFactor = idx / branches.length;
        const strength = 0.15 + heightFactor * 0.1;
        
        const wind = Math.sin(t * 1.5 + offset) * strength;
        branch.rotation.z = wind * 0.08;
        
        branch.children.forEach(child => {
          if (child.userData.windOffset !== undefined) {
            const leafWind = Math.sin(t * 2.2 + child.userData.windOffset) * 0.05;
            child.rotation.z += leafWind;
          }
        });
      });

      caterpillars.forEach((c) => {
        if (!c.userData.alive) return;
        c.userData.wiggle += dt * 5.5;

        if (!c.userData.dying) {
          const wig = Math.sin(c.userData.wiggle) * 0.1;
          c.rotation.x = wig;
          
          c.children.forEach((seg, i) => {
            const segWig = Math.sin(c.userData.wiggle + i * 0.5) * 0.003;
            seg.position.y = segWig;
          });
        } else {
          c.userData.fallVel += dt * 0.9;
          c.position.y -= c.userData.fallVel * dt * 2.5;
          c.rotation.x += c.userData.spinVel * dt;
          c.scale.multiplyScalar(1 - dt * 0.7);

          if (c.position.y < 0.02 || c.scale.x < 0.15) {
            c.userData.alive = false;
            plant.remove(c);
            disposeObject(c);
          }
        }
      });

      if (input.cooldown > 0) input.cooldown -= dt;

      if (input.spraying) {
        input.sprayT += dt;
        const dur = 1.0;
        const p = clamp(input.sprayT / dur, 0, 1);

        trigger.rotation.x = -Math.sin(p * Math.PI) * 0.4;

        if (p > 0.1 && p < 0.9) {
          const noz = getNozzleWorldPos(tmpNoz);
          tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

          emit(noz, tmpForward, 25);

          const range = 2.5;
          for (const c of caterpillars) {
            if (!c.userData.alive || c.userData.dying) continue;
            const worldPos = c.getWorldPosition(new THREE.Vector3());
            const { dist, proj } = rayPointDistance(noz, tmpForward, worldPos);
            if (proj > 0 && proj < range && dist < c.userData.radius) {
              killCaterpillar(c);
            }
          }
        }

        if (p >= 1) {
          input.spraying = false;
          input.cooldown = 0.5;
          input.sprayT = 0;
          trigger.rotation.x = 0;
        }
      }

      updateParticles(dt);

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const s = size();
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);

      sprayTex.dispose?.();
      disposeObject(scene);
      renderer.dispose();

      if (renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 bg-black/70 text-white p-3 rounded-lg font-mono text-xs select-none backdrop-blur-sm">
        <div className="font-bold mb-1 text-green-400">Stats</div>
        <div>FPS: {stats.fps}</div>
        <div>Particles: {stats.particles}</div>
        <div>Caterpillars: {stats.caterpillars}</div>
      </div>

      <div className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-lg text-xs select-none backdrop-blur-sm">
        <div className="font-bold mb-2 text-green-400">Controls</div>
        <div>
          <span className="text-yellow-300">CLICK / SPACE</span> — Spray
        </div>
        <div>
          <span className="text-yellow-300">MOUSE</span> — Look Around
        </div>
      </div>
    </div>
  );
};

export default HempSprayFPV_Base44Safe;