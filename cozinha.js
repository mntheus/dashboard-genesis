// ════════════════════════════════════════════════════════════════════════════
// COZINHA — a aba da cozinha (20/10/2026, revisão geral, item 10)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: o livro de receitas sai da Saúde para "uma aba própria (Cozinha)", com a lista de compras, os
// pratos prontos, a despensa e "os itens (geladeira / airfryer / etc.), pois serão otimizados em casa
// inteligente no futuro". Desenho aprovado em 20/10, em duas partes:
//   · parte 1 (v74): 📖 Receitas (o receitas.js, só mudou de lugar) · 🛒 Compras · ⚡ Pratos
//   · parte 2 (v75): 🥫 Despensa (módulo 51) · 🔌 Aparelhos (itens do Inventário) · 📊 Painel
// UMA FONTE SÓ para cada dado (armadilha 21): Compras = a MESMA lista "Compras" das Notas (rcListaCompras);
// Pratos = o módulo `pratos` (o diário da Saúde continua usando; o formulário é o prFormHtml da saude.js).
// A parte 1 não cria dado novo nenhum.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

let cozinhaSecao = 'receitas';
const CZ_SECOES = ['receitas', 'compras', 'pratos'];

function verSecaoCozinha(s, el) {
  if (!CZ_SECOES.includes(s)) s = 'receitas';
  cozinhaSecao = s;
  const abas = document.querySelectorAll('#cozinha-secoes > span');
  abas.forEach(x => x.classList.remove('active'));
  // pelo NOME, não pela posição (armadilhas 12 e 80): micro-aba nova na frente não desalinha
  const alvo = el || [...abas].find(x => (x.getAttribute('onclick') || '').includes(`'${s}'`));
  if (alvo) alvo.classList.add('active');
  CZ_SECOES.forEach(k => { const d = document.getElementById('sec-cz-' + k); if (d) d.hidden = k !== s; });
  renderCozinha();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
/** Redesenha o que está à vista na Cozinha (a troca de aba e a sincronização chamam). */
function renderCozinha() {
  if (cozinhaSecao === 'receitas' && typeof rcRender === 'function') rcRender();
  czRenderCompras(); czRenderPratos();
}

// ───────────────────────────── 🛒 compras ─────────────────────────────────
/** A lista de compras das Notas ("Compras", ou mercado/feira). Só nasce quando ele anota o primeiro item. */
function czListaCompras(criar) {
  const l = notes.find(n => !n.archived && Array.isArray(n.checklist) && /compra|mercado|feira|supermerc/i.test(n.title || ''));
  return l || (criar && typeof rcListaCompras === 'function' ? rcListaCompras() : null);
}
function czRenderCompras() {
  const el = document.getElementById('cz-compras'); if (!el) return;
  const l = czListaCompras(false), itens = (l ? l.checklist : []).map((it, i) => ({ it, i }));
  const abertos = itens.filter(x => !x.it.done), feitos = itens.filter(x => x.it.done);
  // dentro de onclick vai o ÍNDICE, nunca o texto (armadilha 8)
  const linha = ({ it, i }) => `<li class="cz-item${it.done ? ' feito' : ''}">
      <button type="button" class="cz-marca" onclick="czMarcarCompra(${i})" aria-pressed="${it.done ? 'true' : 'false'}" title="${it.done ? 'Voltar para a lista' : 'Comprado'}">${it.done ? '✓' : ''}</button>
      <span class="cz-item-tx">${esc(it.text)}</span>
      <button type="button" class="cz-tirar" onclick="czTirarCompra(${i})" title="Tirar da lista" aria-label="Tirar da lista">✕</button></li>`;
  el.innerHTML = `<form class="cz-add" onsubmit="event.preventDefault(); czAddCompra()">
      <input type="text" id="cz-compra-novo" placeholder="O que falta comprar? (leite, 2 kg de arroz…)" autocomplete="off" enterkeyhint="done" aria-label="Item para comprar">
      <button type="submit" title="Pôr na lista" aria-label="Pôr na lista">＋</button></form>
    <ul class="cz-lista">${abertos.map(linha).join('') || '<li class="cz-vazio">Nada para comprar. Anote acima, ou use o 🛒 de uma receita.</li>'}</ul>
    ${feitos.length ? `<details class="cz-feitos"><summary>Comprados · ${feitos.length}</summary><ul class="cz-lista">${feitos.map(linha).join('')}</ul>
      <button type="button" class="mini-btn" onclick="czLimparComprados()">Tirar os comprados da lista</button></details>` : ''}
    <p class="cz-pe">É a mesma lista "${esc(l ? l.title : 'Compras')}" das Notas: o que muda aqui muda lá.</p>`;
}
function czMudouCompras(l) {
  l.updatedAt = Date.now(); salvar('notes', notes);
  if (typeof renderNotes === 'function') renderNotes();
  czRenderCompras();
}
function czAddCompra() {
  const inp = document.getElementById('cz-compra-novo'); const t = (inp && inp.value || '').trim(); if (!t) return;
  const l = czListaCompras(true);
  if (l.checklist.some(x => !x.done && String(x.text).trim().toLowerCase() === t.toLowerCase())) { toast('Já está na lista.'); inp.value = ''; return; }
  l.checklist.push({ text: t, done: false, nivel: 0 });
  czMudouCompras(l);
  const n = document.getElementById('cz-compra-novo'); if (n) n.focus();
}
function czMarcarCompra(i) {
  const l = czListaCompras(false); if (!l || !l.checklist[i]) return;
  l.checklist[i].done = !l.checklist[i].done; czMudouCompras(l);
}
function czTirarCompra(i) {
  const l = czListaCompras(false); if (!l || !l.checklist[i]) return;
  l.checklist.splice(i, 1); czMudouCompras(l);
}
function czLimparComprados() {
  const l = czListaCompras(false); if (!l) return;
  const n = l.checklist.filter(x => x.done).length; if (!n) return;
  l.checklist = l.checklist.filter(x => !x.done); czMudouCompras(l);
  toast(`🧹 ${plural(n, 'item comprado saiu', 'itens comprados saíram')} da lista.`);
}

// ───────────────────────────── ⚡ pratos prontos ──────────────────────────
let czPrForm = null;   // null = fechado · 'novo' · id do prato
function czRenderPratos() {
  const el = document.getElementById('cz-pratos'); if (!el || typeof pratos === 'undefined') return;
  const lista = typeof prOrdenados === 'function' ? prOrdenados(prTipoAgora()) : pratos;
  const f = czPrForm !== null ? (pratos.find(x => x.id === czPrForm) || {}) : null;
  const sub = p => [TIPOS_REFEICAO[p.tipo] ? TIPOS_REFEICAO[p.tipo][1] : 'qualquer hora', prNumeros(p), p.usos ? plural(p.usos, 'vez', 'vezes') : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<div class="cz-pratos">${lista.map(p => `<div class="cz-prato${czPrForm === p.id ? ' editando' : ''}">
        <span class="cz-prato-ic" aria-hidden="true">${(TIPOS_REFEICAO[p.tipo] || ['⚡'])[0]}</span>
        <span class="cz-prato-tx"><b>${esc(p.nome)}</b><small>${esc(sub(p))}</small></span>
        <button type="button" class="mini-btn" onclick="prRegistrar(${p.id}); czRenderPratos()" title="Anota no diário de hoje, na hora">🍽️ Comi agora</button>
        <button type="button" class="mini-btn" onclick="czPrAbrir(${p.id})" title="Mudar ou apagar" aria-label="Mudar ou apagar">✎</button></div>`).join('')
      || '<p class="cz-vazio">Nenhum prato pronto ainda. A refeição que se repete vira um toque: ＋ Novo prato, a ☆ de uma refeição do diário (Saúde → Comida) ou o ⚡ de uma receita.</p>'}</div>
    ${f ? prFormHtml(f, 'cz-pr', czPrForm === 'novo', { guardar: 'czPrGuardar()', apagar: `czPrApagar(${czPrForm})`, cancelar: 'czPrAbrir(null)' })
      : '<button type="button" class="mini-btn cz-prato-novo" onclick="czPrAbrir(\'novo\')">＋ Novo prato</button>'}`;
  if (f) setTimeout(() => { const i = document.getElementById('cz-pr-nome'); if (i && !i.value) i.focus(); }, 30);
}
function czPrAbrir(id) { czPrForm = id; czRenderPratos(); }
function czPrGuardar() { if (!prGravarForm('cz-pr', czPrForm)) return; czPrForm = null; czRenderPratos(); if (typeof prRenderRapidos === 'function') prRenderRapidos(); }
function czPrApagar(id) { if (prApagar(id)) czPrForm = null; czRenderPratos(); }
