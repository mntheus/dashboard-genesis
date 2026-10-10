// ════════════════════════════════════════════════════════════════════════════
// ESTUDOS — A ESTANTE E O LIVRO ABERTO (09/10/2026) — bloco ⑥, E1
// ────────────────────────────────────────────────────────────────────────────
// Ditado dele: "consertar as barras de rolagem, repaginar, organizar, trazer
// coisas novas — uma coisa visual de livro". Forma aprovada no desenho:
//   • MESA     → a estante (cada material uma lombada na cor do tema, o progresso
//                enchendo a lombada; prateleiras Lendo agora · Próximos · Lidos),
//                o LIVRO ABERTO da leitura atual (página da esquerda: onde parou;
//                da direita: os próximos passos), o mapa de 12 semanas e os
//                marcadores (a meta da semana de cada tema).
//   • ESTANTE  → todos os materiais, por tema, e os temas.
//   • SESSÕES  → o que foi estudado, dia a dia.
//   • RITUAL   → o estudo semanal de negócios, numa página de caderno.
// Barra rápida: "O Mito da Startup livro #gestão" vira material; "45 min inglês"
// vira sessão. Os dados são os de sempre (topics, materials, sessions, ritual):
// nada novo sincroniza. Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const ES_SECOES = ['mesa', 'estante', 'sessoes', 'ritual'];
let estudosSecao = 'mesa';
const esEstado = { aberto: null, dia: '', tema: '' };
const ES_ICONE = { livro: '📖', curso: '🎓', artigo: '📄', video: '🎬', podcast: '🎧', outro: '📌' };

// ───────────────────────────── as seções ──────────────────────────────────
function verSecaoEstudos(s, el) {
  if (!ES_SECOES.includes(s)) s = 'mesa';
  estudosSecao = s;
  document.querySelectorAll('#estudos-secoes > span').forEach(x => x.classList.toggle('active', el ? x === el : (x.getAttribute('onclick') || '').includes(`'${s}'`)));
  ES_SECOES.forEach(k => { const d = document.getElementById('sec-es-' + k); if (d) d.hidden = k !== s; });
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
  esRapidaPrevia();
}

// ───────────────────────────── utilidades ─────────────────────────────────
function esSemAcento(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
/** Um número estável por texto: a lombada de um livro tem sempre a mesma largura e altura. */
function esHash(s) { let h = 0; String(s).split('').forEach(c => { h = (h * 31 + c.charCodeAt(0)) | 0; }); return Math.abs(h); }
/** Minutos estudados por dia (sessões + o total diário do Pomodoro), com hoje incluído. */
function esMinutosPorDia() {
  const m = {};
  sessions.forEach(s => { if (s.date) m[s.date] = (m[s.date] || 0) + (Number(s.minutes) || 0); });
  Object.entries(studyData.dias || {}).forEach(([d, v]) => { if (!m[d] || m[d] < v) m[d] = v; });
  const hoje = hojeISO(); if (studyData.minutes > (m[hoje] || 0)) m[hoje] = studyData.minutes;
  return m;
}
/** O material da mesa: o escolhido (toque na lombada) ou o que está em andamento há menos tempo parado. */
function esLivroDaMesa() {
  const a = esEstado.aberto && materials.find(m => m.id === esEstado.aberto);
  if (a) return a;
  return [...materials].filter(m => m.status === 'andamento').sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))[0]
    || [...materials].filter(m => m.status === 'afazer').sort((x, y) => (y.updatedAt || 0) - (x.updatedAt || 0))[0] || null;
}

