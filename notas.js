// ════════════════════════════════════════════════════════════════════════════
// NOTAS — O MURAL, O CADERNO, AS LISTAS DE MERCADO E O RASTREADOR (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • a BARRA RÁPIDA (a mesma de Tarefas): "ideia do app #genesis" vira nota com
//     marcador; "lista compras: leite, pão" vira lista; "!" fixa no topo;
//   • NOTAS em duas formas, à escolha dele ("ter ambas como opções"):
//       – MURAL de post-its: a cor da nota no papel inteiro, alturas diferentes
//         encaixadas como tijolos, as fixadas no alto com tachinha;
//       – CADERNO em duas colunas: a lista à esquerda e a nota aberta à direita,
//         editada ali mesmo (no celular a nota abre por cima);
//     A escolha mora no botão da tela e no ⚙ Ajustes da aba (`cfgAba('btn-notes').caderno`);
//   • LISTAS de verificação com cara de lista de mercado: barra de progresso,
//     itens grandes, os feitos recolhidos no pé, o 🛒 que manda para Entregas;
//   • ENTREGAS como rastreador: a trilha 🛒──🚚──📦 e a contagem até chegar.
// Uma superfície só para editar: a NOTA ABERTA (pop-up ou página do caderno),
// que salva sozinha enquanto ele escreve. O formulário antigo saiu.
// Nenhum dado novo: `notes` e `orders` continuam com o mesmo formato.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const NT_SECOES = ['notas', 'listas', 'entregas'];
let notasSecao = 'notas';
const ntEstado = { aberta: null, salvarTimer: null, feitosAbertos: {}, itemAtivo: -1 };

