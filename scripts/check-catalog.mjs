import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Exercise the actual pure configuration modules without loading WebGL or models.
const cache = path.resolve('node_modules/.cache');
await fs.mkdir(cache, { recursive: true });
const output = await fs.mkdtemp(path.join(cache, 'container-catalog-'));
for (const name of ['layout','config','catalog','geometry','assets','interior','openings','optimize','model']) {
  const source = await fs.readFile(`src/studio/${name}.ts`, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  await fs.writeFile(path.join(output, `${name}.mjs`), compiled.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
}
const { CATALOG, catalogConfig, roomZones, configuredDesign, resizedCatalogLayout } = await import(pathToFileURL(path.join(output, 'catalog.mjs')));
const { DEFAULT_CONFIG, layoutDimensions, configReducer, entryForConfig } = await import(pathToFileURL(path.join(output, 'config.mjs')));
const { correctOverlaps, resolvePlacement, entryClearance, presetLayout, footprint } = await import(pathToFileURL(path.join(output, 'layout.mjs')));
const { facadeWindows } = await import(pathToFileURL(path.join(output, 'openings.mjs')));
const { buildContainer, updateDoorState } = await import(pathToFileURL(path.join(output, 'model.mjs')));
const texture = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1);
const assets = { paintTexture: () => texture, pbr: () => new THREE.MeshStandardMaterial({ color: '#bca88e' }) };
const start = performance.now();
assert.equal(CATALOG.length, 17);
for (const design of CATALOG) {
  const config = { ...DEFAULT_CONFIG, ...catalogConfig(design) };
  const bounds = layoutDimensions(config);
  assert.ok(Math.abs(bounds.length - design.length * .3048) < .001, design.name);
  assert.ok(Math.abs(bounds.width - design.width * .3048) < .001, design.name);
  const entry = entryForConfig(config);
  const placed = config.layout;
  for (const item of placed) assert.ok(resolvePlacement(item, placed, bounds.length, entry, bounds.width), design.name + ': preset needs manual furniture adjustment for ' + item.id);
  for (let floor = 0; floor < design.floors; floor++) {
    const items = placed.filter((item) => (item.floor ?? 0) === floor);
    const beds = roomZones(design, floor).filter((zone) => zone.name.includes('Bedroom') || zone.name === 'Sleeping alcove').length;
    assert.equal(items.filter((item) => item.kind === 'bed').length, beds, design.name + ': missing furnished bed');
    assert.ok(items.some((item) => item.kind === 'kitchenette'), design.name + ': missing fitted kitchen');
    if (design.use === 'Home') {
      assert.ok(items.some((item) => item.kind === 'sofa') && items.some((item) => item.kind === 'coffee-table') && items.some((item) => item.kind === 'tv-console'), design.name + ': incomplete lounge');
      assert.equal(items.filter((item) => item.kind === 'storage').length, beds, design.name + ': bedroom wardrobes missing');
    }
    if (design.use === 'Office') assert.equal(items.filter((item) => item.kind === 'chair').length >= items.filter((item) => item.kind === 'desk').length, true, design.name + ': desks need chairs');
  }
  for (const item of placed) assert.ok(resolvePlacement(item, placed, bounds.length, entry, bounds.width), `${design.name}: ${item.id} cannot fit`);
  for (let floor = 0; floor < design.floors; floor++) {
    assert.ok(placed.some((item) => item.kind === 'bathroom' && (item.floor ?? 0) === floor), `${design.name}: missing washroom on floor ${floor}`);
    for (const zone of roomZones(design, floor)) {
      assert.ok(Math.abs(zone.x) + zone.w / 2 <= bounds.length / 2 + .001, `${design.name}: zone outside length`);
      assert.ok(Math.abs(zone.z) + zone.d / 2 <= bounds.width / 2 + .001, `${design.name}: zone outside width`);
    }
  }
  for (const opening of facadeWindows(config, bounds.length)) {
    assert.ok(Math.abs(opening.x) + opening.width / 2 < bounds.length / 2, design.name + ': window outside shell');
    if (opening.side === config.doorSide) assert.ok(Math.abs(opening.x - entry.x) > (opening.width + entry.width) / 2, design.name + ': window overlaps doorway');
  }
  // Build both roof and cutaway states with procedural assets, catching geometry failures.
  for (const cutaway of [false, true]) {
    const model = buildContainer({ ...config, layout: placed, cutaway }, assets);
    const bounds3D = new THREE.Box3().setFromObject(model);
    assert.ok(Number.isFinite(bounds3D.min.x + bounds3D.max.y), `${design.name}: invalid 3D bounds`);
    const fittedInterior = model.getObjectByName('Interior layout');
    for (const group of fittedInterior.children.filter((object) => object.userData.layoutItemId)) {
      const item = placed.find((entry) => entry.id === group.userData.layoutItemId);
      const measured = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
      const expected = footprint(item);
      assert.ok(measured.x <= expected.width + .12 && measured.z <= expected.depth + .12, design.name + ': furniture geometry leaves its footprint: ' + item.kind);
      if (item.kind === 'bathroom') assert.ok(group.getObjectByName('Bathroom door') && group.getObjectByName('Bathroom rear wall'), design.name + ': washroom enclosure incomplete');
    }
    assert.ok(model.getObjectByName('Interior layout'), `${design.name}: missing editable interior`);
    model.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
  }
}
for (const [buildingType, preset] of [['foldout-home','foldout-home'], ['courtyard-l','l-courtyard-home'], ['retail-kiosk','coffee-kiosk']]) {
  for (const cutaway of [false, true]) {
    const setup = { ...DEFAULT_CONFIG, buildingType, cutaway, size: buildingType === 'retail-kiosk' ? 20 : 40, widthFt: 8, doorPositionFt: buildingType === 'courtyard-l' ? -2.5 / .3048 : 0, layout: [] };
    const dims = layoutDimensions(setup);
    setup.layout = presetLayout(preset, dims.length, dims.width);
    for (const item of setup.layout) assert.ok(resolvePlacement(item, setup.layout, dims.length, entryForConfig(setup), dims.width), preset + ': furniture collides before editing: ' + item.id);
    const model = buildContainer(setup, assets);
    assert.ok(Number.isFinite(new THREE.Box3().setFromObject(model).max.y), preset + ': invalid assembly');
    if (buildingType === 'foldout-home') {
      assert.equal(setup.layout.filter((item) => item.kind === 'bed').length, 2, 'Family fold-out needs two furnished bedrooms');
      let sideWalls = 0; model.traverse((object) => { if (object.name.startsWith('container-side-wall')) sideWalls++; });
      assert.equal(sideWalls, 2, 'Expanded fold-out must have only its two exterior side walls');
    }
  }
}
const packed = buildContainer({ ...DEFAULT_CONFIG, buildingType: 'foldout-home', foldoutState: 'transport', layout: [] }, assets);
assert.ok(!packed.getObjectByName('Interior layout'), 'Packed modules should not show deployed furniture');

// Door actions must preserve the existing geometry and furniture allocation.
for (const doorStyle of ['personnel','sliding','vinyl','none']) {
  const setup = { ...DEFAULT_CONFIG, doorStyle, cutaway: false, layout: doorStyle === 'none' ? [] : DEFAULT_CONFIG.layout };
  const model = buildContainer(setup, assets);
  const identities = [];
  const moving = [];
  model.traverse((object) => { if (object.isMesh) identities.push(object.geometry.uuid); if (object.userData.doorMotion) moving.push(object); });
  assert.ok(moving.length, doorStyle + ': door motion was lost during batching');
  for (const open of [true, false]) {
    updateDoorState(model, { ...setup, cargoOpen: open, sideDoorOpen: open });
    for (const object of moving) {
      const motion = object.userData.doorMotion;
      assert.equal(motion.property === 'rotationY' ? object.rotation.y : object.position.x, open ? motion.open : motion.closed);
    }
    const current = []; model.traverse((object) => { if (object.isMesh) current.push(object.geometry.uuid); });
    assert.deepEqual(current, identities, 'Opening a door must not rebuild model geometry');
  }
}

const family = { ...DEFAULT_CONFIG, ...catalogConfig(CATALOG.find((design) => design.id === 'family')) };
const resized = resizedCatalogLayout(family, { lengthFt: 45, widthFt: 16 });
assert.ok(resized, 'A larger family layout should regenerate complete rooms');
assert.equal(configuredDesign({ ...family, ...resized }).length, 45);
assert.equal(configuredDesign({ ...family, ...resized }).width, 16);
assert.equal(resized.layout.filter((item) => item.kind === 'bed').length, 2);
assert.equal(resizedCatalogLayout(family, { widthFt: 8 }), null, 'A narrow shell must not silently drop the lounge');
const bath = { id: 'bath', kind: 'bathroom', x: 0, z: 0, rotation: 90, width: 1.8, depth: 1.2 };
const foldout = configReducer({ ...DEFAULT_CONFIG, ...catalogConfig(CATALOG.find((design) => design.id === 'garden')) }, { buildingType: 'foldout-home', catalogId: undefined });
assert.equal(foldout.widthFt, 8);
assert.ok(Math.abs(layoutDimensions(foldout).width - 7.314) < .001);
assert.ok(resolvePlacement(bath, [], 6, undefined, 3.6));
assert.equal(resolvePlacement({ ...bath, width: 4 }, [], 6, undefined, 3.6), null);
texture.dispose();
console.log(`17 furnished catalog layouts, both floors, fixture bounds, facade openings and 45 3D assemblies including allocation-free door actions passed in ${(performance.now() - start).toFixed(0)} ms.`);
// output is a fresh, uniquely created directory owned by this process.
await fs.rm(output, { recursive: true });
