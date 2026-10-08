// ════════════════════════════════════════════════════════════════════════════
// TAREFAS — O FOCO, A MATRIZ, A BARRA RÁPIDA E AS ROTINAS COM TRILHA (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Queixa dele: "parece bloco de notas"; "as barras de cima não estão
// centralizadas". Proposta aprovada em 08/10, cada parte com a sua cara:
//   • a BARRA RÁPIDA no topo: uma linha só, que entende o prazo ("sexta",
//     "amanhã", "dia 15", "15/10", "em 3 dias"), a #lista e o ! da estrela.
//     O formulário completo continua existindo, mas só abre como folha (＋ ou ✎);
//   • o FOCO (tela de entrada): o anel do dia, a PRÓXIMA tarefa em destaque,
//     a sequência de dias e as barrinhas dos últimos 14 dias;
//   • embaixo dele, a MATRIZ urgente × importante: estrela = importante, prazo
//     até amanhã = urgente. Arrastar (ou tocar → mover) troca de quadrante;
//   • o CARTÃO VIVO de cada tarefa: cor da lista, bolinha que dá o check com
//     animação, barrinha das subtarefas, prazo em etiqueta colorida;
//   • as ROTINAS em cartões com a TRILHA das últimas vezes (verde = fez,
//     vermelho = passou) e a contagem regressiva até a próxima.
// Nenhum dado novo: tudo sai de `tasks`, `tasklists` e `routines`.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const TAR_SECOES = ['foco', 'listas', 'rotinas'];
let tarefasSecao = 'foco';
const tarEstado = { pulo: 0, abertos: {}, quadMais: {}, desfazer: null, desfazerTimer: null, arrastando: null };
const TAR_CORES = ['#a78bfa', '#f472b6', '#fb923c', '#22c55e', '#facc15', '#2dd4bf', '#f87171', '#60a5fa', '#c084fc'];
const TAR_QUADS = [
  { k: 'ja',       ic: '🔥', nome: 'Fazer já', dica: 'urgente e importante',       tom: 'var(--perigo)',  vazio: 'Nada pegando fogo.' },
  { k: 'agendar',  ic: '📅', nome: 'Agendar',  dica: 'importante, sem pressa',     tom: 'var(--info)',    vazio: 'Dê ⭐ ao que importa e ainda não tem pressa.' },
  { k: 'encaixar', ic: '⚡', nome: 'Encaixar', dica: 'urgente, pouco importante',  tom: 'var(--atencao)', vazio: 'Nada urgente de pouca importância.' },
  { k: 'talvez',   ic: '🍃', nome: 'Talvez',   dica: 'nem urgente nem importante', tom: 'var(--ok)',      vazio: 'Vazio por aqui.' }
];
const TAR_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';

// ───────────────────────────── utilidades ─────────────────────────────────
/** Cor de cada lista: a padrão fica com o azul de sempre; as outras pela posição. */
function tarCorLista(id) {
  if (id === 'padrao') return COR_TAREFA;
  const i = tasklists.findIndex(l => l.id === id);
  return TAR_CORES[(i < 0 ? 0 : i) % TAR_CORES.length];
}
function tarUrgente(t) { return !!t.due && t.due <= somaDias(hojeISO(), 1); }
function tarQuadrante(t) {
  const u = tarUrgente(t), i = !!t.starred;
  return u && i ? 'ja' : i ? 'agendar' : u ? 'encaixar' : 'talvez';
}
/** O `doneAt` é hora em UTC; o dia que conta é o daqui. */
function tarDiaLocal(isoHora) { if (!isoHora) return ''; const d = new Date(isoHora); return isNaN(d) ? '' : isoDe(d); }
function tarDiasEntre(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 864e5);
}
function tarBR(iso) { return iso ? isoParaBR(iso).slice(0, 5) : ''; }
/** Redesenha tudo que mostra tarefa (a aba, o Painel, a saudação, a agenda). */
function tarAtualizarTudo() { renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar(); }

