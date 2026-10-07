// ════════════════════════════════════════════════════════════════════════════
// MÓDULOS MÓVEIS E RECOLHÍVEIS (07/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido repetido dele, nunca entregue até aqui: "pedi várias vezes que todos
// esses módulos fossem móveis, que eu pudesse escolher o local". E o princípio
// que ele deu para o app inteiro: "ver tudo de uma vez, ampliar quando quiser,
// rolar só quando achar necessário" — por isso TODO cartão também recolhe.
//
// Vale para TODO `.card`, esteja ele solto na aba ou dentro de uma seção. Isso
// importa: só 29 cartões são filhos diretos de uma aba; 73 estão aninhados, e
// 7 abas (Agenda, Saúde, Lazer, Viagens, Rede, Clínica, Produção) não têm
// NENHUM direto. Se o módulo fosse só "filho direto", metade do app ficaria de
// fora — justamente as abas das micro-abas que ele reclamou.
//
// O que NÃO entra: as folhas (`.cs-folha`) da casca nova. Elas já são um
// recolhível, e o id delas é sorteado a cada carregamento — serviria de chave
// por um carregamento só.
//
// Guardado em `prefs.modulos` (por aparelho, como o resto do layout): o PC
// widescreen e o celular podem ter arrumações diferentes. Não sincroniza.
// ════════════════════════════════════════════════════════════════════════════

/** Os tamanhos. `col` = quantas colunas da grade; `lin` = quantas unidades de
 *  altura (`--mod-u`, 42 px). O que não couber rola DENTRO do módulo — foi o
 *  que ele pediu: "rolasse o mouse dentro do próprio módulo para ver mais".
 *  Tudo múltiplo da mesma unidade: é isso que deixa "quadradinho". */
const MOD_TAMANHOS = [
  { id: 'p', nome: 'Pequeno', col: 1, lin: 5 },
  { id: 'm', nome: 'Médio', col: 1, lin: 9 },
  { id: 'g', nome: 'Grande', col: 1, lin: 14 },
  { id: 'l', nome: 'Largo', col: 2, lin: 9 },
  { id: 'xl', nome: 'Largo e alto', col: 2, lin: 14 }
];
const MOD_PADRAO = { ligado: true, recolhidos: {}, ordem: {}, tamanhos: {} };
function cfgModulos() {   // devolve SEMPRE o mesmo objeto (armadilha nº 6)
  const c = prefs.modulos = prefs.modulos || {};
  Object.keys(MOD_PADRAO).forEach(k => {
    if (c[k] !== undefined) return;
    const p = MOD_PADRAO[k];
    c[k] = (p && typeof p === 'object') ? (Array.isArray(p) ? p.slice() : {}) : p;
  });
  return c;
}
function salvarModulos() { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); }

const modSlug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);

/** Um cartão é módulo? (a folha da casca nova não é) */
function ehModulo(el) {
  return el.classList.contains('card') && !el.classList.contains('cs-folha');
}

/** A identidade do módulo. A ordem das tentativas importa:
 *  1. `data-mod` escrito à mão — para fixar um nome quando quisermos;
 *  2. o `id`, menos os `folha-…` que são sorteados a cada carregamento;
 *  3. a primeira classe própria (ex.: `habits-quick-card`);
 *  4. o título — última escolha porque o vocabulário muda com o perfil de
 *     trabalho ("Plantões" × "Trabalhos") e levaria a chave junto;
 *  5. a posição, só para quem não tem nada disso. */
function chaveModulo(card) {
  const sec = card.closest('.tab-content');
  const aba = sec ? sec.id : 'solto';
  if (card.dataset.mod) return aba + '/' + card.dataset.mod;
  if (card.id && !/^folha-/.test(card.id)) return aba + '/' + card.id;
  const cls = [...card.classList].find(x => x !== 'card' && x !== 'cs-folha' && !x.startsWith('mod-'));
  if (cls) return aba + '/' + cls;
  const h = card.querySelector('h2, h3');
  if (h && h.textContent.trim()) return aba + '/' + modSlug(h.textContent);
  return aba + '/n' + [...card.parentElement.children].indexOf(card);
}

/** O grupo = onde o módulo mora. A ordem é guardada por grupo, não pela aba
 *  inteira: um cartão de dentro de uma seção só se reordena entre os irmãos. */
