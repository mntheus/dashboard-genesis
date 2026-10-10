// ════════════════════════════════════════════════════════════════════════════
// ARRUMAR — os módulos de todas as abas, no jeito do Painel (10/10/2026, G5)
// ────────────────────────────────────────────────────────────────────────────
// A PENDÊNCIA GUARDADA desde 07/10 ("não ficou 100% resolvida a forma como os
// módulos se modificam entre eles"). Ele aprovou o Painel e escolheu levar o
// mesmo jeito às outras abas:
//   • fora da edição, NENHUMA alça na tela (e sem a faixa que ela reservava);
//   • "✎ Arrumar" no canto da aba (ao lado da ⚙) liga a edição: os QUADROS dos
//     painéis (Saúde, Finanças, Negócios) ganham contorno, arrastam de qualquer
//     ponto (no toque, pela alça ⠿ — armadilha 20), esticam pelo canto (largura
//     em colunas, altura em linhas, encaixando na grade) e recolhem com "−";
//     os cartões grandes usam a alça que já existe (modulos.js);
//   • "↺" devolve a aba ao de fábrica. Tudo por aparelho (prefs.arrumar).
// No Painel o mesmo botão liga o modo editar dele (pnEditar).
// Carrega DEPOIS do painel.js.
// ════════════════════════════════════════════════════════════════════════════

/** As grades de quadros que se arrumam. `render`: quem as redesenha (o arranjo é reposto depois). */
const AR_GRADES = [
  { aba: 'health', sel: '#health-dash > .sp-grade', chave: 'saude-painel', render: 'renderPainelSaude' },
  { aba: 'finances', sel: '#fin-painel > .sp-grade', chave: 'fin-painel', render: 'renderFinPainel' },
  { aba: 'business', sel: '#biz-dash > .sp-grade', chave: 'ng-painel', render: 'renderPainelNegocios' }
];
const AR_LINHA = 60;          // a "linha" da altura de um quadro, em px
let arEditando = null;        // id da aba em edição (ou null)

function cfgArrumar() { prefs.arrumar = prefs.arrumar || {}; return prefs.arrumar; }
function arGravar() { try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { } }
function arCfgGrade(chave) { const c = cfgArrumar(); c[chave] = c[chave] || {}; const g = c[chave]; g.tam = g.tam || {}; g.recolhidos = g.recolhidos || {}; return g; }
/** A identidade do quadro: a classe própria dele (sp-treino, fin-q-rio, ng-q-mercado…). */
function arChaveQuadro(q) { return [...q.classList].find(c => c !== 'sp-quadro' && !c.startsWith('ar-')) || 'q' + [...q.parentElement.children].indexOf(q); }
function arColunas(g) { return getComputedStyle(g).gridTemplateColumns.split(/\s+/).filter(Boolean).length || 1; }
function arIcone(k, alt) { return (typeof ICONES !== 'undefined' && ICONES[k] && typeof ic === 'function') ? ic(k) : alt; }

