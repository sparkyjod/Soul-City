import * as THREE from 'three';
import { CharacterId, CharacterProfile } from '../types/game';

export interface CharacterMeshHandle {
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  head: THREE.Group;
  torso: THREE.Mesh;
  nameBadge: THREE.Sprite;
  currentAnim: 'idle' | 'walking' | 'sitting' | 'talking';
  animTime: number;
  profile: CharacterProfile;
  setAnimation: (anim: 'idle' | 'walking' | 'sitting' | 'talking') => void;
  update: (delta: number) => void;
}

export class CharacterBuilder {
  // Shared static geometries & materials to avoid per-character duplicate memory allocations
  private static torsoGeo = new THREE.BoxGeometry(0.52, 0.65, 0.32);
  private static headGeo = new THREE.BoxGeometry(0.36, 0.4, 0.36);
  private static eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
  private static eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  private static armGeo = (() => {
    const g = new THREE.BoxGeometry(0.14, 0.55, 0.16);
    g.translate(0, -0.25, 0);
    return g;
  })();
  private static legGeo = (() => {
    const g = new THREE.BoxGeometry(0.18, 0.72, 0.2);
    g.translate(0, -0.36, 0);
    return g;
  })();
  private static shoeGeo = new THREE.BoxGeometry(0.2, 0.12, 0.28);

