// ════════════════════════════════════════════════════════════════════════════
// TREINO AO VIVO (09/10/2026) — bloco ⑤, S1
// ────────────────────────────────────────────────────────────────────────────
// Ditado dele: "clico que fiz a série, conta os segundos de descanso, sinaliza
// o próximo" + "mesclar com whey/creatina do dia, tudo sincronizado".
//
// Uma tela própria, para usar na academia com o celular na mão: o exercício da
// vez (com o mapa do corpo aceso), a série, reps e carga ajustáveis, o botão
// grande "Fiz a série", o descanso contando sozinho (bipe e vibração no fim) e
// o que vem a seguir. Os suplementos do dia ficam ali mesmo, num toque.
//
// O treino EM ANDAMENTO é rascunho deste aparelho (cache local `lifeos_treino_vivo`,
// como as preferências): sobrevive a fechar o app no meio da série. O que
// sincroniza é o RESULTADO — o treino em `workouts`, as cargas novas na ficha
// (`fichas`) e as doses de suplemento em `medical` (o porta-comprimidos).
// Nada de módulo novo (Regra da União intacta).
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const TV_CHAVE = 'lifeos_treino_vivo';
let tvEstado = null, tvTimer = null, tvTrava = null, tvAudio = null, tvAvisou = false;

// ───────────────────────────── guardar e ler ──────────────────────────────
function tvLer() { try { return JSON.parse(localStorage.getItem(TV_CHAVE) || 'null'); } catch (e) { return null; } }
function tvGravar() {
  try { if (tvEstado) localStorage.setItem(TV_CHAVE, JSON.stringify(tvEstado)); else localStorage.removeItem(TV_CHAVE); } catch (e) { }
}
/** O treino que está aberto neste aparelho (ou null). */
function treinoEmAndamento() { if (!tvEstado) tvEstado = tvLer(); return tvEstado; }
/** Som, vibração e tela acesa — ligam e desligam no ⚙ da Saúde. */
function cfgTreinoVivo() {
  prefs.treinoVivo = prefs.treinoVivo || {};
  const c = prefs.treinoVivo;
  ['som', 'vibrar', 'telaAcesa'].forEach(k => { if (c[k] === undefined) c[k] = true; });
  return c;
}
function tvMudarCfg(k) {
  const c = cfgTreinoVivo(); c[k] = !c[k];
  try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { }
  if (k === 'telaAcesa') { if (c.telaAcesa && tvAberto()) tvPrenderTela(); else tvSoltarTela(); }
}

// ───────────────────────────── contas ─────────────────────────────────────
function tvTotalSeries(s) { return s.ex.reduce((a, e) => a + e.series, 0); }
function tvFeitas(s) { return s.ex.reduce((a, e) => a + Math.min(e.series, e.feitas.length), 0); }
function tvVolume(s) { return s.ex.reduce((a, e) => a + e.feitas.reduce((b, f) => b + (Number(f.carga) || 0) * (parseInt(f.reps, 10) || 0), 0), 0); }
function tvMinutos(s) { return Math.max(1, Math.round((Date.now() - s.inicio) / 60000)); }
function tvRelogio(ms) { const t = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), x = t % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
/** O próximo exercício com série pendente, a partir de `de` (dá a volta na lista). */
function tvProximoIndice(s, de) {
  for (let k = 1; k <= s.ex.length; k++) { const i = (de + k) % s.ex.length; if (s.ex[i].feitas.length < s.ex[i].series) return i; }
  return -1;
}
/** O que vem a seguir, em palavras ("Série 3 · 10 × 30 kg" ou o próximo exercício). */
function tvASeguir(s) {
  const e = s.ex[s.atual]; if (!e) return '';
  const fmt = x => `${esc(String(x.repsAgora || x.reps))} × ${x.cargaAgora ? spNum(x.cargaAgora, x.cargaAgora % 1 ? 1 : 0) + ' kg' : 'peso do corpo'}`;
  if (e.feitas.length < e.series) return `Série ${e.feitas.length + 1} de ${e.series} · ${fmt(e)}`;
  const i = tvProximoIndice(s, s.atual);
  return i < 0 ? 'Fim do treino 🎉' : `${esc(s.ex[i].nome)} · ${fmt(s.ex[i])}`;
}

