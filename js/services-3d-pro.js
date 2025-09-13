// === SERVICES 3D PRO — Three.js (CDN, bez bundlera) ===
// Importy z CDN (unikamy "Failed to resolve module specifier 'three'")
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
// Opcjonalnie, jeśli .glb skompresowany Draco:
// import { DRACOLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';

const SELECTORS = {
  canvas: '#house3d',
  panel:  '#s3d-panel',
};

// 🔁 PODMIEŃ na realną ścieżkę do Twojego modelu
const MODEL_URL = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';

// Mapowanie nazw z GLB → grupy logiczne
const PART_MAP = {
  frame:     ['Frame','Studs','Joists','Beams','Rafters','Posts'],
  insulation:['Insulation','MineralWool','Cellulose'],
  sheathing: ['OSB','STEICO','Sheathing','Bracing'],
  finish:    ['Interior','Drywall','Cladding','Facade','Windows','Doors','Roofing','Flooring'],
};

// Treści panelu (podmienisz media)
const INFO_PANEL_CONTENT = {
  Frame:      { title: 'Szkielet C24', text: 'Elementy nośne C24, łączniki certyfikowane.', media: '../photos/services/parts/frame.jpg' },
  Insulation: { title: 'Izolacja',     text: 'Wełna mineralna/drzewna, szczelność blower-door.', media: '../photos/services/parts/insulation.jpg' },
  OSB:        { title: 'Poszycie OSB', text: 'Usztywnienie tarczowe, dylatacje wg kart tech.',   media: '../photos/services/parts/sheathing.jpg' },
  Windows:    { title: 'Okna',         text: 'Ciepły montaż, taśmy paro-/wiatroszczelne.',       media: '../photos/services/parts/windows.jpg' },
  Doors:      { title: 'Drzwi',        text: 'Zewnętrzne z ciepłymi progami, montaż systemowy.', media: '../photos/services/parts/doors.jpg' },
  Roofing:    { title: 'Dach',         text: 'Przygotowany pod PV, obróbki blacharskie.',         media: '../photos/services/parts/roof.jpg' },
};

let CANVAS, PANEL, TITLE, TEXT, MEDIA, FALLBACK_WRAP;
let renderer, scene, camera, controls, modelRoot, ground;

const state = {
  loaded: false,
  clickable: [],
  partIndex: new Map(),
  originalTransforms: new Map(),
  exploded: false,
  selected: null,
  outlines: new Map(),
};

function qs(sel, root=document){ return root.querySelector(sel); }

function saveTransform(obj){
  state.originalTransforms.set(obj, {
    pos: obj.position.clone(),
    rot: obj.rotation.clone(),
    scl: obj.scale.clone(),
  });
}
function restoreTransform(obj){
  const o = state.originalTransforms.get(obj);
  if (!o) return;
  obj.position.copy(o.pos);
  obj.rotation.copy(o.rot);
  obj.scale.copy(o.scl);
}

function makeOutline(mesh){
  // proste “outline”: klon + BackSide
  const outline = mesh.clone();
  outline.traverse(o=>{
    if (!o.isMesh) return;
    o.material = new THREE.MeshBasicMaterial({ color: 0xff7a00, side: THREE.BackSide, depthWrite: false });
  });
  outline.scale.multiplyScalar(1.03);
  outline.renderOrder = 0;
  outline.name = `${mesh.name || 'part'}_outline`;
  mesh.add(outline);
  state.outlines.set(mesh, outline);
}
function clearOutline(mesh){
  const o = state.outlines.get(mesh);
  if (o && o.parent) o.parent.remove(o);
  state.outlines.delete(mesh);
}

function setSelected(mesh){
  if (state.selected && state.selected !== mesh) clearOutline(state.selected);
  state.selected = mesh || null;
  if (mesh) makeOutline(mesh);
  updateInfoPanel(mesh);
}

function updateInfoPanel(mesh){
  if (!mesh){
    if (TITLE) TITLE.textContent = 'Wybierz element';
    if (TEXT)  TEXT.textContent  = 'Kliknij część modelu, aby zobaczyć opis.';
    if (MEDIA) MEDIA.style.background = '';
    return;
  }
  const key = Object.keys(INFO_PANEL_CONTENT).find(k => (mesh.name||'').toLowerCase().includes(k.toLowerCase()));
  const data = INFO_PANEL_CONTENT[key] || { title: mesh.name || 'Element', text: 'Brak opisu — uzupełnij w INFO_PANEL_CONTENT.', media: null };
  if (TITLE) TITLE.textContent = data.title;
  if (TEXT)  TEXT.textContent  = data.text;
  if (MEDIA) MEDIA.style.background = data.media ? `center/cover no-repeat url("${data.media}")` : '';
}

function findTopGroupFor(mesh){
  let p = mesh;
  while (p.parent && p.parent !== modelRoot) p = p.parent;
  return p;
}

function tagLogicGroups(root){
  const all = [];
  root.traverse(o => {
    if (o.isMesh) {
      all.push(o);
      let tag = null;
      for (const [logic, names] of Object.entries(PART_MAP)){
        if (names.some(n => (o.name||'').toLowerCase().includes(n.toLowerCase()))) { tag = logic; break; }
      }
      if (tag) state.partIndex.set(o, tag);
    }
  });
  state.clickable = all;
}

