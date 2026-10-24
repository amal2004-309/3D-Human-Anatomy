import * as THREE from 'three';

/**
 * Handcrafted 3D Digestive System Model
 * Fully modeled procedural 3D anatomy for:
 * - Esophagus (المريء)
 * - Stomach (المعدة)
 * - Liver & Gallbladder (الكبد والمرارة)
 * - Pancreas (البنكرياس)
 * - Duodenum & Small Intestine (الأمعاء الدقيقة)
 * - Large Intestine with Haustra & Appendix (القولون والأمعاء الغليظة)
 */
export class DigestiveSystemBuilder {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'DigestiveSystem';
    this.organs = {};
    this.particles = null;
    this.pathCurve = null;
    this.build();
  }

  build() {
    this.buildEsophagus();
    this.buildStomach();
    this.buildLiver();
    this.buildPancreas();
    this.buildSmallIntestine();
    this.buildLargeIntestine();
    this.buildDigestivePathSimulation();
  }

  // 1. Esophagus (المريء)
  buildEsophagus() {
    const points = [
      new THREE.Vector3(0.0, 1.6, 0.15),
      new THREE.Vector3(0.01, 1.35, 0.18),
      new THREE.Vector3(0.04, 1.05, 0.22),
      new THREE.Vector3(0.12, 0.65, 0.28),
      new THREE.Vector3(0.18, 0.45, 0.35)
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 32, 0.045, 16, false);

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.1,
      clearcoat: 0.5,
      transparent: true,
      opacity: 0.92
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'organ_digestive_esophagus';
    mesh.userData = { id: 'digestive_esophagus', titleAr: 'المريء' };
    this.group.add(mesh);
    this.organs.esophagus = mesh;
  }

  // 2. Stomach (المعدة) - Realistic J-Shape
  buildStomach() {
    const stomachGroup = new THREE.Group();
    stomachGroup.name = 'organ_digestive_stomach';
    stomachGroup.userData = { id: 'digestive_stomach', titleAr: 'المعدة' };

    // Stomach body using sculpted deformed sphere
    const bodyGeo = new THREE.SphereGeometry(0.24, 32, 32);
    // Sculpt to J-shape via vertex transformation
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Elongate and bend
      if (y < 0) {
        x += Math.sin(y * 4) * 0.12;
        z -= Math.cos(y * 4) * 0.05;
      }
      // Fundus bulge at top left
      if (y > 0 && x > 0) {
        x *= 1.25;
        y *= 1.15;
      }
      pos.setXYZ(i, x * 1.3, y * 1.6, z * 0.9);
    }
    bodyGeo.computeVertexNormals();

    const stomachMat = new THREE.MeshPhysicalMaterial({
      color: 0xe04c1e,
      emissive: 0x991b1b,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.1,
      transmission: 0.2, // Subtle flesh translucency
      thickness: 0.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2
    });

    const bodyMesh = new THREE.Mesh(bodyGeo, stomachMat);
    bodyMesh.position.set(0.22, 0.25, 0.42);
    bodyMesh.rotation.set(0.1, 0.2, -0.25);
    stomachGroup.add(bodyMesh);

    // Duodenal junction (بوابة المعدة إلى الاثني عشر)
    const pylorusCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.05, 0.42),
      new THREE.Vector3(0.12, 0.02, 0.44),
      new THREE.Vector3(0.04, 0.03, 0.42)
    ]);
    const pylorusGeo = new THREE.TubeGeometry(pylorusCurve, 16, 0.04, 12, false);
    const pylorusMesh = new THREE.Mesh(pylorusGeo, stomachMat);
    stomachGroup.add(pylorusMesh);

    this.group.add(stomachGroup);
    this.organs.stomach = stomachGroup;
  }

  // 3. Liver & Gallbladder (الكبد والمرارة)
  buildLiver() {
    const liverGroup = new THREE.Group();
    liverGroup.name = 'organ_digestive_liver';
    liverGroup.userData = { id: 'digestive_liver', titleAr: 'الكبد والمرارة' };

    // Anatomical wedge liver
    const liverGeo = new THREE.SphereGeometry(0.34, 32, 28);
    const pos = liverGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Wedge flattening & right lobe dominance
      if (x > 0) x *= 0.6; // Left lobe smaller
      if (x < 0) x *= 1.35; // Right lobe large
      if (z < 0) z *= 0.55; // Flattened posterior side
      if (y < 0) y *= 0.7;

      pos.setXYZ(i, x * 1.3, y * 0.95, z * 0.9);
    }
    liverGeo.computeVertexNormals();

    const liverMat = new THREE.MeshPhysicalMaterial({
      color: 0x933118,
      emissive: 0x581c0c,
      emissiveIntensity: 0.2,
      roughness: 0.35,
      metalness: 0.15,
      clearcoat: 0.7
    });

    const liverMesh = new THREE.Mesh(liverGeo, liverMat);
    liverMesh.position.set(-0.28, 0.38, 0.42);
    liverMesh.rotation.set(-0.2, 0.1, 0.15);
    liverGroup.add(liverMesh);

    // Gallbladder (المرارة) - emerald pear-shaped sac under right lobe
    const gallGeo = new THREE.SphereGeometry(0.07, 16, 16);
    gallGeo.scale(0.8, 1.5, 0.8);
    const gallMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x047857,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.8
    });
    const gallMesh = new THREE.Mesh(gallGeo, gallMat);
    gallMesh.position.set(-0.18, 0.22, 0.5);
    gallMesh.rotation.set(0.4, 0, -0.3);
    liverGroup.add(gallMesh);

    this.group.add(liverGroup);
    this.organs.liver = liverGroup;
  }

  // 4. Pancreas (البنكرياس)
  buildPancreas() {
    const pancGroup = new THREE.Group();
    pancGroup.name = 'organ_digestive_pancreas';
    pancGroup.userData = { id: 'digestive_pancreas', titleAr: 'البنكرياس' };

    // Elongated tapering gland behind stomach
    const pancCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 0.1, 0.32), // Head nestled in duodenum
      new THREE.Vector3(0.14, 0.13, 0.28), // Neck/Body
      new THREE.Vector3(0.26, 0.16, 0.24), // Tail pointing towards spleen
      new THREE.Vector3(0.34, 0.2, 0.2)
    ]);
    const pancGeo = new THREE.TubeGeometry(pancCurve, 24, 0.055, 16, false);

    const pancMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.3,
      roughness: 0.45,
      metalness: 0.1,
      clearcoat: 0.4
    });

    const pancMesh = new THREE.Mesh(pancGeo, pancMat);
    pancGroup.add(pancMesh);

    this.group.add(pancGroup);
    this.organs.pancreas = pancGroup;
  }

  // 5. Small Intestine (الأمعاء الدقيقة) - Complex Coiled loops
  buildSmallIntestine() {
    const siGroup = new THREE.Group();
    siGroup.name = 'organ_digestive_small_intestine';
    siGroup.userData = { id: 'digestive_small_intestine', titleAr: 'الأمعاء الدقيقة' };

    const loops = [];
    const numPoints = 80;
    for (let i = 0; i < numPoints; i++) {
      const t = i / numPoints;
      const angle = t * Math.PI * 14;
      const r = 0.18 * (0.8 + 0.3 * Math.sin(t * 10));
      const x = Math.sin(angle) * r + 0.05 * Math.sin(t * 8);
      const y = -0.05 - t * 0.32 + 0.04 * Math.cos(angle * 2);
      const z = 0.38 + 0.08 * Math.sin(angle * 3);
      loops.push(new THREE.Vector3(x, y, z));
    }
    const siCurve = new THREE.CatmullRomCurve3(loops);
    const siGeo = new THREE.TubeGeometry(siCurve, 120, 0.038, 12, false);

    const siMat = new THREE.MeshPhysicalMaterial({
      color: 0xf97316,
      emissive: 0xc2410c,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.5
    });

    const siMesh = new THREE.Mesh(siGeo, siMat);
    siGroup.add(siMesh);

    this.group.add(siGroup);
    this.organs.smallIntestine = siGroup;
  }

  // 6. Large Intestine & Colon with Haustra (الأمعاء الغليظة والقولون والزائدة الدودية)
  buildLargeIntestine() {
    const liGroup = new THREE.Group();
    liGroup.name = 'organ_digestive_large_intestine';
    liGroup.userData = { id: 'digestive_large_intestine', titleAr: 'الأمعاء الغليظة' };

    // Outer framing path of the colon
    const colonPoints = [
      // Cecum (الأعور) - lower right quadrant
      new THREE.Vector3(-0.25, -0.42, 0.36),
      // Ascending colon (القولون الصاعد)
      new THREE.Vector3(-0.26, -0.22, 0.35),
      new THREE.Vector3(-0.25, 0.02, 0.35),
      // Hepatic flexure (الانثناء الكبدي)
      new THREE.Vector3(-0.2, 0.15, 0.38),
      // Transverse colon (القولون المستعرض)
      new THREE.Vector3(0.0, 0.12, 0.43),
      new THREE.Vector3(0.2, 0.14, 0.4),
      // Splenic flexure (الانثناء الطحالي)
      new THREE.Vector3(0.28, 0.1, 0.35),
      // Descending colon (القولون الهابط)
      new THREE.Vector3(0.28, -0.15, 0.34),
      new THREE.Vector3(0.26, -0.35, 0.35),
      // Sigmoid colon (القولون السيني)
      new THREE.Vector3(0.15, -0.44, 0.34),
      new THREE.Vector3(0.05, -0.48, 0.32),
      // Rectum (المستقيم)
      new THREE.Vector3(0.0, -0.55, 0.28)
    ];

    const colonCurve = new THREE.CatmullRomCurve3(colonPoints);
    const colonGeo = new THREE.TubeGeometry(colonCurve, 80, 0.065, 16, false);

    const colonMat = new THREE.MeshPhysicalMaterial({
      color: 0x10b981,
      emissive: 0x065f46,
      emissiveIntensity: 0.25,
      roughness: 0.38,
      metalness: 0.1,
      clearcoat: 0.5
    });

    const colonMesh = new THREE.Mesh(colonGeo, colonMat);
    liGroup.add(colonMesh);

    // Appendix (الزائدة الدودية) - tiny vermiform tail on cecum
    const appPoints = [
      new THREE.Vector3(-0.25, -0.42, 0.36),
      new THREE.Vector3(-0.29, -0.48, 0.35),
      new THREE.Vector3(-0.27, -0.52, 0.33)
    ];
    const appCurve = new THREE.CatmullRomCurve3(appPoints);
    const appGeo = new THREE.TubeGeometry(appCurve, 12, 0.018, 10, false);
    const appMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4
    });
    const appMesh = new THREE.Mesh(appGeo, appMat);
    appMesh.name = 'appendix';
    liGroup.add(appMesh);

    this.group.add(liGroup);
    this.organs.largeIntestine = liGroup;
  }

  // Visual flow simulation of food/chyme passing through digestive tract
  buildDigestivePathSimulation() {
    const fullPathPoints = [
      new THREE.Vector3(0.0, 1.6, 0.15),
      new THREE.Vector3(0.01, 1.35, 0.18),
      new THREE.Vector3(0.04, 1.05, 0.22),
      new THREE.Vector3(0.12, 0.65, 0.28),
      new THREE.Vector3(0.22, 0.25, 0.42),
      new THREE.Vector3(0.04, 0.03, 0.42),
      new THREE.Vector3(0.0, -0.22, 0.42),
      new THREE.Vector3(-0.25, -0.42, 0.36),
      new THREE.Vector3(-0.25, 0.02, 0.35),
      new THREE.Vector3(0.0, 0.12, 0.43),
      new THREE.Vector3(0.28, -0.15, 0.34),
      new THREE.Vector3(0.0, -0.55, 0.28)
    ];

    this.pathCurve = new THREE.CatmullRomCurve3(fullPathPoints);

    // Flowing glowing bioluminescent particles
    const particleCount = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const progress = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      progress[i] = i / particleCount;
      const pt = this.pathCurve.getPointAt(progress[i]);
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = pt.y;
      positions[i * 3 + 2] = pt.z;

      // Golden digestive glow
      colors[i * 3] = 0.98;
      colors[i * 3 + 1] = 0.75;
      colors[i * 3 + 2] = 0.18;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.userData = { progress };
    this.group.add(this.particles);
  }

  update(time, delta) {
    // 1. Stomach peristalsis gentle breathing animation
    if (this.organs.stomach) {
      const stomachPulse = 1.0 + Math.sin(time * 2.2) * 0.035;
      this.organs.stomach.scale.set(stomachPulse, stomachPulse, stomachPulse);
    }

    // 2. Advance digestive particles along path
    if (this.particles && this.pathCurve) {
      const positions = this.particles.geometry.attributes.position.array;
      const progress = this.particles.userData.progress;
      const count = progress.length;

      for (let i = 0; i < count; i++) {
        progress[i] = (progress[i] + delta * 0.12) % 1.0;
        const pt = this.pathCurve.getPointAt(progress[i]);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  highlightOrgan(organId) {
    Object.values(this.organs).forEach((mesh) => {
      if (mesh.isMesh) {
        mesh.material.emissiveIntensity = 0.25;
      } else if (mesh.isGroup) {
        mesh.traverse((child) => {
          if (child.isMesh && child.material.emissiveIntensity) {
            child.material.emissiveIntensity = 0.25;
          }
        });
      }
    });

    const target = this.organs[organId.replace('digestive_', '')];
    if (target) {
      if (target.isMesh) {
        target.material.emissiveIntensity = 0.85;
      } else if (target.isGroup) {
        target.traverse((child) => {
          if (child.isMesh && child.material.emissiveIntensity) {
            child.material.emissiveIntensity = 0.85;
          }
        });
      }
    }
  }
}
