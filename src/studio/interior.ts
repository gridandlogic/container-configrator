import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LayoutItem, catalogItem } from "./layout";
import { StudioAssets } from "./assets";
import type { StudioConfig } from "./config";
import { CATALOG, roomZones } from "./catalog";

/** Lightweight built-ins shared by the plan and 3D studio. Dimensions are metres. */
export function buildInterior(layout: LayoutItem[], floorY: number, config?: StudioConfig) {
  const root = new THREE.Group();
  root.name = "Interior layout";
  if (!layout.length) return root;
  const material = (color: string, roughness = 0.8, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const timber = material("#b5916f");
  const timberDark = material("#856b55");
  const upholstery = material("#b8bbb3", 0.94);
  const cushion = material("#d2d1c9", 0.96);
  const white = material("#eeeae2");
  const porcelain = material("#fafaf7", 0.25);
  const metal = material(config?.washroom?.fixtures === "black" ? "#24292a" : "#858c89", 0.32, 0.62);
  const glass = new THREE.MeshPhysicalMaterial({ color: "#cde6e7", roughness: 0.08, metalness: 0, transmission: 0.82, transparent: true, opacity: 0.52, thickness: 0.008, side: THREE.DoubleSide });
  const dark = material("#2e3737", 0.62);
  const floorTile = material(config?.washroom?.tile ?? "#d5d6d1", 0.72);
  const featureTile = material(config?.washroom?.tile ?? "#57666a", 0.48, 0.06);
  const warmLight = new THREE.MeshStandardMaterial({ color: "#fff0cf", emissive: "#ffd89b", emissiveIntensity: 1.2, roughness: 0.35 });

  const box = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, floorY + y, z);
    mesh.castShadow = h > 0.15;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const leg = (group: THREE.Group, x: number, z: number, height: number, mat = timberDark) => box(group, 0.045, height, 0.045, x, height / 2, z, mat);
  const rounded = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, radius = 0.04) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 4, h / 4, d / 4)), mat);
    mesh.position.set(x, floorY + y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cylinder = (group: THREE.Group, radius: number, height: number, x: number, y: number, z: number, mat: THREE.Material, scaleZ = 1) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), mat);
    mesh.position.set(x, floorY + y, z);
    mesh.scale.z = scaleZ;
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const table = (group: THREE.Group, width: number, depth: number, height: number, mat = timber) => {
    box(group, width, 0.055, depth, 0, height, 0, mat);
    for (const x of [-width / 2 + 0.09, width / 2 - 0.09]) for (const z of [-depth / 2 + 0.08, depth / 2 - 0.08]) leg(group, x, z, height - 0.03);
  };

  const design = CATALOG.find((design) => design.id === config?.catalogId);
  if (design && design.id !== "courtyard") {
    const zones = roomZones(design, config?.activeFloor ?? 0);
    const halfLength = design.length * .3048 / 2;
    for (const zone of zones.filter((zone) => zone.name.includes("Bedroom"))) {
      const x = zone.x < 0 ? zone.x + zone.w / 2 : zone.x - zone.w / 2;
      if (Math.abs(x) >= halfLength - .05) continue;
      const doorway = .85;
      const wall = zone.d - doorway - .22;
      box(root, .085, 2.2, wall, x, 1.1, zone.z - (doorway + .22) / 2, white);
      box(root, .085, .18, doorway, x, 2.11, zone.z + zone.d / 2 - doorway / 2 - .11, white);
    }
  }
  for (const item of layout.filter((item) => (item.floor ?? 0) === (config?.activeFloor ?? 0))) {
    const group = new THREE.Group();
    group.name = `${item.kind}-${item.id}`;
    group.userData.layoutItemId = item.id;
    group.position.set(item.x, 0, item.z);
    group.rotation.y = item.rotation * Math.PI / 180;
    if (item.width || item.depth) { const original = catalogItem(item.kind); group.scale.set((item.width ?? original.width) / original.width, 1, (item.depth ?? original.depth) / original.depth); }
    root.add(group);
    switch (item.kind) {
      case "bathroom": {
        box(group, 1.55, 0.025, 2.18, 0, 0.018, 0, floorTile);
        const partitionX = item.x < 0 ? 0.74 : -0.74;
        box(group, 0.08, 2.2, 0.79, partitionX, 1.1, -0.695, white);
        box(group, 0.08, 2.2, 0.59, partitionX, 1.1, 0.795, white);
        box(group, 0.08, 0.14, 0.8, partitionX, 2.13, 0.1, white);
        const bathDoor = box(group, .045, 1.96, .72, partitionX, .99, .08, timber);
        if (config?.washroom?.door === "hinged") { bathDoor.rotation.y = -.8; bathDoor.position.x += .26; }
        else { bathDoor.position.z -= .46; }
        box(group, .08, .11, .025, partitionX + .035, 1.03, .27, metal);
        // Full-height tile, walk-in shower and clear return glass.
        box(group, 1.42, 2.08, 0.035, 0, 1.05, -1.055, featureTile);
        for (let x = -0.66; x <= 0.66; x += 0.22) box(group, 0.008, 2.02, 0.008, x, 1.05, -1.078, metal);
        for (let y = 0.22; y <= 1.94; y += 0.22) box(group, 1.35, 0.008, 0.008, 0, y, -1.078, metal);
        const showerParts = group.children.length;
        rounded(group, 0.72, 0.065, 0.78, -0.32, 0.07, -0.64, porcelain, 0.025);
        box(group, 0.025, 1.65, 0.78, 0.05, 0.91, -0.64, glass);
        box(group, 0.025, 1.65, 0.46, 0.4, 0.91, -0.79, glass);
        box(group, 0.035, 0.8, 0.035, -0.59, 1.42, -0.88, metal);
        cylinder(group, 0.11, 0.035, -0.59, 1.82, -0.88, metal, 0.35).rotation.z = Math.PI / 2;
        for (const x of [-0.48, -0.35, -0.22, -0.09]) box(group, 0.01, 0.72, 0.01, x, 1.39, -0.88, glass);
        if (config?.washroom?.shower === false) group.children.slice(showerParts).forEach((part) => { part.visible = false; });
        const wcStart = group.children.length;
        // Rounded wall-hung toilet, vanity, vessel basin and illuminated mirror.
        rounded(group, 0.4, 0.32, 0.5, -0.22, 0.24, 0.35, porcelain, 0.11);
        const bowl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 10, 28), porcelain);
        bowl.rotation.x = Math.PI / 2;
        bowl.scale.z = 1.35;
        bowl.position.set(-0.22, floorY + 0.42, 0.34);
        bowl.castShadow = true;
        group.add(bowl);
        if (config?.washroom?.toilet === "squat") {
          group.children.slice(wcStart).forEach((part) => { part.visible = false; });
          rounded(group, .44, .045, .62, -.22, .055, .35, porcelain, .07);
          rounded(group, .18, .008, .34, -.22, .081, .35, dark, .06);
          for (const x of [-.39, -.05]) rounded(group, .10, .03, .35, x, .09, .35, floorTile, .03);
        }
        box(group, 0.32, 0.49, 0.24, -0.55, 0.3, 0.87, timber);
        box(group, 0.33, 0.04, 0.26, -0.55, 0.57, 0.87, porcelain);
        cylinder(group, 0.11, 0.055, -0.55, 0.61, 0.87, porcelain, 0.72);
        box(group, 0.022, 0.22, 0.022, -0.55, 0.75, 0.96, metal);
        box(group, 0.16, 0.022, 0.022, -0.48, 0.85, 0.96, metal);
        rounded(group, 0.42, 0.68, 0.025, -0.55, 1.18, 1.04, glass, 0.12);
        box(group, 0.45, 0.035, 0.035, -0.55, 0.82, 1.025, warmLight);
        for (const y of [0.85, 1.08, 1.31]) box(group, 0.34, 0.022, 0.035, 0.47, y, 1.02, metal);
        rounded(group, 0.62, 0.018, 0.38, 0.28, 0.03, 0.48, material("#b9a991", 0.95), 0.08);
        break;
      }
      case "kitchenette": {
        box(group, 1.55, 0.83, 0.56, 0, 0.415, 0, white);
        box(group, 1.58, 0.055, 0.6, 0, 0.855, 0, timber);
        for (const x of [-0.48, 0, 0.48]) box(group, 0.012, 0.72, 0.015, x, 0.42, 0.29, timberDark);
        box(group, 0.42, 0.018, 0.35, -0.42, 0.889, 0.01, metal);
        box(group, 0.025, 0.22, 0.025, -0.42, 1.01, -0.12, metal);
        for (const x of [0.28, 0.53]) {
          const hob = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.008, 18), dark);
          hob.position.set(x, floorY + 0.89, 0);
          group.add(hob);
        }
        break;
      }
      case "partition": {
        const wallLength = item.wallLength ?? 2.12;
        box(group, 0.09, 2.14, wallLength, 0, 1.07, 0, white);
        box(group, 0.11, 0.09, wallLength, 0, 0.05, 0, timberDark);
        break;
      }
      case "sofa": {
        box(group, 1.62, 0.28, 0.78, 0, 0.28, 0, upholstery);
        box(group, 1.54, 0.14, 0.6, 0, 0.48, -0.04, cushion);
        box(group, 1.62, 0.63, 0.15, 0, 0.57, 0.31, upholstery);
        for (const x of [-0.73, 0.73]) box(group, 0.16, 0.45, 0.72, x, 0.43, 0, upholstery);
        for (const x of [-0.65, 0.65]) leg(group, x, -0.24, 0.13, dark);
        break;
      }
      case "coffee-table": table(group, 0.72, 0.48, 0.36); break;
      case "dining-table": table(group, 1.05, 0.68, 0.73); break;
      case "desk": table(group, 1.2, 0.58, 0.74, timberDark); break;
      case "chair": {
        box(group, 0.5, 0.06, 0.5, 0, 0.47, 0, timber);
        box(group, 0.5, 0.47, 0.06, 0, 0.7, 0.22, timber);
        for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) leg(group, x, z, 0.45);
        break;
      }
      case "bed": {
        rounded(group, 1.9, 0.25, 1.38, 0, 0.23, 0, timberDark, 0.06);
        rounded(group, 1.84, 0.2, 1.32, 0, 0.46, -0.02, cushion, 0.08);
        rounded(group, 1.82, 0.11, 1.0, 0, 0.59, -0.12, material("#d9d7cf", 0.98), 0.05);
        rounded(group, 1.86, 0.83, 0.09, 0, 0.54, 0.64, upholstery, 0.035);
        for (const x of [-0.46, 0.46]) rounded(group, 0.58, 0.11, 0.34, x, 0.68, 0.38, white, 0.07);
        rounded(group, 0.52, 0.08, 0.24, 0, 0.7, 0.32, material("#a98969", 0.94), 0.06);
        for (const x of [-0.78, 0.78]) {
          rounded(group, 0.25, 0.32, 0.28, x, 0.18, 0.48, timber, 0.025);
          box(group, 0.035, 0.32, 0.035, x, 0.48, 0.48, metal);
          cylinder(group, 0.11, 0.12, x, 0.69, 0.48, warmLight, 0.8);
        }
        rounded(group, 1.05, 0.3, 0.32, 0, 0.17, -0.63, upholstery, 0.045);
        break;
      }
      case "storage": {
        box(group, 0.95, 1.8, 0.45, 0, 0.9, 0, timber);
        box(group, 0.015, 1.65, 0.02, 0, 0.91, 0.235, timberDark);
        for (const x of [-0.12, 0.12]) box(group, 0.018, 0.13, 0.028, x, 1.05, 0.25, metal);
        break;
      }
    }
  }
  return root;
}