// ───────────────────────────── repor o arranjo ─────────────────────────────
function arAplicarGrade(def) {
  const g = document.querySelector(def.sel); if (!g) return;
  const c = arCfgGrade(def.chave);
  const filhos = [...g.children].filter(e => e.classList.contains('sp-quadro'));
  if (c.ordem && c.ordem.length) {
    const por = new Map(filhos.map(q => [arChaveQuadro(q), q]));
    [...c.ordem.map(k => por.get(k)).filter(Boolean), ...filhos.filter(q => !c.ordem.includes(arChaveQuadro(q)))].forEach(q => g.appendChild(q));
  }
  const cols = arColunas(g), gap = parseFloat(getComputedStyle(g).rowGap) || 12;
  filhos.forEach(q => {
    const k = arChaveQuadro(q), t = c.tam[k];
    q.dataset.arChave = k;
    q.style.gridColumn = t && t.c ? `span ${Math.min(t.c, cols)}` : '';
    // a altura é um MÍNIMO: esticar dá mais espaço; nunca corta o conteúdo
    q.style.minHeight = t && t.l ? (t.l * AR_LINHA + (t.l - 1) * gap) + 'px' : '';
    q.classList.toggle('ar-recolhido', !!c.recolhidos[k]);
    arVestirQuadro(q);
  });
  g.classList.add('ar-grade'); g.dataset.arGrade = def.chave;
  // grade de aba ESCONDIDA não tem colunas de verdade (o "esticado" caía para 1 coluna ao recarregar):
  // vigia a largura e refaz as larguras quando ela aparece ou muda
  if (!g._arVigia && typeof ResizeObserver === 'function') {
    let w0 = -1;
    g._arVigia = new ResizeObserver(() => { const w = Math.round(g.clientWidth); if (w && w !== w0) { w0 = w; arLarguras(def, g); } });
    g._arVigia.observe(g);
  }
}
function arLarguras(def, g) {
  const c = arCfgGrade(def.chave), cols = arColunas(g);
  [...g.children].filter(e => e.classList.contains('sp-quadro')).forEach(q => {
    const t = c.tam[arChaveQuadro(q)];
    q.style.gridColumn = t && t.c ? `span ${Math.min(t.c, cols)}` : '';
  });
}
function arAplicarTudo() { AR_GRADES.forEach(arAplicarGrade); }
/** Os controles do quadro (só aparecem na edição; o "+" do recolhido aparece sempre). */
function arVestirQuadro(q) {
  if (q.querySelector(':scope > .ar-ui')) { arAtualizarRecolher(q); return; }
  q.insertAdjacentHTML('beforeend',
    `<button type="button" class="ar-ui ar-alca" title="Arraste para mudar de lugar" aria-label="Mover">${arIcone('alca', '⠿')}</button>` +
    `<button type="button" class="ar-ui ar-recolher" title="Recolher" aria-label="Recolher"></button>` +
    `<span class="ar-ui ar-setas"><button type="button" data-dir="-1" aria-label="Para trás">↑</button><button type="button" data-dir="1" aria-label="Para a frente">↓</button></span>` +
    `<span class="ar-ui ar-canto" title="Puxe para mudar o tamanho" aria-hidden="true">${arIcone('canto', '◢')}</span>`);
  arAtualizarRecolher(q);
}
function arAtualizarRecolher(q) {
  const b = q.querySelector(':scope > .ar-recolher'); if (!b) return;
  const fechado = q.classList.contains('ar-recolhido');
  b.textContent = fechado ? '+' : '−'; b.title = fechado ? 'Abrir' : 'Recolher'; b.setAttribute('aria-label', b.title);
}

// ───────────────────────────── a edição ────────────────────────────────────
function arPodeArrumar(id) {
  if (!id || id === 'settings' || id === 'nucleo') return false;
  if (id === 'focus') return typeof pnEditar === 'function';
  const sec = document.getElementById(id); if (!sec) return false;
  return AR_GRADES.some(d => d.aba === id) || !!sec.querySelector('.card[data-mod-chave]');
}
function arAlternar() {
  const id = (document.querySelector('.tab-content.active') || {}).id;
  if (id === 'focus' && typeof pnEditar === 'function') { pnEditar(); arBotoes(); return; }
  if (arEditando) arSair(); else arEntrar(id);
}
function arEntrar(id) {
  if (!arPodeArrumar(id)) return;
  arEditando = id; document.body.classList.add('ar-editando');
  arAplicarTudo(); arBotoes();
  if (typeof agendarAjuste === 'function') agendarAjuste();
  const toque = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  toast(toque ? '✎ Arrumando: arraste pela ⠿ ou use ↑ ↓, − recolhe. ✓ termina.'
    : '✎ Arrumando: arraste os quadros, puxe o canto para mudar o tamanho, − recolhe. ✓ termina.', 5500);
}
function arSair() {
  if (!arEditando) return;
  arEditando = null; document.body.classList.remove('ar-editando');
  arBotoes(); if (typeof agendarAjuste === 'function') agendarAjuste();
}
function arRestaurar() {
  const id = (document.querySelector('.tab-content.active') || {}).id; if (!id) return;
  if (!confirm('Devolver esta aba à arrumação de fábrica (lugar, tamanho e recolhidos)? O app recarrega.')) return;
  const c = cfgArrumar(); AR_GRADES.filter(d => d.aba === id).forEach(d => { delete c[d.chave]; });
  // os cartões grandes (modulos.js): ordem, tamanho e recolhidos dos desta aba
  if (typeof cfgModulos === 'function') {
    const m = cfgModulos(), chaves = [...document.querySelectorAll(`#${id} .card[data-mod-chave]`)].map(x => x.dataset.modChave);
    chaves.forEach(k => { delete m.tamanhos[k]; delete m.recolhidos[k]; });
    Object.keys(m.ordem).forEach(g => { if ((m.ordem[g] || []).some(k => chaves.includes(k))) delete m.ordem[g]; });
  }
  arGravar(); location.reload();
}
/** O ✎ (e, na edição, o ✓ e o ↺) no canto da aba, ao lado da ⚙ e do 🛠. */
function arBotoes() {
  let b = document.getElementById('aba-arrumar-btn'), r = document.getElementById('aba-arrumar-volta');
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.id = 'aba-arrumar-btn'; b.className = 'aba-arrumar-btn'; b.onclick = arAlternar; }
  if (!r) { r = document.createElement('button'); r.type = 'button'; r.id = 'aba-arrumar-volta'; r.className = 'aba-arrumar-volta'; r.onclick = arRestaurar; r.title = 'Devolver esta aba à arrumação de fábrica'; r.setAttribute('aria-label', r.title); r.innerHTML = arIcone('girar', '↺'); }
  const alvo = document.querySelector('.tab-content.active'), id = alvo && alvo.id;
  const pode = arPodeArrumar(id) && !(typeof cascaNova === 'function' && !cascaNova());
  const editando = id === 'focus' ? (typeof pnEditando !== 'undefined' && pnEditando) : arEditando === id;
  b.hidden = !pode; r.hidden = !pode || !editando || id === 'focus';
  b.classList.toggle('on', !!editando);
  b.title = editando ? 'Terminar de arrumar' : 'Arrumar esta aba (mudar lugar e tamanho dos quadros)'; b.setAttribute('aria-label', b.title);
  b.innerHTML = editando ? arIcone('ok', '✓') : arIcone('lapis', '✎');
  if (alvo && b.parentElement !== alvo) alvo.insertBefore(b, alvo.firstChild);
  if (alvo && r.parentElement !== alvo) alvo.insertBefore(r, b.nextSibling);
}

