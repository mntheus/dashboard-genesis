// ════════════════════════════════════════════════════════════════════════════
// FINANÇAS — O PAINEL VISUAL, A ANÁLISE E O EXTRATO DO BANCO (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Queixa antiga dele: "pouco visível, pouco moderno, não centralizado, não
// bonito". Proposta aprovada em 08/10, cada assunto com a sua cara:
//   • o RIO do mês — o dinheiro entrando pelas fontes e se dividindo nas
//     categorias de gasto e no que sobrou (toque num braço do rio);
//   • o CALENDÁRIO como mapa de calor dos gastos, com o que vence e o que
//     entra marcado nos dias (toque num dia);
//   • o ORÇAMENTO em potes que enchem (e transbordam em vermelho);
//   • a FILA do que entra e sai, com baixa num toque;
//   • a linha viva de 12 meses, o ponteiro da TAXA DE POUPANÇA e a previsão
//     de como o mês fecha.
// E o pedido dele para fazer SEMANALMENTE: importar o EXTRATO do banco (CSV ou
// OFX), lido no próprio aparelho — nada sai daqui —, com a categoria sugerida,
// conferência antes de gravar, sem duplicar, e dando BAIXA no que já estava
// lançado como pendente (o plantão a receber, a conta a pagar).
//
// Regra do dinheiro (CLAUDE.md): `date` = quando o fato aconteceu; `paidAt` =
// quando o dinheiro andou. Dar baixa pelo extrato NUNCA muda o `date`.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const finEstado = { dia: '', rio: '', extrato: null, extratoFiltro: 'tudo' };
const FIN_SECOES = ['painel', 'lancamentos', 'orcamento', 'recorrentes', 'analise'];
let financasSecao = 'painel';

// ───────────────────────────── utilidades ─────────────────────────────────
function finDoMes(ym, efetivadoSo) {
  return transactions.filter(t => dataTransacao(t).startsWith(ym) && (!efetivadoSo || !transacaoPendente(t)));
}
function finSoma(lista, tipo) { return lista.filter(t => t.type === tipo).reduce((a, t) => a + (Number(t.amount) || 0), 0); }
function finCompacto(v) { return typeof ngCompacto === 'function' ? ngCompacto(v) : Math.round(v).toString(); }
function finMesAtual() { return finModo === 'mes' ? finMonth : hojeISO().slice(0, 7); }
const FIN_CORES = ['#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#2dd4bf', '#f87171', '#60a5fa', '#c084fc'];

// ═════════════════════════════ 1. O RIO DO MÊS ════════════════════════════
/** As fontes (receitas por categoria) à esquerda, os destinos (despesas por
 *  categoria + o que sobrou) à direita, ligados por faixas proporcionais. O que
 *  ainda está pendente entra também, mais claro — o plantão a receber é dinheiro
 *  do mês, só não chegou. */
