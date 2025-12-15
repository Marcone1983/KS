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
    scene.fog = new THREE.Fog(colors.bg, 5, 30);

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
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(colors.ambient, 0.5);
    scene.add(ambient);

    const isDay = dayNightHour >= 6 && dayNightHour < 18;
    const sun = new THREE.DirectionalLight(colors.sun, isDay ? 1.5 : 0.2);
    sun.position.set(6, 10, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const groundGeo = new THREE.PlaneGeometry(40, 40, 20, 20);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const gPos = ground.geometry.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      gPos.setZ(i, gPos.getZ(i) + (Math.random() - 0.5) * 0.1);
    }
    gPos.needsUpdate = true;
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 300;
    const rainPos = new Float32Array(rainCount * 3);
    const rainVel = [];
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 25;
      rainPos[i * 3 + 1] = Math.random() * 12;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
      rainVel.push(-4 - Math.random() * 2);
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.04, transparent: true, opacity: 0.5 });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.visible = false;
    scene.add(rain);

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
      side: THREE.DoubleSide
    });

    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5a7d4a, roughness: 0.85 });

    const makeSerrated = (len, wid) => {
      const sh = new THREE.Shape();
      const teeth = 14;
      sh.moveTo(0, 0);
      for (let i = 0; i <= teeth; i++) {
        const t = i / teeth;
        const y = t * len;
        const w = Math.sin(t * Math.PI) * wid * (1 - t * 0.15);
        const tooth = (i % 2 === 0) ? w * 0.1 : 0;
        sh.lineTo(w + tooth, y);
      }
      for (let i = teeth; i >= 0; i--) {
        const t = i / teeth;
        const y = t * len;
        const w = Math.sin(t * Math.PI) * wid * (1 - t * 0.15);
        const tooth = (i % 2 === 0) ? w * 0.1 : 0;
        sh.lineTo(-w - tooth, y);
      }
      sh.closePath();
      const geo = new THREE.ShapeGeometry(sh, 6);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, (y / len) * 0.015 + Math.abs(x) * 0.01);
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };

    const makePalmLeaf = (sc = 1.0) => {
      const grp = new THREE.Group();
      const mainGeo = makeSerrated(0.5 * sc, 0.1 * sc);
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
        const geo = makeSerrated(cfg.l * sc, cfg.w * sc);
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
      new THREE.CylinderGeometry(0.035, 0.045, 2.5, 10),
      stemMat
    );
    mainStem.position.y = 1.25;
    mainStem.castShadow = true;
    plantGroup.add(mainStem);

    const nodeLevels = [
      { y: 0.4, rot: 0, len: 0.4, sc: 0.75 },
      { y: 0.75, rot: Math.PI / 2, len: 0.45, sc: 0.85 },
      { y: 1.1, rot: 0, len: 0.48, sc: 0.95 },
      { y: 1.45, rot: Math.PI / 2, len: 0.45, sc: 1.0 },
      { y: 1.75, rot: 0, len: 0.4, sc: 0.9 },
      { y: 2.0, rot: Math.PI / 2, len: 0.32, sc: 0.75 }
    ];

    const allBranches = [];

    nodeLevels.forEach(node => {
      const nodeGrp = new THREE.Group();
      nodeGrp.position.y = node.y;
      nodeGrp.rotation.y = node.rot;
      
      [-1, 1].forEach(dir => {
        const branchStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.02, node.len, 8),
          stemMat
        );
        branchStem.position.x = dir * node.len / 2;
        branchStem.rotation.z = dir * Math.PI / 2;
        branchStem.castShadow = true;
        nodeGrp.add(branchStem);

        for (let i = 0; i < 2; i++) {
          const lf = makePalmLeaf(node.sc);
          const t = 0.6 + i * 0.3;
          lf.position.x = dir * node.len * t;
          lf.position.y = (Math.random() - 0.5) * 0.04;
          lf.rotation.y = dir * (Math.PI / 2 + (Math.random() - 0.5) * 0.3);
          lf.rotation.x = (Math.random() - 0.5) * 0.25;
          lf.userData.windOff = Math.random() * Math.PI * 2;
          nodeGrp.add(lf);
        }
      });

      nodeGrp.userData.windOff = Math.random() * Math.PI * 2;
      allBranches.push(nodeGrp);
      plantGroup.add(nodeGrp);
    });

    const topLeaves = new THREE.Group();
    topLeaves.position.y = 2.4;
    for (let i = 0; i < 4; i++) {
      const lf = makePalmLeaf(0.7);
      const ang = (i / 4) * Math.PI * 2;
      lf.position.set(Math.cos(ang) * 0.08, 0, Math.sin(ang) * 0.08);
      lf.rotation.y = ang;
      lf.rotation.x = Math.PI / 4;
      lf.userData.windOff = Math.random() * Math.PI * 2;
      topLeaves.add(lf);
    }
    topLeaves.userData.windOff = Math.random() * Math.PI * 2;
    allBranches.push(topLeaves);
    plantGroup.add(topLeaves);

    const pests = [];
    const pestMeshes = new Map();

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
    const pestHead = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, 
      roughness: 0.5,
      emissive: 0x1a1a1a,
      emissiveIntensity: 0.2
    });

    const makePest = () => {
      const g = new THREE.Group();
      const segs = 8;
      for (let i = 0; i < segs; i++) {
        const r = 0.02 * (1 - i * 0.05);
        const geo = new THREE.SphereGeometry(r, 8, 6);
        const mat = i % 2 === 0 ? pestMatsA : pestMatsB;
        const s = new THREE.Mesh(geo, mat);
        s.position.x = i * 0.025;
        s.castShadow = true;
        g.add(s);
      }
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), pestHead);
      hd.position.x = segs * 0.025;
      hd.castShadow = true;
      g.add(hd);
      g.userData = { alive: true, dying: false, fleeing: false, wiggle: Math.random() * Math.PI * 2 };
      return g;
    };

    nodeLevels.forEach((node, idx) => {
      if (idx > 1) {
        for (let i = 0; i < 2; i++) {
          const p = makePest();
          const side = i === 0 ? 1 : -1;
          const t = 0.4 + Math.random() * 0.4;
          const ang = node.rot;
          const localX = side * node.len * t;
          const wx = Math.cos(ang) * localX;
          const wz = Math.sin(ang) * localX;
          p.position.set(wx, node.y, wz);
          p.rotation.y = ang + side * Math.PI / 2;
          pests.push(p);
          plantGroup.add(p);
        }
      }
    });

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
          pests: pests.filter(p => p.userData.alive).length
        });
        fpsFr = 0;
        fpsAc = 0;
      }

      if (rainIntensity > 0) {
        rain.visible = true;
        rainMat.opacity = rainIntensity * 0.5;
        const rp = rainGeo.attributes.position;
        for (let i = 0; i < rainCount; i++) {
          rp.setY(i, rp.getY(i) + rainVel[i] * dt);
          if (rp.getY(i) < 0) rp.setY(i, 12);
        }
        rp.needsUpdate = true;
      } else {
        rain.visible = false;
      }

      const tc = getTimeColors(dayNightHour);
      scene.background.lerp(new THREE.Color(tc.bg), 0.02);
      ambient.color.lerp(new THREE.Color(tc.ambient), 0.02);
      sun.color.lerp(new THREE.Color(tc.sun), 0.02);
      sun.intensity = dayNightHour >= 6 && dayNightHour < 18 ? 1.5 : 0.2;

      inp.lx += (inp.tx - inp.lx) * 0.12;
      inp.ly += (inp.ty - inp.ly) * 0.12;
      camera.rotation.x = inp.lx;
      camera.rotation.y = inp.ly;

      const wStr = windStrength * (1 + Math.sin(t * 0.6) * 0.4);
      allBranches.forEach((br, idx) => {
        const off = br.userData.windOff;
        const hf = idx / allBranches.length;
        const str = wStr * (0.12 + hf * 0.08);
        const w1 = Math.sin(t * 1.6 + off) * str;
        const w2 = Math.cos(t * 1.3 + off * 1.2) * str * 0.6;
        br.rotation.z = w1 * 0.18;
        br.rotation.x = w2 * 0.1;
        
        br.children.forEach(ch => {
          if (ch.userData.windOff !== undefined) {
            const lw = Math.sin(t * 2.5 + ch.userData.windOff) * wStr * 0.08;
            ch.rotation.z += lw;
          }
        });
      });

      pests.forEach(p => {
        if (!p.userData.alive) return;
        p.userData.wiggle += dt * 6;

        if (p.userData.fleeing) {
          const age = Date.now() - p.userData.fleeStart;
          if (age > 1500) {
            p.userData.fleeing = false;
          } else {
            const spd = 0.4 * dt;
            p.position.x += p.userData.fleeDir.x * spd;
            p.position.z += p.userData.fleeDir.z * spd;
            p.rotation.x = Math.sin(p.userData.wiggle * 3) * 0.25;
          }
        } else if (!p.userData.dying) {
          const w = Math.sin(p.userData.wiggle) * 0.12;
          p.rotation.x = w;
          p.children.forEach((s, i) => {
            s.position.y = Math.sin(p.userData.wiggle + i * 0.6) * 0.004;
          });
        } else {
          p.userData.fallVel = (p.userData.fallVel || 0) + dt * 1.2;
          p.position.y -= p.userData.fallVel * dt * 3;
          p.rotation.x += (p.userData.spinVel || 2) * dt;
          p.scale.multiplyScalar(1 - dt * 0.8);
          if (p.position.y < 0 || p.scale.x < 0.12) {
            p.userData.alive = false;
            plantGroup.remove(p);
          }
        }
      });

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

          const rng = 3.0;
          const hits = [];
          
          pests.forEach(p => {
            if (!p.userData.alive || p.userData.dying) return;
            const wp = p.getWorldPosition(new THREE.Vector3());
            const { dist, prj } = rayDist(tmpN, tmpF, wp);
            if (prj > 0 && prj < rng && dist < 0.1) {
              p.userData.dying = true;
              p.userData.fallVel = 0.15;
              p.userData.spinVel = (Math.random() > 0.5 ? 1 : -1) * 2.5;
              if (onPestKilled) onPestKilled(pests.indexOf(p));
              hits.push(wp);
            }
          });

          if (hits.length > 0) {
            pests.forEach(p => {
              if (!p.userData.alive || p.userData.dying || p.userData.fleeing) return;
              const wp = p.getWorldPosition(new THREE.Vector3());
              hits.forEach(h => {
                const d = wp.distanceTo(h);
                if (d < 1.2 && d > 0.05) {
                  p.userData.fleeing = true;
                  p.userData.fleeStart = Date.now();
                  p.userData.fleeDir = new THREE.Vector3().subVectors(wp, h).normalize();
                }
              });
            });
          }
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