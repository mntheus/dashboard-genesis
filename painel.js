// ════════════════════════════════════════════════════════════════════════════
// O PAINEL NOVO (09/10/2026) — 1ª rodada de ajustes ditados, bloco ②
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: "esse quadro de painel tem que ser o que vai ter a maior quantidade
// de módulos móveis e adaptáveis de tamanho… fica aberto durante o dia… bem
// moderno… um painel mesmo (não sistema solar)… a pessoa adiciona literalmente
// qualquer nicho que exista em outra aba". E no esboço: "ajuste o texto que está
// cortado e torne mais interativo os que tiverem proposta de clique (ex.: água)".
// Forma aprovada: MISTURA de widgets de celular (grade, tamanhos fixos, catálogo)
// com acabamento de cockpit (dados vivos, traço fino), sem exagero.
//
// Como funciona:
//  • GRADE PRÓPRIA (não é a de modulos.js): N colunas conforme a largura (2 no
//    celular … 8 no ultrawide), linha de ALTURA FIXA, e cada widget ocupa um dos
//    tamanhos de PN_TAM. `grid-auto-flow: dense` tapa os buracos — nada sobrepõe
//    nada por construção, e nenhum span vem de medir altura (armadilhas 49, 50, 53).
//  • ARRUMAÇÃO POR APARELHO em prefs.painel (decisão dele, 09/10). Não sincroniza.
//  • MODO EDITAR: arrastar (no toque, SÓ pela alça — armadilha nº 20), tamanhos,
//    ◀ ▶, ✕, canto para esticar (mouse), e ＋ abre o CATÁLOGO com todas as abas.
//    Os "setores" de cada aba (setoresDaArea, nucleo.js) viram widget de lista:
//    é isso que garante "qualquer nicho de qualquer aba".
//  • As peças ANTIGAS do Painel (relógio FOCUS, overview, resumo, busca, hábitos…)
//    vão para #pn-legado, ESCONDIDO e intacto: várias funções do app.js escrevem
//    nelas sem conferir se existem (timer-display, greeting-text, progress-fill…).
//    Sumir com elas derrubaria o app. Na apresentação clássica elas voltam.
// Carrega DEPOIS do modulos.js (embrulha changeTab/salvar/redesenharTudo por último).
// ════════════════════════════════════════════════════════════════════════════

// ───────────────────────────── ícones que faltavam ─────────────────────────
Object.assign(ICONES, {
  lapis: 'M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 8.5l2 2',
  engrenagem: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  ferramenta: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.8-3.8a6 6 0 01-7.9 7.9l-6.9 6.9a2.1 2.1 0 01-3-3l6.9-6.9a6 6 0 017.9-7.9l-3.8 3.8z',
  alca: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  gota: 'M12 3.5s6 6.6 6 10.5a6 6 0 01-12 0c0-3.9 6-10.5 6-10.5z',
  play: 'M8 5.5v13l10.5-6.5z',
  pausa: 'M9 5.5v13M15 5.5v13',
  zerar: 'M4.5 12a7.5 7.5 0 107.5-7.5H9M11 1.5l-3 3 3 3',
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  esq: 'M14.5 6l-6 6 6 6',
  dir: 'M9.5 6l6 6-6 6',
  canto: 'M20 11l-9 9M20 16l-4 4',
  girar: 'M20 11a8 8 0 10-2.3 5.7M20 4.5V11h-6.5',
  foto: 'M4 5.5h16v13H4zM4 15l4.5-4.5 4 4 3-3 4.5 4.5M15.5 9.5h.01',
  menos: 'M6 12h12',
  sol: 'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6M12 8a4 4 0 100 8 4 4 0 000-8z'
});

// ───────────────────────────── tamanhos e preferências ─────────────────────
/** c = colunas, l = linhas (a linha tem altura fixa: --pn-u). */
const PN_TAM = {
  p: { c: 1, l: 1, nome: 'Pequeno' },
  m: { c: 2, l: 1, nome: 'Médio' },
  q: { c: 2, l: 2, nome: 'Quadrado' },
  a: { c: 2, l: 3, nome: 'Alto' },
  l: { c: 4, l: 2, nome: 'Largo' },
  g: { c: 4, l: 3, nome: 'Grande' }
};
const PN_ORDEM_TAM = ['p', 'm', 'q', 'a', 'l', 'g'];
/** A cor de cada aba (a bolinha do rótulo e os traços dos gráficos). */
const PN_COR = {
  focus: 'var(--acento)', home: '#60a5fa', finances: '#22c55e', tasks: '#f59e0b', notes: '#eab308',
  studies: '#a78bfa', business: '#14b8a6', inventory: '#fb923c', health: '#f472b6', leisure: '#c084fc',
  trips: '#38bdf8', net: '#94a3b8', clinic: '#ef4444', prod: '#84cc16'
};
/** O painel de fábrica: o que um aparelho novo vê antes de arrumar o seu. */
const PN_PADRAO = [['relogio', 'm'], ['avisos', 'q'], ['hoje', 'q'], ['agua', 'p'], ['saldo', 'p'], ['habitos', 'm'],
  ['foco', 'm'], ['tarefas', 'a'], ['plantao', 'p'], ['viagem', 'p'], ['semana', 'l'], ['obra', 'q'], ['frase', 'm']];
const PN_MIN_COL = 148, PN_VAO = 12;

/** Devolve SEMPRE o mesmo objeto (armadilha nº 6). */
function cfgPainel() {
  const c = prefs.painel = prefs.painel || {};
  if (!Array.isArray(c.itens)) c.itens = PN_PADRAO.map(([t, s]) => ({ u: 'w' + novoId(), t, s }));
  return c;
}
function pnGravar() { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); }
function pnRestaurar() {
  if (!confirm('Voltar o Painel ao de fábrica? Os widgets que você arrumou neste aparelho saem.')) return;
  delete cfgPainel().itens; cfgPainel(); pnGravar(); pnRender(); toast('Painel de volta ao de fábrica.');
}

// ───────────────────────────── utilidades ──────────────────────────────────
const pnTenta = (fn, alt) => { try { const v = fn(); return v === undefined ? alt : v; } catch (e) { return alt; } };
const pnCap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
const pnHora = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const pnAgoraHM = () => pnHora(new Date());
const pnL = ml => (Math.round(ml / 100) / 10).toFixed(1).replace('.', ',');
/** Dinheiro grande e legível: "R$" miúdo, sem centavos; 120 mil vira "120 mil". */
function pnReais(v, semSinal) {
  const n = Math.round(Number(v) || 0), a = Math.abs(n);
  const corpo = a >= 1000000 ? (a / 1000000).toFixed(1).replace('.', ',') + ' mi' : a >= 100000 ? Math.round(a / 1000) + ' mil' : a.toLocaleString('pt-BR');
  return `${n < 0 && !semSinal ? '−' : ''}<small>R$</small>${corpo}`;
}
function pnVazio(icone, texto, botao, acao) {
  return `<div class="pn-vazio">${ic(icone)}<span>${esc(texto)}</span>${botao ? `<button type="button" class="pn-mini-bt" onclick="${acao}">${esc(botao)}</button>` : ''}</div>`;
}
/** Anel de progresso. Guarda o valor anterior por chave e anima do velho para o novo. */
const pnAnelAntes = {};
function pnAnel(pct, chave, cor, tam, grosso) {
  tam = tam || 64; grosso = grosso || 6;
  pct = Math.max(0, Math.min(1, Number(pct) || 0));
  const r = (tam - grosso) / 2, C = 2 * Math.PI * r, meio = tam / 2;
  const de = pnAnelAntes[chave] === undefined ? pct : pnAnelAntes[chave];
  pnAnelAntes[chave] = pct;
  return `<svg class="pn-anel" viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" style="--cor:${cor}" aria-hidden="true">
    <circle cx="${meio}" cy="${meio}" r="${r}" class="pn-anel-fundo" stroke-width="${grosso}"/>
    <circle cx="${meio}" cy="${meio}" r="${r}" class="pn-anel-valor" stroke-width="${grosso}" stroke-dasharray="${C.toFixed(1)}"
      style="stroke-dashoffset:${(C * (1 - de)).toFixed(1)}" data-para="${(C * (1 - pct)).toFixed(1)}" data-c="${C.toFixed(1)}" transform="rotate(-90 ${meio} ${meio})"/></svg>`;
}
/** Barrinha horizontal fina (0–1). */
const pnBarra = (pct, cor) => `<span class="pn-barra"><i style="width:${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%;${cor ? `background:${cor}` : ''}"></i></span>`;

// ───────────────────────────── o registro de widgets ───────────────────────
// Cada widget: { nome, area, desc, tams, padrao, render(x) → { corpo, extra?, titulo? } }
// x = { inst, tam, c, l, previa } — `previa` = desenho do catálogo (sem efeito colateral).
const PN_W = {};
function pnDef(t, d) { PN_W[t] = Object.assign({ t, area: 'focus', tams: ['m'], padrao: (d.tams || ['m'])[0] }, d); }

// ── AGORA (relógio) ────────────────────────────────────────────────────────
function pnProximosHoje(n) {
  const hoje = hojeISO(), agora = pnAgoraHM();
  return pnTenta(() => itensDoDia(hoje), []).filter(i => i.time && i.time >= agora && i.kind !== 'task').slice(0, n || 1)
    .map(i => ({ hora: i.time, txt: i.kind === 'shift' ? (i.obj.desc || pnCap(vt().um)) : i.obj.title, kind: i.kind, id: i.obj.id }));
}
pnDef('relogio', {
  nome: 'Agora', desc: 'Hora, data e o próximo compromisso de hoje', tams: ['p', 'm', 'q'], padrao: 'm',
  render(x) {
    const d = new Date(), hora = pnHora(d);
    const data = pnCap(d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));
    const prox = pnProximosHoje(x.tam === 'q' ? 4 : 1);
    const linha = p => `<button type="button" class="pn-prox" onclick="pnAbrirItemDia('${p.kind}', ${Number(p.id) || 0})"><b>${esc(p.hora)}</b><span>${esc(p.txt)}</span></button>`;
    if (x.tam === 'p') return { corpo: `<div class="pn-num pn-hora">${hora}</div><div class="pn-sub">${esc(data.split(',')[0])}</div>` };
    if (x.tam === 'm') return { corpo: `<div class="pn-lado"><div class="pn-num pn-num-xl pn-hora">${hora}</div><div class="pn-col"><span class="pn-sub pn-forte">${esc(data)}</span>${prox.length ? linha(prox[0]) : '<span class="pn-sub">nada mais marcado hoje</span>'}</div></div>` };
    const analog = cfgAparencia().relogio === 'analogico' && typeof relogioAnalogico === 'function';
    return { corpo: `<div class="pn-rel-q">${analog ? `<div class="pn-analog">${relogioAnalogico(d)}</div>` : `<div class="pn-num pn-num-xxl pn-hora">${hora}</div>`}
      <span class="pn-sub pn-forte">${esc(data)}</span>
      <div class="pn-lista-prox">${prox.length ? prox.map(linha).join('') : '<span class="pn-sub">nada mais marcado hoje</span>'}</div></div>` };
  }
});