// F1 (09/10, ditado dele: "o rio do mês mais moderno, mais minimalista"): desenhado na LARGURA REAL
// (antes nascia com 340 px e era esticado — na tela larga as letras inchavam), faixas finas, rótulos
// do lado de fora com nome e valor, as colunas dizem o que são e a parte clara de cada barra é o que
// ainda não caiu na conta (o plantão a receber é dinheiro do mês, só não chegou).
function finRio(ym, L) {
  // nem espremido (celular dividido) nem um fio de 1500 px (ultrawide): acima de 980 o desenho fica no meio
  L = Math.min(980, Math.max(220, Math.round(L || 340)));
  const ts = finDoMes(ym, false);
  const agrupa = (tipo, max, total) => {
    const m = {}; ts.filter(t => t.type === tipo).forEach(t => { const c = t.category || 'Outros'; m[c] = m[c] || { v: 0, pend: 0 }; m[c].v += Number(t.amount) || 0; if (transacaoPendente(t)) m[c].pend += Number(t.amount) || 0; });
    let l = Object.entries(m).map(([c, x]) => ({ c, v: x.v, pend: x.pend })).sort((a, b) => b.v - a.v);
    // as miudezas (menos de 4% do mês) viram "Outras": um fio de 1 px não se lê
    const corte = l.findIndex((x, i) => i >= max - 1 || (i >= 2 && x.v < total * 0.04));
    if (corte > 0 && corte < l.length - 1) { const resto = l.slice(corte); l = l.slice(0, corte); l.push({ c: 'Outras', v: resto.reduce((a, x) => a + x.v, 0), pend: resto.reduce((a, x) => a + x.pend, 0), varias: resto.map(x => x.c) }); }
    return l;
  };
  const E0 = finSoma(ts, 'income'), S0 = finSoma(ts, 'expense'), T0 = Math.max(E0, S0);
  const ent = agrupa('income', 4, T0), sai = agrupa('expense', 5, T0);
  const E = ent.reduce((a, x) => a + x.v, 0), S = sai.reduce((a, x) => a + x.v, 0);
  if (!E && !S) return '<div class="sp-vazio">Nenhum lançamento neste mês ainda.</div>';
  const sobra = E - S;
  if (sobra > 0) sai.push({ c: 'Sobrou', v: sobra, pend: 0, sobra: true });
  else if (sobra < 0) ent.push({ c: 'Faltou', v: -sobra, pend: 0, falta: true });
  const tot = Math.max(E, S), n = Math.max(ent.length, sai.length);
  const estreito = L < 400, minusculo = L < 300, nomeMax = minusculo ? 9 : estreito ? 11 : 18;
  const corta = s => s.length > nomeMax ? s.slice(0, nomeMax - 1) + '…' : s;
  // colunas: rótulos | barra | rio | tronco | rio | barra | rótulos
  const labE = minusculo ? 68 : estreito ? 84 : 118, labS = minusculo ? 80 : estreito ? 96 : 140;
  const xE = labE, xS = L - labS, xT = (xE + xS) / 2, wB = 3;
  const cab = 18, top = cab + 8, gap = 9;
  const A = Math.round(Math.max(150, Math.min(280, top + n * 34 + 6)));
  const alt = A - top - 4;
  const escala = (alt - gap * (n - 1)) / tot;
  const pilha = l => { const hs = l.map(x => Math.max(2, x.v * escala)); const soma = hs.reduce((a, h) => a + h, 0) + gap * (l.length - 1); let y = top + Math.max(0, (alt - soma) / 2); return l.map((x, i) => { const o = { ...x, y, h: hs[i] }; y += hs[i] + gap; return o; }); };
  const P = pilha(ent), Q = pilha(sai);
  const tronco = { y: top + (alt - tot * escala) / 2, h: tot * escala };
  const cE = (p, i) => p.falta ? 'var(--perigo)' : FIN_CORES[i % FIN_CORES.length];
  const cS = (q, i) => q.sobra ? 'var(--ok)' : FIN_CORES[(i + 3) % FIN_CORES.length];
  // curva "mais reta" (pedido dele): a dobra fica perto das pontas e o meio vira uma diagonal limpa
  const DOBRA = 0.26;
  const a1 = xE + wB + (xT - xE - wB) * DOBRA, b1 = xT - (xT - xE - wB) * DOBRA;
  const a2 = xT + (xS - xT) * DOBRA, b2 = xS - (xS - xT) * DOBRA;
  let html = `<text class="fin-rio-col" x="${xE - 8}" y="11" text-anchor="end">ENTROU</text>
    <text class="fin-rio-col" x="${xT}" y="11" text-anchor="middle">O MÊS</text>
    <text class="fin-rio-col" x="${xS + 8}" y="11">PARA ONDE FOI</text>`;
  // barra de cada ponta: cheia = já caiu na conta; clara = ainda vai cair
  const barra = (x, o, cor, extra) => {
    const hp = o.v ? Math.min(o.h, o.h * (o.pend || 0) / o.v) : 0;
    return `<rect x="${x}" y="${o.y}" width="${wB}" height="${o.h}" rx="1.5" class="fin-rio-no claro" style="fill:${cor}"${extra || ''}/>` +
      (o.h - hp > 0.5 ? `<rect x="${x}" y="${o.y + hp}" width="${wB}" height="${o.h - hp}" rx="1.5" class="fin-rio-no" style="fill:${cor}"${extra || ''}/>` : '');
  };
  let yT = tronco.y;
  P.forEach((p, i) => {
    const cor = cE(p, i), h = p.v * escala;
    html += `<path class="fin-rio-faixa${p.pend && p.pend >= p.v ? ' pend' : ''}" d="M${xE + wB} ${p.y} C${a1} ${p.y}, ${b1} ${yT}, ${xT} ${yT} L${xT} ${yT + h} C${b1} ${yT + h}, ${a1} ${p.y + p.h}, ${xE + wB} ${p.y + p.h} Z" style="fill:${cor}"><title>${esc(p.c)}: ${formatCurrency(p.v)}${p.pend ? ` (${formatCurrency(p.pend)} ainda a receber)` : ''}</title></path>`;
    html += barra(xE, p, cor);
    yT += h;
  });
  yT = tronco.y;
  Q.forEach((q, i) => {
    const cor = cS(q, i), h = q.v * escala, k = `'${i}'`, toque = ` onclick="finTocarRio(${k})"`;
    html += `<path class="fin-rio-faixa saida${q.pend && q.pend >= q.v ? ' pend' : ''}${finEstado.rio === String(i) ? ' sel' : ''}"${toque} d="M${xT} ${yT} C${a2} ${yT}, ${b2} ${q.y}, ${xS} ${q.y} L${xS} ${q.y + q.h} C${b2} ${q.y + q.h}, ${a2} ${yT + h}, ${xT} ${yT + h} Z" style="fill:${cor}"><title>${esc(q.c)}: ${formatCurrency(q.v)}${q.pend ? ` (${formatCurrency(q.pend)} ainda a pagar)` : ''}</title></path>`;
    html += barra(xS, q, cor, toque);
    yT += h;
  });
  html += `<rect class="fin-rio-tronco" x="${xT - 1}" y="${tronco.y}" width="2" height="${tronco.h}" rx="1"/>`;
  // rótulos do lado de fora; quando dois ficam perto demais, o de baixo desce (nunca um sobre o outro)
  let fundo = 0;
  const rotulos = (lista, x, anc, lado) => {
    let ult = -99;
    lista.forEach((o, i) => {
      // nome e valor em duas linhas quando há altura; a 2ª linha fica 15 px abaixo (com 13 as caixas encostavam)
      const dois = o.h >= 22 || n <= 3, alto = dois ? 27 : 13;
      let y = Math.max(o.y + o.h / 2 - alto / 2 + 10, ult + 4 + 10); ult = y + alto - 10;
      const pct = lado === 's' && E ? ` · ${Math.round(o.v / E * 100)}%` : '';
      const sel = lado === 's' && finEstado.rio === String(i) ? ' sel' : '';
      const toque = lado === 's' ? ` onclick="finTocarRio('${i}')"` : '';
      html += dois
        ? `<text class="fin-rio-rot${sel}" x="${x}" y="${y}" text-anchor="${anc}"${toque}>${esc(corta(o.c))}</text><text class="fin-rio-val" x="${x}" y="${y + 15}" text-anchor="${anc}"${toque}>${finCompacto(o.v)}${pct}</text>`
        : `<text class="fin-rio-rot${sel}" x="${x}" y="${y}" text-anchor="${anc}"${toque}>${esc(corta(o.c))} <tspan class="fin-rio-val">${finCompacto(o.v)}</tspan></text>`;
    });
    fundo = Math.max(fundo, ult);
  };
  rotulos(P, xE - 8, 'end', 'e');
  rotulos(Q, xS + wB + 8, 'start', 's');
  finEstado.rioDados = Q;
  const AT = Math.ceil(Math.max(A, fundo + 4));   // o último rótulo empurrado não sai do desenho
  return `<svg class="fin-rio" viewBox="0 0 ${L} ${AT}" width="${L}" height="${AT}" role="img" aria-label="Para onde foi o dinheiro do mês">${html}</svg>
    <div class="fin-rio-leg"><span><i></i>já caiu na conta</span><span><i class="claro"></i>ainda vai cair (a receber · a pagar)</span></div>`;
}
/** Redesenha o rio na largura que ele tem de verdade (e de novo quando ela muda). */
function finRioAjustar() {
  const caixa = document.querySelector('#fin-painel .fin-rio-caixa'); if (!caixa) return;
  const w = Math.round(caixa.clientWidth); if (!w) return;
  if (Math.abs(w - (finEstado.rioLarg || 0)) < 6) return;
  finEstado.rioLarg = w; caixa.innerHTML = finRio(finMesAtual(), w);
}
function finTocarRio(i) { finEstado.rio = finEstado.rio === i ? '' : i; renderFinPainel(); }
function finInfoRio() {
  const q = finEstado.rio === '' ? null : (finEstado.rioDados || [])[Number(finEstado.rio)]; if (!q) return '<span class="sp-dica">Toque num braço do rio para ver o que tem nele.</span>';
  if (q.sobra) return `<span><strong>Sobrou ${formatCurrency(q.v)}</strong> neste mês — ${Math.round(q.v / (finSoma(finDoMes(finMesAtual(), false), 'income') || 1) * 100)}% do que entrou.</span>`;
  const cats = q.varias || [q.c];
  const l = finDoMes(finMesAtual(), false).filter(t => t.type === 'expense' && cats.includes(t.category || 'Outros')).sort((a, b) => b.amount - a.amount).slice(0, 3);
  return `<span><strong>${esc(q.c)}</strong> · ${formatCurrency(q.v)} — ${l.map(t => `${esc(t.desc)} ${finCompacto(t.amount)}`).join(', ')}</span>`;
}