// ───────────────────────────── a estante ──────────────────────────────────
function esLombada(m) {
  const h = esHash(m.title || m.id);
  const alto = { livro: 118, curso: 130, artigo: 86, video: 96, podcast: 96, outro: 100 }[m.kind] || 104;
  const altura = alto + (h % 22), largura = 26 + (h % 3) * 4 + (m.kind === 'curso' ? 8 : 0);
  const cor = temaCor(m.topicId), p = Math.max(0, Math.min(100, Number(m.progress) || 0));
  return `<button type="button" class="es-lomb${m.status === 'concluido' ? ' lido' : ''}${esEstado.naMesa === m.id ? ' na-mesa' : ''} k-${m.kind || 'outro'}"
      style="--c:${cor}; --h:${altura}px; --w:${largura}px; --p:${p}%" onclick="esAbrir(${m.id})"
      title="${esc(m.title)} · ${esc(temaNome(m.topicId))} · ${p}%">
      <i class="es-lomb-fio" aria-hidden="true"></i><span class="es-lomb-ic">${ES_ICONE[m.kind] || '📌'}</span><span class="es-lomb-tit">${esc(m.title)}</span></button>`;
}
function esPrateleira(rot, lista, vazio, mais) {
  return `<div class="es-prat">
      <div class="es-prat-livros">${lista.length ? lista.map(esLombada).join('') : `<span class="es-prat-vazia">${vazio}</span>`}</div>
      <div class="es-prat-tabua"><small>${rot}${lista.length ? ` · ${lista.length}` : ''}</small>${mais || ''}</div></div>`;
}
/** A estante da mesa: as três prateleiras (lidos e próximos limitados — a estante inteira mora na seção Estante). */
function esEstanteDaMesa() {
  const por = st => [...materials].filter(m => m.status === st).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const lendo = por('andamento'), prox = por('afazer'), lidos = por('concluido');
  const verTudo = n => n ? `<button type="button" class="es-prat-mais" onclick="verSecaoEstudos('estante')">+${n} na estante ›</button>` : '';
  return `<div class="es-estante">
    ${esPrateleira('Lendo agora', lendo, 'Nada aberto. Comece um da prateleira ao lado.')}
    ${esPrateleira('Próximos', prox.slice(0, 7), 'Nada na fila — escreva na barra acima.', verTudo(Math.max(0, prox.length - 7)))}
    ${esPrateleira('Lidos', lidos.slice(0, 7), 'Os concluídos ficam aqui.', verTudo(Math.max(0, lidos.length - 7)))}</div>`;
}
function esAbrir(id) {
  esEstado.aberto = id;
  if (estudosSecao !== 'mesa' && estudosSecao !== 'estante') verSecaoEstudos('mesa');
  renderMesaEstudos(); renderEstanteEstudos();
  const l = document.querySelector(estudosSecao === 'estante' ? '#es-estante-livro' : '#es-mesa .es-livro');
  if (l && l.getBoundingClientRect().top > window.innerHeight * 0.6) _rolarAte(l);
}
function _rolarAte(el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { } }

