// ════════════════════════════════════════════════════════════════════════════
// SAÚDE — O PAINEL VISUAL E O MÉDICO (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// A v21 foi REPROVADA: "cinco barras, uma igual à outra", "o gráfico de peso é
// só um print", "não faz sentido um quadrado gigante só para marcar sequência",
// "a aba de médico não tem nada". O pedido: no topo, uma apresentação VISUAL,
// intuitiva e interativa, em que cada nicho tem PERSONALIDADE própria, dentro
// do conceito artístico do resto do app.
//
// Então cada quadro fala a língua do seu assunto:
//   • TREINO  → um mapa do corpo: o músculo acende conforme foi treinado, e o
//               treino de hoje aparece tracejado. Toque num músculo ou num dia.
//   • CORPO   → instrumento de precisão: o ponteiro do IMC e a linha do peso,
//               que responde ao dedo (data e valor de cada pesagem).
//   • COMIDA  → o prato do dia, uma fatia por refeição, e o copo d'água que
//               enche quando você toca nele.
//   • MÉDICO  → o porta-comprimidos (manhã, tarde, noite) e o radar do que vem
//               por aí: consultas marcadas e prevenção atrasada.
//
// Remédios moram em `medical` (o módulo que já sincroniza), com o campo
// `rotina`. Nada de módulo novo: a Regra da União continua com 47.
// Este arquivo carrega ANTES do app.js (o app.js já chama renderSaude() ao
// subir), então aqui só se DECLARA função: nada roda no carregamento.
// ════════════════════════════════════════════════════════════════════════════

// ───────────────────────────── utilidades ─────────────────────────────────
/** Dias de `de` até `ate` (ISO). Meio-dia evita o tropeço do horário de verão. */
function spDias(de, ate) {
  const a = new Date(de + 'T12:00:00'), b = new Date((ate || hojeISO()) + 'T12:00:00');
  return Math.round((b - a) / 864e5);
}
function spSomaDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDe(d); }
function spSomaMeses(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + n); return isoDe(d); }
function spNum(v, casas) { return Number(v).toFixed(casas === undefined ? 1 : casas).replace('.', ','); }
function spHaQuanto(dias) {
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 31) return `há ${dias} dias`;
  const m = Math.round(dias / 30.44);
  if (m < 12) return m <= 1 ? 'há 1 mês' : `há ${m} meses`;
  const a = dias / 365.25;
  return a < 1.5 ? 'há 1 ano' : `há ${Math.round(a)} anos`;
}
/** Estado das escolhas feitas DENTRO do painel (músculo tocado, fatia do
 *  prato, faixa do gráfico). Não é dado dele: vale enquanto a tela está aberta. */
const spEstado = { grupo: '', dia: '', fatia: -1, faixaPeso: '3m' };

// ═════════════════════════════ 1. TREINO ══════════════════════════════════
/** Palavras que denunciam o grupo de um exercício que não está no banco. */
const SP_PALAVRAS_GRUPO = [
  [/supino|crucifixo|peck|voador|flex[aã]o de bra/i, 'peito'],
  [/puxada|remada|barra fixa|pull ?down|terra|serrote|graviton/i, 'costas'],
  [/desenvolvimento|eleva[cç][aã]o (lateral|frontal)|ombro|arnold|face ?pull/i, 'ombro'],
  [/rosca|b[ií]ceps/i, 'biceps'],
  [/tr[ií]ceps|mergulho|franc[eê]s|testa|coice/i, 'triceps'],
  [/gl[uú]te|p[eé]lvica|hip thrust|abdu[cç]/i, 'gluteo'],
  [/agach|leg ?press|extensora|flexora|afundo|stiff|panturrilha|cadeira|passada|hack|b[uú]lgaro/i, 'perna'],
  [/abdom|prancha|crunch|infra|obl[ií]quo/i, 'abdomen'],
  [/esteira|bike|bicicleta|corrida|el[ií]ptico|escada|corda|hiit|transport/i, 'cardio'],
  [/along|mobilidade|yoga|pilates/i, 'mobilidade']
];
/** Treino sem lista de exercícios ainda diz alguma coisa pelo tipo. */
const SP_TIPO_GRUPOS = {
  corrida: ['cardio', 'perna'], caminhada: ['cardio', 'perna'], bike: ['cardio', 'perna'],
  natacao: ['cardio', 'costas', 'ombro'], futebol: ['cardio', 'perna'], alongamento: ['mobilidade']
};
function spGrupoDaLinha(linha) {
  // "Supino reto 4x10 40kg" → "Supino reto"
  const nome = String(linha || '')
    .replace(/\s+\d+\s*[x×]\s*\S+.*$/i, '')
    .replace(/\s+\d+([.,]\d+)?\s*(kg|min|km|m)\b.*$/i, '').trim();
  if (!nome) return null;
  const e = typeof exercicioDoBanco === 'function' ? exercicioDoBanco(nome) : null;
  if (e) return e.grupo;
  const p = SP_PALAVRAS_GRUPO.find(([re]) => re.test(nome));
  return p ? p[1] : null;
}
function spGruposDoTreino(w) {
  const gs = new Set(SP_TIPO_GRUPOS[w.type] || []);
  (w.exercises || []).forEach(l => { const g = spGrupoDaLinha(l); if (g) gs.add(g); });
  // treino carregado da ficha sem a lista: a observação diz qual dia foi
  if (!(w.exercises || []).length && w.note) {
    fichas.forEach(f => (f.dias || []).forEach(d => {
      if (d.nome && w.note.includes(d.nome)) (d.exercicios || []).forEach(e => { if (e.grupo) gs.add(e.grupo); });
    }));
  }
  return gs;
}
/** Para cada grupo muscular: há quantos dias foi treinado (janela de 14 dias). */
function spRecenciaGrupos() {
  const r = {}; const hoje = hojeISO();
  workouts.forEach(w => {
    if (!w.date || w.date > hoje) return;
    const d = spDias(w.date, hoje); if (d > 14) return;
    spGruposDoTreino(w).forEach(g => { if (!r[g] || d < r[g].dias) r[g] = { dias: d, data: w.date, treino: w }; });
  });
  return r;
}
/** O dia de ficha que está há mais tempo sem ser treinado: "o que eu faço hoje?". */
function proximoDiaDeTreino() {
  let melhor = null;
  fichas.forEach(f => (f.dias || []).forEach((d, i) => {
    if (!d.exercicios || !d.exercicios.length) return;
    const quando = d.ultimoUso || '0000-00-00';
    if (!melhor || quando < melhor.quando) melhor = { ficha: f, dia: d, i, quando };
  }));
  return melhor;
}

/** O desenho: frente e costas, cada músculo um <g> que acende e responde ao toque.
 *  Formas geométricas de propósito — combinam com o traço fino do resto do app. */
// S2 (09/10): o MESMO desenho também mostra um exercício — `papel` = { prim: [...], sec: [...], lado? }:
// o músculo que mais trabalha aceso forte, o que ajuda aceso fraco ("os desenhos de palitinho estão fora
// da realidade; o painel do corpo está bonito"). `lado` ('frente'|'costas') recorta uma silhueta só.
function spMapaMuscular(rec, prox, papel) {
  const nivel = g => papel ? (papel.prim.includes(g) ? 3 : papel.sec.includes(g) ? 1 : 0)
    : (x => !x ? 0 : x.dias <= 1 ? 3 : x.dias <= 3 ? 2 : x.dias <= 7 ? 1 : 0)(rec[g]);
  const reg = (g, formas) => {
    const nome = (GRUPOS_MUSC[g] || ['', g])[1];
    if (papel) return `<g class="mm q${nivel(g)}"><title>${nome}${papel.prim.includes(g) ? ' · trabalha mais' : papel.sec.includes(g) ? ' · ajuda' : ''}</title>${formas}</g>`;
    const x = rec[g];
    const quando = x ? spHaQuanto(x.dias) : 'sem treino em 14 dias';
    return `<g class="mm q${nivel(g)}${prox.has(g) ? ' prox' : ''}${spEstado.grupo === g ? ' sel' : ''}" onclick="spEscolherGrupo('${g}')"><title>${nome} · ${quando}</title>${formas}</g>`;
  };
  const base = f => `<g class="mm-base">${f}</g>`;
  const frente = [
    base('<circle cx="50" cy="13" r="8.5"/><rect x="46" y="21" width="8" height="6" rx="2"/>' +
      '<ellipse cx="24.5" cy="70" rx="3.8" ry="9.5" transform="rotate(12 24.5 70)"/><ellipse cx="75.5" cy="70" rx="3.8" ry="9.5" transform="rotate(-12 75.5 70)"/>' +
      '<circle cx="22" cy="82" r="3"/><circle cx="78" cy="82" r="3"/>' +
      '<path d="M40 81 H60 L62 92 Q50 96 38 92 Z"/>' +
      '<circle cx="44" cy="128" r="3.4"/><circle cx="56" cy="128" r="3.4"/>' +
      '<ellipse cx="43" cy="162" rx="4.6" ry="2.6"/><ellipse cx="57" cy="162" rx="4.6" ry="2.6"/>'),
    reg('ombro', '<ellipse cx="33" cy="35" rx="7.5" ry="6.5"/><ellipse cx="67" cy="35" rx="7.5" ry="6.5"/>'),
    reg('peito', '<path d="M38 30 Q49 28 49.3 32 L49.3 46 Q43 49 37 45 Q35 37 38 30 Z"/><path d="M62 30 Q51 28 50.7 32 L50.7 46 Q57 49 63 45 Q65 37 62 30 Z"/>'),
    reg('abdomen', '<rect x="41.5" y="49" width="17" height="31" rx="5"/>'),
    '<path class="mm-linha" d="M50 51 V78 M42.5 58 H57.5 M42.5 65 H57.5 M43 72 H57"/>',
    reg('biceps', '<ellipse cx="28" cy="51" rx="4.6" ry="9" transform="rotate(10 28 51)"/><ellipse cx="72" cy="51" rx="4.6" ry="9" transform="rotate(-10 72 51)"/>'),
    reg('perna', '<ellipse cx="44" cy="109" rx="6.3" ry="16"/><ellipse cx="56" cy="109" rx="6.3" ry="16"/>' +
      '<ellipse cx="44" cy="145" rx="4.3" ry="13"/><ellipse cx="56" cy="145" rx="4.3" ry="13"/>')
  ].join('');
  const costas = [
    base('<circle cx="150" cy="13" r="8.5"/><rect x="146" y="21" width="8" height="5" rx="2"/>' +
      '<ellipse cx="124.5" cy="70" rx="3.8" ry="9.5" transform="rotate(12 124.5 70)"/><ellipse cx="175.5" cy="70" rx="3.8" ry="9.5" transform="rotate(-12 175.5 70)"/>' +
      '<circle cx="122" cy="82" r="3"/><circle cx="178" cy="82" r="3"/>' +
      '<circle cx="144" cy="129" r="3.4"/><circle cx="156" cy="129" r="3.4"/>' +
      '<ellipse cx="143" cy="162" rx="4.6" ry="2.6"/><ellipse cx="157" cy="162" rx="4.6" ry="2.6"/>'),
    reg('costas', '<path d="M143 24 L157 24 L166 31 L160 35 L140 35 L134 31 Z"/>' +
      '<path d="M139 36 L161 36 L163 51 Q158 65 153 75 L147 75 Q142 65 137 51 Z"/>' +
      '<rect x="143.5" y="76" width="13" height="8" rx="3"/>'),
    reg('ombro', '<ellipse cx="133" cy="35" rx="7.5" ry="6.5"/><ellipse cx="167" cy="35" rx="7.5" ry="6.5"/>'),
    reg('triceps', '<ellipse cx="128" cy="51" rx="4.6" ry="9" transform="rotate(10 128 51)"/><ellipse cx="172" cy="51" rx="4.6" ry="9" transform="rotate(-10 172 51)"/>'),
    reg('gluteo', '<ellipse cx="144.5" cy="92" rx="6.5" ry="7"/><ellipse cx="155.5" cy="92" rx="6.5" ry="7"/>'),
    reg('perna', '<ellipse cx="144" cy="113" rx="6" ry="14"/><ellipse cx="156" cy="113" rx="6" ry="14"/>' +
      '<ellipse cx="144" cy="146" rx="5" ry="12"/><ellipse cx="156" cy="146" rx="5" ry="12"/>')
  ].join('');
  if (papel) {
    const caixa = papel.lado === 'frente' ? '14 0 72 168' : papel.lado === 'costas' ? '114 0 72 168' : '14 0 172 177';
    return `<svg class="sp-mapa ex-mapa" viewBox="${caixa}" role="img" aria-label="Músculos que o exercício trabalha">
      ${papel.lado === 'costas' ? '' : frente}${papel.lado === 'frente' ? '' : costas}
      ${papel.lado ? '' : '<text class="mm-rot" x="50" y="174">FRENTE</text><text class="mm-rot" x="150" y="174">COSTAS</text>'}</svg>`;
  }
  return `<svg class="sp-mapa" viewBox="14 0 172 177" role="img" aria-label="Mapa dos músculos treinados">
    ${frente}${costas}
    <text class="mm-rot" x="50" y="174">FRENTE</text><text class="mm-rot" x="150" y="174">COSTAS</text></svg>`;
}