// ═══════════════════════ 2. O CALENDÁRIO (mapa de calor) ══════════════════
function finCalendario(ym) {
  const [y, m] = ym.split('-').map(Number); const n = new Date(y, m, 0).getDate(); const ini = new Date(y, m - 1, 1).getDay();
  const ts = finDoMes(ym, false); const hoje = hojeISO();
  const porDia = {}; ts.forEach(t => { const d = dataTransacao(t); (porDia[d] = porDia[d] || []).push(t); });
  const gastoDia = d => finSoma((porDia[d] || []), 'expense');
  const max = Math.max(1, ...Object.keys(porDia).map(gastoDia));
  let h = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(l => `<b class="fin-cal-sem">${l}</b>`).join('');
  for (let i = 0; i < ini; i++) h += '<span class="fin-cal-vazio"></span>';
  for (let d = 1; d <= n; d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`; const l = porDia[iso] || [];
    const g = gastoDia(iso); const nivel = g ? Math.max(0.12, g / max) : 0;
    const aPagar = l.some(t => t.type === 'expense' && transacaoPendente(t)); const aReceber = l.some(t => t.type === 'income' && transacaoPendente(t));
    const entrou = l.some(t => t.type === 'income' && !transacaoPendente(t));
    const cls = ['fin-cal-dia', iso === hoje ? 'hoje' : '', finEstado.dia === iso ? 'sel' : '', iso > hoje ? 'futuro' : ''].filter(Boolean).join(' ');
    h += `<button type="button" class="${cls}" style="--n:${nivel.toFixed(2)}" onclick="finTocarDia('${iso}')" title="${isoParaBR(iso)}${g ? ' · gastou ' + formatCurrency(g) : ''}">
      <span>${d}</span><i>${aPagar ? '<em class="pagar"></em>' : ''}${aReceber ? '<em class="receber"></em>' : ''}${entrou ? '<em class="entrou"></em>' : ''}</i></button>`;
  }
  return `<div class="fin-cal">${h}</div>
    <div class="fin-cal-leg"><span><i class="calor"></i>gasto do dia</span><span><em class="pagar"></em>a pagar</span><span><em class="receber"></em>a receber</span><span><em class="entrou"></em>entrou</span></div>`;
}
function finTocarDia(iso) { finEstado.dia = finEstado.dia === iso ? '' : iso; renderFinPainel(); }
function finInfoDia() {
  if (!finEstado.dia) return '<span class="sp-dica">Toque num dia para ver os lançamentos dele.</span>';
  const l = transactions.filter(t => dataTransacao(t) === finEstado.dia);
  if (!l.length) return `<span><strong>${diaSemanaCurto(finEstado.dia)} ${isoParaBR(finEstado.dia).slice(0, 5)}</strong> · nada lançado</span>`;
  return `<span><strong>${diaSemanaCurto(finEstado.dia)} ${isoParaBR(finEstado.dia).slice(0, 5)}</strong> · ${l.map(t => `<b class="${t.type === 'income' ? 'sobe' : 'desce'}">${t.type === 'income' ? '+' : '−'}${finCompacto(t.amount)}</b> ${esc(t.desc)}${transacaoPendente(t) ? ' ⏳' : ''}`).join(' · ')}</span>`;
}

// ═══════════════════════════ 3. OS POTES DO ORÇAMENTO ═════════════════════
function finPote(nome, real, prev, cor) {
  const f = prev ? real / prev : 0; const cheio = Math.min(1, f); const transb = f > 1;
  const topo = 14 + (1 - cheio) * 50;
  const id = 'pote-' + nome.replace(/[^a-z0-9]/gi, '').slice(0, 12) + Math.round(prev);
  return `<div class="fin-pote${transb ? ' transb' : ''}" title="${esc(nome)}: ${formatCurrency(real)} de ${formatCurrency(prev)}">
    <svg viewBox="0 0 50 70" aria-hidden="true">
      <defs><clipPath id="${id}"><path d="M9 12 Q9 8 13 8 L37 8 Q41 8 41 12 L43 58 Q43 66 35 66 L15 66 Q7 66 7 58 Z"/></clipPath></defs>
      <rect clip-path="url(#${id})" x="0" y="${topo.toFixed(1)}" width="50" height="70" style="fill:${transb ? 'var(--perigo)' : cor}" class="fin-pote-liq"/>
      <path class="fin-pote-vidro" d="M9 12 Q9 8 13 8 L37 8 Q41 8 41 12 L43 58 Q43 66 35 66 L15 66 Q7 66 7 58 Z"/>
      <rect class="fin-pote-tampa" x="11" y="3" width="28" height="6" rx="2"/>
      ${transb ? '<path class="fin-pote-gota" d="M44 20 q3 6 0 9 q-3 -3 0 -9 Z"/><path class="fin-pote-gota" d="M6 28 q3 6 0 9 q-3 -3 0 -9 Z"/>' : ''}
    </svg>
    <strong>${Math.round(f * 100)}%</strong><small>${esc(nome)}</small><small class="fin-pote-val">${finCompacto(real)} / ${finCompacto(prev)}</small></div>`;
}
function finPotes(ym) {
  const itens = (budget.items || []).filter(i => i.kind !== 'receita' && Number(i.amount) > 0);
  if (!itens.length) return `<div class="sp-vazio">Sem orçamento ainda.<br><button type="button" class="mini-btn" onclick="verSecaoFinancas('orcamento')">📋 montar o orçamento</button></div>`;
  const reais = itens.map(i => ({ i, real: transactions.filter(t => !transacaoPendente(t) && t.type === 'expense' && (t.category || '') === i.name && dataTransacao(t).startsWith(ym)).reduce((a, t) => a + (Number(t.amount) || 0), 0) }));
  // primeiro o que transbordou, depois o que está mais cheio
  reais.sort((a, b) => (b.real / b.i.amount) - (a.real / a.i.amount));
  return `<div class="fin-potes">${reais.slice(0, 8).map((x, k) => finPote(x.i.name, x.real, Number(x.i.amount), x.i.kind === 'essencial' ? 'var(--info)' : 'var(--atencao)')).join('')}</div>`;
}

// ═══════════════════════════ 4. A FILA (a receber / a pagar) ══════════════
function finFila() {
  const pend = transactions.filter(transacaoPendente).sort((a, b) => dataTransacao(a).localeCompare(dataTransacao(b)));
  const rec = pend.filter(t => t.type === 'income'), pag = pend.filter(t => t.type === 'expense');
  const hoje = hojeISO();
  const linha = t => {
    const i = transactions.indexOf(t); const d = dataTransacao(t); const atras = d < hoje;
    const quando = d === hoje ? 'hoje' : atras ? `${t.type === 'expense' ? 'venceu' : 'desde'} ${isoParaBR(d).slice(0, 5)}` : isoParaBR(d).slice(0, 5);
    return `<li class="fin-fila-item ${t.type === 'income' ? 'entra' : 'sai'}${atras && t.type === 'expense' ? ' atras' : ''}">
      <span class="fin-fila-ic">${transacaoDePlantao(t) ? (typeof vt === 'function' ? vt().ic : '🚑') : t.recurringId ? '🔁' : t.type === 'income' ? '📥' : '📤'}</span>
      <span class="fin-fila-txt"><strong>${esc(t.desc)}</strong><small>${quando}</small></span>
      <b>${t.type === 'income' ? '+' : '−'}${formatCurrency(t.amount)}</b>
      <button type="button" class="mini-btn" title="${t.type === 'income' ? 'Recebi' : 'Paguei'} — dar baixa hoje" onclick="alternarEfetivado(${i})">💵</button></li>`;
  };
  return `<div class="fin-fila-tot"><span class="sobe">📥 a receber <b>${formatCurrency(finSoma(rec, 'income'))}</b></span><span class="desce">📤 a pagar <b>${formatCurrency(finSoma(pag, 'expense'))}</b></span></div>
    ${pend.length ? `<ul class="fin-fila">${[...pag.slice(0, 4), ...rec.slice(0, 4)].sort((a, b) => dataTransacao(a).localeCompare(dataTransacao(b))).map(linha).join('')}</ul>
      ${pend.length > 8 ? `<button type="button" class="mini-btn" onclick="verSecaoFinancas('lancamentos'); filtrarFin('pendentes', document.querySelector('#fin-filters > span:nth-child(4)'))">ver todas as ${pend.length} pendências</button>` : ''}`
      : '<div class="sp-vazio">Nada pendente. Tudo em dia. 👏</div>'}`;
}

// ═══════════════════ 5. 12 MESES, POUPANÇA E PREVISÃO ═════════════════════
function finSerie12(base) {
  const meses = []; for (let i = 11; i >= 0; i--) meses.push(somaMes(base, -i));
  return meses.map(m => { const ts = finDoMes(m, true); const inc = finSoma(ts, 'income'), exp = finSoma(ts, 'expense'); return { m, inc, exp, sobra: inc - exp }; });
}
/** Taxa de poupança: quanto do que ENTROU (efetivado) não saiu. Meia-lua de −20% a 50%. */
function finPonteiroPoupanca(taxa) {
  const cx = 60, cy = 56, R = 44, lo = -20, hi = 50;
  const ang = v => Math.PI * (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo));
  const pt = (v, r) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const faixas = [[-20, 0, 'var(--perigo)', 'gastou mais do que ganhou'], [0, 10, 'var(--atencao)', 'apertado'], [10, 20, '#a3e635', 'bom'], [20, 50, 'var(--ok)', 'excelente']];
  const arcos = faixas.map(([a, b, cor, rot]) => { const [x1, y1] = pt(a + 0.3, R), [x2, y2] = pt(b - 0.3, R);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" style="stroke:${cor}" class="sp-imc-arco${taxa !== null && taxa >= a && taxa < b ? ' ativo' : ''}"><title>${rot}: ${a}% a ${b}%</title></path>`; }).join('');
  let ag = '';
  if (taxa !== null) { const [x, y] = pt(taxa, R - 12); ag = `<line class="sp-imc-agulha" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle class="sp-imc-eixo" cx="${cx}" cy="${cy}" r="3.5"/>`; }
  return `<svg class="sp-imc" viewBox="0 0 120 64" role="img" aria-label="Taxa de poupança">${arcos}${ag}</svg>`;
}
/** Como o mês deve fechar: o efetivado + o que ainda está pendente no mês + as
 *  recorrentes que nem foram lançadas ainda. */