/** As pendentes na ordem do foco: fazer já → encaixar → agendar → talvez. */
function tarFila() {
  const ordem = { ja: 0, encaixar: 1, agendar: 2, talvez: 3 };
  return tasks.filter(t => !t.done).sort((a, b) => ordem[tarQuadrante(a)] - ordem[tarQuadrante(b)] || ordenarTarefas(a, b));
}
/** O dia: o que já foi concluído hoje + o que ainda vence até hoje. */
function tarDoDia() {
  const hoje = hojeISO();
  const feitas = tasks.filter(t => t.done && tarDiaLocal(t.doneAt) === hoje).length;
  const faltam = tasks.filter(t => !t.done && t.due && t.due <= hoje).length;
  return { feitas, total: feitas + faltam };
}
/** Dias seguidos com pelo menos uma tarefa concluída (hoje ainda vazio não quebra). */
function tarSequencia() {
  const dias = new Set(tasks.filter(t => t.done).map(t => tarDiaLocal(t.doneAt)));
  let d = hojeISO(); if (!dias.has(d)) d = somaDias(d, -1);
  let n = 0; while (dias.has(d) && n < 999) { n++; d = somaDias(d, -1); }
  return n;
}
function tarUltimosDias(n) {
  const cont = {};
  tasks.forEach(t => { if (t.done) { const d = tarDiaLocal(t.doneAt); if (d) cont[d] = (cont[d] || 0) + 1; } });
  const r = []; for (let i = n - 1; i >= 0; i--) { const d = somaDias(hojeISO(), -i); r.push({ d, n: cont[d] || 0 }); }
  return r;
}

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
const TAR_DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
/** Minúsculas e sem acento, com o MESMO comprimento do texto original
 *  (para cortar o prazo do texto pelas mesmas posições). */