// ───────────────────────────── utilidades ─────────────────────────────────
// ── AS CORES DO MURAL (09/10, ditado dele): "uma gama maior de cores, dividida em cores com contraste
//    grande entre elas, como uma aquarela; cores mais transparentes, tipo as de agora; e gamas
//    minimalistas, tipo paleta inteira — uma mais acinzentada, uma esverdeada, uma azulada, uma rosé.
//    Para a gente fazer esses testes sem encher muito o visual." O ESTILO vale por aparelho (prefs) e não
//    mexe no dado: a nota continua guardando a cor dela; na PALETA cada cor vira um tom da família.
const NT_ESTILOS_COR = { transparente: 'Transparente', aquarela: 'Aquarela', paleta: 'Paleta' };
// seis tons por família, alternando claro / médio / fundo (vizinhos no arco-íris caem em tons bem diferentes)
const NT_PALETAS = {
  grafite: { nome: 'Grafite', tons: ['#e4e4e7', '#a1a1aa', '#3f3f46', '#cbd5e1', '#475569', '#8b98ab'] },
  salvia:  { nome: 'Sálvia',  tons: ['#dbe7c9', '#9dbf8a', '#3f6b4f', '#b9d4b0', '#55805e', '#7fa88f'] },
  oceano:  { nome: 'Oceano',  tons: ['#cfe0f3', '#7eaee0', '#2f5f8f', '#9cc9d9', '#3a6ea8', '#5d8fc4'] },
  rose:    { nome: 'Rosé',    tons: ['#f7d6dd', '#e597a9', '#93415a', '#f2b9a8', '#b8566f', '#d27a8f'] },
  areia:   { nome: 'Areia',   tons: ['#f1e6d0', '#d9bd8c', '#7d5d3a', '#e6cfa8', '#a07a4a', '#c4a06e'] },
  lavanda: { nome: 'Lavanda', tons: ['#e6defa', '#b3a1e0', '#58449a', '#cfc0ef', '#7059b8', '#9884d4'] }
};
function ntCfgCores() {
  const c = cfgAba('btn-notes');
  if (!NT_ESTILOS_COR[c.corEstilo]) c.corEstilo = 'transparente';
  if (!NT_PALETAS[c.corPaleta]) c.corPaleta = 'salvia';
  return c;
}
function ntHue(n) {
  const k = n.color || 'default', base = corNota(k).hue || '';
  if (!base) return '';
  const c = ntCfgCores();
  if (c.corEstilo !== 'paleta') return base;
  const tons = NT_PALETAS[c.corPaleta].tons, chaves = Object.keys(CORES_NOTA).filter(x => x !== 'default');
  return tons[Math.max(0, chaves.indexOf(k)) % tons.length];
}
function aplicarCoresNotas() {
  const s = document.getElementById('notes'); if (!s) return;
  const c = ntCfgCores(); s.dataset.ntCor = c.corEstilo; s.dataset.ntPaleta = c.corPaleta;
  const pop = document.getElementById('nt-cores-pop'); if (pop) pop.innerHTML = ntHtmlCores();
  const bt = document.getElementById('nt-cores-bt'); if (bt) bt.innerHTML = `<span class="nt-cores-amostra">${ntAmostra(c)}</span><span>${NT_ESTILOS_COR[c.corEstilo]}${c.corEstilo === 'paleta' ? ' · ' + NT_PALETAS[c.corPaleta].nome : ''}</span>`;
}
function ntMudarCores(campo, v) {
  ntCfgCores()[campo] = v;
  if (campo === 'corPaleta') ntCfgCores().corEstilo = 'paleta';
  gravarCfgAba();
  aplicarCoresNotas(); renderNotes();
  if (typeof renderConfigAba === 'function' && typeof abaConfigAtual !== 'undefined' && abaConfigAtual === 'btn-notes') renderConfigAba();
}
/** Quatro bolinhas que mostram o estilo (no botão e em cada família). */
function ntAmostra(c, paleta) {
  const tons = paleta ? NT_PALETAS[paleta].tons : c.corEstilo === 'paleta' ? NT_PALETAS[c.corPaleta].tons : ['#ef4444', '#eab308', '#22c55e', '#3b82f6'];
  return tons.slice(0, 4).map(t => `<i style="background:${t}"></i>`).join('');
}
function ntHtmlCores() {
  const c = ntCfgCores();
  return `<div class="nt-cores-linha"><span class="nt-cores-rot">Estilo</span><span class="nt-cores-seg">${Object.entries(NT_ESTILOS_COR).map(([k, nome]) => `<button type="button" class="${c.corEstilo === k ? 'on' : ''}" onclick="ntMudarCores('corEstilo', '${k}')">${nome}</button>`).join('')}</span></div>
    <div class="nt-cores-linha"><span class="nt-cores-rot">Paletas</span><span class="nt-cores-fams">${Object.entries(NT_PALETAS).map(([k, p]) => `<button type="button" class="nt-fam${c.corEstilo === 'paleta' && c.corPaleta === k ? ' on' : ''}" onclick="ntMudarCores('corPaleta', '${k}')" title="Paleta ${p.nome}"><span class="nt-cores-amostra">${ntAmostra(c, k)}</span>${p.nome}</button>`).join('')}</span></div>
    <p class="nt-cores-dica">Vale só neste aparelho. A cor de cada nota não muda: na paleta, cada cor vira um tom da família.</p>`;
}
function ntEhLista(n) { return Array.isArray(n.checklist); }
function ntQuando(n) { return new Date(n.updatedAt || n.createdAt || n.id).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', ''); }
function ntCaderno() { return !!cfgAba('btn-notes').caderno; }
/** O caderno só vira duas colunas se couber; abaixo disso a nota abre por cima. */
function ntCadernoLargo() { const el = document.getElementById('note-list'); return !!el && el.clientWidth >= 680; }

/** As notas visíveis pelos filtros (busca, marcador, fixadas/arquivadas), de um tipo. */
function ntVisiveis(tipo) {
  const juntoArquivadas = !!cfgAba('btn-notes').arquivadas;
  let vis = notes.filter(n => noteFilter === 'arquivadas' ? n.archived : (juntoArquivadas && noteFilter === 'ativas') || !n.archived);
  if (noteFilter === 'fixadas') vis = vis.filter(n => n.pinned);
  if (noteLabel) vis = vis.filter(n => (n.labels || []).includes(noteLabel));
  if (noteSearch) vis = vis.filter(n => `${n.title || ''} ${n.content || ''} ${(n.checklist || []).map(c => c.text).join(' ')} ${(n.labels || []).join(' ')}`.toLowerCase().includes(noteSearch));
  if (tipo === 'texto') vis = vis.filter(n => !ntEhLista(n));
  if (tipo === 'lista') vis = vis.filter(ntEhLista);
  return vis.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
}
function ntMarcadoresHTML(n) { return (n.labels || []).map(l => `<span class="nt-marc">${esc(l)}</span>`).join(''); }

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function ntEntender(txt) {
  let resto = String(txt || ''), pinned = false; const labels = [];
  resto = resto.replace(/(^|\s)(!+|📌)(?=\s|$)/gu, () => { pinned = true; return ' '; });
  resto = resto.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (m, a, nome) => {
    const ex = todosMarcadores().find(l => tarSemAcento(l) === tarSemAcento(nome));
    const v = ex || nome; if (!labels.includes(v)) labels.push(v);
    return ' ';
  });
  resto = resto.replace(/[ \t]+/g, ' ').trim();
  const itens = s => s.split(/\s*[,;]\s*/).map(x => x.trim()).filter(Boolean);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const m = resto.match(/^lista\b([^:]*):\s*(.*)$/i);
  if (m) return { tipo: 'lista', title: cap(m[1].trim()) || 'Lista', itens: itens(m[2]), labels, pinned };
  if (notasSecao === 'listas') {
    const k = resto.match(/^([^:]+?)\s*:\s+(.*)$/);
    return { tipo: 'lista', title: cap(k ? k[1] : resto), itens: k ? itens(k[2]) : [], labels, pinned };
  }
  const curta = resto.length <= 60;
  return { tipo: 'texto', title: curta ? resto : '', content: curta ? '' : resto, labels, pinned };
}
function ntRapidaPrevia() {
  const el = document.getElementById('nt-rapida-previa'), inp = document.getElementById('nt-rapida'); if (!el || !inp) return;
  if (!inp.value.trim()) {
    el.innerHTML = notasSecao === 'listas'
      ? '<span class="tar-dica">Ex.: <b>Mala da viagem: escova, carregador, protetor</b> — vira lista. <b>#marcador</b> e <b>!</b> (fixar) também valem.</span>'
      : '<span class="tar-dica">Ex.: <b>ideia do app #genesis</b> vira nota · <b>lista compras: leite, pão</b> vira lista · <b>!</b> fixa no topo.</span>';
    return;
  }
  const e = ntEntender(inp.value), partes = [];
  partes.push(e.tipo === 'lista'
    ? `<span class="tar-lt" style="--cor:var(--ok)">☑️ lista${e.itens.length ? ` com ${plural(e.itens.length, 'item', 'itens')}` : ' vazia'}</span>`
    : '<span class="tar-lt" style="--cor:var(--info)">📝 nota</span>');
  e.labels.forEach(l => partes.push(`<span class="nt-marc">${esc(l)}</span>`));
  if (e.pinned) partes.push('<span class="tar-estrela-tag">📌 fixada</span>');
  const nome = e.tipo === 'lista' ? e.title : (e.title || e.content.slice(0, 50) + '…');
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(nome || '…')}</b> ${partes.join(' ')}`;
}
function ntRapidaAdicionar() {
  const inp = document.getElementById('nt-rapida'); if (!inp) return;
  const e = ntEntender(inp.value);
  if (e.tipo === 'texto' && !e.title && !e.content) { inp.focus(); return; }
  if (e.tipo === 'lista' && !e.title && !e.itens.length) { inp.focus(); return; }
  const n = { id: novoId(), title: e.title, content: e.content || '', checklist: e.tipo === 'lista' ? e.itens.map(t => ({ text: t, done: false })) : null,
    color: e.tipo === 'lista' ? 'yellow' : 'default', labels: e.labels, pinned: e.pinned, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  notes.push(n); salvar('notes', notes);
  inp.value = ''; ntRapidaPrevia();
  if (e.tipo === 'lista' && notasSecao !== 'listas') verSecaoNotas('listas');
  renderNotes();
  toast(e.tipo === 'lista' ? `☑️ Lista "${n.title}" criada${e.itens.length ? ` com ${plural(e.itens.length, 'item', 'itens')}` : ''}.` : '📝 Nota salva.');
  if (e.tipo === 'lista' && !e.itens.length) { const c = document.querySelector(`.nt-lista[data-id="${n.id}"] .nt-add input`); if (c) c.focus(); }
  else inp.focus();
}

// ═══════════════════════ 2. A NOTA ABERTA (o editor) ══════════════════════
function ntEditorHTML(n) {
  const lista = ntEhLista(n), hue = ntHue(n);
  // as bolinhas mostram a cor COMO ELA VAI APARECER (na paleta, o tom da família)
  const cores = Object.entries(CORES_NOTA).map(([k, c]) => `<button type="button" class="nt-cor${(n.color || 'default') === k ? ' sel' : ''}" style="--c:${ntHue({ color: k }) || 'transparent'}" title="${c.nome}" onclick="ntCor(${n.id}, '${k}')"></button>`).join('');
  return `<div class="nt-ed${lista ? ' e-lista' : ''}" data-id="${n.id}" style="--nh:${hue || 'transparent'}">
    <input type="text" class="nt-ed-tit" value="${esc(n.title || '')}" placeholder="${lista ? 'Nome da lista' : 'Título'}" aria-label="Título" oninput="ntDigitou(${n.id}, 'title', this.value)">
    ${lista ? ntEdItens(n) : `<textarea class="nt-ed-txt" placeholder="Escreva…" aria-label="Texto da nota" oninput="ntDigitou(${n.id}, 'content', this.value); ntCrescer(this)">${esc(n.content || '')}</textarea>`}
    <div class="nt-ed-cores" role="group" aria-label="Cor">${cores}</div>
    <input type="text" class="nt-ed-marc" value="${esc((n.labels || []).join(', '))}" placeholder="🏷️ marcadores, separados por vírgula" aria-label="Marcadores" onchange="ntMarcadores(${n.id}, this.value)">
    <div class="nt-ed-acoes">
      <button type="button" class="mini-btn${n.pinned ? ' on' : ''}" onclick="fixarNota(${n.id})">📌 ${n.pinned ? 'fixada' : 'fixar'}</button>
      <button type="button" class="mini-btn" onclick="ntArquivar(${n.id})">${n.archived ? '📤 desarquivar' : '🗄️ arquivar'}</button>
      <button type="button" class="mini-btn" onclick="ntConverter(${n.id})" title="${lista ? 'Virar nota de texto' : 'Virar lista de verificação (uma linha por item)'}">${lista ? '📝 virar texto' : '☑️ virar lista'}</button>
      <button type="button" class="mini-btn" onclick="ntApagar(${n.id})">🗑️ apagar</button>
      <span class="nt-ed-salvo">salva sozinha · ${ntQuando(n)}</span>
    </div>
  </div>`;
}
function ntEdItens(n) {
  return `<div class="nt-ed-itens">${n.checklist.map((i, k) => `<div class="nt-it nivel-${i.nivel || 0}${i.done ? ' feito' : ''}${k === ntEstado.itemAtivo ? ' ativo' : ''}">
      <input type="checkbox" ${i.done ? 'checked' : ''} aria-label="Marcar" onchange="toggleItemNota(${n.id}, ${k})">
      <input type="text" class="nt-it-tx" value="${esc(i.text)}" aria-label="Item" onchange="ntItemTexto(${n.id}, ${k}, this.value)" onkeydown="ntItemTecla(event, ${n.id}, ${k}, this)" onfocus="ntItemAtivo(this, ${k})">
      <span class="nt-it-ferr">
        <button type="button" class="mini-btn xs" title="Recuar (subitem)" onclick="indentarItem(${n.id}, ${k}, 1)">⇥</button><button type="button" class="mini-btn xs" title="Avançar" onclick="indentarItem(${n.id}, ${k}, -1)">⇤</button><button type="button" class="mini-btn xs" title="Virar tarefa" onclick="itemViraTarefa(${n.id}, ${k})">✅</button><button type="button" class="mini-btn xs${nAnexos(i) ? ' on' : ''}" title="Anexos" onclick="abrirAnexos('item', ${n.id}, ${k})">📎</button><button type="button" class="mini-btn xs" title="Comprei — mandar para Entregas" onclick="abrirCompra(${n.id}, ${k})">🛒</button><button type="button" class="mini-btn xs" title="Tirar o item" onclick="ntTirarItem(${n.id}, ${k})">✕</button>
      </span>
    </div>`).join('')}
    <div class="nt-add"><input type="text" placeholder="＋ novo item (Enter)" aria-label="Novo item" onkeydown="if (event.key === 'Enter') { event.preventDefault(); ntAddItem(${n.id}, this); }"></div>
  </div>`;
}
/** No celular as ferramentas do item só aparecem no item tocado (classe, não foco: no iPhone o botão não recebe foco). */
function ntItemAtivo(inp, k) { ntEstado.itemAtivo = k; const box = inp.closest('.nt-ed-itens'); if (!box) return; box.querySelectorAll('.nt-it.ativo').forEach(x => x.classList.remove('ativo')); inp.closest('.nt-it').classList.add('ativo'); }
/** Enquanto ele digita: grava (com respiro) e redesenha só as vistas, nunca o editor. */
function ntDigitou(id, campo, v) {
  const n = notes.find(x => x.id === id); if (!n) return;
  n[campo] = v; n.updatedAt = Date.now();
  clearTimeout(ntEstado.salvarTimer);
  ntEstado.salvarTimer = setTimeout(() => { salvar('notes', notes); ntRenderVistasLeve(); }, 500);
}
function ntGravarJa() { if (ntEstado.salvarTimer) { clearTimeout(ntEstado.salvarTimer); ntEstado.salvarTimer = null; salvar('notes', notes); } }
function ntCrescer(t) { t.style.height = 'auto'; t.style.height = Math.min(Math.max(t.scrollHeight, 160), 2000) + 'px'; }
function ntCor(id, k) { const n = notes.find(x => x.id === id); if (!n) return; n.color = k; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function ntMarcadores(id, v) {
  const n = notes.find(x => x.id === id); if (!n) return;
  n.labels = String(v).split(',').map(s => s.trim()).filter(Boolean); n.updatedAt = Date.now();
  salvar('notes', notes); ntRenderVistasLeve(); renderFiltrosNota();
}
function ntItemTexto(id, k, v) {
  const n = notes.find(x => x.id === id); if (!n || !n.checklist[k]) return;
  v = v.trim(); if (!v) return;
  n.checklist[k].text = v; n.updatedAt = Date.now(); salvar('notes', notes); ntRenderVistasLeve();
}
function ntItemTecla(ev, id, k, inp) {
  if (ev.key === 'Enter') { ev.preventDefault(); ntItemTexto(id, k, inp.value); ntAddItem(id, null, k + 1); }
  if (ev.key === 'Backspace' && !inp.value) { ev.preventDefault(); ntTirarItem(id, k, true); }
}
/** Novo item: no fim (pelo campo "＋ novo item") ou logo abaixo (Enter num item). */
function ntAddItem(id, input, pos) {
  const n = notes.find(x => x.id === id); if (!n) return;
  if (!Array.isArray(n.checklist)) n.checklist = [];
  const v = input ? (input.value || '').trim() : '';
  if (input && !v) return;
  const onde = pos === undefined ? n.checklist.length : pos;
  const nivel = onde > 0 && n.checklist[onde - 1] ? (n.checklist[onde - 1].nivel || 0) : 0;
  n.checklist.splice(onde, 0, { text: v, done: false, nivel });
  n.updatedAt = Date.now();
  if (v) salvar('notes', notes);
  renderNotes();
  // o foco volta para onde ele estava escrevendo
  const raiz = input && input.closest('.nt-lista') ? `.nt-lista[data-id="${id}"]` : `.nt-ed[data-id="${id}"]`;
  const alvo = input ? document.querySelector(`${raiz} .nt-add input`) : document.querySelectorAll(`.nt-ed[data-id="${id}"] .nt-it-tx`)[onde];
  if (alvo) alvo.focus();
}
function ntTirarItem(id, k, focarAnterior) {
  const n = notes.find(x => x.id === id); if (!n || !n.checklist[k]) return;
  n.checklist.splice(k, 1); n.updatedAt = Date.now(); salvar('notes', notes); renderNotes();
  if (focarAnterior) { const ant = document.querySelectorAll(`.nt-ed[data-id="${id}"] .nt-it-tx`)[Math.max(0, k - 1)]; if (ant) ant.focus(); }
}
function ntConverter(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  if (ntEhLista(n)) { n.content = n.checklist.map(i => (i.done ? '✓ ' : '') + i.text).join('\n'); n.checklist = null; }
  else { n.checklist = String(n.content || '').split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ text: t.replace(/^[-•*]\s*/, ''), done: false })); n.content = ''; }
  n.updatedAt = Date.now(); salvar('notes', notes); renderNotes();
}
function ntArquivar(id) { arquivarNota(id); const n = notes.find(x => x.id === id); if (n && n.archived && noteFilter !== 'arquivadas') ntFechar(); }
function ntApagar(id) {
  const n = notes.find(x => x.id === id); if (!n || !confirm(`Apagar a nota "${n.title || '(sem título)'}"?`)) return;
  notes = notes.filter(x => x.id !== id); salvar('notes', notes);
  ntEstado.aberta = null; ntFecharModal(); renderNotes();
}
/** Abre a nota: na página do caderno (se couber) ou no pop-up. */
function ntAbrir(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  ntGravarJa();
  if (ntEstado.aberta !== id) ntEstado.itemAtivo = -1;
  ntEstado.aberta = id;
  if (notasSecao !== (ntEhLista(n) ? 'listas' : 'notas') && document.getElementById('sec-nt-notas')) verSecaoNotas(ntEhLista(n) ? 'listas' : 'notas');
  if (!ntEhLista(n) && ntCaderno() && ntCadernoLargo()) { ntRenderNotas(); const t = document.querySelector('#nt-cad-pagina .nt-ed-tit'); if (t && !n.title) t.focus(); return; }
  const m = document.getElementById('nt-leitor'); if (!m) return;
  document.getElementById('nt-leitor-tit').textContent = ntEhLista(n) ? '☑️ Lista' : '📝 Nota';
  document.getElementById('nt-leitor-corpo').innerHTML = ntEditorHTML(n);
  m.style.display = 'flex';
  const ta = m.querySelector('.nt-ed-txt'); if (ta) ntCrescer(ta);
  setTimeout(() => { const f = n.title ? (ta || m.querySelector('.nt-add input')) : m.querySelector('.nt-ed-tit'); if (f) f.focus(); }, 60);
}
function ntNova(tipo) {
  const n = { id: novoId(), title: '', content: '', checklist: tipo === 'lista' ? [] : null, color: tipo === 'lista' ? 'yellow' : 'default', labels: noteLabel ? [noteLabel] : [], pinned: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() };
  notes.push(n); ntAbrir(n.id);
}
function ntFecharModal() { const m = document.getElementById('nt-leitor'); if (m) m.style.display = 'none'; }
/** Fecha a nota; a que ficou vazia (criada e abandonada) some sem perguntar. */
function ntFechar() {
  ntGravarJa();
  const n = notes.find(x => x.id === ntEstado.aberta);
  if (n && !(n.title || '').trim() && !(n.content || '').trim() && !(n.checklist || []).some(i => (i.text || '').trim())) { notes = notes.filter(x => x !== n); salvar('notes', notes); }
  else if (n) salvar('notes', notes);
  ntEstado.aberta = null; ntFecharModal(); renderNotes();
}

// ═══════════════════════ 3. AS NOTAS: MURAL E CADERNO ═════════════════════
function ntPostit(n, i) {
  const hue = ntHue(n);
  return `<article class="nt-post${hue ? ' cor' : ''}${n.pinned ? ' fixa' : ''}${n.archived ? ' arquivada' : ''}" style="--nh:${hue || 'transparent'}; --rot:${i % 3 === 0 ? -0.5 : i % 3 === 1 ? 0.4 : 0}deg" data-id="${n.id}" tabindex="0" onclick="ntAbrir(${n.id})" onkeydown="if (event.key === 'Enter') ntAbrir(${n.id})">
    ${n.pinned ? '<span class="nt-tacha" aria-hidden="true">📌</span>' : ''}
    ${n.title ? `<h4>${esc(n.title)}</h4>` : ''}
    ${n.content ? `<div class="nt-post-corpo">${linkify(esc(n.content))}</div>` : ''}
    <footer>${ntMarcadoresHTML(n)}<small>${n.archived ? '🗄️ ' : ''}${ntQuando(n)}</small></footer>
  </article>`;
}
function ntCadItem(n) {
  const linhas = String(n.content || '').split('\n').filter(Boolean);
  const titulo = n.title || linhas.shift() || 'Sem título';
  return `<button type="button" class="nt-cad-item${ntEstado.aberta === n.id ? ' sel' : ''}" style="--nh:${ntHue(n) || 'var(--fio-sutil)'}" onclick="ntAbrir(${n.id})">
    <b>${n.pinned ? '📌 ' : ''}${esc(titulo)}</b><span>${esc(linhas.join(' ').slice(0, 90)) || '&nbsp;'}</span><small>${ntQuando(n)}${(n.labels || []).length ? ' · ' + esc(n.labels.join(', ')) : ''}</small>
  </button>`;
}
function ntRenderNotas() {
  const el = document.getElementById('note-list'); if (!el) return;
  const vis = ntVisiveis('texto');
  const cont = document.getElementById('note-count'); if (cont) cont.textContent = plural(vis.length, 'nota', 'notas');
  const vista = document.getElementById('nt-vista');
  if (vista) vista.innerHTML = `<span class="${ntCaderno() ? '' : 'active'}" onclick="ntTrocarVista(false)">🧱 Mural</span><span class="${ntCaderno() ? 'active' : ''}" onclick="ntTrocarVista(true)">📓 Caderno</span>`;
  const novo = `<button type="button" class="nt-novo" onclick="ntNova('texto')">＋ Nova nota</button>`;
  if (!vis.length) { el.innerHTML = `<div class="sp-vazio">Nenhuma nota aqui. Escreva na barra acima ou ${novo}</div>`; return; }
  if (ntCaderno() && ntCadernoLargo()) {
    const aberta = vis.find(n => n.id === ntEstado.aberta) || (ntEstado.aberta ? notes.find(n => n.id === ntEstado.aberta && !ntEhLista(n)) : null) || vis[0];
    ntEstado.aberta = aberta.id;
    el.innerHTML = `<div class="nt-caderno"><div class="nt-cad-lista">${novo}${vis.map(ntCadItem).join('')}</div><div class="nt-cad-pagina" id="nt-cad-pagina">${ntEditorHTML(aberta)}</div></div>`;
    const ta = el.querySelector('.nt-ed-txt'); if (ta) ntCrescer(ta);
    return;
  }
  if (ntCaderno()) { el.innerHTML = `<div class="nt-cad-lista estreita">${novo}${vis.map(ntCadItem).join('')}</div>`; return; }
  const fix = vis.filter(n => n.pinned), resto = vis.filter(n => !n.pinned);
  const bloco = (tit, lst) => lst.length ? `${tit ? `<h3 class="tar-gr-tit">${tit} <small>${lst.length}</small></h3>` : ''}<div class="nt-mural">${lst.map(ntPostit).join('')}</div>` : '';
  el.innerHTML = (fix.length && resto.length ? bloco('📌 Fixadas', fix) + bloco('Outras', resto) : bloco('', vis)) + `<div class="nt-pe">${novo}</div>`;
}
function ntTrocarVista(caderno) { cfgAba('btn-notes').caderno = !!caderno; gravarCfgAba(); ntRenderNotas(); }

// ═════════════════════ 4. AS LISTAS DE MERCADO ════════════════════════════
function ntListaCartao(n) {
  const itens = n.checklist.map((i, k) => ({ i, k })), pend = itens.filter(x => !x.i.done), feitos = itens.filter(x => x.i.done);
  const tot = itens.length, pct = tot ? Math.round(feitos.length / tot * 100) : 0, aberto = !!ntEstado.feitosAbertos[n.id];
  const linha = ({ i, k }) => `<div class="nt-li nivel-${i.nivel || 0}${i.done ? ' feito' : ''}">
      <label class="nt-li-ok"><input type="checkbox" ${i.done ? 'checked' : ''} onchange="toggleItemNota(${n.id}, ${k})"><span class="nt-li-tx">${textoComLink(i.text)}</span></label>
      ${chipsAnexos(i, 'item', n.id, k)}
      ${i.done ? '' : `<button type="button" class="nt-li-comprei" title="Comprei — mandar para Entregas" onclick="abrirCompra(${n.id}, ${k})">🛒</button>`}
    </div>`;
  return `<article class="nt-lista${n.archived ? ' arquivada' : ''}" data-id="${n.id}" style="--nh:${ntHue(n) || 'var(--ok)'}">
    <header onclick="ntAbrir(${n.id})" title="Abrir a lista inteira"><h4>${n.pinned ? '📌 ' : ''}${esc(n.title || 'Lista')}</h4><span class="nt-lista-n${tot && !pend.length ? ' completa' : ''}">${feitos.length}/${tot}</span></header>
    <div class="nt-barra" title="${pct}% feito"><i style="width:${pct}%"></i></div>
    <div class="nt-itens">${pend.length ? pend.map(linha).join('') : `<div class="nt-li-vazio">${tot ? '🎉 Tudo feito.' : 'Lista vazia — escreva o primeiro item.'}</div>`}</div>
    <div class="nt-add"><input type="text" placeholder="＋ item (Enter)" aria-label="Novo item em ${esc(n.title || 'lista')}" onkeydown="if (event.key === 'Enter') { event.preventDefault(); ntAddItem(${n.id}, this); }"></div>
    ${feitos.length ? `<button type="button" class="nt-feitos" onclick="ntEstado.feitosAbertos[${n.id}] = !ntEstado.feitosAbertos[${n.id}]; ntRenderListas();">${aberto ? '▾' : '▸'} ✓ ${plural(feitos.length, 'feito', 'feitos')}</button>${aberto ? `<div class="nt-itens feitos">${feitos.map(linha).join('')}</div>` : ''}` : ''}
    <footer>${ntMarcadoresHTML(n)}<span class="nt-lista-acoes">${feitos.length ? `<button type="button" class="mini-btn" title="Desmarcar todos (lista que se repete)" onclick="desmarcarTodosNota(${n.id})">↺</button><button type="button" class="mini-btn" title="Apagar os marcados" onclick="limparFeitosNota(${n.id})">🧹</button>` : ''}<button type="button" class="mini-btn" title="Abrir: renomear, cor, subitens, virar tarefa" onclick="ntAbrir(${n.id})">✎</button></span></footer>
  </article>`;
}
function ntRenderListas() {
  const el = document.getElementById('nt-listas'); if (!el) return;
  const vis = ntVisiveis('lista');
  const novo = `<button type="button" class="nt-novo" onclick="ntNova('lista')">＋ Nova lista</button>`;
  el.innerHTML = vis.length ? `<div class="nt-listas-grade">${vis.map(ntListaCartao).join('')}</div><div class="nt-pe">${novo}</div>` : `<div class="sp-vazio">Nenhuma lista aqui. Escreva na barra acima ou ${novo}</div>`;
}

// ═══════════════════════ 5. O RASTREADOR DE ENTREGAS ══════════════════════
function ntEntregaCartao(o) {
  const hoje = hojeISO(), st = STATUS_ENTREGA[o.status] || STATUS_ENTREGA.comprado;
  const etapa = o.status === 'problema' ? 1 : Math.max(0, ORDEM_STATUS.indexOf(o.status));
  const passos = ORDEM_STATUS.map((k, i) => `<span class="nt-passo${i < etapa ? ' feito' : ''}${i === etapa ? ' atual' : ''}" title="${STATUS_ENTREGA[k][1]}">${STATUS_ENTREGA[k][0]}</span>`).join('<i class="nt-fio"></i>');
  let quando = st[1];
  if (o.status === 'entregue') quando = `entregue ${o.deliveredAt ? isoParaBR(o.deliveredAt).slice(0, 5) : ''}`;
  else if (o.eta) {
    const d = tarDiasEntre(hoje, o.eta);
    quando += d < 0 ? ` · <b class="atras">passou ${plural(-d, 'dia', 'dias')} da previsão</b>` : d === 0 ? ' · <b class="hoje">chega hoje</b>' : d === 1 ? ' · <b class="hoje">chega amanhã</b>' : ` · chega em ${d} dias`;
  }
  return `<article class="nt-ent st-${o.status}" style="--st:${st[2]}">
    <header><b>${esc(o.item)}</b>${o.url ? `<a class="link-chip" href="${esc(o.url)}" target="_blank" rel="noopener">${iconeDoLink(o.url)}${o.store ? ' ' + esc(o.store) : ''}</a>` : (o.store ? `<small>${esc(o.store)}</small>` : '')}</header>
    <div class="nt-trilha">${passos}</div>
    <div class="nt-ent-info"><span>${quando}</span>${o.amount ? `<b>${formatCurrency(o.amount)}</b>` : ''}</div>
    <small class="nt-ent-sub">comprado ${o.boughtAt ? isoParaBR(o.boughtAt).slice(0, 5) : '—'}${o.tracking ? ` · 🔎 ${esc(o.tracking)}` : ''}</small>
    <div class="nt-ent-acoes">${o.status === 'comprado' || o.status === 'caminho' ? `<button type="button" class="mini-btn nt-avancar" onclick="avancarEntrega(${o.id})">▶ ${o.status === 'comprado' ? 'a caminho' : 'chegou'}</button>` : ''}<button type="button" class="mini-btn${o.status === 'problema' ? ' on' : ''}" title="Marcar problema" onclick="problemaEntrega(${o.id})">⚠️</button><button type="button" class="mini-btn" title="Previsão e rastreio" onclick="editarEntrega(${o.id})">✎</button><button type="button" class="mini-btn" title="Voltar para a lista de compras" onclick="devolverParaLista(${o.id})">↩️</button><button type="button" class="mini-btn" title="Apagar" onclick="removerEntrega(${o.id})">✕</button></div>
  </article>`;
}
function ntRenderEntregas() {
  const el = document.getElementById('entrega-lista'); if (!el) return;
  const hoje = hojeISO(), andamento = orders.filter(o => o.status !== 'entregue');
  const resumo = document.getElementById('entrega-resumo');
  if (resumo) {
    const total = andamento.reduce((a, o) => a + (Number(o.amount) || 0), 0);
    const atras = andamento.filter(o => o.eta && o.eta < hoje).length;
    const ent = orders.filter(o => o.status === 'entregue').length;
    resumo.innerHTML = `<div class="tar-num"><b>${andamento.length}</b><small>a caminho${total ? ' · ' + formatCurrency(total) : ''}</small></div>
      <div class="tar-num${atras ? ' alerta' : ''}"><b>${atras}</b><small>${palavra(atras, 'passou da previsão', 'passaram da previsão')}</small></div>
      <div class="tar-num"><b>${ent}</b><small>${palavra(ent, 'entregue', 'entregues')}</small></div>`;
  }
  let lista = [...orders];
  if (entregaFiltro === 'andamento') lista = andamento;
  else if (entregaFiltro === 'entregues') lista = lista.filter(o => o.status === 'entregue');
  lista.sort((a, b) => (a.eta || '9999').localeCompare(b.eta || '9999') || b.id - a.id);
  el.innerHTML = lista.length ? `<div class="nt-ent-grade">${lista.map(ntEntregaCartao).join('')}</div>`
    : '<div class="sp-vazio">Nada aqui. Nas listas, o 🛒 do item manda a compra para cá.</div>';
}

// ══════════════════════ MICRO-ABAS E O DESENHO GERAL ══════════════════════
function verSecaoNotas(s, el) {
  if (!NT_SECOES.includes(s)) s = 'notas';
  notasSecao = s;
  document.querySelectorAll('#notas-secoes > span').forEach(x => x.classList.toggle('active', el ? x === el : (x.getAttribute('onclick') || '').includes(`'${s}'`)));
  NT_SECOES.forEach(k => { const d = document.getElementById('sec-nt-' + k); if (d) d.hidden = k !== s; });
  // a barra rápida e os filtros servem às notas e às listas; nas entregas, saem
  ['sec-nt-rapida', 'sec-nt-filtros'].forEach(id => { const d = document.getElementById(id); if (d) d.hidden = s === 'entregas'; });
  const v = document.getElementById('nt-vista'); if (v) v.hidden = s !== 'notas';
  ntRapidaPrevia();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
  if (s === 'notas') ntRenderNotas();
}
function ntRenderVistas() { ntRenderNotas(); ntRenderListas(); }
/** Enquanto ele escreve: no caderno, só a coluna da esquerda muda (a página aberta não pode perder o cursor). */
function ntRenderVistasLeve() {
  const lista = document.querySelector('#note-list .nt-caderno .nt-cad-lista');
  if (lista && document.getElementById('nt-cad-pagina')) {
    lista.innerHTML = `<button type="button" class="nt-novo" onclick="ntNova('texto')">＋ Nova nota</button>${ntVisiveis('texto').map(ntCadItem).join('')}`;
  } else ntRenderNotas();
  ntRenderListas();
}
/** Chamado pelo renderNotes() do app.js. A nota aberta no pop-up se redesenha junto. */
function ntRender() {
  aplicarCoresNotas();
  renderFiltrosNota();
  ntRenderVistas();
  const m = document.getElementById('nt-leitor');
  if (m && m.style.display === 'flex' && ntEstado.aberta) {
    const n = notes.find(x => x.id === ntEstado.aberta);
    if (n) { document.getElementById('nt-leitor-corpo').innerHTML = ntEditorHTML(n); const ta = m.querySelector('.nt-ed-txt'); if (ta) ntCrescer(ta); }
    else ntFecharModal();
  }
  if (document.getElementById('nt-rapida-previa') && !document.getElementById('nt-rapida-previa').innerHTML) ntRapidaPrevia();
}