// ───────────────────────────── o livro aberto ─────────────────────────────
function esLivroAberto(m) {
  if (!m) return `<div class="es-livro vazio"><div class="es-pag"><span class="es-pag-rot">A mesa está livre</span>
      <b class="es-livro-tit">Qual é o próximo?</b><p>Escreva na barra acima — <em>O Mito da Startup livro #gestão</em> — ou toque numa lombada.</p></div>
      <div class="es-pag"></div></div>`;
  const cor = temaCor(m.topicId), p = Math.max(0, Math.min(100, Number(m.progress) || 0));
  const corte = spSomaDias(hojeISO(), -14);
  const minTema = m.topicId ? sessions.filter(s => s.topicId === m.topicId && s.date >= corte).reduce((a, s) => a + (Number(s.minutes) || 0), 0) : 0;
  const ultSessao = [...sessions].filter(s => m.topicId && s.topicId === m.topicId && s.note && s.note !== 'Pomodoro').sort((a, b) => b.date.localeCompare(a.date))[0];
  const nota = (m.notes || '').split('\n').filter(Boolean).pop();
  const rev = tasks.filter(t => !t.done && t.text.startsWith('🔁 Revisar: ' + m.title)).sort((a, b) => a.due.localeCompare(b.due))[0];
  const estado = { afazer: 'Na fila', andamento: 'Lendo agora', concluido: 'Lido' }[m.status] || '';
  return `<article class="es-livro" style="--c:${cor}">
    <div class="es-pag es-pag-e">
      <span class="es-pag-rot">${estado} · ${esc(temaNome(m.topicId))} · ${(TIPOS_MATERIAL[m.kind] || '📌 Outro').slice(2).trim().toLowerCase()}</span>
      <b class="es-livro-tit">${m.link && /^https?:/i.test(m.link) ? `<a href="${esc(m.link)}" target="_blank" rel="noopener">${esc(m.title)} ↗</a>` : esc(m.title)}</b>
      ${m.link && !/^https?:/i.test(m.link) ? `<small class="es-onde">📍 ${esc(m.link)}</small>` : ''}
      <div class="es-progresso"><span class="es-barra"><i style="width:${p}%"></i></span><b>${p}%</b></div>
      <div class="es-passo">
        <button type="button" class="mini-btn" onclick="esProgresso(${m.id}, -10)" title="Voltar 10%">−10%</button>
        <button type="button" class="mini-btn" onclick="esProgresso(${m.id}, 5)" title="Avançar 5%">＋5%</button>
        <button type="button" class="mini-btn" onclick="esProgresso(${m.id}, 10)" title="Avançar 10%">＋10%</button>
        ${m.status !== 'concluido' ? `<button type="button" class="mini-btn" onclick="esConcluir(${m.id})" title="Marcar como lido">✓ terminei</button>` : `<button type="button" class="mini-btn" onclick="avancarMaterial(${m.id})" title="Voltar para a fila">↩ ler de novo</button>`}</div>
      ${nota ? `<p class="es-margem">“${esc(nota)}”</p>` : ultSessao ? `<p class="es-margem">Última sessão: “${esc(ultSessao.note)}”</p>` : '<p class="es-margem vazia">A margem está em branco — anote o que ficou.</p>'}
    </div>
    <div class="es-pag es-pag-d">
      <span class="es-pag-rot">Próximo passo</span>
      <button type="button" class="es-acao" onclick="esRetomar(${m.id})"><span>▶</span>Retomar · 25 min<small>Pomodoro já no tema certo</small></button>
      <button type="button" class="es-acao" onclick="esAnotar(${m.id})"><span>✎</span>Anotar na margem<small>fica guardado no material</small></button>
      <button type="button" class="es-acao" onclick="agendarRevisao(${m.id})"><span>🔁</span>Revisar em 1, 7 e 30 dias<small>${rev ? 'próxima: ' + rotuloData(rev.due).toLowerCase() : 'viram tarefas na lista Estudos'}</small></button>
      <small class="es-ritmo">${minTema ? `${fmtMin(minTema)} neste tema nas últimas 2 semanas` : 'Nenhuma sessão neste tema nas últimas 2 semanas'}</small>
      <span class="es-livro-ferr"><button type="button" class="mini-btn" onclick="editarMaterial(${m.id})" title="Editar tudo">✎ editar</button><button type="button" class="mini-btn" onclick="removerMaterial(${m.id})" title="Apagar">✕</button></span>
    </div></article>`;
}
function esProgresso(id, d) {
  const m = materials.find(x => x.id === id); if (!m) return;
  progressoMaterial(id, (Number(m.progress) || 0) + d);
  if ((Number(m.progress) || 0) >= 100) toast(`🎉 "${m.title}" foi para a prateleira dos lidos.`);
}
function esConcluir(id) { const m = materials.find(x => x.id === id); if (!m) return; progressoMaterial(id, 100); toast(`🎉 "${m.title}" lido. Quer agendar as revisões? 🔁 no livro.`, 5000); }
function esAnotar(id) {
  const m = materials.find(x => x.id === id); if (!m) return;
  const v = prompt(`Anotação em "${m.title}":`, ''); if (!v || !v.trim()) return;
  m.notes = ((m.notes || '').trim() ? m.notes.trim() + '\n' : '') + `${isoParaBR(hojeISO()).slice(0, 5)} — ${v.trim()}`;
  m.updatedAt = Date.now(); salvar('materials', materials); redesenharEstudos(); toast('✎ Anotado na margem.');
}
/** Começa o Pomodoro de 25 min no tema do livro (o relógio é o mesmo do Painel e da janela Pomodoro). */
function esRetomar(id) {
  const m = materials.find(x => x.id === id); if (!m) return;
  if (typeof timerInterval !== 'undefined' && timerInterval) { toast('⏱ O Pomodoro já está correndo — pause no Painel antes de trocar.'); return; }
  if (typeof pomodoroModo !== 'undefined' && pomodoroModo !== 'foco' && typeof alternarModoPomodoro === 'function') alternarModoPomodoro('foco', document.querySelector('#pomodoro-modo span'));
  const sel = document.getElementById('pomodoro-topic'); if (sel && m.topicId) sel.value = String(m.topicId);
  const h = document.getElementById('pomodoro-h'), mi = document.getElementById('pomodoro-input'), s = document.getElementById('pomodoro-s');
  if (h && mi && s) { h.value = 0; mi.value = 25; s.value = 0; updatePomodoroTime(); }
  if (m.status === 'afazer') { m.status = 'andamento'; m.updatedAt = Date.now(); salvar('materials', materials); redesenharEstudos(); }
  startTimer();
  toast(`⏱ 25 min de ${temaNome(m.topicId)} começaram — "${m.title}". O relógio fica no Painel.`, 5000);
}