  public static createCharacter(profile: CharacterProfile): CharacterMeshHandle {
    const root = new THREE.Group();
    const app = profile.appearance;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: app.skinTone, roughness: 0.7 });
    const hairMat = new THREE.MeshStandardMaterial({ color: app.hairColor, roughness: 0.85 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: app.shirtColor, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: app.pantsColor, roughness: 0.7 });
    const shoesMat = new THREE.MeshStandardMaterial({ color: app.shoesColor, roughness: 0.5 });

    // 1. Torso / Shirt
    const torso = new THREE.Mesh(CharacterBuilder.torsoGeo, shirtMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    root.add(torso);

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.55, 0);

    const headMesh = new THREE.Mesh(CharacterBuilder.headGeo, skinMat);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Eyes
    const leftEye = new THREE.Mesh(CharacterBuilder.eyeGeo, CharacterBuilder.eyeMat);
    leftEye.position.set(-0.09, 0.05, 0.185);
    const rightEye = new THREE.Mesh(CharacterBuilder.eyeGeo, CharacterBuilder.eyeMat);
    rightEye.position.set(0.09, 0.05, 0.185);
    headGroup.add(leftEye, rightEye);

    // Hair Styling based on hairStyle
    const hair = this.buildHair(app.hairStyle, hairMat);
    headGroup.add(hair);

    // Accessory (Glasses / Cap / Headband)
    if (app.accessory === 'glasses') {
      const glassesMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const rimGeo = new THREE.BoxGeometry(0.34, 0.1, 0.04);
      const rims = new THREE.Mesh(rimGeo, glassesMat);
      rims.position.set(0, 0.05, 0.19);
      headGroup.add(rims);
    } else if (app.accessory === 'cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
      const crownGeo = new THREE.BoxGeometry(0.4, 0.14, 0.4);
      const crown = new THREE.Mesh(crownGeo, capMat);
      crown.position.set(0, 0.22, 0);
      headGroup.add(crown);
      const visorGeo = new THREE.BoxGeometry(0.36, 0.03, 0.2);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 0.18, 0.24);
      headGroup.add(visor);
    } else if (app.accessory === 'headband') {
      const hbMat = new THREE.MeshStandardMaterial({ color: 0xf472b6 });
      const hbGeo = new THREE.BoxGeometry(0.38, 0.08, 0.38);
      const hb = new THREE.Mesh(hbGeo, hbMat);
      hb.position.set(0, 0.14, 0);
      headGroup.add(hb);
    }

    root.add(headGroup);

    // 3. Limbs (Arms)
    const leftArm = new THREE.Mesh(CharacterBuilder.armGeo, shirtMat);
    leftArm.position.set(-0.35, 1.35, 0);
    leftArm.castShadow = true;
    root.add(leftArm);

    const rightArm = new THREE.Mesh(CharacterBuilder.armGeo, shirtMat);
    rightArm.position.set(0.35, 1.35, 0);
    rightArm.castShadow = true;
    root.add(rightArm);

    // 4. Limbs (Legs)
    const leftLeg = new THREE.Mesh(CharacterBuilder.legGeo, pantsMat);
    leftLeg.position.set(-0.14, 0.72, 0);
    leftLeg.castShadow = true;
    root.add(leftLeg);

    const rightLeg = new THREE.Mesh(CharacterBuilder.legGeo, pantsMat);
    rightLeg.position.set(0.14, 0.72, 0);
    rightLeg.castShadow = true;
    root.add(rightLeg);

    // Shoes
    const leftShoe = new THREE.Mesh(CharacterBuilder.shoeGeo, shoesMat);
    leftShoe.position.set(0, -0.7, 0.04);
    leftLeg.add(leftShoe);

    const rightShoe = new THREE.Mesh(CharacterBuilder.shoeGeo, shoesMat);
    rightShoe.position.set(0, -0.7, 0.04);
    rightLeg.add(rightShoe);

    // Scale character based on defined height
    root.scale.set(app.height / 1.75, app.height / 1.75, app.height / 1.75);

    // Overhead Name Sprite Badge
    const nameBadge = this.createNameplate(profile.name, profile.gender);
    nameBadge.position.set(0, 2.1, 0);
    root.add(nameBadge);

    // State handle
    const handle: CharacterMeshHandle = {
      root,
      leftLeg,
      rightLeg,
      leftArm,
      rightArm,
      head: headGroup,
      torso,
      nameBadge,
      currentAnim: 'idle',
      animTime: 0,
      profile,
      setAnimation(anim) {
        this.currentAnim = anim;
      },
      update(delta) {
        this.animTime += delta;
        const t = this.animTime;

        if (this.currentAnim === 'walking') {
          const walkSpeed = 9;
          this.leftLeg.rotation.x = Math.sin(t * walkSpeed) * 0.6;
          this.rightLeg.rotation.x = -Math.sin(t * walkSpeed) * 0.6;
          this.leftArm.rotation.x = -Math.sin(t * walkSpeed) * 0.5;
          this.rightArm.rotation.x = Math.sin(t * walkSpeed) * 0.5;
          this.torso.position.y = 1.05 + Math.abs(Math.sin(t * walkSpeed)) * 0.04;
          this.head.position.y = 1.55 + Math.abs(Math.sin(t * walkSpeed)) * 0.04;
        } else if (this.currentAnim === 'sitting') {
          this.leftLeg.rotation.x = -Math.PI / 2;
          this.rightLeg.rotation.x = -Math.PI / 2;
          this.leftArm.rotation.x = -0.4;
          this.rightArm.rotation.x = -0.4;
          this.torso.position.y = 0.72;
          this.head.position.y = 1.22;
        } else if (this.currentAnim === 'talking') {
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftArm.rotation.x = Math.sin(t * 3) * 0.2 - 0.2;
          this.rightArm.rotation.x = -Math.sin(t * 3) * 0.4 - 0.3;
          this.head.rotation.y = Math.sin(t * 2.5) * 0.15;
          this.torso.position.y = 1.05;
        } else {
          // Idle breathing
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftArm.rotation.x = Math.sin(t * 2) * 0.05;
          this.rightArm.rotation.x = -Math.sin(t * 2) * 0.05;
          this.head.rotation.y = Math.sin(t * 1.2) * 0.04;
          this.torso.position.y = 1.05 + Math.sin(t * 2) * 0.015;
          this.head.position.y = 1.55 + Math.sin(t * 2) * 0.015;
        }
      },
    };

    return handle;
  }

  private static buildHair(style: string, hairMat: THREE.Material): THREE.Group {
    const hair = new THREE.Group();
    if (style === 'messy_crop') {
      const topGeo = new THREE.BoxGeometry(0.4, 0.14, 0.4);
      const top = new THREE.Mesh(topGeo, hairMat);
      top.position.set(0, 0.22, 0);
      hair.add(top);
      const tuftGeo = new THREE.ConeGeometry(0.1, 0.16, 4);
      tuftGeo.rotateZ(0.2);
      const tuft = new THREE.Mesh(tuftGeo, hairMat);
      tuft.position.set(-0.06, 0.3, 0.12);
      hair.add(tuft);
    } else if (style === 'wavy_long' || style === 'straight_long') {
      const topGeo = new THREE.BoxGeometry(0.42, 0.16, 0.42);
      const top = new THREE.Mesh(topGeo, hairMat);
      top.position.set(0, 0.2, 0);
      hair.add(top);
      // Flowing hair strands down the back & shoulders
      const strandGeo = new THREE.BoxGeometry(0.42, 0.55, 0.15);
      const backStrand = new THREE.Mesh(strandGeo, hairMat);
      backStrand.position.set(0, -0.1, -0.18);
      hair.add(backStrand);
      const sideGeo = new THREE.BoxGeometry(0.12, 0.45, 0.3);
      const leftS = new THREE.Mesh(sideGeo, hairMat);
      leftS.position.set(-0.2, -0.05, 0);
      const rightS = new THREE.Mesh(sideGeo, hairMat);
      rightS.position.set(0.2, -0.05, 0);
      hair.add(leftS, rightS);
    } else if (style === 'curly_bob') {
      const bobGeo = new THREE.SphereGeometry(0.28, 8, 8);
      bobGeo.scale(1.2, 0.9, 1.2);
      const bob = new THREE.Mesh(bobGeo, hairMat);
      bob.position.set(0, 0.16, -0.04);
      hair.add(bob);
    } else {
      // Slick fade
      const slickGeo = new THREE.BoxGeometry(0.38, 0.12, 0.38);
      const slick = new THREE.Mesh(slickGeo, hairMat);
      slick.position.set(0, 0.21, -0.02);
      hair.add(slick);
    }
    return hair;
  }

  private static createNameplate(name: string, gender: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    // Pill background
    ctx.fillStyle = gender === 'female' ? 'rgba(236, 72, 153, 0.85)' : 'rgba(37, 99, 235, 0.85)';
    ctx.roundRect(10, 15, 236, 66, 33);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.roundRect(10, 15, 236, 66, 33);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.5, 0.55, 1);
    return sprite;
  }
}
