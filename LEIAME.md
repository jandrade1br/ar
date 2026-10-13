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
