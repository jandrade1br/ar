// Funções puras do simulador virtual: ambiente a partir da planta baixa, transformações de coordenadas e colisão.
import * as THREE from './three.module.min.js';

const EIXO_Y = new THREE.Vector3(0, 1, 0);

// Pose de partida da sessão de AR no mundo do modelo: { x, y, z, yaw }.
// yaw em radianos, mesma convenção da câmera: a frente (-z da sessão) aponta para (-sen yaw, 0, -cos yaw).
export function matrizPartida(p) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(p.x, p.y, p.z),
    new THREE.Quaternion().setFromAxisAngle(EIXO_Y, p.yaw),
    new THREE.Vector3(1, 1, 1));
}
export function localParaMundo(p, ponto) { return ponto.clone().applyMatrix4(matrizPartida(p)); }
export function mundoParaLocal(p, ponto) { return ponto.clone().applyMatrix4(matrizPartida(p).invert()); }

// Constrói um ambiente 3D simples a partir de uma lista de paredes da planta baixa (metros).
// json: { altura = 2.8, espessura = 0.12, paredes: [{ x1, z1, x2, z2, altura? }], piso?: { x1, z1, x2, z2 } }
// Devolve { grupo, segmentos, limites } (limites: THREE.Box3).
export function construirAmbiente(json) {
  const altura = json.altura || 2.8, espessura = json.espessura || 0.12;
  const paredes = Array.isArray(json.paredes) ? json.paredes : [];
  const grupo = new THREE.Group();
  const segmentos = [];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  const matParede = new THREE.MeshStandardMaterial({ color: 0xdad7cf, roughness: 0.9 });
  const matLinha = new THREE.LineBasicMaterial({ color: 0x555555 });

  paredes.forEach(p => {
    const dx = p.x2 - p.x1, dz = p.z2 - p.z1, comp = Math.hypot(dx, dz);
    if (!(comp > 0.05)) return;
    const h = p.altura || altura;
    const geo = new THREE.BoxGeometry(comp, h, espessura);
    const m = new THREE.Mesh(geo, matParede);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), matLinha));
    m.position.set((p.x1 + p.x2) / 2, h / 2, (p.z1 + p.z2) / 2);
    m.rotation.y = Math.atan2(-dz, dx);
    grupo.add(m);
    segmentos.push({ x1: p.x1, z1: p.z1, x2: p.x2, z2: p.z2 });
    minX = Math.min(minX, p.x1, p.x2); maxX = Math.max(maxX, p.x1, p.x2);
    minZ = Math.min(minZ, p.z1, p.z2); maxZ = Math.max(maxZ, p.z1, p.z2);
  });

  if (json.piso) {
    minX = Math.min(minX, json.piso.x1); maxX = Math.max(maxX, json.piso.x2);
    minZ = Math.min(minZ, json.piso.z1); maxZ = Math.max(maxZ, json.piso.z2);
  }
  if (!isFinite(minX)) { minX = -5; maxX = 5; minZ = -5; maxZ = 5; }

  const larg = maxX - minX + 1, prof = maxZ - minZ + 1;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(larg, prof).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8a9a8f, roughness: 1 }));
  piso.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  grupo.add(piso);

  // Grade de 1 m sobre o piso, para dar noção de escala
  const grade = new THREE.GridHelper(Math.max(larg, prof), Math.round(Math.max(larg, prof)), 0x66756b, 0x66756b);
  grade.position.set((minX + maxX) / 2, 0.002, (minZ + maxZ) / 2);
  grupo.add(grade);

  const limites = new THREE.Box3(new THREE.Vector3(minX, 0, minZ), new THREE.Vector3(maxX, altura, maxZ));
  return { grupo, segmentos, limites };
}

// Impede que o ponto (x, z) fique a menos de "raio" metros de qualquer parede. Devolve o ponto corrigido.
export function colidir(ponto, segmentos, raio = 0.25) {
  let { x, z } = ponto;
  for (let it = 0; it < 3; it++) {
    for (const s of segmentos) {
      const dx = s.x2 - s.x1, dz = s.z2 - s.z1, len2 = dx * dx + dz * dz;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - s.x1) * dx + (z - s.z1) * dz) / len2));
      const cx = s.x1 + t * dx, cz = s.z1 + t * dz;
      const d = Math.hypot(x - cx, z - cz);
      if (d < raio) {
        if (d > 1e-6) { x = cx + (x - cx) / d * raio; z = cz + (z - cz) / d * raio; }
        else { const n = Math.hypot(dx, dz); x += (-dz / n) * raio; z += (dx / n) * raio; }
      }
    }
  }
  return { x, z };
}