// ───────────────────────────── começar e abrir ────────────────────────────
/** Treinar agora por um dia de ficha. Sem argumentos: reabre o que estiver em andamento. */
function treinoAoVivo(fichaId, diaIdx) {
  const atual = treinoEmAndamento();
  const pediuOutro = fichaId !== undefined && (!atual || atual.fichaId !== fichaId || atual.dia !== diaIdx);
  if (atual && pediuOutro && !confirm(`Já há um treino aberto (${atual.titulo} · ${tvFeitas(atual)} de ${tvTotalSeries(atual)} séries). Descartar e começar este?`)) { tvAbrir(); return; }
  if (pediuOutro) {
    const f = fichaPorId(fichaId), d = f && f.dias[diaIdx];
    if (!d || !(d.exercicios || []).length) { toast('Esse dia ainda não tem exercício nenhum.'); return; }
    tvEstado = {
      fichaId: f.id, dia: diaIdx, titulo: `${f.nome} — ${d.nome}`, data: hojeISO(), inicio: Date.now(),
      atual: 0, descansoAte: 0, descansoDe: 0, fim: false, atualizarFicha: true,
      ex: d.exercicios.map(e => ({ id: e.id, nome: e.nome, grupo: e.grupo, series: Math.max(1, Number(e.series) || 3),
        reps: String(e.reps || '10'), carga: Number(e.carga) || 0, descanso: Number(e.descanso) || 60,
        repsAgora: String(e.reps || '10'), cargaAgora: Number(e.carga) || 0, feitas: [] }))
    };
    tvGravar();
  } else if (!atual) { toast('Nenhum treino aberto. Escolha um dia da ficha.'); return; }
  tvAbrir();
}
function tvAberto() { const el = document.getElementById('tv'); return !!el && !el.hidden; }
function tvAbrir() {
  if (!treinoEmAndamento()) return;
  let el = document.getElementById('tv');
  if (!el) {
    el = document.createElement('div'); el.id = 'tv'; el.className = 'tv';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Treino ao vivo');
    el.innerHTML = '<div class="tv-caixa" id="tv-caixa"></div>';
    document.body.appendChild(el);
  }
  el.hidden = false; document.body.classList.add('tv-aberto');
  tvRender();
  clearInterval(tvTimer); tvTimer = setInterval(tvTique, 250);
  if (cfgTreinoVivo().telaAcesa) tvPrenderTela();
}
/** Fechar NÃO perde nada: o treino fica guardado e o painel mostra "Continuar". */
function tvFechar() {
  const el = document.getElementById('tv'); if (el) el.hidden = true;
  document.body.classList.remove('tv-aberto');
  clearInterval(tvTimer); tvTimer = null; tvSoltarTela();
  if (typeof renderPainelSaude === 'function') renderPainelSaude();
  if (typeof renderFichas === 'function') renderFichas();
}