// ── AVISOS ─────────────────────────────────────────────────────────────────
pnDef('avisos', {
  nome: 'O Genesis te avisa', desc: 'Plantões, contas, atrasos, entregas — o que pede atenção agora', tams: ['m', 'q', 'a', 'l'], padrao: 'q',
  render(x) {
    if (typeof cfgAvisos === 'function' && !cfgAvisos().ligado) return { corpo: pnVazio('aviso', 'Os avisos estão desligados.', 'Ligar', "cfgAvisos().ligado = true; localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); pnRender()") };
    const lista = pnTenta(() => calcularAvisos(), []);
    const urg = lista.filter(a => a.prio === 1).length;
    const extra = lista.length ? `<span class="pn-conta ${urg ? 'perigo' : ''}" title="${urg ? urg + ' urgente(s)' : ''}">${lista.length}</span>` : '';
    if (!lista.length) return { extra, corpo: pnVazio('ok', 'Nada pendente agora.') };
    const max = x.tam === 'm' ? 2 : 99;
    return { extra, corpo: `<ul class="pn-lista">${lista.slice(0, max).map(a => `<li class="pn-li pr${a.prio}" onclick="${a.acao || ''}" title="${esc(a.texto)}"><i class="pn-bol"></i><span>${esc(a.texto)}</span></li>`).join('')}</ul>${lista.length > max ? `<span class="pn-mais">+${lista.length - max}</span>` : ''}` };
  }
});

// ── HOJE (linha do tempo) ─────────────────────────────────────────────────
function pnAbrirItemDia(kind, id) {
  if (kind === 'shift') { changeTab('home'); if (typeof editarPlantao === 'function') editarPlantao(id); }
  else if (kind === 'event') { changeTab('home'); if (typeof editarEvento === 'function') editarEvento(id); }
  else if (kind === 'task') { changeTab('tasks'); if (typeof editarTarefa === 'function') editarTarefa(id); }
}
pnDef('hoje', {
  nome: 'Hoje', desc: 'A linha do tempo do dia: plantões, compromissos e tarefas', tams: ['m', 'q', 'a', 'l'], padrao: 'q',
  render(x) {
    const hoje = hojeISO(), agora = pnAgoraHM();
    const itens = pnTenta(() => itensDoDia(hoje), []);
    const extra = x.previa ? '' : `<button type="button" class="pn-ico-bt" title="Novo compromisso hoje" onclick="abrirNovoRapido('${hoje}')">${ic('mais')}</button>`;
    if (!itens.length) return { extra, corpo: pnVazio('home', 'Dia livre na agenda.') };
    const comHora = itens.filter(i => i.time), semHora = itens.filter(i => !i.time);
    let marcou = false, html = '';
    comHora.forEach(i => {
      const passou = i.time < agora;
      if (!passou && !marcou) { marcou = true; html += `<li class="pn-agora"><span>${agora}</span></li>`; }
      const o = i.obj, cor = i.kind === 'shift' ? (typeof COR_PLANTAO !== 'undefined' ? COR_PLANTAO : '#f59e0b') : pnTenta(() => tipoEvento(o.type).cor, '#60a5fa');
      const titulo = i.kind === 'shift' ? `${o.desc || pnCap(vt().um)}` : o.title;
      const sub = i.kind === 'shift' && Number(o.amount) ? formatCurrency(Number(o.amount)) : '';
      html += `<li class="pn-tl ${passou ? 'passou' : ''}" style="--cor:${cor}" onclick="pnAbrirItemDia('${i.kind}', ${Number(o.id) || 0})"><b>${esc(i.time)}</b><span>${esc(titulo)}${sub ? ` <small>${esc(sub)}</small>` : ''}</span></li>`;
    });
    if (!marcou && comHora.length) html += `<li class="pn-agora"><span>${agora}</span></li>`;
    semHora.forEach(i => {
      const o = i.obj;
      if (i.kind === 'task') html += `<li class="pn-tl pn-tl-tarefa"><button type="button" class="pn-check" title="Concluir" onclick="event.stopPropagation(); pnConcluir(${Number(o.id) || 0}, this)"></button><span onclick="pnAbrirItemDia('task', ${Number(o.id) || 0})">${esc(o.text)}</span></li>`;
      else html += `<li class="pn-tl pn-tl-dia" onclick="pnAbrirItemDia('${i.kind}', ${Number(o.id) || 0})"><b>dia</b><span>${esc(i.kind === 'shift' ? (o.desc || vt().um) : o.title)}</span></li>`;
    });
    return { extra, corpo: `<ul class="pn-linha">${html}</ul>` };
  }
});

// ── ÁGUA (o exemplo dele de "proposta de clique") ───────────────────────────
let pnUltimoGole = 0;
function pnBeber(ml) {
  if (typeof beberAgua !== 'function') return;
  pnUltimoGole = ml > 0 ? Date.now() : 0;
  beberAgua(ml);
  if (ml < 0) toast('💧 Desfeito: −' + Math.abs(ml) + ' ml.', 2200);
  pnRender();
}
pnDef('agua', {
  nome: 'Água', area: 'health', desc: 'Toque no anel: +1 copo. Meta do dia e a semana', tams: ['p', 'm', 'q'], padrao: 'p',
  render(x) {
    if (typeof hydration === 'undefined') return { corpo: pnVazio('gota', 'Sem dados de água.') };
    const meta = hydration.goal || 2500, ml = hydration.date === hojeBR() ? (hydration.ml || 0) : 0, pct = ml / meta;
    const copos = Math.round(ml / 250), bateu = ml >= meta;
    const tamAnel = x.tam === 'p' ? 58 : x.tam === 'm' ? 70 : 104;
    const anel = `<button type="button" class="pn-agua-anel ${bateu ? 'bateu' : ''} ${Date.now() - pnUltimoGole < 900 ? 'gole' : ''}" ${x.previa ? '' : 'onclick="pnBeber(250)"'} title="Bebi um copo (+250 ml)">
      ${pnAnel(pct, 'agua' + (x.previa ? 'p' : x.inst.u), '#38bdf8', tamAnel, x.tam === 'q' ? 8 : 6)}
      <span class="pn-anel-meio"><b>${pnL(ml)}</b><small>${x.tam === 'p' ? 'L' : 'de ' + pnL(meta) + ' L'}</small></span><i class="pn-onda"></i></button>`;
    const extra = x.previa ? '' : `<button type="button" class="pn-ico-bt" title="Desfazer um copo (−250 ml)" onclick="pnBeber(-250)">${ic('menos')}</button>`;
    if (x.tam === 'p') return { extra, corpo: `<div class="pn-agua-p">${anel}</div>` };
    const botoes = x.previa ? '' : `<div class="pn-agua-bts"><button type="button" onclick="pnBeber(250)">${ic('gota')}<span>+ copo</span><small>250 ml</small></button><button type="button" onclick="pnBeber(500)">${ic('gota')}<span>+ garrafa</span><small>500 ml</small></button></div>`;
    const frase = bateu ? '<span class="pn-sub pn-ok">meta batida ✓</span>' : `<span class="pn-sub">faltam ${pnL(meta - ml)} L · ${copos} ${copos === 1 ? 'copo' : 'copos'} hoje</span>`;
    if (x.tam === 'm') return { extra, corpo: `<div class="pn-lado">${anel}<div class="pn-col">${frase}${botoes}</div></div>` };
    const dias = [];
    for (let k = 6; k >= 0; k--) { const iso = somaDias(hojeISO(), -k); const v = k === 0 ? ml : ((hydration.dias || {})[iso] || 0); dias.push({ iso, v }); }
    const barras = `<div class="pn-mini-barras">${dias.map(dd => `<span title="${isoParaBR(dd.iso)}: ${pnL(dd.v)} L"><i style="height:${Math.round(Math.min(1, dd.v / meta) * 100)}%" class="${dd.v >= meta ? 'bateu' : ''}"></i><small>${pnTenta(() => diaSemanaCurto(dd.iso).slice(0, 1), '')}</small></span>`).join('')}</div>`;
    return { extra, corpo: `<div class="pn-agua-q">${anel}<div class="pn-col">${frase}${botoes}${barras}</div></div>` };
  }
});

// ── SALDO DO MÊS ───────────────────────────────────────────────────────────
function pnMesFin() {
  const ym = hojeISO().slice(0, 7);
  const ts = pnTenta(() => finDoMes(ym, false), []);
  const soma = (l, t) => l.filter(x => x.type === t).reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const E = soma(ts, 'income'), S = soma(ts, 'expense');
  const pend = ts.filter(t => pnTenta(() => transacaoPendente(t), false));
  const cats = {};
  ts.filter(t => t.type === 'expense').forEach(t => { const c = t.category || 'Outros'; cats[c] = (cats[c] || 0) + (Number(t.amount) || 0); });
  return { ym, E, S, sobra: E - S, Ep: soma(pend, 'income'), Sp: soma(pend, 'expense'), cats: Object.entries(cats).sort((a, b) => b[1] - a[1]) };
}
pnDef('saldo', {
  nome: 'Saldo do mês', area: 'finances', desc: 'Quanto entrou, saiu e sobrou neste mês', tams: ['p', 'm', 'q'], padrao: 'p',
  render(x) {
    const f = pnMesFin(), mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    const grande = `<div class="pn-num ${f.sobra < 0 ? 'neg' : 'pos'}">${pnReais(f.sobra)}</div>`;
    if (x.tam === 'p') return { corpo: `${grande}<div class="pn-sub">sobra de ${esc(mes)}</div>${pnBarra(f.E ? f.S / f.E : 0, f.S > f.E ? 'var(--perigo)' : PN_COR.finances)}` };
    const max = Math.max(f.E, f.S, 1);
    const linhas = `<div class="pn-es"><span>entrou</span>${pnBarra(f.E / max, PN_COR.finances)}<b>${pnReais(f.E)}</b></div>
      <div class="pn-es"><span>saiu</span>${pnBarra(f.S / max, '#f87171')}<b>${pnReais(f.S)}</b></div>`;
    if (x.tam === 'm') return { corpo: `<div class="pn-lado"><div class="pn-col pn-col-num">${grande}<span class="pn-sub">sobra de ${esc(mes)}</span></div><div class="pn-col pn-cresce">${linhas}</div></div>` };
    const taxa = f.E > 0 ? Math.round((f.sobra / f.E) * 100) : 0;
    const totCat = f.cats.reduce((a, c) => a + c[1], 0) || 1;
    const cores = typeof FIN_CORES !== 'undefined' ? FIN_CORES : ['#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c'];
    const faixa = `<div class="pn-faixa">${f.cats.slice(0, 5).map((c, i) => `<i style="flex:${c[1] / totCat};background:${cores[i % cores.length]}" title="${esc(c[0])}: ${formatCurrency(c[1])}"></i>`).join('')}</div>`;
    const legenda = `<ul class="pn-legenda">${f.cats.slice(0, 4).map((c, i) => `<li><i style="background:${cores[i % cores.length]}"></i><span>${esc(c[0])}</span><b>${pnReais(c[1])}</b></li>`).join('')}</ul>`;
    return { extra: `<span class="pn-tag" title="Taxa de poupança: quanto da entrada sobrou">${taxa}% poupado</span>`,
      corpo: `<div class="pn-lado">${grande}<span class="pn-sub">sobra de ${esc(mes)}</span></div>${linhas}${f.cats.length ? `<span class="pn-sub pn-forte">para onde foi</span>${faixa}${legenda}` : ''}` };
  }
});