function spEscolherGrupo(g) { spEstado.grupo = spEstado.grupo === g ? '' : g; spEstado.dia = ''; renderPainelSaude(); }
function spEscolherDia(iso) { spEstado.dia = spEstado.dia === iso ? '' : iso; spEstado.grupo = ''; renderPainelSaude(); }
function spBancoDoGrupo(g) {
  abrirBancoExercicios({ tipo: 'treino' });
  exBancoFiltro.grupo = g; renderFiltrosBanco(); renderBancoExercicios();
}

function spQuadroTreino() {
  const hoje = hojeISO();
  const rec = spRecenciaGrupos();
  const treinoHoje = workouts.filter(w => w.date === hoje);
  const sug = treinoHoje.length ? null : proximoDiaDeTreino();
  const prox = new Set(sug ? sug.dia.exercicios.map(e => e.grupo).filter(Boolean) : []);
  // a semana corrente, de domingo a sábado
  const ini = inicioSemanaISO();
  const semana = workouts.filter(w => w.date >= ini && w.date <= spSomaDias(ini, 6));
  const minutos = semana.reduce((a, w) => a + (Number(w.minutes) || 0), 0);
  const letras = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const dias = letras.map((l, i) => {
    const iso = spSomaDias(ini, i);
    const ws = workouts.filter(w => w.date === iso);
    const ic = ws.length ? (TIPOS_TREINO[ws[0].type] || TIPOS_TREINO.outro)[0] : '';
    const cls = ['sp-dia', ws.length ? 'on' : '', iso === hoje ? 'hoje' : '', iso > hoje ? 'futuro' : '', spEstado.dia === iso ? 'sel' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" onclick="spEscolherDia('${iso}')" title="${diaSemanaCurto(iso)} ${isoParaBR(iso).slice(0, 5)}${ws.length ? ' · ' + palavra(ws.length, 'treino', 'treinos') : ''}"><i>${ic}</i><small>${l}</small></button>`;
  }).join('');

  // a linha de detalhe: o músculo tocado, o dia tocado, ou a dica
  let info = '<span class="sp-dica">Toque num músculo ou num dia da semana.</span>';
  if (spEstado.grupo) {
    const g = spEstado.grupo; const x = rec[g]; const nome = (GRUPOS_MUSC[g] || ['', g]);
    const feitos = x ? (x.treino.exercises || []).filter(l => spGrupoDaLinha(l) === g).map(l => l.replace(/\s+\d+\s*[x×].*$/i, '')) : [];
    info = `<span><strong>${nome[0]} ${esc(nome[1])}</strong> · ${x ? spHaQuanto(x.dias) + (feitos.length ? ' — ' + esc(feitos.slice(0, 3).join(', ')) : '') : 'parado há mais de 14 dias'}</span>
      <button type="button" class="mini-btn" onclick="spBancoDoGrupo('${g}')">📚 exercícios</button>`;
  } else if (spEstado.dia) {
    const ws = workouts.filter(w => w.date === spEstado.dia);
    info = `<span><strong>${diaSemanaCurto(spEstado.dia)} ${isoParaBR(spEstado.dia).slice(0, 5)}</strong> · ${ws.length ? ws.map(w => { const t = TIPOS_TREINO[w.type] || TIPOS_TREINO.outro; return `${t[0]} ${esc(w.note || t[1])}${w.minutes ? ' · ' + w.minutes + ' min' : ''}`; }).join(' + ') : (spEstado.dia > hoje ? 'ainda vem aí' : 'descanso')}</span>`;
  }

  let hojeHtml;
  const vivo = typeof treinoEmAndamento === 'function' ? treinoEmAndamento() : null;
  if (vivo) {
    // S1: um treino ao vivo aberto neste aparelho manda no quadro — "continuar" é o que ele quer ver
    hojeHtml = `<div class="sp-hoje vivo"><span><strong>▶ ${esc(vivo.titulo)}</strong><small>em andamento · ${tvFeitas(vivo)} de ${tvTotalSeries(vivo)} séries</small></span>
      <button type="button" class="btn-treinar" onclick="treinoAoVivo()">Continuar</button></div>`;
  } else if (treinoHoje.length) {
    const t = treinoHoje[0]; const ic = TIPOS_TREINO[t.type] || TIPOS_TREINO.outro;
    hojeHtml = `<div class="sp-hoje feito"><span>✓ <strong>Treino de hoje feito</strong><small>${ic[0]} ${esc(t.note || ic[1])}${t.minutes ? ' · ' + t.minutes + ' min' : ''}</small></span></div>`;
  } else if (sug) {
    const ha = sug.quando === '0000-00-00' ? 'nunca treinado' : 'último ' + rotuloData(sug.quando).toLowerCase();
    hojeHtml = `<div class="sp-hoje"><span><strong>Hoje: ${esc(sug.dia.nome)}</strong><small>${esc(sug.ficha.nome)} · ${ha} · tracejado no mapa</small></span>
      <button type="button" class="btn-treinar" onclick="treinoAoVivo(${sug.ficha.id}, ${sug.i})">▶ Treinar</button></div>`;
  } else {
    hojeHtml = `<div class="sp-hoje"><span><strong>Sem ficha montada</strong><small>Com uma ficha, o painel sugere o treino do dia.</small></span>
      <button type="button" class="btn-treinar" onclick="verSecaoSaude('treinos')">Montar</button></div>`;
  }
  const extras = ['cardio', 'mobilidade'].map(g => {
    const x = rec[g]; const n = GRUPOS_MUSC[g];
    return `<button type="button" class="sp-extra q${!x ? 0 : x.dias <= 1 ? 3 : x.dias <= 3 ? 2 : x.dias <= 7 ? 1 : 0}${spEstado.grupo === g ? ' sel' : ''}" onclick="spEscolherGrupo('${g}')">${n[0]} ${n[1]}<small>${x ? spHaQuanto(x.dias) : '—'}</small></button>`;
  }).join('');

  return `<section class="sp-quadro sp-treino">
    <button type="button" class="sp-cab" onclick="verSecaoSaude('treinos')"><span class="sp-ic">🏋️</span><span class="sp-tit">Treino</span>
      <small>${plural(semana.length, 'treino', 'treinos')} · ${minutos} min nesta semana</small><span class="sp-ir">›</span></button>
    <div class="sp-treino-corpo">
      ${spMapaMuscular(rec, prox)}
      <div class="sp-lado">
        <div class="sp-semana">${dias}</div>
        <div class="sp-extras">${extras}</div>
        <div class="sp-legenda"><i class="q3"></i>até ontem <i class="q2"></i>2–3 dias <i class="q1"></i>4–7 <i class="q0"></i>parado</div>
      </div>
    </div>
    <div class="sp-info">${info}</div>
    ${hojeHtml}
  </section>`;
}

// ═════════════════════════════ 2. CORPO ═══════════════════════════════════
/** O último valor registrado de um campo (a última pesagem pode não ter cintura). */
function spUltimo(campo) {
  return [...measures].filter(m => Number(m[campo]) > 0 && m.date).sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}
function spSeriePeso() {
  const todos = [...measures].filter(m => Number(m.weight) > 0 && m.date).sort((a, b) => a.date.localeCompare(b.date));
  const lim = { '1m': 31, '3m': 92, '1a': 366 }[spEstado.faixaPeso];
  const corte = lim ? todos.filter(m => spDias(m.date) <= lim) : todos;
  // faixa curta demais para desenhar? mostra as últimas pesagens, sem esconder nada
  return corte.length >= 2 ? corte : todos.slice(-12);
}
const SP_SERIES = {};
/** A linha do peso — viva: o dedo (ou o mouse) mostra data e valor de cada
 *  pesagem; a faixa verde é o peso saudável para a altura; o tracejado é a meta. */
function spGraficoPeso(onde, A, largura) {
  const pts = spSeriePeso();
  if (pts.length < 2) return `<div class="sp-vazio">${pts.length ? 'Mais uma pesagem e a linha aparece.' : 'Registre o peso para ver a linha.'}</div>`;
  // a largura do desenho acompanha o lugar: no quadro ~320, na seção ~700 —
  // senão o texto do eixo cresce junto com o gráfico e fica gigante
  const L = largura || 320, mx = 30, mr = 10, mt = 10, mb = 18;
  const c = perfilCorpo(); const ideal = pesoIdeal(c.altura); const meta = Number(c.meta) || 0;
  const ys = pts.map(p => Number(p.weight));
  let min = Math.min(...ys), max = Math.max(...ys);
  if (meta && meta > min - 6 && meta < max + 6) { min = Math.min(min, meta); max = Math.max(max, meta); }
  const folga = Math.max(0.6, (max - min) * 0.18); min -= folga; max += folga;
  const t0 = new Date(pts[0].date + 'T12:00:00').getTime(), t1 = new Date(pts[pts.length - 1].date + 'T12:00:00').getTime();
  const px = iso => mx + (t1 === t0 ? 0.5 : (new Date(iso + 'T12:00:00').getTime() - t0) / (t1 - t0)) * (L - mx - mr);
  const py = y => mt + (1 - (y - min) / (max - min)) * (A - mt - mb);
  let faixa = '';
  if (ideal) {
    const topo = Math.min(max, ideal.max), chao = Math.max(min, ideal.min);
    if (topo > chao) faixa = `<rect class="sp-g-faixa" x="${mx}" y="${py(topo).toFixed(1)}" width="${L - mx - mr}" height="${(py(chao) - py(topo)).toFixed(1)}"><title>Peso saudável para a sua altura: ${spNum(ideal.min)}–${spNum(ideal.max)} kg</title></rect>`;
  }
  const grade = [0, 0.5, 1].map(f => { const v = min + (max - min) * (1 - f); const y = py(v);
    return `<line class="sp-g-grade" x1="${mx}" x2="${L - mr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="sp-g-eixo" x="${mx - 4}" y="${(y + 3).toFixed(1)}">${spNum(v)}</text>`; }).join('');
  const linha = pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.date).toFixed(1)} ${py(p.weight).toFixed(1)}`).join(' ');
  const area = `${linha} L${px(pts[pts.length - 1].date).toFixed(1)} ${A - mb} L${px(pts[0].date).toFixed(1)} ${A - mb} Z`;
  const metaL = meta ? `<line class="sp-g-meta" x1="${mx}" x2="${L - mr}" y1="${py(meta).toFixed(1)}" y2="${py(meta).toFixed(1)}"/><text class="sp-g-meta-t" x="${L - mr}" y="${(py(meta) - 3).toFixed(1)}">meta ${spNum(meta)}</text>` : '';
  const pontos = pts.map(p => `<circle class="sp-g-ponto" cx="${px(p.date).toFixed(1)}" cy="${py(p.weight).toFixed(1)}" r="2.4"/>`).join('');
  SP_SERIES[onde] = pts.map(p => ({ x: px(p.date), y: py(p.weight), p }));
  return `<div class="sp-graf">
    <svg viewBox="0 0 ${L} ${A}" onpointermove="spGrafMover(event, '${onde}')" onpointerdown="spGrafMover(event, '${onde}')" onpointerleave="spGrafSair(event)">
      ${faixa}${grade}<path class="sp-g-area" d="${area}"/><path class="sp-g-linha" d="${linha}"/>${metaL}${pontos}
      <text class="sp-g-eixo ini" x="${mx}" y="${A - 4}">${isoParaBR(pts[0].date).slice(0, 5)}</text>
      <text class="sp-g-eixo fim" x="${L - mr}" y="${A - 4}">${isoParaBR(pts[pts.length - 1].date).slice(0, 5)}</text>
      <g class="sp-g-mira" style="display:none"><line x1="0" x2="0" y1="${mt}" y2="${A - mb}"/><circle r="4.5" cx="0" cy="0"/></g>
    </svg><div class="sp-g-dica" hidden></div></div>`;
}
function spGrafMover(ev, onde) {
  const svg = ev.currentTarget; const s = SP_SERIES[onde]; if (!s || !s.length) return;
  const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
  const x = (ev.clientX - r.left) / r.width * vb.width;
  let k = 0; s.forEach((q, i) => { if (Math.abs(q.x - x) < Math.abs(s[k].x - x)) k = i; });
  const q = s[k];
  const mira = svg.querySelector('.sp-g-mira');
  mira.style.display = '';
  mira.querySelector('line').setAttribute('x1', q.x); mira.querySelector('line').setAttribute('x2', q.x);
  mira.querySelector('circle').setAttribute('cx', q.x); mira.querySelector('circle').setAttribute('cy', q.y);
  const dica = svg.parentElement.querySelector('.sp-g-dica');
  const ant = s[k - 1];
  const dif = ant ? Number(q.p.weight) - Number(ant.p.weight) : 0;
  dica.innerHTML = `<strong>${spNum(q.p.weight)} kg</strong><small>${diaSemanaCurto(q.p.date)} ${isoParaBR(q.p.date)}${ant ? ` · ${dif > 0 ? '+' : ''}${spNum(dif)} kg` : ''}</small>`;
  dica.hidden = false;
  const larg = r.width;
  const esq = Math.max(0, Math.min(larg - 120, q.x / vb.width * larg - 60));
  dica.style.left = esq + 'px';
}
function spGrafSair(ev) {
  const svg = ev.currentTarget;
  const mira = svg.querySelector('.sp-g-mira'); if (mira) mira.style.display = 'none';
  const dica = svg.parentElement.querySelector('.sp-g-dica'); if (dica) dica.hidden = true;
}
function spFaixaPeso(k) { spEstado.faixaPeso = k; renderPainelSaude(); if (typeof renderMedidas === 'function') renderMedidas(); }
function spFaixasHtml() {
  return `<div class="sp-faixas">${[['1m', '1 mês'], ['3m', '3 meses'], ['1a', '1 ano'], ['tudo', 'tudo']].map(([k, r]) =>
    `<button type="button" class="${spEstado.faixaPeso === k ? 'on' : ''}" onclick="spFaixaPeso('${k}')">${r}</button>`).join('')}</div>`;
}

/** O ponteiro do IMC: meia-lua com as faixas da OMS, de 15 a 40. */
function spMedidorIMC(imc) {
  const cx = 60, cy = 56, R = 44;
  const ang = v => Math.PI * (1 - (Math.min(40, Math.max(15, v)) - 15) / 25);
  const pt = (v, r) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const arcos = IMC_FAIXAS.map(([lo, hi, rot, cor]) => {
    const a = Math.max(15, lo) + 0.25, b = Math.min(40, hi) - 0.25; if (b <= a) return '';
    const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${cor}" class="sp-imc-arco${imc && imc.valor >= lo && imc.valor < hi ? ' ativo' : ''}"><title>${rot}: ${lo}–${hi > 99 ? '' : hi}</title></path>`;
  }).join('');
  let agulha = '';
  if (imc) { const [x, y] = pt(imc.valor, R - 12); agulha = `<line class="sp-imc-agulha" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle class="sp-imc-eixo" cx="${cx}" cy="${cy}" r="3.5"/>`; }
  return `<svg class="sp-imc" viewBox="0 0 120 64" role="img" aria-label="IMC">${arcos}${agulha}</svg>`;
}

