import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Batch opaque fittings within their existing selectable or moving group. */
export function optimizeModel(root: THREE.Group) {
  const materialCache = new Map<string, THREE.Material>();
  const canonicalMaterials = new Map<THREE.Material, THREE.Material>();
  const properties = ["name", "type", "color", "emissive", "emissiveIntensity", "roughness", "metalness", "map", "normalMap", "normalScale", "roughnessMap", "aoMap", "aoMapIntensity", "bumpMap", "bumpScale", "alphaMap", "alphaTest", "side", "transparent", "opacity", "depthWrite", "depthTest", "toneMapped", "flatShading", "vertexColors", "wireframe", "blending", "premultipliedAlpha", "envMap", "envMapIntensity"];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || mesh.userData.sharedAsset || Array.isArray(mesh.material) || mesh.material.type !== "MeshStandardMaterial") return;
    const material = mesh.material;
    if (!canonicalMaterials.has(material)) {
      const values = material as unknown as Record<string, unknown>;
      const key = JSON.stringify(properties.map((property) => {
        const value = values[property];
        if (value instanceof THREE.Texture) return value.uuid;
        if (value instanceof THREE.Color || value instanceof THREE.Vector2) return value.toArray();
        return value;
      }));
      const shared = materialCache.get(key) ?? material;
      materialCache.set(key, shared); canonicalMaterials.set(material, shared);
    }
    mesh.material = canonicalMaterials.get(material)!;
  });
  root.traverse((object) => {
    if (object.userData.paint) object.userData.paint = canonicalMaterials.get(object.userData.paint) ?? object.userData.paint;
    if (object.userData.paints) object.userData.paints = [...new Set((object.userData.paints as THREE.Material[]).map((material) => canonicalMaterials.get(material) ?? material))];
  });
  canonicalMaterials.forEach((shared, material) => { if (shared !== material) material.dispose(); });
  const released = new Set<THREE.BufferGeometry>();
  const mergedCache = new Map<string, THREE.BufferGeometry>();
  const visit = (parent: THREE.Object3D) => {
    for (const child of [...parent.children]) if (!((child as THREE.Mesh).isMesh)) visit(child);
    const batches = new Map<string, THREE.Mesh[]>();
    for (const child of parent.children) {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || mesh.children.length || !mesh.visible || mesh.userData.sharedAsset || mesh.userData.doorMotion ||
        (mesh as THREE.InstancedMesh).isInstancedMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(mesh.material) ||
        mesh.material.transparent || mesh.material.opacity < 1 || mesh.material.alphaTest || Object.keys(mesh.geometry.morphAttributes).length) continue;
      const attributes = Object.entries(mesh.geometry.attributes).map(([key, value]) => `${key}:${value.itemSize}:${value.normalized}`).sort().join("|");
      const key = `${mesh.material.uuid}:${Boolean(mesh.geometry.index)}:${attributes}:${mesh.castShadow}:${mesh.receiveShadow}:${mesh.renderOrder}`;
      const batch = batches.get(key) ?? [];
      batch.push(mesh); batches.set(key, batch);
    }
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      meshes.forEach((mesh) => mesh.updateMatrix());
      const key = meshes.map((mesh) => `${mesh.geometry.uuid}:${mesh.matrix.elements.join(",")}`).join("|");
      let geometry = mergedCache.get(key);
      if (!geometry) {
        const parts = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrix));
        geometry = mergeGeometries(parts) ?? undefined;
        parts.forEach((part) => part.dispose());
        if (!geometry) continue;
        geometry.computeBoundingBox(); geometry.computeBoundingSphere();
        mergedCache.set(key, geometry);
      }
      const combined = new THREE.Mesh(geometry, meshes[0].material);
      combined.name = "Batched static fittings";
      combined.castShadow = meshes[0].castShadow; combined.receiveShadow = meshes[0].receiveShadow;
      combined.renderOrder = meshes[0].renderOrder;
      parent.add(combined);
      for (const mesh of meshes) {
        if (mesh.name) {
          const anchor = new THREE.Object3D();
          anchor.name = mesh.name; anchor.position.copy(mesh.position); anchor.quaternion.copy(mesh.quaternion);
          anchor.scale.copy(mesh.scale); anchor.userData = { ...mesh.userData };
          parent.add(anchor);
        }
        released.add(mesh.geometry); mesh.removeFromParent();
      }
    }
  };
  visit(root);
  const retained = new Set<THREE.BufferGeometry>();
  root.traverse((object) => { if ((object as THREE.Mesh).isMesh) retained.add((object as THREE.Mesh).geometry); });
  released.forEach((geometry) => { if (!retained.has(geometry)) geometry.dispose(); });
  return root;
}