function grupoModulo(card) {
  const sec = card.closest('.tab-content');
  const pai = card.parentElement;
  const nome = pai.id || [...pai.classList][0] || 'raiz';
  return (sec ? sec.id : 'solto') + '>' + nome;
}

// ───────────────────────────── a alça ──────────────────────────────────────
/** Põe a alça no cartão (uma vez só). Fica como filho DIRETO do `.card`: o
 *  miolo dos cartões é redesenhado o tempo todo por innerHTML, e o que estiver
 *  dentro do miolo some junto. */
/** O nome que aparece quando o módulo está recolhido. Sem isto, cartão sem
 *  `<h2>` recolhia para uma faixa VAZIA de 30 px e ninguém sabia o que era.
 *  Calculado ANTES de pendurar a alça — senão o "⠿▾" dela entra no texto. */
function nomeModulo(card) {
  if (card.dataset.modNome) return card.dataset.modNome;
  // nem todo cartão tem <h2>: vários põem o título num div de cabeçalho, como
  // `<div class="habits-quick-head"><span>🔔 Avisos <small>…</small></span>…</div>`
  const cab = card.querySelector('h2, h3, h4, h5, legend, summary, [class$="-head"] > span, [class$="-head"]');
  let texto;
  if (cab) {
    const copia = cab.cloneNode(true);
    copia.querySelectorAll('small, .item-date, .sync-dot, button, .mini-btn, .badge').forEach(e => e.remove());
    texto = copia.textContent;
  } else texto = card.textContent || '';
  const limpo = texto.trim().replace(/\s+/g, ' ');
  return limpo ? limpo.slice(0, 36) : 'Bloco';
}

function vestirModulo(card) {
  if (card.querySelector(':scope > .mod-alca')) return;
  const k = chaveModulo(card);
  const nome = nomeModulo(card);

  // O conteúdo vai para dentro de um corpo próprio — é ele que rola quando o
  // módulo tem mais coisa do que cabe na altura escolhida. Só 3 regras do CSS
  // dependiam de filho DIRETO do `.card` (h2, h3, h4), por isso dá para embrulhar
  // sem quebrar nada; os elementos mantêm os ids, então todo `innerHTML` que as
  // telas fazem continua achando o lugar certo.
  const corpo = document.createElement('div');
  corpo.className = 'mod-corpo';
  while (card.firstChild) corpo.appendChild(card.firstChild);
  card.appendChild(corpo);

  card.dataset.modNome = nome;
  const rotulo = document.createElement('span');
  rotulo.className = 'mod-titulo';
  rotulo.textContent = nome;
  card.appendChild(rotulo);

  const alca = document.createElement('div');
  alca.className = 'mod-alca';
  alca.innerHTML =
    `<button type="button" class="mod-btn mod-mover" title="Arraste para onde quiser" aria-label="Mover módulo">⠿</button>` +
    `<button type="button" class="mod-btn mod-tamanho" title="Tamanho do módulo" aria-label="Mudar o tamanho">⤢</button>` +
    `<button type="button" class="mod-btn mod-recolher" title="Recolher / abrir" aria-label="Recolher módulo">▾</button>`;
  card.appendChild(alca);
  card.dataset.modChave = k;
  alca.querySelector('.mod-recolher').addEventListener('click', e => { e.stopPropagation(); alternarModulo(card); });
  alca.querySelector('.mod-tamanho').addEventListener('click', e => { e.stopPropagation(); proximoTamanho(card); });
  alca.querySelector('.mod-mover').addEventListener('pointerdown', e => pegarModulo(e, card));
  aplicarTamanho(card);
}

/** Escreve o tamanho escolhido nas variáveis que a grade lê. */
function aplicarTamanho(card) {
  const k = card.dataset.modChave || chaveModulo(card);
  const id = cfgModulos().tamanhos[k] || 'm';
  const t = MOD_TAMANHOS.find(x => x.id === id) || MOD_TAMANHOS[1];
  card.style.setProperty('--mod-col', t.col);
  card.style.setProperty('--mod-lin', t.lin);
  card.dataset.modTam = t.id;
}
function proximoTamanho(card) {
  const k = card.dataset.modChave || chaveModulo(card);
  const c = cfgModulos();
  const i = MOD_TAMANHOS.findIndex(x => x.id === (c.tamanhos[k] || 'm'));
  const t = MOD_TAMANHOS[(i + 1) % MOD_TAMANHOS.length];
  c.tamanhos[k] = t.id;
  salvarModulos();
  aplicarTamanho(card);
  toast(`${card.dataset.modNome}: ${t.nome}.`, 2500);
}