// ── CONTAS A PAGAR ─────────────────────────────────────────────────────────
function pnPagar(i) { if (typeof alternarEfetivado === 'function') alternarEfetivado(i); pnRender(); }
pnDef('contas', {
  nome: 'A pagar', area: 'finances', desc: 'Contas pendentes com baixa num toque', tams: ['m', 'q', 'a'], padrao: 'q',
  render(x) {
    const hoje = hojeISO(), dt = t => pnTenta(() => dataTransacao(t), t.date || '');
    const l = transactions.filter(t => t.type === 'expense' && pnTenta(() => transacaoPendente(t), false)).sort((a, b) => dt(a).localeCompare(dt(b)));
    const tot = l.reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const extra = l.length ? `<span class="pn-tag">${pnReais(tot)}</span>` : '';
    if (!l.length) return { corpo: pnVazio('ok', 'Nenhuma conta pendente.') };
    return { extra, corpo: `<ul class="pn-lista">${l.slice(0, x.tam === 'm' ? 2 : 12).map(t => `<li class="pn-li-conta ${dt(t) < hoje ? 'vencida' : dt(t) === hoje ? 'hoje' : ''}">
      <span class="pn-col"><b>${esc(t.desc || t.category || 'Conta')}</b><small>${dt(t) < hoje ? 'venceu ' : ''}${esc(pnTenta(() => rotuloData(dt(t)), dt(t)))}</small></span>
      <b class="pn-valor">${pnReais(t.amount)}</b>${x.previa ? '' : `<button type="button" class="pn-mini-bt" title="Paguei — dar baixa hoje (a data da conta não muda)" onclick="pnPagar(${transactions.indexOf(t)})">paguei</button>`}</li>`).join('')}</ul>` };
  }
});

// ── HÁBITOS ────────────────────────────────────────────────────────────────
let pnHabitoTocado = -1;
function pnHabito(i) { pnHabitoTocado = i; if (typeof toggleHabit === 'function') toggleHabit(i); pnRender(); }
pnDef('habitos', {
  nome: 'Hábitos de hoje', desc: 'Marque num toque; a chama conta os dias seguidos', tams: ['m', 'q', 'l'], padrao: 'm',
  render(x) {
    const hs = typeof habits !== 'undefined' ? habits : [];
    if (!hs.length) return { corpo: pnVazio('focus', 'Nenhum hábito ainda.', 'Criar', "changeTab('focus'); addNewHabit()") };
    const feitos = hs.filter(h => h.done).length;
    const extra = `<span class="pn-tag">${feitos}/${hs.length}</span>`;
    const chip = (h, i) => {
      const st = pnTenta(() => streakHabito(h), 0);
      return `<button type="button" class="pn-hab ${h.done ? 'on' : ''} ${i === pnHabitoTocado ? 'pop' : ''}" ${x.previa ? '' : `onclick="pnHabito(${i})"`} title="${esc(h.text)}${st > 1 ? ' · ' + st + ' dias seguidos' : ''}">
        <span class="pn-hab-ic">${h.done ? ic('ok') : esc(h.icon || '•')}</span><span class="pn-hab-txt">${esc(h.text)}</span>${st > 1 ? `<small class="pn-chama">🔥${st}</small>` : ''}</button>`;
    };
    pnHabitoTocadoLimpar();
    return { extra, corpo: `<div class="pn-habs ${x.tam !== 'm' ? 'grandes' : ''}">${hs.map(chip).join('')}</div>${x.tam !== 'm' ? pnBarra(feitos / hs.length, 'var(--acento)') : ''}` };
  }
});
function pnHabitoTocadoLimpar() { setTimeout(() => { pnHabitoTocado = -1; }, 0); }

// ── FOCO (pomodoro) ────────────────────────────────────────────────────────
function pnFoco(acao) {
  if (acao === 'play' && typeof startTimer === 'function') startTimer();
  else if (acao === 'pause' && typeof pauseTimer === 'function') pauseTimer();
  else if (acao === 'zerar' && typeof resetTimer === 'function') resetTimer();
  else if ((acao === 'foco' || acao === 'meditacao') && typeof alternarModoPomodoro === 'function') {
    const span = document.querySelector(`#pomodoro-modo span:nth-child(${acao === 'foco' ? 1 : 2})`);
    alternarModoPomodoro(acao, span);
  }
  pnRender();
}
function pnFocoEstado() {
  const dur = typeof pomodoroDuration !== 'undefined' ? pomodoroDuration : 3000;
  const resta = typeof timerTimeLeft !== 'undefined' ? timerTimeLeft : dur;
  const rodando = typeof timerInterval !== 'undefined' && !!timerInterval;
  const txt = (pnTenta(() => document.getElementById('timer-display').innerText, '') || '').trim() || '50:00';
  const modo = typeof pomodoroModo !== 'undefined' ? pomodoroModo : 'foco';
  return { dur, resta, rodando, txt, modo, pct: dur ? 1 - resta / dur : 0 };
}
pnDef('foco', {
  nome: 'Foco', desc: 'O pomodoro (e a meditação) direto no painel', tams: ['p', 'm', 'q'], padrao: 'm',
  render(x) {
    const f = pnFocoEstado(), cor = f.modo === 'meditacao' ? '#a78bfa' : 'var(--acento)';
    const bt = f.rodando
      ? `<button type="button" class="pn-play" title="Pausar" ${x.previa ? '' : `onclick="pnFoco('pause')"`}>${ic('pausa')}</button>`
      : `<button type="button" class="pn-play" title="Começar" ${x.previa ? '' : `onclick="pnFoco('play')"`}>${ic('play')}</button>`;
    const zerar = `<button type="button" class="pn-ico-bt" title="Zerar" ${x.previa ? '' : `onclick="pnFoco('zerar')"`}>${ic('zerar')}</button>`;
    const titulo = f.modo === 'meditacao' ? 'Meditação' : 'Foco';
    if (x.tam === 'p') return { titulo, corpo: `<div class="pn-foco-p"><span class="pn-num pn-foco-tempo">${esc(f.txt)}</span>${bt}</div>` };
    const anel = `<div class="pn-foco-anel">${pnAnel(f.pct, 'foco' + (x.previa ? 'p' : ''), cor, x.tam === 'q' ? 112 : 56, x.tam === 'q' ? 7 : 5)}<span class="pn-anel-meio pn-foco-tempo">${esc(f.txt)}</span></div>`;
    // M: tudo numa linha só (anel · estado · ▶) — empilhado, o ▶ saía cortado embaixo
    if (x.tam === 'm') return { titulo, extra: zerar, corpo: `<div class="pn-lado pn-meio">${anel}<span class="pn-sub pn-cresce">${f.rodando ? 'rodando…' : 'pronto para começar'}</span>${bt}</div>` };
    const estudo = typeof studyData !== 'undefined' && studyData.date === hojeBR() ? studyData.minutes || 0 : 0;
    return { titulo, extra: zerar, corpo: `<div class="pn-foco-q">${anel}<div class="pn-foco-ctl">${bt}
      <span class="pn-seg"><button type="button" class="${f.modo === 'foco' ? 'on' : ''}" ${x.previa ? '' : `onclick="pnFoco('foco')"`}>Foco</button><button type="button" class="${f.modo === 'meditacao' ? 'on' : ''}" ${x.previa ? '' : `onclick="pnFoco('meditacao')"`}>Meditação</button></span></div>
      <span class="pn-sub">estudo hoje: <b>${Math.floor(estudo / 60)}h ${estudo % 60}m</b></span></div>` };
  }
});

// ── TAREFAS (foco do dia + barra rápida) ───────────────────────────────────
let pnTarefaNova = 0;
function pnConcluir(id, btn) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const li = btn && btn.closest('li');
  if (li && !t.done) { li.classList.add('concluindo'); setTimeout(() => toggleTask(id), 380); return; }
  toggleTask(id);
}
function pnAbrirTarefa(id) { changeTab('tasks'); if (typeof editarTarefa === 'function') editarTarefa(id); }
function pnPreviaTarefa(inp) {
  const el = inp.closest('.pn-w').querySelector('.pn-previa'); if (!el) return;
  if (!inp.value.trim() || typeof tarEntender !== 'function') { el.innerHTML = ''; return; }
  const e = tarEntender(inp.value);
  el.innerHTML = `<b>${esc(e.text || '…')}</b>${e.due ? ` <span class="pn-tag">${esc(rotuloData(e.due))}</span>` : ''}${e.starred ? ' <span class="pn-tag">⭐</span>' : ''}${e.lista || e.listaNova ? ` <span class="pn-tag">#${esc(e.lista ? e.lista.name : e.listaNova)}</span>` : ''}`;
}
function pnAddTarefa(ev, form) {
  ev.preventDefault();
  const inp = form.querySelector('input'); const txt = (inp.value || '').trim(); if (!txt) return;
  const e = typeof tarEntender === 'function' ? tarEntender(txt) : { text: txt, due: '', starred: false, lista: null, listaNova: '' };
  if (!e.text) return;
  let list = typeof tarListaDestino === 'function' ? tarListaDestino(e) : 'padrao';
  if (e.listaNova) { const l = { id: 'l' + novoId(), name: e.listaNova }; tasklists.push(l); salvar('tasklists', tasklists); list = l.id; }
  const id = novoId();
  tasks.push({ id, text: e.text, done: false, createdAt: Date.now(), list, due: e.due, notes: '', starred: e.starred, subtasks: [] });
  pnTarefaNova = id;
  salvar('tasks', tasks);
  if (typeof tarAtualizarTudo === 'function') tarAtualizarTudo();
  toast(`✅ ${e.text.slice(0, 40)}${e.due ? ' · ' + rotuloData(e.due) : ''}`);
  pnRender();
  setTimeout(() => { const i = document.querySelector(`#pn .pn-w[data-u="${form.closest('.pn-w').dataset.u}"] .pn-add input`); if (i) i.focus(); }, 30);
}
pnDef('tarefas', {
  nome: 'Tarefas', area: 'tasks', desc: 'O que fazer primeiro, com a barra rápida ("pagar DAS sexta !")', tams: ['m', 'q', 'a', 'l'], padrao: 'q',
  render(x) {
    const hoje = hojeISO();
    const fila = pnTenta(() => tarFila(), (tasks || []).filter(t => !t.done));
    const feitasHoje = (tasks || []).filter(t => t.done && t.doneAt && String(t.doneAt).slice(0, 10) === hoje).length;
    const extra = `<span class="pn-tag" title="Concluídas hoje">${feitasHoje} ✓</span>`;
    const barra = x.previa || x.tam === 'm' ? '' : `<form class="pn-add" onsubmit="pnAddTarefa(event, this)"><input type="text" placeholder="Nova tarefa — ex.: pagar DAS sexta !" oninput="pnPreviaTarefa(this)" aria-label="Nova tarefa"><button type="submit" title="Adicionar">${ic('mais')}</button></form><div class="pn-previa"></div>`;
    const novaId = pnTarefaNova; setTimeout(() => { pnTarefaNova = 0; }, 0);
    const linha = t => {
      const cls = t.due && t.due < hoje ? 'atras' : t.due === hoje ? 'hoje' : '';
      return `<li class="pn-tar ${cls} ${t.id === novaId ? 'nova' : ''}"><button type="button" class="pn-check" title="Concluir" ${x.previa ? '' : `onclick="pnConcluir(${t.id}, this)"`}></button>
        <span class="pn-tar-txt" ${x.previa ? '' : `onclick="pnAbrirTarefa(${t.id})"`}>${t.starred ? '<i class="pn-estrela">★</i>' : ''}${esc(t.text)}</span>${t.due ? `<small>${esc(pnTenta(() => rotuloData(t.due), ''))}</small>` : ''}</li>`;
    };
    const max = x.tam === 'm' ? 2 : x.tam === 'q' ? 5 : 14;
    const nova = novaId ? fila.find(t => t.id === novaId) : null;
    const mostrar = nova && fila.indexOf(nova) >= max ? [nova, ...fila.slice(0, max - 1)] : fila.slice(0, max);
    if (!fila.length) return { extra, corpo: `${barra}${pnVazio('ok', 'Nada pendente. Dia limpo!')}` };
    return { extra, corpo: `${barra}<ul class="pn-lista pn-tars">${mostrar.map(linha).join('')}</ul>${fila.length > mostrar.length ? `<button type="button" class="pn-mais" onclick="changeTab('tasks')">+${fila.length - mostrar.length} na fila</button>` : ''}` };
  }
});

