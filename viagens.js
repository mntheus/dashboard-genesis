// ════════════════════════════════════════════════════════════════════════════
// VIAGENS E MILHAS — O EMBARQUE, O PASSAPORTE, A CARTEIRA E A BALANÇA (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • a PRÓXIMA viagem é um CARTÃO DE EMBARQUE grande (destino em letras
//     grandes, ida ✈ volta, contagem, anéis da mala e dos documentos, barra do
//     orçamento); as outras são cartões menores; as feitas viram CARIMBOS de
//     passaporte; as ideias, cartões-postais;
//   • abrir uma viagem = POP-UP com abas 🧳 Mala · 📄 Documentos · 🎟️ Reservas ·
//     🗺️ Roteiro (o roteiro já existia no dado e nunca teve tela; as reservas
//     ganharam formulário no lugar das 4 perguntas em sequência);
//   • MILHAS: cada programa é um cartão de fidelidade; no alto, a BALANÇA do
//     "pagou × obteve por milheiro", que pende para quem ganhou;
//   • a BARRA RÁPIDA: "Lisboa 10/12 a 20/12 R$ 15000" cria a viagem;
//     "Smiles 45000" atualiza (ou cria) o programa.
// Nenhum dado novo: `trips` e `milhas` com o mesmo formato (roteiro: [{dia, texto}]).
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const vgEstado = { detalhe: null, aba: 'mala' };
const VG_CORES = ['#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#22c55e', '#facc15', '#2dd4bf', '#f87171'];

