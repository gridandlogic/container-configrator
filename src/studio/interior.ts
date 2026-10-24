import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { LayoutItem, catalogItem } from "./layout";
import { disposeTree, StudioAssets } from "./assets";
import type { StudioConfig } from "./config";
import { configuredDesign, roomZones } from "./catalog";

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
  const glass = new THREE.MeshStandardMaterial({ color: "#b9d5d6", roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const dark = material("#2e3737", 0.62);
  const floorTile = material(config?.washroom?.tile ?? "#d5d6d1", 0.72);
  const featureTile = material(config?.washroom?.tile ?? "#57666a", 0.48, 0.06);
  const warmLight = new THREE.MeshStandardMaterial({ color: "#fff0cf", emissive: "#ffd89b", emissiveIntensity: 1.2, roughness: 0.35 });

  const geometryCache = new Map<string, THREE.BufferGeometry>();
  const geometry = (key: string, make: () => THREE.BufferGeometry) => {
    if (!geometryCache.has(key)) geometryCache.set(key, make());
    return geometryCache.get(key)!;
  };
  const box = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const shape = geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
    const mesh = new THREE.Mesh(shape, mat);
    mesh.position.set(x, floorY + y, z);
    mesh.castShadow = h > 0.15;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const leg = (group: THREE.Group, x: number, z: number, height: number, mat = timberDark) => box(group, 0.045, height, 0.045, x, height / 2, z, mat);
  const rounded = (group: THREE.Group, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, radius = 0.04) => {
    const mesh = new THREE.Mesh(geometry(`rounded:${w}:${h}:${d}:${radius}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4))), mat);
    mesh.position.set(x, floorY + y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const cylinder = (group: THREE.Group, radius: number, height: number, x: number, y: number, z: number, mat: THREE.Material, scaleZ = 1) => {
    const mesh = new THREE.Mesh(geometry(`cylinder:${radius}:${height}`, () => new THREE.CylinderGeometry(radius, radius, height, 16)), mat);
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

  const design = (config ? configuredDesign(config) : undefined);
  if (design) {
    const zones = roomZones(design, config?.activeFloor ?? 0);
    const halfLength = design.length * .3048 / 2;
    for (const zone of zones.filter((zone) => zone.name.includes("Bedroom"))) {
      const x = zone.x < 0 ? zone.x + zone.w / 2 : zone.x - zone.w / 2;
      if (Math.abs(x) >= halfLength - .05) continue;
      if (design.id === "courtyard" && zone.name !== "Bedroom 3") continue;
      const doorway = .84, height = 2.4;
      const wall = zone.d - doorway - .2;
      box(root, .09, height, wall, x, height / 2, zone.z - (doorway + .2) / 2, white).name = "Bedroom partition";
      const doorZ = zone.z + zone.d / 2 - doorway / 2 - .2;
      box(root, .09, height, .2, x, height / 2, zone.z + zone.d / 2 - .1, white);
      box(root, .09, .28, doorway, x, height - .14, doorZ, white);
      for (const z of [doorZ - doorway / 2, doorZ + doorway / 2]) box(root, .13, 2.14, .055, x, 1.07, z, timberDark);
      // A pocket door stays on the partition, clear of the bedroom walkway.
      box(root, .045, 2.07, doorway - .06, x + .065, 1.035, doorZ - doorway * .66, timber).name = "Bedroom pocket door";
      box(root, .025, .14, .025, x + .095, 1.0, doorZ - doorway * .2, metal);
    }
  }
  if (config?.buildingType === "foldout-home" && config.foldoutState === "expanded") {
    const endX = (config.lengthFt ? config.lengthFt * .3048 : config.size === 20 ? 6.058 : 12.192) / 2 - .12;
    const bedroomX = Math.min(2.55, endX - 2.1), frontZ = 3.53, backZ = 1.26;
    for (const sign of [-1, 1]) {
      box(root, endX - bedroomX, 2.4, .085, sign * (endX + bedroomX) / 2, 1.2, backZ, white).name = "Fold-out bedroom rear partition";
      box(root, .085, 2.4, frontZ - 2.2, sign * bedroomX, 1.2, (frontZ + 2.2) / 2, white);
      box(root, .085, .3, .86, sign * bedroomX, 2.25, 1.77, white);
      box(root, .085, 2.4, .08, sign * bedroomX, 1.2, 1.30, white);
      box(root, .035, 2.05, .79, sign * (bedroomX + .06), 1.025, 2.48, timber).name = "Fold-out bedroom pocket door";
    }
    const kitchen = layout.find((item) => item.kind === "kitchenette");
    if (kitchen) box(root, 1.65, 2.3, .08, kitchen.x, 1.15, kitchen.z - .31, white).name = "Kitchen service wall";
  }
  for (const item of layout.filter((item) => (item.floor ?? 0) === (config?.activeFloor ?? 0))) {
    const group = new THREE.Group();
    group.name = `${item.kind}-${item.id}`;
    group.userData.layoutItemId = item.id;
    group.position.set(item.x, 0, item.z);
    group.rotation.y = item.rotation * Math.PI / 180;
    if (item.kind !== "bathroom" && (item.width || item.depth)) { const original = catalogItem(item.kind); group.scale.set((item.width ?? original.width) / original.width, 1, (item.depth ?? original.depth) / original.depth); }
    root.add(group);
    switch (item.kind) {
      case "bathroom": {
        const w = item.width ?? 1.55, d = item.depth ?? 2.18, h = 2.35;
        const doorWall = item.entryWall ?? (item.x < 0 ? "right" : "left");
        const doorWidth = Math.min(.76, (doorWall === "front" ? w : d) - .25);
        const wall = (width: number, depth: number, x: number, z: number, name: string) => {
          const part = box(group, width, h, depth, x, h / 2, z, white); part.name = name;
          box(group, width + .01, .10, depth + .01, x, .06, z, floorTile);
        };
        box(group, w, .025, d, 0, .018, 0, floorTile);
        wall(w, .075, 0, -d / 2 + .038, "Bathroom rear wall");
        for (const side of [-1, 1]) {
          if ((side < 0 && doorWall === "left") || (side > 0 && doorWall === "right")) continue;
          wall(.075, d - .075, side * (w / 2 - .038), .038, "Bathroom side wall");
        }
        if (doorWall !== "front") wall(w, .075, 0, d / 2 - .038, "Bathroom front wall");
        const alongX = doorWall === "front";
        const span = alongX ? w : d;
        const remainder = (span - doorWidth) / 2;
        const doorX = alongX ? 0 : (doorWall === "left" ? -1 : 1) * (w / 2 - .038);
        const doorZ = alongX ? d / 2 - .038 : 0;
        for (const sign of [-1, 1]) {
          wall(alongX ? remainder : .075, alongX ? .075 : remainder,
            alongX ? sign * (doorWidth + remainder) / 2 : doorX,
            alongX ? doorZ : sign * (doorWidth + remainder) / 2, "Bathroom door jamb wall");
          box(group, alongX ? .045 : .11, 2.08, alongX ? .11 : .045,
            doorX + (alongX ? sign * doorWidth / 2 : 0), 1.04,
            doorZ + (alongX ? 0 : sign * doorWidth / 2), timberDark);
        }
        box(group, alongX ? doorWidth : .075, h - 2.1, alongX ? .075 : doorWidth, doorX, 2.1 + (h - 2.1) / 2, doorZ, white);
        const slider = config?.washroom?.door !== "hinged";
        if (slider) box(group, alongX ? doorWidth + .1 : .04, .04, alongX ? .04 : doorWidth + .1, doorX, 2.09, doorZ, metal);
        const leaf = box(group, alongX ? doorWidth - .04 : .035, 2.02, alongX ? .035 : doorWidth - .04,
          doorX + (alongX ? 0 : .045), 1.01,
          doorZ + (alongX ? -.045 : 0), timber);
        leaf.name = "Bathroom door";
        // Closed hinged leaves and parked sliding leaves both keep the public walkway clear.
        box(group, .025, .14, .025, leaf.position.x + (alongX ? -.24 : .025), 1.0, leaf.position.z + (alongX ? -.025 : -.24), metal);
        const shower = config?.washroom?.shower !== false && d >= 1.55;
        const rearZ = -d / 2 + .30;
        const tileHeight = box(group, w - .15, 2.10, .018, 0, 1.08, -d / 2 + .082, featureTile);
        tileHeight.name = "Bathroom tiled wall";
        if (shower) {
          const sw = Math.min(.78, w - .18), sd = Math.min(.77, d * .44);
          const sx = -w / 2 + .09 + sw / 2, sz = -d / 2 + .09 + sd / 2;
          rounded(group, sw, .045, sd, sx, .055, sz, porcelain, .025).name = "Shower tray";
          box(group, .018, 1.84, sd, sx + sw / 2, .99, sz, glass);
          box(group, sw * .47, 1.84, .018, sx - sw * .265, .99, sz + sd / 2, glass);
          box(group, .025, 1.0, .025, sx, 1.32, -d / 2 + .12, metal);
          cylinder(group, .10, .025, sx, 1.85, -d / 2 + .24, metal);
          box(group, .025, .025, .18, sx, 1.84, -d / 2 + .18, metal);
          cylinder(group, .04, .009, sx, .082, sz, metal);
        }
        const wcX = shower ? Math.min(w / 2 - .29, .42) : -w / 2 + .35;
        const wcZ = shower ? d / 2 - .56 : rearZ + .10;
        if (config?.washroom?.toilet === "squat") {
          rounded(group, .43, .045, .61, wcX, .055, wcZ, porcelain, .06);
          rounded(group, .16, .008, .32, wcX, .082, wcZ, dark, .05);
          for (const x of [wcX - .17, wcX + .17]) rounded(group, .10, .025, .33, x, .09, wcZ, floorTile, .02);
        } else {
          rounded(group, .34, .33, .48, wcX, .22, wcZ, porcelain, .10);
          const seat = new THREE.Mesh(new THREE.TorusGeometry(.155, .032, 8, 24), porcelain);
          seat.rotation.x = -Math.PI / 2; seat.scale.y = 1.35;
          seat.position.set(wcX, floorY + .42, wcZ + .025); group.add(seat);
          rounded(group, .34, .36, .14, wcX, .55, wcZ - .22, porcelain, .035);
          box(group, .055, .012, .035, wcX, .738, wcZ - .22, metal);
        }
        const vanityX = shower ? w / 2 - .27 : w / 2 - .33;
        const vanityZ = shower ? -d / 2 + .36 : rearZ;
        rounded(group, .40, .56, .39, vanityX, .42, vanityZ, timber, .025);
        rounded(group, .42, .045, .41, vanityX, .72, vanityZ, porcelain, .025);
        cylinder(group, .14, .035, vanityX, .76, vanityZ + .02, porcelain, .78);
        box(group, .022, .20, .022, vanityX, .86, vanityZ - .11, metal);
        box(group, .022, .022, .13, vanityX, .95, vanityZ - .05, metal);
        rounded(group, .42, .68, .02, vanityX, 1.34, -d / 2 + .105, glass, .07);
        box(group, .40, .025, .035, vanityX, 1.70, -d / 2 + .12, warmLight);
        break;
      }
      case "kitchenette": {
        rounded(group, 1.53, .79, .54, 0, .415, 0, timber, .015);
        box(group, 1.55, .045, .56, 0, .835, 0, porcelain);
        box(group, 1.53, .08, .03, 0, .09, -.25, dark);
        // Cabinet fronts face +Z; place the rear against the wall.
        for (const x of [-.51, 0, .51]) {
          box(group, .49, .68, .025, x, .44, .279, white);
          box(group, .14, .018, .028, x, .69, .30, metal);
        }
        box(group, .42, .012, .34, -.43, .866, 0, metal);
        rounded(group, .31, .008, .25, -.43, .872, 0, dark, .055);
        box(group, .023, .22, .023, -.43, .97, -.13, metal);
        box(group, .023, .023, .16, -.43, 1.07, -.06, metal);
        box(group, .43, .012, .39, .43, .866, 0, dark);
        for (const x of [.31, .55]) for (const z of [-.1,.1]) cylinder(group, .068, .009, x, .88, z, metal);
        box(group, .47, .67, .028, 0, .44, .301, metal);
        box(group, .025, .20, .025, .17, .57, .323, dark);
        box(group, .41, .36, .028, .51, .39, .301, dark);
        box(group, .32, .025, .035, .51, .62, .32, metal);
        box(group, 1.53, .55, .018, 0, 1.12, -.271, floorTile);
        for (const x of [-.5,0,.5]) {
          box(group, .48, .49, .27, x, 1.65, -.12, white);
          box(group, .13, .014, .025, x, 1.46, .025, metal);
        }
        box(group, 1.45, .015, .02, 0, 1.39, -.05, warmLight);
        break;
      }
      case "partition": {
        const wallLength = item.wallLength ?? 2.12;
        box(group, 0.09, 2.14, wallLength, 0, 1.07, 0, white);
        box(group, 0.11, 0.09, wallLength, 0, 0.05, 0, timberDark);
        break;
      }
      case "sofa": {
        rounded(group, 1.60, .26, .76, 0, .28, 0, upholstery, .07);
        for (const x of [-.36,.36]) rounded(group, .69, .16, .57, x, .47, -.035, cushion, .065);
        rounded(group, 1.54, .53, .17, 0, .61, .285, upholstery, .06);
        for (const x of [-.73,.73]) rounded(group, .14, .40, .73, x, .45, 0, upholstery, .055);
        for (const x of [-.63,.63]) for (const z of [-.25,.25]) leg(group, x, z, .15, dark);
        for (const x of [-.48,.48]) {
          const pillow = rounded(group, .30, .30, .10, x, .66, .15, material(x < 0 ? "#b88962" : "#8c9b8b"), .055);
          pillow.rotation.x = -.17;
        }
        break;
      }
      case "coffee-table": table(group, 0.72, 0.48, 0.36); break;
      case "dining-table": table(group, 1.05, 0.68, 0.73); break;
      case "desk": {
        table(group, 1.2, .58, .74, timber);
        box(group, .43, .28, .025, 0, 1.04, .13, dark);
        box(group, .025, .12, .025, 0, .84, .13, metal);
        box(group, .24, .015, .14, 0, .78, .10, metal);
        box(group, .34, .018, .12, 0, .78, -.13, dark);
        box(group, .075, .018, .10, .27, .78, -.13, dark);
        box(group, .14, .025, .21, -.43, .79, -.06, white);
        break;
      }
      case "chair": {
        rounded(group, .48, .09, .48, 0, .46, 0, upholstery, .035);
        rounded(group, .47, .40, .07, 0, .69, .21, upholstery, .04);
        for (const x of [-.19,.19]) for (const z of [-.18,.18]) leg(group, x, z, .42, metal);
        break;
      }
      case "bed": {
        rounded(group, 1.44, .24, 2.0, 0, .25, 0, timberDark, .04);
        rounded(group, 1.39, .21, 1.93, 0, .47, .015, cushion, .07);
        rounded(group, 1.37, .10, 1.39, 0, .615, .27, white, .05);
        rounded(group, 1.44, .94, .075, 0, .54, -.97, upholstery, .03);
        for (const x of [-.35,.35]) rounded(group, .55, .12, .36, x, .63, -.64, white, .055);
        rounded(group, 1.38, .025, .43, 0, .679, .66, material("#9bafa0", .97), .025);
        for (const x of [-.54,.54]) for (const z of [-.8,.8]) leg(group, x, z, .15, dark);
        break;
      }
      case "nightstand": {
        rounded(group, .37, .44, .37, 0, .24, 0, timber, .025);
        box(group, .30, .016, .018, 0, .28, .19, timberDark);
        cylinder(group, .07, .025, 0, .48, 0, metal);
        cylinder(group, .018, .22, 0, .59, 0, metal);
        cylinder(group, .13, .15, 0, .77, 0, warmLight);
        break;
      }
      case "tv-console": {
        rounded(group, 1.18, .39, .31, 0, .27, 0, timber, .02);
        for (const x of [-.39,0,.39]) box(group, .012, .30, .01, x, .27, .16, timberDark);
        rounded(group, 1.08, .63, .035, 0, 1.0, -.015, dark, .02);
        box(group, 1.02, .57, .009, 0, 1.0, -.038, material("#263c43", .25, .1));
        for (const x of [-.32,.32]) box(group, .025, .16, .08, x, .59, -.01, metal);
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
      if (!isCurrent()) { disposeTree(model); return; }
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const measure = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(measure.x * measure.y * measure.z) || Math.min(measure.x, measure.y, measure.z) < 0.001) {
        throw new Error(`Invalid bounds for ${item.kind}`);
      }
      const original = catalogItem(item.kind);
      const width = item.width ?? original.width, depth = item.depth ?? original.depth;
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