// ───────────────────────────── as ações ───────────────────────────────────
function tvFiz() {
  const s = treinoEmAndamento(); if (!s || s.fim) return;
  const e = s.ex[s.atual]; if (!e) return;
  tvAcordarSom();   // o navegador só deixa tocar som depois de um toque: este é o toque
  if (e.feitas.length >= e.series) { const i = tvProximoIndice(s, s.atual); if (i >= 0) { s.atual = i; tvGravar(); tvRender(); } return; }
  e.feitas.push({ reps: e.repsAgora || e.reps, carga: Number(e.cargaAgora) || 0, em: Date.now() });
  tvVibrar(40);
  if (s.ex.every(x => x.feitas.length >= x.series)) { s.descansoAte = 0; s.fim = true; tvGravar(); tvRender(); tvBipe(2); return; }
  if (e.feitas.length >= e.series) { const i = tvProximoIndice(s, s.atual); if (i >= 0) s.atual = i; }
  s.descansoDe = e.descanso; s.descansoAte = Date.now() + e.descanso * 1000; tvAvisou = false;
  tvGravar(); tvRender();
}
function tvDesfazer() {
  const s = treinoEmAndamento(); if (!s) return;
  // a última série feita, em qualquer exercício (a mais recente pelo horário)
  let alvo = -1, quando = 0;
  s.ex.forEach((e, i) => { const f = e.feitas[e.feitas.length - 1]; if (f && f.em >= quando) { quando = f.em; alvo = i; } });
  if (alvo < 0) return;
  s.ex[alvo].feitas.pop(); s.atual = alvo; s.descansoAte = 0; s.fim = false;
  tvGravar(); tvRender(); toast('↶ Série desfeita.');
}
function tvAjustar(campo, d) {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e) return;
  if (campo === 'carga') e.cargaAgora = Math.max(0, Math.round(((Number(e.cargaAgora) || 0) + d) * 10) / 10);
  else { const n = parseInt(e.repsAgora, 10); e.repsAgora = String(Math.max(1, (isNaN(n) ? 10 : n) + d)); }
  tvGravar(); tvRender();
}
function tvIrPara(i) {
  const s = treinoEmAndamento(); if (!s || !s.ex[i]) return;
  s.atual = i; s.fim = false; tvGravar(); tvRender();
}
function tvMaisDescanso(seg) {
  const s = treinoEmAndamento(); if (!s || !s.descansoAte) return;
  s.descansoAte += seg * 1000; s.descansoDe += seg; tvGravar(); tvTique();
}
function tvPularDescanso() { const s = treinoEmAndamento(); if (!s) return; s.descansoAte = 0; tvGravar(); tvRender(); }
function tvTerminar() {
  const s = treinoEmAndamento(); if (!s) return;
  const faltam = tvTotalSeries(s) - tvFeitas(s);
  if (!tvFeitas(s)) { toast('Nenhuma série feita ainda.'); return; }
  if (faltam > 0 && !confirm(`Ainda ${faltam === 1 ? 'falta 1 série' : `faltam ${faltam} séries`}. Terminar assim mesmo?`)) return;
  s.fim = true; s.descansoAte = 0; tvGravar(); tvRender();
}
function tvDescartar() {
  if (!confirm('Descartar este treino? As séries marcadas somem (a ficha não muda).')) return;
  tvEstado = null; tvGravar(); tvFechar(); toast('Treino descartado.');
}
/** Grava o treino de verdade: vira um item de `workouts` (sincroniza), marca o hábito
 *  e, se ele quiser, leva as cargas de hoje para a ficha. */
function tvSalvar() {
  const s = treinoEmAndamento(); if (!s) return;
  const feitos = s.ex.filter(e => e.feitas.length);
  if (!feitos.length) { toast('Nenhuma série feita ainda.'); return; }
  const unicos = l => [...new Set(l)];
  const linhas = feitos.map(e => {
    const reps = unicos(e.feitas.map(f => String(f.reps))), cargas = unicos(e.feitas.map(f => Number(f.carga) || 0)).filter(Boolean);
    return `${e.nome} ${e.feitas.length}x${reps.join('/')}${cargas.length ? ' ' + cargas.map(c => String(c).replace('.', ',')).join('/') + 'kg' : ''}`;
  });
  workouts.push({ id: novoId(), createdAt: Date.now(), date: s.data, type: 'musculacao', minutes: tvMinutos(s), intensity: 2,
    exercises: linhas, note: s.titulo, aoVivo: { series: tvFeitas(s), volume: Math.round(tvVolume(s)) } });
  salvar('workouts', workouts);
  const f = fichaPorId(s.fichaId), d = f && f.dias[s.dia];
  if (f && d) {
    f.ultimoUso = s.data; d.ultimoUso = s.data;
    if (s.atualizarFicha) feitos.forEach(e => {
      const x = d.exercicios.find(y => y.id === e.id); const ult = e.feitas[e.feitas.length - 1];
      if (x && ult && Number(ult.carga) > 0) x.carga = Number(ult.carga);
    });
    salvar('fichas', fichas);
  }
  const marcou = s.data === hojeISO() && typeof marcarHabitoPorNome === 'function' && marcarHabitoPorNome(/trein|academia|workout|exerc/i);
  const resumo = `${tvFeitas(s)} séries · ${tvMinutos(s)} min`;
  tvEstado = null; tvGravar(); tvFechar();
  if (typeof renderSaude === 'function') renderSaude();
  if (typeof renderJournal === 'function') renderJournal();
  toast(`🏋️ Treino salvo — ${resumo}${marcou ? ' · hábito marcado' : ''}.`, 5000);
}