// ───────────────────────────── o mapa de 12 semanas ───────────────────────
function esCalendario(semanas) {
  const n = semanas || 12, mins = esMinutosPorDia(), hoje = hojeISO();
  const ini = spSomaDias(inicioSemanaISO(), -7 * (n - 1));
  const max = Math.max(30, ...Object.values(mins));
  let col = '', total = 0, dias = 0;
  for (let w = 0; w < n; w++) {
    let c = '';
    for (let k = 0; k < 7; k++) {
      const iso = spSomaDias(ini, w * 7 + k), v = mins[iso] || 0;
      if (iso <= hoje && v) { total += v; dias++; }
      const nivel = iso > hoje ? 'fut' : !v ? 'n0' : v < max * 0.25 ? 'n1' : v < max * 0.5 ? 'n2' : v < max * 0.8 ? 'n3' : 'n4';
      c += `<button type="button" class="es-dia ${nivel}${iso === hoje ? ' hoje' : ''}${esEstado.dia === iso ? ' sel' : ''}" ${iso > hoje ? 'disabled' : `onclick="esEscolherDia('${iso}')"`} title="${diaSemanaCurto(iso)} ${isoParaBR(iso).slice(0, 5)}${v ? ' · ' + fmtMin(v) : ''}"></button>`;
    }
    col += `<div class="es-sem">${c}</div>`;
  }
  const seq = streakEstudo();
  let info = `<span class="sp-dica">Toque num dia para ver o que foi estudado.</span>`;
  if (esEstado.dia) {
    const ss = sessions.filter(s => s.date === esEstado.dia);
    info = `<span><b>${diaSemanaCurto(esEstado.dia)} ${isoParaBR(esEstado.dia).slice(0, 5)}</b> · ${ss.length ? ss.map(s => `${fmtMin(s.minutes)} ${esc(temaNome(s.topicId))}${s.note && s.note !== 'Pomodoro' ? ' (' + esc(s.note) + ')' : ''}`).join(' · ') : (mins[esEstado.dia] ? fmtMin(mins[esEstado.dia]) + ' no Pomodoro' : 'sem estudo')}</span>`;
  }
  return `<div class="es-cal-cab"><b>${seq ? `🔥 ${seq} ${palavra(seq, 'dia seguido', 'dias seguidos')}` : 'Comece hoje a sequência'}</b><small>${fmtMin(total)} em ${n} semanas · ${dias} ${palavra(dias, 'dia', 'dias')} com estudo</small></div>
    <div class="es-cal">${col}</div>
    <div class="es-cal-leg"><small>menos</small><i class="es-dia n0"></i><i class="es-dia n1"></i><i class="es-dia n2"></i><i class="es-dia n3"></i><i class="es-dia n4"></i><small>mais</small></div>
    <div class="sp-info">${info}</div>`;
}
function esEscolherDia(iso) { esEstado.dia = esEstado.dia === iso ? '' : iso; renderMesaEstudos(); renderSessoesEstudos(); }

// ───────────────────────────── os marcadores ──────────────────────────────
function esMarcadores() {
  const ativos = topics.filter(t => !t.archived);
  if (!ativos.length) return '<p class="hint">Crie um tema (ex.: "Gestão de clínicas", meta de 3 h por semana) — ou escreva <b>#tema</b> na barra acima.</p>';
  return `<div class="es-marcs">${ativos.map(t => {
    const min = minutosNaSemana(t.id), meta = t.weeklyGoalMin || 0, pct = meta ? Math.min(100, Math.round(min / meta * 100)) : 0;
    return `<button type="button" class="es-marc${esEstado.tema === String(t.id) ? ' sel' : ''}" style="--c:${t.color}" onclick="esFiltrarTema('${t.id}')" title="Filtrar a estante por ${esc(t.name)}">
      <span class="es-marc-nome">${esc(t.name)}</span>
      <span class="es-marc-fita"><i style="width:${meta ? Math.max(4, pct) : 0}%"></i></span>
      <span class="es-marc-n">${fmtMin(min)}${meta ? `<small> / ${fmtMin(meta)}</small>` : ''}</span></button>`;
  }).join('')}</div>`;
}
function esFiltrarTema(id) { esEstado.tema = esEstado.tema === String(id) ? '' : String(id); verSecaoEstudos('estante'); renderEstanteEstudos(); renderMesaEstudos(); }