function finPrevisao(ym) {
  const ts = finDoMes(ym, false);
  const inc = finSoma(ts, 'income'), exp = finSoma(ts, 'expense');
  let falta = 0;
  if (ym >= hojeISO().slice(0, 7)) recurring.filter(r => r.active !== false && (!r.since || r.since <= ym) && !lancRecorrente(r, ym)).forEach(r => { falta += r.type === 'income' ? r.amount : -r.amount; });
  return inc - exp + falta;
}
function finQuadroTendencia(ym) {
  const dados = finSerie12(ym);
  const ef = finDoMes(ym, true); const inc = finSoma(ef, 'income'), exp = finSoma(ef, 'expense');
  const taxa = inc ? (inc - exp) / inc * 100 : null;
  const prev = finPrevisao(ym);
  const larg = 320;
  const graf = typeof ngGrafico === 'function' && dados.some(d => d.inc || d.exp)
    ? ngGrafico('fin-12', [
        { nome: 'Entrou', cor: 'var(--ok)', pontos: dados.map(d => ({ d: d.m + '-15', v: d.inc })), fmt: v => formatCurrency(v) },
        { nome: 'Saiu', cor: 'var(--perigo)', pontos: dados.map(d => ({ d: d.m + '-15', v: d.exp })), fmt: v => formatCurrency(v) }
      ], { L: larg, A: 130, area: false, extremos: false, passo: 'no mês' })
    : '<div class="sp-vazio">A linha aparece com os primeiros meses lançados.</div>';
  return `<div class="fin-tend-topo">
      <div class="fin-poup">${finPonteiroPoupanca(taxa)}<strong style="color:${taxa === null ? 'var(--txt3)' : taxa < 0 ? 'var(--perigo)' : taxa < 10 ? 'var(--atencao)' : 'var(--ok)'}">${taxa === null ? '—' : spNum(taxa, 0) + '%'}</strong><small>taxa de poupança</small></div>
      <div class="fin-prev"><small>O MÊS DEVE FECHAR EM</small><strong class="${prev >= 0 ? 'sobe' : 'desce'}">${formatCurrency(prev)}</strong>
        <small>contando o pendente e as recorrentes que ainda vêm</small></div></div>
    ${graf}`;
}

// ═════════════════════════════ O PAINEL ═══════════════════════════════════
function finQuadro(cls, ic, tit, sub, corpo, secao) {
  return `<section class="sp-quadro ${cls}"><button type="button" class="sp-cab" onclick="verSecaoFinancas('${secao}')"><span class="sp-ic">${ic}</span><span class="sp-tit">${tit}</span><small>${sub}</small><span class="sp-ir">›</span></button>${corpo}</section>`;
}
function renderFinPainel() {
  const el = document.getElementById('fin-painel'); if (!el) return;
  const ym = finMesAtual();
  const ts = finDoMes(ym, false); const E = finSoma(ts, 'income'), S = finSoma(ts, 'expense');
  const ultimo = (budget.ultimoExtrato || '');
  const diasExtrato = ultimo ? spDias(ultimo) : null;
  const lembrete = diasExtrato === null || diasExtrato >= 7
    ? `<button type="button" class="fin-lembrete" onclick="verSecaoFinancas('lancamentos'); abrirImportarExtrato()">📥 ${diasExtrato === null ? 'Importe o extrato do banco: o app lança e categoriza sozinho' : `Último extrato há ${diasExtrato} dias — hora da importação da semana`}</button>` : '';
  el.innerHTML = `${lembrete}<div class="sp-grade fin-grade">
    ${finQuadro('fin-q-rio', '🌊', 'O rio do mês', `${formatCurrency(E)} entrou · ${formatCurrency(S)} saiu`, `<div class="fin-rio-caixa">${finRio(ym, 340)}</div><div class="sp-info">${finInfoRio()}</div>`, 'analise')}
    ${finQuadro('fin-q-cal', '🗓️', 'O mês dia a dia', nomeMes(ym), `${finCalendario(ym)}<div class="sp-info">${finInfoDia()}</div>`, 'lancamentos')}
    ${finQuadro('fin-q-potes', '🫙', 'Orçamento', 'potes do mês', finPotes(ym), 'orcamento')}
    ${finQuadro('fin-q-fila', '⏳', 'A receber e a pagar', 'baixa num toque', finFila(), 'lancamentos')}
    ${finQuadro('fin-q-tend', '📈', '12 meses', 'entrou × saiu', finQuadroTendencia(ym), 'analise')}
  </div>`;
  // o rio se redesenha na largura de verdade — agora e sempre que ela mudar (aba escondida mede 0:
  // o vigia pega a largura quando a aba aparece; antes o desenho ficava esticado com letras enormes)
  finEstado.rioLarg = 0; finRioAjustar();
  const caixa = el.querySelector('.fin-rio-caixa');
  if (finEstado.rioVigia) finEstado.rioVigia.disconnect();
  if (caixa && typeof ResizeObserver === 'function') { finEstado.rioVigia = new ResizeObserver(() => finRioAjustar()); finEstado.rioVigia.observe(caixa); }
}

