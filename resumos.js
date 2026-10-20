// ════════════════════════════════════════════════════════════════════════════
// PAINEL DE RESUMO NAS ABAS (19/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Ideia dele (caderno da Saúde, 15/10): "painel simples demais (em todas as abas, o painel principal de cada
// uma delas deve conter o resumo de todas as sub-abas desse tema e também mais informações gerais sobre o
// assunto)". Em 19/10 ele escolheu fazer isso nas abas que ainda não tinham. Saúde, Finanças, Negócios e
// Clínica já têm o 📊 Painel; a Produção tem a Oficina; o Inventário é uma página só, com o resumo no alto.
// Ficam 7: Agenda, Tarefas, Notas, Estudos, Lazer, Viagens e Rede.
//
// FORMA: a mesma grade de quadros do Painel da Saúde (aprovado em 08/10 — "quero esse empenho para as outras
// abas"). Cada quadro é uma sub-aba, com desenho PRÓPRIO (nada de quadro copiado do vizinho), o cabeçalho leva
// até ela e a linha de baixo responde ao toque. Os números vêm das mesmas contas das ☰ Barras (AB_VIVOS), para
// o painel e a faixa dizerem a mesma coisa.
//
// Este arquivo NÃO cria dado nem módulo: só lê. Os toques que mudam algo (marcar a pauta, concluir tarefa…)
// chamam as funções que a própria aba já usa.
// Carrega depois do painel.js e ANTES do arrumar.js (que lê as micro-abas para as Barras e o ✎ Arrumar).
// Liga/desliga: ⚙ de cada aba → "Painel de resumo" (prefs.rsPainel[aba], por aparelho; padrão ligado).
// ════════════════════════════════════════════════════════════════════════════

/** As abas que ganham o Painel. `secoes` = o que some quando o Painel está aberto (a função da aba devolve). */
const RS_ABAS = {
  // `junto`: a parte que aparece EMBAIXO do Painel (pedido dele, 19/10: a Agenda "abre em ambas as partes")
  home: { fn: 'verSecaoAgenda', fileira: 'agenda-secoes', primeira: 'cal', render: 'rsRenderHome',
    secoes: ['sec-cal', 'sec-compromissos', 'sec-plantoes'], junto: { chip: 'cal', secao: 'sec-cal', nome: 'Calendário' } },
  tasks: { fn: 'verSecaoTarefas', fileira: 'tarefas-secoes', primeira: 'foco', render: 'rsRenderTasks',
    secoes: ['sec-tar-foco', 'sec-tar-listas', 'sec-tar-rotinas'] },
  notes: { fn: 'verSecaoNotas', fileira: 'notas-secoes', primeira: 'notas', render: 'rsRenderNotes',
    secoes: ['sec-nt-filtros', 'sec-nt-notas', 'sec-nt-listas', 'sec-nt-entregas', 'nt-vista'] },
  studies: { fn: 'verSecaoEstudos', fileira: 'estudos-secoes', primeira: 'mesa', render: 'rsRenderStudies',
    secoes: ['sec-es-mesa', 'sec-es-estante', 'sec-es-sessoes', 'sec-es-ritual'] },
  leisure: { fn: 'verSecaoLazer', fileira: 'lazer-secoes', primeira: 'midia', render: 'rsRenderLeisure',
    secoes: ['sec-midia', 'sec-saidas', 'sec-musica'] },
  trips: { fn: 'verSecaoViagens', fileira: 'viagens-secoes', primeira: 'viagens', render: 'rsRenderTrips',
    secoes: ['sec-viagens', 'sec-milhas'] },
  net: { fn: 'verSecaoRede', fileira: 'rede-secoes', primeira: 'contatos', render: 'rsRenderNet',
    secoes: ['sec-contatos', 'sec-curriculo'] }
};
const rsAtivo = {};   // aba → o Painel está aberto nela
const rsSel = {};     // aba → o que foi tocado (a linha de detalhe responde a ele)

function cfgRs() { prefs.rsPainel = prefs.rsPainel || {}; return prefs.rsPainel; }
function rsLigado(aba) { return cfgRs()[aba] !== false; }
function rsNomeDoChip(ch) { const m = (ch.getAttribute('onclick') || '').match(/\(\s*'([^']+)'/); return m ? m[1] : ''; }
/** A parte que vem junto, embaixo do Painel — se a aba tem, se está ligada (⚙) e fora das ☰ Barras (lá é uma faixa por vez). */
function rsJunto(aba) {
  const d = RS_ABAS[aba]; if (!d || !d.junto || cfgRs()[aba + ':junto'] === false) return null;
  return typeof abVista === 'function' && abVista(aba) === 'barras' ? null : d.junto;
}

// ───────────────────────────── montar e trocar ─────────────────────────────
/** Põe a micro-aba "📊 Painel" na frente e a seção dela logo antes da primeira seção da aba. */
function rsMontar(aba) {
  const d = RS_ABAS[aba], fil = document.getElementById(d.fileira), sec = document.getElementById(aba);
  if (!fil || !sec || document.getElementById('rs-chip-' + aba)) return;
  const ch = document.createElement('span');
  ch.id = 'rs-chip-' + aba; ch.setAttribute('onclick', `${d.fn}('painel', this)`); ch.textContent = '📊 Painel';
  fil.insertBefore(ch, fil.firstChild);
  const box = document.createElement('div');
  box.id = `sec-${aba}-painel`; box.className = 'agenda-sec rs-sec'; box.hidden = true;
  box.innerHTML = `<div class="rs-painel" id="rs-${aba}"></div>`;
  const antes = d.secoes.map(id => document.getElementById(id)).find(e => e && e.parentElement === sec);
  sec.insertBefore(box, antes || null);
  if (!rsLigado(aba)) ch.hidden = true;
}
/** A função de trocar de seção da aba aprende o 'painel'. As outras seções seguem com a função de sempre. */
function rsEmbrulhar(aba) {
  const d = RS_ABAS[aba], orig = window[d.fn];
  if (typeof orig !== 'function' || orig._rs) return;
  const nova = function (s, el) {
    const box = document.getElementById(`sec-${aba}-painel`), fil = document.getElementById(d.fileira);
    if (s === 'painel') {
      if (!rsLigado(aba)) return nova.call(this, d.primeira);
      rsAtivo[aba] = true;
      // a parte que vem junto se abre pela função de sempre (estado da aba, filtros, botões), e o Painel por cima
      const j = rsJunto(aba);
      if (j) orig.call(this, j.chip);
      if (fil) fil.querySelectorAll(':scope > span').forEach(x => x.classList.toggle('active', x.id === 'rs-chip-' + aba || (!!j && rsNomeDoChip(x) === j.chip)));
      d.secoes.forEach(id => { if (j && id === j.secao) return; const e = document.getElementById(id); if (e) e.hidden = true; });
      if (box) box.hidden = false;
      rsDesenhar(aba);
      if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
      return;
    }
    rsAtivo[aba] = false; if (box) box.hidden = true;
    rsArrumarLado(aba);   // saiu do Painel: a parte junto volta à largura toda
    const r = orig.apply(this, arguments);
    // 🪤 armadilha 12: várias abas acendem a micro-aba pela POSIÇÃO; com o Painel na frente, acenderiam a vizinha
    if (!el && fil) fil.querySelectorAll(':scope > span').forEach(x => x.classList.toggle('active', rsNomeDoChip(x) === s));
    return r;
  };
  nova._rs = true; window[d.fn] = nova;
}
function rsDesenhar(aba) {
  const d = RS_ABAS[aba]; if (!d || !rsAtivo[aba]) return;
  try { const f = window[d.render]; if (typeof f === 'function') f(); }
  catch (e) { const el = document.getElementById('rs-' + aba); if (el) el.innerHTML = `<div class="sp-vazio">O painel não conseguiu se desenhar (${esc(e.message || String(e))}). As micro-abas seguem normais.</div>`; console.error(e); }
  // lado a lado (ou não) conforme as colunas de AGORA: a aba pode ter estado escondida (sem colunas) na partida
  rsArrumarLado(aba);
}
function rsTocar(aba, k) { rsSel[aba] = rsSel[aba] === k ? null : k; rsDesenhar(aba); }
/** Qualquer gravação (de qualquer aparelho, pela sync também) redesenha o Painel que está à vista. */
let rsTimer = null;
function rsAgendar() {
  clearTimeout(rsTimer);
  rsTimer = setTimeout(() => { const aba = (typeof ABA_ATUAL === 'function' ? ABA_ATUAL() : '').replace(/^btn-/, ''); if (rsAtivo[aba]) rsDesenhar(aba); }, 120);
}
function rsMudar(aba, on) {
  cfgRs()[aba] = !!on;
  try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { }
  const ch = document.getElementById('rs-chip-' + aba); if (ch) ch.hidden = !on;
  const d = RS_ABAS[aba];
  if (on) window[d.fn]('painel', ch); else if (rsAtivo[aba]) window[d.fn](d.primeira);
  if (typeof renderConfigAba === 'function') renderConfigAba();
}
/** modo: false (só o Painel) · 'baixo' (embaixo dele) · 'lado' (ao lado na tela larga — o padrão desde 20/10). */
function rsMudarJunto(aba, modo) {
  cfgRs()[aba + ':junto'] = modo === false ? false : modo === 'baixo' ? 'baixo' : 'lado';
  try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { }
  if (rsAtivo[aba]) window[RS_ABAS[aba].fn]('painel');
  if (typeof renderConfigAba === 'function') renderConfigAba();
}
/** Como a parte junto aparece: 'nao' · 'baixo' · 'lado'. O true antigo (a caixinha "junto" ligada) vale como 'lado'. */
function rsJuntoModo(aba) { const v = cfgRs()[aba + ':junto']; return v === false ? 'nao' : v === 'baixo' ? 'baixo' : 'lado'; }
function rsHtmlCfg(aba) {
  const on = rsLigado(aba), j = RS_ABAS[aba].junto, m = rsJuntoModo(aba);
  // (20/10, item 8) linhas iguais às outras da janela da aba (fica no grupo "Como ver", que o arrumar.js põe na frente)
  return clChave('business', 'Painel de resumo', on ? 'A aba abre no resumo de todas as partes' : 'A aba abre direto na 1ª parte', on, `rsMudar('${aba}', this.checked)`)
    + (j && on ? clEscolha('home', `${j.nome} junto`, m === 'lado' ? 'Ao lado na tela larga; embaixo no celular' : m === 'baixo' ? 'Embaixo do painel' : 'Só o painel ao abrir',
      clSeg([['Não', `rsMudarJunto('${aba}', false)`, m === 'nao'], ['Embaixo', `rsMudarJunto('${aba}', 'baixo')`, m === 'baixo'], ['Ao lado', `rsMudarJunto('${aba}', 'lado')`, m === 'lado']])) : '');
}
/** (20/10, item 9) "Lado a lado no PC": o Painel e a parte junto dividem a grade da aba (colunas de ≥ 340 px, CSS
 *  auto-fill). 4 colunas ou mais (o 21:9 dele): metade e metade, o Calendário com o que sobrar; 3 (notebook): 1/3 e 2/3;
 *  menos que isso (tablet, celular): um embaixo do outro. Conta as colunas de verdade, a cada troca e a cada resize. */
function rsArrumarLado(aba) {
  const d = RS_ABAS[aba], sec = document.getElementById(aba); if (!d || !d.junto || !sec) return;
  const box = document.getElementById(`sec-${aba}-painel`), par = document.getElementById(d.junto.secao);
  const limpar = () => { [box, par].forEach(e => { if (e) e.style.gridColumn = ''; }); sec.classList.remove('rs-lado'); };
  if (!box || !par || !rsAtivo[aba] || !rsJunto(aba) || rsJuntoModo(aba) !== 'lado') return limpar();
  const est = getComputedStyle(sec), n = est.display === 'grid' ? est.gridTemplateColumns.split(/\s+/).filter(Boolean).length : 0;
  if (n < 3) return limpar();
  const a = n >= 4 ? Math.floor(n / 2) : 1;
  box.style.gridColumn = `1 / span ${a}`; par.style.gridColumn = `${a + 1} / -1`; sec.classList.add('rs-lado');
}
let rsLadoTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(rsLadoTimer);
  rsLadoTimer = setTimeout(() => { const aba = (typeof ABA_ATUAL === 'function' ? ABA_ATUAL() : '').replace(/^btn-/, ''); if (RS_ABAS[aba]) rsArrumarLado(aba); }, 150);
});