function alternarModulo(card) {
  const c = cfgModulos(); const k = card.dataset.modChave || chaveModulo(card);
  const fechado = !card.classList.contains('mod-recolhido');
  card.classList.toggle('mod-recolhido', fechado);
  if (fechado) c.recolhidos[k] = 1; else delete c.recolhidos[k];
  salvarModulos();
}

// ───────────────────────────── arrastar ────────────────────────────────────
let modArrasto = null;
function pegarModulo(ev, card) {
  if (!cfgModulos().ligado) return;
  ev.preventDefault();
  modArrasto = { card, pai: card.parentElement };
  card.classList.add('mod-movendo');
  document.body.classList.add('mod-arrastando');
  try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { }
}
/** Irmãos que podem trocar de lugar com este: mesmo pai, visíveis, e módulos. */
function irmaosModulo(card) {
  return [...card.parentElement.children]
    .filter(e => e !== card && ehModulo(e) && e.offsetParent !== null);
}
/** 🪤 A primeira versão só trocava de lugar quando o ponteiro caía DENTRO de
 *  outro módulo — ele descreveu certo: "movimento de xadrez". Agora o módulo
 *  segue o ponteiro de verdade: a cada passo procura o vizinho de centro mais
 *  próximo e se encaixa antes ou depois dele. Como a grade é `dense`, o buraco
 *  que sobra é tapado sozinho — e nada se sobrepõe, porque quem decide o lugar
 *  continua sendo a grade, não coordenada solta. */
function moverModulo(ev) {
  if (!modArrasto) return;
  const { card, pai } = modArrasto;
  const irmaos = irmaosModulo(card);
  if (!irmaos.length) return;
  let alvo = null, menor = Infinity, antes = true;
  for (const s of irmaos) {
    const r = s.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
    if (d >= menor) continue;
    menor = d; alvo = s;
    // na mesma faixa horizontal decide pelo lado; senão, por cima/por baixo
    const mesmaLinha = ev.clientY >= r.top && ev.clientY <= r.bottom;
    antes = mesmaLinha ? ev.clientX < cx : ev.clientY < cy;
  }
  if (!alvo) return;
  const destino = antes ? alvo : alvo.nextSibling;
  if (destino === card || (destino === card.nextSibling && !antes)) return;
  pai.insertBefore(card, destino);
}
function soltarModulo() {
  if (!modArrasto) return;
  const { card } = modArrasto;
  card.classList.remove('mod-movendo');
  document.body.classList.remove('mod-arrastando');
  modArrasto = null;
  gravarOrdem(card);
}
document.addEventListener('pointermove', moverModulo);
document.addEventListener('pointerup', soltarModulo);
document.addEventListener('pointercancel', soltarModulo);

function gravarOrdem(card) {
  const c = cfgModulos();
  const g = grupoModulo(card);
  c.ordem[g] = [...card.parentElement.children].filter(ehModulo).map(e => e.dataset.modChave || chaveModulo(e));
  salvarModulos();
  toast('Lugar guardado. Config → Aparência devolve a ordem de fábrica.', 4000);
}

// ───────────────────────────── aplicar ─────────────────────────────────────
/** Veste, recolhe e reordena tudo que está na tela. Roda depois de cada
 *  redesenho: o cartão sobrevive, mas a ordem salva precisa ser reposta se
 *  alguma tela mexeu nos filhos. */
function aplicarModulos() {
  const c = cfgModulos();
  document.body.classList.toggle('mod-ligado', !!c.ligado);
  // 🪤 armadilha nº 9: a caixinha da Config só existe depois do HTML da aba —
  // sem este `if (cx)` ela some em silêncio se o id mudar de nome algum dia.
  const cx = document.getElementById('mod-ligado');
  if (cx) cx.checked = !!c.ligado;
  if (!c.ligado) return;
  document.querySelectorAll('.tab-content .card').forEach(card => {
    if (!ehModulo(card)) return;
    vestirModulo(card);
    const k = card.dataset.modChave;
    card.classList.toggle('mod-recolhido', !!c.recolhidos[k]);
    aplicarTamanho(card);
  });
  ajustarNaoModulos();
  // repõe a ordem guardada, grupo por grupo
  Object.entries(c.ordem).forEach(([g, chaves]) => {
    const algum = document.querySelector(`[data-mod-chave="${CSS.escape(chaves[0] || '')}"]`);
    if (!algum || grupoModulo(algum) !== g) return;
    const pai = algum.parentElement;
    chaves.forEach(k => {
      const el = [...pai.children].find(e => e.dataset && e.dataset.modChave === k);
      if (el) pai.appendChild(el);          // reempilha na ordem guardada
    });
  });
}

