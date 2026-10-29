// Genesis — guardião offline.
// ⚠️ SUBA O NÚMERO a cada publicação: é o que faz o celular baixar a versão nova.
const CACHE_NAME = 'genesis-cache-v83';

const urlsToCache = [
  './',
  './index.html',
  './leia-me.html',
  './guia.html',
  './codigo-sync.txt',
  './exemplo.js',
  './style.css',
  './app.js',
  './casca.js',
  './nucleo.js',
  './abertura.js',
  './apresentacao.js',
  './exercicios.js',
  './treino.js',
  './estudos.js',
  './receitas.js',
  './cozinha.js',
  './saude-dados.js',
  './saude.js',
  './negocios.js',
  './inventario.js',
  './financas.js',
  './tarefas.js',
  './notas.js',
  './lazer.js',
  './viagens.js',
  './rede.js',
  './clinica.js',
  './producao.js',
  './modulos.js',
  './painel.js',
  './resumos.js',
  './arrumar.js',
  './jarvis3d.js',
  './vendor/three.module.min.js',
  './manifest.json',
  './favicon.svg',
  './favicon-32.png',
  './favicon-64.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// Instala o guardião offline e salva os arquivos do seu app
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ao ativar, apaga caches de versões antigas e assume o controle na hora
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(
        nomes.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Estratégia "internet primeiro, com prazo":
// com internet você sempre recebe a versão mais nova do app;
// sem internet, ele abre a última versão salva.
// O PRAZO (Etapa 57, 28/10) é o conserto do "app demora muito para abrir offline":
// com sinal fraco ou Wi-Fi sem internet a rede não falha, ela fica pendurada, e cada
// arquivo esperava a rede desistir (medido no Edge: 61 s). Agora:
//   • a página espera a internet no máximo ESPERA_PAGINA; passou disso, abre a cópia
//     guardada e marca "rede ruim" por REDE_RUIM_MS: o resto dos arquivos desta
//     abertura vem direto da cópia, sem esperar de novo;
//   • os outros arquivos esperam até ESPERA_ARQUIVO (a rede acabou de responder à
//     página, então costuma estar viva);
//   • resposta ruim (404/500: o site fora do ar) também abre a cópia guardada;
//   • sem cópia guardada não há o que mostrar: espera a rede, como antes.
// Só vai para a cópia o que foi ENTREGUE à tela: resposta que chega depois do prazo é
// descartada, para a cópia não juntar a página de uma versão com os arquivos de outra.
const ESPERA_PAGINA = 3000;
const ESPERA_ARQUIVO = 8000;
const REDE_RUIM_MS = 30000;
let redeRuimAte = 0;

self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que não é leitura de arquivo do próprio app
  // (é aqui que a sincronização com o Google passa sem interferência)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  event.respondWith(responder(req));
});

async function responder(req) {
  const pagina = req.mode === 'navigate';
  // a cópia guardada; a página aberta com "?algo" (o link ?teste do convite) usa a da página sem ele
  const achar = caches.match(req).then(r => r || (pagina ? caches.match(req, { ignoreSearch: true }) : undefined));

  // a rede acabou de travar nesta abertura: nem tenta, abre a cópia
  if (Date.now() < redeRuimAte) {
    const copia = await achar;
    if (copia) return copia;
  }

  // "no-cache": sempre pergunta ao site se há versão nova antes de usar o que o
  // navegador guardou. O GitHub Pages manda o navegador segurar os arquivos por
  // 10 minutos — era por isso que uma atualização só aparecia depois de fechar e
  // reabrir o app várias vezes. Se nada mudou, a resposta volta rápido do mesmo jeito.
  const daRede = fetch(pagina
    ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(req, { cache: 'no-cache' }));
  const guardada = await achar;
  if (!guardada) {
    const res = await daRede;
    guardar(req, res);
    return res;
  }

  let relogio;
  const prazo = new Promise(fim => { relogio = setTimeout(() => fim('prazo'), pagina ? ESPERA_PAGINA : ESPERA_ARQUIVO); });
  const res = await Promise.race([daRede.catch(() => 'sem rede'), prazo]);
  clearTimeout(relogio);
  if (res === 'prazo') { redeRuimAte = Date.now() + REDE_RUIM_MS; return guardada; }
  // sem rede, ou o site fora do ar (404/500): a cópia guardada
  if (res === 'sem rede' || !res.ok) return guardada;
  guardar(req, res);
  return res;
}

// só guarda resposta boa — guardar erro no cache deixa o app quebrado offline
function guardar(req, res) {
  if (res && res.ok && res.type === 'basic') {
    const copia = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
  }
}