// ───────────────────────────── suplementos do dia ─────────────────────────
function tvSuplementosHTML() {
  if (typeof dosesDoDia !== 'function') return '';
  const ds = dosesDoDia(hojeISO()).filter(d => d.m.rotina && d.m.rotina.tipo === 'suplemento');
  const tem = re => medical.some(m => m.rotina && m.rotina.ativo !== false && re.test(m.title));
  const atalhos = [['Creatina', '5 g', /creatin/i], ['Whey protein', '30 g', /whey/i]].filter(([, , re]) => !tem(re))
    .map(([n, dose]) => `<button type="button" class="tv-sup-novo" onclick="tvNovoSuplemento('${n}', '${dose}')" title="Cadastrar na rotina (todo dia, sem horário) — ajuste no Médico">＋ ${n.split(' ')[0]}</button>`).join('');
  if (!ds.length && !atalhos) return '';
  return `<div class="tv-sup"><span class="tv-rot">Suplementos de hoje</span>
    ${ds.map(d => `<button type="button" class="tv-sup-ch${d.tomada ? ' on' : ''}" style="--c:${corDoRemedio(d.m)}" onclick="tomarDose(${d.m.id}, '${d.h}'); tvRender()" title="${d.tomada ? 'Tomado — toque para desfazer' : 'Marcar como tomado'}"><i>${d.tomada ? '✓' : '🌿'}</i>${esc(d.m.title)}${d.m.rotina.dose ? ` <small>${esc(d.m.rotina.dose)}</small>` : ''}${d.h ? ` <small>${d.h}</small>` : ''}</button>`).join('')}
    ${atalhos}</div>`;
}
function tvNovoSuplemento(nome, dose) {
  const rotina = { tipo: 'suplemento', dose, horarios: [], dias: 'todos', semana: [], ate: '', estoque: null, porDose: 1,
    habito: false, ativo: true, notas: '', inicio: hojeISO(),
    cor: SP_CORES_REMEDIO[medical.filter(x => x.rotina).length % SP_CORES_REMEDIO.length] };
  medical.push({ id: novoId(), kind: 'medicamento', title: nome, date: '', time: '', place: '', notes: '', done: false, eventId: null, createdAt: Date.now(), rotina, tomadas: {} });
  salvar('medical', medical);
  if (typeof renderSaude === 'function') renderSaude();
  tvRender();
  toast(`🌿 ${nome} na rotina (todo dia). Dose e horário se ajustam no Médico.`, 4500);
}

// ───────────────────────────── som, vibração, tela ────────────────────────
function tvAcordarSom() {
  if (!cfgTreinoVivo().som) return;
  try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; tvAudio = tvAudio || new C(); if (tvAudio.state === 'suspended') tvAudio.resume(); } catch (e) { tvAudio = null; }
}
function tvBipe(n) {
  if (!cfgTreinoVivo().som || !tvAudio) return;
  try {
    for (let i = 0; i < (n || 1); i++) {
      const t = tvAudio.currentTime + i * 0.22, o = tvAudio.createOscillator(), g = tvAudio.createGain();
      o.frequency.value = i ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(tvAudio.destination); o.start(t); o.stop(t + 0.2);
    }
  } catch (e) { }
}
function tvVibrar(p) { if (cfgTreinoVivo().vibrar && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { } }
/** Tela acesa durante o treino (o celular não apaga entre uma série e outra). */
async function tvPrenderTela() {
  try { if ('wakeLock' in navigator && !tvTrava) { tvTrava = await navigator.wakeLock.request('screen'); tvTrava.addEventListener('release', () => { tvTrava = null; }); } } catch (e) { tvTrava = null; }
}
function tvSoltarTela() { try { if (tvTrava) tvTrava.release(); } catch (e) { } tvTrava = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tvAberto()) { if (cfgTreinoVivo().telaAcesa) tvPrenderTela(); tvTique(); }
});

// ───────────────────────────── o relógio ──────────────────────────────────
/** A cada 250 ms: o tempo de treino e o descanso — sem redesenhar a tela inteira. */
function tvTique() {
  const s = treinoEmAndamento(); if (!s || !tvAberto()) return;
  const rel = document.getElementById('tv-relogio'); if (rel) rel.textContent = tvRelogio(Date.now() - s.inicio);
  if (!s.descansoAte) return;
  const falta = s.descansoAte - Date.now();
  if (falta <= 0) {
    s.descansoAte = 0; tvGravar();
    if (!tvAvisou) { tvAvisou = true; tvBipe(2); tvVibrar([180, 90, 180]); }
    tvRender(true);
    return;
  }
  const n = document.getElementById('tv-desc-n'); if (n) n.textContent = tvRelogio(falta);
  const anel = document.getElementById('tv-desc-anel');
  if (anel) { const c = 2 * Math.PI * 52, p = Math.min(1, falta / ((s.descansoDe || 60) * 1000)); anel.style.strokeDashoffset = (c * (1 - p)).toFixed(1); }
}