// ───────────────────────────── desenhar ───────────────────────────────────
function renderMesaEstudos() {
  const el = document.getElementById('es-mesa'); if (!el) return;
  const livro = esLivroDaMesa(); esEstado.naMesa = livro ? livro.id : null;
  el.innerHTML = `${esEstanteDaMesa()}
    ${esLivroAberto(livro)}
    <div class="es-duas">
      <section class="es-quadro">${esCalendario(12)}</section>
      <section class="es-quadro"><div class="es-cal-cab"><b>Marcadores</b><small>a meta da semana de cada tema</small></div>${esMarcadores()}</section>
    </div>`;
}
/** A seção Estante: todos os materiais, prateleira por tema (ou só o tema escolhido nos marcadores). */
function renderEstanteEstudos() {
  const el = document.getElementById('es-estante'); if (!el) return;
  const naMesa = esLivroDaMesa(); esEstado.naMesa = naMesa ? naMesa.id : null;
  const temas =[...topics.filter(t => !t.archived), { id: '', name: 'Geral', color: '#64748b' }];
  const filtro = esEstado.tema;
  const blocos = temas.filter(t => !filtro || String(t.id) === filtro).map(t => {
    const l = materials.filter(m => String(m.topicId || '') === String(t.id))
      .sort((a, b) => ({ andamento: 0, afazer: 1, concluido: 2 }[a.status] - { andamento: 0, afazer: 1, concluido: 2 }[b.status]) || (b.updatedAt || 0) - (a.updatedAt || 0));
    return l.length || (filtro && String(t.id) === filtro) ? esPrateleira(t.name, l, 'Nada neste tema ainda.') : '';
  }).join('');
  const livro = esEstado.aberto && materials.find(m => m.id === esEstado.aberto);
  el.innerHTML = `<div class="es-filtro">${[{ id: '', name: 'Todos os temas' }, ...topics.filter(t => !t.archived)].map(t =>
      `<span class="${String(filtro) === String(t.id) ? 'active' : ''}" onclick="esEstado.tema='${t.id}'; renderEstanteEstudos(); renderMesaEstudos()">${esc(t.name)}</span>`).join('')}</div>
    <div class="es-estante">${blocos || '<p class="hint">A estante está vazia. Escreva na barra acima: <em>A Psicologia Financeira livro #investimentos</em>.</p>'}</div>
    <div id="es-estante-livro">${livro ? esLivroAberto(livro) : '<p class="hint es-dica-livro">Toque numa lombada para abrir o livro aqui.</p>'}</div>`;
}
function renderSessoesEstudos() {
  const el = document.getElementById('es-sessoes-cal'); if (el) el.innerHTML = esCalendario(26);
}

// ───────────────────────────── a barra rápida ─────────────────────────────
// [palavra, tipo, sai do título?] — "livro/curso/artigo/vídeo/podcast" é rótulo e sai (se vier DEPOIS do nome:
// "Curso de Excel curso" → "Curso de Excel"); "aula, diretriz, youtube…" dizem o tipo mas fazem parte do nome.
const ES_TIPOS_PALAVRAS = [[/\blivros?\b/gi, 'livro', true], [/\bcursos?\b/gi, 'curso', true], [/\baulas?\b/gi, 'curso', false],
  [/\bartigos?\b/gi, 'artigo', true], [/\bdiretriz(es)?\b|\bpaper\b/gi, 'artigo', false],
  [/\bv[ií]deos?\b/gi, 'video', true], [/\byoutube\b/gi, 'video', false], [/\bpodcasts?\b/gi, 'podcast', true]];