// ── PRÓXIMO PLANTÃO / TRABALHO ─────────────────────────────────────────────
pnDef('plantao', {
  nome: 'Próximo plantão', area: 'home', desc: 'O próximo trabalho e quanto falta receber', tams: ['p', 'm', 'q'], padrao: 'p',
  render(x) {
    const hoje = hojeISO(), agora = pnAgoraHM(), V = pnTenta(() => vt(), { um: 'plantão', muitos: 'plantões' });
    const sh = typeof shifts !== 'undefined' ? shifts : [];
    const prox = sh.filter(s => s.date > hoje || (s.date === hoje && (s.time || '23:59') >= agora)).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const rec = sh.filter(s => !s.paid && s.date < hoje), totRec = rec.reduce((a, s) => a + (Number(s.amount) || 0), 0);
    const titulo = 'Próximo ' + V.um;
    const p = prox[0];
    const quando = p ? `${pnTenta(() => rotuloData(p.date), p.date)}${p.time ? ' · ' + p.time : ''}` : '';
    const receber = totRec ? `<span class="pn-sub">a receber <b>${pnReais(totRec)}</b> · ${rec.length}</span>` : '<span class="pn-sub">tudo recebido ✓</span>';
    if (!p) return { titulo, corpo: `${pnVazio('home', 'Nenhum ' + V.um + ' marcado.')}${x.tam !== 'p' ? receber : ''}` };
    // P: data numa linha, hora e local na outra (numa linha só, "07:00" saía cortado em "07:0")
    if (x.tam === 'p') return { titulo, corpo: `<div class="pn-num pn-num-s">${esc(pnTenta(() => rotuloData(p.date), p.date))}</div><div class="pn-sub pn-forte pn-quebra">${p.time ? `<b>${esc(p.time)}</b> · ` : ''}${esc(p.desc || '')}</div>` };
    if (x.tam === 'm') return { titulo, corpo: `<div class="pn-lado"><div class="pn-col"><span class="pn-num pn-num-s">${esc(quando)}</span><span class="pn-sub">${esc(p.desc || '')}${Number(p.amount) ? ' · ' + formatCurrency(Number(p.amount)) : ''}</span></div><div class="pn-col pn-dir">${receber}</div></div>` };
    return { titulo, corpo: `<ul class="pn-lista">${prox.slice(0, 4).map(s => `<li class="pn-li-turno" onclick="pnAbrirItemDia('shift', ${Number(s.id) || 0})"><b>${esc(pnTenta(() => rotuloData(s.date), s.date))}${s.time ? ' · ' + esc(s.time) : ''}</b><span>${esc(s.desc || '')}</span><small>${Number(s.amount) ? formatCurrency(Number(s.amount)) : ''}</small></li>`).join('')}</ul>${receber}` };
  }
});

// ── PRÓXIMA VIAGEM ─────────────────────────────────────────────────────────
function pnAbrirViagem(id) { changeTab('trips'); if (typeof viagemAberta !== 'undefined' && viagemAberta !== id && typeof abrirViagem === 'function') abrirViagem(id); }
pnDef('viagem', {
  nome: 'Próxima viagem', area: 'trips', desc: 'Contagem regressiva e a mala', tams: ['p', 'm', 'q'], padrao: 'p',
  render(x) {
    const hoje = hojeISO();
    const v = (typeof trips !== 'undefined' ? trips : []).filter(t => t.inicio && t.inicio >= hoje && t.status !== 'feita').sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
    if (!v) return { corpo: pnVazio('trips', 'Nenhuma viagem marcada.') };
    const dias = pnTenta(() => diffDias(hoje, v.inicio), 0);
    const mala = v.mala || [], prontos = mala.filter(m => m.done).length;
    const cont = dias === 0 ? '<div class="pn-num pn-num-s">é hoje!</div>' : `<div class="pn-num">${dias}<small>${dias === 1 ? 'dia' : 'dias'}</small></div>`;
    const abrir = x.previa ? '' : `onclick="pnAbrirViagem(${Number(v.id) || 0})"`;
    if (x.tam === 'p') return { corpo: `<div class="pn-clicavel" ${abrir}>${cont}<div class="pn-sub pn-quebra">${esc(v.destino || 'Viagem')}</div></div>` };
    const datas = `${isoParaBR(v.inicio).slice(0, 5)}${v.fim ? ' – ' + isoParaBR(v.fim).slice(0, 5) : ''}`;
    const malaHtml = mala.length ? `<span class="pn-sub">mala ${prontos}/${mala.length}</span>${pnBarra(prontos / mala.length, PN_COR.trips)}` : '<span class="pn-sub">mala ainda vazia</span>';
    if (x.tam === 'm') return { corpo: `<div class="pn-lado pn-clicavel" ${abrir}>${cont}<div class="pn-col pn-cresce"><b class="pn-quebra">${esc(v.destino || 'Viagem')}</b><span class="pn-sub">${datas}</span>${malaHtml}</div></div>` };
    const faltam = mala.filter(m => !m.done).slice(0, 5);
    return { corpo: `<div class="pn-lado pn-clicavel" ${abrir}>${cont}<div class="pn-col pn-cresce"><b class="pn-quebra">${esc(v.destino || 'Viagem')}</b><span class="pn-sub">${datas}</span></div></div>${malaHtml}
      ${faltam.length ? `<ul class="pn-lista pn-lista-mini">${faltam.map(m => `<li><i class="pn-bol"></i><span>${esc(m.text || m.item || m.nome || '')}</span></li>`).join('')}</ul>` : ''}` };
  }
});

// ── A SEMANA e O MÊS ───────────────────────────────────────────────────────
function pnCorItem(it) {
  if (it.kind === 'shift') return typeof COR_PLANTAO !== 'undefined' ? COR_PLANTAO : '#f59e0b';
  if (it.kind === 'task') return typeof COR_TAREFA !== 'undefined' ? COR_TAREFA : '#38bdf8';
  return pnTenta(() => tipoEvento(it.obj.type).cor, '#60a5fa');
}
function pnAbrirDia(iso) { const [y, m, d] = iso.split('-').map(Number); if (typeof openDayModal === 'function') openDayModal(y, m, d); }
pnDef('semana', {
  nome: 'A semana', area: 'home', desc: 'Os próximos 7 dias de relance', tams: ['m', 'l', 'g'], padrao: 'l',
  render(x) {
    const hoje = hojeISO(), dias = [];
    for (let k = 0; k < 7; k++) dias.push(somaDias(hoje, k));
    const col = iso => {
      const its = pnTenta(() => itensDoDia(iso), []);
      const nome = pnTenta(() => diaSemanaCurto(iso), '');
      const titulos = x.tam === 'm' ? '' : `<ul>${its.slice(0, x.tam === 'g' ? 6 : 3).map(it => `<li style="--cor:${pnCorItem(it)}"><span>${esc(it.time ? it.time + ' ' : '')}${esc(it.kind === 'shift' ? (it.obj.desc || vt().um) : it.kind === 'task' ? it.obj.text : it.obj.title)}</span></li>`).join('')}${its.length > (x.tam === 'g' ? 6 : 3) ? `<li class="pn-mais">+${its.length - (x.tam === 'g' ? 6 : 3)}</li>` : ''}</ul>`;
      return `<button type="button" class="pn-dia ${iso === hoje ? 'hoje' : ''}" ${x.previa ? '' : `onclick="pnAbrirDia('${iso}')"`}>
        <span class="pn-dia-cab"><small>${esc(nome)}</small><b>${Number(iso.slice(8))}</b></span>
        <span class="pn-pontos">${its.slice(0, 6).map(it => `<i style="background:${pnCorItem(it)}"></i>`).join('')}</span>${titulos}</button>`;
    };
    return { corpo: `<div class="pn-semana">${dias.map(col).join('')}</div>` };
  }
});
pnDef('mes', {
  nome: 'O mês', area: 'home', desc: 'Calendário do mês com o que tem em cada dia', tams: ['q', 'l'], padrao: 'q',
  render(x) {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth(), hoje = hojeISO();
    const primeiro = new Date(y, m, 1).getDay(), ult = new Date(y, m + 1, 0).getDate();
    let cel = '';
    for (let i = 0; i < primeiro; i++) cel += '<span class="pn-mes-v"></span>';
    for (let dd = 1; dd <= ult; dd++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      const its = pnTenta(() => itensDoDia(iso), []);
      cel += `<button type="button" class="pn-mes-d ${iso === hoje ? 'hoje' : ''} ${iso < hoje ? 'passou' : ''}" ${x.previa ? '' : `onclick="pnAbrirDia('${iso}')"`} title="${its.length ? its.length + ' item(ns)' : ''}"><b>${dd}</b><span>${its.slice(0, 3).map(it => `<i style="background:${pnCorItem(it)}"></i>`).join('')}</span></button>`;
    }
    const nomeM = pnCap(d.toLocaleDateString('pt-BR', { month: 'long' }));
    return { titulo: nomeM, corpo: `<div class="pn-mes"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>${cel}</div>` };
  }
});

