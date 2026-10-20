// ════════════════════════════════════════════════════════════════════════════
// LIVRO DE RECEITAS (19/10/2026) — módulo 50: `receitas`
// ────────────────────────────────────────────────────────────────────────────
// Ideias dele (caderno da Saúde, 15/10): "adicionar uma aba de livro de receitas interativa (páginas deslizando
// da direita para esquerda)" e "deve ser sincronizada com lista de compras e notas também, a fim de cada item da
// receita poder ser apresentado como itens de lista para compras e futuramente fazer também uma aba de geladeira
// com apresentação 3D".
// Onde: (20/10) a aba 🍳 Cozinha → 📖 Receitas (antes era a Saúde; a cozinha.js tem as compras e os pratos).
//
// O livro: um sumário e uma página dupla por receita (no celular, uma página só). Vira com o dedo (arrastar para
// a esquerda = próxima), com ‹ › ou com as setas do teclado. Na página: as porções recalculam as quantidades,
// cada ingrediente tem o "tenho", e os passos se marcam enquanto cozinha (isso é estado da tela, não dado).
// Ligações: 🛒 o que falta vai para a lista de compras (Notas → Listas, a lista "Compras"); 🍽️ vai para o diário
// de refeições de hoje; ⚡ vira prato pronto. A geladeira 3D fica para depois — o "tenho" é o começo dela.
// Foto: só o ENDEREÇO da Wikipédia (nada de imagem na sincronização) e só quando ele pede (nome de receita engana).
// Carrega ANTES do app.js: aqui só se declara. Regra da União: SYNC_MODULOS, export, import e redesenharTudo.
// ════════════════════════════════════════════════════════════════════════════
const RC_CATS = { cafe: ['☕', 'Café da manhã'], almoco: ['🍛', 'Almoço'], jantar: ['🍲', 'Jantar'], lanche: ['🥪', 'Lanche'], doce: ['🍰', 'Doce'], bebida: ['🥤', 'Bebida'], outro: ['🍽️', 'Outro'] };
const RC_COR = { cafe: '#f59e0b', almoco: '#fb923c', jantar: '#a78bfa', lanche: '#22c55e', doce: '#f472b6', bebida: '#38bdf8', outro: '#94a3b8' };
// estado da TELA (não sincroniza): a página aberta, o filtro, e o que ele marcou enquanto cozinha
const rcEstado = { pag: 0, dir: 0, cat: '', busca: '', porcoes: {}, tenho: {}, feitos: {}, engole: 0 };

// ───────────────────────────── contas ─────────────────────────────────────
function rcCat(k) { return RC_CATS[k] ? k : 'outro'; }
function rcFiltradas() {
  const b = (typeof tarSemAcento === 'function' ? tarSemAcento : s => String(s || '').toLowerCase())(rcEstado.busca || '');
  const ordem = Object.keys(RC_CATS);
  return receitas.filter(r => (!rcEstado.cat || rcCat(r.cat) === rcEstado.cat)
      && (!b || (typeof tarSemAcento === 'function' ? tarSemAcento : s => String(s).toLowerCase())(`${r.nome} ${(r.ingredientes || []).join(' ')} ${(r.tags || []).join(' ')}`).includes(b)))
    .sort((a, c) => ordem.indexOf(rcCat(a.cat)) - ordem.indexOf(rcCat(c.cat)) || String(a.nome).localeCompare(String(c.nome)));
}
const RC_FRACOES = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
function rcNum(s) {
  s = String(s).replace(/\s/g, '');
  if (RC_FRACOES[s] !== undefined) return RC_FRACOES[s];
  if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split('/').map(Number); return b ? a / b : a; }
  return Number(s.replace(',', '.'));
}
function rcFmt(v) {
  if (Math.abs(v - Math.round(v)) < 0.05) return String(Math.round(v));
  const i = Math.floor(v), f = v - i;
  for (const [s, k] of Object.entries(RC_FRACOES)) if (Math.abs(f - k) < 0.04) return (i ? i + ' ' : '') + s;
  return v.toFixed(1).replace('.', ',');
}
/** "200 g de frango" × 1,5 → "300 g de frango"; "½ xícara" × 2 → "1 xícara"; sem número, fica como está. */
function rcEscalar(txt, fator) {
  if (!fator || Math.abs(fator - 1) < 0.001) return txt;
  return String(txt).replace(/^\s*(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])/, m => rcFmt(rcNum(m) * fator));
}
function rcPorcoes(r) { return rcEstado.porcoes[r.id] || Number(r.porcoes) || 1; }

