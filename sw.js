// Genesis — guardião offline.
// ⚠️ SUBA O NÚMERO a cada publicação: é o que faz o celular baixar a versão nova.
const CACHE_NAME = 'genesis-cache-v41';

const urlsToCache = [
  './',
  './index.html',
  './exemplo.js',
  './style.css',
  './app.js',
  './casca.js',
  './nucleo.js',
  './abertura.js',
  './apresentacao.js',
  './exercicios.js',
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

// Estratégia "internet primeiro, cache como reserva":
// com internet você sempre recebe a versão mais nova do app;
// sem internet, ele abre a última versão salva.
self.addEventListener('fetch', event => {
  const req = event.request;

  // deixa passar direto o que não é leitura de arquivo do próprio app
  // (é aqui que a sincronização com o Google passa sem interferência)
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  // "no-cache": sempre pergunta ao site se há versão nova antes de usar o que o
  // navegador guardou. O GitHub Pages manda o navegador segurar os arquivos por
  // 10 minutos — era por isso que uma atualização só aparecia depois de fechar e
  // reabrir o app várias vezes. Se nada mudou, a resposta volta rápido do mesmo jeito.
  const pedido = req.mode === 'navigate'
    ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(req, { cache: 'no-cache' });

  event.respondWith(
    fetch(pedido)
      .then(res => {
        // só guarda resposta boa — guardar erro no cache deixa o app quebrado offline
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