function spPesarHoje() {
  const el = document.getElementById('sp-peso-novo'); if (!el) return;
  const v = parseFloat(String(el.value).replace(',', '.'));
  if (!v || v < 20 || v > 400) { toast('Digite o peso em kg (ex.: 76,4).'); el.focus(); return; }
  const hoje = hojeISO();
  const m = measures.find(x => x.date === hoje);
  if (m) m.weight = v; else measures.push({ id: novoId(), date: hoje, weight: v, note: '' });
  salvar('measures', measures); renderSaude();
  toast(`⚖️ Peso de hoje: ${spNum(v)} kg.`);
}
function spDefinirMeta() {
  const c = perfilCorpo();
  const v = prompt('Meta de peso (kg). Deixe vazio para tirar a meta:', c.meta ? spNum(c.meta) : '');
  if (v === null) return;
  const n = parseFloat(String(v).replace(',', '.'));
  c.meta = n > 20 && n < 400 ? n : 0;
  salvar('profile', profile); renderSaude();
}
/** Os sinais vitais em chips com a cor da referência — sem barra nenhuma. */
function spVitais() {
  const c = perfilCorpo(); const out = [];
  const p = spUltimo('sis');
  if (p && p.dia) {
    const cor = (p.sis >= 140 || p.dia >= 90) ? 'var(--perigo)' : (p.sis >= 130 || p.dia >= 85) ? 'var(--atencao)' : 'var(--ok)';
    out.push([cor, `🩺 ${p.sis}/${p.dia}`, `Pressão em ${isoParaBR(p.date)} · referência abaixo de 130/85`]);
  }
  const b = spUltimo('bpm');
  if (b) out.push([b.bpm > 100 || b.bpm < 50 ? 'var(--atencao)' : 'var(--ok)', `💓 ${b.bpm} bpm`, `Batimento em repouso em ${isoParaBR(b.date)}`]);
  const w = spUltimo('waist');
  if (w) { const r = riscoCintura(w.waist, c.sexo); out.push([r ? r.cor : 'var(--txt3)', `📏 ${spNum(w.waist, w.waist % 1 ? 1 : 0)} cm`, `Cintura em ${isoParaBR(w.date)}${r ? ' · risco ' + r.rotulo : ''}`]); }
  const f = spUltimo('fat');
  if (f) out.push(['var(--rosa)', `🔥 ${spNum(f.fat)}% gordura`, `Em ${isoParaBR(f.date)}`]);
  if (!out.length) return '';
  return `<div class="sp-vitais">${out.map(([cor, t, tt]) => `<span class="sp-vital" style="--c:${cor}" title="${esc(tt)}"><i></i>${t}</span>`).join('')}</div>`;
}

// ── S3 (09/10): O CORPO ALÉM DO IMC ──────────────────────────────────────────
// Ditado dele: "só tem IMC, que não é justo para todo corpo". O IMC não separa músculo de gordura.
// Entram: cintura/altura, % de gordura (medida, ou estimada pela fórmula da Marinha dos EUA com
// pescoço e cintura), massa magra, FFMI (o "IMC de quem treina"), metabolismo de repouso, gasto do
// dia e as metas de proteína e água. Referências de consenso (OMS, ACE, Mifflin-St Jeor,
// Katch-McArdle) — referência, não diagnóstico. Tudo calculado do que já existe: nada novo sincroniza.
function spIdade(nasc) {
  if (!nasc) return 0;
  const n = new Date(nasc + 'T12:00:00'), h = new Date();
  let a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--;
  return a > 0 && a < 120 ? a : 0;
}
/** % de gordura pela fita métrica (Marinha dos EUA, em cm). Mulher precisa do quadril. */
function spGorduraMarinha(sexo, alturaCm, cintura, pescoco, quadril) {
  const L = Math.log10;
  if (!alturaCm || !cintura || !pescoco) return null;
  let v;
  if (sexo === 'f') { if (!quadril || cintura + quadril - pescoco <= 0) return null; v = 495 / (1.29579 - 0.35004 * L(cintura + quadril - pescoco) + 0.22100 * L(alturaCm)) - 450; }
  else if (sexo === 'm') { if (cintura - pescoco <= 0) return null; v = 495 / (1.0324 - 0.19077 * L(cintura - pescoco) + 0.15456 * L(alturaCm)) - 450; }
  else return null;
  return v > 2 && v < 60 ? v : null;
}
/** Treinos por semana nas últimas 4 semanas (dá o fator de atividade e a meta de proteína). */
function spTreinosPorSemana() { const corte = spSomaDias(hojeISO(), -28); return workouts.filter(w => w.date && w.date > corte && w.date <= hojeISO()).length / 4; }
/** As faixas de cada indicador. Função (e não constante): o IMC_FAIXAS mora no app.js, que carrega depois. */
function spZonas(k, sexo) {
  const f = sexo === 'f';
  return {
    imc: { min: 15, max: 40, casas: 1, faixas: IMC_FAIXAS.map(([a, b, r, c]) => [a, b, r, c]) },
    rce: { min: 0.3, max: 0.7, casas: 2, faixas: [[0, 0.4, 'abaixo', '#38bdf8'], [0.4, 0.5, 'saudável', '#22c55e'], [0.5, 0.6, 'atenção', '#fbbf24'], [0.6, 9, 'alto', '#ef4444']] },
    gordura: { min: 5, max: 45, casas: 1, faixas: f
      ? [[0, 14, 'essencial', '#38bdf8'], [14, 21, 'atleta', '#22c55e'], [21, 25, 'boa forma', '#4ade80'], [25, 32, 'média', '#fbbf24'], [32, 99, 'alta', '#ef4444']]
      : [[0, 6, 'essencial', '#38bdf8'], [6, 14, 'atleta', '#22c55e'], [14, 18, 'boa forma', '#4ade80'], [18, 25, 'média', '#fbbf24'], [25, 99, 'alta', '#ef4444']] },
    ffmi: { min: 12, max: 28, casas: 1, faixas: f
      ? [[0, 14, 'abaixo da média', '#38bdf8'], [14, 17, 'na média', '#4ade80'], [17, 19, 'acima da média', '#22c55e'], [19, 22, 'excelente', '#a78bfa'], [22, 99, 'muito alto', '#f472b6']]
      : [[0, 18, 'abaixo da média', '#38bdf8'], [18, 20, 'na média', '#4ade80'], [20, 22, 'acima da média', '#22c55e'], [22, 25, 'excelente', '#a78bfa'], [25, 99, 'muito alto', '#f472b6']] }
  }[k];
}
function spFaixaDe(v, z) { return z.faixas.find(([a, b]) => v >= a && v < b) || z.faixas[z.faixas.length - 1]; }
/** Tudo o que dá para tirar das medidas e do perfil. Cada item diz o que FALTA quando não dá. */
function spIndicadores() {
  const c = perfilCorpo(), hcm = Number(c.altura) || 0, h = hcm / 100, sexo = c.sexo, idade = spIdade(c.nascimento);
  const p = spUltimo('weight'), w = spUltimo('waist'), hp = spUltimo('hip'), nk = spUltimo('neck'), fm = spUltimo('fat');
  const peso = p ? Number(p.weight) : 0, o = { sexo, idade };
  o.imc = peso && h ? { v: peso / h / h } : null;
  o.rce = w && hcm ? { v: Number(w.waist) / hcm, data: w.date } : null;
  o.rcq = w && hp ? calcRCQ(Number(w.waist), Number(hp.hip), sexo) : null;
  if (fm) o.gordura = { v: Number(fm.fat), fonte: 'medida', data: fm.date };
  else { const v = spGorduraMarinha(sexo, hcm, w && Number(w.waist), nk && Number(nk.neck), hp && Number(hp.hip)); o.gordura = v ? { v, fonte: 'estimada pela fita (Marinha)' } : null; }
  if (o.gordura && peso) {
    o.magra = { v: peso * (1 - o.gordura.v / 100), gordura: peso * o.gordura.v / 100 };
    if (h) o.ffmi = { v: o.magra.v / h / h + 6.1 * (1.8 - h) };
  }
  if (o.magra) o.tmb = { v: 370 + 21.6 * o.magra.v, formula: 'Katch-McArdle (pela massa magra)' };
  else if (peso && hcm && idade && sexo) o.tmb = { v: 10 * peso + 6.25 * hcm - 5 * idade + (sexo === 'f' ? -161 : 5), formula: 'Mifflin-St Jeor' };
  const tps = spTreinosPorSemana(), fator = tps >= 5 ? 1.725 : tps >= 3 ? 1.55 : tps >= 1 ? 1.375 : 1.2;
  if (o.tmb) o.gasto = { v: o.tmb.v * fator, fator, tps };
  if (peso) {
    const [a, b] = tps >= 3 ? [1.6, 2.2] : tps >= 1 ? [1.2, 1.6] : [0.8, 1.2];
    o.prot = { min: peso * a, max: peso * b, a, b }; o.agua = { v: peso * 35 };
  }
  // o que falta para cada um (a dica que aparece no lugar do número)
  const faltam = l => l.filter(Boolean).join(', ');
  o.falta = {
    imc: faltam([!hcm && 'a altura', !peso && 'o peso']),
    rce: faltam([!hcm && 'a altura', !w && 'a cintura']),
    gordura: faltam([!sexo && 'a referência (masc./fem.)', !hcm && 'a altura', !w && 'a cintura', !nk && 'o pescoço', sexo === 'f' && !hp && 'o quadril']),
    tmb: faltam([!peso && 'o peso', !o.gordura && !hcm && 'a altura', !o.gordura && !idade && 'a data de nascimento', !o.gordura && !sexo && 'a referência (masc./fem.)'])
  };
  return o;
}
/** O medidor em meia-lua, para qualquer indicador com faixas (o do IMC virou caso particular). */
function spMedidor(valor, z) {
  const cx = 60, cy = 56, R = 44;
  const ang = v => Math.PI * (1 - (Math.min(z.max, Math.max(z.min, v)) - z.min) / (z.max - z.min));
  const pt = (v, r) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const folga = (z.max - z.min) / 100;
  const arcos = z.faixas.map(([lo, hi, rot, cor]) => {
    const a = Math.max(z.min, lo) + folga, b = Math.min(z.max, hi) - folga; if (b <= a) return '';
    const [x1, y1] = pt(a, R), [x2, y2] = pt(b, R);
    return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${cor}" class="sp-imc-arco${valor !== null && valor >= lo && valor < hi ? ' ativo' : ''}"><title>${rot}</title></path>`;
  }).join('');
  let agulha = '';
  if (valor !== null && valor !== undefined) { const [x, y] = pt(valor, R - 12); agulha = `<line class="sp-imc-agulha" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><circle class="sp-imc-eixo" cx="${cx}" cy="${cy}" r="3.5"/>`; }
  return `<svg class="sp-imc" viewBox="0 0 120 64" role="img">${arcos}${agulha}</svg>`;
}
/** Régua fina com as faixas e um marcador (nos cartões da seção Corpo). */
function spRegua(valor, z) {
  const pos = v => ((Math.min(z.max, Math.max(z.min, v)) - z.min) / (z.max - z.min) * 100);
  const seg = z.faixas.map(([lo, hi, rot, cor]) => { const a = pos(Math.max(lo, z.min)), b = pos(Math.min(hi, z.max)); return b > a ? `<i style="left:${a.toFixed(1)}%; width:${(b - a).toFixed(1)}%; background:${cor}" title="${rot}"></i>` : ''; }).join('');
  return `<span class="sp-regua">${seg}${valor !== null && valor !== undefined ? `<b style="left:${pos(valor).toFixed(1)}%"></b>` : ''}</span>`;
}
const SP_IND_NOMES = { rce: 'Cintura/altura', gordura: 'Gordura', ffmi: 'FFMI', imc: 'IMC' };
function spEscolherIndicador(k) { spEstado.indicador = k; renderPainelSaude(); }
/** O medidor do quadro Corpo: escolhe-se o indicador (começa pelo mais justo que houver). */
function spCaixaIndicador() {
  const o = spIndicadores();
  const tem = Object.keys(SP_IND_NOMES).filter(k => o[k]);
  if (!tem.length) return `<div class="sp-imc-box">${spMedidorIMC(null)}<button type="button" class="sp-meta" onclick="verSecaoSaude('medidas')">${perfilCorpo().altura ? 'falta o peso' : 'informe a altura'}</button></div>`;
  const k = tem.includes(spEstado.indicador) ? spEstado.indicador : tem[0];
  const z = spZonas(k, o.sexo), v = o[k].v, f = spFaixaDe(v, z);
  const val = k === 'gordura' ? spNum(v) + '%' : spNum(v, z.casas);
  // o nome do indicador é o botão de trocar (cabe nos 118 px do quadro, onde quatro abas não cabiam)
  const prox = tem[(tem.indexOf(k) + 1) % tem.length];
  return `<div class="sp-imc-box">
    ${tem.length > 1 ? `<button type="button" class="sp-ind-troca" onclick="spEscolherIndicador('${prox}')" title="Trocar: ${tem.map(x => SP_IND_NOMES[x]).join(' · ')}">${SP_IND_NOMES[k]} ⇄</button>` : `<small class="sp-ind-troca">${SP_IND_NOMES[k]}</small>`}
    ${spMedidor(v, z)}<span class="sp-imc-val" style="color:${f[3]}">${val}</span><small>${f[2]}${k === 'gordura' && o.gordura.fonte !== 'medida' ? ' · estimada' : ''}</small></div>`;
}
/** Os cartões da seção Corpo: cada indicador com número, faixa, régua e uma linha do porquê. */
function spCartoesIndicadores() {
  const o = spIndicadores(), sx = o.sexo;
  const cartao = (tit, valor, faixa, regua, porque, extra) => `<div class="sp-ind${valor ? '' : ' vazio'}"${faixa ? ` style="--c:${faixa[3]}"` : ''}>
      <small class="sp-ind-tit">${tit}</small>
      <strong>${valor || '—'}</strong>${faixa ? `<span class="sp-ind-faixa">${faixa[2]}</span>` : ''}
      ${regua || ''}<p>${porque}</p>${extra || ''}</div>`;
  const falta = k => o.falta[k] ? `Falta ${o.falta[k]}.` : '';
  const zR = spZonas('rce', sx), zG = spZonas('gordura', sx), zF = spZonas('ffmi', sx), zI = spZonas('imc', sx);
  const L = [];
  L.push(cartao('Cintura / altura', o.rce && spNum(o.rce.v, 2), o.rce && spFaixaDe(o.rce.v, zR), o.rce && spRegua(o.rce.v, zR),
    o.rce ? 'A gordura da barriga, a mais ligada a risco. Meta: a cintura menor que a metade da altura (abaixo de 0,5).' : falta('rce')));
  L.push(cartao(`Gordura corporal${o.gordura && o.gordura.fonte !== 'medida' ? ' · estimada' : ''}`, o.gordura && spNum(o.gordura.v) + '%', o.gordura && spFaixaDe(o.gordura.v, zG), o.gordura && spRegua(o.gordura.v, zG),
    o.gordura ? (o.gordura.fonte === 'medida' ? `Medida em ${isoParaBR(o.gordura.data)}.` : 'Pela fita: pescoço, cintura' + (sx === 'f' ? ' e quadril' : '') + ' (fórmula da Marinha dos EUA). Bioimpedância ou dobras são mais precisas.') : falta('gordura')));
  L.push(cartao('Massa magra', o.magra && spNum(o.magra.v) + ' kg', null, '',
    o.magra ? `Músculo, osso e água. Gordura: ${spNum(o.magra.gordura)} kg.` : 'Sai do peso e da % de gordura.'));
  L.push(cartao('FFMI', o.ffmi && spNum(o.ffmi.v), o.ffmi && spFaixaDe(o.ffmi.v, zF), o.ffmi && spRegua(o.ffmi.v, zF),
    o.ffmi ? 'Massa magra para a altura — o "IMC de quem treina": sobe com músculo, não com gordura.' : 'Sai da massa magra e da altura.'));
  L.push(cartao('IMC', o.imc && spNum(o.imc.v), o.imc && spFaixaDe(o.imc.v, zI), o.imc && spRegua(o.imc.v, zI),
    o.imc ? 'Peso para a altura. Não separa músculo de gordura: olhe junto com a cintura e a gordura.' : falta('imc')));
  if (o.rcq) L.push(cartao('Cintura / quadril', spNum(o.rcq.valor, 2), [0, 0, o.rcq.alto ? 'acima da referência' : 'dentro da faixa', o.rcq.alto ? '#ef4444' : '#22c55e'], '',
    `Referência da OMS: até ${spNum(o.rcq.limite, 2)}.`));
  L.push(cartao('Metabolismo de repouso', o.tmb && Math.round(o.tmb.v).toLocaleString('pt-BR') + ' kcal', null, '',
    o.tmb ? `O que o corpo gasta parado, por dia (${o.tmb.formula}).` : falta('tmb')));
  L.push(cartao('Gasto do dia', o.gasto && '~' + (Math.round(o.gasto.v / 10) * 10).toLocaleString('pt-BR') + ' kcal', null, '',
    o.gasto ? `Repouso × ${String(o.gasto.fator).replace('.', ',')} — ${spNum(o.gasto.tps, 1)} treinos por semana nas últimas 4.` : 'Sai do metabolismo de repouso e dos treinos.'));
  L.push(cartao('Proteína por dia', o.prot && `${Math.round(o.prot.min)}–${Math.round(o.prot.max)} g`, null, '',
    o.prot ? `${spNum(o.prot.a)}–${spNum(o.prot.b)} g por kg, pelo ritmo de treino.` : falta('imc')));
  L.push(cartao('Água por dia', o.agua && spNum(o.agua.v / 1000) + ' L', null, '',
    o.agua ? '35 ml por kg; nos dias de treino, meio litro a mais.' : 'Sai do peso.',
    o.agua && typeof hydration !== 'undefined' && Math.abs(hydration.goal - Math.round(o.agua.v / 100) * 100) >= 200 ? `<button type="button" class="mini-btn xs" onclick="spUsarMetaAgua(${Math.round(o.agua.v / 100) * 100})">usar como meta</button>` : ''));
  return `<div class="sp-inds">${L.join('')}</div>`;
}
/** S4 (09/10): o alto da Comida — o dia contra o que o corpo pede (energia × gasto, proteína × faixa, água × meta).
 *  Conta o que foi comido do plano em uso (refeições marcadas como feitas). */