// ───────────────────────────── peças comuns ────────────────────────────────
function rsQuadro(classe, ic, tit, sub, irPara, corpo, info) {
  return `<section class="sp-quadro ${classe}">
    <button type="button" class="sp-cab" onclick="${irPara}"><span class="sp-ic">${ic}</span><span class="sp-tit">${tit}</span><small>${sub || ''}</small><span class="sp-ir">›</span></button>
    ${corpo}${info ? `<div class="sp-info rs-info">${info}</div>` : ''}</section>`;
}
function rsVivo(chave) { try { const f = typeof AB_VIVOS !== 'undefined' && AB_VIVOS[chave]; return f ? esc(f() || '') : ''; } catch (e) { return ''; } }
function rsMin(t) { const [h, m] = String(t || '').split(':').map(Number); return isNaN(h) ? null : h * 60 + (m || 0); }
function rsHora(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
function rsDinheiro(v) { return 'R$ ' + Math.round(Number(v) || 0).toLocaleString('pt-BR'); }
function rsEmQuanto(min) { if (min < 1) return 'agora'; if (min < 60) return `em ${Math.round(min)} min`; const h = Math.floor(min / 60), m = Math.round(min % 60); return `em ${h} h${m ? ' ' + m : ''}`; }
function rsDiasAte(iso) { const [y, m, d] = iso.split('-').map(Number), [a, b, c] = hojeISO().split('-').map(Number); return Math.round((new Date(y, m - 1, d) - new Date(a, b - 1, c)) / 864e5); }
function rsQuando(iso) { const n = rsDiasAte(iso); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n === -1 ? 'ontem' : n > 1 && n < 7 ? `${diaSemanaCurto(iso)} (em ${n} dias)` : isoParaBR(iso).slice(0, 5); }

// ════════════════════════════════════════════════════════════════════════════
// 📅 AGENDA — relógio do dia · os próximos 7 dias · reuniões · o mês de plantões
// ════════════════════════════════════════════════════════════════════════════
/** Os itens com hora de um dia: plantões (horas) e compromissos (início e fim). */
function rsAgItens(iso) {
  const l = [];
  itensDoDia(iso).forEach((it, i) => {
    const o = it.obj || {};
    if (it.kind === 'shift') { const a = rsMin(it.time || o.time); if (a === null) return; l.push({ k: 'p' + i, tipo: 'shift', a, b: a + (Number(o.hours) || 12) * 60, tit: o.desc || vt().um, cor: 'var(--laranja)', ic: vt().ic, obj: o }); }
    else if (it.kind === 'event') {
      const a = rsMin(it.time || o.time); const t = TIPOS_EVENTO[o.type] || TIPOS_EVENTO.outro || { cor: 'var(--info)', icone: '📌' };
      if (a === null) { l.push({ k: 'e' + i, tipo: 'event', a: null, b: null, tit: o.title, cor: t.cor, ic: t.icone, obj: o }); return; }
      const fim = rsMin(o.endTime); l.push({ k: 'e' + i, tipo: 'event', a, b: fim !== null && fim > a ? fim : a + 60, tit: o.title, cor: t.cor, ic: t.icone, obj: o, feito: o.done });
    }
  });
  return l.sort((x, y) => (x.a ?? -1) - (y.a ?? -1));
}
function rsArco(c, r, a, b) {
  const ang = m => (m / 1440) * 2 * Math.PI - Math.PI / 2;
  const p = m => [(c + r * Math.cos(ang(m))).toFixed(1), (c + r * Math.sin(ang(m))).toFixed(1)];
  b = Math.min(b, a + 1439); const [x0, y0] = p(a), [x1, y1] = p(b);
  return `M${x0} ${y0} A${r} ${r} 0 ${b - a > 720 ? 1 : 0} 1 ${x1} ${y1}`;
}
function rsAgHoje() {
  const h = hojeISO(), sel = rsSel.home, agora = new Date(), mAgora = agora.getHours() * 60 + agora.getMinutes();
  const itens = rsAgItens(h), tarefas = tasks.filter(t => !t.done && t.due === h).length;
  const comHora = itens.filter(i => i.a !== null);
  // relógio de 24 h: meia-noite no alto; plantões no anel de fora, compromissos no de dentro
  const C = 110, ticks = Array.from({ length: 24 }, (_, i) => { const an = i / 24 * 2 * Math.PI - Math.PI / 2, r1 = i % 6 ? 93 : 90;
    return `<line x1="${(C + r1 * Math.cos(an)).toFixed(1)}" y1="${(C + r1 * Math.sin(an)).toFixed(1)}" x2="${(C + 97 * Math.cos(an)).toFixed(1)}" y2="${(C + 97 * Math.sin(an)).toFixed(1)}" class="rs-rel-tick${i % 6 ? '' : ' forte'}"/>`; }).join('');
  // rótulos FORA dos risquinhos (em 208/12 eles encostavam no tique das 6h e das 18h): a caixa do desenho tem margem
  const rot = [[0, 'meia-noite', C, 8], [6, '6h', 218, C + 3], [12, '12h', C, 217], [18, '18h', 2, C + 3]].map(([, t, x, y]) => `<text x="${x}" y="${y}" class="rs-rel-rot">${t}</text>`).join('');
  const arcos = comHora.map(i => `<path d="${rsArco(C, i.tipo === 'shift' ? 80 : 65, i.a, i.b)}" class="rs-rel-arco${sel === i.k ? ' sel' : ''}${i.b <= mAgora ? ' passou' : ''}" style="--c:${i.cor}" onclick="rsTocar('home', '${i.k}')"><title>${esc(i.tit)} · ${rsHora(i.a)}–${rsHora(i.b)}</title></path>`).join('');
  const an = mAgora / 1440 * 2 * Math.PI - Math.PI / 2;
  // o ponteiro nasce fora do miolo (que tem o texto) e vai até a borda
  const ponteiro = `<line x1="${(C + 50 * Math.cos(an)).toFixed(1)}" y1="${(C + 50 * Math.sin(an)).toFixed(1)}" x2="${(C + 90 * Math.cos(an)).toFixed(1)}" y2="${(C + 90 * Math.sin(an)).toFixed(1)}" class="rs-rel-ponteiro"/><circle cx="${(C + 90 * Math.cos(an)).toFixed(1)}" cy="${(C + 90 * Math.sin(an)).toFixed(1)}" r="4" class="rs-rel-ponta"/>`;
  const emCurso = comHora.find(i => i.a <= mAgora && i.b > mAgora), prox = comHora.find(i => i.a > mAgora);
  const centro = emCurso ? `<small>AGORA</small><b>${esc(emCurso.tit)}</b><span>até ${rsHora(emCurso.b)}</span>`
    : prox ? `<small>PRÓXIMO</small><b>${esc(prox.tit)}</b><span>${rsHora(prox.a)} · ${rsEmQuanto(prox.a - mAgora)}</span>`
    : `<small>HOJE</small><b>${comHora.length ? 'tudo feito' : 'dia livre'}</b><span>${rsHora(mAgora)}</span>`;
  const lista = itens.map(i => `<button type="button" class="rs-ag-item${sel === i.k ? ' sel' : ''}${i.b !== null && i.b <= mAgora ? ' passou' : ''}" style="--c:${i.cor}" onclick="rsTocar('home', '${i.k}')">
      <i></i><span class="rs-ag-h">${i.a === null ? 'dia todo' : rsHora(i.a)}</span><span class="rs-ag-t">${i.ic} ${esc(i.tit)}</span></button>`).join('')
    + (tarefas ? `<button type="button" class="rs-ag-item rs-ag-tar" onclick="changeTab('tasks')"><i></i><span class="rs-ag-h">☑</span><span class="rs-ag-t">${plural(tarefas, 'tarefa para hoje', 'tarefas para hoje')}</span></button>` : '')
    || '<p class="sp-dica">Nada marcado para hoje.</p>';
  const it = itens.find(i => i.k === sel);
  const info = it ? `<span><strong>${it.ic} ${esc(it.tit)}</strong> · ${it.a === null ? 'dia todo' : rsHora(it.a) + '–' + rsHora(it.b)}${it.tipo === 'shift' && it.obj.amount ? ' · ' + rsDinheiro(it.obj.amount) : ''}${it.obj.local ? ' · ' + esc(it.obj.local) : ''}</span>
      <button type="button" class="mini-btn" onclick="${it.tipo === 'shift' ? `editarPlantao(${it.obj.id})` : `editarEvento(${it.obj.id})`}">abrir ›</button>`
    : `<span class="sp-dica">Toque num arco do relógio ou num item.</span><button type="button" class="mini-btn" onclick="agNovoAgora()">＋ Novo</button>`;
  return rsQuadro('rs-ag-hoje', '🕰️', 'Hoje', `${diaSemanaCurto(h)} ${isoParaBR(h).slice(0, 5)} · ${rsVivo('home/cal')}`, "verSecaoAgenda('cal')",
    `<div class="rs-ag-dia"><div class="rs-relogio"><svg viewBox="-12 -2 244 224" role="img" aria-label="O dia em 24 horas">
        <circle cx="${C}" cy="${C}" r="80" class="rs-rel-trilho"/><circle cx="${C}" cy="${C}" r="65" class="rs-rel-trilho"/>${ticks}${rot}${arcos}${ponteiro}</svg>
        <div class="rs-rel-centro">${centro}</div></div>
      <div class="rs-ag-lista">${lista}</div></div>`, info);
}
function rsAgSemana() {
  const h = hojeISO(), sel = rsSel.home;
  const dias = Array.from({ length: 7 }, (_, i) => somaDias(h, i));
  const cols = dias.map((d, i) => {
    const it = rsAgItens(d), tar = tasks.filter(t => !t.done && t.due === d).length;
    const horas = it.reduce((a, x) => a + (x.a === null ? 0.5 : (x.b - x.a) / 60), 0);
    const blocos = it.map(x => `<i style="--c:${x.cor}; flex-grow:${Math.max(0.6, x.a === null ? 0.6 : (x.b - x.a) / 60)}" title="${esc(x.tit)}"></i>`).join('');
    return `<button type="button" class="rs-sem-dia${i === 0 ? ' hoje' : ''}${sel === 'd' + i ? ' sel' : ''}" onclick="rsTocar('home', 'd${i}')" title="${diaSemanaCurto(d)} ${isoParaBR(d).slice(0, 5)}">
      <span class="rs-sem-pilha"><span class="rs-sem-carga" style="height:${it.length ? Math.max(10, Math.round(Math.min(1, horas / 14) * 100)) : 0}%">${blocos}</span></span>
      ${tar ? `<em>${tar}☑</em>` : '<em></em>'}<small>${diaSemanaCurto(d).slice(0, 3)}</small><b>${d.slice(8, 10)}</b></button>`;
  }).join('');
  const k = sel && sel[0] === 'd' ? Number(sel.slice(1)) : -1;
  let info = `<span class="sp-dica">Toque num dia para ver o que tem nele.</span>`;
  if (k >= 0) {
    const d = dias[k], it = rsAgItens(d);
    info = `<span><strong>${rsQuando(d)}</strong> · ${it.length ? it.map(x => `${x.a === null ? '' : rsHora(x.a) + ' '}${esc(x.tit)}`).join(' · ') : 'livre'}</span>
      <button type="button" class="mini-btn" onclick="abrirNovoRapido('${d}')">＋ marcar</button>`;
  }
  return rsQuadro('rs-ag-semana', '🗓️', 'Os próximos 7 dias', rsVivo('home/compromissos'), "verSecaoAgenda('compromissos')", `<div class="rs-sem">${cols}</div>`, info);
}
function rsAgReunioes() {
  const h = hojeISO(); let prox = null;
  for (let i = 0; i <= 30 && !prox; i++) { const d = somaDias(h, i); const e = eventosNoDia(d).filter(x => x.type === 'reuniao' && !x.done).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))[0]; if (e) prox = { e, d }; }
  const lista = tasklists.find(l => l.name.toLowerCase() === 'reuniões');
  const enc = lista ? tasks.filter(t => t.list === lista.id && !t.done).length : 0;
  const mes = events.filter(e => e.type === 'reuniao' && (e.date || '').startsWith(h.slice(0, 7))).length;
  let corpo;
  if (prox) {
    const pauta = prox.e.agenda || [], feitos = pauta.filter(p => p.done).length;
    corpo = `<div class="rs-reu">
        <div class="rs-reu-cab"><span class="rs-reu-data"><b>${prox.d.slice(8, 10)}</b><small>${diaSemanaCurto(prox.d)}</small></span>
          <span><strong>${esc(prox.e.title)}</strong><small>${rsQuando(prox.d)}${prox.e.time ? ' · ' + prox.e.time : ''}${prox.e.local ? ' · ' + esc(prox.e.local) : ''}</small></span></div>
        ${pauta.length ? `<div class="rs-reu-pauta"><small>PAUTA · ${feitos} de ${pauta.length}</small>${pauta.slice(0, 5).map((p, i) => `<label class="rs-reu-p${p.done ? ' ok' : ''}"><input type="checkbox" ${p.done ? 'checked' : ''} onchange="togglePauta(${prox.e.id}, ${i})"> ${esc(p.text)}</label>`).join('')}${pauta.length > 5 ? `<small>+${pauta.length - 5}</small>` : ''}</div>`
          : '<p class="sp-dica">Sem pauta ainda: abra a reunião e escreva os pontos.</p>'}
      </div>`;
  } else corpo = '<div class="sp-vazio">Nenhuma reunião nos próximos 30 dias.</div>';
  const info = `<span>${enc ? `<strong>${plural(enc, 'encaminhamento aberto', 'encaminhamentos abertos')}</strong> na lista Reuniões` : 'Nenhum encaminhamento aberto'}${mes ? ' · ' + plural(mes, 'reunião', 'reuniões') + ' no mês' : ''}</span>
    ${prox ? `<button type="button" class="mini-btn" onclick="editarEvento(${prox.e.id})">abrir ›</button>` : `<button type="button" class="mini-btn" onclick="verSecaoAgenda('reunioes')">＋ reunião</button>`}`;
  return rsQuadro('rs-ag-reunioes', '🤝', 'Reuniões', rsVivo('home/reunioes'), "verSecaoAgenda('reunioes')", corpo, info);
}
function rsAgPlantoes() {
  const h = hojeISO(), mes = h.slice(0, 7), [y, m] = mes.split('-').map(Number), sel = rsSel.home;
  const nDias = new Date(y, m, 0).getDate(), vazio = new Date(y, m - 1, 1).getDay();
  const porDia = {}; shifts.filter(s => (s.date || '').startsWith(mes)).forEach(s => { (porDia[s.date] = porDia[s.date] || []).push(s); });
  const estado = s => s.paid ? 'pago' : s.date < h ? 'receber' : 'vem';
  const cel = Array.from({ length: vazio }, () => '<span class="rs-pl-cel vazia"></span>').join('') + Array.from({ length: nDias }, (_, i) => {
    const d = `${mes}-${String(i + 1).padStart(2, '0')}`, l = porDia[d] || [];
    const cls = ['rs-pl-cel', l.length ? 'tem ' + estado(l[0]) : '', d === h ? 'hoje' : '', sel === 'q' + d ? 'sel' : ''].filter(Boolean).join(' ');
    return l.length ? `<button type="button" class="${cls}" onclick="rsTocar('home', 'q${d}')" title="${esc(l.map(s => s.desc).join(', '))}">${i + 1}</button>` : `<span class="${cls}">${i + 1}</span>`;
  }).join('');
  const doMes = shifts.filter(s => (s.date || '').startsWith(mes)), valorMes = doMes.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const receber = shifts.filter(s => !s.paid && s.date && s.date < h), totRec = receber.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  // o próximo que ainda não acabou: o de hoje em andamento vira "Agora"
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const prox = shifts.filter(s => s.date > h || (s.date === h && (rsMin(s.time) ?? 0) + (Number(s.hours) || 12) * 60 > agoraMin))
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  const emCurso = prox && prox.date === h && (rsMin(prox.time) ?? 0) <= agoraMin;
  let info;
  if (sel && sel[0] === 'q' && porDia[sel.slice(1)]) {
    const s = porDia[sel.slice(1)][0], e = estado(s);
    info = `<span><strong>${rsQuando(s.date)}</strong> · ${esc(s.desc || vt().um)}${s.time ? ' · ' + s.time : ''}${s.hours ? ' · ' + s.hours + 'h' : ''}${s.amount ? ' · ' + rsDinheiro(s.amount) : ''} · <b class="rs-pl-${e}">${e === 'pago' ? 'recebido' : e === 'receber' ? 'a receber' : 'vem aí'}</b></span>
      <button type="button" class="mini-btn" onclick="editarPlantao(${s.id})">abrir ›</button>`;
  } else info = `<span>${prox ? `${emCurso ? 'Agora' : 'Próximo'}: <strong>${esc(prox.desc || vt().um)}</strong> ${emCurso ? `até ${rsHora((rsMin(prox.time) ?? 0) + (Number(prox.hours) || 12) * 60)}` : rsQuando(prox.date) + (prox.time ? ' ' + prox.time : '')}` : `Nenhum ${vt().um} marcado`}${totRec ? ` · <b class="rs-pl-receber">${rsDinheiro(totRec)} a receber</b>` : ''}</span>`;
  const leg = '<span class="rs-pl-leg"><i class="pago"></i>recebido <i class="receber"></i>a receber <i class="vem"></i>vem aí</span>';
  return rsQuadro('rs-ag-plantoes', vt().ic, vt().listaTitulo, `${plural(doMes.length, vt().um, vt().muitos)} em ${new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}${valorMes ? ' · ' + rsDinheiro(valorMes) : ''}`, "verSecaoAgenda('plantoes')",
    `<div class="rs-pl"><div class="rs-pl-sem">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(l => `<small>${l}</small>`).join('')}</div><div class="rs-pl-mes">${cel}</div>${leg}</div>`, info);
}
function rsRenderHome() {
  const el = document.getElementById('rs-home'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsAgHoje()}${rsAgSemana()}${rsAgReunioes()}${rsAgPlantoes()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// ☑️ TAREFAS — o dia em contas + ritmo · a matriz em miniatura · as listas · a régua das rotinas
// (a micro-aba Foco já tem o anel, a próxima tarefa e a matriz grande: aqui é o resumo de TODAS as partes)
// ════════════════════════════════════════════════════════════════════════════
function rsTarFeita(id, btn) {
  const l = btn && btn.closest('.rs-tar-linha'); if (l) l.classList.add('indo');
  setTimeout(() => toggleTask(id), l ? 320 : 0);
}
function rsTarHoje() {
  const h = hojeISO(), sel = rsSel.tasks;
  const feitas = tasks.filter(t => t.done && tarDiaLocal(t.doneAt) === h);
  const atrasadas = tasks.filter(t => !t.done && t.due && t.due < h).sort(ordenarTarefas);
  const deHoje = tasks.filter(t => !t.done && t.due === h).sort(ordenarTarefas);
  // as contas do dia: cada tarefa é uma conta — cheia = feita hoje, vazia = vence hoje, vermelha = atrasada
  const contas = [...feitas.map(t => ['feita', t]), ...atrasadas.map(t => ['atrasada', t]), ...deHoje.map(t => ['hoje', t])];
  const fio = contas.slice(0, 20).map(([e, t]) => `<i class="rs-conta ${e}" title="${esc(t.text)}"></i>`).join('') + (contas.length > 20 ? `<small>+${contas.length - 20}</small>` : '');
  const pend = [...atrasadas, ...deHoje];
  const nomeLista = t => { const l = tasklists.find(x => x.id === t.list); return l && l.id !== 'padrao' ? ' · ' + esc(l.name) : ''; };
  const linhas = pend.slice(0, 5).map(t => `<div class="rs-tar-linha${t.due < h ? ' atr' : ''}"><button type="button" class="rs-tar-ok" onclick="rsTarFeita(${t.id}, this)" aria-label="Concluir: ${esc(t.text)}">${TAR_CHECK}</button>
      <span><b>${t.starred ? '⭐ ' : ''}${esc(t.text)}</b><small>${t.due < h ? 'atrasada desde ' + tarBR(t.due) : 'para hoje'}${nomeLista(t)}</small></span></div>`).join('')
    + (pend.length > 5 ? `<button type="button" class="rs-mais" onclick="verSecaoTarefas('foco')">+${pend.length - 5} no Foco ›</button>` : '');
  const sug = !pend.length ? tarFila()[0] : null;
  const ritmo = tarUltimosDias(14), max = Math.max(1, ...ritmo.map(x => x.n));
  const barras = ritmo.map((x, i) => `<button type="button" class="rs-ritmo-b${sel === 'r' + i ? ' sel' : ''}${i === 13 ? ' hoje' : ''}" style="--v:${(x.n / max).toFixed(2)}" onclick="rsTocar('tasks', 'r${i}')" title="${isoParaBR(x.d).slice(0, 5)}: ${x.n}"><i></i></button>`).join('');
  const k = sel && sel[0] === 'r' ? Number(sel.slice(1)) : -1;
  const seq = tarSequencia();
  const info = k >= 0 ? `<span><strong>${rsQuando(ritmo[k].d)}</strong> · ${ritmo[k].n ? plural(ritmo[k].n, 'tarefa concluída', 'tarefas concluídas') : 'nenhuma concluída'}</span>`
    : `<span>${seq ? `🔥 <strong>${plural(seq, 'dia seguido', 'dias seguidos')}</strong> concluindo alguma coisa` : 'Conclua uma hoje e comece a sequência'}</span><button type="button" class="mini-btn" onclick="const i = document.getElementById('tar-rapida'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); }">＋ tarefa</button>`;
  return rsQuadro('rs-tar-hoje', '🧮', 'Hoje', `${feitas.length} de ${feitas.length + pend.length} feitas${atrasadas.length ? ' · ' + plural(atrasadas.length, 'atrasada', 'atrasadas') : ''}`, "verSecaoTarefas('foco')",
    `<div class="rs-contas" aria-label="As tarefas do dia">${fio || '<small class="sp-dica">Nenhuma tarefa vence hoje.</small>'}</div>
     <div class="rs-tar-lista">${linhas || (sug ? `<p class="sp-dica">Nada vencendo. Que tal: <b>${esc(sug.text)}</b>?</p>` : '<p class="sp-dica">Tudo em dia.</p>')}</div>
     <div class="rs-ritmo" role="group" aria-label="Concluídas nos últimos 14 dias"><small>ÚLTIMOS 14 DIAS</small><div>${barras}</div></div>`, info);
}
function rsTarMatriz() {
  const por = {}; TAR_QUADS.forEach(q => { por[q.k] = []; });
  tasks.filter(t => !t.done).forEach(t => por[tarQuadrante(t)].push(t));
  const max = Math.max(1, ...Object.values(por).map(l => l.length)), total = Object.values(por).reduce((a, l) => a + l.length, 0);
  const cel = TAR_QUADS.map(q => `<button type="button" class="rs-mz-q" style="--c:${q.tom}; --v:${(por[q.k].length / max).toFixed(2)}" onclick="verSecaoTarefas('foco')" title="${q.dica}">
      <span class="rs-mz-cab"><span>${q.ic} ${q.nome}</span><b>${por[q.k].length}</b></span>
      ${por[q.k].sort(ordenarTarefas).slice(0, 2).map(t => `<small>${esc(t.text)}</small>`).join('') || `<small class="vazio">${q.vazio}</small>`}</button>`).join('');
  const semData = tasks.filter(t => !t.done && !t.due).length, estrela = tasks.filter(t => !t.done && t.starred).length;
  return rsQuadro('rs-tar-matriz', '🎯', 'A matriz', `${plural(total, 'aberta', 'abertas')}`, "verSecaoTarefas('foco')",
    `<div class="rs-mz"><small class="rs-mz-eixo x1">urgente</small><small class="rs-mz-eixo x2">sem pressa</small>
      <small class="rs-mz-eixo y1">⭐ importa</small><small class="rs-mz-eixo y2">nem tanto</small><div class="rs-mz-grade">${cel}</div></div>`,
    `<span>${plural(estrela, 'com ⭐', 'com ⭐')} · ${plural(semData, 'sem data', 'sem data')}</span>`);
}
function rsTarListas() {
  const h = hojeISO(), semana = somaDias(h, -6);
  const l = tasklists.map((x, i) => ({ x, i, ab: tasks.filter(t => t.list === x.id && !t.done).length, sem: tasks.filter(t => t.list === x.id && t.done && tarDiaLocal(t.doneAt) >= semana).length }))
    .filter(o => o.ab || o.sem).sort((a, b) => b.ab - a.ab);
  const max = Math.max(1, ...l.map(o => o.ab + o.sem));
  const linhas = l.slice(0, 6).map(o => `<button type="button" class="rs-li" style="--c:${tarCorLista(o.x.id)}" onclick="verSecaoTarefas('listas')">
      <span class="rs-li-nome">${esc(o.x.name)}</span>
      <span class="rs-li-barra"><i class="ab" style="width:${(o.ab / max * 100).toFixed(1)}%"></i><i class="ok" style="width:${(o.sem / max * 100).toFixed(1)}%"></i></span>
      <span class="rs-li-n"><b>${o.ab}</b>${o.sem ? `<small>+${o.sem} ✓</small>` : ''}</span></button>`).join('');
  const semTot = l.reduce((a, o) => a + o.sem, 0);
  return rsQuadro('rs-tar-listas', '📋', 'Listas', rsVivo('tasks/listas'), "verSecaoTarefas('listas')",
    `<div class="rs-lis">${linhas || '<div class="sp-vazio">Nenhuma lista com tarefa.</div>'}${l.length > 6 ? `<small class="sp-dica">+${l.length - 6} listas</small>` : ''}</div>`,
    `<span><b class="rs-li-leg ab"></b>abertas <b class="rs-li-leg ok"></b>concluídas na semana${semTot ? ` · ${semTot} ✓` : ''}</span>`);
}
function rsTarRotinas() {
  const h = hojeISO(), sel = rsSel.tasks;
  const ativas = routines.filter(r => r.active !== false && r.next).sort((a, b) => a.next.localeCompare(b.next));
  const emoji = r => { const m = String(r.text || '').match(/^\p{Extended_Pictographic}️?/u); return m ? m[0] : '🔄'; };
  const dias = Array.from({ length: 14 }, (_, i) => somaDias(h, i));
  const cols = dias.map((d, i) => {
    const aqui = ativas.map((r, k) => ({ r, k })).filter(({ r }) => i === 0 ? r.next <= d : r.next === d);
    return `<div class="rs-regua-dia${i === 0 ? ' hoje' : ''}${diaDaSemanaISO(d) === 0 ? ' dom' : ''}"><small>${DIAS_SEM[diaDaSemanaISO(d)].slice(0, 1)}</small><b>${d.slice(8, 10)}</b>
      ${aqui.map(({ r, k }) => `<button type="button" class="rs-regua-r${sel === 'o' + k ? ' sel' : ''}${r.next < h ? ' atr' : ''}" onclick="rsTocar('tasks', 'o${k}')" title="${esc(r.text)}">${emoji(r)}</button>`).join('')}</div>`;
  }).join('');
  const depois = ativas.filter(r => r.next > dias[13]).length;
  const k = sel && sel[0] === 'o' ? Number(sel.slice(1)) : -1, r = ativas[k];
  const info = r ? `<span><strong>${esc(r.text)}</strong> · ${FREQS[r.freq] || r.freq} · próxima ${rsQuando(r.next)}${r.count ? ' · feita ' + plural(r.count, 'vez', 'vezes') : ''}</span>`
    : `<span class="sp-dica">${ativas.length ? 'Toque num ícone da régua.' : 'Nenhuma rotina ativa.'}${depois ? ` ${plural(depois, 'outra', 'outras')} depois de 2 semanas.` : ''}</span>`;
  return rsQuadro('rs-tar-rotinas', '🔄', 'Rotinas', rsVivo('tasks/rotinas'), "verSecaoTarefas('rotinas')", `<div class="rs-regua">${cols}</div>`, info);
}
function rsRenderTasks() {
  const el = document.getElementById('rs-tasks'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsTarHoje()}${rsTarMatriz()}${rsTarListas()}${rsTarRotinas()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 📝 NOTAS — o mural em miniatura · a nuvem de marcadores · as listas por marcar · a estrada das entregas
// ════════════════════════════════════════════════════════════════════════════
function rsNtMarcadores() {
  const c = {}; notes.filter(n => !n.archived).forEach(n => (n.labels || []).forEach(l => { c[l] = (c[l] || 0) + 1; }));
  return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
/** 🪤 armadilha 8: o marcador vai por ÍNDICE no onclick (o nome pode ter aspas). */
function rsNtFiltrar(i) {
  const m = rsNtMarcadores()[i]; if (!m) return;
  verSecaoNotas('notas'); filtrarMarcador(m[0]);
}
function rsNtMural() {
  const l = notes.filter(n => !n.archived && !ntEhLista(n)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const posts = l.slice(0, 6).map((n, i) => { const hue = ntHue(n), txt = n.title || String(n.content || '').split('\n')[0] || 'sem título';
    return `<button type="button" class="rs-post${hue ? ' cor' : ''}" style="--nh:${hue || 'transparent'}; --rot:${[-1.6, 1.1, -0.6, 1.5, -1.2, 0.7][i]}deg" onclick="ntAbrir(${n.id})">
      ${n.pinned ? '<span class="rs-post-tacha" aria-hidden="true">📌</span>' : ''}<b>${esc(txt)}</b>${n.title && n.content ? `<small>${esc(String(n.content).slice(0, 120))}</small>` : ''}</button>`; }).join('');
  const ult = l.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  const info = `<span>${ult ? `Última mexida: <strong>${esc(ult.title || 'sem título')}</strong> · ${ntQuando(ult)}` : 'Nenhuma nota ainda'}</span><button type="button" class="mini-btn" onclick="ntNova('texto')">＋ nota</button>`;
  return rsQuadro('rs-nt-mural', '📌', 'O mural', rsVivo('notes/notas'), "verSecaoNotas('notas')",
    `<div class="rs-mural">${posts || '<div class="sp-vazio">O mural está vazio.</div>'}</div>${l.length > 6 ? `<button type="button" class="rs-mais" onclick="verSecaoNotas('notas')">+${l.length - 6} no mural ›</button>` : ''}`, info);
}
function rsNtNuvem() {
  const m = rsNtMarcadores(), max = Math.max(1, ...m.map(x => x[1]));
  const nuvem = m.slice(0, 24).map(([l, n], i) => `<button type="button" class="rs-nuvem-m${noteLabel === l ? ' on' : ''}" style="--t:${(0.74 + n / max * 0.5).toFixed(2)}rem" onclick="rsNtFiltrar(${i})">#${esc(l)}<small>${n}</small></button>`).join('');
  const semMarc = notes.filter(n => !n.archived && !(n.labels || []).length).length;
  const info = noteLabel ? `<span>Filtrando as notas por <strong>#${esc(noteLabel)}</strong></span><button type="button" class="mini-btn" onclick="filtrarMarcador(''); rsAgendar()">✕ tirar</button>`
    : `<span>${m.length ? `${plural(m.length, 'marcador', 'marcadores')} · o mais usado é <strong>#${esc(m[0][0])}</strong>` : 'Nenhum marcador ainda'}${semMarc ? ` · ${plural(semMarc, 'nota sem marcador', 'notas sem marcador')}` : ''}</span>`;
  return rsQuadro('rs-nt-marcadores', '🏷️', 'Marcadores', m.length ? 'toque num para filtrar' : '', "verSecaoNotas('notas')",
    `<div class="rs-nuvem">${nuvem || '<div class="sp-vazio">Escreva #marcador numa nota para agrupar.</div>'}</div>`, info);
}
function rsNtListas() {
  const l = notes.filter(n => !n.archived && ntEhLista(n)).map(n => ({ n, tot: n.checklist.length, ok: n.checklist.filter(i => i.done).length }))
    .sort((a, b) => (b.tot - b.ok) - (a.tot - a.ok));
  const linhas = l.slice(0, 4).map(({ n, tot, ok }) => `<button type="button" class="rs-ntl" onclick="ntAbrir(${n.id})" style="--nh:${ntHue(n) || 'var(--tom)'}">
      <span class="rs-ntl-cab"><b>${esc(n.title || 'Lista')}</b><small>${tot - ok ? `faltam ${tot - ok}` : 'tudo marcado ✓'}</small></span>
      <span class="rs-ntl-barra"><i style="width:${tot ? (ok / tot * 100).toFixed(1) : 0}%"></i></span>
      ${n.checklist.filter(i => !i.done).slice(0, 2).map(i => `<small class="rs-ntl-it">○ ${esc(i.text)}</small>`).join('')}</button>`).join('');
  const falta = l.reduce((a, x) => a + x.tot - x.ok, 0);
  return rsQuadro('rs-nt-listas', '☑️', 'Listas', rsVivo('notes/listas'), "verSecaoNotas('listas')",
    `<div class="rs-ntls">${linhas || '<div class="sp-vazio">Nenhuma lista de marcar.</div>'}</div>`,
    `<span>${falta ? `<strong>${plural(falta, 'item por marcar', 'itens por marcar')}</strong> em ${plural(l.filter(x => x.tot > x.ok).length, 'lista', 'listas')}` : 'Tudo marcado'}</span><button type="button" class="mini-btn" onclick="ntNova('lista')">＋ lista</button>`);
}
function rsNtEntregas() {
  const h = hojeISO(), sel = rsSel.notes;
  const ab = orders.filter(o => o.status !== 'entregue' && !o.deliveredAt);
  const comData = ab.filter(o => o.eta), semData = ab.length - comData.length;
  // a estrada: hoje na esquerda, 14 dias à frente; quem passou da previsão fica parado no começo, em vermelho
  const pos = o => { const d = rsDiasAte(o.eta); return d < 0 ? 0 : Math.min(d, 14) / 14 * 100; };
  const pacotes = comData.map((o, i) => ({ o, i, p: pos(o) })).sort((a, b) => a.p - b.p);
  let ultimaP = -99, nivel = 0;
  const pins = pacotes.map(({ o, i, p }) => { nivel = p - ultimaP < 9 ? (nivel + 1) % 3 : 0; ultimaP = p; const st = STATUS_ENTREGA[o.status] || STATUS_ENTREGA.comprado;
    return `<button type="button" class="rs-pac${rsDiasAte(o.eta) < 0 ? ' atr' : ''}${sel === 'o' + i ? ' sel' : ''}" style="left:${p.toFixed(1)}%; --n:${nivel}; --st:${st[2]}" onclick="rsTocar('notes', 'o${i}')" title="${esc(o.item)}">${st[0]}</button>`; }).join('');
  const marcas = [0, 7, 14].map(d => `<small style="left:${d / 14 * 100}%">${d === 0 ? 'hoje' : '+' + d}</small>`).join('');
  const k = sel && sel[0] === 'o' ? Number(sel.slice(1)) : -1, o = comData[k];
  const info = o ? `<span><strong>${esc(o.item)}</strong>${o.store ? ' · ' + esc(o.store) : ''} · ${(STATUS_ENTREGA[o.status] || ['', ''])[1].toLowerCase()} · ${rsDiasAte(o.eta) < 0 ? `<b class="rs-atr">passou ${plural(-rsDiasAte(o.eta), 'dia', 'dias')}</b>` : 'chega ' + rsQuando(o.eta)}${o.amount ? ' · ' + rsDinheiro(o.amount) : ''}</span>
      ${o.status === 'caminho' || o.status === 'comprado' ? `<button type="button" class="mini-btn" onclick="avancarEntrega(${o.id})">▶ ${o.status === 'comprado' ? 'a caminho' : 'chegou'}</button>` : ''}`
    : `<span>${rsVivo('notes/entregas')}${semData ? ` · ${plural(semData, 'sem previsão', 'sem previsão')}` : ''}</span>`;
  return rsQuadro('rs-nt-entregas', '📦', 'Entregas', ab.length ? plural(ab.length, 'a caminho', 'a caminho') : 'nada a caminho', "verSecaoNotas('entregas')",
    comData.length ? `<div class="rs-estrada"><div class="rs-estrada-pista">${pins}</div><div class="rs-estrada-marcas">${marcas}</div></div>` : '<div class="sp-vazio">Nenhuma entrega com data prevista.</div>', info);
}
function rsRenderNotes() {
  const el = document.getElementById('rs-notes'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsNtMural()}${rsNtNuvem()}${rsNtListas()}${rsNtEntregas()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 📚 ESTUDOS — os anéis da meta por tema · a leitura em andamento · o seu melhor dia · o ritual marcável
// (a Mesa já tem a estante, o livro aberto e o calendário de 12 semanas: aqui entra o que ela não mostra)
// ════════════════════════════════════════════════════════════════════════════
function rsEsAbrir(id) { verSecaoEstudos('mesa'); esAbrir(id); }
function rsEsAneis() {
  const sel = rsSel.studies, temas = topics.filter(t => !t.archived && Number(t.weeklyGoalMin) > 0).slice(0, 4);
  const C = 100, raios = [82, 66, 50, 34];
  const aneis = temas.map((t, i) => { const r = raios[i], c = 2 * Math.PI * r, feito = minutosNaSemana(t.id), p = Math.min(1, feito / t.weeklyGoalMin);
    return `<g class="rs-anel${sel === 't' + i ? ' sel' : ''}${feito >= t.weeklyGoalMin ? ' cheio' : ''}" style="--c:${t.color || 'var(--tom)'}" onclick="rsTocar('studies', 't${i}')"><title>${esc(t.name)}</title>
      <circle cx="${C}" cy="${C}" r="${r}" class="rs-anel-fundo"/>
      <circle cx="${C}" cy="${C}" r="${r}" class="rs-anel-cheio" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}" transform="rotate(-90 ${C} ${C})"/></g>`; }).join('');
  const totFeito = minutosNaSemana(), totMeta = topics.filter(t => !t.archived).reduce((a, t) => a + (Number(t.weeklyGoalMin) || 0), 0);
  const leg = temas.map((t, i) => { const f = minutosNaSemana(t.id); return `<button type="button" class="rs-anel-leg${sel === 't' + i ? ' sel' : ''}" style="--c:${t.color || 'var(--tom)'}" onclick="rsTocar('studies', 't${i}')"><i></i><span>${esc(t.name)}</span><small>${fmtMin(f)} / ${fmtMin(t.weeklyGoalMin)}</small></button>`; }).join('');
  const k = sel && sel[0] === 't' ? Number(sel.slice(1)) : -1, t = temas[k];
  const seq = typeof streakEstudo === 'function' ? streakEstudo() : 0;
  const info = t ? (() => { const f = minutosNaSemana(t.id), falta = t.weeklyGoalMin - f; return `<span><strong>${esc(t.name)}</strong> · ${fmtMin(f)} de ${fmtMin(t.weeklyGoalMin)} · ${falta > 0 ? 'faltam ' + fmtMin(falta) : '<b class="rs-ok">meta batida ✓</b>'}</span>`; })()
    : `<span>${seq ? `🔥 <strong>${plural(seq, 'dia seguido', 'dias seguidos')}</strong> estudando` : 'Estude hoje e comece a sequência'}</span>`;
  return rsQuadro('rs-es-aneis', '🎯', 'A semana', rsVivo('studies/mesa'), "verSecaoEstudos('mesa')",
    temas.length ? `<div class="rs-es-semana"><div class="rs-aneis"><svg viewBox="0 0 200 200" role="img" aria-label="A meta da semana de cada tema">${aneis}</svg>
        <div class="rs-aneis-centro"><b>${fmtMin(totFeito)}</b><small>${totMeta ? 'de ' + fmtMin(totMeta) : 'na semana'}</small></div></div>
      <div class="rs-anel-legs">${leg}</div></div>` : '<div class="sp-vazio">Dê uma meta semanal a um tema para ver os anéis.</div>', info);
}
function rsEsLeitura() {
  const and = materials.filter(m => m.status === 'andamento').sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const ano = hojeISO().slice(0, 4), fezAno = materials.filter(m => m.status === 'concluido' && String(new Date(m.updatedAt || 0).getFullYear()) === ano).length;
  const aFazer = materials.filter(m => m.status === 'afazer').length;
  const cor = m => (topics.find(t => t.id === m.topicId) || {}).color || 'var(--tom)';
  const linhas = and.slice(0, 4).map(m => `<button type="button" class="rs-leit" style="--c:${cor(m)}" onclick="rsEsAbrir(${m.id})">
      <span class="rs-leit-ic">${ES_ICONE[m.kind] || '📌'}</span><span class="rs-leit-tx"><b>${esc(m.title)}</b><span class="rs-leit-barra"><i style="width:${Math.min(100, Number(m.progress) || 0)}%"></i></span></span><span class="rs-leit-p">${Math.round(Number(m.progress) || 0)}%</span></button>`).join('');
  return rsQuadro('rs-es-leitura', '📖', 'Na leitura', rsVivo('studies/estante'), "verSecaoEstudos('estante')",
    `<div class="rs-leits">${linhas || '<div class="sp-vazio">Nada em andamento na estante.</div>'}</div>`,
    `<span>${aFazer ? plural(aFazer, 'esperando na estante', 'esperando na estante') : 'Estante sem fila'}${fezAno ? ` · <strong>${plural(fezAno, 'concluído', 'concluídos')}</strong> em ${ano}` : ''}</span>`);
}
function rsEsDias() {
  const sel = rsSel.studies, mins = esMinutosPorDia(), h = hojeISO();
  const soma = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 56; i++) { const d = somaDias(h, -i); soma[diaDaSemanaISO(d)] += mins[d] || 0; }
  const media = soma.map(v => v / 8), max = Math.max(1, ...media), melhor = media.indexOf(Math.max(...media));
  const barras = media.map((v, i) => `<button type="button" class="rs-esd${i === melhor && v ? ' melhor' : ''}${sel === 'w' + i ? ' sel' : ''}${i === diaDaSemanaISO(h) ? ' hoje' : ''}" onclick="rsTocar('studies', 'w${i}')" style="--v:${(v / max).toFixed(2)}">
      <small class="rs-esd-v">${v >= 1 ? Math.round(v) + 'm' : ''}</small><span><i></i></span><small>${DIAS_SEM[i].slice(0, 3)}</small></button>`).join('');
  const ult = sessions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);
  const nomeT = id => (topics.find(t => t.id === id) || {}).name || 'Estudo';
  const k = sel && sel[0] === 'w' ? Number(sel.slice(1)) : -1;
  const info = k >= 0 ? `<span><strong>${DIAS_SEMANA[k]}</strong>: em média ${Math.round(media[k])} min (últimas 8 semanas)</span>`
    : `<span>${media[melhor] ? `Seu melhor dia é <strong>${DIAS_SEMANA[melhor].toLowerCase()}</strong>` : 'Sem sessões nas últimas 8 semanas'}${ult.length ? ' · última: ' + esc(nomeT(ult[0].topicId)) + ' ' + rsQuando(ult[0].date) : ''}</span>`;
  return rsQuadro('rs-es-dias', '⏱️', 'Sessões', rsVivo('studies/sessoes'), "verSecaoEstudos('sessoes')",
    `<div class="rs-esds" role="group" aria-label="Minutos por dia da semana">${barras}</div>
     ${ult.length ? `<div class="rs-es-ult">${ult.map(s => `<small><b>${esc(nomeT(s.topicId))}</b> · ${s.minutes} min · ${rsQuando(s.date)}</small>`).join('')}</div>` : ''}`, info);
}
function rsEsRitual() {
  const r = ritual || {}, itens = r.roadmap || [], feitos = (r.done || []).filter(Boolean).length;
  let prox = '';
  if (r.day !== '' && r.day !== undefined && r.day !== null) {
    const agora = new Date(), mAg = agora.getHours() * 60 + agora.getMinutes();
    for (let i = 0; i < 8; i++) { const d = somaDias(hojeISO(), i); if (String(diaDaSemanaISO(d)) === String(r.day) && (i > 0 || (rsMin(r.time) ?? 1440) > mAg)) { prox = d; break; } }
  }
  const passos = itens.map((t, i) => `<label class="rs-rit-p${r.done && r.done[i] ? ' ok' : ''}"><input type="checkbox" ${r.done && r.done[i] ? 'checked' : ''} onchange="toggleRitual(${i})"><span>${esc(t)}</span></label>`).join('');
  return rsQuadro('rs-es-ritual', '📓', 'O ritual', `${r.day !== '' && r.day !== undefined ? DIAS_SEMANA[Number(r.day)].toLowerCase() : 'sem dia fixo'}${r.time ? ' ' + r.time : ''} · ${feitos} de ${itens.length}`, "verSecaoEstudos('ritual')",
    itens.length ? `<div class="rs-rit"><div class="rs-rit-barra"><i style="height:${itens.length ? (feitos / itens.length * 100).toFixed(1) : 0}%"></i></div><div class="rs-rit-passos">${passos}</div></div>` : '<div class="sp-vazio">Escreva o roteiro do ritual (uma linha por item).</div>',
    `<span>${prox ? `Próximo: <strong>${rsQuando(prox)}</strong>${r.time ? ' ' + r.time : ''}` : 'Sem dia marcado'} · zera toda semana</span>`);
}
function rsRenderStudies() {
  const el = document.getElementById('rs-studies'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsEsAneis()}${rsEsLeitura()}${rsEsDias()}${rsEsRitual()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 🎬 LAZER — a fita de cinema · a próxima saída em foto · os discos de música · o ano em lazer
// ════════════════════════════════════════════════════════════════════════════
function rsLzTela() {
  const sel = rsSel.leisure, ano = hojeISO().slice(0, 4);
  const ass = media.filter(x => x.status === 'assistindo').sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const fila = media.filter(x => x.status === 'quero').sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const quadros = [...ass, ...fila].slice(0, 6);
  const fita = quadros.map((x, i) => { const serie = x.kind === 'serie' || x.kind === 'anime';
    return `<button type="button" class="rs-fita-q${sel === 'm' + i ? ' sel' : ''}" onclick="rsTocar('leisure', 'm${i}')" title="${esc(x.title)}">${lzCapa(x)}
      <span class="rs-fita-selo ${x.status}">${x.status === 'assistindo' ? (serie ? `T${x.season || 1}·E${x.episode || 0}` : '▶') : '🔖'}</span><small>${esc(x.title)}</small></button>`; }).join('');
  const vistosAno = media.filter(x => x.status === 'visto' && (x.watchedAt || '').startsWith(ano)).length;
  const k = sel && sel[0] === 'm' ? Number(sel.slice(1)) : -1, x = quadros[k];
  const info = x ? `<span><strong>${esc(x.title)}</strong> · ${STATUS_MIDIA[x.status][1].toLowerCase()}${x.where ? ' · ' + esc(x.where) : ''}</span>
      <span class="rs-botoes">${x.status === 'assistindo' && (x.kind === 'serie' || x.kind === 'anime') ? `<button type="button" class="mini-btn" onclick="proximoEpisodio(${x.id}, 1)">＋ ep</button>` : ''}<button type="button" class="mini-btn" onclick="lzAbrirDetalhe('midia', ${x.id})">abrir ›</button></span>`
    : `<span>${plural(ass.length, 'assistindo', 'assistindo')} · ${plural(fila.length, 'na fila', 'na fila')}${vistosAno ? ` · <strong>${plural(vistosAno, 'visto', 'vistos')}</strong> em ${ano}` : ''}</span>`;
  return rsQuadro('rs-lz-tela', '🎞️', 'Na tela', rsVivo('leisure/midia') || 'filmes e séries', "verSecaoLazer('midia')",
    quadros.length ? `<div class="rs-fita"><div class="rs-fita-trilho">${fita}</div></div>` : '<div class="sp-vazio">Nada assistindo nem na fila.</div>', info);
}
function rsLzSair() {
  const h = hojeISO();
  const marc = saidas.filter(x => x.status === 'marcado' && x.data && x.data >= h).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));
  const prox = marc[0], ideias = saidas.filter(x => x.status === 'quero');
  const porTipo = {}; ideias.forEach(x => { porTipo[x.tipo] = (porTipo[x.tipo] || 0) + 1; });
  const fui = saidas.filter(x => x.status === 'fui' && (x.feitoEm || x.data || '').startsWith(h.slice(0, 4))).length;
  const capa = prox ? `<button type="button" class="rs-sair-capa" onclick="lzAbrirDetalhe('saida', ${prox.id})">${lzFoto(prox, 'grande')}
      <span class="rs-sair-txt"><small>${rsQuando(prox.data).toUpperCase()}${prox.hora ? ' · ' + prox.hora : ''}</small><b>${esc(prox.nome)}</b><span>${esc([prox.local || prox.cidade, prox.com ? 'com ' + prox.com : ''].filter(Boolean).join(' · '))}</span></span></button>`
    : '<div class="sp-vazio">Nenhuma saída marcada.</div>';
  const chips = Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<button type="button" class="rs-chip-t" onclick="verSecaoLazer('saidas')">${(TIPOS_SAIDA[t] || TIPOS_SAIDA.outro)[0]} ${esc((TIPOS_SAIDA[t] || TIPOS_SAIDA.outro)[1])} <b>${n}</b></button>`).join('');
  return rsQuadro('rs-lz-sair', '🎟️', 'Sair', `${plural(marc.length, 'marcada', 'marcadas')} · ${plural(ideias.length, 'ideia', 'ideias')}`, "verSecaoLazer('saidas')",
    `${capa}${chips ? `<div class="rs-chips-t"><small>QUERO IR</small>${chips}</div>` : ''}`,
    `<span>${marc.length > 1 ? `Depois: <strong>${esc(marc[1].nome)}</strong> ${rsQuando(marc[1].data)}` : (prox ? 'Só essa marcada' : 'Escolha uma das ideias e marque a data')}${fui ? ` · ${plural(fui, 'saída', 'saídas')} em ${h.slice(0, 4)}` : ''}</span>`);
}
function rsLzMusica() {
  const por = {}; playlists.forEach(p => { (por[p.moment || 'outro'] = por[p.moment || 'outro'] || []).push(p); });
  const discos = Object.keys(MOMENTOS).filter(k => por[k]).map(k => `<button type="button" class="rs-disco" style="--c:${LZ_COR_MOMENTO[k] || LZ_COR_MOMENTO.outro}" onclick="lzTocarMomento('${k}')" title="Tocar: ${MOMENTOS[k][1]}">
      <span class="rs-disco-v"><i>${MOMENTOS[k][0]}</i></span><small>${MOMENTOS[k][1]}</small><em>${plural(por[k].length, 'playlist', 'playlists')}</em></button>`).join('');
  const sem = Object.keys(MOMENTOS).filter(k => !por[k] && k !== 'outro').map(k => MOMENTOS[k][1].split(' ')[0].toLowerCase());
  return rsQuadro('rs-lz-musica', '💿', 'Música', rsVivo('leisure/musica') || plural(playlists.length, 'playlist', 'playlists'), "verSecaoLazer('musica')",
    discos ? `<div class="rs-discos">${discos}</div>` : '<div class="sp-vazio">Nenhuma playlist guardada.</div>',
    `<span>${discos ? 'Toque num disco para tocar' : 'Guarde o link de uma playlist'}${sem.length ? ` · sem playlist: ${sem.slice(0, 3).join(', ')}` : ''}</span>`);
}
function rsLzAno() {
  const sel = rsSel.leisure, ano = hojeISO().slice(0, 4), mesAtual = Number(hojeISO().slice(5, 7));
  const vistos = Array(12).fill(0), fui = Array(12).fill(0);
  media.filter(x => x.status === 'visto' && (x.watchedAt || '').startsWith(ano)).forEach(x => { vistos[Number(x.watchedAt.slice(5, 7)) - 1]++; });
  saidas.filter(x => x.status === 'fui' && (x.feitoEm || x.data || '').startsWith(ano)).forEach(x => { fui[Number((x.feitoEm || x.data).slice(5, 7)) - 1]++; });
  const max = Math.max(1, ...vistos.map((v, i) => v + fui[i]));
  const meses = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const col = meses.map((l, i) => `<button type="button" class="rs-ano-m${i + 1 === mesAtual ? ' hoje' : ''}${i + 1 > mesAtual ? ' futuro' : ''}${sel === 'a' + i ? ' sel' : ''}" onclick="rsTocar('leisure', 'a${i}')">
      <span><i class="v" style="height:${(vistos[i] / max * 100).toFixed(1)}%"></i><i class="s" style="height:${(fui[i] / max * 100).toFixed(1)}%"></i></span><small>${l}</small></button>`).join('');
  const k = sel && sel[0] === 'a' ? Number(sel.slice(1)) : -1;
  const nomeMes = i => new Date(2000, i, 1).toLocaleDateString('pt-BR', { month: 'long' });
  const info = k >= 0 ? `<span><strong>${nomeMes(k)}</strong>: ${plural(vistos[k], 'filme ou série', 'filmes e séries')} · ${plural(fui[k], 'saída', 'saídas')}</span>`
    : `<span><b class="rs-leg-v"></b>vistos <b class="rs-leg-s"></b>saídas · ${vistos.reduce((a, b) => a + b, 0) + fui.reduce((a, b) => a + b, 0)} programas em ${ano}</span>`;
  return rsQuadro('rs-lz-ano', '🗓️', `O ano ${ano}`, 'filmes, séries e saídas por mês', "verSecaoLazer('midia')", `<div class="rs-ano">${col}</div>`, info);
}
function rsRenderLeisure() {
  const el = document.getElementById('rs-leisure'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsLzTela()}${rsLzSair()}${rsLzMusica()}${rsLzAno()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// ✈️ VIAGENS — a janela do avião (contagem da próxima) · o ano numa régua · as milhas e a validade · o que custa
// (a seção já tem o cartão de embarque, o passaporte de carimbos e os postais: aqui não se repete nenhum)
// ════════════════════════════════════════════════════════════════════════════
function rsVgProxima() {
  const vem = trips.filter(t => !vgFeita(t) && t.status !== 'ideia').sort((a, b) => (a.inicio || '9999').localeCompare(b.inicio || '9999'));
  const t = vem[0];
  if (!t) return rsQuadro('rs-vg-prox', '🛫', 'A próxima', 'nenhuma marcada', "verSecaoViagens('viagens')", '<div class="sp-vazio">Nenhuma viagem marcada. Que tal tirar uma das ideias do papel?</div>',
    `<span>${plural(trips.filter(x => x.status === 'ideia').length, 'ideia guardada', 'ideias guardadas')}</span>`);
  const q = vgQuando(t), dias = t.inicio ? rsDiasAte(t.inicio) : null, s = STATUS_VIAGEM[t.status] || STATUS_VIAGEM.ideia;
  const med = (l, rot) => { const tot = (l || []).length, ok = (l || []).filter(i => i.done).length; return tot ? `<span class="rs-vg-med"><small>${rot}</small><span class="rs-vg-med-b"><i style="width:${(ok / tot * 100).toFixed(1)}%"></i></span><b>${ok}/${tot}</b></span>` : ''; };
  const orc = Number(t.orcamento) || 0, gasto = Number(t.gasto) || 0;
  const janela = `<button type="button" class="rs-janela" style="--cor:${vgCor(t.destino)}" onclick="vgAbrir(${t.id})" title="Abrir a viagem">
      ${t.img ? `<img src="${esc(t.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="rs-janela-ceu"></span>
      <span class="rs-janela-txt">${dias !== null && dias > 0 ? `<b>${dias}</b><small>${palavra(dias, 'dia', 'dias')}</small>` : `<b class="txt">${esc(q.txt)}</b>`}</span></button>`;
  return rsQuadro('rs-vg-prox', '🛫', 'A próxima', `${esc(t.destino)} · ${s[0]} ${s[1].toLowerCase()}`, "verSecaoViagens('viagens')",
    `<div class="rs-vg-prox-corpo">${janela}<div class="rs-vg-dados"><strong>${esc(t.destino)}</strong>
      <small>${t.inicio ? `${isoParaBR(t.inicio).slice(0, 5)} → ${t.fim ? isoParaBR(t.fim).slice(0, 5) : '?'}${t.inicio && t.fim ? ' · ' + diasDeViagem(t) + ' dias' : ''}` : 'sem data ainda'}</small>
      ${med(t.mala, '🧳 mala')}${med(t.docs, '📄 documentos')}
      ${orc ? `<span class="rs-vg-med${gasto > orc ? ' passou' : ''}"><small>💰 reservado</small><span class="rs-vg-med-b"><i style="width:${Math.min(100, gasto / orc * 100).toFixed(1)}%"></i></span><b>${Math.round(gasto / orc * 100)}%</b></span>` : ''}</div></div>`,
    `<span>${vem.length > 1 ? `Depois: <strong>${esc(vem[1].destino)}</strong>${vem[1].inicio ? ' em ' + isoParaBR(vem[1].inicio).slice(0, 5) : ''}` : 'Só essa marcada'}</span><button type="button" class="mini-btn" onclick="vgAbrir(${t.id})">abrir ›</button>`);
}
function rsVgAno() {
  const sel = rsSel.trips, ano = Number(hojeISO().slice(0, 4)), ini = `${ano}-01-01`, fim = `${ano}-12-31`;
  const nDias = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0 ? 366 : 365;
  const doAno = d => Math.round((new Date(d.slice(0, 4), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) - new Date(ano, 0, 1)) / 864e5);
  const l = trips.map((t, i) => ({ t, i })).filter(({ t }) => t.inicio && t.status !== 'ideia' && t.inicio <= fim && (t.fim || t.inicio) >= ini)
    .sort((a, b) => a.t.inicio.localeCompare(b.t.inicio));
  let viajados = 0;
  // (20/10, item 9) o nome ia DENTRO da barra e uma viagem de 11 dias tem 3% da régua: saía "LIS", "SA", "O" cortados.
  // Agora a barra fica só com a cor e o nome vai numa etiqueta EM CIMA dela, em dois andares quando duas ficam perto.
  const ultimoNoAndar = [-100, -100];
  const rots = [];
  const seg = l.map(({ t, i }) => { const a = Math.max(0, doAno(t.inicio < ini ? ini : t.inicio)), b = Math.min(nDias - 1, doAno((t.fim || t.inicio) > fim ? fim : (t.fim || t.inicio)));
    viajados += b - a + 1;
    const meio = (a + b + 1) / 2 / nDias * 100, cor = vgCor(t.destino);
    const andar = meio - ultimoNoAndar[0] >= 22 ? 0 : meio - ultimoNoAndar[1] >= 22 ? 1 : 0;
    ultimoNoAndar[andar] = meio;
    const lado = meio < 12 ? ' ini' : meio > 88 ? ' fim' : '';
    rots.push(`<i class="rs-vg-tique a${andar}" style="left:${meio.toFixed(2)}%; --cor:${cor}"></i>`
      + `<button type="button" class="rs-vg-rot a${andar}${lado}${sel === 'v' + i ? ' sel' : ''}" style="left:${meio.toFixed(2)}%; --cor:${cor}" onclick="rsTocar('trips', 'v${i}')" title="${esc(t.destino)}">`
      + `<b class="rs-vg-nome">${esc(t.destino)}</b><b class="rs-vg-cod">${esc(vgCodigo(t.destino))}</b><small>${isoParaBR(t.inicio).slice(0, 5)}</small></button>`);
    return `<button type="button" class="rs-vg-seg${vgFeita(t) ? ' feita' : ''}${sel === 'v' + i ? ' sel' : ''}" style="left:${(a / nDias * 100).toFixed(2)}%; width:max(10px, ${((b - a + 1) / nDias * 100).toFixed(2)}%); --cor:${cor}" onclick="rsTocar('trips', 'v${i}')" title="${esc(t.destino)}" aria-label="${esc(t.destino)}"></button>`; }).join('');
  const meses = Array.from({ length: 12 }, (_, m) => `<small style="left:${(doAno(`${ano}-${String(m + 1).padStart(2, '0')}-01`) / nDias * 100).toFixed(2)}%">${new Date(ano, m, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small>`).join('');
  const hojeP = doAno(hojeISO()) / nDias * 100;
  const k = sel && sel[0] === 'v' ? Number(sel.slice(1)) : -1, t = trips[k];
  const info = t ? `<span><strong>${esc(t.destino)}</strong> · ${isoParaBR(t.inicio).slice(0, 5)}${t.fim ? ' → ' + isoParaBR(t.fim).slice(0, 5) : ''} · ${diasDeViagem(t) || 1} dias · ${(STATUS_VIAGEM[t.status] || STATUS_VIAGEM.ideia)[1].toLowerCase()}</span><button type="button" class="mini-btn" onclick="vgAbrir(${t.id})">abrir ›</button>`
    : `<span><strong>${plural(viajados, 'dia', 'dias')}</strong> de viagem em ${ano} · ${plural(l.length, 'viagem', 'viagens')}</span>`;
  return rsQuadro('rs-vg-ano', '🗺️', `${ano} em viagens`, `${l.filter(x => vgFeita(x.t)).length} feitas · ${l.filter(x => !vgFeita(x.t)).length} por vir`, "verSecaoViagens('viagens')",
    `<div class="rs-vg-regua"><div class="rs-vg-rots">${rots.join('')}</div><div class="rs-vg-pista">${seg}<i class="rs-vg-hoje" style="left:${hojeP.toFixed(2)}%"></i></div><div class="rs-vg-meses">${meses}</div></div>`, info);
}
function rsVgMilhas() {
  const h = hojeISO(), l = milhas.slice().sort((a, b) => (Number(b.saldo) || 0) - (Number(a.saldo) || 0));
  const max = Math.max(1, ...l.map(p => Number(p.saldo) || 0)), tot = l.reduce((a, p) => a + (Number(p.saldo) || 0), 0);
  const linhas = l.slice(0, 5).map(p => { const v = p.validade ? rsDiasAte(p.validade) : null;
    return `<button type="button" class="rs-mi" onclick="vgAbrirMilha(${p.id})">
      <span class="rs-mi-nome">${esc(p.programa)}</span><span class="rs-mi-barra"><i style="width:${((Number(p.saldo) || 0) / max * 100).toFixed(1)}%"></i></span>
      <span class="rs-mi-n"><b>${(Number(p.saldo) || 0).toLocaleString('pt-BR')}</b>${v !== null ? `<small class="${v < 0 ? 'vencido' : v <= 60 ? 'perto' : ''}">${v < 0 ? 'venceu' : v <= 60 ? `vence em ${v} d` : 'até ' + isoParaBR(p.validade).slice(3)}</small>` : ''}</span></button>`; }).join('');
  const perto = l.filter(p => p.validade && rsDiasAte(p.validade) >= 0 && rsDiasAte(p.validade) <= 60);
  return rsQuadro('rs-vg-milhas', '🎫', 'Milhas', rsVivo('trips/milhas') || plural(l.length, 'programa', 'programas'), "verSecaoViagens('milhas')",
    `<div class="rs-mis">${linhas || '<div class="sp-vazio">Nenhum programa de milhas.</div>'}</div>`,
    `<span><strong>${tot.toLocaleString('pt-BR')}</strong> milhas no total${perto.length ? ` · <b class="rs-atr">${esc(perto[0].programa)} vence ${rsQuando(perto[0].validade)}</b>` : ''}</span>`);
}
function rsVgCusto() {
  const ano = hojeISO().slice(0, 4);
  const l = trips.filter(t => t.status !== 'ideia' && (t.inicio || '').startsWith(ano) && (Number(t.orcamento) || Number(t.gasto))).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const max = Math.max(1, ...l.map(t => Math.max(Number(t.orcamento) || 0, Number(t.gasto) || 0)));
  const linhas = l.slice(0, 5).map(t => { const o = Number(t.orcamento) || 0, g = Number(t.gasto) || 0;
    return `<button type="button" class="rs-cu${g > o && o ? ' passou' : ''}" style="--cor:${vgCor(t.destino)}" onclick="vgAbrir(${t.id})">
      <span class="rs-cu-nome">${esc(t.destino)}</span>
      <span class="rs-cu-barra">${o ? `<i class="orc" style="width:${(o / max * 100).toFixed(1)}%"></i>` : ''}<i class="gas" style="width:${(g / max * 100).toFixed(1)}%"></i></span>
      <span class="rs-cu-n">${finCompacto(g)}${o ? `<small>de ${finCompacto(o)}</small>` : ''}</span></button>`; }).join('');
  const gTot = l.reduce((a, t) => a + (Number(t.gasto) || 0), 0), oTot = l.reduce((a, t) => a + (Number(t.orcamento) || 0), 0);
  return rsQuadro('rs-vg-custo', '💳', 'O que custa', `${ano}: ${finCompacto(gTot)}${oTot ? ' de ' + finCompacto(oTot) + ' previstos' : ''}`, "verSecaoViagens('viagens')",
    `<div class="rs-cus">${linhas || '<div class="sp-vazio">Nenhuma viagem com orçamento este ano.</div>'}</div>`,
    `<span><b class="rs-cu-leg gas"></b>reservado/gasto <b class="rs-cu-leg orc"></b>orçamento</span>`);
}
function rsRenderTrips() {
  const el = document.getElementById('rs-trips'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsVgProxima()}${rsVgAno()}${rsVgMilhas()}${rsVgCusto()}</div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// 🤝 REDE — o radar de quem está em dia · as velas dos aniversários · falar esta semana · o medidor do currículo
// ════════════════════════════════════════════════════════════════════════════
function rsRdRadar() {
  const sel = rsSel.net, C = 110, R = { quente: 38, morno: 66, frio: 94 };
  // cada pessoa tem um lugar fixo no anel dela (pelo nome); se cair em cima de outra, escorrega no anel até achar vaga
  const postos = [];
  const pontos = contacts.map((c, i) => { const f = rdFaixa(c), r = R[f] - 4 + (esHash((c.nome || '') + 'r') % 9);
    let ang = (esHash(c.nome || String(c.id)) % 360) * Math.PI / 180, x, y;
    for (let t = 0; t < 36; t++) { x = C + r * Math.cos(ang); y = C + r * Math.sin(ang); if (!postos.some(p => Math.hypot(p[0] - x, p[1] - y) < 27)) break; ang += Math.PI / 18; }
    postos.push([x, y]);
    return `<g class="rs-rd-p ${f}${sel === 'c' + i ? ' sel' : ''}${c.favorito ? ' fav' : ''}" onclick="rsTocar('net', 'c${i}')" style="--c:${rdCor(c.nome)}"><title>${esc(c.nome)} · ${rdHa(c)}</title>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}">${esc(rdIniciais(c.nome))}</text></g>`; }).join('');
  const aneis = RD_FAIXAS.map(F => `<circle cx="${C}" cy="${C}" r="${R[F.k]}" class="rs-rd-anel" style="--t:${F.tom}"/>`).join('');
  const conta = k => contacts.filter(c => rdFaixa(c) === k).length;
  const k = sel && sel[0] === 'c' ? Number(sel.slice(1)) : -1, c = contacts[k];
  const zap = c && typeof rdZap === 'function' ? rdZap(c.tel) : '';
  const info = c ? `<span><strong>${c.favorito ? '⭐ ' : ''}${esc(c.nome)}</strong>${c.papel ? ' · ' + esc(c.papel) : ''} · ${rdHa(c)}</span>
      <span class="rs-botoes"><button type="button" class="mini-btn" onclick="faleiCom(${c.id})">💬 falei</button>${zap ? `<a class="mini-btn" href="${esc(zap)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}<button type="button" class="mini-btn" onclick="rdAbrir(${c.id})">abrir ›</button></span>`
    : `<span>${RD_FAIXAS.map(F => `${F.ic} ${conta(F.k)} ${F.nome.toLowerCase()}`).join(' · ')}</span>`;
  return rsQuadro('rs-rd-radar', '📡', 'O radar', rsVivo('net/contatos') || plural(contacts.length, 'pessoa', 'pessoas'), "verSecaoRede('contatos')",
    contacts.length ? `<div class="rs-radar"><svg viewBox="0 0 220 220" role="img" aria-label="Quem está em dia (no meio) e quem sumiu (na borda)">${aneis}
      <text x="${C}" y="${C + 4}" class="rs-rd-eu">você</text>${pontos}</svg></div>` : '<div class="sp-vazio">Ninguém na rede ainda.</div>', info);
}
function rsRdAniv() {
  const sel = rsSel.net;
  const l = contacts.map((c, i) => ({ c, i, a: rdAniversario(c) })).filter(x => x.a && x.a.faltam <= 60).sort((x, y) => x.a.faltam - y.a.faltam);
  // as velas: quanto mais perto, mais alta a chama
  const velas = l.slice(0, 7).map(({ c, i, a }) => `<button type="button" class="rs-vela${a.faltam <= 1 ? ' ja' : ''}${sel === 'a' + i ? ' sel' : ''}" style="--h:${(1 - a.faltam / 60).toFixed(2)}; --c:${rdCor(c.nome)}" onclick="rsTocar('net', 'a${i}')">
      <span class="rs-vela-chama"></span><span class="rs-vela-corpo"></span><b>${a.faltam === 0 ? 'hoje' : a.faltam === 1 ? 'amanhã' : a.faltam + ' d'}</b><small>${esc(c.nome.split(' ')[0])}</small></button>`).join('');
  const k = sel && sel[0] === 'a' ? Number(sel.slice(1)) : -1, x = l.find(o => o.i === k);
  const zap = x && typeof rdZap === 'function' ? rdZap(x.c.tel) : '';
  const info = x ? `<span><strong>${esc(x.c.nome)}</strong> · ${isoParaBR(x.a.prox).slice(0, 5)} (${diaSemanaCurto(x.a.prox)})${x.a.idade ? ' · faz ' + x.a.idade + ' anos' : ''}</span>${zap ? `<a class="mini-btn" href="${esc(zap)}" target="_blank" rel="noopener">🎂 mandar parabéns</a>` : `<button type="button" class="mini-btn" onclick="rdAbrir(${x.c.id})">abrir ›</button>`}`
    : `<span>${l.length ? plural(l.length, 'aniversário', 'aniversários') + ' nos próximos 60 dias' : 'Nenhum aniversário nos próximos 60 dias'}${contacts.filter(c => !c.nascimento).length ? ` · ${plural(contacts.filter(c => !c.nascimento).length, 'pessoa sem data', 'pessoas sem data')}` : ''}</span>`;
  return rsQuadro('rs-rd-aniv', '🎂', 'Aniversários', l.length ? `o próximo é ${esc(l[0].c.nome.split(' ')[0])}, ${l[0].a.faltam === 0 ? 'hoje' : rsQuando(l[0].a.prox)}` : 'nos próximos 60 dias', "verSecaoRede('contatos')",
    velas ? `<div class="rs-velas">${velas}</div>` : '<div class="sp-vazio">Guarde a data de nascimento nos contatos para ver aqui.</div>', info);
}
function rsRdFalar() {
  const falar = contacts.filter(precisaFalar).sort((a, b) => (rdDias(b) ?? 9999) - (rdDias(a) ?? 9999));
  const linhas = falar.slice(0, 5).map(c => `<div class="rs-fal"><button type="button" class="rs-fal-av" style="--c:${rdCor(c.nome)}" onclick="rdAbrir(${c.id})">${esc(rdIniciais(c.nome))}</button>
      <span><b>${esc(c.nome)}</b><small>${rdHa(c)}${c.lembrar ? ' · combinado a cada ' + c.lembrar + ' dias' : ''}</small></span>
      <button type="button" class="mini-btn" onclick="faleiCom(${c.id})" title="Registrar que falei hoje">💬</button></div>`).join('');
  return rsQuadro('rs-rd-falar', '⏰', 'Falar esta semana', falar.length ? plural(falar.length, 'pessoa', 'pessoas') : 'ninguém esperando', "verSecaoRede('contatos')",
    `<div class="rs-fals">${linhas || '<div class="sp-vazio">Todo mundo em dia. 🙌</div>'}${falar.length > 5 ? `<button type="button" class="rs-mais" onclick="verSecaoRede('contatos')">+${falar.length - 5} ›</button>` : ''}</div>`,
    `<span>O 💬 registra que você falou hoje</span>`);
}
function rsRdCV() {
  const ch = rdChecagemCV(), ok = ch.filter(x => x[1]).length, pct = Math.round(ok / ch.length * 100), c = 2 * Math.PI * 44;
  const falta = ch.filter(x => !x[1]).map(x => x[0]);
  const c2 = cv(), exp = (c2.experiencias || []).length, form = (c2.formacoes || []).length;
  return rsQuadro('rs-rd-cv', '📄', 'Currículo', `${pct}% completo`, "verSecaoRede('curriculo')",
    `<div class="rs-cv"><div class="rs-cv-anel"><svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="44" class="rs-cv-fundo"/>
        <circle cx="55" cy="55" r="44" class="rs-cv-cheio${pct === 100 ? ' ok' : ''}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 55 55)"/></svg><b>${pct}%</b></div>
      <div class="rs-cv-lista">${falta.length ? `<small>FALTA</small>${falta.slice(0, 5).map(f => `<button type="button" class="rs-cv-f" onclick="verSecaoRede('curriculo')">○ ${esc(f)}</button>`).join('')}${falta.length > 5 ? `<small>+${falta.length - 5}</small>` : ''}` : '<p class="rs-ok">✅ Tudo preenchido</p>'}</div></div>`,
    `<span>${plural(exp, 'experiência', 'experiências')} · ${plural(form, 'formação', 'formações')}</span><button type="button" class="mini-btn" onclick="verSecaoRede('curriculo')">editar ›</button>`);
}
function rsRenderNet() {
  const el = document.getElementById('rs-net'); if (!el) return;
  el.innerHTML = `<div class="sp-grade">${rsRdRadar()}${rsRdAniv()}${rsRdFalar()}${rsRdCV()}</div>`;
}

// ───────────────────────────── ligar tudo ──────────────────────────────────
Object.keys(RS_ABAS).forEach(aba => { try { rsMontar(aba); rsEmbrulhar(aba); } catch (e) { console.error('resumos', aba, e); } });
// a ⚙ de cada aba ganha o liga/desliga (o arrumar.js, que vem depois, põe o "Como ver esta aba" na frente)
if (typeof CFG_ABA_EXTRA !== 'undefined') Object.keys(RS_ABAS).forEach(aba => {
  const k = 'btn-' + aba, antes = CFG_ABA_EXTRA[k];
  CFG_ABA_EXTRA[k] = () => rsHtmlCfg(aba) + (typeof antes === 'function' ? antes() : '');
});
// gravou → o Painel à vista se redesenha; trocou de aba → idem (o relógio anda)
if (typeof salvar === 'function') { const _salvarRs = salvar; salvar = function () { const r = _salvarRs.apply(this, arguments); try { rsAgendar(); } catch (e) { } return r; }; }
if (typeof changeTab === 'function') { const _ctRs = changeTab; changeTab = function () { const r = _ctRs.apply(this, arguments); try { rsAgendar(); } catch (e) { } return r; }; }
setInterval(() => { if (document.visibilityState === 'visible') rsAgendar(); }, 60000);
// a aba abre no Painel (como a Saúde e as Finanças)
Object.keys(RS_ABAS).forEach(aba => { if (rsLigado(aba)) try { window[RS_ABAS[aba].fn]('painel'); } catch (e) { console.error('resumos', aba, e); } });