function setMode(mode){
  const visibleByLogic = {
    skeleton:  { frame: true, insulation: false, sheathing:false, finish:false },
    layers:    { frame: true, insulation: true,  sheathing:true,  finish:false },
    finish:    { frame: true, insulation: true,  sheathing:true,  finish:true },
  }[mode];

  modelRoot.traverse(o=>{
    if (!o.isMesh) return;
    const logic = state.partIndex.get(o) || 'frame';
    o.visible = !!visibleByLogic[logic];
  });
}

function explode(toggle){
  state.exploded = toggle ?? !state.exploded;
  const bbox = new THREE.Box3().setFromObject(modelRoot);
  const center = bbox.getCenter(new THREE.Vector3());

  modelRoot.children.forEach(child=>{
    restoreTransform(child);
    if (!state.exploded) return;

    const cb = new THREE.Box3().setFromObject(child);
    const cc = cb.getCenter(new THREE.Vector3());
    const dir = cc.clone().sub(center).normalize();
    const size = cb.getSize(new THREE.Vector3()).length();
    const strength = THREE.MathUtils.clamp(size * 0.12, 0.2, 1.6);
    child.position.addScaledVector(dir, strength);
  });
}

function resetAll(){
  modelRoot.traverse(o=> restoreTransform(o));
  state.exploded = false;
  setSelected(null);
}

function pick(nx, ny){
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({x: nx, y: ny}, camera);
  const intersects = raycaster.intersectObjects(state.clickable, true);
  if (!intersects.length) { setSelected(null); return; }
  const mesh = findTopGroupFor(intersects[0].object);
  setSelected(mesh);
}

/* ================== INIT ================== */
function init() {
  // DOM
  CANVAS = qs(SELECTORS.canvas);
  PANEL  = qs(SELECTORS.panel);
  if (!CANVAS || !PANEL) { console.error('[services-3d-pro] Brak wymaganych elementów DOM (canvas/panel).'); return; }
  TITLE = PANEL.querySelector('.panel__title');
  TEXT  = PANEL.querySelector('.panel__text');
  MEDIA = PANEL.querySelector('.panel__media');
  FALLBACK_WRAP = PANEL.querySelector('.s3d-fallback');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: CANVAS, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  // Scene + Camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(4, 2.2, 5);
  scene.add(camera);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 2.2;
  controls.maxDistance = 12;
  controls.target.set(0,1.2,0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x778899, 1.0);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(3,5,3);
  dir.castShadow = false;
  scene.add(dir);

  // Ground (opcjonalny)
  ground = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({ color: 0xf3f3f3, metalness: 0, roughness: .95 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  scene.add(ground);

  // Root na model
  modelRoot = new THREE.Group();
  modelRoot.name = 'ModelRoot';
  scene.add(modelRoot);

  // Fallback WebGL?
  const gl = renderer.getContext();
  const ok = gl && (gl instanceof WebGL2RenderingContext || gl instanceof WebGLRenderingContext);
  if (!ok){
    FALLBACK_WRAP.hidden = false;
    CANVAS.style.display = 'none';
    PANEL.querySelectorAll('.s2d.clickable').forEach(el=>{
      el.addEventListener('click', ()=>{
        const key = el.dataset.part;
        if (TITLE) TITLE.textContent = key;
        if (TEXT)  TEXT.textContent  = 'Opis do uzupełnienia.';
        if (MEDIA) MEDIA.style.background = '';
      });
    });
    return;
  }

  bindUI();
  onResize();
  window.addEventListener('resize', onResize);

  loadModel();
  animate();
}

function bindUI(){
  document.querySelectorAll('.s3d-btn[data-mode]').forEach(btn=>{
    btn.addEventListener('click', ()=> setMode(btn.dataset.mode));
  });
  document.querySelector('.s3d-btn[data-action="explode"]')?.addEventListener('click', ()=> explode());
  document.querySelector('.s3d-btn[data-action="reset"]')?.addEventListener('click', ()=> resetAll());

  // Klik picking
  CANVAS.addEventListener('pointerdown', (e)=>{
    const rect = CANVAS.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pick(x, y);
  });
}

function loadModel(){
  const loader = new GLTFLoader();
  // Jeśli Draco:
  // const draco = new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/'); loader.setDRACOLoader(draco);

  loader.load(MODEL_URL, (gltf)=>{
    const root = gltf.scene;

    root.traverse(o=>{
      if (o.isMesh){
        o.castShadow = true; o.receiveShadow = true;
        saveTransform(o);
      }
    });
    root.children.forEach(saveTransform);

    // Wyśrodkuj model na (0,0,0)
    const bbox = new THREE.Box3().setFromObject(root);
    const center = bbox.getCenter(new THREE.Vector3());
    root.position.sub(center);

    modelRoot.add(root);
    tagLogicGroups(root);
    setMode('layers'); // startowy tryb
    state.loaded = true;
  }, undefined, (err)=> console.error('[services-3d-pro] GLB load error:', err));
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onResize(){
  const wrap = CANVAS.parentElement; // .services-3d-pro__viewer
  const w = wrap.clientWidth;
  const h = Math.max(360, Math.round(w * 9/16));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// Start po załadowaniu DOM
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