function renderMetasDoDia() {
  const el = document.getElementById('sp-metas-dia'); if (!el) return;
  const o = spIndicadores(), d = typeof spFatiasDoDia === 'function' ? spFatiasDoDia() : { fatias: [] };
  let kF = 0, pF = 0; (d.fatias || []).forEach(f => { if (f.feita) f.itens.forEach(x => { kF += Number(x.kcal) || 0; pF += Number(x.prot) || 0; }); });
  const barra = (rot, feito, alvo, faixaMax, un, cor, dica) => {
    const pct = alvo ? Math.min(100, feito / (faixaMax || alvo) * 100) : 0, ini = faixaMax && alvo ? alvo / faixaMax * 100 : 0;
    return `<div class="sp-meta-dia" style="--c:${cor}" title="${dica}"><small>${rot}</small>
      <span class="sp-meta-barra"><i style="width:${pct.toFixed(1)}%"></i>${ini ? `<em style="left:${ini.toFixed(1)}%"></em>` : ''}</span>
      <b>${un === 'L' ? spNum(feito / 1000) : Math.round(feito).toLocaleString('pt-BR')}<small> / ${alvo ? (un === 'L' ? spNum(alvo / 1000) : (faixaMax ? Math.round(alvo) + '–' + Math.round(faixaMax) : '~' + (Math.round(alvo / 10) * 10).toLocaleString('pt-BR'))) : '—'} ${un}</small></b></div>`;
  };
  if (!o.gasto && !o.prot) { el.innerHTML = '<p class="hint">Com peso, altura e idade em <a href="#" onclick="verSecaoSaude(\'medidas\'); return false;">Corpo</a>, aqui aparecem as metas do dia (energia, proteína e água).</p>'; return; }
  el.innerHTML = `<div class="sp-metas-tit"><b>Hoje × o que o corpo pede</b><small>conta as refeições do plano marcadas como feitas</small></div>
    ${barra('Energia', kF, o.gasto && o.gasto.v, 0, 'kcal', 'var(--laranja)', 'Gasto estimado do dia (repouso × atividade)')}
    ${barra('Proteína', pF, o.prot && o.prot.min, o.prot && o.prot.max, 'g', 'var(--rosa)', 'Faixa pelo peso e pelo ritmo de treino; a marca é o mínimo')}
    ${barra('Água', hydration.ml || 0, hydration.goal || (o.agua && o.agua.v), 0, 'L', 'var(--info)', 'Meta de água do dia')}`;
}
function spUsarMetaAgua(ml) { hydration.goal = ml; salvar('hydration', hydration); renderSaude(); toast(`💧 Meta de água: ${spNum(ml / 1000)} L por dia.`); }