// ───────────────────────────── o desenho ──────────────────────────────────
function rcRender() {
  const el = document.getElementById('rc-livro'); if (!el) return;
  const sel = document.getElementById('rc-cat');
  if (sel && !sel.options.length) sel.innerHTML = Object.entries(RC_CATS).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('');
  if (!el.dataset.montado) {
    el.dataset.montado = '1';
    el.innerHTML = `<div class="rc-barra">
        <input type="search" id="rc-busca" class="rc-busca" placeholder="Buscar receita ou ingrediente…" autocomplete="off" oninput="rcBuscar(this.value)">
        <div class="rc-cats" id="rc-cats"></div>
      </div>
      <div class="rc-palco" id="rc-palco">
        <button type="button" class="rc-seta esq" id="rc-seta-esq" onclick="rcVirar(-1)" aria-label="Página anterior">‹</button>
        <div class="rc-folha-box" id="rc-folha-box"></div>
        <button type="button" class="rc-seta dir" id="rc-seta-dir" onclick="rcVirar(1)" aria-label="Próxima página">›</button>
      </div>
      <div class="rc-rodape" id="rc-rodape"></div>`;
    rcLigarDedo(document.getElementById('rc-palco'));
  }
  const cats = document.getElementById('rc-cats');
  if (cats) cats.innerHTML = `<button type="button" class="rc-cat${rcEstado.cat ? '' : ' on'}" onclick="rcFiltrar('')">Todas <small>${receitas.length}</small></button>` +
    Object.entries(RC_CATS).filter(([k]) => receitas.some(r => rcCat(r.cat) === k)).map(([k, v]) =>
      `<button type="button" class="rc-cat${rcEstado.cat === k ? ' on' : ''}" style="--c:${RC_COR[k]}" onclick="rcFiltrar('${k}')">${v[0]} ${v[1]} <small>${receitas.filter(r => rcCat(r.cat) === k).length}</small></button>`).join('');
  rcDesenharFolha();
}
function rcDesenharFolha() {
  const box = document.getElementById('rc-folha-box'); if (!box) return;
  const lista = rcFiltradas();
  if (rcEstado.pag > lista.length) rcEstado.pag = lista.length;
  if (rcEstado.pag < 0) rcEstado.pag = 0;
  const r = rcEstado.pag ? lista[rcEstado.pag - 1] : null;
  const anim = rcEstado.dir > 0 ? ' vira-frente' : rcEstado.dir < 0 ? ' vira-tras' : '';
  rcEstado.dir = 0;
  box.innerHTML = `<article class="rc-folha${r ? '' : ' sumario'}${anim}" style="--c:${r ? RC_COR[rcCat(r.cat)] : 'var(--acento)'}">${r ? rcPagina(r, rcEstado.pag) : rcSumario(lista)}</article>`;
  const esq = document.getElementById('rc-seta-esq'), dir = document.getElementById('rc-seta-dir');
  if (esq) esq.disabled = rcEstado.pag === 0;
  if (dir) dir.disabled = rcEstado.pag >= lista.length;
  const rod = document.getElementById('rc-rodape');
  if (rod) {
    const n = lista.length + 1;
    rod.innerHTML = `<button type="button" class="mini-btn" onclick="rcVirar(-1)" ${rcEstado.pag === 0 ? 'disabled' : ''} aria-label="Página anterior">‹</button>
      ${n <= 18 ? `<span class="rc-pontos">${Array.from({ length: n }, (_, i) => `<button type="button" class="${i === rcEstado.pag ? 'on' : ''}" onclick="rcIr(${i})" aria-label="${i ? 'Página ' + i : 'Sumário'}"></button>`).join('')}</span>` : ''}
      <small>${rcEstado.pag ? `${rcEstado.pag} de ${lista.length}` : 'sumário'}</small>
      <button type="button" class="mini-btn" onclick="rcVirar(1)" ${rcEstado.pag >= lista.length ? 'disabled' : ''} aria-label="Próxima página">›</button>`;
  }
}
function rcSumario(lista) {
  if (!receitas.length) return `<div class="rc-pag rc-sum"><h3>📖 Meu livro de receitas</h3>
      <p class="rc-vazio">O livro está em branco. Toque em <b>＋ Nova receita</b> no alto da aba e escreva a primeira — os ingredientes um por linha, o modo de preparo um passo por linha.</p></div>`;
  if (!lista.length) return `<div class="rc-pag rc-sum"><h3>📖 Sumário</h3><p class="rc-vazio">Nenhuma receita com esse filtro.</p></div>`;
  const grupos = Object.keys(RC_CATS).map(k => ({ k, l: lista.map((r, i) => ({ r, n: i + 1 })).filter(x => rcCat(x.r.cat) === k) })).filter(g => g.l.length);
  const mais = receitas.slice().sort((a, b) => (b.vezes || 0) - (a.vezes || 0))[0];
  return `<div class="rc-pag rc-sum"><h3>📖 Sumário</h3>
    <div class="rc-sum-col">${grupos.map(g => `<section class="rc-sum-g" style="--c:${RC_COR[g.k]}"><h4>${RC_CATS[g.k][0]} ${RC_CATS[g.k][1]}</h4>
      ${g.l.map(({ r, n }) => `<button type="button" class="rc-sum-l" onclick="rcIr(${n})"><span>${r.fav ? '⭐ ' : ''}${esc(r.nome)}</span><i></i><b>${n}</b></button>`).join('')}</section>`).join('')}</div>
    <p class="rc-sum-pe">${plural(receitas.length, 'receita', 'receitas')}${mais && mais.vezes ? ` · a mais feita: <b>${esc(mais.nome)}</b> (${plural(mais.vezes, 'vez', 'vezes')})` : ''} · arraste para o lado para folhear</p></div>`;
}
function rcPagina(r, n) {
  const p = rcPorcoes(r), fator = p / (Number(r.porcoes) || 1);
  const ten = rcTenhoMapa(r), fei = rcEstado.feitos[r.id] || {};
  const ings = r.ingredientes || [], passos = r.passos || [];
  const temN = ings.filter((_, i) => ten[i]).length, falta = ings.length - temN;
  const c = RC_CATS[rcCat(r.cat)];
  const kcal = Number(r.kcal) || 0, prot = Number(r.prot) || 0;
  const busc = typeof ilustrando !== 'undefined' && ilustrando.has(r.id);
  const esqP = `<div class="rc-pag esq">
      <div class="rc-foto">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="rc-foto-ic">${busc ? '⏳' : c[0]}</span>
        ${r.img ? `<button type="button" class="mini-btn rc-foto-bt" onclick="rcTirarFoto(${r.id})" title="Tirar a foto">×</button>` : `<button type="button" class="mini-btn rc-foto-bt" onclick="rcFoto(${r.id})" title="Procurar uma foto na Wikipédia">🖼️ foto</button>`}</div>
      <h3>${r.fav ? '⭐ ' : ''}${esc(r.nome)}</h3>
      <div class="rc-meta"><span class="rc-cat-rot">${c[0]} ${c[1]}</span>${Number(r.tempo) ? `<span>⏱️ ${r.tempo} min</span>` : ''}
        <span class="rc-porc"><button type="button" onclick="rcMudarPorcoes(${r.id}, -1)" aria-label="Menos uma porção">−</button><b>${p}</b> ${palavra(p, 'porção', 'porções')}<button type="button" onclick="rcMudarPorcoes(${r.id}, 1)" aria-label="Mais uma porção">＋</button></span>
        ${kcal || prot ? `<span>🔥 ${[kcal ? Math.round(kcal) + ' kcal' : '', prot ? Math.round(prot) + ' g prot' : ''].filter(Boolean).join(' · ')}/porção</span>` : ''}</div>
      <div class="rc-tit-sec"><b>Ingredientes</b><small>${ings.length ? `tenho ${temN} de ${ings.length}` : ''}</small></div>
      <ul class="rc-ings">${ings.map((t, i) => `<li><button type="button" class="rc-ing${ten[i] ? ' tem' : ''}" aria-pressed="${!!ten[i]}" onclick="rcTenho(${r.id}, ${i})"><i></i><span>${esc(rcEscalar(t, fator))}</span></button></li>`).join('') || '<li class="rc-vazio">Sem ingredientes escritos.</li>'}</ul>
      ${ings.length ? `<button type="button" class="rc-compras" onclick="rcCompras(${r.id})" ${falta ? '' : 'disabled'}>🛒 ${falta ? `Pôr ${palavra(falta, 'o que falta', 'os ' + falta + ' que faltam')} na lista de compras` : 'Tem tudo em casa'}</button>` : ''}
      <span class="rc-num">${n * 2 - 1}</span></div>`;
  const dirP = `<div class="rc-pag dir">
      <div class="rc-tit-sec"><b>Modo de preparo</b><small>${passos.length ? `${passos.filter((_, i) => fei[i]).length} de ${passos.length}` : ''}</small></div>
      <ol class="rc-passos">${passos.map((t, i) => `<li><button type="button" class="rc-passo${fei[i] ? ' ok' : ''}" onclick="rcPasso(${r.id}, ${i})"><b>${i + 1}</b><span>${esc(t)}</span></button></li>`).join('') || '<li class="rc-vazio">Sem passos escritos.</li>'}</ol>
      ${r.notas ? `<p class="rc-notas">📝 ${esc(r.notas)}</p>` : ''}
      ${r.fonte ? `<p class="rc-fonte">${/^https?:\/\//i.test(r.fonte) ? `<a href="${esc(r.fonte)}" target="_blank" rel="noopener">🔗 de onde veio</a>` : '📚 ' + esc(r.fonte)}</p>` : ''}
      <div class="rc-acoes">
        <button type="button" class="mini-btn" onclick="rcFiz(${r.id})" title="Conta mais uma vez que você fez">✓ Fiz hoje</button>
        <button type="button" class="mini-btn" onclick="rcComi(${r.id})" title="Anota uma porção no diário de refeições de hoje">🍽️ Anotar no diário</button>
        <button type="button" class="mini-btn" onclick="rcPrato(${r.id})" title="Vira um botão em Cozinha → Pratos (e em Saúde → Comida)">⚡ Prato pronto</button>
        <button type="button" class="mini-btn${r.fav ? ' on' : ''}" onclick="rcFav(${r.id})" title="Favorita">⭐</button>
        <button type="button" class="mini-btn" onclick="rcEditar(${r.id})" title="Mudar a receita">✎</button>
        <button type="button" class="mini-btn" onclick="rcApagar(${r.id})" title="Apagar a receita">🗑</button>
      </div>
      <small class="rc-feita">${r.vezes ? `Feita ${plural(r.vezes, 'vez', 'vezes')}${r.ultimaVez ? ' · a última em ' + isoParaBR(r.ultimaVez).slice(0, 5) : ''}` : 'Ainda não marcada como feita'}</small>
      <span class="rc-num">${n * 2}</span></div>`;
  return esqP + dirP;
}

// ───────────────────────────── folhear ────────────────────────────────────
function rcIr(n) { const tot = rcFiltradas().length; n = Math.max(0, Math.min(tot, n)); if (n === rcEstado.pag) return; rcEstado.dir = n > rcEstado.pag ? 1 : -1; rcEstado.pag = n; rcDesenharFolha(); }
function rcVirar(d) { rcIr(rcEstado.pag + d); }
function rcBuscar(v) { rcEstado.busca = v; rcEstado.pag = rcFiltradas().length === 1 ? 1 : 0; rcDesenharFolha(); }
function rcFiltrar(k) { rcEstado.cat = k; rcEstado.pag = 0; rcRender(); }
/** Arrastar para a esquerda = próxima página (como num livro de verdade); para a direita = anterior. */
function rcLigarDedo(palco) {
  if (!palco) return;
  let ini = null;
  palco.addEventListener('pointerdown', e => { if (e.target.closest('input, textarea, select, a')) { ini = null; return; } ini = { x: e.clientX, y: e.clientY, t: Date.now() }; });
  palco.addEventListener('pointerup', e => {
    if (!ini) return; const dx = e.clientX - ini.x, dy = e.clientY - ini.y; ini = null;
    // vira DEPOIS do clique que o navegador manda logo após soltar o dedo (ele cai no filtro abaixo e some);
    // virar na hora trocaria a página e o clique acertaria o botão da página nova
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { rcEstado.engole = Date.now(); setTimeout(() => rcVirar(dx < 0 ? 1 : -1), 0); }
  });
  palco.addEventListener('pointercancel', () => { ini = null; });
  // o arrasto que virou a página não pode também marcar o ingrediente onde o dedo começou
  palco.addEventListener('click', e => { if (Date.now() - rcEstado.engole < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
}
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const sec = document.getElementById('sec-cz-receitas');   // (20/10) o livro mudou da Saúde para a Cozinha
  if (!sec || sec.hidden || !sec.checkVisibility || !sec.checkVisibility()) return;
  if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
  if (document.body.classList.contains('cs-com-folha')) return;
  e.preventDefault(); rcVirar(e.key === 'ArrowRight' ? 1 : -1);
});

// ───────────────────────────── os toques da página ────────────────────────
/** O "tenho" de cada ingrediente: o que ele tocou vale; o que não tocou vem da Despensa da Cozinha (20/10, czTem). */
function rcTenhoMapa(r) {
  const toque = rcEstado.tenho[r.id] || {}, m = {};
  (r.ingredientes || []).forEach((t, i) => { m[i] = i in toque ? !!toque[i] : (typeof czTem === 'function' && czTem(t)); });
  return m;
}
function rcTenho(id, i) { const r = rcAchar(id); if (!r) return; const t = rcEstado.tenho[id] = rcEstado.tenho[id] || {}; t[i] = !rcTenhoMapa(r)[i]; rcDesenharFolha(); }
function rcPasso(id, i) { const t = rcEstado.feitos[id] = rcEstado.feitos[id] || {}; t[i] = !t[i]; rcDesenharFolha(); }
function rcMudarPorcoes(id, d) { const r = receitas.find(x => x.id === id); if (!r) return; rcEstado.porcoes[id] = Math.max(1, Math.min(40, rcPorcoes(r) + d)); rcDesenharFolha(); }
function rcAchar(id) { return receitas.find(x => x.id === id); }
/** A lista de compras é uma lista de marcar das Notas: a que se chama "Compras" (ou mercado/feira); se não houver, nasce. */
function rcListaCompras() {
  let l = notes.find(n => !n.archived && Array.isArray(n.checklist) && /compra|mercado|feira|supermerc/i.test(n.title || ''));
  if (!l) {
    l = { id: novoId(), title: 'Compras', content: '', checklist: [], color: 'yellow', labels: ['casa'], pinned: true, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
    notes.push(l);
  }
  return l;
}
function rcCompras(id) {
  const r = rcAchar(id); if (!r) return;
  const ten = rcTenhoMapa(r), fator = rcPorcoes(r) / (Number(r.porcoes) || 1);
  const l = rcListaCompras(), ja = new Set(l.checklist.filter(i => !i.done).map(i => String(i.text).trim().toLowerCase()));
  let n = 0;
  (r.ingredientes || []).forEach((t, i) => {
    if (ten[i]) return;
    const txt = rcEscalar(t, fator).trim(); if (!txt || ja.has(txt.toLowerCase())) return;
    l.checklist.push({ text: txt, done: false, nivel: 0 }); ja.add(txt.toLowerCase()); n++;
  });
  if (!n) { toast(`A lista "${l.title}" já tem tudo o que falta.`); return; }
  l.updatedAt = Date.now(); salvar('notes', notes);
  if (typeof renderNotes === 'function') renderNotes();
  if (typeof czRenderCompras === 'function') czRenderCompras();
  toast(`🛒 ${plural(n, 'item foi', 'itens foram')} para a lista "${l.title}" (Cozinha → Compras).`, 5000);
}
function rcFiz(id) {
  const r = rcAchar(id); if (!r) return;
  r.vezes = (r.vezes || 0) + 1; r.ultimaVez = hojeISO(); salvar('receitas', receitas); rcDesenharFolha();
  toast(`✓ ${r.nome}: ${plural(r.vezes, 'vez', 'vezes')} no livro.`);
}
function rcTipoRefeicao(r) { const c = rcCat(r.cat); return ['cafe', 'almoco', 'lanche', 'jantar'].includes(c) ? c : (typeof prTipoAgora === 'function' ? prTipoAgora() : 'lanche'); }
function rcComi(id) {
  const r = rcAchar(id); if (!r) return;
  const m = { id: novoId(), date: hojeISO(), time: new Date().toTimeString().slice(0, 5), type: rcTipoRefeicao(r), desc: r.nome, quality: 'boa', receitaId: r.id };
  if (Number(r.kcal)) m.kcal = Number(r.kcal);
  if (Number(r.prot)) m.prot = Number(r.prot);
  meals.push(m); salvar('meals', meals);
  if (typeof renderSaude === 'function') renderSaude();
  toast(`🍽️ ${r.nome} anotado no diário de hoje (${(TIPOS_REFEICAO[m.type] || ['', 'refeição'])[1].toLowerCase()}).`, 4000);
}
function rcPrato(id) {
  const r = rcAchar(id); if (!r) return;
  if (pratos.some(p => String(p.nome).trim().toLowerCase() === String(r.nome).trim().toLowerCase())) { toast('Esse prato já está nos pratos prontos.'); return; }
  pratos.push({ id: novoId(), nome: r.nome, tipo: ['cafe', 'almoco', 'lanche', 'jantar'].includes(rcCat(r.cat)) ? rcCat(r.cat) : '', kcal: Math.round(Number(r.kcal) || 0), prot: Math.round(Number(r.prot) || 0), usos: 0, criadoEm: Date.now() });
  salvar('pratos', pratos);
  if (typeof prRenderRapidos === 'function') prRenderRapidos();
  if (typeof czRenderPratos === 'function') czRenderPratos();
  toast(`⚡ ${r.nome} virou prato pronto: está em Cozinha → Pratos.`, 4500);
}
function rcFav(id) { const r = rcAchar(id); if (!r) return; r.fav = !r.fav; salvar('receitas', receitas); rcRender(); }
function rcApagar(id) {
  const r = rcAchar(id); if (!r || !confirm(`Apagar a receita "${r.nome}"? (o que já foi para a lista de compras e o diário continua lá)`)) return;
  receitas = receitas.filter(x => x.id !== id); salvar('receitas', receitas); rcEstado.pag = 0; rcRender();
}
async function rcFoto(id) {
  const r = rcAchar(id); if (!r || (typeof ilustrando !== 'undefined' && ilustrando.has(id))) return;
  if (!navigator.onLine) { toast('Sem internet agora. A foto precisa de rede.', 4000); return; }
  if (typeof buscarNaWikipedia !== 'function') return;
  ilustrando.add(id); rcDesenharFolha();
  let achou = null;
  try { achou = await buscarNaWikipedia(r.nome, r.nome); } finally { ilustrando.delete(id); }
  if (achou && achou.img) { r.img = achou.img; r.wiki = achou.wiki || ''; salvar('receitas', receitas); }
  else toast(`Não achei foto de "${r.nome}" na Wikipédia. Com um nome mais simples (ex.: "Feijoada") costuma achar.`, 6000);
  rcDesenharFolha();
}
function rcTirarFoto(id) { const r = rcAchar(id); if (!r) return; r.img = ''; r.wiki = ''; salvar('receitas', receitas); rcDesenharFolha(); }

// ───────────────────────────── o formulário (vira folha no alto da aba) ───
function rcLinhas(id) { return String((document.getElementById(id) || {}).value || '').split('\n').map(s => s.trim()).filter(Boolean); }
function rcSalvar(e) {
  if (e) e.preventDefault();
  const nome = (document.getElementById('rc-nome').value || '').trim(); if (!nome) return;
  const idv = document.getElementById('rc-id').value;
  const dados = { nome, cat: document.getElementById('rc-cat').value || 'outro',
    tempo: Number(document.getElementById('rc-tempo').value) || 0, porcoes: Math.max(1, Number(document.getElementById('rc-porcoes').value) || 1),
    ingredientes: rcLinhas('rc-ingredientes'), passos: rcLinhas('rc-passos'),
    kcal: Number(document.getElementById('rc-kcal').value) || 0, prot: Number(document.getElementById('rc-prot').value) || 0,
    fonte: (document.getElementById('rc-fonte').value || '').trim(), notas: (document.getElementById('rc-notas').value || '').trim() };
  let r;
  if (idv) { r = rcAchar(Number(idv)); if (!r) return; Object.assign(r, dados); delete rcEstado.porcoes[r.id]; }
  else { r = { id: novoId(), ...dados, img: '', fav: false, vezes: 0, ultimaVez: '', criadoEm: Date.now() }; receitas.push(r); }
  salvar('receitas', receitas);
  rcLimparForm();
  rcEstado.busca = ''; rcEstado.cat = ''; const b = document.getElementById('rc-busca'); if (b) b.value = '';
  rcRender();
  rcIr(rcFiltradas().findIndex(x => x.id === r.id) + 1);
  toast(idv ? `📖 ${r.nome} atualizada.` : `📖 ${r.nome} entrou no livro.`);
}
function rcLimparForm() {
  ['rc-id', 'rc-nome', 'rc-tempo', 'rc-ingredientes', 'rc-passos', 'rc-kcal', 'rc-prot', 'rc-fonte', 'rc-notas'].forEach(i => { const x = document.getElementById(i); if (x) x.value = ''; });
  const p = document.getElementById('rc-porcoes'); if (p) p.value = 2;
  const t = document.getElementById('rc-form-tit'); if (t) t.textContent = '📖 Nova receita';
  const s = document.getElementById('rc-submit'); if (s) s.textContent = 'Guardar receita';
  const c = document.getElementById('rc-cancel'); if (c) c.hidden = true;
  if (typeof redesenharListas === 'function') redesenharListas();
}
function rcEditar(id) {
  const r = rcAchar(id); if (!r) return;
  rcRender();
  document.getElementById('rc-id').value = r.id;
  document.getElementById('rc-nome').value = r.nome || '';
  document.getElementById('rc-cat').value = rcCat(r.cat);
  document.getElementById('rc-tempo').value = r.tempo || '';
  document.getElementById('rc-porcoes').value = r.porcoes || 1;
  document.getElementById('rc-ingredientes').value = (r.ingredientes || []).join('\n');
  document.getElementById('rc-passos').value = (r.passos || []).join('\n');
  document.getElementById('rc-kcal').value = r.kcal || '';
  document.getElementById('rc-prot').value = r.prot || '';
  document.getElementById('rc-fonte').value = r.fonte || '';
  document.getElementById('rc-notas').value = r.notas || '';
  const t = document.getElementById('rc-form-tit'); if (t) t.textContent = '✎ Editar receita';
  const s = document.getElementById('rc-submit'); if (s) s.textContent = 'Salvar';
  const c = document.getElementById('rc-cancel'); if (c) c.hidden = false;
  if (typeof redesenharListas === 'function') redesenharListas();
  // dar foco num campo da folha fechada abre a folha (casca.js)
  document.getElementById('rc-nome').focus();
}
function rcNova() { rcLimparForm(); rcRender(); const n = document.getElementById('rc-nome'); if (n) n.focus(); }