// ── OBRA DO DIA e FRASE ────────────────────────────────────────────────────
let pnObra = null, pnObraCarregando = false;
function pnCarregarObra(forcar) {
  if (pnObraCarregando || typeof carregarObraDoDia !== 'function') return;
  pnObraCarregando = true;
  Promise.resolve(carregarObraDoDia(forcar)).then(o => { pnObra = o || null; }).catch(e => { console.warn('Obra do dia:', e); pnObra = { erro: true }; })
    .finally(() => { pnObraCarregando = false; pnRender(); });
}
pnDef('obra', {
  nome: 'Obra do dia', desc: 'Uma obra de arte por dia, com a história dela', tams: ['q', 'l', 'g'], padrao: 'q',
  render(x) {
    if (typeof cfgArte === 'function' && !cfgArte().ligado) return { corpo: pnVazio('foto', 'A obra do dia está desligada.', 'Ligar', "cfgArte().ligado = true; localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); pnObra = null; pnRender()") };
    if (x.previa) return { corpo: `<div class="pn-obra pn-obra-previa">${ic('foto')}</div>` };
    if (!pnObra) { pnCarregarObra(false); return { corpo: '<div class="pn-obra pn-carregando"></div>' }; }
    if (pnObra.erro) return { corpo: pnVazio('foto', 'Sem internet para a obra de hoje.', 'Tentar de novo', 'pnCarregarObra(true)') };
    const o = pnObra;
    const extra = `<button type="button" class="pn-ico-bt" title="Ver outra" onclick="pnCarregarObra(true)">${ic('girar')}</button>`;
    const sobre = x.tam !== 'q' && o.sobre ? `<p class="pn-obra-sobre">${esc(o.sobre)}</p>` : '';
    return { extra, corpo: `<div class="pn-obra-wrap ${x.tam}"><a class="pn-obra" href="${esc(o.link || '#')}" target="_blank" rel="noopener" title="Ver no ${esc(o.fonte || 'site')}"><img src="${esc(o.img)}" alt="${esc(o.titulo)}" loading="lazy" onerror="this.parentElement.classList.add('erro')"></a>
      <div class="pn-obra-txt"><b>${esc(o.titulo)}</b><small>${esc(o.autor || '')}${o.ano ? ' · ' + esc(String(o.ano)) : ''}</small>${sobre}</div></div>` };
  }
});
let pnFrase = '';
function pnOutraFrase() {
  const l = pnTenta(() => FRASES_PERIODO[periodoDoDia()], []);
  if (!l.length) return;
  let f = pnFrase; for (let k = 0; k < 8 && f === pnFrase; k++) f = l[Math.floor(Math.random() * l.length)];
  pnFrase = f; pnRender();
}
pnDef('frase', {
  nome: 'Frase do dia', desc: 'Uma frase para o momento do dia', tams: ['m', 'q', 'l'], padrao: 'm',
  render(x) {
    const f = pnFrase || pnTenta(() => fraseDoDia(), '');
    return { extra: x.previa ? '' : `<button type="button" class="pn-ico-bt" title="Outra frase" onclick="pnOutraFrase()">${ic('girar')}</button>`, corpo: `<blockquote class="pn-frase">${esc(f)}</blockquote>` };
  }
});

// ── PROGRESSO DO DIA ───────────────────────────────────────────────────────
pnDef('progresso', {
  nome: 'Progresso do dia', desc: 'Hábitos e tarefas de hoje num anel só', tams: ['p', 'm'], padrao: 'p',
  render(x) {
    const hoje = hojeISO(), hs = typeof habits !== 'undefined' ? habits : [];
    const tHoje = (tasks || []).filter(t => t.due === hoje || (t.done && t.doneAt && String(t.doneAt).slice(0, 10) === hoje));
    const tot = hs.length + tHoje.length, feitos = hs.filter(h => h.done).length + tHoje.filter(t => t.done).length;
    const pct = tot ? feitos / tot : 0;
    const anel = `<div class="pn-foco-anel">${pnAnel(pct, 'prog' + (x.previa ? 'p' : ''), 'var(--ok)', x.tam === 'p' ? 58 : 66, 6)}<span class="pn-anel-meio"><b>${Math.round(pct * 100)}%</b></span></div>`;
    if (x.tam === 'p') return { corpo: `<div class="pn-agua-p">${anel}</div>` };
    return { corpo: `<div class="pn-lado">${anel}<div class="pn-col"><span class="pn-sub pn-forte">${feitos} de ${tot} feitos</span><span class="pn-sub">${hs.filter(h => !h.done).length} hábitos · ${tHoje.filter(t => !t.done).length} tarefas faltando</span></div></div>` };
  }
});