// ───────────────────────────── a tela ─────────────────────────────────────
function tvRender(acabouDescanso) {
  const caixa = document.getElementById('tv-caixa'); const s = treinoEmAndamento();
  if (!caixa || !s) return;
  const total = tvTotalSeries(s), feitas = tvFeitas(s), vol = Math.round(tvVolume(s));
  const topo = `<header class="tv-topo">
      <button type="button" class="tv-x" onclick="tvFechar()" title="Sair — o treino fica guardado">✕</button>
      <div class="tv-tit"><small>TREINO AO VIVO${s.data !== hojeISO() ? ' · começou ' + isoParaBR(s.data).slice(0, 5) : ''}</small><b>${esc(s.titulo)}</b></div>
      <span class="tv-relogio" id="tv-relogio" title="Tempo de treino">${tvRelogio(Date.now() - s.inicio)}</span>
    </header>
    <div class="tv-prog" title="${feitas} de ${total} séries"><i style="width:${total ? Math.round(feitas / total * 100) : 0}%"></i></div>
    <small class="tv-prog-t">${feitas} de ${total} séries${vol ? ` · ${vol.toLocaleString('pt-BR')} kg levantados` : ''}</small>`;
  const lista = `<div class="tv-lista">${s.ex.map((e, i) => `<button type="button" class="tv-item${i === s.atual && !s.fim ? ' on' : ''}${e.feitas.length >= e.series ? ' feito' : ''}" onclick="tvIrPara(${i})">
      <span class="tv-item-nome">${esc(e.nome)}</span><span class="tv-pontos">${Array.from({ length: e.series }, (_, k) => `<i class="${k < e.feitas.length ? 'ok' : ''}"></i>`).join('')}</span></button>`).join('')}</div>`;

  if (s.fim) {
    caixa.innerHTML = `${topo}
      <section class="tv-fim">
        <div class="tv-fim-cab"><span class="tv-fim-ic">💪</span><div><h2>Treino concluído</h2>
          <p>${tvMinutos(s)} min · ${feitas} de ${total} séries${vol ? ` · ${vol.toLocaleString('pt-BR')} kg levantados` : ''}</p></div></div>
        <ul class="tv-fim-lista">${s.ex.map(e => `<li class="${e.feitas.length ? '' : 'pulado'}"><b>${esc(e.nome)}</b><span>${e.feitas.length ? e.feitas.map(f => `${esc(String(f.reps))}×${f.carga ? spNum(f.carga, f.carga % 1 ? 1 : 0) : '—'}`).join(' · ') : 'não feito'}</span></li>`).join('')}</ul>
        <label class="check-line"><input type="checkbox" ${s.atualizarFicha ? 'checked' : ''} onchange="treinoEmAndamento().atualizarFicha = this.checked; tvGravar()"> Atualizar a ficha com as cargas de hoje</label>
        ${tvSuplementosHTML()}
        <div class="tv-fim-acoes">
          <button type="button" class="tv-fiz" onclick="tvSalvar()">✓ Salvar treino</button>
          <button type="button" class="mini-btn" onclick="tvIrPara(${Math.max(0, tvProximoIndice(s, -1))})">↩ Voltar ao treino</button>
          <button type="button" class="mini-btn" onclick="tvDescartar()">Descartar</button>
        </div>
      </section>`;
    return;
  }

  const e = s.ex[s.atual] || s.ex[0];
  const banco = typeof exercicioDoBanco === 'function' ? exercicioDoBanco(e.nome) : null;
  const papel = typeof musculosDoExercicio === 'function' ? musculosDoExercicio(e.nome, e.grupo) : { padrao: 'alongar' };
  const mov = (typeof EX_FIGURAS !== 'undefined' && EX_FIGURAS[papel.padrao]) ? EX_FIGURAS[papel.padrao].nome : '';
  const grupoNome = (GRUPOS_MUSC[e.grupo] || ['', ''])[1];
  const serie = Math.min(e.feitas.length + 1, e.series);
  const completo = e.feitas.length >= e.series;
  const desc = s.descansoAte && s.descansoAte > Date.now();
  const c = 2 * Math.PI * 52;
  const acao = desc
    ? `<div class="tv-descanso">
        <svg viewBox="0 0 120 120" class="tv-anel" aria-hidden="true"><circle cx="60" cy="60" r="52" class="tv-anel-fundo"/>
          <circle cx="60" cy="60" r="52" class="tv-anel-cheio" id="tv-desc-anel" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>
        <div class="tv-desc-txt"><small>DESCANSO</small><b id="tv-desc-n">${tvRelogio(s.descansoAte - Date.now())}</b></div>
        <div class="tv-desc-acoes"><button type="button" class="mini-btn" onclick="tvMaisDescanso(15)">＋15 s</button><button type="button" class="mini-btn" onclick="tvPularDescanso()">Pular ›</button></div>
        <p class="tv-seguir"><small>A SEGUIR</small>${tvASeguir(s)}</p>
      </div>`
    : `${acabouDescanso ? `<p class="tv-bora">Bora! ${tvASeguir(s)}</p>` : ''}
      <button type="button" class="tv-fiz" onclick="tvFiz()" ${completo ? 'title="Este já acabou — vai para o próximo"' : ''}>${completo ? 'Próximo exercício ›' : `✓ Fiz a série ${serie}`}</button>`;
  caixa.innerHTML = `${topo}
    <section class="tv-palco">
      <div class="tv-fig">${typeof mapaDoExercicio === 'function' ? mapaDoExercicio(e.nome, e.grupo, '') : ''}
        <span class="tv-mov">${typeof figuraDoNome === 'function' ? figuraDoNome(e.nome, e.grupo, 26) : ''}<small>${esc(mov)}</small></span></div>
      <div class="tv-ex">
        <small class="tv-ex-n">Exercício ${s.atual + 1} de ${s.ex.length}${grupoNome ? ' · ' + esc(grupoNome) : ''}</small>
        <h2>${esc(e.nome)}</h2>
        ${banco && banco.dica ? `<p class="tv-dica">${esc(banco.dica)}</p>` : ''}
        <div class="tv-series" aria-label="Séries">${Array.from({ length: e.series }, (_, k) => `<i class="${k < e.feitas.length ? 'ok' : k === e.feitas.length ? 'agora' : ''}">${k < e.feitas.length ? '✓' : k + 1}</i>`).join('')}</div>
        ${completo ? '<p class="tv-ok">✓ Todas as séries feitas</p>' : `<div class="tv-ajustes">
          <div class="tv-aj"><button type="button" onclick="tvAjustar('reps', -1)" aria-label="Menos repetições">−</button><span><b>${esc(String(e.repsAgora || e.reps))}</b><small>reps</small></span><button type="button" onclick="tvAjustar('reps', 1)" aria-label="Mais repetições">＋</button></div>
          <div class="tv-aj"><button type="button" onclick="tvAjustar('carga', -2.5)" aria-label="Menos carga">−</button><span><b>${e.cargaAgora ? spNum(e.cargaAgora, e.cargaAgora % 1 ? 1 : 0) : '—'}</b><small>kg</small></span><button type="button" onclick="tvAjustar('carga', 2.5)" aria-label="Mais carga">＋</button></div>
        </div>`}
        ${acao}
        ${feitas ? '<button type="button" class="tv-desfaz" onclick="tvDesfazer()">↶ desfazer a última série</button>' : ''}
      </div>
    </section>
    ${lista}
    ${tvSuplementosHTML()}
    <footer class="tv-pe"><button type="button" class="mini-btn" onclick="tvTerminar()">Terminar treino</button><button type="button" class="mini-btn" onclick="tvDescartar()">Descartar</button></footer>`;
}

// teclado (computador): espaço/Enter = fiz a série; Esc = sair (o treino fica guardado)
document.addEventListener('keydown', ev => {
  if (!tvAberto()) return;
  if (ev.key === 'Escape') { ev.preventDefault(); tvFechar(); return; }
  if ((ev.key === ' ' || ev.key === 'Enter') && !(ev.target && ev.target.closest && ev.target.closest('button, input, select, textarea'))) {
    ev.preventDefault(); const s = treinoEmAndamento(); if (s && !s.fim && !(s.descansoAte > Date.now())) tvFiz();
  }
});
