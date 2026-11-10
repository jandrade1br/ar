// Funções de objetos de AR compartilhadas (cópia das funções de indoor-xr.html).
// Usadas pelo simulador virtual (simulador.html). Se você alterar uma função em indoor-xr.html,
// repita a alteração aqui para que o simulador continue refletindo o comportamento do aplicativo.
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
export const ALTURA_PAREDE = 2.6;

function rotulo(texto) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.65)';
  g.beginPath();
  if (g.roundRect) g.roundRect(0, 0, 512, 128, 24); else g.rect(0, 0, 512, 128);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 60px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 256, 66);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: true }));
  s.scale.set(0.6, 0.15, 1);
  s.renderOrder = 10;
  return s;
}

function criarMarcador(nome, cor) {
  const mat = new THREE.MeshStandardMaterial({ color: cor });
  const grupo = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 32), mat);
  base.position.y = 0.01;
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 12), mat);
  haste.position.y = 0.5;
  const topo = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), mat);
  topo.position.y = 1.05;
  const r = rotulo(nome);
  r.position.y = 1.35;
  grupo.add(base, haste, topo, r);
  return grupo;
}


// ---------- Placa flutuante com texto personalizado ----------
// Descarta opções indefinidas, para que não substituam os valores padrão (ex.: largura: undefined)
function definidas(o) { return Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v !== undefined)); }

// Quebra o texto em linhas que cabem na largura (respeita \n).
function quebrarTexto(ctx, texto, larguraMax) {
  const linhas = [];
  String(texto).split('\n').forEach(paragrafo => {
    let atual = '';
    paragrafo.split(/\s+/).filter(Boolean).forEach(palavra => {
      const teste = atual ? atual + ' ' + palavra : palavra;
      if (!atual || ctx.measureText(teste).width <= larguraMax) atual = teste;
      else { linhas.push(atual); atual = palavra; }
    });
    linhas.push(atual);
  });
  return linhas;
}

// Desenha a placa em um canvas; a altura se ajusta à quantidade de linhas.
function desenharPlaca(texto, o) {
  const LARG = 1024, PAD = 48, LH = Math.round(o.fonte * 1.25);
  const c = document.createElement('canvas');
  c.width = LARG;
  const g = c.getContext('2d');
  g.font = 'bold ' + o.fonte + 'px system-ui, sans-serif';
  const linhas = quebrarTexto(g, texto, LARG - 2 * PAD);
  c.height = Math.max(2 * PAD + linhas.length * LH, 128);   // redimensionar reinicia o estado do contexto

  g.fillStyle = o.cor;
  g.strokeStyle = o.corBorda;
  g.lineWidth = 10;
  g.beginPath();
  if (g.roundRect) g.roundRect(5, 5, LARG - 10, c.height - 10, 40); else g.rect(5, 5, LARG - 10, c.height - 10);
  g.fill();
  g.stroke();

  g.font = 'bold ' + o.fonte + 'px system-ui, sans-serif';
  g.fillStyle = o.corTexto;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  linhas.forEach((linha, i) => g.fillText(linha, LARG / 2, PAD + LH * (i + 0.5)));
  return c;
}

// Cria uma placa flutuante. A origem do grupo fica no piso (como em criarMarcador);
// o painel flutua em "altura" metros e gira para o usuário (ver "girar" no laço de renderização).
// opcoes: largura (m), altura (m), fonte (px no canvas), cor, corBorda, corTexto, haste (true/false)
function criarPlaca(texto, opcoes = {}) {
  const o = Object.assign({ largura: 0.8, altura: 1.6, fonte: 56,
                            cor: '#1f6f4a', corBorda: '#ffffff', corTexto: '#ffffff', haste: true }, definidas(opcoes));
  const grupo = new THREE.Group();
  const painel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide }));
  const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 12),
    new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  grupo.add(painel, haste);

  // Redesenha a placa com outro texto (útil para valores que mudam, como distâncias)
  grupo.userData.atualizar = novoTexto => {
    const c = desenharPlaca(novoTexto, o);
    const altPainel = o.largura * c.height / c.width;
    if (painel.material.map) painel.material.map.dispose();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    painel.material.map = tex;
    painel.material.needsUpdate = true;
    painel.geometry.dispose();
    painel.geometry = new THREE.PlaneGeometry(o.largura, altPainel);
    painel.position.y = o.altura;
    const altHaste = o.altura - altPainel / 2;
    haste.visible = o.haste && altHaste > 0.05;
    if (haste.visible) { haste.scale.y = altHaste; haste.position.y = altHaste / 2; }
    grupo.userData.texto = novoTexto;
  };
  grupo.userData.placa = true;
  grupo.userData.atualizar(texto);
  return grupo;
}