// ── ESTUDO ─────────────────────────────────────────────────────────────────
pnDef('estudo', {
  nome: 'Estudo', area: 'studies', desc: 'Minutos de hoje e da semana; começa o foco num toque', tams: ['p', 'm', 'q'], padrao: 'm',
  render(x) {
    const sd = typeof studyData !== 'undefined' ? studyData : { minutes: 0, dias: {} };
    const hojeMin = sd.date === hojeBR() ? sd.minutes || 0 : 0;
    const fmt = m => `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
    const grande = `<div class="pn-num">${fmt(hojeMin)}</div>`;
    if (x.tam === 'p') return { corpo: `${grande}<div class="pn-sub">estudados hoje</div>` };
    const dias = []; for (let k = 6; k >= 0; k--) { const iso = somaDias(hojeISO(), -k); dias.push({ iso, v: k === 0 ? hojeMin : (sd.dias || {})[iso] || 0 }); }
    const max = Math.max(30, ...dias.map(d => d.v));
    const barras = `<div class="pn-mini-barras">${dias.map(d => `<span title="${isoParaBR(d.iso)}: ${fmt(d.v)}"><i style="height:${Math.round(d.v / max * 100)}%;background:${PN_COR.studies}"></i><small>${pnTenta(() => diaSemanaCurto(d.iso).slice(0, 1), '')}</small></span>`).join('')}</div>`;
    const bt = x.previa ? '' : `<button type="button" class="pn-mini-bt" onclick="pnFoco('play')">${ic('play')} focar</button>`;
    if (x.tam === 'm') return { corpo: `<div class="pn-lado"><div class="pn-col pn-col-num">${grande}<span class="pn-sub">hoje</span></div>${barras}</div>` };
    const sem = dias.reduce((a, d) => a + d.v, 0);
    return { extra: bt, corpo: `<div class="pn-lado"><div class="pn-col pn-col-num">${grande}<span class="pn-sub">hoje · ${fmt(sem)} na semana</span></div></div>${barras}` };
  }
});

// ── LISTA (compras, mercado…) ──────────────────────────────────────────────
function pnNotaDaLista(inst) {
  const ns = (typeof notes !== 'undefined' ? notes : []).filter(n => !n.archived && Array.isArray(n.checklist));
  if (inst.c && inst.c.nota) { const n = ns.find(x => x.id === inst.c.nota); if (n) return n; }
  return ns.find(n => /compra|mercado|feira|supermerc/i.test(n.title || '')) || ns.find(n => n.pinned) || ns[0] || null;
}
function pnItemLista(id, k) { if (typeof toggleItemNota === 'function') toggleItemNota(id, k); pnRender(); }
function pnAddItemLista(ev, id, form) {
  ev.preventDefault();
  const inp = form.querySelector('input'), v = (inp.value || '').trim(); if (!v) return;
  const n = notes.find(x => x.id === id); if (!n) return;
  if (!Array.isArray(n.checklist)) n.checklist = [];
  n.checklist.push({ text: v, done: false, nivel: 0 }); n.updatedAt = Date.now();
  salvar('notes', notes); if (typeof renderNotes === 'function') renderNotes();
  pnRender();
  setTimeout(() => { const i = document.querySelector(`#pn .pn-w[data-u="${form.closest('.pn-w').dataset.u}"] .pn-add input`); if (i) i.focus(); }, 30);
}
pnDef('lista', {
  nome: 'Lista', area: 'notes', desc: 'Uma lista das Notas (compras, mercado…) para marcar e acrescentar', tams: ['q', 'a', 'm'], padrao: 'q',
  opcoes(inst) {
    const ns = (typeof notes !== 'undefined' ? notes : []).filter(n => !n.archived && Array.isArray(n.checklist));
    if (ns.length < 2) return '';
    const atual = pnNotaDaLista(inst);
    return `<select class="pn-ed-sel" title="Qual lista" onchange="pnOpcao('${inst.u}', 'nota', Number(this.value))">${ns.map(n => `<option value="${n.id}" ${atual && atual.id === n.id ? 'selected' : ''}>${esc(n.title || 'Lista')}</option>`).join('')}</select>`;
  },
  render(x) {
    const n = pnNotaDaLista(x.inst);
    if (!n) return { corpo: pnVazio('notes', 'Nenhuma lista nas Notas ainda.', 'Criar nas Notas', "changeTab('notes')") };
    const its = n.checklist.map((it, k) => ({ it, k })).sort((a, b) => (a.it.done === b.it.done ? a.k - b.k : a.it.done ? 1 : -1));
    const abertos = its.filter(o => !o.it.done).length;
    const add = x.previa ? '' : `<form class="pn-add" onsubmit="pnAddItemLista(event, ${n.id}, this)"><input type="text" placeholder="＋ item" aria-label="Novo item"></form>`;
    return { titulo: n.title || 'Lista', extra: `<span class="pn-tag">${abertos} abertos</span>`,
      corpo: `${add}<ul class="pn-lista pn-checks">${its.map(o => `<li class="${o.it.done ? 'feito' : ''}" ${x.previa ? '' : `onclick="pnItemLista(${n.id}, ${o.k})"`}><i class="pn-check ${o.it.done ? 'on' : ''}"></i><span>${esc(o.it.text)}</span></li>`).join('')}</ul>` };
  }
});

// ── ENTREGAS ───────────────────────────────────────────────────────────────
pnDef('entregas', {
  nome: 'Entregas', area: 'notes', desc: 'Compras a caminho e a previsão de cada uma', tams: ['m', 'q'], padrao: 'q',
  render(x) {
    const hoje = hojeISO(), os = (typeof orders !== 'undefined' ? orders : []).filter(o => o.status !== 'entregue').sort((a, b) => (a.eta || '9').localeCompare(b.eta || '9'));
    if (!os.length) return { corpo: pnVazio('ok', 'Nada a caminho.') };
    return { extra: `<span class="pn-tag">${os.length}</span>`, corpo: `<ul class="pn-lista">${os.slice(0, x.tam === 'm' ? 2 : 8).map(o => `<li class="pn-li-conta ${o.eta && o.eta < hoje ? 'vencida' : o.eta === hoje ? 'hoje' : ''}" onclick="changeTab('notes'); if (typeof verSecaoNotas === 'function') verSecaoNotas('entregas')">
      <span class="pn-col"><b>${esc(o.item || 'Pedido')}</b><small>${o.eta ? (o.eta < hoje ? 'atrasada · ' : '') + esc(pnTenta(() => rotuloData(o.eta), o.eta)) : 'sem previsão'}${o.loja ? ' · ' + esc(o.loja) : ''}</small></span></li>`).join('')}</ul>` };
  }
});

// ── REDE: aniversários e retomar contato ───────────────────────────────────
function pnAbrirContato(id) { changeTab('net'); if (typeof rdAbrir === 'function') rdAbrir(id); }
pnDef('aniversarios', {
  nome: 'Aniversários', area: 'net', desc: 'Quem faz aniversário nos próximos 30 dias', tams: ['m', 'q'], padrao: 'm',
  render(x) {
    const l = pnTenta(() => aniversariosProximos(30), []);
    if (!l.length) return { corpo: pnVazio('net', 'Nenhum aniversário nos próximos 30 dias.') };
    return { corpo: `<ul class="pn-lista">${l.slice(0, x.tam === 'm' ? 2 : 7).map(a => `<li class="pn-li-pessoa" ${x.previa ? '' : `onclick="pnAbrirContato(${Number(a.c.id) || 0})"`}><span class="pn-av" style="--h:${(String(a.c.nome).length * 47) % 360}">${esc(String(a.c.nome || '?').charAt(0))}</span>
      <span class="pn-col"><b>${esc(a.c.nome)}</b><small>${a.dias === 0 ? 'hoje 🎂' : a.dias === 1 ? 'amanhã' : 'em ' + a.dias + ' dias'} · ${esc(isoParaBR(a.iso).slice(0, 5))}${a.idade ? ' · ' + a.idade + ' anos' : ''}</small></span></li>`).join('')}</ul>` };
  }
});
function pnFalei(id) { if (typeof faleiCom === 'function') faleiCom(id); pnRender(); }
pnDef('contato', {
  nome: 'Retomar contato', area: 'net', desc: 'Quem está esperando notícia sua', tams: ['m', 'q'], padrao: 'm',
  render(x) {
    const l = (typeof contacts !== 'undefined' ? contacts : []).filter(c => pnTenta(() => precisaFalar(c), false));
    if (!l.length) return { corpo: pnVazio('ok', 'Ninguém esperando.') };
    return { extra: `<span class="pn-tag">${l.length}</span>`, corpo: `<ul class="pn-lista">${l.slice(0, x.tam === 'm' ? 2 : 7).map(c => `<li class="pn-li-pessoa"><span class="pn-av" style="--h:${(String(c.nome).length * 47) % 360}">${esc(String(c.nome || '?').charAt(0))}</span>
      <span class="pn-col" ${x.previa ? '' : `onclick="pnAbrirContato(${Number(c.id) || 0})"`}><b>${esc(c.nome)}</b><small>${esc(pnTenta(() => rdHa(c), ''))}${c.papel ? ' · ' + esc(c.papel) : ''}</small></span>
      ${x.previa ? '' : `<button type="button" class="pn-mini-bt" title="Marcar que falei hoje" onclick="pnFalei(${Number(c.id) || 0})">falei</button>`}</li>`).join('')}</ul>` };
  }
});

// ── INVENTÁRIO e CARTEIRA ──────────────────────────────────────────────────
pnDef('patrimonio', {
  nome: 'Inventário', area: 'inventory', desc: 'O valor dos seus bens e os mais raros', tams: ['p', 'm', 'q'], padrao: 'm',
  render(x) {
    const inv = typeof inventario !== 'undefined' ? inventario : [];
    if (!inv.length) return { corpo: pnVazio('inventory', 'Mochila vazia.') };
    const v = it => pnTenta(() => invValorTotal(it), 0);
    const tot = inv.reduce((a, it) => a + v(it), 0);
    const top = [...inv].sort((a, b) => v(b) - v(a));
    const grande = `<div class="pn-num">${pnReais(tot)}</div>`;
    if (x.tam === 'p') return { corpo: `${grande}<div class="pn-sub">${inv.length} itens</div>` };
    const linha = it => { const r = pnTenta(() => invRaridade(it), null); return `<li style="--cor:${r ? r.cor : 'var(--txt4)'}"><i class="pn-bol"></i><span>${esc((it.ic ? it.ic + ' ' : '') + (it.nome || ''))}</span><b>${pnReais(v(it))}</b></li>`; };
    if (x.tam === 'm') return { corpo: `<div class="pn-lado"><div class="pn-col pn-col-num">${grande}<span class="pn-sub">${inv.length} itens</span></div><ul class="pn-lista pn-lista-mini pn-cresce">${top.slice(0, 2).map(linha).join('')}</ul></div>` };
    return { corpo: `<div class="pn-lado">${grande}<span class="pn-sub">${inv.length} itens</span></div><ul class="pn-lista pn-lista-raro">${top.slice(0, 6).map(linha).join('')}</ul>` };
  }
});
pnDef('carteira', {
  nome: 'Carteira', area: 'business', desc: 'O total investido e os maiores ativos', tams: ['p', 'm', 'q'], padrao: 'm',
  render(x) {
    const as = typeof assets !== 'undefined' ? assets : [];
    if (!as.length) return { corpo: pnVazio('business', 'Carteira vazia.') };
    const val = a => Number(a.current) || 0, tot = as.reduce((s, a) => s + val(a), 0);
    const grande = `<div class="pn-num">${pnReais(tot)}</div>`;
    if (x.tam === 'p') return { corpo: `${grande}<div class="pn-sub">${as.length} ativos</div>` };
    const top = [...as].sort((a, b) => val(b) - val(a)).slice(0, x.tam === 'm' ? 2 : 6);
    const lista = `<ul class="pn-lista pn-lista-mini pn-cresce">${top.map(a => `<li><span>${esc(a.name || '')}</span>${pnBarra(tot ? val(a) / tot : 0, PN_COR.business)}<b>${Math.round(tot ? val(a) / tot * 100 : 0)}%</b></li>`).join('')}</ul>`;
    if (x.tam === 'm') return { corpo: `<div class="pn-lado"><div class="pn-col pn-col-num">${grande}<span class="pn-sub">${as.length} ativos</span></div>${lista}</div>` };
    return { corpo: `<div class="pn-lado">${grande}<span class="pn-sub">${as.length} ativos</span></div>${lista}` };
  }
});

// ── FOTO DE CAPA (a floresta virou widget, decisão dele em 09/10) ──────────
pnDef('capa', {
  nome: 'Foto de capa', desc: 'A foto do topo, agora onde e do tamanho que você quiser', tams: ['m', 'q', 'l', 'g'], padrao: 'l', semTopo: true,
  render(x) {
    const url = pnTenta(() => urlDaCapa(), '');
    if (!url) return { corpo: pnVazio('foto', 'Sem foto de capa.', 'Escolher', "changeTab('settings')") };
    return { corpo: `<div class="pn-capa" style="background-image:url('${esc(url)}')"><span>${esc(pnTenta(() => saudacaoCurta(), '').replace(/<[^>]+>/g, ''))}</span></div>` };
  }
});

// ── SETOR DE QUALQUER ABA (o "qualquer nicho") ─────────────────────────────
const pnSetorAcoes = {};
function pnAbrirSetor(u, i) { const a = pnSetorAcoes[u]; if (a && typeof a[i] === 'function') a[i](); }
pnDef('setor', {
  nome: 'Setor', desc: 'Qualquer setor de qualquer aba', tams: ['m', 'q', 'a'], padrao: 'q', generico: true,
  render(x) {
    const c = x.inst.c || {}, area = c.a || 'tasks';
    const ss = pnTenta(() => setoresDaArea(area), []);
    const s = ss.find(z => z.nome === c.s) || ss[0];
    const titulo = `${pnTenta(() => nomeAba(area), area)} · ${s ? s.nome : ''}`;
    if (!s) return { titulo, corpo: pnVazio(area, 'Setor não encontrado.') };
    const acoes = pnSetorAcoes[x.inst.u] = [];
    const max = x.tam === 'm' ? 2 : x.tam === 'q' ? 6 : 14;
    if (!s.itens.length) return { titulo, corpo: pnVazio('ok', pnCap(s.vazio || 'nada aqui agora') + '.') };
    const li = (it, i) => { acoes[i] = it.abrir; return `<li class="pn-li pu${it.urg || 0}" ${x.previa ? '' : `onclick="pnAbrirSetor('${x.inst.u}', ${i})"`}><i class="pn-bol"></i><span>${esc(it.nome)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</li>`; };
    acoes.abrirTudo = s.abrir;
    return { titulo, extra: `<span class="pn-tag">${s.itens.length}</span>`,
      corpo: `<ul class="pn-lista">${s.itens.slice(0, max).map(li).join('')}</ul>${s.itens.length > max ? `<button type="button" class="pn-mais" ${x.previa ? '' : `onclick="pnAbrirSetor('${x.inst.u}', 'abrirTudo')"`}>+${s.itens.length - max}</button>` : ''}` };
  }
});

// ───────────────────────────── a grade ─────────────────────────────────────
let pnEditando = false, pnCols = 6, pnSujo = false;
function pnColunas(largura) {
  const n = Math.floor((largura + PN_VAO) / (PN_MIN_COL + PN_VAO));
  return Math.max(2, Math.min(12, n - (n % 2)));
}
function pnTamValido(inst) {
  const d = PN_W[inst.t]; if (!d) return 'm';
  return d.tams.includes(inst.s) ? inst.s : d.padrao;
}
function pnHtmlWidget(inst) {
  const d = PN_W[inst.t]; if (!d) return '';
  const s = pnTamValido(inst), T = PN_TAM[s];
  const c = Math.min(T.c, pnCols), l = T.l;
  const area = d.generico ? ((inst.c || {}).a || 'focus') : d.area;
  let r;
  try { r = d.render({ inst, tam: s, c, l }) || {}; }
  catch (e) { console.warn('Painel · widget ' + inst.t + ':', e); r = { corpo: pnVazio('aviso', 'Não deu para mostrar este widget agora.') }; }
  if (typeof r === 'string') r = { corpo: r };
  const titulo = r.titulo || d.nome;
  const navegar = area !== 'focus' ? `onclick="changeTab('${area}')" title="Abrir ${esc(pnTenta(() => nomeAba(area), area))}"` : '';
  // modo editar, como na tela inicial do celular: alça num canto, ✕ no outro, tamanhos
  // numa pílula embaixo — o conteúdo continua à vista no meio. As setas são para o
  // toque (no mouse, arrasta-se o widget inteiro).
  const ed = pnEditando ? `<button type="button" class="pn-alca" title="Arrastar para mudar de lugar">${ic('alca')}</button>
    <button type="button" class="pn-tirar" title="Tirar do painel" onclick="pnTirar('${inst.u}')">${ic('fechar')}</button>
    <div class="pn-ed">
      <span class="pn-ed-setas"><button type="button" title="Mover para trás" onclick="pnMover('${inst.u}', -1)">${ic('esq')}</button></span>
      <span class="pn-ed-tams">${d.tams.slice().sort((a, b) => PN_ORDEM_TAM.indexOf(a) - PN_ORDEM_TAM.indexOf(b)).map(t => `<button type="button" class="${t === s ? 'on' : ''}" title="${PN_TAM[t].nome}" onclick="pnTamanho('${inst.u}', '${t}')">${t.toUpperCase()}</button>`).join('')}</span>
      ${d.opcoes ? d.opcoes(inst) : ''}
      <span class="pn-ed-setas"><button type="button" title="Mover para a frente" onclick="pnMover('${inst.u}', 1)">${ic('dir')}</button></span>
    </div><span class="pn-canto" title="Puxe para mudar o tamanho">${ic('canto')}</span>` : '';
  return `<section class="pn-w pn-s-${s} ${d.semTopo ? 'sem-topo' : ''}" data-u="${inst.u}" data-t="${inst.t}" style="--c:${c};--l:${l};--cor:${PN_COR[area] || 'var(--acento)'}">
    ${d.semTopo ? '' : `<header class="pn-w-topo"><span class="pn-w-rot" ${navegar}><i class="pn-ponto"></i><span>${esc(titulo)}</span></span><span class="pn-w-extra">${r.extra || ''}</span></header>`}
    <div class="pn-w-corpo">${r.corpo || ''}</div>${ed}</section>`;
}
function pnRender() {
  const pn = document.getElementById('pn'); if (!pn) return;
  // um redesenho direto já está em dia: cancela o agendado pelo salvar(), que cortaria a animação
  clearTimeout(pnTimer);
  // não redesenha por cima de quem está digitando num widget (o texto se perderia)
  const ae = document.activeElement;
  if (ae && pn.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.value) { pnSujo = true; return; }
  if (!pn.offsetParent && !document.querySelector('#focus.active')) { pnSujo = true; return; }
  pnSujo = false;
  const larg = pn.clientWidth || (document.querySelector('.container') || document.body).clientWidth;
  pnCols = pnColunas(larg);
  pn.style.setProperty('--pn-cols', pnCols);
  pn.classList.toggle('editando', pnEditando);
  const c = cfgPainel();
  pn.classList.toggle('compacto', !!c.compacto);
  pn.innerHTML = c.itens.map(pnHtmlWidget).join('') +
    (pnEditando ? `<button type="button" class="pn-novo" onclick="pnAbrirCatalogo()">${ic('mais')}<span>Adicionar widget</span></button>` : '') +
    (!c.itens.length && !pnEditando ? `<div class="pn-vazio-todo">${ic('focus')}<b>Seu painel está vazio.</b><span>Escolha o que quer ver aqui o dia todo.</span><button type="button" class="pn-mini-bt" onclick="pnAbrirCatalogo()">＋ Adicionar widgets</button></div>` : '');
  pnDepois(pn);
  pnBotoesCabecalho();
}
/** Depois de desenhar: anéis animam do valor velho ao novo; arraste no modo editar. */
function pnDepois(raiz) {
  const aneis = raiz.querySelectorAll('.pn-anel-valor[data-para]');
  requestAnimationFrame(() => requestAnimationFrame(() => aneis.forEach(a => { a.style.strokeDashoffset = a.dataset.para; })));
  if (raiz.id === 'pn') pnCaber(raiz);
  if (pnEditando && raiz.id === 'pn') pnLigarArraste(raiz);
}
/** "Nada de texto cortado" (pedido dele no esboço): lista que não cabe inteira
 *  esconde os itens do fim (na linha do tempo, primeiro os que já passaram) e
 *  mostra "+N". Tocar no "+N" mostra tudo ali mesmo, com rolagem. Nenhum item
 *  fica pela metade na borda do widget. */
function pnCaber(raiz) {
  raiz.querySelectorAll('.pn-w-corpo').forEach(corpo => {
    if (corpo.classList.contains('rolando') || corpo.scrollHeight <= corpo.clientHeight + 1) return;
    const lista = [...corpo.querySelectorAll(':scope > .pn-lista, :scope > .pn-linha')].pop(); if (!lista) return;
    const itens = [...lista.children].filter(li => !li.classList.contains('pn-agora'));
    if (itens.length < 2) return;
    let mais = corpo.querySelector(':scope > .pn-mais');
    const base = mais ? Number((mais.textContent.match(/\+(\d+)/) || [0, 0])[1]) : 0;
    if (!mais) {
      mais = document.createElement('button'); mais.type = 'button'; mais.className = 'pn-mais';
      mais.onclick = ev => { ev.stopPropagation(); itens.forEach(li => { li.hidden = false; }); corpo.classList.add('rolando'); mais.remove(); };
      corpo.appendChild(mais);
    }
    const ordem = [...itens.filter(li => li.classList.contains('passou')), ...itens.filter(li => !li.classList.contains('passou')).reverse()];
    let n = 0;
    for (const li of ordem) {
      if (corpo.scrollHeight <= corpo.clientHeight + 1 || itens.length - n <= 1) break;
      li.hidden = true; n++;
      mais.textContent = `+${base + n} ${base ? 'na fila' : 'mais'}`;
    }
    if (!n && !base) mais.remove();
  });
  // texto corrido (a frase): a letra diminui até caber inteira, sem cortar a última linha
  raiz.querySelectorAll('.pn-frase').forEach(el => {
    const corpo = el.closest('.pn-w-corpo'); if (!corpo) return;
    let fs = parseFloat(getComputedStyle(el).fontSize) || 15;
    while (corpo.scrollHeight > corpo.clientHeight + 1 && fs > 11) { fs -= 0.5; el.style.fontSize = fs + 'px'; }
  });
  // os dias da semana: mesmo cuidado, dentro de cada coluna
  raiz.querySelectorAll('.pn-dia ul').forEach(ul => {
    if (ul.scrollHeight <= ul.clientHeight + 1) return;
    const lis = [...ul.children].filter(li => !li.classList.contains('pn-mais'));
    let mais = ul.querySelector('.pn-mais');
    const base = mais ? Number((mais.textContent.match(/\+(\d+)/) || [0, 0])[1]) : 0;
    if (!mais) { mais = document.createElement('li'); mais.className = 'pn-mais'; ul.appendChild(mais); }
    let n = 0;
    for (let k = lis.length - 1; k >= 0 && ul.scrollHeight > ul.clientHeight + 1; k--) { lis[k].hidden = true; n++; mais.textContent = `+${base + n}`; }
    if (!n && !base) mais.remove();
  });
}
let pnTimer = null;
function pnAgendar() { clearTimeout(pnTimer); pnTimer = setTimeout(() => { if (document.querySelector('#focus.active')) pnRender(); else pnSujo = true; }, 140); }

// ───────────────────────────── editar ──────────────────────────────────────
function pnEditar(ligar) {
  pnEditando = ligar === undefined ? !pnEditando : !!ligar;
  if (!pnEditando) pnGravar();
  pnRender();
  if (pnEditando) toast('Modo editar: arraste os widgets, troque o tamanho (P M Q A L G) ou tire com ✕.', 4500);
}
function pnInst(u) { return cfgPainel().itens.find(i => i.u === u); }
function pnTamanho(u, s) { const i = pnInst(u); if (!i) return; i.s = s; pnGravar(); pnRenderAnimado(); }
function pnMover(u, dir) {
  const l = cfgPainel().itens, k = l.findIndex(i => i.u === u), j = k + dir;
  if (k < 0 || j < 0 || j >= l.length) return;
  [l[k], l[j]] = [l[j], l[k]]; pnGravar(); pnRenderAnimado();
}
let pnTirado = null;
function pnTirar(u) {
  const l = cfgPainel().itens, k = l.findIndex(i => i.u === u); if (k < 0) return;
  pnTirado = { inst: l[k], k }; l.splice(k, 1); pnGravar(); pnRenderAnimado();
  const d = PN_W[pnTirado.inst.t];
  toast(`"${d ? d.nome : 'Widget'}" saiu do painel. Para voltar: ＋ Adicionar.`, 4000);
}
function pnOpcao(u, k, v) { const i = pnInst(u); if (!i) return; i.c = Object.assign({}, i.c || {}, { [k]: v }); pnGravar(); pnRender(); }
/** Redesenha com FLIP: cada widget desliza da posição velha para a nova. */
function pnRenderAnimado() {
  const pn = document.getElementById('pn'); if (!pn) return pnRender();
  const antes = {};
  pn.querySelectorAll('.pn-w').forEach(w => { antes[w.dataset.u] = w.getBoundingClientRect(); });
  pnRender();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  pn.querySelectorAll('.pn-w').forEach(w => {
    const a = antes[w.dataset.u]; if (!a) { w.classList.add('pn-entrou'); return; }
    const b = w.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    w.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  });
}

// ── arrastar (mouse: o widget inteiro; toque: só a alça — armadilha nº 20) ──
function pnLigarArraste(pn) {
  pn.querySelectorAll('.pn-w').forEach(w => {
    w.addEventListener('pointerdown', e => {
      if (!pnEditando || e.button > 0) return;
      if (e.target.closest('.pn-canto')) return pnIniciarEsticar(e, w);
      const naAlca = !!e.target.closest('.pn-alca');
      if (!naAlca && e.target.closest('button, select, input, a')) return;
      if (e.pointerType !== 'mouse' && !naAlca) return;
      pnIniciarArraste(e, w);
    });
  });
}
function pnIniciarArraste(e, w) {
  e.preventDefault();
  const pn = document.getElementById('pn'), r = w.getBoundingClientRect();
  const fantasma = w.cloneNode(true);
  fantasma.classList.add('pn-fantasma');
  Object.assign(fantasma.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(fantasma);
  w.classList.add('pn-vaga');
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  const rolador = document.querySelector('body[data-casca="nova"] > .container') || document.scrollingElement;
  let ultimo = 0, rolar = 0, raf = 0;
  const passo = () => { if (rolar) { rolador.scrollTop += rolar; raf = requestAnimationFrame(passo); } else raf = 0; };
  const mover = ev => {
    fantasma.style.transform = `translate(${ev.clientX - dx - r.left}px, ${ev.clientY - dy - r.top}px) rotate(1.2deg)`;
    const rr = rolador.getBoundingClientRect ? rolador.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    rolar = ev.clientY < rr.top + 60 ? -10 : ev.clientY > rr.bottom - 60 ? 10 : 0;
    if (rolar && !raf) raf = requestAnimationFrame(passo);
    if (Date.now() - ultimo < 60) return; ultimo = Date.now();
    fantasma.style.visibility = 'hidden';
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    fantasma.style.visibility = '';
    const sobre = el && el.closest('#pn .pn-w');
    if (!sobre || sobre === w) return;
    const lista = [...pn.querySelectorAll('.pn-w')];
    const antes = {}; lista.forEach(x => { antes[x.dataset.u] = x.getBoundingClientRect(); });
    if (lista.indexOf(w) > lista.indexOf(sobre)) pn.insertBefore(w, sobre); else pn.insertBefore(w, sobre.nextSibling);
    lista.forEach(x => {
      if (x === w) return;
      const a = antes[x.dataset.u], b = x.getBoundingClientRect();
      if (a.left !== b.left || a.top !== b.top) x.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
    });
  };
  const soltar = () => {
    window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
    rolar = 0; fantasma.remove(); w.classList.remove('pn-vaga');
    const ordem = [...pn.querySelectorAll('.pn-w')].map(x => x.dataset.u);
    const c = cfgPainel(); c.itens.sort((a, b) => ordem.indexOf(a.u) - ordem.indexOf(b.u));
    pnGravar(); pnRender();
  };
  window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
}
/** O canto: puxar muda o tamanho, sempre para um dos tamanhos que o widget aceita. */
function pnIniciarEsticar(e, w) {
  e.preventDefault(); e.stopPropagation();
  const inst = pnInst(w.dataset.u), d = inst && PN_W[inst.t]; if (!d) return;
  const pn = document.getElementById('pn'), est = getComputedStyle(pn), r = w.getBoundingClientRect();
  const gap = parseFloat(est.columnGap) || PN_VAO, u = parseFloat(est.gridAutoRows) || 100;
  const colW = (pn.clientWidth - gap * (pnCols - 1)) / pnCols;
  w.classList.add('pn-esticando');
  const mover = ev => {
    const querC = Math.max(1, Math.round((ev.clientX - r.left + gap) / (colW + gap)));
    const querL = Math.max(1, Math.round((ev.clientY - r.top + gap) / (u + gap)));
    const melhor = d.tams.map(t => ({ t, dist: Math.abs(Math.min(PN_TAM[t].c, pnCols) - querC) * 2 + Math.abs(PN_TAM[t].l - querL) })).sort((a, b) => a.dist - b.dist)[0];
    if (melhor && melhor.t !== pnTamValido(inst)) { inst.s = melhor.t; pnRenderAnimado(); w = document.querySelector(`#pn .pn-w[data-u="${inst.u}"]`) || w; w.classList.add('pn-esticando'); }
  };
  const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); pnGravar(); pnRender(); };
  window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
}

// ───────────────────────────── o catálogo ──────────────────────────────────
let pnCatArea = 'todas', pnCatBusca = '';
/** Tudo que dá para pôr no painel: os widgets próprios + um "setor" para cada setor de cada aba. */
function pnCatalogo() {
  const itens = Object.values(PN_W).filter(d => !d.generico).map(d => ({ t: d.t, nome: d.nome, desc: d.desc, area: d.area, d }));
  const areas = pnTenta(() => areasNucleo(), []);
  areas.forEach(a => pnTenta(() => setoresDaArea(a), []).forEach(s => {
    if (s.nome === 'Abrir a área') return;
    itens.push({ t: 'setor', c: { a, s: s.nome }, nome: s.nome, desc: `Lista de ${pnTenta(() => nomeAba(a), a)}: ${s.nome.toLowerCase()}`, area: a, d: PN_W.setor });
  }));
  return itens;
}
function pnAbrirCatalogo() {
  let m = document.getElementById('pn-cat');
  if (!m) {
    m = document.createElement('div'); m.id = 'pn-cat'; m.className = 'pn-cat';
    m.innerHTML = `<div class="pn-cat-folha" role="dialog" aria-label="Adicionar ao painel">
      <header class="pn-cat-topo"><b>Adicionar ao painel</b><input type="search" placeholder="Procurar widget…" oninput="pnCatBusca = this.value; pnRenderCatalogo()" aria-label="Procurar widget">
        <button type="button" class="pn-ico-bt" title="Fechar" onclick="pnFecharCatalogo()">${ic('fechar')}</button></header>
      <nav class="pn-cat-areas"></nav><div class="pn-cat-grade"></div></div>`;
    m.addEventListener('click', e => { if (e.target === m) pnFecharCatalogo(); });
    document.body.appendChild(m);
  }
  m.hidden = false; document.body.classList.add('pn-cat-aberto');
  pnRenderCatalogo();
  setTimeout(() => { const i = m.querySelector('input'); if (i && matchMedia('(hover: hover)').matches) i.focus(); }, 60);
}
function pnFecharCatalogo() { const m = document.getElementById('pn-cat'); if (m) m.hidden = true; document.body.classList.remove('pn-cat-aberto'); }
function pnRenderCatalogo() {
  const m = document.getElementById('pn-cat'); if (!m) return;
  const todos = pnCatalogo();
  const areas = ['todas', 'focus', ...new Set(todos.map(i => i.area).filter(a => a !== 'focus'))];
  m.querySelector('.pn-cat-areas').innerHTML = areas.map(a => `<button type="button" class="${a === pnCatArea ? 'on' : ''}" style="--cor:${PN_COR[a] || 'var(--txt3)'}" onclick="pnCatArea = '${a}'; pnRenderCatalogo()">${a === 'todas' ? 'Todas' : a === 'focus' ? 'Painel' : esc(pnTenta(() => nomeAba(a), a))}</button>`).join('');
  const q = (pnCatBusca || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sem = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lista = todos.filter(i => (pnCatArea === 'todas' || i.area === pnCatArea) && (!q || sem(i.nome + ' ' + i.desc).includes(q)));
  const noPainel = cfgPainel().itens;
  pnCatItens = lista;
  m.querySelector('.pn-cat-grade').innerHTML = lista.length ? lista.map((i, k) => {
    const s = i.d.padrao, T = PN_TAM[s];
    const inst = { u: 'prev' + k, t: i.t, s, c: i.c };
    let previa = '';
    try { const r = i.d.render({ inst, tam: s, c: Math.min(T.c, 4), l: T.l, previa: true }) || {}; previa = (typeof r === 'string' ? r : r.corpo) || ''; } catch (e) { previa = ''; }
    const ja = noPainel.some(n => n.t === i.t && (i.t !== 'setor' || ((n.c || {}).a === i.c.a && (n.c || {}).s === i.c.s)));
    return `<article class="pn-cat-item" style="--cor:${PN_COR[i.area] || 'var(--acento)'}">
      <div class="pn-cat-previa pn-s-${s}" style="--c:${T.c};--l:${T.l}" onclick="pnAdicionar(${k})"><div class="pn-w-corpo">${previa}</div></div>
      <div class="pn-cat-info"><b><i class="pn-ponto"></i>${esc(i.nome)}${ja ? ' <small class="pn-ja">no painel ✓</small>' : ''}</b><small>${esc(i.desc || '')}</small>
        <span class="pn-cat-tams">${i.d.tams.slice().sort((a, b) => PN_ORDEM_TAM.indexOf(a) - PN_ORDEM_TAM.indexOf(b)).map(t => `<button type="button" title="Adicionar ${PN_TAM[t].nome.toLowerCase()}" onclick="pnAdicionar(${k}, '${t}')">${t.toUpperCase()}</button>`).join('')}</span></div></article>`;
  }).join('') : '<p class="pn-sub" style="padding:16px">Nada com esse nome.</p>';
}
let pnCatItens = [];
function pnAdicionar(k, s) {
  const i = pnCatItens[k]; if (!i) return;
  const inst = { u: 'w' + novoId(), t: i.t, s: s || i.d.padrao };
  if (i.c) inst.c = Object.assign({}, i.c);
  cfgPainel().itens.push(inst); pnGravar();
  pnFecharCatalogo();
  if (!document.querySelector('#focus.active')) changeTab('focus');
  pnRenderAnimado();
  setTimeout(() => { const w = document.querySelector(`#pn .pn-w[data-u="${inst.u}"]`); if (w) { w.scrollIntoView({ behavior: 'smooth', block: 'center' }); w.classList.add('pn-entrou'); } }, 60);
  toast(`＋ "${i.nome}" no painel.`, 2500);
}

// ───────────────────────────── cabeçalho e montagem ────────────────────────
function pnBotoesCabecalho() {
  const acoes = document.querySelector('#focus > .cs-hero .cs-acoes'); if (!acoes) return;
  let ed = acoes.querySelector('.pn-bt-editar');
  if (!ed) {
    ed = document.createElement('button'); ed.type = 'button'; ed.className = 'cs-acao pn-bt-editar'; ed.onclick = () => pnEditar();
    const add = document.createElement('button'); add.type = 'button'; add.className = 'cs-acao pn-bt-add'; add.onclick = pnAbrirCatalogo;
    add.innerHTML = ic('mais') + '<span>Widget</span>'; add.title = 'Adicionar um widget de qualquer aba';
    acoes.insertBefore(add, acoes.firstChild); acoes.insertBefore(ed, acoes.firstChild);
  }
  ed.innerHTML = pnEditando ? ic('ok') + '<span>Pronto</span>' : ic('lapis') + '<span>Editar painel</span>';
  ed.classList.toggle('on', pnEditando);
  ed.title = pnEditando ? 'Terminar de arrumar' : 'Arrastar, mudar o tamanho, tirar e pôr widgets';
}
function pnMontar() {
  const sec = document.getElementById('focus'); if (!sec || document.getElementById('pn')) return;
  // as peças antigas vão, na mesma ordem, para um compartimento escondido (ver o topo do arquivo)
  const legado = document.createElement('div'); legado.id = 'pn-legado';
  [...sec.children].forEach(el => { if (!el.classList.contains('cs-hero') && !el.classList.contains('aba-cfg-btn') && !el.classList.contains('aba-dev-btn')) legado.appendChild(el); });
  const pn = document.createElement('div'); pn.id = 'pn'; pn.className = 'pn';
  sec.appendChild(pn); sec.appendChild(legado);
  sec.classList.add('pn-novo');
  if (typeof ResizeObserver === 'function') {
    let ultimo = 0;
    new ResizeObserver(() => { const w = pn.clientWidth; if (!w || Math.abs(w - ultimo) < 2) return; ultimo = w; if (pnColunas(w) !== pnCols) pnRender(); }).observe(pn);
  }
}

// ───────────────────────────── ganchos ─────────────────────────────────────
if (typeof salvar === 'function') {
  const _salvarPn = salvar;
  salvar = function (...a) { const r = _salvarPn.apply(this, a); pnAgendar(); return r; };
}
if (typeof redesenharTudo === 'function') {
  const _rtPn = redesenharTudo;
  redesenharTudo = function () { _rtPn(); pnAgendar(); };
}
if (typeof changeTab === 'function') {
  const _ctPn = changeTab;
  changeTab = function (...a) {
    const r = _ctPn.apply(this, a);
    if (a[0] === 'focus') setTimeout(pnRender, 0);
    else { if (pnEditando) { pnEditando = false; pnGravar(); } pnFecharCatalogo(); }
    return r;
  };
}
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const m = document.getElementById('pn-cat');
  if (m && !m.hidden) { pnFecharCatalogo(); e.stopImmediatePropagation(); }
  else if (pnEditando) { pnEditar(false); e.stopImmediatePropagation(); }
});
/** O relógio e o foco andam sozinhos; o resto renova a cada minuto ("agora", avisos). */
let pnFocoRodava = null;
setInterval(() => {
  if (document.hidden || !document.querySelector('#focus.active') || !document.getElementById('pn')) return;
  const d = new Date();
  document.querySelectorAll('#pn .pn-hora').forEach(e => { e.textContent = pnHora(d); });
  const f = pnFocoEstado();
  document.querySelectorAll('#pn .pn-foco-tempo').forEach(e => { e.textContent = f.txt; });
  document.querySelectorAll('#pn .pn-w[data-t="foco"] .pn-anel-valor').forEach(a => { a.style.strokeDashoffset = (Number(a.dataset.c) * (1 - f.pct)).toFixed(1); });
  if (pnFocoRodava !== null && pnFocoRodava !== f.rodando && !pnEditando) pnRender();
  pnFocoRodava = f.rodando;
  if (d.getSeconds() === 0 && !pnEditando) pnRender();
}, 1000);