// ═════════════════════════════ A ANÁLISE ══════════════════════════════════
/** O mosaico: cada categoria de gasto vira um bloco do tamanho do que pesou. */
function finMosaico(ym) {
  const ts = finDoMes(ym, true).filter(t => t.type === 'expense');
  const m = {}; ts.forEach(t => { const c = t.category || 'Outros'; m[c] = (m[c] || 0) + Number(t.amount); });
  const l = Object.entries(m).sort((a, b) => b[1] - a[1]); const tot = l.reduce((a, x) => a + x[1], 0);
  if (!l.length) return '<div class="sp-vazio">Nenhum gasto efetivado neste mês.</div>';
  const ant = {}; finDoMes(somaMes(ym, -1), true).filter(t => t.type === 'expense').forEach(t => { const c = t.category || 'Outros'; ant[c] = (ant[c] || 0) + Number(t.amount); });
  return `<div class="fin-mosaico">${l.map(([c, v], i) => {
    const p = v / tot; const d = ant[c] ? (v / ant[c] - 1) * 100 : null;
    return `<div class="fin-mos" style="--c:${FIN_CORES[i % FIN_CORES.length]}; flex-grow:${Math.max(1, Math.round(p * 100))}; flex-basis:${Math.max(90, Math.round(p * 600))}px" title="${esc(c)}: ${formatCurrency(v)}">
      <strong>${esc(c)}</strong><b>${formatCurrency(v)}</b><small>${Math.round(p * 100)}%${d !== null ? ` · <span class="${d > 0 ? 'desce' : 'sobe'}">${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d))}% vs mês anterior</span>` : ''}</small></div>`;
  }).join('')}</div>`;
}
function renderFinAnalise() {
  const el = document.getElementById('fin-analise'); if (!el) return;
  const ym = finMesAtual(); const dados = finSerie12(ym);
  const larg = Math.max(320, Math.round(el.clientWidth || 700));
  const top = finDoMes(ym, false).filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5);
  const assin = recurring.filter(r => r.active !== false && r.type === 'expense');
  const anual = assin.reduce((a, r) => a + r.amount * 12, 0);
  const media = dados.filter(d => d.inc || d.exp); const mInc = media.length ? media.reduce((a, d) => a + d.inc, 0) / media.length : 0, mExp = media.length ? media.reduce((a, d) => a + d.exp, 0) / media.length : 0;
  el.innerHTML = `
    <h3 class="fin-an-tit">📈 Os últimos 12 meses</h3>
    ${typeof ngGrafico === 'function' && media.length ? ngGrafico('fin-12-grande', [
        { nome: 'Entrou', cor: 'var(--ok)', pontos: dados.map(d => ({ d: d.m + '-15', v: d.inc })), fmt: v => formatCurrency(v) },
        { nome: 'Saiu', cor: 'var(--perigo)', pontos: dados.map(d => ({ d: d.m + '-15', v: d.exp })), fmt: v => formatCurrency(v) },
        { nome: 'Sobrou', cor: 'var(--info)', pontos: dados.map(d => ({ d: d.m + '-15', v: d.sobra })), fmt: v => formatCurrency(v) }
      ], { L: larg, A: 220, area: false, extremos: false, passo: 'no mês' }) : '<div class="sp-vazio">Sem meses lançados ainda.</div>'}
    <div class="fin-an-num"><span>média que entra <b class="sobe">${formatCurrency(mInc)}</b></span><span>média que sai <b class="desce">${formatCurrency(mExp)}</b></span><span>média que sobra <b>${formatCurrency(mInc - mExp)}</b></span></div>
    <div class="fin-meses-chips">${dados.map(d => `<button type="button" class="${d.m === ym ? 'on' : ''}" onclick="finMonth='${d.m}'; finModo='mes'; redesenharFinancas();" title="${nomeMes(d.m)}"><small>${nomeMes(d.m).slice(0, 3)}</small><b class="${d.sobra >= 0 ? 'sobe' : 'desce'}">${finCompacto(d.sobra)}</b></button>`).join('')}</div>
    <h3 class="fin-an-tit">🧩 Para onde foi o dinheiro em ${nomeMes(ym).toLowerCase()}</h3>
    ${finMosaico(ym)}
    <div class="fin-an-duas">
      <div><h3 class="fin-an-tit">💸 Os maiores gastos do mês</h3>${top.length ? `<ol class="fin-top">${top.map(t => `<li><span>${esc(t.desc)}<small>${esc(t.category || '')} · ${isoParaBR(dataTransacao(t)).slice(0, 5)}</small></span><b class="desce">${formatCurrency(t.amount)}</b></li>`).join('')}</ol>` : '<div class="sp-vazio">Nada ainda.</div>'}</div>
      <div><h3 class="fin-an-tit">🔁 O que se repete todo mês</h3>${assin.length ? `<p class="fin-assin">Contas e assinaturas recorrentes custam <b class="desce">${formatCurrency(anual / 12)}/mês</b> — <b>${formatCurrency(anual)} por ano</b>.</p>
        <ol class="fin-top">${[...assin].sort((a, b) => b.amount - a.amount).slice(0, 6).map(r => `<li><span>${esc(r.desc)}<small>dia ${r.day} · ${formatCurrency(r.amount * 12)}/ano</small></span><b>${formatCurrency(r.amount)}</b></li>`).join('')}</ol>` : '<div class="sp-vazio">Nenhuma recorrente cadastrada.</div>'}</div>
    </div>`;
}