/** Replace the lightweight plan placeholders with the bundled detailed models. */
export async function upgradeInteriorAssets(
  root: THREE.Group,
  layout: LayoutItem[],
  floorY: number,
  assets: StudioAssets,
  isCurrent: () => boolean,
  onAdded: () => void,
) {
  const models: Record<string, string> = {
    sofa: "sofa",
    "coffee-table": "coffeeTable",
    "dining-table": "diningTable",
    chair: "chair",
    desk: "desk",
    storage: "storage",
  };

  await Promise.all(layout.map(async (item) => {
    const key = models[item.kind];
    if (!key) return;
    const placeholder = root.getObjectByName(`${item.kind}-${item.id}`) as THREE.Group | undefined;
    if (!placeholder?.parent) return;
    try {
      const model = await assets.interiorModel(key);
      if (!isCurrent()) return;
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const measure = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(measure.x * measure.y * measure.z) || Math.min(measure.x, measure.y, measure.z) < 0.001) {
        throw new Error(`Invalid bounds for ${item.kind}`);
      }
      const { width, depth } = catalogItem(item.kind);
      const direct = Math.min(width / measure.x, depth / measure.z);
      const turned = Math.min(width / measure.z, depth / measure.x);
      if (turned > direct * 1.05) {
        model.rotation.y += Math.PI / 2;
        model.updateMatrixWorld(true);
        bounds.setFromObject(model);
        bounds.getSize(measure);
      }
      const scale = Math.min(width / measure.x, depth / measure.z);
      model.scale.multiplyScalar(scale);
      model.updateMatrixWorld(true);
      bounds.setFromObject(model);
      const targetHeight = item.kind === "coffee-table" ? 0.36 : item.kind === "desk" ? 0.74 : null;
      if (targetHeight) {
        model.scale.y *= targetHeight / bounds.getSize(new THREE.Vector3()).y;
        model.updateMatrixWorld(true);
        bounds.setFromObject(model);
      }
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y += floorY - bounds.min.y;
      model.updateMatrixWorld(true);

      const replacement = new THREE.Group();
      replacement.name = `detailed-${item.kind}-${item.id}`;
      replacement.userData.layoutItemId = item.id;
      replacement.position.copy(placeholder.position);
      replacement.rotation.copy(placeholder.rotation);
      replacement.add(model);
      placeholder.parent.add(replacement);
      placeholder.visible = false;
      onAdded();
    } catch (error) {
      if (isCurrent()) throw new Error(`Could not prepare the ${catalogItem(item.kind).label.toLowerCase()} model.`, { cause: error });
    }
  }));
}
