// ════════════════════════════════════════════════════════════════════════════
// REDE E CURRÍCULO — O TERMÔMETRO, OS CARTÕES DE VISITA, A FOLHA AO VIVO (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • CONTATOS como CARTÕES DE VISITA (iniciais, o que faz, onde conheceu, há
//     quanto tempo falou), agrupados pelo TERMÔMETRO da proximidade:
//     🔥 em dia · 🌤️ esfriando · ❄️ sumido. No alto, "falar esta semana" e os
//     aniversários dos próximos 30 dias. Tocar abre o detalhe (ligar, WhatsApp,
//     e-mail, falei hoje);
//   • a BARRA RÁPIDA: "Dr. João, contador #negócios 31 99999-0000" cria o
//     contato; "falei com João" marca a conversa de hoje;
//   • CURRÍCULO: editor (seções que abrem e fecham) e a FOLHA A4 ao vivo lado a
//     lado no PC (no celular, "Editar | Ver folha"), com o MEDIDOR de completo e a
//     LINHA DO TEMPO da carreira (experiências e formações em barras por ano).
// Nenhum dado novo: `contacts` e `curriculo` com o mesmo formato.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const rdEstado = { detalhe: null, cvAbertas: new Set(), cvModo: 'editar' };
const RD_CORES = ['#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#22c55e', '#facc15', '#2dd4bf', '#f87171', '#60a5fa'];
const RD_FAIXAS = [
  { k: 'quente', ic: '🔥', nome: 'Em dia', dica: 'falou há pouco', tom: 'var(--ok)' },
  { k: 'morno', ic: '🌤️', nome: 'Esfriando', dica: 'passou do combinado ou faz 1–3 meses', tom: 'var(--atencao)' },
  { k: 'frio', ic: '❄️', nome: 'Sumido', dica: 'mais de 3 meses, ou nunca registrou', tom: 'var(--info)' }
];