// ══════════════════════ MICRO-ABAS E O DESENHO GERAL ══════════════════════
function verSecaoFinancas(s, el) {
  if (!FIN_SECOES.includes(s)) s = 'painel';
  financasSecao = s;
  document.querySelectorAll('#financas-secoes > span').forEach(x => x.classList.toggle('active', el ? x === el : (x.getAttribute('onclick') || '').includes(`'${s}'`)));
  FIN_SECOES.forEach(k => { const d = document.getElementById('sec-fin-' + k); if (d) d.hidden = k !== s; });
  if (s === 'painel') renderFinPainel();
  if (s === 'analise') renderFinAnalise();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
/** Chamado no fim do renderFinances(): quem estiver à vista se redesenha. */
function renderFinVisual() {
  renderFinPainel();
  if (financasSecao === 'analise') renderFinAnalise();
  renderExtratoCartao();
}

// ════════════════════════ O EXTRATO DO BANCO (CSV / OFX) ═══════════════════
// Lido AQUI no aparelho: o arquivo não vai para servidor nenhum. O que fica é
// o lançamento que ele aprovar na conferência — e as "regras" que o app
// aprende com as categorias que ele escolheu (em `budget.regrasExtrato`,
// que sincroniza: é escolha dele, e é pequena).
const FIN_REGRAS_PADRAO = [
  [/ifood|rappi|restaurante|lanchonete|padaria|pizzaria|hamburg|burger|mc ?donald|bk |subway|açaí|acai|bar |cafe|café/i, 'expense', ['Alimentação', 'Restaurantes', 'Supermercado']],
  [/supermerc|mercado|atacad|assai|assaí|carrefour|epa |bh supermerc|verdemar|hortifruti|sacolão|sacolao/i, 'expense', ['Supermercado', 'Alimentação']],
  [/posto|shell|ipiranga|petrobras|br distrib|combust|gasolina|etanol/i, 'expense', ['Combustível', 'Transporte']],
  [/uber|99 ?app|99pop|cabify|taxi|táxi|onibus|ônibus|metro|metrô|estaciona|pedágio|pedagio|sem parar|veloe/i, 'expense', ['Transporte', 'Transporte por aplicativo']],
  [/netflix|spotify|prime video|amazon prime|disney|hbo|max\.com|globoplay|youtube|deezer|apple\.com|icloud|google one|google storage|chatgpt|openai|claude|anthropic|microsoft|adobe/i, 'expense', ['Aplicativos e assinaturas', 'Assinaturas']],
  [/farmac|drogaria|droga ?raia|drogasil|pague menos|panvel|araujo|araújo/i, 'expense', ['Farmácia', 'Saúde']],
  [/unimed|amil|bradesco saude|sulamerica|plano de sa|hapvida|laborat|clinica|clínica|hospital|consulta/i, 'expense', ['Plano de saúde', 'Saúde']],
  [/aluguel|condom|imobili|quinto andar|quintoandar/i, 'expense', ['Moradia / Aluguel', 'Condomínio', 'Moradia']],
  [/cemig|energia|enel|light |copel|celesc|neoenergia/i, 'expense', ['Luz', 'Custos Fixos']],
  [/copasa|sabesp|saae|água|agua e esgoto/i, 'expense', ['Água', 'Custos Fixos']],
  [/vivo|claro|tim |oi |net virtua|internet|telefon|starlink/i, 'expense', ['Celular / Telefonia', 'Custos Fixos']],
  [/academia|smart ?fit|bluefit|crossfit|gympass|wellhub/i, 'expense', ['Academia / Esportes', 'Lazer']],
  [/escola|faculdade|curso|udemy|alura|hotmart|coursera/i, 'expense', ['Escola / Faculdade / Cursos', 'Educação']],
  [/das |simples nacional|darf|receita federal|iptu|ipva|imposto|tributo|inss/i, 'expense', ['Impostos', 'IPTU']],
  [/fatura|pagamento de fatura|pgto fatura|cartao de credito|cartão de crédito/i, 'expense', ['Cartão de crédito']],
  [/aplica|investim|cdb|tesouro|corretora|xp invest|rico |clear |nuinvest|btg/i, 'expense', ['Investimentos']],
  [/resgate|rendimento|juros|dividendo|jcp/i, 'income', ['Investimentos']],
  [/salario|salário|vencimento|folha|cisurg|prefeitura/i, 'income', ['Salário CLT', 'Salário líquido']],
  [/plant[aã]o|psmi|hospital|upa /i, 'income', ['Plantão']],
  [/reembols|estorno|devolu/i, 'income', ['Reembolso']]
];
function finNormaliza(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\d{2}\/\d{2}(\/\d{2,4})?/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
/** A "chave" de uma descrição para a regra aprendida: as 3 primeiras palavras. */
function finChaveDesc(desc) { return finNormaliza(desc).split(' ').filter(w => w.length > 1 && !/^\d+$/.test(w) && !['pix', 'ted', 'doc', 'compra', 'pagamento', 'pagto', 'transf', 'transferencia', 'enviado', 'enviada', 'recebido', 'recebida', 'debito', 'credito', 'cartao', 'no', 'de', 'da', 'do', 'em'].includes(w)).slice(0, 3).join(' '); }
function finSugerirCategoria(desc, tipo) {
  const regras = budget.regrasExtrato || {};
  const ch = finChaveDesc(desc);
  if (ch && regras[tipo + ':' + ch]) return { cat: regras[tipo + ':' + ch], por: 'aprendida' };
  const existentes = categoriasDoTipo(tipo);
  for (const [re, t, cands] of FIN_REGRAS_PADRAO) {
    if (t !== tipo || !re.test(desc)) continue;
    const c = cands.find(x => existentes.includes(x)) || cands[cands.length - 1];
    return { cat: c, por: 'palavra' };
  }
  return { cat: 'Outros', por: '' };
}

// ── leitura dos arquivos ───────────────────────────────────────────────────
/** Decodifica o arquivo: UTF-8 e, se vier com caractere quebrado, Windows-1252
 *  (muito banco brasileiro ainda exporta assim). */
function finDecodifica(buf) {
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.includes('�')) { try { t = new TextDecoder('windows-1252').decode(buf); } catch (e) { /* fica o utf-8 */ } }
  return t.replace(/^﻿/, '');
}
/** "1.234,56" / "-1234.56" / "R$ 1.234,56 D" → número com sinal. */
function finNumero(s) {
  if (s === undefined || s === null) return NaN;
  let t = String(s).trim(); if (!t) return NaN;
  let neg = /^-|\(.*\)|-$|\bD\b|d[eé]bito/i.test(t) && !/\bC\b|cr[eé]dito/i.test(t.replace(/^-/, ''));
  if (/^-/.test(t)) neg = true;
  t = t.replace(/[^\d.,]/g, '');
  if (!t) return NaN;
  const ultV = t.lastIndexOf(','), ultP = t.lastIndexOf('.');
  if (ultV > ultP) t = t.replace(/\./g, '').replace(',', '.');      // 1.234,56
  else if (ultP > ultV && ultV >= 0) t = t.replace(/,/g, '');       // 1,234.56
  else if (ultV >= 0 && ultP < 0) t = t.replace(',', '.');           // 1234,56
  const n = parseFloat(t); return isFinite(n) ? (neg ? -n : n) : NaN;
}
/** "08/10/2026", "08/10/26", "2026-10-08", "20261008" → ISO. */
function finData(s) {
  const t = String(s || '').trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/); if (m) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  m = t.match(/^(\d{4})(\d{2})(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return '';
}
function finLerOFX(txt) {
  const banco = ((txt.match(/<ORG>([^<\r\n]+)/i) || [])[1] || (txt.match(/<BANKID>([^<\r\n]+)/i) || [])[1] || '').trim();
  const cartao = /<CREDITCARDMSGSRSV1>/i.test(txt);
  const linhas = [];
  (txt.match(/<STMTTRN>[\s\S]*?(<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi) || []).forEach(b => {
    const c = n => ((b.match(new RegExp('<' + n + '>([^<\\r\\n]*)', 'i')) || [])[1] || '').trim();
    const v = finNumero(c('TRNAMT')); const d = finData(c('DTPOSTED'));
    if (!isFinite(v) || !d) return;
    const desc = [c('NAME'), c('MEMO')].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' · ') || c('TRNTYPE');
    linhas.push({ data: d, desc, valor: v, fitid: c('FITID') });
  });
  return { linhas, banco: banco || (cartao ? 'cartão' : 'banco'), cartao };
}
function finSeparador(linha) {
  const conta = c => (linha.match(new RegExp('\\' + c, 'g')) || []).length;
  return [';', '\t', ',', '|'].map(c => [c, conta(c)]).sort((a, b) => b[1] - a[1])[0][0];
}
function finQuebraCSV(linha, sep) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') { if (q && linha[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === sep && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out.map(x => x.trim());
}
function finLerCSV(txt) {
  const linhas = txt.split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return { linhas: [], banco: 'banco' };
  // o cabeçalho é a primeira linha que fala de data E de valor
  let iCab = linhas.findIndex(l => /data|date/i.test(l) && /valor|amount|quantia|cr[eé]dito|d[eé]bito|montante/i.test(l));
  if (iCab < 0) iCab = 0;
  const sep = finSeparador(linhas[iCab]);
  const cab = finQuebraCSV(linhas[iCab], sep).map(c => finNormaliza(c));
  const col = res => cab.findIndex(c => res.some(r => r.test(c)));
  const cData = col([/^data/, /^date/, /^dt/, /lancamento$/]);
  const cDesc = col([/descri/, /historico/, /^title/, /estabelec/, /^lancamento/, /^detalhe/, /^memo/, /^nome/]);
  const cValor = col([/^valor/, /^amount/, /^quantia/, /^montante/, /valor r/]);
  const cCred = col([/^credito/, /^entrada/]), cDeb = col([/^debito/, /^saida/]);
  const cId = col([/^identificador/, /^id$/, /^fitid/]);
  const cartao = cab.includes('title') && cab.includes('amount') && cId < 0;    // fatura do Nubank: positivo = gasto
  const out = [];
  linhas.slice(iCab + 1).forEach(l => {
    const c = finQuebraCSV(l, sep);
    const d = finData(c[cData >= 0 ? cData : 0]); if (!d) return;
    let v;
    if (cValor >= 0) v = finNumero(c[cValor]);
    else { const cr = finNumero(c[cCred]), db = finNumero(c[cDeb]); v = isFinite(cr) && cr ? Math.abs(cr) : isFinite(db) ? -Math.abs(db) : NaN; }
    if (!isFinite(v) || !v) return;
    const desc = (cDesc >= 0 ? c[cDesc] : c.filter((x, k) => k !== cData && k !== cValor).find(x => /[a-z]/i.test(x))) || 'Lançamento';
    if (/^saldo|saldo anterior|saldo do dia|s a l d o/i.test(desc)) return;
    out.push({ data: d, desc, valor: cartao ? -v : v, fitid: cId >= 0 ? c[cId] : '' });
  });
  return { linhas: out, banco: 'banco', cartao };
}

// ── conferência: novo, repetido ou baixa ───────────────────────────────────
function finChaveLinha(l) { return l.fitid ? 'id:' + l.fitid : `${l.data}|${l.valor.toFixed(2)}|${finNormaliza(l.desc).slice(0, 24)}`; }
function finAnalisarExtrato(lido, nomeArq) {
  const usadas = new Set();
  const itens = lido.linhas.map((l, k) => {
    const tipo = l.valor < 0 ? 'expense' : 'income'; const valor = Math.abs(l.valor); const chave = finChaveLinha(l);
    // 1) já importada antes (mesmo id do banco, ou mesmo dia + valor + descrição)
    const repetida = transactions.find(t => t.extratoId === chave || (dataTransacao(t) === l.data && Math.abs(t.amount - valor) < 0.005 && t.type === tipo && finNormaliza(t.desc).slice(0, 12) === finNormaliza(l.desc).slice(0, 12)));
    if (repetida) return { k, ...l, tipo, valor, chave, estado: 'repetida', alvo: repetida.id, incluir: false };
    // 2) é o dinheiro de algo que estava PENDENTE (plantão a receber, conta a pagar):
    //    mesmo valor, mesmo sentido, até 45 dias antes do extrato (plantão atrasa) ou 5 depois
    const pend = transactions.filter(t => transacaoPendente(t) && !usadas.has(t.id) && t.type === tipo && Math.abs(t.amount - valor) < 0.005)
      .map(t => ({ t, dd: spDias(dataTransacao(t), l.data) })).filter(x => x.dd >= -5 && x.dd <= 45).sort((a, b) => Math.abs(a.dd) - Math.abs(b.dd))[0];
    if (pend) { usadas.add(pend.t.id); return { k, ...l, tipo, valor, chave, estado: 'baixa', alvo: pend.t.id, incluir: true, cat: pend.t.category }; }
    // 3) na fatura do cartão, "pagamento recebido" é só o pagamento da própria fatura — não é receita
    if (lido.cartao && tipo === 'income' && /pagamento|pgto|pag fatura/i.test(l.desc)) return { k, ...l, tipo, valor, chave, estado: 'transferencia', incluir: false, cat: 'Outros' };
    // 4) PARECIDA: já existe um lançamento efetivado, lançado à mão, de mesmo valor e sentido
    //    até 2 dias de distância — provavelmente é o mesmo dinheiro com outro nome (evita contar 2×)
    const parecida = transactions.find(t => !transacaoPendente(t) && !t.extratoId && !usadas.has(t.id) && t.type === tipo && Math.abs(t.amount - valor) < 0.005 && Math.abs(spDias(dataTransacao(t), l.data)) <= 2);
    if (parecida) { usadas.add(parecida.id); return { k, ...l, tipo, valor, chave, estado: 'parecida', alvo: parecida.id, incluir: false, cat: parecida.category }; }
    const sug = finSugerirCategoria(l.desc, tipo);
    return { k, ...l, tipo, valor, chave, estado: 'nova', incluir: true, cat: sug.cat, por: sug.por };
  });
  return { arquivo: nomeArq, banco: lido.banco, cartao: lido.cartao, itens };
}
function abrirImportarExtrato() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,.ofx,.qfx,.txt,text/csv';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) finLerArquivo(f); };
  inp.click();
}
function finLerArquivo(f) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const txt = finDecodifica(rd.result);
      const ofx = /<OFX>|OFXHEADER/i.test(txt);
      const lido = ofx ? finLerOFX(txt) : finLerCSV(txt);
      if (!lido.linhas.length) { toast('Não achei lançamentos nesse arquivo. Me mande o arquivo que eu ensino o app a ler esse formato.', 7000); return; }
      finEstado.extrato = finAnalisarExtrato(lido, f.name); finEstado.extratoFiltro = 'tudo';
      renderExtratoConferencia();
    } catch (e) { toast('⚠️ Não consegui ler o arquivo: ' + e.message, 7000); }
  };
  rd.readAsArrayBuffer(f);
}
function finExtratoInverter() {
  const x = finEstado.extrato; if (!x) return;
  const lido = { linhas: x.itens.map(i => ({ data: i.data, desc: i.desc, valor: i.tipo === 'expense' ? i.valor : -i.valor, fitid: i.fitid })), banco: x.banco, cartao: !x.cartao };
  finEstado.extrato = finAnalisarExtrato(lido, x.arquivo); renderExtratoConferencia();
}
function finExtratoMarcar(k, v) { const it = finEstado.extrato && finEstado.extrato.itens[k]; if (it) { it.incluir = v; renderExtratoConferencia(); } }
function finExtratoCategoria(k, v) { const it = finEstado.extrato && finEstado.extrato.itens[k]; if (it) { it.cat = v; it.por = 'escolhida'; } }
function finExtratoFiltrar(f) { finEstado.extratoFiltro = f; renderExtratoConferencia(); }
function renderExtratoConferencia() {
  const x = finEstado.extrato; if (!x) return;
  const cont = { nova: 0, baixa: 0, repetida: 0, parecida: 0, transferencia: 0 }; x.itens.forEach(i => cont[i.estado]++);
  const f = finEstado.extratoFiltro;
  const lista = x.itens.filter(i => f === 'tudo' || i.estado === f);
  const inc = x.itens.filter(i => i.incluir);
  const ini = x.itens.reduce((a, i) => (!a || i.data < a ? i.data : a), ''), fim = x.itens.reduce((a, i) => (i.data > a ? i.data : a), '');
  const html = `<p class="hint">📄 <b>${esc(x.arquivo)}</b> · ${plural(x.itens.length, 'linha', 'linhas')} de ${isoParaBR(ini)} a ${isoParaBR(fim)}. Lido aqui no aparelho — o arquivo não foi para lugar nenhum.</p>
    <div class="fin-ext-resumo">
      <button type="button" class="${f === 'tudo' ? 'on' : ''}" onclick="finExtratoFiltrar('tudo')">Tudo <b>${x.itens.length}</b></button>
      <button type="button" class="${f === 'nova' ? 'on' : ''}" onclick="finExtratoFiltrar('nova')">🆕 Novas <b>${cont.nova}</b></button>
      <button type="button" class="${f === 'baixa' ? 'on' : ''}" onclick="finExtratoFiltrar('baixa')">💵 Dão baixa <b>${cont.baixa}</b></button>
      <button type="button" class="${f === 'repetida' ? 'on' : ''}" onclick="finExtratoFiltrar('repetida')">♻️ Já estavam <b>${cont.repetida}</b></button>
      ${cont.parecida ? `<button type="button" class="${f === 'parecida' ? 'on' : ''}" onclick="finExtratoFiltrar('parecida')">🤔 Parecidas <b>${cont.parecida}</b></button>` : ''}
      ${cont.transferencia ? `<button type="button" class="${f === 'transferencia' ? 'on' : ''}" onclick="finExtratoFiltrar('transferencia')">↔️ Pagamento da fatura <b>${cont.transferencia}</b></button>` : ''}</div>
    ${cont.parecida ? '<p class="hint">🤔 <b>Parecidas</b> = já existe um lançamento seu com o mesmo valor, perto da mesma data, com outro nome. Vêm desmarcadas para não contar duas vezes; marque só se for outro dinheiro.</p>' : ''}
    <label class="check-line fin-ext-cartao"><input type="checkbox" ${x.cartao ? 'checked' : ''} onchange="finExtratoInverter()"> É fatura de cartão (valor positivo = gasto)</label>
    <div class="fin-ext-lista">${lista.map(i => {
      const alvo = i.alvo ? transactions.find(t => t.id === i.alvo) : null;
      return `<div class="fin-ext-item est-${i.estado}${i.incluir ? '' : ' fora'}">
        <input type="checkbox" ${i.incluir ? 'checked' : ''} ${i.estado === 'repetida' ? 'disabled' : ''} onchange="finExtratoMarcar(${i.k}, this.checked)" aria-label="Incluir">
        <span class="fin-ext-txt"><strong>${esc(i.desc)}</strong><small>${isoParaBR(i.data)}${i.estado === 'baixa' && alvo ? ` · 💵 dá baixa em <b>${esc(alvo.desc)}</b> de ${isoParaBR(dataTransacao(alvo)).slice(0, 5)}` : i.estado === 'parecida' && alvo ? ` · 🤔 parece ser <b>${esc(alvo.desc)}</b> de ${isoParaBR(dataTransacao(alvo)).slice(0, 5)}` : i.estado === 'transferencia' ? ' · ↔️ pagamento da fatura (não é receita)' : i.estado === 'repetida' ? ' · já está nos lançamentos' : i.por === 'aprendida' ? ' · ✨ categoria que você já usou' : ''}</small></span>
        ${i.estado === 'nova' || i.estado === 'parecida' || i.estado === 'transferencia' ? `<select onchange="finExtratoCategoria(${i.k}, this.value)" aria-label="Categoria">${[...new Set([i.cat, ...categoriasDoTipo(i.tipo)])].map(c => `<option${c === i.cat ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select>` : '<span></span>'}
        <b class="${i.tipo === 'income' ? 'sobe' : 'desce'}">${i.tipo === 'income' ? '+' : '−'}${formatCurrency(i.valor)}</b></div>`;
    }).join('') || '<div class="sp-vazio">Nada neste filtro.</div>'}</div>
    <div class="fin-ext-acoes"><button type="button" class="btn-treinar" onclick="finGravarExtrato()">Gravar ${plural(inc.length, 'lançamento', 'lançamentos')}</button>
      <button type="button" class="mini-btn" onclick="ngFecharFolha(); finEstado.extrato = null">Cancelar</button></div>`;
  if (typeof ngFolha === 'function') ngFolha('📥 Conferir o extrato', html);
}
function finGravarExtrato() {
  const x = finEstado.extrato; if (!x) return;
  let novas = 0, baixas = 0; const regras = budget.regrasExtrato = budget.regrasExtrato || {}; let aprendeu = false;
  x.itens.filter(i => i.incluir).forEach(i => {
    if (i.estado === 'baixa') {
      const t = transactions.find(z => z.id === i.alvo); if (!t) return;
      // a baixa carimba QUANDO o dinheiro andou; o `date` (o fato) não muda — regra do projeto
      // plantão: quem manda é o plantão (sincronizarLancamentoPlantao refaz o lançamento a partir dele)
      const s = transacaoDePlantao(t) && typeof shifts !== 'undefined' ? shifts.find(z => z.id === t.id) : null;
      if (s) { s.paid = true; s.paidAt = i.data; sincronizarLancamentoPlantao(s); }
      else { t.pending = false; t.paidAt = i.data; }
      t.extratoId = i.chave; baixas++;
    } else if (i.estado === 'nova' || i.estado === 'parecida' || i.estado === 'transferencia') {
      transactions.push({ id: novoId(), date: i.data, desc: i.desc.slice(0, 120), amount: Math.round(i.valor * 100) / 100, type: i.tipo, category: i.cat || 'Outros',
        notes: `extrato ${x.banco}`, pending: false, paidAt: i.data, origem: 'extrato', extratoId: i.chave });
      novas++;
      const ch = finChaveDesc(i.desc);
      if (ch && i.cat && i.cat !== 'Outros' && regras[i.tipo + ':' + ch] !== i.cat) { regras[i.tipo + ':' + ch] = i.cat; aprendeu = true; }
    }
  });
  // as regras aprendidas ficam pequenas: no máximo 300 (as mais novas)
  const ks = Object.keys(regras); if (ks.length > 300) ks.slice(0, ks.length - 300).forEach(k => delete regras[k]);
  budget.ultimoExtrato = hojeISO();
  salvar('finances', transactions); salvar('budget', budget);
  if (baixas && typeof shifts !== 'undefined') salvar('shifts', shifts);
  finEstado.extrato = null; ngFecharFolha(); redesenharFinancas();
  if (typeof renderShifts === 'function') renderShifts();
  toast(`📥 ${plural(novas, 'lançamento novo', 'lançamentos novos')}${baixas ? ` e ${plural(baixas, 'baixa', 'baixas')}` : ''}${aprendeu ? ' — e o app aprendeu suas categorias' : ''}.`, 6000);
}
/** O cartão da importação, em Lançamentos. */
function renderExtratoCartao() {
  const el = document.getElementById('fin-extrato'); if (!el) return;
  const u = budget.ultimoExtrato; const n = Object.keys(budget.regrasExtrato || {}).length;
  const vindos = transactions.filter(t => t.origem === 'extrato').length;
  el.innerHTML = `<div class="fin-ext-cab"><span class="fin-ext-ic">📥</span><div><strong>Importar o extrato do banco</strong>
      <small>CSV ou OFX — o arquivo que o app do banco exporta. Lido aqui no aparelho; nada sai daqui. ${u ? `Última importação: ${isoParaBR(u)} (${spHaQuanto(spDias(u))}).` : 'Ainda nenhuma importação.'}</small></div>
      <button type="button" class="btn-treinar" onclick="abrirImportarExtrato()">Escolher arquivo</button></div>
    <div class="fin-ext-arraste" ondragover="event.preventDefault(); this.classList.add('alvo')" ondragleave="this.classList.remove('alvo')" ondrop="event.preventDefault(); this.classList.remove('alvo'); if (event.dataTransfer.files[0]) finLerArquivo(event.dataTransfer.files[0])">ou arraste o arquivo para cá</div>
    <small class="fin-ext-pe">${vindos ? `${plural(vindos, 'lançamento veio', 'lançamentos vieram')} de extratos · ` : ''}${n ? `✨ ${plural(n, 'regra aprendida', 'regras aprendidas')} com as suas categorias` : 'Ao conferir, o app aprende as categorias que você escolher.'}</small>`;
}
