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
for (const name of ['layout','config','catalog','geometry','interior','model']) {
  const source = await fs.readFile(`src/studio/${name}.ts`, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  await fs.writeFile(path.join(output, `${name}.mjs`), compiled.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
}
const { CATALOG, catalogConfig, roomZones } = await import(pathToFileURL(path.join(output, 'catalog.mjs')));
const { DEFAULT_CONFIG, layoutDimensions, configReducer } = await import(pathToFileURL(path.join(output, 'config.mjs')));
const { correctOverlaps, resolvePlacement, entryClearance } = await import(pathToFileURL(path.join(output, 'layout.mjs')));
const { buildContainer } = await import(pathToFileURL(path.join(output, 'model.mjs')));
const texture = new THREE.DataTexture(new Uint8Array([255,255,255,255]), 1, 1);
const assets = { paintTexture: () => texture, pbr: () => new THREE.MeshStandardMaterial({ color: '#bca88e' }) };
const start = performance.now();
assert.equal(CATALOG.length, 17);
for (const design of CATALOG) {
  const config = { ...DEFAULT_CONFIG, ...catalogConfig(design) };
  const bounds = layoutDimensions(config);
  assert.ok(Math.abs(bounds.length - design.length * .3048) < .001, design.name);
  assert.ok(Math.abs(bounds.width - design.width * .3048) < .001, design.name);
  const entry = entryClearance(config.doorStyle, config.doorSide, bounds.length, bounds.width, config.doorPositionFt);
  const placed = correctOverlaps(config.layout, bounds.length, entry, bounds.width);
  for (const item of placed) assert.ok(resolvePlacement(item, placed, bounds.length, entry, bounds.width), `${design.name}: ${item.id} cannot fit`);
  for (let floor = 0; floor < design.floors; floor++) {
    assert.ok(placed.some((item) => item.kind === 'bathroom' && (item.floor ?? 0) === floor), `${design.name}: missing washroom on floor ${floor}`);
    for (const zone of roomZones(design, floor)) {
      assert.ok(Math.abs(zone.x) + zone.w / 2 <= bounds.length / 2 + .001, `${design.name}: zone outside length`);
      assert.ok(Math.abs(zone.z) + zone.d / 2 <= bounds.width / 2 + .001, `${design.name}: zone outside width`);
    }
  }
  // Build both roof and cutaway states with procedural assets, catching geometry failures.
  for (const cutaway of [false, true]) {
    const model = buildContainer({ ...config, layout: placed, cutaway }, assets);
    const bounds3D = new THREE.Box3().setFromObject(model);
    assert.ok(Number.isFinite(bounds3D.min.x + bounds3D.max.y), `${design.name}: invalid 3D bounds`);
    assert.ok(model.getObjectByName('Interior layout'), `${design.name}: missing editable interior`);
    model.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
  }
}
const bath = { id: 'bath', kind: 'bathroom', x: 0, z: 0, rotation: 90, width: 1.8, depth: 1.2 };
const foldout = configReducer({ ...DEFAULT_CONFIG, ...catalogConfig(CATALOG.find((design) => design.id === 'garden')) }, { buildingType: 'foldout-home', catalogId: undefined });
assert.equal(foldout.widthFt, 8);
assert.ok(Math.abs(layoutDimensions(foldout).width - 7.314) < .001);
assert.ok(resolvePlacement(bath, [], 6, undefined, 3.6));
assert.equal(resolvePlacement({ ...bath, width: 4 }, [], 6, undefined, 3.6), null);
texture.dispose();
console.log(`17 catalog layouts, both floors, washroom bounds and 34 3D assemblies passed in ${(performance.now() - start).toFixed(0)} ms.`);
// output is a fresh, uniquely created directory owned by this process.
await fs.rm(output, { recursive: true });