// ───────────────────────────── utilidades ─────────────────────────────────
function rdSecao() { return typeof redeSecao !== 'undefined' ? redeSecao : 'contatos'; }
function rdIniciais(nome) {
  const p = String(nome || '').replace(/^(dr|dra|sr|sra)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
function rdCor(txt) { let h = 0; for (const c of String(txt || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return RD_CORES[h % RD_CORES.length]; }
function rdDias(c) { return c.ultimo ? tarDiasEntre(c.ultimo, hojeISO()) : null; }
function rdFaixa(c) {
  const d = rdDias(c);
  if (d === null || d > 90) return 'frio';
  if (precisaFalar(c) || d > 30) return 'morno';
  return 'quente';
}
function rdHa(c) {
  const d = rdDias(c);
  return d === null ? 'nunca registrou' : d === 0 ? 'falou hoje' : d === 1 ? 'falou ontem' : `há ${d} dias`;
}
/** Próximo aniversário (data deste ano ou do próximo) e a idade que faz, se o ano for conhecido. */
function rdAniversario(c) {
  if (!c.nascimento) return null;
  const [y, m, d] = c.nascimento.split('-').map(Number), hoje = hojeISO(), ano = Number(hoje.slice(0, 4));
  let prox = isoDe(new Date(ano, m - 1, d)); if (prox < hoje) prox = isoDe(new Date(ano + 1, m - 1, d));
  const faltam = tarDiasEntre(hoje, prox), idade = y > 1900 && y < ano ? Number(prox.slice(0, 4)) - y : 0;
  return { prox, faltam, idade };
}
function rdSoDigitos(t) { return String(t || '').replace(/\D/g, ''); }
function rdZap(tel) { const d = rdSoDigitos(tel); if (d.length < 10) return ''; return 'https://wa.me/' + (d.length <= 11 ? '55' + d : d); }

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function rdAchar(nome) {
  const alvo = tarSemAcento(nome).trim(); if (!alvo) return null;
  return contacts.find(c => tarSemAcento(c.nome) === alvo) || contacts.find(c => tarSemAcento(c.nome).split(/\s+/).some(p => p === alvo)) || contacts.find(c => tarSemAcento(c.nome).includes(alvo)) || null;
}
function rdEntender(txt) {
  let resto = String(txt || '').trim();
  const falei = resto.match(/^(?:falei|conversei|liguei|encontrei)\s+(?:com|pra|para|pro)?\s*(.+)$/i);
  if (falei) { const quem = falei[1].replace(/^(?:a|o|as|os)\s+/i, '').trim(); return { tipo: 'falei', nome: quem, contato: rdAchar(quem) }; }
  const tags = [];
  resto = resto.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (m, a, t) => { const ex = tagsDaRede().find(x => tarSemAcento(x) === tarSemAcento(t)); tags.push(ex || t); return ' '; });
  let email = ''; resto = resto.replace(/\S+@\S+\.\S+/, m => { email = m; return ' '; });
  let tel = ''; resto = resto.replace(/(\+?\d[\d\s().-]{7,}\d)/, m => { tel = m.trim(); return ' '; });
  const partes = resto.split(',').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return { tipo: 'novo', nome: partes[0] || '', papel: partes[1] || '', onde: partes.slice(2).join(', '), tags, tel, email, existe: partes[0] ? rdAchar(partes[0]) : null };
}
function rdRapidaPrevia() {
  const el = document.getElementById('rd-rapida-previa'), inp = document.getElementById('rd-rapida'); if (!el || !inp) return;
  if (!inp.value.trim()) { el.innerHTML = '<span class="tar-dica">Ex.: <b>Dr. João, contador, congresso #negócios 31 99999-0000</b> — ou <b>falei com João</b> para marcar a conversa de hoje.</span>'; return; }
  const e = rdEntender(inp.value);
  if (e.tipo === 'falei') {
    el.innerHTML = e.contato ? `<span class="tar-entendi">entendi:</span> <span class="tar-lt" style="--cor:var(--ok)">💬 falei hoje com</span> <b>${esc(e.contato.nome)}</b>` : `<span class="tar-entendi">entendi:</span> <span class="tar-due atras">não achei "${esc(e.nome)}" nos contatos</span>`;
    return;
  }
  const p = [];
  if (e.papel) p.push(`<span class="nt-marc sem-hash">${esc(e.papel)}</span>`);
  if (e.onde) p.push(`<span class="nt-marc sem-hash">conheci: ${esc(e.onde)}</span>`);
  e.tags.forEach(t => p.push(`<span class="nt-marc">${esc(t)}</span>`));
  if (e.tel) p.push(`<span class="nt-marc sem-hash">📞 ${esc(e.tel)}</span>`);
  if (e.email) p.push(`<span class="nt-marc sem-hash">✉️ ${esc(e.email)}</span>`);
  if (e.existe) p.push(`<span class="tar-due hoje">já existe "${esc(e.existe.nome)}" — vai criar outro</span>`);
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.nome || '…')}</b> ${p.join(' ')}`;
}
function rdRapidaAdicionar() {
  const inp = document.getElementById('rd-rapida'); if (!inp) return;
  const e = rdEntender(inp.value);
  if (e.tipo === 'falei') {
    if (!e.contato) { toast(`Não achei "${e.nome}" nos contatos.`); inp.focus(); return; }
    faleiCom(e.contato.id);
  } else {
    if (!e.nome) { inp.focus(); return; }
    contacts.push({ id: novoId(), favorito: false, ultimo: '', createdAt: Date.now(), nome: e.nome, papel: e.papel, onde: e.onde, tags: e.tags, tel: e.tel, email: e.email, links: '', notas: '', lembrar: 0, nascimento: '' });
    salvar('contacts', contacts); renderRede(); toast(`🤝 ${e.nome} salvo.`);
  }
  inp.value = ''; rdRapidaPrevia(); inp.focus();
}

// ═══════════════════════ 2. OS CARTÕES E O TERMÔMETRO ═════════════════════
function rdCartao(c) {
  const f = rdFaixa(c), cor = rdCor(c.nome);
  return `<div class="rd-cartao f-${f}" tabindex="0" onclick="rdAbrir(${c.id})" onkeydown="if (event.key === 'Enter') rdAbrir(${c.id})">
    <span class="rd-av" style="--cor:${cor}">${esc(rdIniciais(c.nome))}</span>
    <div class="rd-cartao-info">
      <b>${c.favorito ? '<span class="rd-fav" title="Favorito">★</span> ' : ''}${esc(c.nome)}</b>
      ${c.papel ? `<small class="rd-papel">${esc(c.papel)}</small>` : ''}
      <small class="rd-ha">${rdHa(c)}${c.onde ? ' · ' + esc(c.onde) : ''}</small>
    </div>
    <button type="button" class="mini-btn rd-falei" title="Falei hoje" onclick="event.stopPropagation(); faleiCom(${c.id})">💬</button>
  </div>`;
}
function rdRenderRede() {
  const el = document.getElementById('rede-lista'); if (!el) return;
  const topo = document.getElementById('rd-topo');
  const falar = contacts.filter(precisaFalar).sort((a, b) => (rdDias(b) ?? 9999) - (rdDias(a) ?? 9999));
  const aniv = contacts.map(c => ({ c, a: rdAniversario(c) })).filter(x => x.a && x.a.faltam <= 30).sort((x, y) => x.a.faltam - y.a.faltam);
  if (topo) topo.innerHTML = (aniv.length || falar.length) ? `<div class="rd-topo">
      ${aniv.length ? `<div class="rd-faixa-topo"><b>🎂 Aniversários</b><div>${aniv.map(({ c, a }) => `<button type="button" class="rd-chip-top${a.faltam <= 1 ? ' hoje' : ''}" onclick="rdAbrir(${c.id})">${esc(c.nome.split(' ')[0])} · ${a.faltam === 0 ? 'hoje!' : a.faltam === 1 ? 'amanhã' : `${esc(diaSemanaCurto(a.prox))} ${isoParaBR(a.prox).slice(0, 5)}`}${a.idade ? ` · ${a.idade} anos` : ''}</button>`).join('')}</div></div>` : ''}
      ${falar.length ? `<div class="rd-faixa-topo"><b>⏰ Falar esta semana</b><div>${falar.slice(0, 8).map(c => `<span class="rd-chip-top"><button type="button" onclick="rdAbrir(${c.id})">${esc(c.nome)}</button><button type="button" class="rd-chip-ok" title="Falei hoje" onclick="faleiCom(${c.id})">💬</button></span>`).join('')}${falar.length > 8 ? `<small>＋ ${falar.length - 8}</small>` : ''}</div></div>` : ''}
    </div>` : '';
  const chips = document.getElementById('rede-chips');
  if (chips) chips.innerHTML = `<span class="chip ${redeFiltro === '' ? 'sel' : ''}" onclick="filtrarRede('')">todos (${contacts.length})</span><span class="chip ${redeFiltro === '__fav' ? 'sel' : ''}" onclick="filtrarRede('__fav')">⭐ favoritos</span>` + tagsDaRede().map(t => `<span class="chip ${redeFiltro === t ? 'sel' : ''}" onclick="filtrarRede(this.dataset.t)" data-t="${esc(t)}">🏷️ ${esc(t)}</span>`).join('');
  const lista = contatosFiltrados();
  if (!contacts.length) { el.innerHTML = '<div class="sp-vazio">Guarde aqui quem você conhece do trabalho, dos negócios e da vida. Escreva na barra acima.</div>'; return; }
  if (!lista.length) { el.innerHTML = '<div class="sp-vazio">Ninguém neste filtro.</div>'; return; }
  el.innerHTML = RD_FAIXAS.map(F => {
    const lst = lista.filter(c => rdFaixa(c) === F.k);
    if (!lst.length) return '';
    if (F.k !== 'quente') lst.sort((a, b) => (b.favorito ? 1 : 0) - (a.favorito ? 1 : 0) || (rdDias(b) ?? 9999) - (rdDias(a) ?? 9999));
    return `<section class="rd-faixa" style="--tom:${F.tom}"><h3 class="tar-gr-tit" title="${F.dica}"><span>${F.ic} ${F.nome}</span> <small>${lst.length}</small><small class="rd-dica">· ${F.dica}</small></h3><div class="rd-grade">${lst.map(rdCartao).join('')}</div></section>`;
  }).join('');
  if (rdEstado.detalhe) rdDesenharDetalhe();
}

// ═══════════════════════ 3. O DETALHE DO CONTATO ══════════════════════════
function rdAbrir(id) { rdEstado.detalhe = id; const m = document.getElementById('rd-detalhe'); if (!m) return; rdDesenharDetalhe(); m.style.display = 'flex'; }
function rdFechar() { const m = document.getElementById('rd-detalhe'); if (m) m.style.display = 'none'; rdEstado.detalhe = null; }
function rdDesenharDetalhe() {
  const c = contacts.find(x => x.id === rdEstado.detalhe), corpo = document.getElementById('rd-detalhe-corpo');
  if (!corpo) return;
  if (!c) { rdFechar(); return; }
  document.getElementById('rd-detalhe-tit').textContent = `🤝 ${c.nome}`;
  const a = rdAniversario(c), zap = rdZap(c.tel), F = RD_FAIXAS.find(x => x.k === rdFaixa(c));
  corpo.innerHTML = `<div class="rd-det-cab"><span class="rd-av grande" style="--cor:${rdCor(c.nome)}">${esc(rdIniciais(c.nome))}</span>
      <div><b>${esc(c.nome)}</b>${c.papel ? `<small>${esc(c.papel)}</small>` : ''}<span class="tar-lt" style="--cor:${F.tom}">${F.ic} ${F.nome} · ${rdHa(c)}</span></div></div>
    <div class="rd-det-contato">
      ${c.tel ? `<a class="mini-btn" href="tel:${esc(rdSoDigitos(c.tel))}">📞 ${esc(c.tel)}</a>` : ''}
      ${zap ? `<a class="mini-btn" href="${esc(zap)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      ${c.email ? `<a class="mini-btn" href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>` : ''}
    </div>
    <dl class="rd-det-dados">
      ${c.onde ? `<dt>Onde conheci</dt><dd>${esc(c.onde)}</dd>` : ''}
      ${a ? `<dt>Aniversário</dt><dd>${isoParaBR(c.nascimento).slice(0, 5)}${a.faltam <= 30 ? ` · ${a.faltam === 0 ? 'é hoje! 🎂' : 'em ' + plural(a.faltam, 'dia', 'dias')}` : ''}${a.idade ? ` · faz ${a.idade}` : ''}</dd>` : ''}
      ${c.lembrar ? `<dt>Lembrar</dt><dd>a cada ${plural(Number(c.lembrar), 'dia', 'dias')}${precisaFalar(c) ? ' · <b class="rd-atras">já passou</b>' : ''}</dd>` : ''}
      ${(c.tags || []).length ? `<dt>Marcadores</dt><dd>${c.tags.map(t => `<span class="nt-marc">${esc(t)}</span>`).join(' ')}</dd>` : ''}
      ${c.links ? `<dt>Links</dt><dd>${linkify(esc(c.links))}</dd>` : ''}
      ${c.notas ? `<dt>Notas</dt><dd>${esc(c.notas)}</dd>` : ''}
    </dl>
    <div class="lz-det-acoes">
      <button type="button" class="mini-btn on" onclick="faleiCom(${c.id})">💬 falei hoje</button>
      <button type="button" class="mini-btn${c.favorito ? ' on' : ''}" onclick="favoritarContato(${c.id})">${c.favorito ? '★ favorito' : '☆ favoritar'}</button>
      <button type="button" class="mini-btn" onclick="rdFechar(); editarContato(${c.id})">✎ editar</button>
      <button type="button" class="mini-btn" onclick="removerContato(${c.id})">✕ apagar</button>
    </div>`;
}

// ═══════════════════ 4. O CURRÍCULO: MEDIDOR, LINHA, FOLHA ════════════════
/** O que deixa um currículo completo — e o que falta. */
function rdChecagemCV() {
  const c = cv(), n = k => (c[k] || []).length;
  return [
    ['nome', !!(c.nome || '').trim()], ['título', !!(c.titulo || '').trim()], ['contato', !!(c.email || c.tel)], ['cidade', !!(c.cidade || '').trim()],
    ['"sobre" com 80+ letras', (c.sobre || '').trim().length >= 80], ['uma experiência', n('experiencias') > 0], ['uma formação', n('formacoes') > 0],
    ['3 competências', n('competencias') >= 3], ['um idioma', n('idiomas') > 0], ['um curso', n('cursos') > 0], ['um link', (c.links || '').trim().length > 0]
  ];
}
function rdLinhaCarreira() {
  const c = cv(), hoje = hojeISO().slice(0, 7);
  const itens = [...(c.formacoes || []).map(x => ({ x, tipo: 'formacao', nome: x.curso || x.org })), ...(c.experiencias || []).map(x => ({ x, tipo: 'experiencia', nome: x.cargo ? `${x.cargo}${x.org ? ' · ' + x.org : ''}` : x.org })) ]
    .filter(i => /^\d{4}-\d{2}$/.test(i.x.inicio || '') && i.nome)
    .map(i => ({ ...i, ini: i.x.inicio, fim: /^\d{4}-\d{2}$/.test(i.x.fim || '') ? i.x.fim : hoje, atual: !/^\d{4}-\d{2}$/.test(i.x.fim || '') }))
    .sort((a, b) => a.ini.localeCompare(b.ini));
  if (!itens.length) return '<div class="tar-dica rd-linha-vazia">A linha da carreira aparece quando houver experiência ou formação com o mês de início.</div>';
  const mes = s => Number(s.slice(0, 4)) * 12 + Number(s.slice(5, 7)) - 1;
  const a0 = Number(itens[0].ini.slice(0, 4)), a1 = Number(hoje.slice(0, 4)) + 1, t0 = a0 * 12, t1 = a1 * 12, tot = t1 - t0;
  const passo = Math.max(1, Math.ceil((a1 - a0) / 8));
  const anos = []; for (let y = a0; y <= a1; y += passo) anos.push(y);
  return `<div class="rd-linha">
    <div class="rd-linha-anos">${anos.map(y => `<span style="left:${((y * 12 - t0) / tot * 100).toFixed(2)}%">${y}</span>`).join('')}</div>
    ${itens.map(i => {
      const l = (mes(i.ini) - t0) / tot * 100, w = Math.min(100 - l, Math.max(1.5, (mes(i.fim) - mes(i.ini) + 1) / tot * 100));
      // barra estreita: o nome sai para fora — à direita se couber, senão à esquerda
      const rot = `${i.tipo === 'formacao' ? '🎓' : '💼'} ${esc(i.nome)}`, dentro = w >= 34;
      const dir = 100 - (l + w), esq = l, vaiDir = dir >= esq, cabe = (vaiDir ? dir : esq).toFixed(2);
      const fora = dentro ? '' : (vaiDir ? `<i class="rd-rot fora-dir" style="left:calc(${(l + w).toFixed(2)}% + 6px); max-width:calc(${cabe}% - 8px)">${rot}</i>` : `<i class="rd-rot fora-esq" style="right:calc(${(100 - l).toFixed(2)}% + 6px); max-width:calc(${cabe}% - 8px)">${rot}</i>`);
      return `<div class="rd-linha-fila"><span class="rd-barra ${i.tipo}${i.atual ? ' atual' : ''}" style="left:${l.toFixed(2)}%; width:${w.toFixed(2)}%" title="${esc(i.nome)} · ${periodoCV(i.x)}">${dentro ? `<i>${rot}</i>` : ''}</span>${fora}</div>`;
    }).join('')}
    <div class="rd-linha-legenda"><span class="experiencia">💼 experiência</span><span class="formacao">🎓 formação</span><span class="tar-dica">barra que chega na borda = atual</span></div>
  </div>`;
}
/** Chamado no fim do renderFolhaCV(): o medidor e a linha acompanham a digitação. */
function rdResumoCV() {
  const el = document.getElementById('cv-resumo'); if (!el) return;
  const ch = rdChecagemCV(), ok = ch.filter(x => x[1]).length, pct = Math.round(ok / ch.length * 100), falta = ch.filter(x => !x[1]).map(x => x[0]);
  el.innerHTML = `<div class="rd-medidor"><div class="rd-medidor-barra"><i style="width:${pct}%" class="${pct === 100 ? 'ok' : pct < 50 ? 'baixo' : ''}"></i></div><b>${pct}% completo</b>${falta.length ? `<small>falta: ${esc(falta.slice(0, 4).join(', '))}${falta.length > 4 ? '…' : ''}</small>` : '<small class="ok">✅ tudo preenchido</small>'}</div>${rdLinhaCarreira()}`;
}
/** Chamado no fim do renderCurriculo(): as seções do editor abrem e fecham. */
function rdDepoisCV() {
  document.querySelectorAll('#cv-secoes .cv-secao').forEach(sec => {
    const k = sec.id.replace(/^cv-/, '');
    sec.classList.toggle('fechada', !rdEstado.cvAbertas.has(k));
    const h = sec.querySelector('h4'); if (!h || h._rd) return; h._rd = true;
    h.setAttribute('role', 'button'); h.tabIndex = 0;
    const alterna = ev => { if (ev.target.closest('button')) return; rdEstado.cvAbertas.has(k) ? rdEstado.cvAbertas.delete(k) : rdEstado.cvAbertas.add(k); sec.classList.toggle('fechada', !rdEstado.cvAbertas.has(k)); };
    h.addEventListener('click', alterna);
    h.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); alterna(ev); } });
  });
  rdCVModo(rdEstado.cvModo);
}
function rdAbrirSecaoCV(k) { rdEstado.cvAbertas.add(k); }
/** No celular: editar OU ver a folha (no PC as duas ficam lado a lado e o botão some). */
function rdCVModo(m) {
  rdEstado.cvModo = m === 'folha' ? 'folha' : 'editar';
  const sec = document.getElementById('sec-curriculo'); if (sec) sec.classList.toggle('ver-folha', rdEstado.cvModo === 'folha');
  document.querySelectorAll('#rd-cv-modo > span').forEach(s => s.classList.toggle('active', (s.dataset.m || '') === rdEstado.cvModo));
}

// ══════════════════════════ O DESENHO GERAL ═══════════════════════════════
/** Chamado pelo verSecaoRede() do app.js depois de trocar a micro-aba. */
function rdAoTrocar() {
  const r = document.getElementById('sec-rd-rapida'); if (r) r.hidden = rdSecao() !== 'contatos';
  rdRapidaPrevia();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