function tarSemAcento(s) {
  let n = '';
  for (const ch of String(s)) {
    let c = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (c.length !== ch.length) c = c.length > ch.length ? c.slice(0, ch.length) : c.padEnd(ch.length, ' ');
    n += c;
  }
  return n;
}
/** Acha o prazo escrito no texto. Devolve { due, ini, fim } ou null. */
function tarAcharData(s) {
  const n = tarSemAcento(s), hoje = hojeISO(), dsHoje = diaDaSemanaISO(hoje);
  const pre = '(?:(?:ate|para|pra|pro|na|no|nesta|neste|nessa|nesse|esta|este|essa|esse|proxima|proximo)\\s+)*';
  const fim = '(?=$|[\\s.,;!?])';
  const proxDia = alvo => somaDias(hoje, (alvo - dsHoje + 7) % 7);
  const regras = [
    ['depois\\s+de\\s+amanha', () => somaDias(hoje, 2)],
    ['amanha', () => somaDias(hoje, 1)],
    ['hoje', () => hoje],
    ['(?:daqui\\s+(?:a\\s+)?|em\\s+)(\\d{1,3})\\s+dias?', m => somaDias(hoje, Number(m[2]))],
    ['(?:semana\\s+que\\s+vem|proxima\\s+semana)', () => somaDias(hoje, ((1 - dsHoje + 7) % 7) || 7)],
    ['fim\\s+de\\s+semana', () => proxDia(6)],
    ['(segunda(?!\\s+via)|terca|quarta|quinta|sexta)(?:-feira|\\s+feira)?|(sabado|domingo)', m => proxDia(TAR_DIAS.indexOf(m[2] || m[3]))],
    ['dia\\s+(\\d{1,2})', m => {
      const d = Number(m[2]); if (d < 1 || d > 31) return '';
      const [y, mm] = hoje.split('-').map(Number);
      let alvo = new Date(y, mm - 1, d); if (isoDe(alvo) < hoje) alvo = new Date(y, mm, d);
      return alvo.getDate() === d ? isoDe(alvo) : '';
    }],
    ['(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?', m => {
      const d = Number(m[2]), mm = Number(m[3]); let y = m[4] ? Number(m[4]) : Number(hoje.slice(0, 4));
      if (y < 100) y += 2000;
      if (mm < 1 || mm > 12 || d < 1 || d > 31) return '';
      let alvo = new Date(y, mm - 1, d);
      if (!m[4] && tarDiasEntre(isoDe(alvo), hoje) > 60) alvo = new Date(y + 1, mm - 1, d);
      return alvo.getDate() === d ? isoDe(alvo) : '';
    }]
  ];
  for (const [pat, calc] of regras) {
    const m = new RegExp(`(^|\\s)${pre}(?:${pat})${fim}`).exec(n);
    if (!m) continue;
    const due = calc(m); if (!due) continue;
    return { due, ini: m.index + m[1].length, fim: m.index + m[0].length };
  }
  return null;
}
/** "pagar DAS sexta #empresa !" → { text: 'pagar DAS', due, lista, starred }. */
function tarEntender(txt) {
  let resto = String(txt || ''), starred = false, lista = null, listaNova = '', due = '';
  resto = resto.replace(/(^|\s)(!+|⭐)(?=\s|$)/gu, () => { starred = true; return ' '; });
  resto = resto.replace(/(^|\s)#([\p{L}\p{N}_-]+)/u, (m, a, nome) => {
    const alvo = tarSemAcento(nome), limpo = l => tarSemAcento(l.name).replace(/\s+/g, '');
    lista = tasklists.find(l => limpo(l) === alvo) || tasklists.find(l => limpo(l).startsWith(alvo)) || null;
    if (!lista) listaNova = nome.charAt(0).toUpperCase() + nome.slice(1);
    return ' ';
  });
  const d = tarAcharData(resto);
  if (d) { due = d.due; resto = resto.slice(0, d.ini) + ' ' + resto.slice(d.fim); }
  if (taskView === '__star') starred = true;
  return { text: resto.replace(/\s+/g, ' ').trim(), starred, due, lista, listaNova };
}
function tarListaDestino(e) {
  if (e.lista) return e.lista.id;
  return (taskView !== '__star' && taskView !== '__all' && tasklists.some(l => l.id === taskView)) ? taskView : 'padrao';
}
function tarRapidaPrevia() {
  const el = document.getElementById('tar-rapida-previa'), inp = document.getElementById('tar-rapida'); if (!el || !inp) return;
  if (!inp.value.trim()) {
    el.innerHTML = '<span class="tar-dica">Ex.: <b>pagar DAS sexta #empresa !</b> — entendo o prazo, a #lista e o ! (estrela).</span>';
    return;
  }
  const e = tarEntender(inp.value), partes = [];
  partes.push(e.due ? `<span class="tar-due ${e.due < hojeISO() ? 'atras' : e.due === hojeISO() ? 'hoje' : 'prox'}">📅 ${esc(rotuloDataLonga(e.due))}</span>` : '<span class="tar-dica">sem prazo</span>');
  const lid = tarListaDestino(e);
  partes.push(e.listaNova ? `<span class="tar-lt" style="--cor:${TAR_CORES[tasklists.length % TAR_CORES.length]}">${esc(e.listaNova)} <small>(lista nova)</small></span>` : `<span class="tar-lt" style="--cor:${tarCorLista(lid)}">${esc(listaNome(lid))}</span>`);
  if (e.starred) partes.push('<span class="tar-estrela-tag">⭐ importante</span>');
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.text || '…')}</b> ${partes.join(' ')}`;
}
function tarRapidaAdicionar() {
  const inp = document.getElementById('tar-rapida'); if (!inp) return;
  const e = tarEntender(inp.value);
  if (!e.text) { inp.focus(); return; }
  let list = tarListaDestino(e);
  if (e.listaNova) { const l = { id: 'l' + novoId(), name: e.listaNova }; tasklists.push(l); salvar('tasklists', tasklists); list = l.id; }
  tasks.push({ id: novoId(), text: e.text, done: false, createdAt: Date.now(), list, due: e.due, notes: '', starred: e.starred, subtasks: [] });
  salvar('tasks', tasks);
  inp.value = ''; tarRapidaPrevia();
  tarAtualizarTudo();
  toast(`✅ ${e.text.slice(0, 40)}${e.due ? ' · ' + rotuloData(e.due) : ''}${e.listaNova ? ` · lista nova "${e.listaNova}"` : ''}`);
  inp.focus();
}

// ═════════════════════════════ 2. O CARTÃO VIVO ═══════════════════════════
function tarTags(t, comLista) {
  const p = prazoInfo(t);
  const cls = { 'due-late': 'atras', 'due-today': 'hoje', 'due-soon': 'prox', 'due-done': 'feita' }[p.classe] || '';
  return (p.rotulo ? `<span class="tar-due ${cls}">${esc(p.rotulo)}</span>` : '') +
    (comLista ? `<span class="tar-lt" style="--cor:${tarCorLista(t.list)}">${esc(listaNome(t.list))}</span>` : '') +
    (nAnexos(t) ? `<span class="tar-mini" title="Anexos">📎${nAnexos(t)}</span>` : '') +
    (t.notes ? `<span class="tar-mini" title="${esc(t.notes)}">📝</span>` : '');
}
function tarBarraSub(f, n) {
  return `<div class="tar-subl" title="${f} de ${n} subtarefas"><div class="tar-sub"><i style="width:${Math.round(f / n * 100)}%"></i></div><small>${f}/${n}</small></div>`;
}
function tarCartao(t, ctx) {
  const subs = t.subtasks || [], fs = subs.filter(s => s.done).length, ab = !!tarEstado.abertos[t.id];
  const comLista = ctx === 'quad' || taskView === '__star' || taskView === '__all';
  return `<div class="tar-c${t.done ? ' feita' : ''}${ab ? ' aberto' : ''}" style="--cor:${tarCorLista(t.list)}" data-id="${t.id}"${t.done ? '' : ' draggable="true"'}>
    <div class="tar-c-linha">
      <button type="button" class="tar-ok" title="${t.done ? 'Desmarcar' : 'Concluir'}" onclick="tarConcluir(${t.id}, this)">${TAR_CHECK}</button>
      <div class="tar-c-corpo" onclick="tarAbrir(${t.id})" title="Toque para ver as opções">
        <div class="tar-c-tx">${t.routineId ? '<span title="Tarefa de rotina">🔄</span> ' : ''}${textoComLink(t.text)}</div>
        <div class="tar-tags">${tarTags(t, comLista)}</div>
        ${subs.length ? tarBarraSub(fs, subs.length) : ''}
      </div>
      <button type="button" class="tar-estrela${t.starred ? ' on' : ''}" title="${t.starred ? 'Tirar a estrela' : 'Marcar como importante'}" onclick="alternarEstrela(${t.id})">${t.starred ? '★' : '☆'}</button>
    </div>
    ${ab ? tarCartaoAberto(t) : ''}
  </div>`;
}
function tarCartaoAberto(t) {
  const subs = t.subtasks || [], q = tarQuadrante(t);
  return `<div class="tar-c-mais">
    ${subs.length ? `<div class="tar-subs">${subs.map((s, i) => `<label class="tar-subi${s.done ? ' feita' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleSubtask(${t.id}, ${i})"><span>${textoComLink(s.text)}</span></label>`).join('')}</div>` : ''}
    ${t.notes ? `<p class="tar-c-nota">${linkify(esc(t.notes))}</p>` : ''}
    ${chipsAnexos(t, 'task', t.id)}
    <div class="tar-c-acoes">
      ${t.done ? '' : `<span class="tar-grupo"><b>prazo</b><button type="button" class="mini-btn" onclick="adiarTarefa(${t.id}, 0)">hoje</button><button type="button" class="mini-btn" onclick="adiarTarefa(${t.id}, 1)">amanhã</button><button type="button" class="mini-btn" onclick="adiarTarefa(${t.id}, 7)">+7d</button></span>
      <span class="tar-grupo"><b>mover</b>${TAR_QUADS.map(Q => `<button type="button" class="mini-btn${Q.k === q ? ' on' : ''}" title="${Q.nome}" onclick="tarMover(${t.id}, '${Q.k}')">${Q.ic}</button>`).join('')}</span>`}
      <span class="tar-grupo"><button type="button" class="mini-btn" title="Anexos: link ou imagem" onclick="abrirAnexos('task', ${t.id})">📎</button><button type="button" class="mini-btn" title="Editar tudo" onclick="editarTarefa(${t.id})">✎ editar</button><button type="button" class="mini-btn" title="Apagar" onclick="removeTask(${t.id})">✕</button></span>
    </div>
  </div>`;
}
function tarAbrir(id) { tarEstado.abertos[id] = !tarEstado.abertos[id]; tarRender(); }
/** O check com a animação: a bolinha enche, o cartão some, e aí grava. */
function tarConcluir(id, btn) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const caixa = btn && btn.closest('.tar-c, .tar-prox');
  if (!t.done && caixa && !caixa.classList.contains('concluindo')) {
    caixa.classList.add('concluindo');
    setTimeout(() => { tarEstado.pulo = 0; toggleTask(id); }, 380);
    return;
  }
  if (t.done) toggleTask(id);
}
function tarPular() { tarEstado.pulo++; tarRenderFoco(); }

// ═══════════════════════ 3. O FOCO E A MATRIZ ═════════════════════════════
function tarAnel(feitas, total) {
  const r = 42, c = 2 * Math.PI * r, p = total ? feitas / total : 0;
  const rot = !total ? 'dia livre' : feitas === total ? 'tudo feito' : 'do dia';
  return `<svg class="tar-anel" viewBox="0 0 100 100" role="img" aria-label="${feitas} de ${total} tarefas do dia">
    <circle cx="50" cy="50" r="${r}" class="tar-anel-fundo"/>
    <circle cx="50" cy="50" r="${r}" class="tar-anel-cheio${total && feitas === total ? ' completo' : ''}" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="50" class="tar-anel-n">${total ? `${feitas}/${total}` : '✓'}</text>
    <text x="50" y="66" class="tar-anel-r">${rot}</text>
  </svg>`;
}
function tarProximaHTML(fila) {
  if (!fila.length) return '<div class="tar-prox vazia"><small class="tar-prox-rot">PRÓXIMA</small><b>Nada pendente.</b><span class="tar-dica">Escreva na barra acima o que vem pela frente.</span></div>';
  const i = tarEstado.pulo % fila.length, t = fila[i], subs = t.subtasks || [], fs = subs.filter(s => s.done).length;
  const Q = TAR_QUADS.find(q => q.k === tarQuadrante(t));
  return `<div class="tar-prox" style="--cor:${tarCorLista(t.list)}">
    <small class="tar-prox-rot">PRÓXIMA${fila.length > 1 ? ` · ${i + 1} de ${fila.length}` : ''} · <span style="color:${Q.tom}">${Q.ic} ${Q.nome}</span></small>
    <div class="tar-prox-linha">
      <button type="button" class="tar-ok grande" title="Concluir" onclick="tarConcluir(${t.id}, this)">${TAR_CHECK}</button>
      <div class="tar-prox-tx" onclick="editarTarefa(${t.id})" title="Abrir para editar">${t.routineId ? '🔄 ' : ''}${textoComLink(t.text)}</div>
    </div>
    <div class="tar-tags">${tarTags(t, true)}</div>
    ${subs.length ? tarBarraSub(fs, subs.length) : ''}
    <div class="tar-prox-acoes"><button type="button" class="mini-btn" onclick="adiarTarefa(${t.id}, 1)">⏭ para amanhã</button>${fila.length > 1 ? '<button type="button" class="mini-btn" onclick="tarPular()">pular ›</button>' : ''}</div>
  </div>`;
}
function tarMatrizHTML(fila) {
  const por = { ja: [], agendar: [], encaixar: [], talvez: [] };
  fila.forEach(t => por[tarQuadrante(t)].push(t));
  const LIM = 5;
  return `<div class="tar-matriz">${TAR_QUADS.map(Q => {
    const lst = por[Q.k], tudo = !!tarEstado.quadMais[Q.k];
    return `<section class="sp-quadro tar-quad" data-quad="${Q.k}" style="--tom:${Q.tom}">
      <div class="sp-cab"><span class="sp-ic">${Q.ic}</span><span class="sp-tit">${Q.nome}</span><small>${Q.dica}</small><b class="tar-quad-n">${lst.length}</b></div>
      <div class="tar-quad-lista">${lst.length ? lst.slice(0, tudo ? lst.length : LIM).map(t => tarCartao(t, 'quad')).join('') : `<div class="tar-quad-vazio">${Q.vazio}</div>`}</div>
      ${lst.length > LIM ? `<button type="button" class="mini-btn tar-quad-mais" onclick="tarVerQuadrante('${Q.k}')">${tudo ? 'mostrar menos' : `＋ ${lst.length - LIM} mais`}</button>` : ''}
    </section>`;
  }).join('')}</div>`;
}
function tarVerQuadrante(k) { tarEstado.quadMais[k] = !tarEstado.quadMais[k]; tarRenderFoco(); }
function tarRenderFoco() {
  const el = document.getElementById('tar-foco'); if (!el) return;
  const fila = tarFila(), dia = tarDoDia(), seq = tarSequencia(), ult = tarUltimosDias(14), hoje = hojeISO();
  const max = Math.max(1, ...ult.map(x => x.n)), feitas14 = ult.reduce((a, x) => a + x.n, 0);
  const atras = fila.filter(t => t.due && t.due < hoje).length;
  el.innerHTML = `<div class="tar-foco-topo">
      <div class="tar-foco-anel">${tarAnel(dia.feitas, dia.total)}</div>
      ${tarProximaHTML(fila)}
      <div class="tar-foco-num">
        <div class="tar-num${seq ? ' quente' : ''}"><b>${seq ? '🔥 ' : ''}${seq}</b><small>${palavra(seq, 'dia seguido', 'dias seguidos')}</small></div>
        <div class="tar-num${atras ? ' alerta' : ''}"><b>${atras}</b><small>${palavra(atras, 'atrasada', 'atrasadas')}</small></div>
        <div class="tar-barras" title="Concluídas por dia nos últimos 14 dias">
          <div>${ult.map(x => `<i class="${x.n ? 'tem' : ''}${x.d === hoje ? ' hoje' : ''}" style="height:${x.n ? Math.max(18, Math.round(x.n / max * 100)) : 8}%" title="${tarBR(x.d)}: ${x.n}"></i>`).join('')}</div>
          <small>${feitas14} ${palavra(feitas14, 'feita', 'feitas')} em 14 dias</small>
        </div>
      </div>
    </div>
    ${tarEstado.desfazer ? '<button type="button" class="tar-desfazer" onclick="tarDesfazer()">↶ Desfazer a última troca de quadrante</button>' : ''}
    ${tarMatrizHTML(fila)}
    <p class="tar-legenda">⭐ estrela = importante · prazo até amanhã = urgente · arraste um cartão para outro quadrante, ou toque nele → <b>mover</b>.</p>`;
  tarLigarArraste(el);
}
/** Trocar de quadrante = mexer na estrela e, se preciso, no prazo. Sempre com desfazer. */
function tarMover(id, k) {
  const t = tasks.find(x => x.id === id); if (!t || t.done || tarQuadrante(t) === k) return;
  const antes = { starred: !!t.starred, due: t.due || '' };
  const urg = k === 'ja' || k === 'encaixar';
  t.starred = k === 'ja' || k === 'agendar';
  if (urg && !tarUrgente(t)) t.due = hojeISO();
  if (!urg && tarUrgente(t)) t.due = somaDias(hojeISO(), 7);
  salvar('tasks', tasks);
  tarEstado.desfazer = { id, antes };
  clearTimeout(tarEstado.desfazerTimer);
  tarEstado.desfazerTimer = setTimeout(() => { tarEstado.desfazer = null; tarRenderFoco(); }, 12000);
  tarAtualizarTudo();
  const Q = TAR_QUADS.find(q => q.k === k);
  toast(`${Q.ic} "${t.text.slice(0, 28)}" → ${Q.nome}${t.due !== antes.due ? ` · prazo ${rotuloData(t.due)}` : ''}`, 5000);
}
function tarDesfazer() {
  const u = tarEstado.desfazer; if (!u) return;
  const t = tasks.find(x => x.id === u.id);
  if (t) { t.starred = u.antes.starred; t.due = u.antes.due; salvar('tasks', tasks); }
  tarEstado.desfazer = null; clearTimeout(tarEstado.desfazerTimer);
  tarAtualizarTudo(); toast('↶ Desfeito.');
}
/** Arrastar entre quadrantes (mouse; no celular, "mover" no cartão aberto). Liga uma vez só. */
function tarLigarArraste(el) {
  if (el._arraste) return; el._arraste = true;
  const quad = e => e.target && e.target.closest ? e.target.closest('.tar-quad') : null;
  el.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('.tar-c[draggable="true"]'); if (!c) return;
    tarEstado.arrastando = Number(c.dataset.id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (_) { /* alguns navegadores recusam; o id fica no estado */ }
    c.classList.add('arrastando');
  });
  el.addEventListener('dragend', () => { tarEstado.arrastando = null; el.querySelectorAll('.arrastando, .alvo').forEach(x => x.classList.remove('arrastando', 'alvo')); });
  el.addEventListener('dragover', e => {
    const q = quad(e); if (!q || tarEstado.arrastando == null) return;
    e.preventDefault();
    el.querySelectorAll('.tar-quad.alvo').forEach(x => { if (x !== q) x.classList.remove('alvo'); });
    q.classList.add('alvo');
  });
  el.addEventListener('dragleave', e => { const q = quad(e); if (q && !q.contains(e.relatedTarget)) q.classList.remove('alvo'); });
  el.addEventListener('drop', e => {
    const q = quad(e); if (!q || tarEstado.arrastando == null) return;
    e.preventDefault();
    const id = tarEstado.arrastando; tarEstado.arrastando = null;
    tarMover(id, q.dataset.quad);
  });
}

// ═══════════════════════════ 4. AS LISTAS ═════════════════════════════════
function tarRenderChips() {
  const el = document.getElementById('task-lists'); if (!el) return;
  const cont = id => tasks.filter(t => !t.done && (id === '__star' ? t.starred : id === '__all' ? true : t.list === id)).length;
  const chip = (id, nome, ic, cor) => `<span class="${taskView === id ? 'active' : ''}" style="--cor:${cor}" onclick="verLista('${id}', this)">${ic}${esc(nome)} <small>${cont(id)}</small></span>`;
  el.innerHTML = chip('__star', 'Com estrela', '⭐ ', 'var(--atencao)') +
    tasklists.map(l => chip(l.id, l.name, '<i class="tar-ponto"></i>', tarCorLista(l.id))).join('') +
    chip('__all', 'Todas', '🗂️ ', 'var(--txt3)') + '<span class="add-list" onclick="novaLista()">＋ Nova lista</span>';
  const tools = document.getElementById('task-list-tools');
  if (tools) tools.innerHTML = (taskView !== '__star' && taskView !== '__all')
    ? `<button type="button" class="mini-btn" onclick="renomearLista('${taskView}')" title="Renomear lista">✎ renomear "${esc(listaNome(taskView))}"</button>${taskView !== 'padrao' ? `<button type="button" class="mini-btn" onclick="apagarLista('${taskView}')" title="Apagar lista">✕ apagar lista</button>` : ''}` : '';
  const sel = document.getElementById('task-list-select');
  if (sel) sel.innerHTML = tasklists.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  if (sel && !document.getElementById('task-id').value) sel.value = (taskView !== '__star' && taskView !== '__all') ? taskView : 'padrao';
}
function tarRenderGrupos() {
  const el = document.getElementById('task-list'); if (!el) return;
  const hoje = hojeISO(), vis = tarefasVisiveis();
  const abertas = vis.filter(t => !t.done).sort(ordenarTarefas);
  const feitas = vis.filter(t => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  if (!abertas.length && !feitas.length) { el.innerHTML = '<div class="sp-vazio">Nada nesta lista. Escreva na barra acima para adicionar.</div>'; return; }
  const grupos = [
    ['⚠️ Atrasadas', 'g-atras', abertas.filter(t => t.due && t.due < hoje)],
    ['📌 Hoje', 'g-hoje', abertas.filter(t => t.due === hoje)],
    ['📅 Próximas', 'g-prox', abertas.filter(t => t.due && t.due > hoje)],
    ['📝 Sem prazo', 'g-sem', abertas.filter(t => !t.due)]
  ];
  el.innerHTML = grupos.filter(g => g[2].length).map(([tit, cls, itens]) =>
    `<section class="tar-gr ${cls}"><h3 class="tar-gr-tit">${tit} <small>${itens.length}</small></h3><div class="tar-grade">${itens.map(t => tarCartao(t, 'lista')).join('')}</div></section>`).join('') +
    (feitas.length ? `<section class="tar-gr g-feitas"><button type="button" class="tar-gr-tit tar-gr-botao" onclick="taskShowDone = !taskShowDone; tarRenderGrupos();">${taskShowDone ? '▾' : '▸'} ✔️ Concluídas <small>${feitas.length}</small></button>${taskShowDone ? `<div class="tar-grade">${feitas.slice(0, 60).map(t => tarCartao(t, 'lista')).join('')}</div>` : ''}</section>` : '');
}

// ═══════════════════════ 5. AS ROTINAS COM TRILHA ═════════════════════════
/** As últimas 8 vezes da rotina (pelas tarefas que ela fabricou) e a sequência. */
function tarRotTrilha(r) {
  const hoje = hojeISO(), quando = t => t.occur || t.due || '';
  const ocs = tasks.filter(t => t.routineId === r.id).sort((a, b) => quando(a).localeCompare(quando(b)));
  const ult = ocs.slice(-8);
  const ponto = t => {
    const d = quando(t);
    if (t.done) return `<i class="ok" title="${tarBR(d)} · feita"></i>`;
    if (d && d < hoje) return `<i class="perdeu" title="${tarBR(d)} · passou sem fazer"></i>`;
    return `<i class="aberta" title="${tarBR(d)} · em aberto"></i>`;
  };
  let seq = 0;
  for (let i = ocs.length - 1; i >= 0; i--) {
    const t = ocs[i];
    if (!t.done && quando(t) >= hoje) continue;
    if (t.done) seq++; else break;
  }
  return { html: '<i class="nada"></i>'.repeat(Math.max(0, 8 - ult.length)) + ult.map(ponto).join(''), seq };
}
function tarRotQuando(r) {
  if (r.active === false) return { txt: '⏸ pausada', cls: 'off' };
  const hoje = hojeISO(), quando = t => t.occur || t.due || '';
  // uma vez perdida ANTES da última feita já passou: quem conta é o que ficou aberto depois dela
  const ultimaFeita = tasks.filter(t => t.routineId === r.id && t.done).map(quando).sort().pop() || '';
  const aberta = tasks.filter(t => t.routineId === r.id && !t.done && t.due && quando(t) > ultimaFeita).sort((a, b) => a.due.localeCompare(b.due))[0];
  if (aberta && aberta.due < hoje) { const n = tarDiasEntre(aberta.due, hoje); return { txt: `atrasada há ${plural(n, 'dia', 'dias')}`, cls: 'atras' }; }
  const prox = aberta ? aberta.due : (r.next || hoje);
  const n = tarDiasEntre(hoje, prox);
  if (n <= 0) return { txt: 'é hoje', cls: 'hoje' };
  if (n === 1) return { txt: 'amanhã', cls: 'hoje' };
  return { txt: `em ${n} dias · ${tarBR(prox)}`, cls: '' };
}
function tarRotCartao(r) {
  const off = r.active === false, tr = tarRotTrilha(r), q = tarRotQuando(r);
  const m = String(r.text).match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
  const ic = m ? m[1] : '🔄', tx = m ? m[2] : r.text;
  return `<div class="tar-rot${off ? ' off' : ''}" style="--cor:${tarCorLista(r.list)}">
    <div class="tar-rot-cab"><span class="tar-rot-ic">${ic}</span><div><b>${esc(tx)}</b><small>${esc(descricaoRotina(r))} · ${esc(listaNome(r.list))}</small></div></div>
    <div class="tar-rot-trilha" title="As últimas vezes: verde = feita, vermelho = passou sem fazer">${tr.html}</div>
    <div class="tar-rot-pe"><span class="tar-rot-quando ${q.cls}">${q.txt}</span>${tr.seq > 1 ? `<span class="tar-rot-seq">🔥 ${tr.seq} seguidas</span>` : ''}${r.count ? `<small>${r.count}× no total</small>` : ''}</div>
    <div class="tar-rot-acoes"><button type="button" class="mini-btn" title="Criar a tarefa para hoje" onclick="gerarRotinaAgora(${r.id})">▶ hoje</button><button type="button" class="mini-btn${off ? '' : ' on'}" title="${off ? 'Reativar' : 'Pausar'}" onclick="alternarRotina(${r.id})">${off ? '▶ reativar' : '⏸'}</button><button type="button" class="mini-btn" title="Editar" onclick="editarRotina(${r.id})">✎</button><button type="button" class="mini-btn" title="Apagar" onclick="removerRotina(${r.id})">✕</button></div>
  </div>`;
}
function tarRenderRotinas() {
  const el = document.getElementById('rot-cartoes'); if (!el) return;
  if (!routines.length) { el.innerHTML = '<div class="sp-vazio">Nenhuma rotina ainda. Crie a sua ou use as sugeridas.</div>'; return; }
  const ord = [...routines].sort((a, b) => (a.active === false ? 1 : 0) - (b.active === false ? 1 : 0) || (a.next || '').localeCompare(b.next || ''));
  el.innerHTML = `<div class="tar-rot-grade">${ord.map(tarRotCartao).join('')}</div>`;
}
/** "＋ Nova rotina": o formulário vira folha sozinho quando recebe o foco (casca). */
function tarNovaRotina() { cancelarEdicaoRotina(); const c = document.getElementById('rot-text'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); c.focus(); } }

// ══════════════════════ MICRO-ABAS E O DESENHO GERAL ══════════════════════
function verSecaoTarefas(s, el) {
  if (!TAR_SECOES.includes(s)) s = 'foco';
  tarefasSecao = s;
  document.querySelectorAll('#tarefas-secoes > span').forEach(x => x.classList.toggle('active', el ? x === el : (x.getAttribute('onclick') || '').includes(`'${s}'`)));
  TAR_SECOES.forEach(k => { const d = document.getElementById('sec-tar-' + k); if (d) d.hidden = k !== s; });
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
/** Chamado pelo renderTasks() do app.js: tudo que mostra tarefa se redesenha. */
function tarRender() {
  tarRenderFoco(); tarRenderGrupos(); tarRenderRotinas();
  if (document.getElementById('tar-rapida-previa') && !document.getElementById('tar-rapida-previa').innerHTML) tarRapidaPrevia();
}
