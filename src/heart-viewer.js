import * as THREE from 'three';
import { soundManager } from './sound-manager.js';

/**
 * 3D Anatomical Heart with:
 * - Dynamic Lub-Dub beating animation (systole/diastole)
 * - Enter-Inside internal cross-section mode
 * - 4 Internal chambers, moving valves & blood flow particle simulation
 * - Synchronization with audio synthesizer and EKG monitor
 */
export class HeartViewer {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'HeartMaster';
    this.heartGroup = new THREE.Group();
    this.internalGroup = new THREE.Group();
    this.valves = [];
    this.bloodParticles = null;
    this.isInsideMode = false;
    this.bpm = 72;
    this.time = 0;
    this.lastBeatTime = 0;

    this.buildExternalHeart();
    this.buildInternalChambers();
    this.buildBloodFlow();

    this.group.add(this.heartGroup);
    this.group.add(this.internalGroup);
    this.internalGroup.visible = false;
  }

  buildExternalHeart() {
    // Outer Ventricular Myocardium
    const ventGeo = new THREE.SphereGeometry(0.24, 32, 32);
    const ventPos = ventGeo.attributes.position;
    for (let i = 0; i < ventPos.count; i++) {
      let x = ventPos.getX(i);
      let y = ventPos.getY(i);
      let z = ventPos.getZ(i);

      // Apex taper (bottom point of heart tilted to the left)
      if (y < 0) {
        x *= 0.7 - y * 0.3;
        z *= 0.7 - y * 0.25;
        y *= 1.4;
      } else {
        // Broad muscular base
        x *= 1.15;
        z *= 1.1;
      }
      ventPos.setXYZ(i, x, y, z);
    }
    ventGeo.computeVertexNormals();

    const muscleMat = new THREE.MeshPhysicalMaterial({
      color: 0xbe123c,
      emissive: 0x881337,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.15,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15
    });

    this.ventricleMesh = new THREE.Mesh(ventGeo, muscleMat);
    this.ventricleMesh.name = 'heart_ventricles';
    this.heartGroup.add(this.ventricleMesh);

    // Left & Right Atria (Upper receiving chambers)
    const atriumGeo = new THREE.SphereGeometry(0.13, 24, 24);
    const atriumMat = new THREE.MeshPhysicalMaterial({
      color: 0x9f1239,
      emissive: 0x4c0519,
      emissiveIntensity: 0.3,
      roughness: 0.35,
      metalness: 0.1,
      clearcoat: 0.6
    });

    const leftAtrium = new THREE.Mesh(atriumGeo, atriumMat);
    leftAtrium.position.set(0.12, 0.18, -0.05);
    this.heartGroup.add(leftAtrium);

    const rightAtrium = new THREE.Mesh(atriumGeo, atriumMat);
    rightAtrium.position.set(-0.13, 0.17, 0.04);
    this.heartGroup.add(rightAtrium);

    // Aorta (الشريان الأورطي) - Elegant curving arch with branches
    const aortaPoints = [
      new THREE.Vector3(0.04, 0.12, 0.05),
      new THREE.Vector3(0.02, 0.26, 0.06),
      new THREE.Vector3(-0.06, 0.36, 0.02),
      new THREE.Vector3(-0.16, 0.34, -0.05),
      new THREE.Vector3(-0.18, 0.18, -0.12),
      new THREE.Vector3(-0.17, -0.05, -0.14)
    ];
    const aortaCurve = new THREE.CatmullRomCurve3(aortaPoints);
    const aortaGeo = new THREE.TubeGeometry(aortaCurve, 32, 0.055, 16, false);
    const aortaMat = new THREE.MeshPhysicalMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.2,
      clearcoat: 0.9
    });
    this.aortaMesh = new THREE.Mesh(aortaGeo, aortaMat);
    this.aortaMesh.name = 'aorta';
    this.heartGroup.add(this.aortaMesh);

    // 3 Brachiocephalic branches branching off aortic arch
    [-0.04, -0.08, -0.12].forEach((xOffset, idx) => {
      const branchGeo = new THREE.CylinderGeometry(0.015, 0.018, 0.12, 12);
      const branchMesh = new THREE.Mesh(branchGeo, aortaMat);
      branchMesh.position.set(xOffset, 0.41, 0.01 - idx * 0.03);
      branchMesh.rotation.z = -0.2 + idx * 0.15;
      this.heartGroup.add(branchMesh);
    });

    // Superior Vena Cava (الوريد الأجوف العلوي) - Blue venous vessel
    const svcCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.15, 0.4, 0.06),
      new THREE.Vector3(-0.14, 0.25, 0.07),
      new THREE.Vector3(-0.13, 0.15, 0.06)
    ]);
    const svcGeo = new THREE.TubeGeometry(svcCurve, 16, 0.045, 16, false);
    const venousMat = new THREE.MeshPhysicalMaterial({
      color: 0x2563eb,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.4,
      roughness: 0.25,
      clearcoat: 0.8
    });
    const svcMesh = new THREE.Mesh(svcGeo, venousMat);
    svcMesh.name = 'superior_vena_cava';
    this.heartGroup.add(svcMesh);

    // Pulmonary Artery (الشريان الرئوي)
    const paCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.01, 0.16, 0.14),
      new THREE.Vector3(0.0, 0.28, 0.12),
      new THREE.Vector3(0.08, 0.32, 0.02)
    ]);
    const paGeo = new THREE.TubeGeometry(paCurve, 16, 0.048, 16, false);
    const paMat = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      emissive: 0x1e40af,
      emissiveIntensity: 0.35,
      roughness: 0.3
    });
    const paMesh = new THREE.Mesh(paGeo, paMat);
    this.heartGroup.add(paMesh);

    // Coronary Arteries (الشرايين التاجية) - Fine network tracing the surface
    const coronaryPoints = [
      new THREE.Vector3(0.03, 0.12, 0.18),
      new THREE.Vector3(0.08, 0.0, 0.21),
      new THREE.Vector3(0.05, -0.15, 0.18),
      new THREE.Vector3(0.01, -0.28, 0.08)
    ];
    const coronaryCurve = new THREE.CatmullRomCurve3(coronaryPoints);
    const coronaryGeo = new THREE.TubeGeometry(coronaryCurve, 24, 0.012, 8, false);
    const coronaryMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.7
    });
    const coronaryMesh = new THREE.Mesh(coronaryGeo, coronaryMat);
    this.heartGroup.add(coronaryMesh);

    // Place entire heart in realistic thoracic anatomical position
    this.group.position.set(0.12, 0.68, 0.45);
    this.group.rotation.set(0.1, -0.15, -0.2);
  }

  // Build internal 3D chamber cross-section view for when user enters inside
  buildInternalChambers() {
    // 1. Cutaway cavity interior mesh (cross-section shell)
    const cutawayGeo = new THREE.SphereGeometry(0.24, 32, 32, 0, Math.PI * 1.3, 0, Math.PI);
    const cutawayMat = new THREE.MeshPhysicalMaterial({
      color: 0x991b1b,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.4
    });
    const cutawayMesh = new THREE.Mesh(cutawayGeo, cutawayMat);
    cutawayMesh.rotation.y = Math.PI * 0.35;
    this.internalGroup.add(cutawayMesh);

    // 2. Interventricular Septum (الحاجز البطيني العضلي)
    const septumGeo = new THREE.BoxGeometry(0.035, 0.36, 0.32);
    const septumMat = new THREE.MeshPhysicalMaterial({
      color: 0xb91c1c,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      roughness: 0.35
    });
    const septumMesh = new THREE.Mesh(septumGeo, septumMat);
    septumMesh.position.set(0.0, -0.05, 0.0);
    this.internalGroup.add(septumMesh);

    // 3. Dynamic Mitral & Aortic Valves (الصمامات التاجية والأبهرية المتحركة)
    const valveGeo = new THREE.ConeGeometry(0.065, 0.04, 16, 1, true);
    valveGeo.rotateX(Math.PI);
    const valveMat = new THREE.MeshPhysicalMaterial({
      color: 0xfef08a,
      emissive: 0xca8a04,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    const mitralValve = new THREE.Mesh(valveGeo, valveMat);
    mitralValve.position.set(0.08, 0.06, 0.04);
    mitralValve.userData = { initialScale: 1.0, type: 'mitral' };
    this.internalGroup.add(mitralValve);
    this.valves.push(mitralValve);

    const aorticValve = new THREE.Mesh(valveGeo, valveMat.clone());
    aorticValve.position.set(0.03, 0.14, 0.06);
    aorticValve.rotation.x = 0.3;
    aorticValve.userData = { initialScale: 1.0, type: 'aortic' };
    this.internalGroup.add(aorticValve);
    this.valves.push(aorticValve);

    // 4. Chamber 3D holographic labels
    this.addInternalChamberMarker('البطين الأيسر\nLeft Ventricle', 0.1, -0.08, 0.08, 0xef4444);
    this.addInternalChamberMarker('البطين الأيمن\nRight Ventricle', -0.1, -0.08, 0.08, 0x3b82f6);
    this.addInternalChamberMarker('الأذين الأيسر\nLeft Atrium', 0.11, 0.15, -0.02, 0xf43f5e);
    this.addInternalChamberMarker('الأذين الأيمن\nRight Atrium', -0.11, 0.15, 0.02, 0x60a5fa);
  }

  addInternalChamberMarker(text, x, y, z, color) {
    const sphereGeo = new THREE.SphereGeometry(0.02, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(x, y, z);
    this.internalGroup.add(sphere);
  }

  // 3D Blood flow particle system inside heart
  buildBloodFlow() {
    const particleCount = 70;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    this.bloodParticleData = [];

    for (let i = 0; i < particleCount; i++) {
      const isOxygenated = i % 2 === 0;
      const x = (Math.random() - 0.5) * 0.2;
      const y = (Math.random() - 0.5) * 0.3;
      const z = (Math.random() - 0.5) * 0.2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      if (isOxygenated) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.1;
        colors[i * 3 + 2] = 0.2;
      } else {
        colors[i * 3] = 0.2;
        colors[i * 3 + 1] = 0.45;
        colors[i * 3 + 2] = 1.0;
      }

      this.bloodParticleData.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: 0.05 + Math.random() * 0.1,
        vz: (Math.random() - 0.5) * 0.05,
        isOxygenated
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.bloodParticles = new THREE.Points(geo, mat);
    this.internalGroup.add(this.bloodParticles);
  }

  setInsideMode(isInside) {
    this.isInsideMode = isInside;
    if (isInside) {
      this.heartGroup.visible = false;
      this.internalGroup.visible = true;
    } else {
      this.heartGroup.visible = true;
      this.internalGroup.visible = false;
    }
  }

  update(time, delta) {
    this.time = time;
    const beatInterval = 60 / this.bpm;
    const cycleProgress = (time % beatInterval) / beatInterval;

    // Rhythmic biological Lub-Dub cardiac contraction curve:
    // S1 (Systole pulse 0.0 - 0.25) -> S2 (Dub rebound 0.25 - 0.45) -> Diastole (0.45 - 1.0)
    let pulseScale = 1.0;
    let twist = 0;
    let valveOpen = 0;

    if (cycleProgress < 0.2) {
      // First contraction (Lub - Powerful ventricular ejection)
      const t = cycleProgress / 0.2;
      const s = Math.sin(t * Math.PI);
      pulseScale = 1.0 + s * 0.14;
      twist = s * 0.08;
      valveOpen = s;
    } else if (cycleProgress < 0.4) {
      // Second bounce (Dub - Closure rebound)
      const t = (cycleProgress - 0.2) / 0.2;
      const s = Math.sin(t * Math.PI);
      pulseScale = 1.0 + s * 0.07;
      valveOpen = 1.0 - s * 0.8;
    } else {
      // Diastole relaxation
      pulseScale = 1.0;
      valveOpen = 0.1;
    }

    // Apply beating animation to external heart
    if (this.heartGroup.visible) {
      this.heartGroup.scale.set(pulseScale, pulseScale * 1.04, pulseScale);
      this.heartGroup.rotation.z = -0.2 + twist;

      // Arterial pulse expansion on Aorta
      if (this.aortaMesh) {
        const aortaPulse = 1.0 + Math.sin(cycleProgress * Math.PI * 2) * 0.06;
        this.aortaMesh.scale.set(aortaPulse, 1.0, aortaPulse);
      }
    }

    // Apply to internal chambers when viewing inside
    if (this.internalGroup.visible) {
      this.internalGroup.scale.set(pulseScale, pulseScale, pulseScale);

      // Animate heart valves opening and shutting
      this.valves.forEach((valve) => {
        const targetScale = 0.4 + valveOpen * 0.9;
        valve.scale.set(targetScale, 1.0, targetScale);
      });

      // Blood particles circulating
      if (this.bloodParticles) {
        const pos = this.bloodParticles.geometry.attributes.position.array;
        for (let i = 0; i < this.bloodParticleData.length; i++) {
          const p = this.bloodParticleData[i];
          pos[i * 3 + 1] += p.vy * delta * (1.0 + valveOpen * 2.5);

          if (pos[i * 3 + 1] > 0.22) {
            pos[i * 3 + 1] = -0.15;
            pos[i * 3] = (Math.random() - 0.5) * 0.18;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 0.18;
          }
        }
        this.bloodParticles.geometry.attributes.position.needsUpdate = true;
      }
    }
  }
}
