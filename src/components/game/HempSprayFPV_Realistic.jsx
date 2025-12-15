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
    scene.background = new THREE.Color(0x0a1612);
    scene.fog = new THREE.FogExp2(0x0d1a16, 0.08);

    const camera = new THREE.PerspectiveCamera(65, w / h, 0.02, 80);
    camera.position.set(0, 1.55, 0.75);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const makeLeafTexture = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, "#6ed46e");
      gradient.addColorStop(0.4, "#5abc59");
      gradient.addColorStop(0.7, "#48a548");
      gradient.addColorStop(1, "#368736");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "overlay";
      for (let i = 0; i < 300; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const opacity = Math.random() * 0.15;
        ctx.fillStyle = `rgba(40, 80, 40, ${opacity})`;
        ctx.fillRect(x, y, 1, Math.random() * 8 + 2);
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(30, 60, 30, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.1);
      for (let i = 0; i < 20; i++) {
        const t = i / 20;
        ctx.lineTo(size / 2 + Math.sin(t * Math.PI * 4) * 8, size * 0.1 + t * size * 0.8);
      }
      ctx.stroke();

      for (let i = 0; i < 30; i++) {
        const t = i / 30;
        const y = size * 0.15 + t * size * 0.7;
        const length = (1 - t) * size * 0.35;
        const angle = Math.PI / 3 + (Math.random() - 0.5) * 0.3;
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(30, 60, 30, ${0.3 - t * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(size / 2, y);
        ctx.quadraticCurveTo(
          size / 2 + Math.cos(angle) * length * 0.6, 
          y + Math.sin(angle) * length * 0.3,
          size / 2 + Math.cos(angle) * length, 
          y + Math.sin(angle) * length
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(size / 2, y);
        ctx.quadraticCurveTo(
          size / 2 - Math.cos(angle) * length * 0.6, 
          y + Math.sin(angle) * length * 0.3,
          size / 2 - Math.cos(angle) * length, 
          y + Math.sin(angle) * length
        );
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 16;
      return texture;
    };

    const makeLeafNormalMap = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "rgb(128, 128, 255)";
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 50; i++) {
        const t = i / 50;
        const y = size * 0.15 + t * size * 0.7;
        
        ctx.strokeStyle = "rgb(100, 140, 255)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(size / 2, y);
        ctx.lineTo(size / 2 + (1-t) * size * 0.3, y + size * 0.02);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(size / 2, y);
        ctx.lineTo(size / 2 - (1-t) * size * 0.3, y + size * 0.02);
        ctx.stroke();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    const makeStemTexture = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, size, 0);
      gradient.addColorStop(0, "#2d5c2b");
      gradient.addColorStop(0.5, "#3a6e38");
      gradient.addColorStop(1, "#2d5c2b");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const length = Math.random() * 40 + 10;
        const brightness = Math.random() * 40 - 20;
        
        ctx.strokeStyle = `rgba(${45 + brightness}, ${90 + brightness}, ${43 + brightness}, ${0.3 + Math.random() * 0.3})`;
        ctx.lineWidth = Math.random() * 2 + 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + length);
        ctx.stroke();
      }

      for (let i = 0; i < 80; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const width = Math.random() * 8 + 2;
        const height = Math.random() * 15 + 5;
        
        ctx.fillStyle = `rgba(35, 50, 35, ${0.2 + Math.random() * 0.3})`;
        ctx.fillRect(x, y, width, height);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 6);
      texture.anisotropy = 16;
      return texture;
    };

    const makeGroundTexture = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#1a2b22";
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 2000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = Math.random() * 3 + 1;
        const brightness = Math.random() * 30 - 15;
        
        ctx.fillStyle = `rgba(${26 + brightness}, ${43 + brightness}, ${34 + brightness}, ${0.4 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 8);
      texture.anisotropy = 16;
      return texture;
    };

    const leafTexture = makeLeafTexture();
    const leafNormalMap = makeLeafNormalMap();
    const stemTexture = makeStemTexture();
    const groundTexture = makeGroundTexture();

    const ambient = new THREE.AmbientLight(0x4a7a5a, 0.3);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x2d4a36, 0.5);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffeb, 2.5);
    key.position.set(8, 12, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -15;
    key.shadow.bias = -0.0001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x6aa3d9, 0.8);
    fill.position.set(-5, 4, -3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0x9de8c6, 1.2);
    rim.position.set(-8, 3, -6);
    scene.add(rim);

    const backLight = new THREE.PointLight(0x5a9d7a, 1.5, 20);
    backLight.position.set(0, 2, -3);
    scene.add(backLight);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1a2b22,
      map: groundTexture,
      roughness: 0.95,
      metalness: 0.0,
      aoMapIntensity: 1.5,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 20, 20), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    
    const gndVertices = ground.geometry.attributes.position;
    for (let i = 0; i < gndVertices.count; i++) {
      gndVertices.setZ(i, Math.random() * 0.08 - 0.04);
    }
    gndVertices.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x5abc59,
      map: leafTexture,
      normalMap: leafNormalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 0.6,
      metalness: 0.0,
      emissive: 0x1a3a1a,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });

    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x3a6e38,
      map: stemTexture,
      roughness: 0.85,
      metalness: 0.0,
      emissive: 0x0d1a0d,
      emissiveIntensity: 0.1,
    });

    const plasticDark = new THREE.MeshStandardMaterial({
      color: 0x1f2a33,
      roughness: 0.4,
      metalness: 0.15,
      envMapIntensity: 0.8,
    });

    const plasticMid = new THREE.MeshStandardMaterial({
      color: 0x3d4f61,
      roughness: 0.35,
      metalness: 0.2,
      envMapIntensity: 0.9,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd4e6,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.95,
      thickness: 1.2,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.9,
    });

    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd4ff,
      roughness: 0.0,
      metalness: 0.0,
      transmission: 0.85,
      thickness: 0.8,
      ior: 1.33,
      clearcoat: 0.5,
      reflectivity: 0.8,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a589,
      roughness: 0.55,
      metalness: 0.0,
      emissive: 0x5a3a2a,
      emissiveIntensity: 0.08,
    });

    const catMatA = new THREE.MeshStandardMaterial({ 
      color: 0x6ee876, 
      roughness: 0.6,
      metalness: 0.0,
      emissive: 0x2a5a2a,
      emissiveIntensity: 0.2
    });
    const catMatB = new THREE.MeshStandardMaterial({ 
      color: 0x3d8c3d, 
      roughness: 0.65,
      metalness: 0.0,
      emissive: 0x1a3a1a,
      emissiveIntensity: 0.15
    });
    const catHeadMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1f1d, 
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x0a0f0d,
      emissiveIntensity: 0.3
    });

    const plant = new THREE.Group();
    plant.position.set(0, 0, -1.35);
    scene.add(plant);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 2.7, 12), stemMat);
    stem.position.y = 1.35;
    stem.castShadow = true;
    plant.add(stem);

    const makeLeafletGeo = (length, width, teeth) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);

      for (let i = 0; i <= teeth; i++) {
        const t = i / teeth;
        const y = t * length;
        const x = Math.sin(t * Math.PI) * width * (1 - t * 0.25);
        const tooth = Math.sin(i * Math.PI) * width * 0.12;
        shape.lineTo(x + tooth, y);
      }

      for (let i = teeth; i >= 0; i--) {
        const t = i / teeth;
        const y = t * length;
        const x = Math.sin(t * Math.PI) * width * (1 - t * 0.25);
        const tooth = Math.sin(i * Math.PI) * width * 0.12;
        shape.lineTo(-x - tooth, y);
      }

      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape, 10);

      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const curl = (y / length) * 0.03;
        pos.setZ(i, pos.getZ(i) + curl + x * 0.03);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      return geo;
    };

    const geoBig = makeLeafletGeo(0.40, 0.09, 10);
    const geoMid = makeLeafletGeo(0.33, 0.078, 9);
    const geoSmall = makeLeafletGeo(0.26, 0.062, 8);

    const makePalmLeaf = (scale) => {
      const g = new THREE.Group();
      const cfg = [
        { geo: geoBig, a: 0.0, s: 1.0 },
        { geo: geoMid, a: -0.28, s: 0.96 },
        { geo: geoMid, a: 0.28, s: 0.96 },
        { geo: geoMid, a: -0.56, s: 0.9 },
        { geo: geoMid, a: 0.56, s: 0.9 },
        { geo: geoSmall, a: -0.82, s: 0.84 },
        { geo: geoSmall, a: 0.82, s: 0.84 },
      ];

      cfg.forEach((c, idx) => {
        const m = new THREE.Mesh(c.geo, leafMat);
        m.scale.setScalar(scale * c.s);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = c.a;
        m.castShadow = true;
        m.rotation.y = (Math.random() - 0.5) * 0.08;
        m.rotation.x += (Math.random() - 0.5) * 0.03;
        g.add(m);
      });

      return g;
    };

    const leafLevels = [
      { y: 0.58, rot: 0.2, scale: 0.78 },
      { y: 0.98, rot: 1.33, scale: 0.9 },
      { y: 1.38, rot: 2.48, scale: 1.0 },
      { y: 1.78, rot: 3.68, scale: 0.96 },
      { y: 2.18, rot: 5.06, scale: 0.84 },
      { y: 2.45, rot: 6.18, scale: 0.64 },
    ];

    const leafSets = [];
    leafLevels.forEach((lvl) => {
      const set = new THREE.Group();

      for (let k = 0; k < 2; k++) {
        const leaf = makePalmLeaf(lvl.scale);
        const a = lvl.rot + k * Math.PI;

        leaf.position.set(Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12);
        leaf.rotation.y = a;
        leaf.rotation.x = 0.52;
        set.add(leaf);
      }

      set.position.y = lvl.y;
      set.userData.windOff = Math.random() * Math.PI * 2;
      leafSets.push(set);
      plant.add(set);
    });

    const caterpillars = [];

    const makeCaterpillar = () => {
      const g = new THREE.Group();
      const segCount = 9;

      for (let i = 0; i < segCount; i++) {
        const r = 0.02 * (1 - i * 0.05);
        const geo = new THREE.SphereGeometry(r, 14, 10);
        const mat = i % 2 === 0 ? catMatA : catMatB;
        const s = new THREE.Mesh(geo, mat);
        s.position.x = i * 0.026;
        s.castShadow = true;
        g.add(s);
      }

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.023, 14, 10), catHeadMat);
      head.position.x = segCount * 0.026;
      head.castShadow = true;
      g.add(head);

      g.scale.setScalar(1.05);

      g.userData = {
        alive: true,
        dying: false,
        fallVel: 0,
        spinVel: 0,
        wiggle: Math.random() * Math.PI * 2,
        radius: 0.06,
      };

      return g;
    };

    const spawnCaterpillars = (n = 8) => {
      for (let i = 0; i < n; i++) {
        const c = makeCaterpillar();
        const level = Math.floor(Math.random() * 5) + 1;
        const a = Math.random() * Math.PI * 2;
        const r = 0.05 + Math.random() * 0.085;

        c.position.set(
          Math.cos(a) * r,
          0.58 + level * 0.4 + (Math.random() - 0.5) * 0.12,
          Math.sin(a) * r
        );
        c.rotation.y = a + Math.PI * 0.5;

        plant.add(c);
        caterpillars.push(c);
      }
    };

    const killCaterpillar = (c) => {
      if (!c?.userData?.alive || c.userData.dying) return;
      c.userData.dying = true;
      c.userData.fallVel = 0.12 + Math.random() * 0.12;
      c.userData.spinVel = (Math.random() > 0.5 ? 1 : -1) * (1.8 + Math.random() * 2.2);
    };

    spawnCaterpillars(8);

    const fpv = new THREE.Group();
    camera.add(fpv);

    const hand = new THREE.Group();
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.155, 0.06), skinMat);
    palm.castShadow = true;
    hand.add(palm);

    const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.085, 0.032), skinMat);
    thumb.position.set(-0.052, 0.042, 0.02);
    thumb.rotation.z = -0.5;
    thumb.castShadow = true;
    hand.add(thumb);

    const fingerGeo = new THREE.BoxGeometry(0.027, 0.105, 0.027);
    [
      { x: 0.036, y: 0.104 },
      { x: 0.015, y: 0.123 },
      { x: -0.012, y: 0.112 },
      { x: -0.032, y: 0.092 },
    ].forEach((p) => {
      const f = new THREE.Mesh(fingerGeo, skinMat);
      f.position.set(p.x, p.y, 0);
      f.rotation.x = -0.25;
      f.castShadow = true;
      hand.add(f);
    });

    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.085, 12), skinMat);
    wrist.position.y = -0.105;
    wrist.rotation.x = Math.PI / 2;
    wrist.castShadow = true;
    hand.add(wrist);

    hand.position.set(0.145, -0.275, -0.19);
    hand.rotation.set(0.32, -0.44, 0.06);
    fpv.add(hand);

    const bottle = new THREE.Group();

    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.096, 0.37, 18), glassMat);
    bottleBody.castShadow = true;
    bottle.add(bottleBody);

    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.28, 18), liquidMat);
    liquid.position.y = -0.06;
    bottle.add(liquid);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.084, 0.058, 16), plasticDark);
    cap.position.y = 0.208;
    cap.castShadow = true;
    bottle.add(cap);

    const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.088, 0.064), plasticMid);
    trigger.position.set(0.088, 0.12, 0);
    trigger.castShadow = true;
    bottle.add(trigger);

    const nozzle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), plasticDark);
    nozzle.position.set(0.056, 0.208, 0);
    nozzle.castShadow = true;
    bottle.add(nozzle);

    const nozzleTip = new THREE.Object3D();
    nozzleTip.position.set(0.115, 0.208, 0);
    bottle.add(nozzleTip);

    bottle.position.set(0.165, -0.205, -0.145);
    bottle.rotation.set(0.18, -0.36, 0.1);
    fpv.add(bottle);

    const getNozzleWorldPos = (out = new THREE.Vector3()) => {
      nozzleTip.getWorldPosition(out);
      return out;
    };

    const animateTrigger = (p) => {
      trigger.rotation.x = -p * 0.45;
    };

    const makeSprite = () => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, "rgba(180, 230, 255, 0.9)");
      gradient.addColorStop(0.2, "rgba(160, 220, 250, 0.6)");
      gradient.addColorStop(0.5, "rgba(140, 200, 240, 0.3)");
      gradient.addColorStop(0.8, "rgba(120, 180, 220, 0.1)");
      gradient.addColorStop(1, "rgba(100, 160, 200, 0.0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      ctx.globalCompositeOperation = "lighter";
      const innerGlow = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/4);
      innerGlow.addColorStop(0, "rgba(255, 255, 255, 0.6)");
      innerGlow.addColorStop(1, "rgba(255, 255, 255, 0.0)");
      ctx.fillStyle = innerGlow;
      ctx.fillRect(0, 0, size, size);
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      return tex;
    };

    const sprayTex = makeSprite();

    const MAXP = 2200;
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
      size: 0.08,
      opacity: 0.85,
      color: 0xc8e8ff,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const sprayPoints = new THREE.Points(pGeo, pMat);
    scene.add(sprayPoints);

    const emit = (start, dir, count = 18) => {
      for (let i = 0; i < count; i++) {
        const id = pHead++ % MAXP;
        const spread = 0.16;
        const speed = 0.52;

        const vx = dir.x * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;
        const vy = dir.y * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread * 0.55;
        const vz = dir.z * (0.9 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;

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
      const drag = 0.985;
      const gravity = -0.32;
      for (let i = 0; i < MAXP; i++) {
        if (pLife[i] <= 0) continue;

        pVel[i * 3 + 0] *= drag;
        pVel[i * 3 + 1] = pVel[i * 3 + 1] * drag + gravity * dt;
        pVel[i * 3 + 2] *= drag;

        pPos[i * 3 + 0] += pVel[i * 3 + 0] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;

        pLife[i] -= dt * 1.15;
        if (pPos[i * 3 + 1] < 0.03) pLife[i] = 0;
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
      cooldown: 0,
    };

    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      input.targetY = clamp(nx * 0.20, -0.20, 0.20);
      input.targetX = clamp(ny * 0.13, -0.13, 0.13);
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
          caterpillars: alive,
        });
        fpsFrames = 0;
        fpsAcc = 0;
      }

      input.lookX += (input.targetX - input.lookX) * 0.12;
      input.lookY += (input.targetY - input.lookY) * 0.12;
      camera.rotation.x = input.lookX;
      camera.rotation.y = input.lookY;

      leafSets.forEach((set, idx) => {
        const off = set.userData.windOff;
        const heightFactor = idx / leafSets.length;
        const strength = 0.22 + heightFactor * 0.15;
        
        const w1 = Math.sin(t * 1.8 + off) * strength;
        const w2 = Math.cos(t * 1.4 + off * 1.3) * strength * 0.7;
        const w3 = Math.sin(t * 2.5 + off * 0.7) * strength * 0.4;
        
        set.rotation.x = w1 * 0.12 + w3 * 0.05;
        set.rotation.z = w2 * 0.10 + w3 * 0.03;
        set.rotation.y = w3 * 0.08;
        
        set.children.forEach((leaf, leafIdx) => {
          leaf.rotation.x += Math.sin(t * 3 + off + leafIdx) * 0.002;
          leaf.rotation.z += Math.cos(t * 2.5 + off + leafIdx * 0.5) * 0.002;
        });
      });

      caterpillars.forEach((c) => {
        if (!c.userData.alive) return;
        c.userData.wiggle += dt * 6.2;

        if (!c.userData.dying) {
          const wig = Math.sin(c.userData.wiggle) * 0.12;
          const wigSecondary = Math.cos(c.userData.wiggle * 1.5) * 0.08;
          c.rotation.x = wig + wigSecondary * 0.5;
          c.rotation.z = Math.sin(c.userData.wiggle * 0.8) * 0.05;
          
          c.children.forEach((seg, i) => {
            const segWiggle = Math.sin(c.userData.wiggle + i * 0.55) * 0.004;
            const segBounce = Math.cos(c.userData.wiggle * 1.3 + i * 0.3) * 0.002;
            seg.position.y = segWiggle + segBounce;
            seg.rotation.y = Math.sin(c.userData.wiggle * 2 + i * 0.4) * 0.05;
            seg.scale.y = 1 + Math.sin(c.userData.wiggle * 1.8 + i * 0.6) * 0.05;
          });
        } else {
          c.userData.fallVel += dt * 0.8;
          c.position.y -= c.userData.fallVel * dt * 2.1;
          c.rotation.x += c.userData.spinVel * dt * 0.75;
          c.rotation.z += c.userData.spinVel * dt * 0.5;
          c.scale.multiplyScalar(1 - dt * 0.6);

          if (c.position.y < 0.03 || c.scale.x < 0.18) {
            c.userData.alive = false;
            plant.remove(c);
            disposeObject(c);
          }
        }
      });

      if (input.cooldown > 0) input.cooldown -= dt;

      if (input.spraying) {
        input.sprayT += dt;
        const dur = 1.15;
        const p = clamp(input.sprayT / dur, 0, 1);

        animateTrigger(Math.sin(p * Math.PI));

        if (p > 0.12 && p < 0.92) {
          const noz = getNozzleWorldPos(tmpNoz);
          tmpForward.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

          emit(noz, tmpForward, 20);

          const range = 2.0;
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
          input.cooldown = 0.55;
          input.sprayT = 0;
          animateTrigger(0);
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
      leafTexture.dispose?.();
      leafNormalMap.dispose?.();
      stemTexture.dispose?.();
      groundTexture.dispose?.();
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

      <div className="absolute top-4 left-4 bg-black/65 text-white p-3 rounded-lg font-mono text-xs select-none">
        <div className="font-bold mb-1 text-emerald-300">Stats</div>
        <div>FPS: {stats.fps}</div>
        <div>Particles: {stats.particles}</div>
        <div>Caterpillars: {stats.caterpillars}</div>
      </div>

      <div className="absolute top-4 right-4 bg-black/65 text-white p-3 rounded-lg text-xs select-none">
        <div className="font-bold mb-2 text-emerald-300">Controls</div>
        <div>
          <span className="text-yellow-200">CLICK / SPACE</span> — Spray
        </div>
        <div>
          <span className="text-yellow-200">MOUSE</span> — Look
        </div>
      </div>
    </div>
  );
};

export default HempSprayFPV_Base44Safe;