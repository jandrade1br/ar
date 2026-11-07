# Protótipo WebAR (AR.js + A-Frame)

## Arquivos
- `index.html`   – menu de acesso aos dois modos
- `outdoor.html` – AR por GPS (objeto ancorado em coordenadas)
- `indoor.html`  – AR por marcadores (Hiro = Sala A, Kanji = Sala B)

## Como publicar (HTTPS é obrigatório para câmera e GPS)
1. Crie um repositório no GitHub e envie os três arquivos HTML.
2. Em Settings > Pages, selecione a branch `main` e a pasta `/ (root)`.
3. Abra `https://SEU-USUARIO.github.io/NOME-DO-REPO/` no Chrome do Android (ou Safari do iOS).

Alternativa para teste rápido sem publicar: `npx serve` + `ngrok http 3000` (gera uma URL HTTPS temporária).

## Como testar
- Outdoor: abra `outdoor.html` em local aberto, toque em Iniciar, permita câmera/localização/sensores.
  O cubo vermelho surge 25 m ao norte. Para um ponto fixo: `outdoor.html?lat=-1.3000&lon=-48.4000`.
- Indoor: abra `indoor.html` e aponte a câmera para o marcador Hiro ou Kanji, impresso ou exibido em outra tela
  (imagens em https://github.com/AR-js-org/AR.js/tree/master/data/images).

## Observações
- O GPS do celular tem erro típico de 3 a 10 m; use objetos grandes ou marcadores visuais de refinamento.
- Marcadores personalizados: gere o arquivo `.patt` em https://ar-js-org.github.io/AR.js/three.js/examples/marker-training/examples/generator.html
  e use `<a-marker type="pattern" url="meu-marcador.patt">`.
- Rastreamento de imagem natural (foto, pôster) exige o modo NFT, que precisa de descritores gerados previamente.


## Estrutura de arquivos (versão atual)
- `index.html`, `outdoor.html`, `indoor.html`, `marcadores.html`
- `lib/` – A-Frame 1.3.0 e AR.js 3.4.5 (aframe-ar.js para marcadores; aframe-ar-nft.js para localização)
- `data/` – calibração da câmera (`camera_para.dat`), padrões (`patt.hiro`, `patt.kanji`) e imagens dos marcadores
- Envie a pasta inteira ao servidor; os HTML não carregam mais bibliotecas de CDNs externas (exceto a fonte do `a-text`).


## Aplicativo com dois modos (versão atual)
- `index.html` – menu: Outdoor (AR.js + GPS), Indoor (WebXR) e Indoor alternativo (marcadores AR.js).
- `outdoor.html` – AR.js por geolocalização (A-Frame, componentes `gps-new-camera` e `gps-new-entity-place`).
- `indoor-xr.html` – WebXR Device API (`immersive-ar`, `hit-test`, `dom-overlay`) com three.js local em `lib/three.module.min.js`.
  - Pontos fixos: edite a lista `PONTOS_FIXOS` no início do script (x e z em metros, relativos ao ponto e à direção de início da sessão).
  - Toque na tela sobre o anel branco para colocar novos pontos; ao sair, as coordenadas aparecem em JSON para copiar.
- Requisitos do WebXR: Android com Chrome ou Samsung Internet, HTTPS e "Google Play Services for AR" instalado.


## indoor-xr.html (versão 2): funções de objetos
- `criarMarcador(nome, cor)` – poste colorido com rótulo.
- `criarPlaca(texto, opcoes)` – placa flutuante com texto personalizado.
- `criarPlacaMidia(fonte, opcoes)` – placa flutuante com **imagem** (.png, .jpg, .webp) ou **modelo 3D** (.glb, .gltf).
  - Opções: `altura`, `largura` (imagem), `tamanho` (modelo), `legenda`, `haste`, `olharParaUsuario`, `giro`, `moldura`, `aoCarregar`, `aoErro`.
  - O modelo é centralizado e redimensionado automaticamente para a dimensão `tamanho`. Animações do arquivo são executadas.
  - PNG com fundo transparente é respeitado.
  - `grupo.userData.pronto` é uma Promise resolvida quando o arquivo termina de carregar.
- Listas de objetos fixos no início do script: `PONTOS_FIXOS`, `PLACAS_FIXAS`, `MIDIAS_FIXAS`.
- Arquivos novos: `lib/GLTFLoader.js` e `lib/BufferGeometryUtils.js` (three.js r160, com caminhos de importação locais), `data/exemplo.png` e `data/exemplo.glb`.
- `indoor-xr-v1.html` é a versão anterior (sem `criarPlacaMidia`), mantida apenas para consulta.
- Limitações: modelos comprimidos com Draco ou Meshopt não são suportados nesta versão. Prefira arquivos pequenos (imagens até 1024 px; modelos de poucos MB).
