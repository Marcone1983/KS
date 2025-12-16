import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function HempSprayFPV_Realistic({ 
  activePests = [], 
  plantHealth = 100, 
  currentWeather = 'clear',
  dayNightHour = 12,
  windStrength = 0.2,
  rainIntensity = 0,
  onPestKilled 
}) {
  const containerRef = useRef(null);
  const rafRef = useRef(0);
  const [stats, setStats] = useState({ fps: 0, particles: 0, pests: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const size = () => ({
      w: container.clientWidth || window.innerWidth,
      h: container.clientHeight || window.innerHeight,
    });

    const { w, h } = size();
    const scene = new THREE.Scene();
    
    const getTimeColors = (hour) => {
      if (hour >= 5 && hour < 7) return { bg: 0xff9966, ambient: 0xffaa77, sun: 0xffcc88 };
      if (hour >= 7 && hour < 17) return { bg: 0x87ceeb, ambient: 0xffffff, sun: 0xfffacd };
      if (hour >= 17 && hour < 19) return { bg: 0xff7733, ambient: 0xff9955, sun: 0xffaa66 };
      return { bg: 0x1a1a2e, ambient: 0x4a4a6a, sun: 0x6a6aaa };
    };

    const colors = getTimeColors(dayNightHour);
    scene.background = new THREE.Color(colors.bg);
    const fogDensity = currentWeather === 'fog' ? 15 : currentWeather === 'rain' ? 20 : 30;
    scene.fog = new THREE.Fog(colors.bg, 5, fogDensity);

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.01, 100);
    camera.position.set(0, 1.4, 2.2);
    camera.rotation.order = "YXZ";
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: window.devicePixelRatio < 2,
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambient);

    const isDay = dayNightHour >= 6 && dayNightHour < 18;
    const sun = new THREE.DirectionalLight(colors.sun, isDay ? 1.5 : 0.2);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.radius = 2;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const groundGeo = new THREE.PlaneGeometry(40, 40, 30, 30);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a3a2a, 
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false
    });
    groundMat.userData.wetness = 0.0;
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const gPos = ground.geometry.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const x = gPos.getX(i);
      const y = gPos.getY(i);
      const noise = Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.12 + 
                    Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.05;
      gPos.setZ(i, noise);
    }
    gPos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    const rainCount = 800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = [];
    const rainLife = [];
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 30;
      rainPos[i * 3 + 1] = Math.random() * 15;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
      rainVel.push(-6 - Math.random() * 3);
      rainLife.push(Math.random());
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ 
      color: currentWeather === 'acid_rain' ? 0x88ff44 : 0xaaffff,
      size: 0.06, 
      transparent: true, 
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.visible = false;
    scene.add(rain);

    const splashGeo = new THREE.BufferGeometry();
    const splashCount = 200;
    const splashPos = new Float32Array(splashCount * 3);
    const splashVel = [];
    const splashLife = new Float32Array(splashCount);
    for (let i = 0; i < splashCount; i++) {
      splashPos[i * 3] = 0;
      splashPos[i * 3 + 1] = -10;
      splashPos[i * 3 + 2] = 0;
      splashVel.push({ x: 0, y: 0, z: 0 });
      splashLife[i] = 0;
    }
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPos, 3));
    const splashMat = new THREE.PointsMaterial({
      color: 0xccffff,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    const splashPts = new THREE.Points(splashGeo, splashMat);
    scene.add(splashPts);
    let splashHead = 0;

    const potMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.4, 16), potMat);
    pot.position.set(0, 0.2, -1.5);
    pot.castShadow = true;
    pot.receiveShadow = true;
    scene.add(pot);

    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), soilMat);
    soil.position.set(0, 0.425, -1.5);
    soil.receiveShadow = true;
    scene.add(soil);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4a9d4a,
      roughness: 0.7,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    leafMat.userData.wetness = 0.0;

    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a7d4a, roughness: 0.85 });

    const makeSerrated = (len, wid) => {
      const sh = new THREE.Shape();
      const teeth = 8;
      sh.moveTo(0, 0);
      for (let i = 0; i <= teeth; i++) {
        const t = i / teeth;
        const y = t * len;
        const w = Math.sin(t * Math.PI) * wid * (1 - t * 0.15);
        const tooth = (i % 2 === 0) ? w * 0.08 : 0;
        sh.lineTo(w + tooth, y);
      }
      for (let i = teeth; i >= 0; i--) {
        const t = i / teeth;
        const y = t * len;
        const w = Math.sin(t * Math.PI) * wid * (1 - t * 0.15);
        const tooth = (i % 2 === 0) ? w * 0.08 : 0;
        sh.lineTo(-w - tooth, y);
      }
      sh.closePath();
      const geo = new THREE.ShapeGeometry(sh, 4);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, (y / len) * 0.012 + Math.abs(x) * 0.008);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };

    const leafGeometryCache = new Map();
    const getLeafGeometry = (len, wid) => {
      const key = `${len.toFixed(2)}_${wid.toFixed(2)}`;
      if (!leafGeometryCache.has(key)) {
        leafGeometryCache.set(key, makeSerrated(len, wid));
      }
      return leafGeometryCache.get(key);
    };

    const makePalmLeaf = (sc = 1.0) => {
      const grp = new THREE.Group();
      const mainGeo = getLeafGeometry(0.5 * sc, 0.1 * sc);
      const main = new THREE.Mesh(mainGeo, leafMat);
      main.rotation.x = -Math.PI / 2;
      main.castShadow = true;
      grp.add(main);

      const sides = [
        { a: -0.4, l: 0.45, w: 0.09, y: 0.09 },
        { a: 0.4, l: 0.45, w: 0.09, y: 0.09 },
        { a: -0.7, l: 0.4, w: 0.085, y: 0.17 },
        { a: 0.7, l: 0.4, w: 0.085, y: 0.17 },
        { a: -1.0, l: 0.35, w: 0.075, y: 0.24 },
        { a: 1.0, l: 0.35, w: 0.075, y: 0.24 }
      ];

      sides.forEach(cfg => {
        const geo = getLeafGeometry(cfg.l * sc, cfg.w * sc);
        const m = new THREE.Mesh(geo, leafMat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = cfg.a;
        m.position.y = cfg.y * sc;
        m.castShadow = true;
        grp.add(m);
      });

      return grp;
    };

    const plantGroup = new THREE.Group();
    plantGroup.position.set(0, 0.45, -1.5);
    scene.add(plantGroup);

    const mainStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 2.5, 8),
      stemMat
    );
    mainStem.position.y = 1.25;
    mainStem.castShadow = true;
    plantGroup.add(mainStem);

    const nodeLevels = [
      { y: 0.4, rot: 0, len: 0.4, sc: 0.75, leafCount: 2 },
      { y: 0.75, rot: Math.PI / 2, len: 0.45, sc: 0.85, leafCount: 2 },
      { y: 1.1, rot: 0, len: 0.48, sc: 0.95, leafCount: 3 },
      { y: 1.45, rot: Math.PI / 2, len: 0.45, sc: 1.0, leafCount: 3 },
      { y: 1.75, rot: 0, len: 0.4, sc: 0.9, leafCount: 2 },
      { y: 2.0, rot: Math.PI / 2, len: 0.32, sc: 0.75, leafCount: 2 }
    ];

    const allBranches = [];

    nodeLevels.forEach(node => {
      const nodeGrp = new THREE.Group();
      nodeGrp.position.y = node.y;
      nodeGrp.rotation.y = node.rot;
      
      [-1, 1].forEach(dir => {
        const branchStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.02, node.len, 6),
          stemMat
        );
        branchStem.position.x = dir * node.len / 2;
        branchStem.rotation.z = dir * Math.PI / 2;
        branchStem.castShadow = true;
        nodeGrp.add(branchStem);

        for (let i = 0; i < node.leafCount; i++) {
          const lf = makePalmLeaf(node.sc);
          const t = 0.5 + (i / (node.leafCount - 1)) * 0.4;
          lf.position.x = dir * node.len * t;
          lf.position.y = (Math.random() - 0.5) * 0.04;
          lf.rotation.y = dir * (Math.PI / 2 + (Math.random() - 0.5) * 0.3);
          lf.rotation.x = (Math.random() - 0.5) * 0.25;
          lf.userData.windOff = Math.random() * Math.PI * 2;
          lf.userData.windBase = { x: lf.rotation.x, y: lf.rotation.y, z: lf.rotation.z };
          nodeGrp.add(lf);
        }
      });

      nodeGrp.userData.windOff = Math.random() * Math.PI * 2;
      allBranches.push(nodeGrp);
      plantGroup.add(nodeGrp);
    });

    const topLeaves = new THREE.Group();
    topLeaves.position.y = 2.4;
    for (let i = 0; i < 5; i++) {
      const lf = makePalmLeaf(0.7 + (i === 0 ? 0.2 : 0));
      const ang = (i / 5) * Math.PI * 2;
      const rad = i === 0 ? 0 : 0.08;
      lf.position.set(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      lf.rotation.y = ang;
      lf.rotation.x = i === 0 ? 0 : Math.PI / 4;
      lf.userData.windOff = Math.random() * Math.PI * 2;
      lf.userData.windBase = { x: lf.rotation.x, y: lf.rotation.y, z: lf.rotation.z };
      topLeaves.add(lf);
    }
    topLeaves.userData.windOff = Math.random() * Math.PI * 2;
    allBranches.push(topLeaves);
    plantGroup.add(topLeaves);

    const pestsMap = new Map();

    const pestMatsA = new THREE.MeshStandardMaterial({ 
      color: 0x88dd66, 
      roughness: 0.6,
      emissive: 0x2a4a2a,
      emissiveIntensity: 0.15
    });
    const pestMatsB = new THREE.MeshStandardMaterial({ 
      color: 0x5a9d5a, 
      roughness: 0.65,
      emissive: 0x1a3a1a,
      emissiveIntensity: 0.12
    });
    const pestHeadMat = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, 
      roughness: 0.5,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.2
    });

    const makePestMesh = () => {
      const g = new THREE.Group();
      const segs = 6;
      for (let i = 0; i < segs; i++) {
        const r = 0.025 * (1 - i * 0.06);
        const geo = new THREE.SphereGeometry(r, 6, 5);
        const mat = i % 2 === 0 ? pestMatsA : pestMatsB;
        const s = new THREE.Mesh(geo, mat);
        s.position.x = i * 0.03;
        s.castShadow = true;
        g.add(s);
      }
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 5), pestHeadMat);
      hd.position.x = segs * 0.03;
      hd.castShadow = true;
      g.add(hd);
      return g;
    };

    const handGrp = new THREE.Group();
    handGrp.position.set(0.55, -0.6, -0.7);
    handGrp.rotation.set(0.2, -0.4, 0.1);
    camera.add(handGrp);

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a589, roughness: 0.6 });
    const palmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.06), skinMat);
    palmMesh.castShadow = true;
    handGrp.add(palmMesh);

    const thumbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.035), skinMat);
    thumbMesh.position.set(-0.06, 0.05, 0.025);
    thumbMesh.rotation.z = -0.6;
    thumbMesh.castShadow = true;
    handGrp.add(thumbMesh);

    [
      { x: 0.04, y: 0.12 },
      { x: 0.018, y: 0.14 },
      { x: -0.01, y: 0.13 },
      { x: -0.035, y: 0.11 }
    ].forEach(p => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.11, 0.028), skinMat);
      f.position.set(p.x, p.y, 0);
      f.rotation.x = -0.25;
      f.castShadow = true;
      handGrp.add(f);
    });

    const bottleGrp = new THREE.Group();
    bottleGrp.position.set(0, 0.02, 0.04);
    bottleGrp.rotation.set(0.1, 0, 0);
    handGrp.add(bottleGrp);

    const glassmat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f5ff,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.6,
      ior: 1.45,
      clearcoat: 0.8
    });

    const btlBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.4, 12), glassmat);
    btlBody.castShadow = true;
    bottleGrp.add(btlBody);

    const liqMat = new THREE.MeshPhysicalMaterial({
      color: 0x80d4ff,
      roughness: 0.0,
      transmission: 0.75,
      thickness: 0.4,
      ior: 1.33
    });
    const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.32, 12), liqMat);
    liq.position.y = -0.05;
    bottleGrp.add(liq);

    const plasticMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.2 });
    const triggerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.07), plasticMat);
    triggerMesh.position.set(0.095, 0.12, 0);
    triggerMesh.castShadow = true;
    bottleGrp.add(triggerMesh);

    const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.06, 12), plasticMat);
    capMesh.position.y = 0.23;
    capMesh.castShadow = true;
    bottleGrp.add(capMesh);

    const nozzleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.03), plasticMat);
    nozzleMesh.position.set(0.055, 0.23, 0);
    nozzleMesh.castShadow = true;
    bottleGrp.add(nozzleMesh);

    const nozzleTip = new THREE.Object3D();
    nozzleTip.position.set(0.12, 0.23, 0);
    bottleGrp.add(nozzleTip);

    const spriteTex = (() => {
      const sz = 64;
      const c = document.createElement("canvas");
      c.width = c.height = sz;
      const ctx = c.getContext("2d");
      const g = ctx.createRadialGradient(sz/2, sz/2, 0, sz/2, sz/2, sz/2);
      g.addColorStop(0, "rgba(220, 240, 255, 1)");
      g.addColorStop(0.4, "rgba(180, 220, 245, 0.6)");
      g.addColorStop(1, "rgba(140, 200, 230, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, sz, sz);
      const tx = new THREE.CanvasTexture(c);
      return tx;
    })();

    const MAXP = 800;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(MAXP * 3);
    const pVel = new Float32Array(MAXP * 3);
    const pLife = new Float32Array(MAXP);
    let pHead = 0;
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));

    const sprayMat = new THREE.PointsMaterial({
      map: spriteTex,
      transparent: true,
      depthWrite: false,
      size: 0.12,
      opacity: 0.85,
      color: 0xc8e8ff,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const sprayPts = new THREE.Points(pGeo, sprayMat);
    scene.add(sprayPts);

    const emit = (start, dir, cnt = 15) => {
      for (let i = 0; i < cnt; i++) {
        const id = pHead++ % MAXP;
        const sp = 0.2;
        const spd = 0.65;
        const vx = dir.x * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * sp;
        const vy = dir.y * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * sp * 0.4;
        const vz = dir.z * (0.8 + Math.random() * 0.8) + (Math.random() - 0.5) * sp;
        pPos[id * 3] = start.x;
        pPos[id * 3 + 1] = start.y;
        pPos[id * 3 + 2] = start.z;
        pVel[id * 3] = vx * spd;
        pVel[id * 3 + 1] = vy * spd;
        pVel[id * 3 + 2] = vz * spd;
        pLife[id] = 1.0;
      }
      pGeo.attributes.position.needsUpdate = true;
    };

    const updateParts = (dt) => {
      const drag = 0.97;
      const grav = -0.5;
      for (let i = 0; i < MAXP; i++) {
        if (pLife[i] <= 0) continue;
        pVel[i * 3] *= drag;
        pVel[i * 3 + 1] = pVel[i * 3 + 1] * drag + grav * dt;
        pVel[i * 3 + 2] *= drag;
        pPos[i * 3] += pVel[i * 3] * dt;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
        pLife[i] -= dt * 1.3;
        if (pPos[i * 3 + 1] < 0.01) pLife[i] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
    };

    const inp = {
      lx: 0, ly: 0, tx: 0, ty: 0,
      spray: false, sprayT: 0, cd: 0
    };

    const onMv = (e) => {
      const r = container.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = (e.clientX - cx) / (r.width / 2);
      const ny = (e.clientY - cy) / (r.height / 2);
      inp.ty = clamp(nx * 0.3, -0.3, 0.3);
      inp.tx = clamp(ny * 0.2, -0.2, 0.2);
    };

    const start = () => {
      if (inp.spray || inp.cd > 0) return;
      inp.spray = true;
      inp.sprayT = 0;
    };

    const onDwn = () => start();
    const onKy = (e) => { if (e.code === "Space") start(); };

    window.addEventListener("pointermove", onMv);
    window.addEventListener("pointerdown", onDwn);
    window.addEventListener("keydown", onKy);

    const tmpN = new THREE.Vector3();
    const tmpF = new THREE.Vector3();
    const tmpT = new THREE.Vector3();

    const rayDist = (ro, rd, pt) => {
      tmpT.subVectors(pt, ro);
      const prj = tmpT.dot(rd);
      if (prj < 0) return { dist: Infinity, prj };
      const cls = rd.clone().multiplyScalar(prj);
      const perp = tmpT.sub(cls);
      return { dist: perp.length(), prj };
    };

    const clk = new THREE.Clock();
    let fpsFr = 0, fpsAc = 0;

    const anim = () => {
      rafRef.current = requestAnimationFrame(anim);
      const dt = Math.min(0.05, clk.getDelta());
      const t = clk.getElapsedTime();

      fpsFr++;
      fpsAc += dt;
      if (fpsAc >= 0.5) {
        setStats({
          fps: Math.round(fpsFr / fpsAc),
          particles: Math.min(pHead, MAXP),
          pests: pestsMap.size
        });
        fpsFr = 0;
        fpsAc = 0;
      }

      if (rainIntensity > 0) {
        rain.visible = true;
        rainMat.opacity = rainIntensity * 0.7;
        rainMat.color.setHex(currentWeather === 'acid_rain' ? 0x88ff44 : 0xaaffff);
        
        const rp = rainGeo.attributes.position;
        for (let i = 0; i < rainCount; i++) {
          rp.setY(i, rp.getY(i) + rainVel[i] * dt * rainIntensity);
          rp.setX(i, rp.getX(i) + Math.sin(t * 0.8 + i) * windStrength * dt * 2);
          
          if (rp.getY(i) < 0.1) {
            const posY = rp.getY(i);
            const posX = rp.getX(i);
            const posZ = rp.getZ(i);
            
            if (Math.random() < 0.15) {
              for (let s = 0; s < 3; s++) {
                const sid = (splashHead + s) % splashCount;
                const sp = splashGeo.attributes.position;
                sp.setX(sid, posX);
                sp.setY(sid, posY + 0.05);
                sp.setZ(sid, posZ);
                const ang = (s / 3) * Math.PI * 2;
                splashVel[sid] = {
                  x: Math.cos(ang) * 0.3,
                  y: 0.4 + Math.random() * 0.3,
                  z: Math.sin(ang) * 0.3
                };
                splashLife[sid] = 1.0;
              }
              splashHead = (splashHead + 3) % splashCount;
            }
            
            rp.setY(i, 15);
            rp.setX(i, (Math.random() - 0.5) * 30);
            rp.setZ(i, (Math.random() - 0.5) * 30);
          }
        }
        rp.needsUpdate = true;

        const sp = splashGeo.attributes.position;
        for (let i = 0; i < splashCount; i++) {
          if (splashLife[i] <= 0) continue;
          splashVel[i].y -= 1.5 * dt;
          sp.setX(i, sp.getX(i) + splashVel[i].x * dt);
          sp.setY(i, sp.getY(i) + splashVel[i].y * dt);
          sp.setZ(i, sp.getZ(i) + splashVel[i].z * dt);
          splashLife[i] -= dt * 2;
          if (sp.getY(i) < 0) splashLife[i] = 0;
        }
        sp.needsUpdate = true;

        leafMat.userData.wetness = Math.min(1, leafMat.userData.wetness + dt * 0.3);
        groundMat.userData.wetness = Math.min(1, groundMat.userData.wetness + dt * 0.2);
        leafMat.roughness = 0.7 * (1 - leafMat.userData.wetness * 0.6);
        groundMat.roughness = 0.9 * (1 - groundMat.userData.wetness * 0.5);
        
        if (currentWeather === 'acid_rain') {
          leafMat.color.lerp(new THREE.Color(0x3a7d3a), dt * 0.05);
        }
      } else {
        rain.visible = false;
        leafMat.userData.wetness = Math.max(0, leafMat.userData.wetness - dt * 0.1);
        groundMat.userData.wetness = Math.max(0, groundMat.userData.wetness - dt * 0.08);
        leafMat.roughness = 0.7 * (1 - leafMat.userData.wetness * 0.6);
        groundMat.roughness = 0.9 * (1 - groundMat.userData.wetness * 0.5);
        
        if (currentWeather !== 'acid_rain') {
          leafMat.color.lerp(new THREE.Color(0x4a9d4a), dt * 0.1);
        }
      }

      const tc = getTimeColors(dayNightHour);
      scene.background.lerp(new THREE.Color(tc.bg), 0.02);
      ambient.color.lerp(new THREE.Color(tc.ambient), 0.02);
      sun.color.lerp(new THREE.Color(tc.sun), 0.02);
      
      let sunIntensity = dayNightHour >= 6 && dayNightHour < 18 ? 1.5 : 0.2;
      if (currentWeather === 'fog') sunIntensity *= 0.4;
      if (currentWeather === 'rain') sunIntensity *= 0.6;
      sun.intensity = sunIntensity;

      const targetFog = currentWeather === 'fog' ? 12 : currentWeather === 'rain' ? 18 : 30;
      scene.fog.far += (targetFog - scene.fog.far) * 0.05;

      inp.lx += (inp.tx - inp.lx) * 0.12;
      inp.ly += (inp.ty - inp.ly) * 0.12;
      camera.rotation.x = inp.lx;
      camera.rotation.y = inp.ly;

      const wStr = windStrength * (1 + Math.sin(t * 0.6) * 0.4);
      allBranches.forEach((br, idx) => {
        const off = br.userData.windOff;
        const hf = idx / allBranches.length;
        const str = wStr * (0.1 + hf * 0.06);
        const w1 = Math.sin(t * 1.4 + off) * str;
        const w2 = Math.cos(t * 1.1 + off * 1.2) * str * 0.5;
        
        if (!br.userData.windBase) {
          br.userData.windBase = { z: br.rotation.z, x: br.rotation.x };
        }
        
        br.rotation.z = br.userData.windBase.z + w1 * 0.15;
        br.rotation.x = br.userData.windBase.x + w2 * 0.08;
        
        br.children.forEach(ch => {
          if (ch.userData.windOff !== undefined && ch.userData.windBase) {
            const lw1 = Math.sin(t * 2.2 + ch.userData.windOff) * wStr * 0.06;
            const lw2 = Math.cos(t * 1.8 + ch.userData.windOff * 1.3) * wStr * 0.04;
            ch.rotation.x = ch.userData.windBase.x + lw2;
            ch.rotation.z = ch.userData.windBase.z + lw1;
          }
        });
      });

      activePests.forEach(pestData => {
        let pestMesh = pestsMap.get(pestData.id);
        
        if (!pestMesh && pestData.position) {
          pestMesh = makePestMesh();
          pestMesh.position.set(pestData.position.x, pestData.position.y, pestData.position.z);
          pestMesh.userData = { 
            id: pestData.id,
            wiggle: Math.random() * Math.PI * 2,
            dying: false,
            fleeing: false
          };
          scene.add(pestMesh);
          pestsMap.set(pestData.id, pestMesh);
        }

        if (pestMesh) {
          pestMesh.userData.wiggle += dt * 6;

          if (pestData.health <= 0 && !pestMesh.userData.dying) {
            pestMesh.userData.dying = true;
            pestMesh.userData.fallVel = 0.15;
            pestMesh.userData.spinVel = (Math.random() > 0.5 ? 1 : -1) * 2.5;
          }

          if (pestMesh.userData.dying) {
            pestMesh.userData.fallVel = (pestMesh.userData.fallVel || 0) + dt * 1.2;
            pestMesh.position.y -= pestMesh.userData.fallVel * dt * 3;
            pestMesh.rotation.x += (pestMesh.userData.spinVel || 2) * dt;
            pestMesh.scale.multiplyScalar(1 - dt * 0.8);
            if (pestMesh.position.y < 0 || pestMesh.scale.x < 0.12) {
              scene.remove(pestMesh);
              pestsMap.delete(pestData.id);
            }
          } else {
            if (pestData.position) {
              pestMesh.position.lerp(
                new THREE.Vector3(pestData.position.x, pestData.position.y, pestData.position.z),
                0.1
              );
            }

            const w = Math.sin(pestMesh.userData.wiggle) * 0.12;
            pestMesh.rotation.x = w;
            pestMesh.children.forEach((s, i) => {
              s.position.y = Math.sin(pestMesh.userData.wiggle + i * 0.6) * 0.004;
            });
          }
        }
      });

      const activePestIds = new Set(activePests.map(p => p.id));
      for (const [id, mesh] of pestsMap.entries()) {
        if (!activePestIds.has(id) && !mesh.userData.dying) {
          scene.remove(mesh);
          pestsMap.delete(id);
        }
      }

      if (inp.cd > 0) inp.cd -= dt;

      if (inp.spray) {
        inp.sprayT += dt;
        const dur = 0.9;
        const pr = clamp(inp.sprayT / dur, 0, 1);
        triggerMesh.rotation.x = -Math.sin(pr * Math.PI) * 0.5;

        if (pr > 0.12 && pr < 0.88) {
          nozzleTip.getWorldPosition(tmpN);
          tmpF.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
          emit(tmpN, tmpF, 20);

          if (Math.random() < 0.3) {
            for (let s = 0; s < 2; s++) {
              const sid = (splashHead + s) % splashCount;
              const sp = splashGeo.attributes.position;
              const spread = 0.15;
              sp.setX(sid, tmpN.x + (Math.random() - 0.5) * spread);
              sp.setY(sid, tmpN.y + (Math.random() - 0.5) * spread);
              sp.setZ(sid, tmpN.z + (Math.random() - 0.5) * spread);
              splashVel[sid] = {
                x: tmpF.x * 0.5 + (Math.random() - 0.5) * 0.4,
                y: tmpF.y * 0.5 + (Math.random() - 0.5) * 0.4,
                z: tmpF.z * 0.5 + (Math.random() - 0.5) * 0.4
              };
              splashLife[sid] = 0.8;
            }
            splashHead = (splashHead + 2) % splashCount;
          }

          const rng = 4.0;
          const radius = 0.35;
          
          activePests.forEach(pestData => {
            if (!pestData.position || pestData.health <= 0) return;
            
            const pestPos = new THREE.Vector3(pestData.position.x, pestData.position.y, pestData.position.z);
            const { dist, prj } = rayDist(tmpN, tmpF, pestPos);
            
            if (prj > 0 && prj < rng && dist < radius) {
              if (onPestKilled) {
                onPestKilled(pestData.id, 35);
              }
            }
          });
        }

        if (pr >= 1) {
          inp.spray = false;
          inp.cd = 0.45;
          inp.sprayT = 0;
          triggerMesh.rotation.x = 0;
        }
      }

      updateParts(dt);
      renderer.render(scene, camera);
    };

    anim();

    const onRsz = () => {
      const s = size();
      camera.aspect = s.w / s.h;
      camera.updateProjectionMatrix();
      renderer.setSize(s.w, s.h);
    };
    window.addEventListener("resize", onRsz);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onRsz);
      window.removeEventListener("pointermove", onMv);
      window.removeEventListener("pointerdown", onDwn);
      window.removeEventListener("keydown", onKy);
      spriteTex.dispose?.();
      scene.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
          else o.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement?.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activePests, plantHealth, currentWeather, dayNightHour, windStrength, rainIntensity, onPestKilled]);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-black/75 text-white p-2 rounded text-xs font-mono backdrop-blur-sm">
        <div className="font-bold text-green-400 mb-1">Stats</div>
        <div>FPS: {stats.fps}</div>
        <div>Particles: {stats.particles}</div>
        <div>Pests: {stats.pests}</div>
      </div>
      <div className="absolute top-4 right-4 bg-black/75 text-white p-2 rounded text-xs backdrop-blur-sm">
        <div className="font-bold text-green-400 mb-1">Controls</div>
        <div><span className="text-yellow-300">CLICK/SPACE</span> — Spray</div>
        <div><span className="text-yellow-300">MOUSE</span> — Look</div>
      </div>
    </div>
  );
}