/** A linha da grade tem altura FIXA (senão ela cresce com o conteúdo e todo
 *  módulo vira do tamanho do maior — foi o que aconteceu na 1ª tentativa:
 *  quatro módulos de 1040 px). Mas cabeçalho, barra de saldo e companhia não
 *  são módulos e precisam da altura natural deles: aqui cada um ganha o número
 *  de linhas que a sua altura pede. */
function ajustarNaoModulos() {
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mod-u')) || 42;
  document.querySelectorAll('.tab-content.active').forEach(sec => {
    const est = getComputedStyle(sec);
    const gap = parseFloat(est.rowGap) || 16;
    // Numa coluna só a linha é livre (ver o @media de 739px): calcular span aqui
    // só atrapalharia. Limpa o que ficou de uma largura maior e sai.
    if (est.gridTemplateColumns.split(/\s+/).filter(Boolean).length <= 1) {
      [...sec.children].forEach(el => { if (!ehModulo(el)) el.style.gridRow = ''; });
      return;
    }
    [...sec.children].forEach(el => {
      if (ehModulo(el)) return;
      const pos = getComputedStyle(el).position;
      if (pos === 'absolute' || pos === 'fixed') return;   // não entra no fluxo da grade
      el.style.gridRow = '';                               // mede sem o span de antes
      // 🪤 a altura da CAIXA mente quando o elemento é ele mesmo uma grade: o
      // `.life-os-grid` media 18 px e tinha 1029 px de conteúdo — recebia
      // `span 1` e transbordava mil pixels POR CIMA de tudo abaixo. Foi a
      // sobreposição que ele viu no Painel. `scrollHeight` conta o conteúdo.
      const h = Math.max(el.getBoundingClientRect().height, el.scrollHeight);
      if (!h) return;
      el.style.gridRow = 'span ' + Math.max(1, Math.ceil((h + gap) / (u + gap)));
      vigiarAltura(el);
    });
  });
}

/** O conteúdo de um bloco desses muda depois (pomodoro, hábitos, resumo…).
 *  Sem vigiar, o span fica com a medida velha e volta a transbordar. */
const modVigia = typeof ResizeObserver === 'function'
  ? new ResizeObserver(entradas => { if (entradas.length) agendarAjuste(); }) : null;
function vigiarAltura(el) {
  if (!modVigia || el.dataset.modVigiado) return;
  el.dataset.modVigiado = '1';
  modVigia.observe(el);
}
let modTimerAjuste = null;
function agendarAjuste() { clearTimeout(modTimerAjuste); modTimerAjuste = setTimeout(ajustarNaoModulos, 120); }
let modTimerTela = null;
window.addEventListener('resize', () => {
  clearTimeout(modTimerTela);
  modTimerTela = setTimeout(ajustarNaoModulos, 180);
});

/** Devolve tudo ao de fábrica (botão na Config). */
function restaurarModulos() {
  const c = cfgModulos();
  c.recolhidos = {}; c.ordem = {}; c.tamanhos = {};
  salvarModulos();
  toast('Módulos de volta à ordem de fábrica. Recarregue para ver.', 5000);
  document.querySelectorAll('.card.mod-recolhido').forEach(e => e.classList.remove('mod-recolhido'));
}
function alternarModulosLigado(lig) {
  cfgModulos().ligado = !!lig; salvarModulos(); aplicarModulos();
  toast(lig ? 'Módulos móveis ligados.' : 'Módulos móveis desligados: nada se arrasta.', 4000);
}

// ───────────────────────────── ligação ─────────────────────────────────────
if (typeof redesenharTudo === 'function') {
  const _rtMod = redesenharTudo;
  redesenharTudo = function () { _rtMod(); aplicarModulos(); };
}
if (typeof changeTab === 'function') {
  const _ctMod = changeTab;
  changeTab = function (...a) { const r = _ctMod.apply(this, a); setTimeout(aplicarModulos, 0); return r; };
}
aplicarModulos();