// ───────────────────────────── utilidades ─────────────────────────────────
function vgSecao() { return typeof viagensSecao !== 'undefined' ? viagensSecao : 'viagens'; }
/** Um "código de aeroporto" de enfeite: as 3 primeiras letras do destino. */
function vgCodigo(dest) { return tarSemAcento(dest || '').replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || '✈'; }
function vgCor(txt) { let h = 0; for (const c of String(txt || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return VG_CORES[h % VG_CORES.length]; }
function vgFeita(t) { return t.status === 'feita' || (!!t.fim && t.fim < hojeISO() && t.status !== 'ideia'); }
function vgQuando(t) {
  const hoje = hojeISO();
  if (vgFeita(t)) return { txt: 'já fui', cls: '' };
  if (!t.inicio) return { txt: 'sem data', cls: '' };
  if (t.inicio <= hoje && (!t.fim || t.fim >= hoje)) { const n = tarDiasEntre(t.inicio, hoje) + 1; return { txt: `em viagem · dia ${n}${t.fim ? ' de ' + diasDeViagem(t) : ''}`, cls: 'hoje' }; }
  const d = tarDiasEntre(hoje, t.inicio);
  return { txt: d === 1 ? 'amanhã!' : `faltam ${d} dias`, cls: d <= 7 ? 'hoje' : '' };
}
/** O anel de progresso (tenho / total) da mala ou dos documentos. */
function vgAnel(lista, rot) {
  const tot = (lista || []).length, ok = contarMala(lista, 'tenho'), comp = contarMala(lista, 'comprar');
  const r = 15, c = 2 * Math.PI * r, p = tot ? ok / tot : 0;
  return `<span class="vg-anel" title="${ok} de ${tot} prontos${comp ? ` · ${comp} para comprar` : ''}"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" class="f"/><circle cx="20" cy="20" r="${r}" class="c${tot && ok === tot ? ' ok' : ''}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/></svg><span><b>${rot} ${ok}/${tot}</b>${comp ? `<small>🛒 ${comp}</small>` : ''}</span></span>`;
}

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function vgEntender(txt) {
  let resto = String(txt || '');
  const tirar = re => { let a = null; resto = resto.replace(re, (...m) => { a = m; return ' '; }); return a; };
  const dinheiro = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
  if (vgSecao() === 'milhas') {
    const n = tirar(/(^|\s)(\d{1,3}(?:\.\d{3})+|\d{3,})(?=\s|$)/);
    const prog = resto.replace(/\s+/g, ' ').trim();
    const ex = milhas.find(p => tarSemAcento(p.programa).startsWith(tarSemAcento(prog)) && prog) || null;
    return { tipo: 'milha', programa: ex ? ex.programa : prog, existe: ex, saldo: n ? parseInt(n[2].replace(/\./g, ''), 10) : null };
  }
  const v = tirar(/(^|\s)R\$\s*(\d[\d.]*(?:,\d{1,2})?)/i);
  // cada data sai deixando uma marca; só os conectores COLADOS na marca saem junto
  // ("de 05/04 até 20/04" perde o "de" e o "até"; "Serra do Cipó" fica inteira)
  const M = '\u0001';
  let d1 = tarAcharData(resto); if (d1) { resto = resto.slice(0, d1.ini) + ' ' + M + ' ' + resto.slice(d1.fim); }
  let d2 = tarAcharData(resto); if (d2) { resto = resto.slice(0, d2.ini) + ' ' + M + ' ' + resto.slice(d2.fim); }
  resto = resto.replace(/\u0001(?:\s+(?:a|até|ate|-|–)(?=\s|$))+/gi, M);
  resto = resto.replace(/(?:\s(?:a|até|ate|de|do|desde|-|–))*\s*\u0001\s*/gi, ' ');
  let ida = d1 ? d1.due : '', volta = d2 ? d2.due : '';
  if (ida && volta && volta < ida) [ida, volta] = [volta, ida];
  return { tipo: 'viagem', destino: resto.replace(/\s+/g, ' ').trim(), inicio: ida, fim: volta, orcamento: v ? dinheiro(v[2]) : 0 };
}
function vgRapidaPrevia() {
  const el = document.getElementById('vg-rapida-previa'), inp = document.getElementById('vg-rapida'); if (!el || !inp) return;
  const mil = vgSecao() === 'milhas';
  inp.placeholder = mil ? 'Programa e saldo…' : 'Para onde?';
  if (!inp.value.trim()) {
    el.innerHTML = '<span class="tar-dica">' + (mil ? 'Ex.: <b>Smiles 45000</b> — atualiza o saldo (ou cria o programa).' : 'Ex.: <b>Lisboa 10/12 a 20/12 R$ 15000</b> — já nasce com ida, volta, orçamento, mala e documentos.') + '</span>';
    return;
  }
  const e = vgEntender(inp.value), p = [];
  if (e.tipo === 'milha') {
    p.push(e.existe ? '<span class="tar-lt" style="--cor:var(--info)">atualizar saldo</span>' : '<span class="tar-lt" style="--cor:var(--ok)">programa novo</span>');
    p.push(e.saldo !== null ? `<span class="nt-marc sem-hash">${e.saldo.toLocaleString('pt-BR')} milhas</span>` : '<span class="tar-due atras">falta o saldo</span>');
    el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.programa || '…')}</b> ${p.join(' ')}`;
    return;
  }
  if (e.inicio) p.push(`<span class="tar-due prox">✈ ${isoParaBR(e.inicio).slice(0, 5)}${e.fim ? ' → ' + isoParaBR(e.fim).slice(0, 5) : ''}</span>`);
  else p.push('<span class="tar-dica">sem data → 💭 ideia</span>');
  if (e.orcamento) p.push(`<span class="nt-marc sem-hash">orçamento ${formatCurrency(e.orcamento)}</span>`);
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.destino || '…')}</b> ${p.join(' ')}`;
}
function vgRapidaAdicionar() {
  const inp = document.getElementById('vg-rapida'); if (!inp) return;
  const e = vgEntender(inp.value);
  if (e.tipo === 'milha') {
    if (!e.programa || e.saldo === null) { toast('Escreva o programa e o saldo (ex.: Smiles 45000).'); inp.focus(); return; }
    let p = e.existe;
    if (p) { p.saldo = e.saldo; p.saldoEm = hojeISO(); }
    else { p = { id: novoId(), programa: e.programa, numero: '', saldo: e.saldo, saldoEm: hojeISO(), validade: '', custoMilheiro: 0, notas: '', movs: [] }; milhas.push(p); }
    salvar('milhas', milhas); renderMilhas();
    toast(`🎫 ${p.programa}: ${e.saldo.toLocaleString('pt-BR')} milhas${e.existe ? ' (saldo atualizado)' : ''}.`);
  } else {
    if (!e.destino) { inp.focus(); return; }
    const t = { id: novoId(), destino: e.destino, inicio: e.inicio, fim: e.fim, status: e.inicio ? 'planejando' : 'ideia', orcamento: e.orcamento, notas: '', gasto: 0,
      mala: MALA_PADRAO.map(x => ({ text: x, done: false, estado: 'falta' })), docs: DOCS_PADRAO.map(x => ({ text: x, done: false, estado: 'falta' })), roteiro: [], reservas: [], createdAt: Date.now() };
    trips.push(t); salvar('trips', trips); renderViagens();
    toast(`✈️ ${t.destino}${t.inicio ? ' · ' + isoParaBR(t.inicio).slice(0, 5) : ''} — com mala e documentos prontos.`);
  }
  inp.value = ''; vgRapidaPrevia(); inp.focus();
}

// ═══════════════════ 2. O EMBARQUE, O PASSAPORTE, OS POSTAIS ══════════════
function vgEmbarque(t, grande) {
  const s = STATUS_VIAGEM[t.status] || STATUS_VIAGEM.ideia, q = vgQuando(t), cor = vgCor(t.destino);
  const orc = Number(t.orcamento) || 0, gasto = Number(t.gasto) || 0, pct = orc ? Math.min(100, Math.round(gasto / orc * 100)) : 0;
  return `<div class="vg-embarque${grande ? ' grande' : ''}" style="--cor:${cor}" tabindex="0" onclick="vgAbrir(${t.id})" onkeydown="if (event.key === 'Enter') vgAbrir(${t.id})">
    <div class="vg-emb-corpo">
      <small class="vg-emb-rot">CARTÃO DE EMBARQUE · <span style="color:${s[2]}">${s[0]} ${s[1]}</span></small>
      <div class="vg-emb-dest${String(t.destino).length > 16 ? ' longo' : ''}"><b>${esc(t.destino)}</b><span class="vg-cod">${esc(vgCodigo(t.destino))}</span></div>
      <div class="vg-emb-datas">${t.inicio ? `<span>${isoParaBR(t.inicio).slice(0, 5)}</span><i>✈</i><span>${t.fim ? isoParaBR(t.fim).slice(0, 5) : '—'}</span>${t.inicio && t.fim ? `<small>${diasDeViagem(t)} dias</small>` : ''}` : '<small>sem data ainda</small>'}</div>
      <div class="vg-emb-aneis">${vgAnel(t.mala, '🧳')}${vgAnel(t.docs, '📄')}${(t.reservas || []).length ? `<span class="nt-marc sem-hash">🎟️ ${(t.reservas || []).length}</span>` : ''}</div>
      ${orc ? `<div class="vg-orc" title="${formatCurrency(gasto)} reservados de ${formatCurrency(orc)}"><div class="vg-orc-barra${gasto > orc ? ' passou' : ''}"><i style="width:${pct}%"></i></div><small>${finCompacto(gasto)} de ${finCompacto(orc)}</small></div>` : ''}
    </div>
    ${grande ? vgEmbExtra(t) : ''}
    <div class="vg-emb-canhoto ${q.cls}"><small>${t.inicio ? esc(diaSemanaCurto(t.inicio)).toUpperCase() : '—'}</small><b>${q.txt.replace(/^faltam /, '')}</b>${q.txt.startsWith('faltam') ? '<small>faltam</small>' : ''}</div>
  </div>`;
}
/** No cartão grande, se couber: as reservas e o roteiro à vista (some no celular). */
function vgEmbExtra(t) {
  const res = (t.reservas || []).slice(0, 3), rot = (t.roteiro || []).length;
  if (!res.length && !rot) return '';
  return `<div class="vg-emb-extra">${res.map(r => `<span>${TIPOS_RESERVA[r.tipo] || '📌'} ${esc(r.desc)}${r.valor ? `<small>${finCompacto(r.valor)}</small>` : ''}</span>`).join('')}${(t.reservas || []).length > 3 ? `<small>＋ ${(t.reservas || []).length - 3}</small>` : ''}${rot ? `<span class="vg-emb-rot2">🗺️ ${plural(rot, 'plano', 'planos')} no roteiro</span>` : ''}</div>`;
}
function vgCarimbo(t, i) {
  const cor = vgCor(t.destino), data = t.inicio || t.fim || '';
  const mes = data ? new Date(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').toUpperCase() : '';
  return `<button type="button" class="vg-carimbo" style="--cor:${cor}; --rot:${[-8, 5, -3, 9, -6][i % 5]}deg" onclick="vgAbrir(${t.id})" title="${esc(t.destino)}">
    <span class="vg-car-anel${Math.max(...String(t.destino).split(/\s+/).map(w => w.length)) > 8 || t.destino.length > 16 ? ' longo' : ''}"><b>${esc(t.destino)}</b><small>${mes || 'VISITADO'}</small><i>✈ ${esc(vgCodigo(t.destino))}</i></span>
  </button>`;
}
function vgPostal(t) {
  return `<button type="button" class="vg-postal" style="--cor:${vgCor(t.destino)}" onclick="vgAbrir(${t.id})"><span class="vg-selo">${esc(vgCodigo(t.destino))}</span><b>${esc(t.destino)}</b><small>${t.notas ? esc(t.notas.slice(0, 60)) : 'um dia…'}</small></button>`;
}
function vgRenderViagens() {
  const el = document.getElementById('trip-lista'); if (!el) return;
  const sel = document.getElementById('trip-status'); if (sel && !sel.options.length) sel.innerHTML = Object.entries(STATUS_VIAGEM).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('');
  if (!trips.length) { el.innerHTML = '<div class="sp-vazio">Nenhuma viagem ainda. Escreva na barra acima — a mala e os documentos já vêm com uma lista básica.</div>'; return; }
  const feitas = trips.filter(vgFeita).sort((a, b) => (b.inicio || b.fim || '').localeCompare(a.inicio || a.fim || ''));
  const ideias = trips.filter(t => !vgFeita(t) && t.status === 'ideia');
  const vem = trips.filter(t => !vgFeita(t) && t.status !== 'ideia').sort((a, b) => (a.inicio || '9999').localeCompare(b.inicio || '9999'));
  const [prox, ...outras] = vem;
  el.innerHTML = (prox ? `<h3 class="tar-gr-tit lz-tit-agora">🛫 Próxima viagem</h3>${vgEmbarque(prox, true)}` : '') +
    (outras.length ? `<h3 class="tar-gr-tit">🗓️ Depois <small>${outras.length}</small></h3><div class="vg-embarques">${outras.map(t => vgEmbarque(t)).join('')}</div>` : '') +
    (feitas.length ? `<h3 class="tar-gr-tit lz-tit-visto">📕 Passaporte <small>${feitas.length}</small></h3><div class="vg-passaporte">${feitas.map(vgCarimbo).join('')}</div>` : '') +
    (ideias.length ? `<h3 class="tar-gr-tit">💭 Ideias <small>${ideias.length}</small></h3><div class="vg-postais">${ideias.map(vgPostal).join('')}</div>` : '');
  if (vgEstado.detalhe && vgEstado.detalhe.tipo === 'viagem') vgDesenharDetalhe();
}

// ═══════════════════════ 3. A VIAGEM ABERTA (pop-up com abas) ═════════════
function vgAbrir(id) { vgEstado.detalhe = { tipo: 'viagem', id }; vgMostrar(); }
function vgAbrirMilha(id) { vgEstado.detalhe = { tipo: 'milha', id }; vgMostrar(); }
function vgMostrar() { const m = document.getElementById('vg-detalhe'); if (!m) return; vgDesenharDetalhe(); m.style.display = 'flex'; }
function vgFechar() { const m = document.getElementById('vg-detalhe'); if (m) m.style.display = 'none'; vgEstado.detalhe = null; }
function vgVerAba(a) { vgEstado.aba = a; vgDesenharDetalhe(); }
function vgListaMala(t, lista) {
  const itens = t[lista] || [];
  return `<div class="vg-resumo-lista">${contarMala(itens, 'tenho')} tenho · ${contarMala(itens, 'comprar')} comprar · ${contarMala(itens, 'falta')} a ver <span class="tar-dica">— toque no quadradinho: ⬜ → ✅ → 🛒</span></div>
    <div class="vg-itens">${itens.map((it, i) => { const e = estadoItem(it), m = ESTADOS_MALA[e]; return `<div class="vg-item ${e}"><button type="button" class="mala-estado" title="${m[1]} — toque para trocar" onclick="itemViagem(${t.id}, '${lista}', ${i})">${m[0]}</button><span>${esc(it.text)}</span><button type="button" class="mini-btn xs" title="Tirar" onclick="removerItemViagem(${t.id}, '${lista}', ${i})">✕</button></div>`; }).join('') || '<div class="sp-vazio">Lista vazia.</div>'}</div>
    <div class="nt-add"><input type="text" placeholder="＋ item (Enter)" aria-label="Novo item" onkeydown="if (event.key === 'Enter') { event.preventDefault(); vgAddItem(${t.id}, '${lista}', this); }"></div>
    ${contarMala(itens, 'comprar') ? `<button type="button" class="mini-btn on" style="margin-top:8px" onclick="comprasDaViagem(${t.id})">🛒 mandar o que falta para as compras (Notas)</button>` : ''}`;
}
function vgAddItem(id, lista, inp) {
  const t = trips.find(x => x.id === id); const v = (inp.value || '').trim(); if (!t || !v) return;
  (t[lista] = t[lista] || []).push({ text: v, done: false, estado: 'falta' }); salvar('trips', trips); renderViagens();
  const novo = document.querySelector('#vg-detalhe .nt-add input'); if (novo) novo.focus();
}
function vgReservas(t) {
  const lst = t.reservas || [], tot = lst.reduce((a, r) => a + (Number(r.valor) || 0), 0);
  return `<div class="vg-itens">${lst.map((r, i) => `<div class="vg-reserva"><span class="vg-res-ic">${TIPOS_RESERVA[r.tipo] || '📌'}</span><div><b>${r.url && /^https?:/.test(r.url) ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.desc)} ${iconeDoLink(r.url)}</a>` : esc(r.desc)}</b><small>${[r.data ? isoParaBR(r.data).slice(0, 5) : '', r.url && !/^https?:/.test(r.url) ? 'cód. ' + r.url : ''].filter(Boolean).map(esc).join(' · ')}</small></div>${r.valor ? `<strong>${formatCurrency(r.valor)}</strong>` : ''}<button type="button" class="mini-btn xs" title="Apagar" onclick="removerReserva(${t.id}, ${i})">✕</button></div>`).join('') || '<div class="sp-vazio">Nenhuma reserva ainda.</div>'}</div>
    ${tot ? `<div class="vg-resumo-lista">Reservado: <b>${formatCurrency(tot)}</b>${t.orcamento ? ` de ${formatCurrency(t.orcamento)} (${Math.round(tot / t.orcamento * 100)}%)` : ''}</div>` : ''}
    <div class="vg-form-res">
      <select id="vg-res-tipo" aria-label="Tipo">${Object.entries(TIPOS_RESERVA).map(([k, ic]) => `<option value="${k}">${ic} ${k}</option>`).join('')}</select>
      <input type="text" id="vg-res-desc" placeholder="O quê (Voo CNF→LIS, Hotel…)" aria-label="Descrição">
      <input type="number" id="vg-res-valor" placeholder="R$" step="0.01" min="0" aria-label="Valor">
      <input type="date" id="vg-res-data" aria-label="Data" value="${t.inicio || ''}">
      <input type="text" id="vg-res-url" placeholder="link ou código" aria-label="Link ou código">
      <button type="button" class="mini-btn on" onclick="vgAddReserva(${t.id})">＋ reserva</button>
    </div>`;
}
function vgAddReserva(id) {
  const t = trips.find(x => x.id === id); if (!t) return;
  const g = k => (document.getElementById('vg-res-' + k) || {}).value || '';
  const desc = g('desc').trim(); if (!desc) { toast('Escreva o que é a reserva.'); return; }
  (t.reservas = t.reservas || []).push({ tipo: g('tipo') || 'outro', desc, valor: parseFloat(g('valor')) || 0, url: g('url').trim(), data: g('data') });
  t.gasto = t.reservas.reduce((a, r) => a + (Number(r.valor) || 0), 0);
  salvar('trips', trips); renderViagens(); toast('🎟️ Reserva anotada.');
}
function vgDiasDaViagem(t) {
  if (!t.inicio) return [];
  const n = Math.min(60, t.fim ? diasDeViagem(t) : 1), r = [];
  for (let i = 0; i < n; i++) r.push(somaDias(t.inicio, i));
  return r;
}
function vgRoteiro(t) {
  const dias = vgDiasDaViagem(t), rot = t.roteiro || [];
  const semDia = rot.map((r, i) => ({ r, i })).filter(x => !x.r.dia || !dias.includes(x.r.dia));
  const linha = ({ r, i }) => `<div class="vg-rot-item"><span>${esc(r.texto)}</span><button type="button" class="mini-btn xs" title="Apagar" onclick="vgTirarRoteiro(${t.id}, ${i})">✕</button></div>`;
  return (dias.length ? `<div class="vg-roteiro">${dias.map((d, k) => `<div class="vg-dia"><div class="vg-dia-rot"><b>Dia ${k + 1}</b><small>${esc(diaSemanaCurto(d))} ${isoParaBR(d).slice(0, 5)}</small></div><div class="vg-dia-itens">${rot.map((r, i) => ({ r, i })).filter(x => x.r.dia === d).map(linha).join('') || '<span class="tar-dica">livre</span>'}</div></div>`).join('')}</div>` : '<div class="tar-dica">Sem datas ainda: os planos ficam numa lista só. Com ida e volta, o roteiro se divide por dia.</div>') +
    (semDia.length ? `<div class="vg-dia"><div class="vg-dia-rot"><b>Sem dia</b></div><div class="vg-dia-itens">${semDia.map(linha).join('')}</div></div>` : '') +
    `<div class="vg-form-res"><select id="vg-rot-dia" aria-label="Dia">${dias.map((d, k) => `<option value="${d}">Dia ${k + 1} · ${isoParaBR(d).slice(0, 5)}</option>`).join('')}<option value="">sem dia</option></select>
      <input type="text" id="vg-rot-txt" placeholder="O que fazer (museu, praia, restaurante…)" aria-label="Plano" onkeydown="if (event.key === 'Enter') { event.preventDefault(); vgAddRoteiro(${t.id}); }">
      <button type="button" class="mini-btn on" onclick="vgAddRoteiro(${t.id})">＋ plano</button></div>`;
}
function vgAddRoteiro(id) {
  const t = trips.find(x => x.id === id); if (!t) return;
  const txt = (document.getElementById('vg-rot-txt').value || '').trim(); if (!txt) return;
  const dia = document.getElementById('vg-rot-dia').value;
  (t.roteiro = t.roteiro || []).push({ dia, texto: txt }); salvar('trips', trips); renderViagens();
  const s = document.getElementById('vg-rot-dia'); if (s) s.value = dia;
  const c = document.getElementById('vg-rot-txt'); if (c) c.focus();
}
function vgTirarRoteiro(id, i) { const t = trips.find(x => x.id === id); if (!t || !t.roteiro) return; t.roteiro.splice(i, 1); salvar('trips', trips); renderViagens(); }
function vgStatus(id, st) { const t = trips.find(x => x.id === id); if (!t) return; t.status = st; salvar('trips', trips); renderViagens(); }

function vgDesenharDetalhe() {
  const d = vgEstado.detalhe, corpo = document.getElementById('vg-detalhe-corpo'), tit = document.getElementById('vg-detalhe-tit');
  if (!d || !corpo) return;
  if (d.tipo === 'viagem') {
    const t = trips.find(x => x.id === d.id); if (!t) { vgFechar(); return; }
    const q = vgQuando(t);
    tit.textContent = `✈️ ${t.destino}`;
    const abas = [['mala', '🧳 Mala', `${contarMala(t.mala, 'tenho')}/${(t.mala || []).length}`], ['docs', '📄 Documentos', `${contarMala(t.docs, 'tenho')}/${(t.docs || []).length}`], ['reservas', '🎟️ Reservas', (t.reservas || []).length], ['roteiro', '🗺️ Roteiro', (t.roteiro || []).length]];
    corpo.innerHTML = `<div class="vg-det-topo" style="--cor:${vgCor(t.destino)}">
        <div><b>${t.inicio ? `${isoParaBR(t.inicio)}${t.fim ? ' → ' + isoParaBR(t.fim) : ''}` : 'sem data'}</b><small>${q.txt}${t.orcamento ? ' · orçamento ' + formatCurrency(t.orcamento) : ''}</small></div>
        <select aria-label="Situação" onchange="vgStatus(${t.id}, this.value)">${Object.entries(STATUS_VIAGEM).map(([k, v]) => `<option value="${k}"${t.status === k ? ' selected' : ''}>${v[0]} ${v[1]}</option>`).join('')}</select>
      </div>
      ${t.notas ? `<p class="lz-coment">${linkify(esc(t.notas))}</p>` : ''}
      <div class="focus-header-tabs filter-row vg-abas">${abas.map(([k, n, c]) => `<span class="${vgEstado.aba === k ? 'active' : ''}" onclick="vgVerAba('${k}')">${n} <small>${c}</small></span>`).join('')}</div>
      <div class="vg-aba">${vgEstado.aba === 'mala' ? vgListaMala(t, 'mala') : vgEstado.aba === 'docs' ? vgListaMala(t, 'docs') : vgEstado.aba === 'reservas' ? vgReservas(t) : vgRoteiro(t)}</div>
      <div class="lz-det-acoes"><button type="button" class="mini-btn" onclick="viagemNaAgenda(${t.id})">📅 pôr na agenda</button><button type="button" class="mini-btn" onclick="vgFechar(); editarViagem(${t.id})">✎ editar</button><button type="button" class="mini-btn" onclick="removerViagem(${t.id})">✕ apagar</button></div>`;
    return;
  }
  const p = milhas.find(x => x.id === d.id); if (!p) { vgFechar(); return; }
  tit.textContent = `🎫 ${p.programa}`;
  const pg = pagoPorMilheiro(p), ob = obtidoPorMilheiro(p);
  const movs = [...(p.movs || [])].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  corpo.innerHTML = `<div class="vg-det-topo" style="--cor:${vgCor(p.programa)}"><div><b>${(Number(p.saldo) || 0).toLocaleString('pt-BR')} milhas</b><small>${valorDoSaldo(p) ? '≈ ' + formatCurrency(valorDoSaldo(p)) + ' · ' : ''}${p.saldoEm ? 'saldo de ' + isoParaBR(p.saldoEm) : ''}${p.numero ? ' · nº ' + esc(p.numero) : ''}</small></div>
      <button type="button" class="mini-btn on" onclick="atualizarSaldoMilha(${p.id})">🔄 atualizar saldo</button></div>
    ${(pg || ob) ? `<div class="milha-conta">${pg ? `<span>💳 pagou <strong>${formatCurrency(pg)}</strong> o milheiro</span>` : ''}${ob ? `<span>✈️ obteve <strong>${formatCurrency(ob)}</strong> o milheiro</span>` : ''}${pg && ob ? `<span class="milha-veredito ${ob >= pg ? 'bom' : 'ruim'}">${ob >= pg ? `✅ valeu a pena: ${formatCurrency(ob - pg)} a mais por milheiro` : `⚠️ ficou ${formatCurrency(pg - ob)} pior por milheiro do que custou`}</span>` : ''}</div>` : ''}
    ${p.notas ? `<p class="lz-coment">${linkify(esc(p.notas))}</p>` : ''}
    <h3 class="tar-gr-tit">Movimentos <small>${movs.length}</small></h3>
    <div class="mv-novo vg-form-res">
      <select id="mv-tipo-${p.id}" aria-label="Tipo">${Object.entries(TIPOS_MOV_MILHA).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('')}</select>
      <input type="text" id="mv-qtd-${p.id}" placeholder="milhas" inputmode="numeric" aria-label="Milhas">
      <input type="number" id="mv-valor-${p.id}" placeholder="R$" step="0.01" min="0" aria-label="Valor" title="Na compra: quanto pagou. No resgate: quanto custaria a passagem em dinheiro.">
      <input type="date" id="mv-data-${p.id}" value="${hojeISO()}" aria-label="Data">
      <input type="text" id="mv-desc-${p.id}" placeholder="descrição" aria-label="Descrição">
      <button type="button" class="mini-btn on" onclick="addMovMilha(${p.id})">＋ movimento</button>
    </div>
    <div class="vg-itens">${movs.length ? movs.map(m => {
      const tm = TIPOS_MOV_MILHA[m.tipo] || TIPOS_MOV_MILHA.ajuste, rs = Number(m.valor) > 0 && m.qtd ? rsPorMilheiro([m]) : 0, vg = m.tripId ? trips.find(t => t.id === m.tripId) : null;
      return `<div class="mv-linha"><span class="mv-qtd ${sinalMov(m.tipo) > 0 ? 'mais' : 'menos'}">${sinalMov(m.tipo) > 0 ? '+' : '−'}${(Number(m.qtd) || 0).toLocaleString('pt-BR')}</span>
        <span class="mv-txt">${tm[0]} ${esc(m.desc || tm[1])}<small class="item-date">${m.data ? isoParaBR(m.data) : ''}${Number(m.valor) ? ' · ' + formatCurrency(m.valor) : ''}${rs ? ' · ' + formatCurrency(rs) + '/milheiro' : ''}${vg ? ' · ✈️ ' + esc(vg.destino) : ''}</small></span>
        ${m.tipo === 'resgate' ? `<select class="mv-viagem" aria-label="Ligar a uma viagem" onchange="ligarMovViagem(${p.id}, ${m.id}, this.value)"><option value="">— viagem —</option>${trips.map(t => `<option value="${t.id}"${m.tripId === t.id ? ' selected' : ''}>${esc(t.destino)}</option>`).join('')}</select>` : ''}
        <button type="button" class="mini-btn xs" title="Apagar" onclick="removerMovMilha(${p.id}, ${m.id})">✕</button></div>`;
    }).join('') : '<div class="sp-vazio">Nenhum movimento. Anote uma compra e um resgate para o app calcular se valeu a pena.</div>'}</div>
    <div class="lz-det-acoes"><button type="button" class="mini-btn" onclick="vgFechar(); editarMilha(${p.id})">✎ editar</button><button type="button" class="mini-btn" onclick="removerMilha(${p.id})">✕ apagar</button></div>`;
}

// ═══════════════════════ 4. A CARTEIRA E A BALANÇA ════════════════════════
function vgBalanca(pago, obtido) {
  if (!pago && !obtido) return '<div class="vg-balanca vazia"><span class="tar-dica">⚖️ Anote uma <b>compra</b> (quanto pagou) e um <b>resgate</b> (quanto a passagem custaria em dinheiro) num programa: a balança mostra se as milhas estão te pagando ou te custando.</span></div>';
  const diff = (obtido || 0) - (pago || 0), ref = Math.max(pago || 0, obtido || 0, 1);
  const ang = pago && obtido ? Math.max(-14, Math.min(14, diff / ref * 28)) : 0;
  const veredito = pago && obtido ? (diff >= 0 ? `<b class="bom">✅ valeu a pena</b><small>${formatCurrency(diff)} a mais por milheiro</small>` : `<b class="ruim">⚠️ está te custando</b><small>${formatCurrency(-diff)} a menos por milheiro</small>`) : '<small>falta o outro lado para comparar</small>';
  return `<div class="vg-balanca">
    <svg viewBox="0 0 240 120" class="vg-bal-svg" role="img" aria-label="Pagou ${formatCurrency(pago || 0)} e obteve ${formatCurrency(obtido || 0)} por milheiro">
      <rect x="116" y="30" width="8" height="78" rx="3" class="pe"/><rect x="88" y="106" width="64" height="8" rx="4" class="pe"/>
      <g transform="rotate(${ang.toFixed(1)} 120 30)">
        <rect x="24" y="27" width="192" height="6" rx="3" class="braco"/>
        <line x1="40" y1="30" x2="28" y2="70" class="fio"/><line x1="40" y1="30" x2="52" y2="70" class="fio"/>
        <line x1="200" y1="30" x2="188" y2="70" class="fio"/><line x1="200" y1="30" x2="212" y2="70" class="fio"/>
        <path d="M20 70 h40 a20 10 0 0 1 -40 0z" class="prato pago"/><path d="M180 70 h40 a20 10 0 0 1 -40 0z" class="prato obtido"/>
        <text x="40" y="96" class="rot">pagou</text><text x="200" y="96" class="rot">obteve</text>
        <text x="40" y="112" class="val">${pago ? formatCurrency(pago) : '—'}</text><text x="200" y="112" class="val">${obtido ? formatCurrency(obtido) : '—'}</text>
      </g>
      <circle cx="120" cy="30" r="7" class="eixo"/>
    </svg>
    <div class="vg-bal-ver">${veredito}<small class="tar-dica">por mil milhas, somando todos os programas</small></div>
  </div>`;
}
function vgCartaoMilha(p) {
  const dias = diasAteValidade(p), alerta = dias !== null && dias >= 0 && dias <= 90 && p.saldo > 0, venceu = dias !== null && dias < 0 && p.saldo > 0;
  return `<button type="button" class="vg-cartao" style="--cor:${vgCor(p.programa)}" onclick="vgAbrirMilha(${p.id})">
    <span class="vg-cartao-topo"><b>${esc(p.programa)}</b><span class="vg-chip" aria-hidden="true"></span></span>
    <span class="vg-cartao-saldo">${(Number(p.saldo) || 0).toLocaleString('pt-BR')}<small>milhas</small></span>
    <span class="vg-cartao-pe"><span>${valorDoSaldo(p) ? '≈ ' + formatCurrency(valorDoSaldo(p)) : (p.numero ? 'nº ' + esc(p.numero) : '')}</span>${p.validade ? `<span class="${alerta ? 'vence' : venceu ? 'venceu' : ''}">${venceu ? '⌛ venceu' : alerta ? `⌛ vence em ${dias} d` : 'vence ' + isoParaBR(p.validade).slice(0, 5)}</span>` : ''}</span>
  </button>`;
}
function vgRenderMilhas() {
  const el = document.getElementById('milha-lista'); if (!el) return;
  const dl = document.getElementById('milha-programas'); if (dl && !dl.children.length) dl.innerHTML = PROGRAMAS_MILHAS.map(p => `<option value="${esc(p)}">`).join('');
  const total = milhas.reduce((a, p) => a + (Number(p.saldo) || 0), 0), valor = milhas.reduce((a, p) => a + valorDoSaldo(p), 0);
  const vencendo = milhas.filter(p => { const d = diasAteValidade(p); return d !== null && d >= 0 && d <= 90 && p.saldo > 0; }).length;
  const todos = milhas.flatMap(p => p.movs || []);
  const pago = rsPorMilheiro(todos.filter(m => ['compra', 'transferencia'].includes(m.tipo) && Number(m.valor) > 0));
  const obtido = rsPorMilheiro(todos.filter(m => m.tipo === 'resgate' && Number(m.valor) > 0));
  const resumo = document.getElementById('milha-resumo');
  if (resumo) resumo.innerHTML = `<div class="tar-num"><b>${finCompacto(total)}</b><small>milhas em ${plural(milhas.length, 'programa', 'programas')}</small></div><div class="tar-num"><b>${valor ? finCompacto(valor) : '—'}</b><small>valem ~R$</small></div><div class="tar-num${vencendo ? ' alerta' : ''}"><b>${vencendo}</b><small>${palavra(vencendo, 'vence', 'vencem')} em 90 dias</small></div>`;
  if (!milhas.length) { el.innerHTML = '<div class="sp-vazio">Nenhum programa ainda. Escreva na barra acima, ex.: <b>Smiles 45000</b>.</div>'; return; }
  const ord = [...milhas].sort((a, b) => (Number(b.saldo) || 0) - (Number(a.saldo) || 0));
  el.innerHTML = vgBalanca(pago, obtido) + `<div class="vg-carteira">${ord.map(vgCartaoMilha).join('')}</div>`;
  if (vgEstado.detalhe && vgEstado.detalhe.tipo === 'milha') vgDesenharDetalhe();
}

// ══════════════════════════ O DESENHO GERAL ═══════════════════════════════
/** Chamado pelo verSecaoViagens() do app.js depois de trocar a micro-aba. */
function vgAoTrocar() { vgRapidaPrevia(); if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao(); }