/** "45 min inglês" → sessão · "O Mito da Startup livro #gestão" → material. */
function esEntender(txt) {
  let resto = String(txt || '');
  let temaId = '', temaNovo = '';
  resto = resto.replace(/(^|\s)#([\p{L}\p{N}_-]+)/u, (x, a, nome) => {
    const alvo = esSemAcento(nome);
    const t = topics.find(t => esSemAcento(t.name).replace(/\s+/g, '') === alvo) || topics.find(t => esSemAcento(t.name).replace(/\s+/g, '').startsWith(alvo));
    if (t) temaId = t.id; else temaNovo = nome.charAt(0).toUpperCase() + nome.slice(1);
    return ' ';
  });
  const dur = resto.match(/(^|\s)(\d+(?:[.,]\d+)?)\s*(h|hora|horas|min|mins|minutos?|m)(?=\s|$)/i);
  if (dur) {
    const n = parseFloat(dur[2].replace(',', '.')), minutos = Math.round(/^h/i.test(dur[3]) ? n * 60 : n);
    resto = resto.replace(dur[0], ' ');
    // sem #: o tema pode vir pelo nome no texto ("45 min inglês")
    if (!temaId && !temaNovo) { const t = topics.filter(t => !t.archived).find(t => esSemAcento(resto).includes(esSemAcento(t.name))); if (t) { temaId = t.id; resto = resto.replace(new RegExp(t.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' '); } }
    return { tipo: 'sessao', minutos, temaId, temaNovo, nota: resto.replace(/\s+/g, ' ').trim() };
  }
  let kind = 'livro', achou = false;
  for (const [re, k, sai] of ES_TIPOS_PALAVRAS) {
    const ms = [...resto.matchAll(re)]; if (!ms.length) continue;
    kind = k; achou = true;
    const ult = ms[ms.length - 1];
    // tira só a ÚLTIMA ocorrência, e só se não for a primeira palavra (aí ela é parte do nome)
    if (sai && resto.slice(0, ult.index).trim()) resto = resto.slice(0, ult.index) + ' ' + resto.slice(ult.index + ult[0].length);
    break;
  }
  let status = 'afazer';
  resto = resto.replace(/(^|\s)(!|lendo|come[cç]ando)(?=\s|$)/i, () => { status = 'andamento'; return ' '; });
  return { tipo: 'material', kind, achouTipo: achou, status, temaId, temaNovo, titulo: resto.replace(/\s+/g, ' ').trim() };
}
function esRapidaPrevia() {
  const el = document.getElementById('es-rapida-previa'), inp = document.getElementById('es-rapida'); if (!el || !inp) return;
  if (!inp.value.trim()) { el.innerHTML = '<span class="tar-dica">Ex.: <b>O Mito da Startup livro #gestão</b> vira material · <b>45 min inglês</b> vira sessão · <b>!</b> = já estou lendo.</span>'; return; }
  const e = esEntender(inp.value), partes = [];
  const tema = e.temaId ? `<span class="tar-lt" style="--cor:${temaCor(e.temaId)}">${esc(temaNome(e.temaId))}</span>` : e.temaNovo ? `<span class="tar-lt" style="--cor:var(--info)">${esc(e.temaNovo)} <small>(tema novo)</small></span>` : '<span class="tar-dica">Geral</span>';
  if (e.tipo === 'sessao') partes.push(`<span class="tar-lt" style="--cor:var(--ok)">⏱ sessão de ${fmtMin(e.minutos)}</span>`, tema);
  else partes.push(`<span class="tar-lt" style="--cor:var(--acento)">${ES_ICONE[e.kind]} ${e.kind}</span>`, tema, `<span class="tar-dica">${e.status === 'andamento' ? 'lendo agora' : 'na fila'}</span>`);
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.tipo === 'sessao' ? (e.nota || 'estudo') : (e.titulo || '…'))}</b> ${partes.join(' ')}`;
}
function esRapidaAdicionar() {
  const inp = document.getElementById('es-rapida'); if (!inp) return;
  const e = esEntender(inp.value);
  if (e.tipo === 'sessao' ? !(e.minutos > 0) : !e.titulo) { inp.focus(); return; }
  let temaId = e.temaId;
  if (e.temaNovo) { const t = { id: novoId(), name: e.temaNovo, area: 'outro', weeklyGoalMin: 0, color: CORES_TEMA[topics.length % CORES_TEMA.length], archived: false, createdAt: Date.now() }; topics.push(t); salvar('topics', topics); temaId = t.id; }
  if (e.tipo === 'sessao') {
    registrarSessao(temaId || '', e.minutos, e.nota || '', hojeISO());
    studyData.minutes += e.minutos; salvar('study', studyData);
    if (typeof updateStudyStats === 'function') updateStudyStats();
    toast(`⏱ +${fmtMin(e.minutos)} em ${temaNome(temaId)}.`);
  } else {
    const m = { id: novoId(), topicId: temaId || '', title: e.titulo, kind: e.kind, status: e.status, progress: 0, link: '', notes: '', createdAt: Date.now(), updatedAt: Date.now() };
    materials.push(m); salvar('materials', materials);
    if (e.status === 'andamento') esEstado.aberto = m.id;
    toast(`${ES_ICONE[e.kind]} "${m.title}" entrou na estante${e.status === 'andamento' ? ' — e está na mesa' : ', na fila'}.`);
  }
  inp.value = ''; esRapidaPrevia();
  redesenharEstudos(); if (typeof renderJournal === 'function') renderJournal();
  inp.focus();
}