function spQuadroCorpo() {
  const c = perfilCorpo();
  const u = spUltimo('weight');
  // variação de ~30 dias: compara com a pesagem mais recente de 30 dias atrás ou antes
  let delta = '';
  if (u) {
    const antes = [...measures].filter(m => Number(m.weight) > 0 && m.date && spDias(m.date, u.date) >= 25).sort((a, b) => b.date.localeCompare(a.date))[0]
      || [...measures].filter(m => Number(m.weight) > 0 && m.date && m.date < u.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (antes) {
      const d = Number(u.weight) - Number(antes.weight); const dias = spDias(antes.date, u.date);
      const dir = Math.abs(d) < 0.05 ? 'igual' : d < 0 ? 'baixa' : 'alta';
      delta = `<span class="sp-delta ${dir}">${dir === 'igual' ? '＝' : dir === 'baixa' ? '▼' : '▲'} ${spNum(Math.abs(d))} kg em ${dias} dias</span>`;
    }
  }
  const meta = Number(c.meta) || 0;
  const metaTxt = meta && u ? `<button type="button" class="sp-meta" onclick="spDefinirMeta()" title="Mudar a meta">🎯 ${spNum(meta)} kg · ${Math.abs(u.weight - meta) < 0.05 ? 'na meta!' : 'faltam ' + spNum(Math.abs(u.weight - meta))}</button>`
    : `<button type="button" class="sp-meta" onclick="spDefinirMeta()">🎯 definir meta</button>`;
  return `<section class="sp-quadro sp-corpo">
    <button type="button" class="sp-cab" onclick="verSecaoSaude('medidas')"><span class="sp-ic">⚖️</span><span class="sp-tit">Corpo</span>
      <small>${u ? 'pesado ' + spHaQuanto(spDias(u.date)) : 'sem pesagem'}</small><span class="sp-ir">›</span></button>
    <div class="sp-corpo-topo">
      <div class="sp-peso"><strong>${u ? spNum(u.weight) : '—'}<small> kg</small></strong>${delta}${metaTxt}</div>
      ${spCaixaIndicador()}
    </div>
    ${spFaixasHtml()}
    ${spGraficoPeso('painel', 118)}
    <form class="sp-pesar" onsubmit="event.preventDefault(); spPesarHoje()">
      <input type="number" id="sp-peso-novo" step="0.1" min="20" max="400" inputmode="decimal" placeholder="peso de hoje (kg)" aria-label="Peso de hoje em kg">
      <button type="button" class="mini-btn" onclick="spPesarHoje()">＋ Pesar</button></form>
    ${spVitais()}
  </section>`;
}

// ═════════════════════════════ 3. COMIDA ══════════════════════════════════
function spTipoDaRefeicao(nome) {
  return /caf|manh/i.test(nome) ? 'cafe' : /almo/i.test(nome) ? 'almoco' : /jant/i.test(nome) ? 'jantar' : /ceia/i.test(nome) ? 'ceia' : 'lanche';
}
/** As fatias do prato de hoje: as refeições do plano em uso (ou as quatro
 *  de sempre) e, para cada uma, o que foi comido — pelo plano ou anotado à mão. */
function spFatiasDoDia() {
  const hoje = hojeISO();
  const plano = dietas.find(d => d.ativo && (d.refeicoes || []).length) || null;
  const doDia = meals.filter(m => m.date === hoje);
  const usadas = new Set();
  const base = plano
    ? plano.refeicoes.map((r, i) => ({ nome: r.nome, hora: r.hora || '', tipo: spTipoDaRefeicao(r.nome), plano: plano.id, i, itens: r.itens || [] }))
    : [['cafe', '07:00'], ['almoco', '12:00'], ['lanche', '16:00'], ['jantar', '20:00']].map(([t, h], i) => ({ nome: TIPOS_REFEICAO[t][1], hora: h, tipo: t, plano: null, i, itens: [] }));
  // 1º o que foi marcado PELO plano; depois o anotado à mão, pelo tipo
  base.forEach(f => { const m = f.plano ? doDia.find(x => x.planoRef === `${f.plano}:${f.i}`) : null; if (m) { f.feita = m; usadas.add(m.id); } });
  base.forEach(f => { if (f.feita) return; const m = doDia.find(x => !usadas.has(x.id) && x.type === f.tipo); if (m) { f.feita = m; usadas.add(m.id); } });
  const extras = doDia.filter(m => !usadas.has(m.id));
  const agora = new Date().toTimeString().slice(0, 5);
  const pend = base.filter(f => !f.feita);
  const proxima = pend.find(f => f.hora && f.hora >= agora) || pend[pend.length - 1] || null;
  return { plano, fatias: base, extras, proxima };
}
let spUltimasFatias = null;
function spPrato(d) {
  const n = d.fatias.length; const cx = 60, cy = 60, R = 44, folga = n > 1 ? 5 : 0;
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const fatias = d.fatias.map((f, i) => {
    const a0 = i * 360 / n + folga / 2, a1 = (i + 1) * 360 / n - folga / 2;
    const [x1, y1] = pt(a0, R), [x2, y2] = pt(a1, R);
    const grande = a1 - a0 > 180 ? 1 : 0;
    const q = f.feita ? 'q-' + (f.feita.quality || 'boa') : (f === d.proxima ? 'proxima' : 'pendente');
    const [ix, iy] = pt((a0 + a1) / 2, R);
    const ic = (TIPOS_REFEICAO[f.tipo] || ['🍽️'])[0];
    const caminho = n === 1 ? `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}` : `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${grande} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    return `<g class="sp-fatia ${q}${spEstado.fatia === i ? ' sel' : ''}" onclick="spTocarFatia(${i})"><title>${esc(f.nome)}${f.hora ? ' · ' + f.hora : ''}${f.feita ? ' · feita' : ''}</title>
      <path d="${caminho}"/><text x="${ix.toFixed(1)}" y="${(iy + 4).toFixed(1)}">${ic}</text></g>`;
  }).join('');
  const feitas = d.fatias.filter(f => f.feita).length;
  return `<svg class="sp-prato" viewBox="0 0 120 120" role="img" aria-label="Refeições de hoje">
    <circle class="sp-prato-fundo" cx="60" cy="60" r="31"/>${fatias}
    <text class="sp-prato-n" x="60" y="62">${feitas}/${n}</text>
    <text class="sp-prato-r" x="60" y="74">${d.extras.length ? '+' + d.extras.length + ' extra' : 'refeições'}</text></svg>`;
}
function spTocarFatia(i) {
  const d = spUltimasFatias || spFatiasDoDia(); const f = d.fatias[i]; if (!f) return;
  if (f.feita) { spEstado.fatia = spEstado.fatia === i ? -1 : i; renderPainelSaude(); return; }
  if (f.plano) { spEstado.fatia = i; segui(f.plano, f.i); return; }
  const o = prompt(`O que você comeu no ${f.nome.toLowerCase()}?`, '');
  if (!o || !o.trim()) return;
  const m = { id: novoId(), date: hojeISO(), time: new Date().toTimeString().slice(0, 5), type: f.tipo, desc: o.trim(), quality: 'boa' };
  meals.push(m); salvar('meals', meals); spEstado.fatia = i; renderSaude();
  toast('🍽️ Anotado. Como foi? Escolha a cor logo abaixo do prato.');
}
function spQualidade(id, q) {
  const m = meals.find(x => x.id === id); if (!m) return;
  m.quality = q; salvar('meals', meals); renderSaude();
}
/** O copo: enche conforme a meta; tocar nele é beber 250 ml. */
function spCopo(ml, meta) {
  const p = Math.max(0, Math.min(1, ml / (meta || 2500)));
  const topo = 10 + (1 - p) * 84;
  const contorno = 'M9 8 L55 8 L49.5 92 Q49 97 44 97 L20 97 Q15 97 14.5 92 Z';
  return `<svg class="sp-copo" viewBox="0 0 64 104" role="button" tabindex="0" aria-label="Beber 250 ml" onclick="beberAgua(250)" onkeydown="if(event.key==='Enter')beberAgua(250)">
    <title>Toque para beber 250 ml</title>
    <defs><clipPath id="sp-copo-clip"><path d="${contorno}"/></clipPath></defs>
    <g clip-path="url(#sp-copo-clip)">
      <rect class="sp-agua" x="0" y="${topo.toFixed(1)}" width="64" height="104"/>
      ${p > 0 && p < 1 ? `<path class="sp-onda" d="M-64 ${topo.toFixed(1)} q8 -3.5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V104 H-64 Z"/>` : ''}
    </g>
    <path class="sp-copo-borda" d="${contorno}"/>
    <path class="sp-copo-marca" d="M47 31 H53 M46 52 H52 M45 73 H51"/></svg>`;
}
/** Sete gotas: quanto de água em cada um dos últimos dias. */
function spGotas() {
  const meta = hydration.goal || 2500; const hoje = hojeISO(); const dias = hydration.dias || {};
  let h = '';
  for (let i = 6; i >= 0; i--) {
    const iso = spSomaDias(hoje, -i);
    const ml = i === 0 ? (hydration.ml || 0) : (dias[iso] || 0);
    const p = Math.min(1, ml / meta); const y = 2 + (1 - p) * 15;
    h += `<svg class="sp-gota${p >= 1 ? ' cheia' : ''}" viewBox="0 0 12 18"><title>${i === 0 ? 'Hoje' : diaSemanaCurto(iso)} · ${spNum(ml / 1000)} L</title>
      <defs><clipPath id="sp-gota-${i}"><path d="M6 1 C6 1 1 8 1 11.5 A5 5 0 0 0 11 11.5 C11 8 6 1 6 1 Z"/></clipPath></defs>
      <rect clip-path="url(#sp-gota-${i})" class="sp-gota-agua" x="0" y="${y.toFixed(1)}" width="12" height="18"/>
      <path class="sp-gota-borda" d="M6 1 C6 1 1 8 1 11.5 A5 5 0 0 0 11 11.5 C11 8 6 1 6 1 Z"/></svg>`;
  }
  return `<div class="sp-gotas" title="Os últimos 7 dias">${h}</div>`;
}
function spQuadroComida() {
  verificarNovoDiaAgua();
  const d = spFatiasDoDia(); spUltimasFatias = d;
  const meta = hydration.goal || 2500; const ml = hydration.ml || 0;
  // a linha de baixo: a fatia tocada, ou a próxima refeição
  let info = '';
  const sel = d.fatias[spEstado.fatia];
  if (sel && sel.feita) {
    const m = sel.feita;
    info = `<span><strong>${esc(sel.nome)}</strong>${m.time ? ' · ' + esc(m.time) : ''} · ${esc(m.desc).slice(0, 60)}</span>
      <span class="sp-qual">${Object.entries(QUALIDADE_REFEICAO).map(([k, v]) => `<button type="button" class="${m.quality === k ? 'on' : ''}" title="${v[1]}" onclick="spQualidade(${m.id}, '${k}')">${v[0]}</button>`).join('')}</span>`;
  } else if (d.proxima) {
    const f = d.proxima; const kc = f.itens.reduce((a, x) => a + (Number(x.kcal) || 0), 0);
    info = `<span>Próxima: <strong>${esc(f.nome)}</strong>${f.hora ? ' · ' + esc(f.hora) : ''}${f.itens.length ? ' — ' + esc(f.itens.map(x => x.alimento).join(', ')).slice(0, 50) : ''}${kc ? ' · ' + Math.round(kc) + ' kcal' : ''}</span>
      <button type="button" class="mini-btn" onclick="spTocarFatia(${d.fatias.indexOf(f)})">✓ comi</button>`;
  } else {
    info = '<span>Todas as refeições do dia marcadas. 👏</span>';
  }
  // o plano em números: o que já foi comido do combinado
  let macros = '';
  if (d.plano) {
    let kT = 0, pT = 0, kF = 0, pF = 0;
    d.fatias.forEach(f => f.itens.forEach(x => { kT += Number(x.kcal) || 0; pT += Number(x.prot) || 0; if (f.feita) { kF += Number(x.kcal) || 0; pF += Number(x.prot) || 0; } }));
    // S4 (09/10): comparar com as METAS DO CORPO (S3), não com o próprio plano ("620 de 620" não dizia nada)
    const o = spIndicadores();
    const kMeta = o.gasto ? Math.round(o.gasto.v / 10) * 10 : 0;
    if (kT || pT) macros = `<div class="sp-macros">${kT ? `<span title="${kMeta ? 'Contra o gasto estimado do dia' : 'Do total do plano'}"><b>${Math.round(kF)}</b> de ${kMeta ? '~' + kMeta.toLocaleString('pt-BR') : Math.round(kT)} kcal</span>` : ''}${pT ? `<span title="${o.prot ? 'Meta pelo peso e pelo ritmo de treino' : 'Do total do plano'}"><b>${Math.round(pF)}</b> de ${o.prot ? Math.round(o.prot.min) + '–' + Math.round(o.prot.max) : Math.round(pT)} g de proteína</span>` : ''}</div>`;
  }
  return `<section class="sp-quadro sp-comida">
    <button type="button" class="sp-cab" onclick="verSecaoSaude('comida')"><span class="sp-ic">🥗</span><span class="sp-tit">Comida</span>
      <small>${d.plano ? 'plano: ' + esc(d.plano.nome) : 'sem plano em uso'}</small><span class="sp-ir">›</span></button>
    <div class="sp-comida-corpo">
      <div class="sp-prato-box">${spPrato(d)}</div>
      <div class="sp-agua-box">
        ${spCopo(ml, meta)}
        <div class="sp-agua-txt"><strong>${spNum(ml / 1000)}</strong><small>de ${spNum(meta / 1000)} L</small></div>
        <div class="sp-agua-btns">
          <button type="button" class="mini-btn" onclick="beberAgua(500)">+500</button>
          <button type="button" class="mini-btn" onclick="beberAgua(-250)" title="Tirar 250 ml">−</button>
          <button type="button" class="mini-btn" onclick="definirMetaAgua()" title="Mudar a meta">🎯</button></div>
        ${spGotas()}
      </div>
    </div>
    <div class="sp-info">${info}</div>
    ${macros}
  </section>`;
}

// ═════════════════════════════ 4. MÉDICO ══════════════════════════════════
// Remédio, suplemento ou cuidado de rotina = um item de `medical` com `rotina`:
//   rotina: { tipo, dose, horarios: ['08:00'], dias: 'todos'|'uteis'|'escolhidos',
//             semana: [0..6], inicio, ate, estoque, porDose, habito, ativo, cor }
//   tomadas: { 'aaaa-mm-dd': ['08:00', …] }   (poda em 45 dias: o módulo inteiro mora numa célula de 50.000 caracteres)
const SP_CORES_REMEDIO = ['#a78bfa', '#f472b6', '#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#60a5fa', '#c084fc'];
function rotinasAtivas() {
  const hoje = hojeISO();
  return medical.filter(m => m.rotina && m.rotina.ativo !== false && !(m.rotina.ate && m.rotina.ate < hoje));
}
function rotinaNoDia(m, iso) {
  const r = m.rotina; if (!r) return false;
  if (r.inicio && iso < r.inicio) return false;
  if (r.ate && iso > r.ate) return false;
  const dow = new Date(iso + 'T12:00:00').getDay();
  if (r.dias === 'uteis') return dow >= 1 && dow <= 5;
  if (r.dias === 'escolhidos') return (r.semana || []).includes(dow);
  return true;
}
function dosesDoDia(iso) {
  const out = [];
  rotinasAtivas().forEach(m => {
    if (!rotinaNoDia(m, iso)) return;
    const hs = (m.rotina.horarios || []).length ? m.rotina.horarios : [''];
    const feitas = (m.tomadas || {})[iso] || [];
    hs.forEach(h => out.push({ m, h, tomada: feitas.includes(h) }));
  });
  return out.sort((a, b) => (a.h || '99').localeCompare(b.h || '99'));
}
function corDoRemedio(m) {
  if (m.rotina && m.rotina.cor) return m.rotina.cor;
  const i = medical.filter(x => x.rotina).indexOf(m);
  return SP_CORES_REMEDIO[(i < 0 ? 0 : i) % SP_CORES_REMEDIO.length];
}
function podarTomadas(m) {
  if (!m.tomadas) return;
  const corte = spSomaDias(hojeISO(), -45);
  Object.keys(m.tomadas).forEach(k => { if (k < corte || !m.tomadas[k].length) delete m.tomadas[k]; });
}
/** Marca (ou desmarca) uma dose de hoje. Mexe no estoque e no hábito. */
function tomarDose(id, h) {
  const m = medical.find(x => x.id === id); if (!m || !m.rotina) return;
  fecharDiaSePreciso();
  const hoje = hojeISO(); const r = m.rotina; const por = Number(r.porDose) || 1;
  m.tomadas = m.tomadas || {};
  const l = m.tomadas[hoje] = m.tomadas[hoje] || [];
  const k = l.indexOf(h);
  if (k >= 0) { l.splice(k, 1); if (r.estoque !== null && r.estoque !== undefined && r.estoque !== '') r.estoque = Number(r.estoque) + por; }
  else { l.push(h); if (r.estoque !== null && r.estoque !== undefined && r.estoque !== '') r.estoque = Math.max(0, Number(r.estoque) - por); }
  podarTomadas(m); salvar('medical', medical);
  sincronizarHabitoDoRemedio(m);
  renderSaude();
  if (k < 0) toast(`${TIPOS_ROTINA[r.tipo] ? TIPOS_ROTINA[r.tipo][0] : '💊'} ${m.title}${h ? ' das ' + h : ''} — feito.`);
}
/** O hábito ligado ao remédio fica marcado quando TODAS as doses do dia foram
 *  tomadas (e num dia sem dose, ele não cobra nada). */
function sincronizarHabitoDoRemedio(m) {
  // 🪤 armadilha nº 1: só casa por id quando o id existe dos dois lados
  if (!m || !m.id) return false;
  const hb = habits.find(x => x.medId && x.medId === m.id); if (!hb) return false;
  const ds = dosesDoDia(hojeISO()).filter(d => d.m.id === m.id);
  const feito = ds.length ? ds.every(d => d.tomada) : true;
  if (hb.done === feito) return false;
  hb.done = feito; salvar('habits', habits);
  if (typeof renderFocusTab === 'function') renderFocusTab();
  if (typeof atualizarSaudacao === 'function') atualizarSaudacao();
  return true;
}
/** O caminho de volta: marcou o hábito na lista de hábitos → as doses de hoje
 *  contam como tomadas (desmarcou → voltam a pendentes). Chamado pelo toggleHabit. */
function aoMarcarHabitoRemedio(hb) {
  if (!hb || !hb.medId) return;
  const m = medical.find(x => x.id === hb.medId); if (!m || !m.rotina) return;
  const hoje = hojeISO(); const r = m.rotina; const por = Number(r.porDose) || 1;
  const temEstoque = r.estoque !== null && r.estoque !== undefined && r.estoque !== '';
  m.tomadas = m.tomadas || {};
  dosesDoDia(hoje).filter(d => d.m.id === m.id).forEach(d => {
    const l = m.tomadas[hoje] = m.tomadas[hoje] || [];
    if (hb.done && !d.tomada) { l.push(d.h); if (temEstoque) r.estoque = Math.max(0, Number(r.estoque) - por); }
    if (!hb.done && d.tomada) { l.splice(l.indexOf(d.h), 1); if (temEstoque) r.estoque = Number(r.estoque) + por; }
  });
  podarTomadas(m); salvar('medical', medical); renderSaude();
}
/** Num dia sem dose o hábito já nasce cumprido; se ele tomou tudo em outro
 *  aparelho, o hábito acompanha. Roda a cada renderSaude, grava só se mudou. */
function sincronizarHabitosRemedios() {
  // 🪤 na partida do app o renderSaude roda ANTES do verificarNovoDia (que
  // espera a sincronização). Mexer no hábito antes de o dia de ontem ser
  // fechado gravaria o estado de HOJE no histórico de ontem. Então espera.
  if (typeof habitLog !== 'undefined' && habitLog.date !== hojeBR()) return;
  medical.forEach(m => { if (m.rotina) sincronizarHabitoDoRemedio(m); });
}
/** Antes de marcar dose: se o dia virou e ninguém fechou o de ontem, fecha agora. */
function fecharDiaSePreciso() {
  if (typeof habitLog !== 'undefined' && habitLog.date !== hojeBR() && typeof verificarNovoDia === 'function') verificarNovoDia();
}
/** Quantos dias o estoque ainda dura no ritmo atual. */
function diasDeEstoque(m) {
  const r = m.rotina; if (r.estoque === null || r.estoque === undefined || r.estoque === '') return null;
  const porDia = Math.max(1, (r.horarios || []).length) * (Number(r.porDose) || 1) * (r.dias === 'uteis' ? 5 / 7 : r.dias === 'escolhidos' ? Math.max(1, (r.semana || []).length) / 7 : 1);
  return Math.floor(Number(r.estoque) / porDia);
}
/** Adesão: das doses previstas nos últimos N dias (sem contar hoje), quantas foram tomadas. */
function adesaoRotina(m, n) {
  let prev = 0, tom = 0; const hoje = hojeISO();
  for (let i = 1; i <= n; i++) {
    const iso = spSomaDias(hoje, -i);
    if (!rotinaNoDia(m, iso)) continue;
    const hs = (m.rotina.horarios || []).length ? m.rotina.horarios : [''];
    const f = (m.tomadas || {})[iso] || [];
    prev += hs.length; tom += hs.filter(h => f.includes(h)).length;
  }
  return prev ? { prev, tom, pct: Math.round(tom / prev * 100) } : null;
}

// ── prevenção ──────────────────────────────────────────────────────────────
function cfgSaude() {
  const s = profile.saude = profile.saude || {};
  if (!Array.isArray(s.prevOcultos)) s.prevOcultos = [];
  if (!s.prevMeses || typeof s.prevMeses !== 'object') s.prevMeses = {};
  return s;
}
function idadeAtual() {
  const n = perfilCorpo().nascimento; if (!n) return null;
  const d = new Date(n + 'T12:00:00'), h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a;
}
function prevencaoSeAplica(p) {
  const c = perfilCorpo(); const id = idadeAtual();
  if (p.sexo && c.sexo && c.sexo !== p.sexo) return false;
  if (p.idade && id !== null && id < p.idade) return false;
  return true;
}
function prevencaoCasa(m, p) { return m.prev === p.k || (!m.prev && p.acha.test(m.title || '')); }
function estadoPrevencao(p) {
  const cfg = cfgSaude(); const hoje = hojeISO();
  const meses = cfg.prevMeses[p.k] !== undefined ? cfg.prevMeses[p.k] : p.meses;
  let ultimo = '';
  medical.forEach(m => { if (!m.done || m.rotina || !prevencaoCasa(m, p)) return; const q = m.doneAt || m.date || ''; if (q > ultimo) ultimo = q; });
  if (p.k === 'pressao') measures.forEach(m => { if (Number(m.sis) > 0 && m.date > ultimo) ultimo = m.date; });
  const marcado = medical.filter(m => !m.done && !m.rotina && m.date && m.date >= hoje && prevencaoCasa(m, p)).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  let estado, proximo = '', falta = null;
  if (marcado) estado = 'marcado';
  else if (!ultimo) estado = 'nunca';
  else if (!meses) estado = 'feito';
  else { proximo = spSomaMeses(ultimo, meses); falta = spDias(hoje, proximo); estado = falta < 0 ? 'atrasado' : falta <= 30 ? 'breve' : 'emdia'; }
  if (ultimo && meses && !proximo) proximo = spSomaMeses(ultimo, meses);
  const frac = ultimo ? (meses ? Math.min(1, spDias(ultimo, hoje) / (meses * 30.44)) : 1) : 0;
  return { meses, ultimo, proximo, falta, estado, marcado, frac };
}
const SP_ESTADO_PREV = {
  emdia: ['var(--ok)', 'em dia'], feito: ['var(--ok)', 'completo'], breve: ['var(--atencao)', 'vence logo'],
  atrasado: ['var(--perigo)', 'atrasado'], nunca: ['var(--txt4)', 'sem registro'], marcado: ['var(--info)', 'marcado']
};
function textoEstadoPrev(p, e) {
  if (e.estado === 'marcado') return `marcado para ${rotuloData(e.marcado.date).toLowerCase()}${e.marcado.date === hojeISO() ? '' : ' · ' + isoParaBR(e.marcado.date).slice(0, 5)}`;
  if (e.estado === 'nunca') return 'nenhum registro ainda';
  if (e.estado === 'feito') return `feito em ${isoParaBR(e.ultimo)}`;
  if (e.estado === 'atrasado') return `venceu ${spHaQuanto(-e.falta)} · último ${isoParaBR(e.ultimo)}`;
  if (e.estado === 'breve') return `vence em ${plural(e.falta, 'dia', 'dias')}`;
  return `próximo ${isoParaBR(e.proximo).slice(3)} · último ${isoParaBR(e.ultimo)}`;
}
function prevencoesVisiveis() {
  const ocult = cfgSaude().prevOcultos;
  return PREVENCAO.filter(p => prevencaoSeAplica(p) && !ocult.includes(p.k));
}

/** Um anel: o tempo que já passou do intervalo (ou a adesão, ou o placar). */
function spAnel(frac, cor, tam, centro) {
  const r = 15.5, C = 2 * Math.PI * r; const f = Math.max(0, Math.min(1, frac || 0));
  return `<svg class="sp-anel" viewBox="0 0 40 40" width="${tam}" height="${tam}" aria-hidden="true">
    <circle class="sp-anel-trilho" cx="20" cy="20" r="${r}"/>
    ${f > 0 ? `<circle class="sp-anel-arco" cx="20" cy="20" r="${r}" style="stroke:${cor}" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/>` : ''}
    ${centro ? `<text x="20" y="24">${centro}</text>` : ''}</svg>`;
}

function spQuadroMedico() {
  const hoje = hojeISO(); const agora = new Date().toTimeString().slice(0, 5);
  const ds = dosesDoDia(hoje);
  const periodos = [['☀️', 'Manhã', h => !h || h < '12:00'], ['🌤️', 'Tarde', h => h >= '12:00' && h < '18:00'], ['🌙', 'Noite', h => h >= '18:00']];
  let caixa;
  if (!rotinasAtivas().length) {
    caixa = `<button type="button" class="sp-caixa-vazia" onclick="abrirNovaRotina()">💊 <span><strong>Cadastre remédios, suplementos e cuidados</strong><small>Eles aparecem aqui, na hora certa, e entram na lista de hábitos.</small></span></button>`;
  } else {
    caixa = '<div class="sp-caixa">' + periodos.map(([ic, nome, teste]) => {
      const aqui = ds.filter(d => teste(d.h));
      return `<div class="sp-comp${aqui.length && aqui.every(d => d.tomada) ? ' completo' : ''}"><span class="sp-comp-rot">${ic} ${nome}</span>
        ${aqui.length ? aqui.map(d => {
          const atras = !d.tomada && d.h && d.h < agora;
          const tr = TIPOS_ROTINA[d.m.rotina.tipo] || TIPOS_ROTINA.remedio;
          return `<button type="button" class="sp-capsula${d.tomada ? ' on' : ''}${atras ? ' atras' : ''}" style="--c:${corDoRemedio(d.m)}" onclick="tomarDose(${d.m.id}, '${d.h}')" title="${esc(d.m.title)}${d.m.rotina.dose ? ' · ' + esc(d.m.rotina.dose) : ''}${d.h ? ' · ' + d.h : ''}${d.tomada ? ' · feito' : atras ? ' · passou da hora' : ''}">
            <i class="sp-pilula">${d.tomada ? '✓' : tr[0]}</i><span>${esc(d.m.title)}</span><small>${d.h || 'hoje'}</small></button>`;
        }).join('') : '<span class="sp-comp-vazio">—</span>'}</div>`;
    }).join('') + '</div>';
  }
  // avisos: estoque acabando
  const avisos = rotinasAtivas().map(m => ({ m, d: diasDeEstoque(m) })).filter(x => x.d !== null && x.d <= 7)
    .map(x => `<li class="sp-aviso" onclick="verSecaoSaude('medico')">📦 <strong>${esc(x.m.title)}</strong> ${x.d <= 0 ? 'acabou o estoque' : 'acaba em ' + plural(x.d, 'dia', 'dias')}</li>`).join('');
  // radar: consultas marcadas + prevenção que pede atenção
  const marcados = medical.filter(m => !m.done && !m.rotina && m.date && m.date >= hoje).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3)
    .map(m => ({ ic: (TIPOS_MEDICO[m.kind] || TIPOS_MEDICO.outro)[0], t: m.title, q: spDias(hoje, m.date) === 0 ? 'hoje' : 'em ' + plural(spDias(hoje, m.date), 'dia', 'dias'), cor: 'var(--info)', ord: spDias(hoje, m.date) }));
  const prevs = prevencoesVisiveis().map(p => ({ p, e: estadoPrevencao(p) }));
  const atencao = prevs.filter(x => x.e.estado === 'atrasado' || x.e.estado === 'breve')
    .map(x => ({ ic: x.p.ic, t: x.p.nome, q: x.e.estado === 'atrasado' ? 'atrasado' : 'vence em ' + plural(x.e.falta, 'dia', 'dias'), cor: SP_ESTADO_PREV[x.e.estado][0], ord: x.e.falta }));
  const radar = [...marcados, ...atencao].sort((a, b) => a.ord - b.ord).slice(0, 4);
  const emDia = prevs.filter(x => ['emdia', 'feito', 'marcado'].includes(x.e.estado)).length;
  const tomadas = ds.filter(d => d.tomada).length;
  return `<section class="sp-quadro sp-medico">
    <button type="button" class="sp-cab" onclick="verSecaoSaude('medico')"><span class="sp-ic">🩺</span><span class="sp-tit">Médico</span>
      <small>${ds.length ? `${tomadas} de ${plural(ds.length, 'dose', 'doses')} hoje` : 'nada para tomar hoje'}</small><span class="sp-ir">›</span></button>
    ${caixa}
    ${avisos ? `<ul class="sp-avisos">${avisos}</ul>` : ''}
    <div class="sp-radar-box">
      <ul class="sp-radar">${radar.length ? radar.map(x => `<li style="--c:${x.cor}" onclick="verSecaoSaude('medico')"><i></i><span>${x.ic} ${esc(x.t)}</span><small>${x.q}</small></li>`).join('')
        : '<li class="sp-radar-nada"><i></i><span>Nada marcado e nada atrasado.</span></li>'}</ul>
      <button type="button" class="sp-prev-placar" onclick="verSecaoSaude('medico'); setTimeout(() => { const e = document.getElementById('prevencao-lista'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60)" title="Prevenção em dia">
        ${spAnel(prevs.length ? emDia / prevs.length : 0, 'var(--ok)', 46, `${emDia}/${prevs.length}`)}<small>prevenção<br>em dia</small></button>
    </div>
  </section>`;
}

// ═══════════════════════ O PAINEL (os quatro juntos) ══════════════════════
function renderPainelSaude() {
  const el = document.getElementById('health-dash'); if (!el) return;
  verificarNovoDiaAgua();
  el.innerHTML = `<div class="sp-grade">${spQuadroTreino()}${spQuadroCorpo()}${spQuadroComida()}${spQuadroMedico()}</div>`;
}

// ═════════════════ A SEÇÃO MÉDICO: rotina e prevenção ═════════════════════
function preencherRotinaForm() {
  const t = document.getElementById('rotina-tipo');
  if (t && !t.options.length) t.innerHTML = Object.entries(TIPOS_ROTINA).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('');
  const sem = document.getElementById('rotina-semana');
  if (sem && !sem.children.length) sem.innerHTML = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) =>
    `<label class="rot-dia"><input type="checkbox" value="${i}"${i >= 1 && i <= 5 ? ' checked' : ''}> ${d}</label>`).join('');
  preencherSugestoesRotina();
}
function preencherSugestoesRotina() {
  const t = document.getElementById('rotina-tipo'); const dl = document.getElementById('rotina-sugestoes');
  if (t && dl) dl.innerHTML = (ROTINA_SUGESTOES[t.value] || []).map(n => `<option value="${esc(n)}">`).join('');
}
function mostrarSemanaRotina() {
  const s = document.getElementById('rotina-semana'); const d = document.getElementById('rotina-dias');
  if (s && d) s.hidden = d.value !== 'escolhidos';
}
function abrirNovaRotina() {
  if (typeof changeTab === 'function') changeTab('health');
  verSecaoSaude('medico');
  // na casca nova o formulário mora numa folha: o focus() abaixo é o que a abre
  setTimeout(() => { const n = document.getElementById('rotina-nome'); if (n) { n.scrollIntoView({ behavior: 'smooth', block: 'center' }); n.focus(); } }, 80);
}
/** "8h", "8", "08:00", "20h30" → "08:00", "20:30". Lixo é descartado. */
function lerHorarios(txt) {
  const out = [];
  String(txt || '').split(/[\s,;/]+|\be\b/).forEach(p => {
    const m = p.trim().match(/^(\d{1,2})(?:[:h](\d{2})?)?h?$/i); if (!m) return;
    const h = Number(m[1]), mi = Number(m[2] || 0); if (h > 23 || mi > 59) return;
    const s = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
    if (!out.includes(s)) out.push(s);
  });
  return out.sort();
}
function salvarRotina(ev) {
  if (ev) ev.preventDefault();
  const v = id => document.getElementById(id).value;
  const nome = v('rotina-nome').trim(); if (!nome) { toast('Escreva o nome.'); return; }
  const dias = v('rotina-dias');
  const semana = [...document.querySelectorAll('#rotina-semana input:checked')].map(i => Number(i.value));
  if (dias === 'escolhidos' && !semana.length) { toast('Escolha pelo menos um dia da semana.'); return; }
  const est = v('rotina-estoque');
  const id = v('rotina-id');
  const rotina = {
    tipo: v('rotina-tipo'), dose: v('rotina-dose').trim(), horarios: lerHorarios(v('rotina-horarios')),
    dias, semana: dias === 'escolhidos' ? semana : [], ate: v('rotina-ate') || '',
    estoque: est === '' ? null : Math.max(0, Number(est)), porDose: Number(v('rotina-pordose')) || 1,
    habito: document.getElementById('rotina-habito').checked, ativo: true, notas: v('rotina-notas').trim()
  };
  let m;
  if (id) {
    m = medical.find(x => String(x.id) === id); if (!m || !m.rotina) return;
    rotina.inicio = m.rotina.inicio || hojeISO(); rotina.ativo = m.rotina.ativo !== false; rotina.cor = m.rotina.cor;
    m.title = nome; m.rotina = rotina;
  } else {
    rotina.inicio = hojeISO();
    rotina.cor = SP_CORES_REMEDIO[medical.filter(x => x.rotina).length % SP_CORES_REMEDIO.length];
    m = { id: novoId(), kind: 'medicamento', title: nome, date: '', time: '', place: '', notes: '', done: false, eventId: null, createdAt: Date.now(), rotina, tomadas: {} };
    medical.push(m);
  }
  salvar('medical', medical);
  ligarHabitoDoRemedio(m);
  cancelarRotina();
  renderSaude();
  toast(id ? '💊 Atualizado.' : `💊 ${nome} na rotina${rotina.habito ? ' — e na lista de hábitos' : ''}.`);
}
/** Cria, renomeia ou tira o hábito que lembra o remédio. */
function ligarHabitoDoRemedio(m) {
  if (!m || !m.id) return;
  const i = habits.findIndex(h => h.medId && h.medId === m.id);
  const quer = m.rotina && m.rotina.habito && m.rotina.ativo !== false;
  const ic = (TIPOS_ROTINA[m.rotina && m.rotina.tipo] || TIPOS_ROTINA.remedio)[0];
  if (quer && i < 0) habits.push({ text: m.title, icon: ic, done: false, medId: m.id });
  else if (quer && i >= 0) {
    const h = habits[i];
    if (h.text !== m.title) Object.values(habitLog.dias || {}).forEach(r => { if (r.feitos) r.feitos = r.feitos.map(f => f === h.text ? m.title : f); });
    h.text = m.title; h.icon = ic;
  } else if (!quer && i >= 0) habits.splice(i, 1);
  else return;
  salvar('habits', habits); salvar('habitlog', habitLog);
  sincronizarHabitoDoRemedio(m);
  if (typeof renderFocusTab === 'function') renderFocusTab();
}
function cancelarRotina() {
  const f = document.getElementById('rotina-form'); if (!f) return;
  f.reset(); document.getElementById('rotina-id').value = '';
  document.getElementById('rotina-submit').innerText = 'Adicionar à rotina';
  document.getElementById('rotina-cancel').hidden = true;
  preencherSugestoesRotina(); mostrarSemanaRotina();
}
function editarRotina(id) {
  const m = medical.find(x => x.id === id); if (!m || !m.rotina) return;
  const r = m.rotina; const s = (k, v) => { const e = document.getElementById(k); if (e) e.value = v; };
  abrirNovaRotina();
  s('rotina-id', m.id); s('rotina-tipo', r.tipo || 'remedio'); preencherSugestoesRotina();
  s('rotina-nome', m.title); s('rotina-dose', r.dose || ''); s('rotina-horarios', (r.horarios || []).join(' '));
  s('rotina-dias', r.dias || 'todos'); s('rotina-ate', r.ate || '');
  s('rotina-estoque', r.estoque === null || r.estoque === undefined ? '' : r.estoque); s('rotina-pordose', r.porDose || 1);
  s('rotina-notas', r.notas || '');
  document.getElementById('rotina-habito').checked = !!r.habito;
  document.querySelectorAll('#rotina-semana input').forEach(i => { i.checked = (r.semana || []).includes(Number(i.value)); });
  mostrarSemanaRotina();
  document.getElementById('rotina-submit').innerText = 'Salvar';
  document.getElementById('rotina-cancel').hidden = false;
}
function pausarRotina(id) {
  const m = medical.find(x => x.id === id); if (!m || !m.rotina) return;
  m.rotina.ativo = m.rotina.ativo === false; salvar('medical', medical); ligarHabitoDoRemedio(m); renderSaude();
  toast(m.rotina.ativo ? '▶ Voltou para a rotina.' : '⏸ Pausado — sai do porta-comprimidos e dos hábitos.');
}
function removerRotina(id) {
  const m = medical.find(x => x.id === id); if (!m || !confirm(`Tirar "${m.title}" da rotina? O histórico de doses vai junto.`)) return;
  const i = habits.findIndex(h => h.medId && h.medId === m.id);
  if (i >= 0) { habits.splice(i, 1); salvar('habits', habits); if (typeof renderFocusTab === 'function') renderFocusTab(); }
  medical = medical.filter(x => x.id !== id); salvar('medical', medical); renderSaude();
}
function reporEstoque(id) {
  const m = medical.find(x => x.id === id); if (!m || !m.rotina) return;
  const v = prompt(`Quantas unidades de ${m.title} chegaram?`, '30'); if (v === null) return;
  const n = Number(String(v).replace(',', '.')); if (!(n > 0)) return;
  m.rotina.estoque = (Number(m.rotina.estoque) || 0) + n; salvar('medical', medical); renderSaude();
  toast(`📦 Estoque: ${m.rotina.estoque} unidades.`);
}
function textoDiasRotina(r) {
  if (r.dias === 'uteis') return 'dias úteis';
  if (r.dias === 'escolhidos') return (r.semana || []).map(i => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][i]).join(', ') || '—';
  return 'todo dia';
}
function renderRotinaMedica() {
  preencherRotinaForm();
  const el = document.getElementById('rotina-lista'); if (!el) return;
  const lista = medical.filter(m => m.rotina).sort((a, b) => (a.rotina.ativo === false) - (b.rotina.ativo === false) || a.title.localeCompare(b.title));
  if (!lista.length) { el.innerHTML = '<div class="pf-vazio">Nada na rotina ainda. Cadastre acima — remédio de uso contínuo, suplemento, colírio, medir a pressão…</div>'; return; }
  const hoje = hojeISO();
  el.innerHTML = lista.map(m => {
    const r = m.rotina; const tr = TIPOS_ROTINA[r.tipo] || TIPOS_ROTINA.remedio; const ativo = r.ativo !== false && !(r.ate && r.ate < hoje);
    const doses = ativo && rotinaNoDia(m, hoje) ? ((r.horarios || []).length ? r.horarios : ['']) : [];
    const feitas = (m.tomadas || {})[hoje] || [];
    const ad = adesaoRotina(m, 14);
    // 14 bolinhas: cada dia, das doses previstas, quantas foram
    let bol = '';
    for (let i = 14; i >= 1; i--) {
      const iso = spSomaDias(hoje, -i);
      if (!rotinaNoDia(m, iso) || (r.inicio && iso < r.inicio)) { bol += `<i class="nada" title="${isoParaBR(iso).slice(0, 5)} · sem dose"></i>`; continue; }
      const hs = (r.horarios || []).length ? r.horarios : ['']; const f = (m.tomadas || {})[iso] || [];
      const n = hs.filter(h => f.includes(h)).length;
      bol += `<i class="${n === hs.length ? 'ok' : n ? 'meio' : 'falta'}" title="${isoParaBR(iso).slice(0, 5)} · ${n} de ${hs.length}"></i>`;
    }
    const de = diasDeEstoque(m);
    return `<div class="rot-item${ativo ? '' : ' pausado'}" style="--c:${corDoRemedio(m)}">
      <span class="rot-ic">${tr[0]}</span>
      <div class="rot-info"><strong>${esc(m.title)}${r.dose ? ` <small>${esc(r.dose)}</small>` : ''}</strong>
        <small>${tr[1]} · ${textoDiasRotina(r)}${(r.horarios || []).length ? ' · ' + r.horarios.join(' · ') : ''}${r.ate ? ' · até ' + isoParaBR(r.ate) : ' · contínuo'}${r.habito ? ' · 🎮 nos hábitos' : ''}${ativo ? '' : ' · ⏸ pausado'}</small>
        ${r.notas ? `<small class="item-notes">${esc(r.notas)}</small>` : ''}</div>
      <div class="rot-hoje">${doses.map(h => `<button type="button" class="sp-capsula mini${feitas.includes(h) ? ' on' : ''}" style="--c:${corDoRemedio(m)}" onclick="tomarDose(${m.id}, '${h}')" title="${feitas.includes(h) ? 'Feito — toque para desfazer' : 'Marcar como feito'}"><i class="sp-pilula">${feitas.includes(h) ? '✓' : tr[0]}</i><small>${h || 'hoje'}</small></button>`).join('')}</div>
      <div class="rot-adesao" title="${ad ? `Últimos 14 dias: ${ad.tom} de ${ad.prev} doses (${ad.pct}%)` : 'Ainda sem histórico'}">${ad ? `<span class="rot-bolas">${bol}</span><small>${ad.pct}% em 14 dias</small>` : '<small class="rot-sem-hist">o histórico de 14 dias começa amanhã</small>'}</div>
      <div class="rot-estoque">${de === null ? '<small>sem controle de estoque</small>' : `<strong class="${de <= 7 ? 'baixo' : ''}">${spNum(r.estoque, Number(r.estoque) % 1 ? 1 : 0)} un</strong><small>${de <= 0 ? 'acabou' : '~' + plural(de, 'dia', 'dias')}</small>`}
        <button type="button" class="mini-btn xs" title="Repor estoque" onclick="reporEstoque(${m.id})">📦＋</button></div>
      <span class="item-actions">
        <button type="button" class="mini-btn" title="Editar" onclick="editarRotina(${m.id})">✎</button>
        <button type="button" class="mini-btn" title="${ativo ? 'Pausar' : 'Retomar'}" onclick="pausarRotina(${m.id})">${ativo ? '⏸' : '▶'}</button>
        <button type="button" class="mini-btn" title="Tirar da rotina" onclick="removerRotina(${m.id})">✕</button></span>
    </div>`;
  }).join('');
}

let spMostrarOcultos = false;
function renderPrevencao() {
  const el = document.getElementById('prevencao-lista'); if (!el) return;
  const cfg = cfgSaude();
  const lista = PREVENCAO.filter(prevencaoSeAplica);
  const vis = lista.filter(p => spMostrarOcultos || !cfg.prevOcultos.includes(p.k));
  const ordem = { atrasado: 0, breve: 1, nunca: 2, marcado: 3, emdia: 4, feito: 5 };
  const itens = vis.map(p => ({ p, e: estadoPrevencao(p), i: PREVENCAO.indexOf(p) })).sort((a, b) => ordem[a.e.estado] - ordem[b.e.estado]);
  const ocultos = lista.filter(p => cfg.prevOcultos.includes(p.k)).length;
  const c = perfilCorpo();
  el.innerHTML = `${!c.nascimento || !c.sexo ? `<p class="hint">💡 Informe ${!c.nascimento ? 'a data de nascimento' : ''}${!c.nascimento && !c.sexo ? ' e ' : ''}${!c.sexo ? 'a referência (masculina/feminina)' : ''} em <a href="#" onclick="verSecaoSaude('medidas'); return false;">Corpo</a> — a lista se ajusta à sua idade.</p>` : ''}
    <div class="prev-grade">${itens.map(({ p, e, i }) => {
      const [cor, rot] = SP_ESTADO_PREV[e.estado]; const oculto = cfg.prevOcultos.includes(p.k);
      return `<div class="prev-item est-${e.estado}${oculto ? ' oculto' : ''}" style="--c:${cor}">
        <div class="prev-anel">${spAnel(e.estado === 'nunca' ? 0 : e.frac, cor, 44)}<span>${p.ic}</span></div>
        <div class="prev-txt"><strong>${esc(p.nome)}</strong>${p.sub ? `<small>${esc(p.sub)}</small>` : ''}
          <small class="prev-est"><b>${rot}</b> · ${textoEstadoPrev(p, e)}</small>
          <button type="button" class="prev-meses" onclick="mudarIntervaloPrev(${i})" title="Mudar o intervalo">${e.meses ? 'a cada ' + (e.meses % 12 ? plural(e.meses, 'mês', 'meses') : plural(e.meses / 12, 'ano', 'anos')) : 'uma vez'}</button></div>
        <div class="prev-acoes">
          <button type="button" class="mini-btn" title="Já fiz — registrar a data" onclick="registrarPrevencao(${i})">✓ fiz</button>
          ${p.tipo !== 'medida' ? `<button type="button" class="mini-btn" title="Marcar na agenda" onclick="marcarPrevencao(${i})">📅</button>` : ''}
          <button type="button" class="mini-btn" title="${oculto ? 'Mostrar de novo' : 'Não se aplica a mim — esconder'}" onclick="ocultarPrevencao(${i})">${oculto ? '👁️' : '🙈'}</button></div>
      </div>`;
    }).join('')}</div>
    ${ocultos ? `<button type="button" class="mini-btn" style="margin-top:10px" onclick="spMostrarOcultos = !spMostrarOcultos; renderPrevencao()">${spMostrarOcultos ? 'Esconder' : 'Mostrar'} ${plural(ocultos, 'item escondido', 'itens escondidos')}</button>` : ''}`;
}
function registrarPrevencao(i) {
  const p = PREVENCAO[i]; if (!p) return;
  if (p.tipo === 'medida') { verSecaoSaude('medidas'); const s = document.getElementById('measure-sis'); if (s) { const d = s.closest('details'); if (d) d.open = true; s.scrollIntoView({ behavior: 'smooth', block: 'center' }); s.focus(); } toast('Registre a pressão em Peso e medidas.'); return; }
  const v = prompt(`Quando foi "${p.nome}"? (dd/mm/aaaa)`, hojeBR()); if (v === null) return;
  const mt = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!mt) { toast('Use o formato dd/mm/aaaa.'); return; }
  const ano = mt[3].length === 2 ? '20' + mt[3] : mt[3];
  const iso = `${ano}-${mt[2].padStart(2, '0')}-${mt[1].padStart(2, '0')}`;
  if (isNaN(new Date(iso + 'T12:00:00')) || iso > hojeISO()) { toast('Essa data não vale (no futuro ou inválida).'); return; }
  medical.push({ id: novoId(), kind: p.tipo, title: p.nome, date: iso, time: '', place: '', notes: '', done: true, doneAt: iso, eventId: null, createdAt: Date.now(), prev: p.k });
  salvar('medical', medical); renderSaude();
  toast(`✓ ${p.nome} registrado em ${isoParaBR(iso)}.`);
}
function marcarPrevencao(i) {
  const p = PREVENCAO[i]; if (!p) return;
  verSecaoSaude('medico');
  const k = document.getElementById('medical-kind'); if (k) k.value = TIPOS_MEDICO[p.tipo] ? p.tipo : 'outro';
  const t = document.getElementById('medical-title'); if (t) t.value = p.nome;
  const d = document.getElementById('medical-date'); if (d) { d.scrollIntoView({ behavior: 'smooth', block: 'center' }); d.focus(); }
  toast('Escolha a data e toque em Adicionar — vai para o calendário.');
}
function ocultarPrevencao(i) {
  const p = PREVENCAO[i]; if (!p) return; const cfg = cfgSaude();
  const k = cfg.prevOcultos.indexOf(p.k);
  if (k >= 0) cfg.prevOcultos.splice(k, 1); else cfg.prevOcultos.push(p.k);
  salvar('profile', profile); renderSaude();
}
function mudarIntervaloPrev(i) {
  const p = PREVENCAO[i]; if (!p) return; const cfg = cfgSaude();
  const atual = cfg.prevMeses[p.k] !== undefined ? cfg.prevMeses[p.k] : p.meses;
  const v = prompt(`De quantos em quantos MESES para "${p.nome}"? (0 = uma vez só; vazio = o padrão de ${p.meses})`, String(atual));
  if (v === null) return;
  if (String(v).trim() === '') delete cfg.prevMeses[p.k];
  else { const n = parseInt(v, 10); if (isNaN(n) || n < 0 || n > 240) { toast('Use um número de 0 a 240.'); return; } cfg.prevMeses[p.k] = n; }
  salvar('profile', profile); renderSaude();
}

// ═════════════ CORPO (a seção): o mapa das medidas ════════════════════════
/** A silhueta de frente com cada medida no seu lugar, e a seta de quanto mudou.
 *  Troca os oito quadradinhos iguais que ele reprovou. */
function mapaDasMedidas() {
  const pos = [
    ['neck', 'Pescoço', 50, 24, 'e'], ['chest', 'Peito', 44, 40, 'e'], ['arm', 'Braço', 72, 50, 'd'],
    ['waist', 'Cintura', 50, 66, 'e'], ['hip', 'Quadril', 58, 88, 'd'], ['thigh', 'Coxa', 56, 108, 'd'], ['calf', 'Panturrilha', 44, 146, 'e']
  ];
  const linhas = [], rotulos = [];
  pos.forEach(([k, nome, x, y, lado]) => {
    const u = spUltimo(k); const v = variacao(k);
    const xt = lado === 'e' ? 8 : 92;
    linhas.push(`<line class="mm-cota${u ? '' : ' vazia'}" x1="${x}" y1="${y}" x2="${lado === 'e' ? 14 : 86}" y2="${y}"/><circle class="mm-cota-p${u ? '' : ' vazia'}" cx="${x}" cy="${y}" r="1.6"/>`);
    rotulos.push(`<div class="mm-med ${lado}" style="top:${(y / 172 * 100).toFixed(1)}%">
      <small>${nome}</small><strong>${u ? spNum(u[k], u[k] % 1 ? 1 : 0) + ' cm' : '—'}</strong>
      ${v && v.d ? `<em class="${v.d < 0 ? 'baixa' : 'alta'}">${v.d < 0 ? '▼' : '▲'} ${spNum(Math.abs(v.d))}</em>` : ''}</div>`);
  });
  const corpo = `<g class="mm-base">
    <circle cx="50" cy="13" r="8.5"/><rect x="46" y="21" width="8" height="6" rx="2"/>
    <ellipse cx="33" cy="35" rx="7.5" ry="6.5"/><ellipse cx="67" cy="35" rx="7.5" ry="6.5"/>
    <path d="M38 30 Q50 27 62 30 Q65 38 63 46 L59 80 H41 L37 46 Q35 38 38 30 Z"/>
    <ellipse cx="28" cy="51" rx="4.6" ry="9" transform="rotate(10 28 51)"/><ellipse cx="72" cy="51" rx="4.6" ry="9" transform="rotate(-10 72 51)"/>
    <ellipse cx="24.5" cy="70" rx="3.8" ry="9.5" transform="rotate(12 24.5 70)"/><ellipse cx="75.5" cy="70" rx="3.8" ry="9.5" transform="rotate(-12 75.5 70)"/>
    <path d="M40 80 H60 L62 92 Q50 96 38 92 Z"/>
    <ellipse cx="44" cy="109" rx="6.3" ry="16"/><ellipse cx="56" cy="109" rx="6.3" ry="16"/>
    <ellipse cx="44" cy="145" rx="4.3" ry="13"/><ellipse cx="56" cy="145" rx="4.3" ry="13"/>
    <ellipse cx="43" cy="162" rx="4.6" ry="2.6"/><ellipse cx="57" cy="162" rx="4.6" ry="2.6"/></g>`;
  // o desenho ocupa a caixa inteira (com 40 de folga de cada lado para os
  // rótulos): assim o "top" em % de cada rótulo cai exatamente na altura da cota
  return `<div class="mm-medidas"><svg viewBox="-40 0 180 172" aria-hidden="true">${corpo}${linhas.join('')}</svg>${rotulos.join('')}</div>`;
}
/** A composição: um anel de massa magra × gordura (só com a % de gordura). */
function anelComposicao() {
  const f = spUltimo('fat'); const w = spUltimo('weight'); if (!f || !w) return '';
  const comp = composicao(w.weight, f.fat); if (!comp) return '';
  return `<div class="corpo-comp">${spAnel(f.fat / 100, 'var(--atencao)', 76, spNum(f.fat) + '%')}
    <div><strong>${spNum(comp.magra)} kg</strong><small>massa magra</small><strong>${spNum(comp.gordura)} kg</strong><small>de gordura</small></div></div>`;
}
/** O alto da seção Corpo: medidor de IMC, composição, faixa, cintura/quadril e o mapa. */
function painelDoCorpo() {
  const c = perfilCorpo(); const u = spUltimo('weight');
  if (!u && !measures.length) return '<div class="stat-line muted">Registre a primeira medida para ver IMC, faixa de peso e composição.</div>';
  // S3: o medidor só de IMC saiu daqui — os indicadores (cintura/altura, gordura, FFMI, IMC…) viraram os
  // cartões logo abaixo; ao lado do mapa ficam a composição, o risco da cintura e os sinais vitais
  const ideal = pesoIdeal(c.altura);
  const wq = spUltimo('waist');
  const rc = wq ? riscoCintura(wq.waist, c.sexo) : null;
  return `<div class="corpo-vis">
    ${mapaDasMedidas()}
    <div class="corpo-lado">
      ${anelComposicao()}
      ${rc ? `<div class="corpo-risco"><span style="--c:${rc.cor}"><i></i>Cintura: risco ${rc.rotulo}</span></div>` : ''}
      ${ideal ? `<small class="corpo-ideal">Peso saudável pelo IMC para ${spNum(c.altura / 100, 2)} m: <b>${spNum(ideal.min)}–${spNum(ideal.max)} kg</b></small>` : ''}
      ${spVitais()}
    </div></div>
    ${spCartoesIndicadores()}`;
}

// ═════════════ COMIDA (a seção): o banco de alimentos no plano ═════════════
/** Preenche porção, kcal e proteína quando o alimento digitado está no banco. */
function alimentoEscolhido(i) {
  const n = document.getElementById(`di-ali-${i}`); if (!n) return;
  const a = ALIMENTO_POR_NOME.get(n.value.trim().toLowerCase()); if (!a) return;
  const q = document.getElementById(`di-qtd-${i}`), k = document.getElementById(`di-kcal-${i}`), p = document.getElementById(`di-prot-${i}`);
  if (q && !q.value) q.value = a[1];
  if (k) k.value = a[2];
  if (p) p.value = a[3];
}
function preencherBancoAlimentos() {
  let dl = document.getElementById('alimentos-banco');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'alimentos-banco'; document.body.appendChild(dl); }
  if (!dl.children.length) dl.innerHTML = ALIMENTOS.map(a => `<option value="${esc(a[0])}">${esc(a[1])} · ${a[2]} kcal</option>`).join('');
}
