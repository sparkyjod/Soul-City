import * as THREE from 'three';

class MaterialLibrary {
  public textures: Record<string, THREE.CanvasTexture> = {};
  public materials: Record<string, THREE.Material> = {};

  constructor() {
    this.initProceduralTextures();
    this.initSharedMaterials();
  }

  private createSignTexture(text: string, bgColor: string, textColor: string, subtext?: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 256);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Glowing border
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 236);

    // Main text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, subtext ? 105 : 128);

    if (subtext) {
      ctx.font = '22px sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.globalAlpha = 0.9;
      ctx.fillText(subtext, 256, 175);
      ctx.globalAlpha = 1.0;
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createBlackboardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#173829';
    ctx.fillRect(0, 0, 512, 256);

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 500, 244);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Class 10 - Physics & Mathematics', 28, 45);
    ctx.font = '19px monospace';
    ctx.fillText('1. E = mc²   |   F = ma   |   v = u + at', 28, 90);
    ctx.fillText('2. sin²θ + cos²θ = 1   |   (a+b)² = a² + 2ab + b²', 28, 135);
    ctx.fillText('Homework: Chapter 6 Problems 1-12', 28, 180);
    ctx.fillStyle = '#facc15';
    ctx.fillText('★ RECESS BELL AT 11:00 AM ★', 28, 225);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createArcadeScreenTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#090918';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2.5;
    for (let y = 80; y < 256; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEON RACER', 128, 55);

    ctx.fillStyle = '#facc15';
    ctx.font = '16px monospace';
    ctx.fillText('HI-SCORE: 99,840', 128, 90);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('READY PLAYER 1', 128, 220);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createCrosswalkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = '#f8fafc';
    for (let x = 16; x < 256; x += 48) {
      ctx.fillRect(x, 10, 28, 236);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private createPavingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  private createCheckerboardTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillRect(64, 64, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }

  private createParquetTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillRect(64, 32, 64, 32);
    ctx.fillRect(0, 64, 64, 32);
    ctx.fillRect(64, 96, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    return tex;
  }

  private initProceduralTextures() {
    this.textures.schoolSign = this.createSignTexture('NORTHWOOD HIGH', '#1e3a8a', '#ffffff', 'Excellence • Friendship • Knowledge');
    this.textures.canteenSign = this.createSignTexture('CAMPUS CANTEEN', '#ea580c', '#ffffff', 'Fresh Chai, Samosas & Patties');
    this.textures.cafeSign = this.createSignTexture('THE CENTRAL BEAN', '#78350f', '#fef3c7', 'Artisanal Coffee & Bakes');
    this.textures.mallSign = this.createSignTexture('GALAXY MALL', '#831843', '#fce7f3', 'Fashion • Cinema • Food Court');
    this.textures.arcadeSign = this.createSignTexture('PIXEL PULSE ARCADE', '#312e81', '#38bdf8', 'Retro Games & Rhythm Beat');
    this.textures.blackboard = this.createBlackboardTexture();
    this.textures.arcadeScreen = this.createArcadeScreenTexture();
    this.textures.crosswalk = this.createCrosswalkTexture();
    this.textures.paving = this.createPavingTexture();
    this.textures.checkerboard = this.createCheckerboardTexture();
    this.textures.parquet = this.createParquetTexture();
  }

  private initSharedMaterials() {
    // Terrain & Surfaces
    this.materials.grass = new THREE.MeshStandardMaterial({
      color: 0x4d9435,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.materials.parkGrass = new THREE.MeshStandardMaterial({
      color: 0x3e7d2b,
      roughness: 0.92,
      metalness: 0.05,
    });

    this.materials.asphalt = new THREE.MeshStandardMaterial({
      color: 0x242d38,
      roughness: 0.88,
      metalness: 0.1,
    });

    this.materials.crosswalkMat = new THREE.MeshStandardMaterial({
      map: this.textures.crosswalk,
      roughness: 0.8,
    });

    this.materials.sidewalk = new THREE.MeshStandardMaterial({
      map: this.textures.paving,
      roughness: 0.75,
      metalness: 0.05,
    });

    this.materials.sand = new THREE.MeshStandardMaterial({
      color: 0xf6d186,
      roughness: 0.95,
      metalness: 0.0,
    });

    this.materials.water = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.82,
    });

    this.materials.boardwalkWood = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.7,
      metalness: 0.05,
    });

    // Interior Flooring
    this.materials.canteenFloor = new THREE.MeshStandardMaterial({
      map: this.textures.checkerboard,
      roughness: 0.35,
    });

    this.materials.cafeParquet = new THREE.MeshStandardMaterial({
      map: this.textures.parquet,
      roughness: 0.5,
    });

    this.materials.mallFloor = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.2,
      metalness: 0.1,
    });

    // Architecture Materials
    this.materials.schoolBrick = new THREE.MeshStandardMaterial({
      color: 0x993529,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.materials.schoolInteriorWall = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
      metalness: 0.0,
    });

    this.materials.schoolLocker = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.35,
      metalness: 0.6,
    });

    this.materials.deskWood = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.65,
      metalness: 0.05,
    });

    this.materials.metalLegs = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.35,
      metalness: 0.85,
    });

    this.materials.glass = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      transparent: true,
      opacity: 0.42,
      roughness: 0.1,
      metalness: 0.1,
    });

    this.materials.windowLit = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    this.materials.roofTile = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
      metalness: 0.1,
    });

    this.materials.foliage = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.materials.foliageAutumn = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.materials.trunk = new THREE.MeshStandardMaterial({
      color: 0x543216,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.materials.neonPink = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 0.8,
    });

    this.materials.neonCyan = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.8,
    });

    // Special Signs
    this.materials.schoolSignMat = new THREE.MeshBasicMaterial({ map: this.textures.schoolSign });
    this.materials.canteenSignMat = new THREE.MeshBasicMaterial({ map: this.textures.canteenSign });
    this.materials.cafeSignMat = new THREE.MeshBasicMaterial({ map: this.textures.cafeSign });
    this.materials.mallSignMat = new THREE.MeshBasicMaterial({ map: this.textures.mallSign });
    this.materials.arcadeSignMat = new THREE.MeshBasicMaterial({ map: this.textures.arcadeSign });
    this.materials.blackboardMat = new THREE.MeshBasicMaterial({ map: this.textures.blackboard });
    this.materials.arcadeScreenMat = new THREE.MeshBasicMaterial({ map: this.textures.arcadeScreen });
  }

  public get(name: string): THREE.Material {
    return this.materials[name] || this.materials.sidewalk;
  }
}

export const materialLibrary = new MaterialLibrary();