// ───────────────────────────── o ⚙ do Painel (G2) ──────────────────────────
if (typeof CFG_ABA_EXTRA !== 'undefined') CFG_ABA_EXTRA['btn-focus'] = () => {
  const c = cfgPainel(), arte = typeof cfgArte === 'function' ? cfgArte() : null;
  return `<h4 class="dev-titulo">O Painel</h4>
    <div class="pf-botoes"><button class="mini-btn" onclick="fecharConfigAba(); changeTab('focus'); pnEditar(true)">✎ Editar o painel</button><button class="mini-btn" onclick="fecharConfigAba(); pnAbrirCatalogo()">＋ Adicionar widget</button><button class="mini-btn" onclick="pnRestaurar()">↺ Painel de fábrica</button></div>
    <label class="check-line" style="margin-top:8px"><input type="checkbox" ${c.compacto ? 'checked' : ''} onchange="cfgPainel().compacto = this.checked; pnGravar(); pnRender()"> Widgets mais baixos (cabe mais na tela sem rolar)</label>
    ${arte ? `<label class="check-line"><input type="checkbox" ${arte.ligado ? 'checked' : ''} onchange="cfgArte().ligado = this.checked; localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); pnObra = null; pnRender()"> Obra do dia (busca a imagem na internet)</label>` : ''}
    <p class="hint" style="margin-top:4px">${c.itens.length} widgets. A arrumação do Painel vale só neste aparelho — o PC e o celular podem ter painéis diferentes.</p>`;
};

// ───────────────────────────── partida ─────────────────────────────────────
pnMontar();
pnRender();
if (typeof atualizarBotaoConfigAba === 'function') atualizarBotaoConfigAba();   // os ícones ⚙ e 🛠 nasceram aqui