// ───────────────────────────── arrastar e esticar ──────────────────────────
// os botões ("−/+" recolhe e abre — o "+" vale também fora da edição; ↑↓ no toque)
document.addEventListener('click', e => {
  const b = e.target.closest('.ar-grade > .sp-quadro > .ar-recolher, .ar-grade > .sp-quadro > .ar-setas button'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const q = b.closest('.sp-quadro');
  if (b.classList.contains('ar-recolher')) arRecolher(q); else arMoverUm(q, Number(b.dataset.dir));
}, true);
document.addEventListener('pointerdown', e => {
  if (!arEditando || e.button > 0) return;
  const q = e.target.closest(`#${arEditando} .ar-grade > .sp-quadro`); if (!q) return;
  if (e.target.closest('.ar-recolher, .ar-setas')) return;
  if (e.target.closest('.ar-canto')) return arEsticar(e, q);
  const naAlca = !!e.target.closest('.ar-alca');
  if (e.pointerType !== 'mouse' && !naAlca) return;          // no toque, só pela alça: o resto rola a página
  arArrastar(e, q);
}, true);
function arDefDe(g) { return AR_GRADES.find(d => d.chave === g.dataset.arGrade); }
function arGuardarOrdem(g) { const c = arCfgGrade(g.dataset.arGrade); c.ordem = [...g.querySelectorAll(':scope > .sp-quadro')].map(arChaveQuadro); arGravar(); }
function arFlip(g, mexer) {
  const lista = [...g.querySelectorAll(':scope > .sp-quadro')], antes = new Map(lista.map(x => [x, x.getBoundingClientRect()]));
  mexer();
  if (document.hidden || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  lista.forEach(x => { const a = antes.get(x), b = x.getBoundingClientRect(); if (a && (a.left !== b.left || a.top !== b.top)) x.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
}
function arMoverUm(q, dir) {
  const g = q.parentElement, lista = [...g.querySelectorAll(':scope > .sp-quadro')], k = lista.indexOf(q), j = k + dir;
  if (j < 0 || j >= lista.length) return;
  arFlip(g, () => { if (dir < 0) g.insertBefore(q, lista[j]); else g.insertBefore(q, lista[j].nextSibling); });
  arGuardarOrdem(g);
}
function arRecolher(q) {
  const g = q.parentElement, c = arCfgGrade(g.dataset.arGrade), k = arChaveQuadro(q);
  if (c.recolhidos[k]) delete c.recolhidos[k]; else c.recolhidos[k] = 1;
  arGravar(); arFlip(g, () => { q.classList.toggle('ar-recolhido', !!c.recolhidos[k]); arAtualizarRecolher(q); });
  if (typeof agendarAjuste === 'function') agendarAjuste();
}
/** Mesmo gesto do Painel: um fantasma segue o ponteiro e os vizinhos abrem lugar (FLIP). */
function arArrastar(e, q) {
  e.preventDefault();
  const g = q.parentElement, r = q.getBoundingClientRect();
  const fantasma = q.cloneNode(true); fantasma.classList.add('ar-fantasma');
  Object.assign(fantasma.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(fantasma); q.classList.add('ar-vaga');
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  const rolador = document.querySelector('body[data-casca="nova"] > .container') || document.scrollingElement;
  let ultimo = 0, rolar = 0, raf = 0;
  const passo = () => { if (rolar) { rolador.scrollTop += rolar; raf = requestAnimationFrame(passo); } else raf = 0; };
  const mover = ev => {
    fantasma.style.transform = `translate(${ev.clientX - dx - r.left}px, ${ev.clientY - dy - r.top}px) rotate(1deg)`;
    const rr = rolador.getBoundingClientRect ? rolador.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    rolar = ev.clientY < rr.top + 60 ? -10 : ev.clientY > rr.bottom - 60 ? 10 : 0;
    if (rolar && !raf) raf = requestAnimationFrame(passo);
    if (Date.now() - ultimo < 60) return; ultimo = Date.now();
    fantasma.style.visibility = 'hidden'; const el = document.elementFromPoint(ev.clientX, ev.clientY); fantasma.style.visibility = '';
    const sobre = el && el.closest('.sp-quadro'); if (!sobre || sobre === q || sobre.parentElement !== g) return;
    const lista = [...g.querySelectorAll(':scope > .sp-quadro')];
    arFlip(g, () => { if (lista.indexOf(q) > lista.indexOf(sobre)) g.insertBefore(q, sobre); else g.insertBefore(q, sobre.nextSibling); });
  };
  const soltar = () => {
    window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
    rolar = 0; fantasma.remove(); q.classList.remove('ar-vaga'); arGuardarOrdem(g);
  };
  window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
}
/** O canto: largura em colunas da grade e altura em linhas de 60 px, ao vivo. */
function arEsticar(e, q) {
  e.preventDefault(); e.stopPropagation();
  const g = q.parentElement, est = getComputedStyle(g), r = q.getBoundingClientRect();
  const cols = arColunas(g), gap = parseFloat(est.columnGap) || 12, gapL = parseFloat(est.rowGap) || 12;
  const colW = (g.clientWidth - gap * (cols - 1)) / cols;
  const c = arCfgGrade(g.dataset.arGrade), k = arChaveQuadro(q);
  q.classList.add('ar-esticando');
  const mover = ev => {
    const querC = Math.max(1, Math.min(cols, Math.round((ev.clientX - r.left + gap) / (colW + gap))));
    const querL = Math.max(1, Math.round((ev.clientY - r.top + gapL) / (AR_LINHA + gapL)));
    const atual = c.tam[k] || {};
    if (atual.c === querC && atual.l === querL) return;
    c.tam[k] = { c: querC, l: querL };
    arFlip(g, () => { q.style.gridColumn = `span ${querC}`; q.style.minHeight = (querL * AR_LINHA + (querL - 1) * gapL) + 'px'; });
  };
  const soltar = () => {
    window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
    q.classList.remove('ar-esticando'); arGravar();
    if (typeof agendarAjuste === 'function') agendarAjuste();
  };
  window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
}

// ───────────────────────────── ganchos ─────────────────────────────────────
// quem redesenha um painel recria os quadros: o arranjo é reposto logo depois
AR_GRADES.forEach(d => {
  const f = window[d.render]; if (typeof f !== 'function') return;
  window[d.render] = function () { const r = f.apply(this, arguments); arAplicarGrade(d); return r; };
});
// trocar de aba termina a edição e põe o ✎ na aba nova
if (typeof changeTab === 'function') {
  const _ctAr = changeTab;
  changeTab = function () { const r = _ctAr.apply(this, arguments); if (arEditando) arSair(); setTimeout(() => { arBotoes(); arAplicarTudo(); }, 0); return r; };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && arEditando) arSair(); });
// a grade muda de número de colunas com a largura: a largura guardada se ajusta (span ≤ colunas)
window.addEventListener('resize', () => { clearTimeout(window._arRes); window._arRes = setTimeout(arAplicarTudo, 200); });
arAplicarTudo(); arBotoes();

// ════════════════════════════════════════════════════════════════════════════
// VISTA EM BARRAS nas abas (10/10/2026, C2 levado às outras abas)
// ────────────────────────────────────────────────────────────────────────────
// A Config já tinha "▦ Cartões | ☰ Barras". Ele escolheu levar às outras abas como
// opção na ⚙ de cada uma (o padrão continua Cartões; por aparelho, prefs.abaVista).
// Em Barras, cada micro-aba vira uma FAIXA (ícone + nome + resumo de uma linha);
// um toque abre a seção logo abaixo da faixa, e só uma fica aberta.
// Nada muda de lugar no HTML: a aba vira uma coluna (flex) e a posição na tela vem
// do `order` — as faixas são irmãs das seções, e a seção aberta ganha a ordem logo
// depois da faixa dela. Quem troca a seção continua sendo o clique na micro-aba
// (escondida), então tudo o que a troca já fazia (redesenhos, filtros) segue igual.
// ════════════════════════════════════════════════════════════════════════════
/** O resumo de uma linha de cada faixa (aba/seção). Seção sem resumo aqui usa os títulos dos cartões dela. */
const AB_RESUMOS = {
  'home/cal': 'Dia, semana e mês num lugar só', 'home/compromissos': 'Os próximos e o que marcar',
  'home/reunioes': 'Pauta, ata e encaminhamentos', 'home/plantoes': 'Escala, turnos e o que falta receber',
  'finances/painel': 'O mês num olhar: rio, calendário e potes', 'finances/lancamentos': 'Extrato do banco, nova transação e histórico',
  'finances/orcamento': 'Quanto já foi de cada pote', 'finances/recorrentes': 'Contas e entradas que se repetem',
  'finances/analise': 'Por categoria e os últimos meses',
  'tasks/foco': 'O que importa hoje', 'tasks/listas': 'Todas as listas de tarefas', 'tasks/rotinas': 'O que se repete',
  'notes/notas': 'Mural ou caderno, com marcadores', 'notes/listas': 'Listas de marcar', 'notes/entregas': 'Compras e o que está para chegar',
  'studies/mesa': 'A semana por tema e o livro aberto', 'studies/estante': 'Livros, cursos e materiais',
  'studies/sessoes': 'O caminho do estudo e as sessões', 'studies/ritual': 'O estudo semanal de negócios',
  'business/painel': 'Mercado, carteira, metas e projetos de relance', 'business/mercado': 'Cotações e gráficos',
  'business/noticias': 'O que saiu', 'business/carteira': 'Ativos, aportes e resgates', 'business/metas': 'As trilhas e as metas',
  'business/projetos': 'Projetos de negócio',
  'health/painel': 'Treino, corpo, comida e médico de relance', 'health/treinos': 'Fichas e treinos feitos',
  'health/medidas': 'O corpo hoje, peso e medidas', 'health/comida': 'Planos alimentares e refeições',
  'health/medico': 'Remédios, prevenção, consultas e exames',
  'leisure/midia': 'Filmes, séries e documentários', 'leisure/saidas': 'Museus, shows e programas', 'leisure/musica': 'Playlists por momento',
  'trips/viagens': 'As viagens, planejadas e feitas', 'trips/milhas': 'Programas e saldos de milhas',
  'net/contatos': 'Pessoas, aniversários e quem retomar', 'net/curriculo': 'Experiência e formação',
  'clinic/painel': 'O mês da clínica, repasses e comissões', 'clinic/funil': 'Quem chegou e em que etapa está',
  'clinic/servicos': 'O que a clínica vende',
  'prod/painel': 'A oficina de relance', 'prod/fila': 'As ordens na fila', 'prod/catalogo': 'Produtos e custo real',
  'prod/estoque': 'O filamento em estoque', 'prod/vendas': 'As vendas registradas', 'prod/config': 'Impressoras e bases de cálculo'
};
// aba → false quando uma faixa está aberta. Começa tudo fechado (como na Config): a 1ª vista é o mapa da aba
// inteira numa tela só — "ver tudo de uma vez, ampliar quando quiser". Vale até recarregar.
const abFechada = {};

function cfgAbaVista() { prefs.abaVista = prefs.abaVista || {}; return prefs.abaVista; }
function abVista(aba) { return cfgAbaVista()[aba] === 'barras' ? 'barras' : 'cartoes'; }
function abMudarVista(aba, v) {
  const c = cfgAbaVista(); if (v === 'barras') c[aba] = 'barras'; else delete c[aba];
  arGravar(); delete abFechada[aba]; abAplicar(aba);
  if (typeof renderConfigAba === 'function') renderConfigAba();
}
/** A fileira das micro-abas da aba (direto na aba ou dentro da barra do alto), ou null. */
function abFileira(sec) { return sec ? sec.querySelector(':scope > .focus-header-tabs[id$="-secoes"], :scope > .cs-barra-aba > .focus-header-tabs[id$="-secoes"]') : null; }
/** As micro-abas que aparecem (uma desligada na ⚙ — ex.: Entregas — não vira faixa). */
function abChips(fileira) { return [...fileira.querySelectorAll(':scope > span')].filter(s => !s.hidden && s.style.display !== 'none'); }
function abNomeSecao(ch) { const m = (ch.getAttribute('onclick') || '').match(/\(\s*'([^']+)'/); return m ? m[1] : ''; }
/** Resumo de reserva: os títulos dos cartões da seção, sem emoji e sem repetir. */
function abResumoDosTitulos(sec, nome) {
  const s = nome && (sec.querySelector(`.agenda-sec[id$="-${CSS.escape(nome)}"]`) || document.getElementById('sec-' + nome));
  if (!s) return '';
  const vistos = new Set();
  return [...s.querySelectorAll('.card > h2, .card > .mod-corpo > h2')].map(h => {
    const k = h.cloneNode(true); k.querySelectorAll('small, button, select, input, .badge').forEach(e => e.remove());
    return k.textContent.replace(/[\p{Extended_Pictographic}️]/gu, '').trim().replace(/\s+/g, ' ');
  }).filter(t => t && !vistos.has(t) && vistos.add(t)).slice(0, 3).join(' · ');
}
function abAplicar(aba) {
  const sec = document.getElementById(aba), fileira = abFileira(sec); if (!fileira) return;
  const barras = abVista(aba) === 'barras';
  const linha = fileira.parentElement === sec ? fileira : fileira.parentElement;
  fileira.classList.add('ab-fileira');
  sec.classList.toggle('ab-barras', barras);
  sec.querySelectorAll(':scope > .ab-barra').forEach(b => b.remove());
  [...sec.children].forEach(el => { el.style.order = ''; el.classList.remove('ab-depois'); });
  if (!barras) { sec.classList.remove('ab-fechada'); if (typeof agendarAjuste === 'function') agendarAjuste(); return; }
  const chips = abChips(fileira), ativa = chips.findIndex(s => s.classList.contains('active'));
  const fechada = abFechada[aba] !== false || ativa < 0;
  sec.classList.toggle('ab-fechada', fechada);
  // tudo o que vem depois da fileira (e não flutua por cima, como a ⚙ e o ✎) é conteúdo de seção
  let depois = false;
  [...sec.children].forEach(el => {
    if (el === linha) { depois = true; return; }
    const pos = getComputedStyle(el).position;
    if (depois && pos !== 'absolute' && pos !== 'fixed') el.classList.add('ab-depois');
  });
  chips.forEach((ch, i) => {
    const nome = abNomeSecao(ch), txt = ch.textContent.trim().replace(/\s+/g, ' ');
    const m = txt.match(/^([\p{Extended_Pictographic}️‍]+)\s*(.*)$/u);
    const aberta = i === ativa && !fechada;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ab-barra' + (aberta ? ' aberta' : '');
    b.style.order = 10 + 2 * i;
    b.setAttribute('aria-expanded', aberta ? 'true' : 'false');
    b.innerHTML = `<span class="ab-ic" aria-hidden="true">${esc(m ? m[1] : '')}</span><span class="ab-nome">${esc(m ? m[2] : txt)}</span>` +
      `<small class="ab-resumo">${esc(AB_RESUMOS[aba + '/' + nome] || abResumoDosTitulos(sec, nome))}</small><span class="ab-seta" aria-hidden="true">▾</span>`;
    b.onclick = () => abTocar(aba, i);
    sec.appendChild(b);
  });
  if (!fechada) sec.querySelectorAll(':scope > .ab-depois').forEach(el => { el.style.order = 10 + 2 * ativa + 1; });
  if (typeof agendarAjuste === 'function') agendarAjuste();
}
/** Toque numa faixa: fechada abre (trocando a seção pela micro-aba dela); a aberta fecha. */
function abTocar(aba, i) {
  const sec = document.getElementById(aba), fileira = abFileira(sec); if (!fileira) return;
  const ch = abChips(fileira)[i]; if (!ch) return;
  if (ch.classList.contains('active') && abFechada[aba] === false) { abFechada[aba] = true; abAplicar(aba); return; }
  abFechada[aba] = false;
  if (!ch.classList.contains('active')) ch.click();
  abAplicar(aba);
  // a faixa que abriu fica à vista (o conteúdo de uma faixa de cima pode ter empurrado a página)
  const b = sec.querySelector(':scope > .ab-barra.aberta'); if (!b) return;
  setTimeout(() => { const r = b.getBoundingClientRect(); if (r.top < 60 || r.top > window.innerHeight * 0.5) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
}
function abAplicarTodas() { document.querySelectorAll('.tab-content').forEach(sec => { if (abFileira(sec)) abAplicar(sec.id); }); }
/** O alternador na ⚙ de cada aba que tem micro-abas (antes do que a ⚙ dela já mostrava). */
function abHtmlVista(aba) {
  const b = abVista(aba) === 'barras';
  return `<h4 class="dev-titulo">Como ver esta aba</h4>
    <div class="cfg-vista ab-vista-cfg"><span class="cfg-vista-seg" role="group" aria-label="Como ver esta aba">
      <button type="button" class="${b ? '' : 'on'}" onclick="abMudarVista('${aba}', 'cartoes')">▦ Cartões</button>
      <button type="button" class="${b ? 'on' : ''}" onclick="abMudarVista('${aba}', 'barras')">☰ Barras</button></span>
      <small>${b ? 'Cada parte da aba é uma faixa: toque para abrir, só uma fica aberta.' : 'As partes da aba ficam nas micro-abas do alto.'} Vale neste aparelho.</small></div>`;
}
if (typeof CFG_ABA_EXTRA !== 'undefined') document.querySelectorAll('.tab-content').forEach(sec => {
  if (!abFileira(sec)) return;
  const k = 'btn-' + sec.id, antes = CFG_ABA_EXTRA[k];
  CFG_ABA_EXTRA[k] = () => abHtmlVista(sec.id) + (typeof antes === 'function' ? antes() : '');
});
// quem troca a seção (micro-aba, botão dentro de um quadro, aviso do Painel…) abre a faixa dela
const AB_FUNCOES = {};   // verSecaoX → id da aba
document.querySelectorAll('.tab-content').forEach(sec => {
  const f = abFileira(sec); if (!f) return;
  f.querySelectorAll(':scope > span').forEach(s => {
    const m = (s.getAttribute('onclick') || '').match(/^\s*(verSecao\w+)\(/); if (m) AB_FUNCOES[m[1]] = sec.id;
  });
});
Object.keys(AB_FUNCOES).forEach(fn => {
  const f = window[fn], aba = AB_FUNCOES[fn]; if (typeof f !== 'function') return;
  window[fn] = function () {
    const r = f.apply(this, arguments);
    if (abVista(aba) === 'barras') { abFechada[aba] = false; abAplicar(aba); }
    return r;
  };
});
// uma micro-aba ligada/desligada na ⚙ (ex.: Entregas) muda as faixas
if (typeof aplicarAjustesAba === 'function') {
  const _aaaAb = aplicarAjustesAba;
  aplicarAjustesAba = function () { const r = _aaaAb.apply(this, arguments); abAplicarTodas(); return r; };
}
if (typeof changeTab === 'function') {
  const _ctAb = changeTab;
  changeTab = function () { const r = _ctAb.apply(this, arguments); setTimeout(abAplicarTodas, 0); return r; };
}
abAplicarTodas();