// Libera geometrias, materiais e texturas de um objeto removido (inclui modelos com vários materiais)
function descartar(obj) {
  obj.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    const mats = Array.isArray(n.material) ? n.material : (n.material ? [n.material] : []);
    mats.forEach(m => {
      Object.values(m).forEach(v => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
  });
}
function limparGrupo(g) { g.children.slice().forEach(c => { g.remove(c); descartar(c); }); }

// ---------- Placa de mídia: imagem PNG/JPG/WebP ou modelo 3D GLB/GLTF ----------
function extensao(url) { return String(url).split(/[?#]/)[0].split('.').pop().toLowerCase(); }

// Painel plano com texto (usado em legendas e mensagens de erro)
function criarPainelTexto(texto, largura, cor = '#222222') {
  const c = desenharPlaca(texto, { fonte: 56, cor, corBorda: '#ffffff', corTexto: '#ffffff' });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(largura, largura * c.height / c.width),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
}

// Cria uma placa flutuante cujo conteúdo é uma imagem ou um modelo 3D. Devolve o grupo imediatamente
// (com um indicador de carregamento) e preenche o conteúdo quando o arquivo termina de carregar.
// A origem do grupo fica no piso, como em criarMarcador() e criarPlaca().
//
// fonte: URL de .png/.jpg/.jpeg/.webp (imagem) ou .glb/.gltf (modelo 3D)
// opcoes:
//   altura           altura do centro da mídia em relação ao piso, em metros (imagem 1.5; modelo 1.2)
//   largura          largura da imagem, em metros (0.8); a altura segue a proporção do arquivo
//   tamanho          maior dimensão do modelo, em metros (0.5); o modelo é centralizado e redimensionado
//   legenda          texto opcional exibido abaixo da mídia
//   haste            poste do piso até a mídia (imagem: true; modelo: false)
//   olharParaUsuario gira a placa de frente para o usuário (imagem: true; modelo: false)
//   giro             rotação contínua do modelo, em rad/s (modelo: 0.6; imagem: 0)
//   moldura          cor CSS de uma moldura ao redor da imagem (padrão: sem moldura)
//   aoCarregar(g)    função chamada quando a mídia estiver pronta
//   aoErro(e)        função chamada se o arquivo não puder ser carregado
// Em grupo.userData.pronto há uma Promise resolvida quando o carregamento termina (com sucesso ou não).
function criarPlacaMidia(fonte, opcoes = {}) {
  const ext = extensao(fonte);
  const ehModelo = ['glb', 'gltf'].includes(ext);
  if (!ehModelo && !['png', 'jpg', 'jpeg', 'webp'].includes(ext))
    throw new Error('Formato não suportado: .' + ext + ' (use png, jpg, webp, glb ou gltf)');

  const o = Object.assign({
    altura: ehModelo ? 1.2 : 1.5, largura: 0.8, tamanho: 0.5, legenda: '',
    haste: !ehModelo, olharParaUsuario: !ehModelo, giro: ehModelo ? 0.6 : 0,
    moldura: null, aoCarregar: null, aoErro: null
  }, definidas(opcoes));

  const grupo = new THREE.Group();
  const conteudo = new THREE.Group();            // recebe a altura e o giro contínuo
  conteudo.position.y = o.altura;
  grupo.add(conteudo);

  const carregando = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xcccccc, wireframe: true }));
  conteudo.add(carregando);

  let mixer = null, resolver;
  grupo.userData.midia = true;
  grupo.userData.fonte = fonte;
  grupo.userData.olharParaUsuario = o.olharParaUsuario;
  grupo.userData.pronto = new Promise(r => { resolver = r; });
  grupo.userData.quadro = dt => {                // chamado a cada quadro pelo laço de renderização
    if (carregando.parent) carregando.rotation.y += 2 * dt;
    else if (o.giro) conteudo.rotation.y += o.giro * dt;
    if (mixer) mixer.update(dt);
  };

  function finalizar(alturaMidia, larguraMidia) {
    conteudo.remove(carregando);
    carregando.geometry.dispose();
    carregando.material.dispose();
    let base = o.altura - alturaMidia / 2;
    if (o.legenda) {
      const leg = criarPainelTexto(o.legenda, Math.max(larguraMidia, 0.4));
      const hLeg = leg.geometry.parameters.height;
      leg.position.y = base - hLeg / 2 - 0.03;
      grupo.add(leg);
      grupo.userData.legenda = leg;              // gira para o usuário mesmo quando o modelo não gira
      base = leg.position.y - hLeg / 2;
    }
    if (o.haste && base > 0.05) {
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, base, 12),
        new THREE.MeshStandardMaterial({ color: 0xcccccc }));
      haste.position.y = base / 2;
      grupo.add(haste);
    }
    if (o.aoCarregar) o.aoCarregar(grupo);
    resolver(grupo);
  }

  function falhar(erro) {
    console.error('criarPlacaMidia:', fonte, erro);
    conteudo.remove(carregando);
    conteudo.add(criarPainelTexto('Falha ao carregar\n' + String(fonte).split('/').pop(), 0.6, '#a32a2a'));
    grupo.userData.olharParaUsuario = true;
    if (o.aoErro) o.aoErro(erro);
    resolver(grupo);
  }

  if (ehModelo) {
    gltfLoader.load(fonte, gltf => {
      const modelo = gltf.scene;
      const caixa = new THREE.Box3().setFromObject(modelo);
      const tam = caixa.getSize(new THREE.Vector3());
      const centro = caixa.getCenter(new THREE.Vector3());
      const escala = o.tamanho / (Math.max(tam.x, tam.y, tam.z) || 1);
      modelo.position.sub(centro);               // centraliza o modelo na origem
      const pivo = new THREE.Group();
      pivo.add(modelo);
      pivo.scale.setScalar(escala);
      conteudo.add(pivo);
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(modelo);
        gltf.animations.forEach(a => mixer.clipAction(a).play());
      }
      finalizar(tam.y * escala, Math.max(tam.x, tam.z) * escala);
    }, undefined, falhar);
  } else {
    texLoader.load(fonte, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const w = o.largura, hh = w * tex.image.height / tex.image.width;
      if (o.moldura) {
        const mold = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.04, hh + 0.04),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(o.moldura), side: THREE.DoubleSide }));
        mold.position.z = -0.002;
        conteudo.add(mold);
      }
      // transparent + alphaTest preservam o fundo transparente de PNGs
      conteudo.add(new THREE.Mesh(new THREE.PlaneGeometry(w, hh),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide })));
      finalizar(hh + (o.moldura ? 0.04 : 0), w);
    }, undefined, falhar);
  }
  return grupo;
}


