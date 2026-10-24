import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as THREE from 'three';
import ts from 'typescript';

const cache = path.resolve('node_modules/.cache');
await fs.mkdir(cache, { recursive: true });
const output = await fs.mkdtemp(path.join(cache, 'model-profile-'));
try {
  for (const name of ['layout','config','catalog','geometry','assets','interior','openings','optimize','model']) {
    let source;
    try { source = await fs.readFile(`src/studio/${name}.ts`, 'utf8'); }
    catch (error) { if (name === 'optimize' && error.code === 'ENOENT') continue; throw error; }
    const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    await fs.writeFile(path.join(output, `${name}.mjs`), code.replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"'));
  }
  const load = (name) => import(pathToFileURL(path.join(output, `${name}.mjs`)));
  const { CATALOG, catalogConfig } = await load('catalog');
  const { DEFAULT_CONFIG, layoutDimensions } = await load('config');
  const { presetLayout } = await load('layout');
  const { buildContainer } = await load('model');
  const assets = { paintTexture: () => null, pbr: () => new THREE.MeshStandardMaterial({ color: '#c1aa8c' }) };
  const configs = CATALOG.map((design) => ({ name: design.id, config: { ...DEFAULT_CONFIG, ...catalogConfig(design) } }));
  const fold = { ...DEFAULT_CONFIG, buildingType: 'foldout-home', widthFt: 8, doorPositionFt: 0 };
  const footprint = layoutDimensions(fold);
  configs.push({ name: 'foldout-home', config: { ...fold, layout: presetLayout('foldout-home', footprint.length, footprint.width) } });
  const rows = [];
  for (const { name, config } of configs) for (const cutaway of [false,true]) {
    const started = performance.now();
    const model = buildContainer({ ...config, cutaway }, assets);
    const buildMs = performance.now() - started;
    const geometries = new Set(), materials = new Set();
    let meshes = 0, triangles = 0, bytes = 0;
    model.traverseVisible((object) => { if (object.isMesh) {
      meshes++;
      triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.count : 1);
    } });
    model.traverse((object) => { if (object.isMesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    } });
    for (const geometry of geometries) {
      for (const attribute of Object.values(geometry.attributes)) bytes += attribute.array.byteLength;
      bytes += geometry.index?.array.byteLength ?? 0;
    }
    rows.push({ name, cutaway, meshes, triangles, bytes, geometries: geometries.size, materials: materials.size, buildMs: +buildMs.toFixed(1) });
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
  }
  const totals = Object.fromEntries(['meshes','triangles','bytes','geometries','materials','buildMs'].map((key) => [key, rows.reduce((sum,row) => sum + row[key], 0)]));
  const report = { cases: rows.length, totals, rows };
  const destination = process.argv[2];
  if (destination) await fs.writeFile(destination, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ cases: rows.length, totals, family: rows.filter((row) => ['family','foldout-home'].includes(row.name)) }, null, 2));
} finally {
  await fs.rm(output, { recursive: true });
}