// Cria uma parede entre dois pontos do piso. Ela grava apenas a profundidade (colorWrite desligado),
// então não aparece, mas esconde tudo o que estiver atrás dela. Origem do grupo no centro da parede.
// opcoes: altura (m), base (altura do piso em y).
function criarParede(x1, z1, x2, z2, opcoes = {}) {
  const o = Object.assign({ altura: ALTURA_PAREDE, base: 0 }, definidas(opcoes));
  const dx = x2 - x1, dz = z2 - z1, comp = Math.hypot(dx, dz);
  if (comp < 0.1) throw new Error('Parede muito curta (mínimo de 10 cm)');

  const grupo = new THREE.Group();
  const geo = new THREE.PlaneGeometry(comp, o.altura);

  const oclusor = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }));
  oclusor.renderOrder = -10;                      // desenhada antes dos demais objetos

  const visual = new THREE.Group();               // apoio para conferir o alinhamento
  visual.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: 0x3aa0e0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })));
  visual.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff })));

  grupo.add(oclusor, visual);
  grupo.position.set((x1 + x2) / 2, o.base + o.altura / 2, (z1 + z2) / 2);
  grupo.rotation.y = Math.atan2(-dz, dx);         // alinha o eixo x do painel ao segmento
  const r = n => +n.toFixed(2);
  grupo.userData.parede = { x1: r(x1), z1: r(z1), x2: r(x2), z2: r(z2), altura: r(o.altura), base: r(o.base) };
  grupo.userData.oclusor = oclusor;
  grupo.userData.visual = visual;
  return grupo;
}


export { rotulo, criarMarcador, quebrarTexto, desenharPlaca, criarPlaca, definidas, descartar, limparGrupo,
         extensao, criarPainelTexto, criarPlacaMidia, criarParede };
