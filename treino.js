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
  ['som', 'vibrar', 'telaAcesa', 'agua'].forEach(k => { if (c[k] === undefined) c[k] = true; });
  return c;
}
/** 💧 (15/10, ideia dele: "sincronizar água com treino") — no descanso, um toque bebe 250 ml: soma na água do dia
 *  (a mesma do copo da Saúde) e na água DESTE treino, que aparece no resumo do fim. */
function tvBeber(ml) {
  const s = treinoEmAndamento(); if (!s) return;
  if (typeof beberAgua === 'function') beberAgua(ml);
  s.agua = (s.agua || 0) + ml; tvGravar(); tvRender();
  toast(`💧 +${ml} ml · ${spNum((hydration.ml || 0) / 1000)} de ${spNum((hydration.goal || 2500) / 1000)} L hoje`, 2500);
}
function tvAguaHTML(s) {
  if (!cfgTreinoVivo().agua) return '';
  const hoje = (typeof hydration !== 'undefined' && hydration.ml) || 0, meta = (typeof hydration !== 'undefined' && hydration.goal) || 2500;
  return `<button type="button" class="tv-agua" onclick="tvBeber(250)" title="Somar 250 ml na água de hoje">💧 <b>+250 ml</b><small>${spNum(hoje / 1000)} de ${spNum(meta / 1000)} L hoje${s.agua ? ` · ${s.agua} ml no treino` : ''}</small></button>`;
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
// ── aeróbico (19/10, ideia dele: "oferecer opções de adicionar aeróbico ao treino") ──
// Uma "série" só, medida em minutos: ▶ começa o cronômetro, ✓ termina e guarda os minutos feitos.
// No fim do tempo combinado, bipe e vibração (como o descanso); dá para seguir além.
function tvNovoAero(e) {
  return { id: e.id || novoId(), nome: e.nome, grupo: e.grupo || 'cardio', aerob: true, min: Number(e.min) || 20, int: e.int || 'moderado',
    series: 1, reps: (Number(e.min) || 20) + ' min', carga: 0, descanso: 0, repsAgora: '', cargaAgora: 0, feitas: [], aeroIni: 0, aeroAvisou: false };
}
function tvAeroMin(e) { return e.aeroIni ? Math.max(1, Math.round((Date.now() - e.aeroIni) / 60000)) : 0; }
function tvAeroComecar() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob || e.aeroIni) return;
  tvAcordarSom(); e.aeroIni = Date.now(); e.aeroAvisou = false; s.descansoAte = 0; tvVibrar(40); tvGravar(); tvRender();
}
// (20/10, ideia dele: dados objetivos no aeróbico) "Terminei" não grava na hora: abre a ficha de NÚMEROS — o tempo vem
// do cronômetro, ele digita a distância (ou o nível da máquina) e o app mostra pace/velocidade e o gasto em kcal.
function tvAeroTerminar() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob || !e.aeroIni) return;
  e.aeroPend = { seg: Math.max(60, Math.round((Date.now() - e.aeroIni) / 1000)) }; e.aeroIni = 0; tvVibrar(40);
  tvGravar(); tvRender();
}
/** "Já fiz" (correu na rua, sem o cronômetro): abre a ficha de números com o tempo da meta. */
function tvAeroAnotar() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob) return;
  e.aeroIni = 0; e.aeroPend = { seg: (Number(e.min) || 20) * 60 }; tvGravar(); tvRender();
}
/** Lê "31:20", "31" ou "1:05:00" → segundos. */
function tvLerTempo(txt) {
  const p = String(txt || '').trim().split(':').map(x => parseFloat(x.replace(',', '.')) || 0);
  return p.length >= 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60;
}
function tvAeroCampos() {
  const v = id => (document.getElementById(id) || {}).value || '';
  return { seg: tvLerTempo(v('tv-ae-tempo')), dist: parseFloat(v('tv-ae-dist').replace(',', '.')) || 0, nivel: parseFloat(v('tv-ae-nivel').replace(',', '.')) || 0 };
}
/** Enquanto ele digita: as contas embaixo, sem redesenhar (o cursor fica onde está). */
function tvAeroPrevia() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e) return;
  const c = tvAeroCampos(), r = exAeroContas(e.nome, c.seg, c.dist, c.nivel), t = EX_AERO_TIPOS[exAeroTipo(e.nome)];
  const el = document.getElementById('tv-ae-contas'); if (!el) return;
  const um = (b, l) => `<div class="tv-ae-m"><b>${b}</b><small>${l}</small></div>`;
  el.innerHTML = (t.ritmo === 'pace' ? um(r.ritmo ? r.ritmo.replace(' /km', '') : '—', 'pace /km') + um(r.kmh ? r.kmh.toFixed(1).replace('.', ',') : '—', 'km/h')
    : t.ritmo === 'kmh' ? um(r.kmh ? r.kmh.toFixed(1).replace('.', ',') : '—', 'km/h') + um(c.seg ? exMinSeg(c.seg) : '—', 'tempo')
    : t.ritmo ? um(r.ritmo ? r.ritmo.split(' /')[0] : '—', t.ritmo === '500m' ? '/500 m' : '/100 m') + um(c.seg ? exMinSeg(c.seg) : '—', 'tempo')
    : um(c.seg ? exMinSeg(c.seg) : '—', 'tempo') + um(r.met.toFixed(1).replace('.', ','), 'MET'))
    + um(r.kcal ? '≈ ' + r.kcal : '—', 'kcal');
  const n = document.getElementById('tv-ae-peso'); if (n) n.hidden = r.pesoReal;
}
function tvAeroGuardar() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob || !e.aeroPend) return;
  const c = tvAeroCampos(); if (!c.seg) { toast('Diga quanto tempo durou (ex.: 31:20).'); return; }
  const t = EX_AERO_TIPOS[exAeroTipo(e.nome)], r = exAeroContas(e.nome, c.seg, c.dist, c.nivel);
  e.feitas.push({ min: Math.max(1, Math.round(c.seg / 60)), seg: Math.round(c.seg), dist: c.dist || 0, unid: t.dist || '', nivel: c.nivel || 0,
    ritmo: r.ritmo, kcal: r.kcal, met: Math.round(r.met * 10) / 10, em: Date.now() });
  e.aeroPend = null;
  if (s.ex.every(x => x.feitas.length >= x.series)) { s.fim = true; tvGravar(); tvRender(); tvBipe(2); return; }
  const i = tvProximoIndice(s, s.atual); if (i >= 0) s.atual = i;
  tvGravar(); tvRender(true);
}
function tvAeroDescartar() { const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e) return; e.aeroPend = null; tvGravar(); tvRender(); }
function tvAeroFormHTML(s, e) {
  const t = EX_AERO_TIPOS[exAeroTipo(e.nome)], p = e.aeroPend;
  return `<form class="tv-ae-form" onsubmit="event.preventDefault(); tvAeroGuardar()">
      <div class="tv-ae-campos">
        <label><small>Tempo</small><input type="text" id="tv-ae-tempo" inputmode="numeric" value="${exMinSeg(p.seg)}" oninput="tvAeroPrevia()" aria-label="Tempo (minutos:segundos)"></label>
        ${t.dist ? `<label><small>Distância (${t.dist})</small><input type="text" id="tv-ae-dist" inputmode="decimal" placeholder="${t.dist === 'km' ? 'ex.: 5,2' : 'ex.: 1500'}" oninput="tvAeroPrevia()" aria-label="Distância em ${t.dist}"></label>` : ''}
        ${t.nivel ? `<label><small>Nível da máquina</small><input type="text" id="tv-ae-nivel" inputmode="numeric" placeholder="1 a 20" oninput="tvAeroPrevia()" aria-label="Nível da máquina"></label>` : ''}
      </div>
      <div class="tv-ae-contas" id="tv-ae-contas"></div>
      <p class="tv-ae-pe" id="tv-ae-peso">O gasto usa 70 kg: anote seu peso em Saúde → Corpo para a conta ficar certa.</p>
      <button type="submit" class="tv-fiz">✓ Guardar ${esc(e.nome)}</button>
      <button type="button" class="tv-desfaz" onclick="tvAeroDescartar()">voltar sem guardar</button>
    </form>`;
}
function tvAeroAjustar(d) {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob) return;
  e.min = Math.max(5, (Number(e.min) || 20) + d); e.reps = e.min + ' min'; e.aeroAvisou = false; tvGravar(); tvRender();
}
function tvAeroIntensidade(k) {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.aerob || !EX_INTENSIDADE[k]) return;
  e.int = k; tvGravar(); tvRender();
}
/** ＋ aeróbico no fim do treino de hoje (esteira depois da musculação), sem mexer na ficha. */
let tvEscolhendoAero = false;
function tvAddAero(i) {
  const s = treinoEmAndamento(); if (!s) return;
  if (i === undefined) { tvEscolhendoAero = !tvEscolhendoAero; tvRender(); return; }
  const nome = (EXERCICIOS.cardio || [])[i]; if (!nome) return;
  s.ex.push(tvNovoAero({ nome, grupo: 'cardio', min: 15 })); s.atual = s.ex.length - 1; s.fim = false; tvEscolhendoAero = false;
  tvGravar(); tvRender(); toast(`🏃 ${nome} entrou no fim do treino: 15 min. Ajuste e toque em Começar.`, 3500);
}
function tvAeroHTML(s, e) {
  if (e.aeroPend) return tvAeroFormHTML(s, e);
  const correndo = !!e.aeroIni, alvo = (Number(e.min) || 20) * 60000;
  const passou = correndo ? Date.now() - e.aeroIni : 0, c = 2 * Math.PI * 52, p = Math.min(1, passou / alvo);
  // (20/10) no lugar de leve/moderado/forte: o que vai ser medido ao terminar (e o "já fiz", para quem correu sem o cronômetro)
  const t = EX_AERO_TIPOS[exAeroTipo(e.nome)];
  const mede = t.dist ? `Ao terminar: ${t.dist === 'km' ? 'distância em km' : 'distância em metros'} → ${t.ritmo === 'kmh' ? 'velocidade' : t.ritmo === 'pace' ? 'pace' : 'ritmo'} e gasto em kcal` : t.nivel ? 'Ao terminar: o nível da máquina → gasto em kcal' : 'Ao terminar: o gasto em kcal pelo tempo';
  const ints = `<p class="tv-ae-mede">${mede}</p>${correndo ? '' : '<button type="button" class="tv-desfaz" onclick="tvAeroAnotar()">já fiz — só anotar os números</button>'}`;
  return `<div class="tv-aero">
      <div class="tv-descanso tv-aero-anel">
        <svg viewBox="0 0 120 120" class="tv-anel" aria-hidden="true"><circle cx="60" cy="60" r="52" class="tv-anel-fundo"/>
          <circle cx="60" cy="60" r="52" class="tv-anel-cheio" id="tv-aero-anel" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
        <div class="tv-desc-txt"><small>${correndo ? 'NO AERÓBICO' : 'META'}</small><b id="tv-aero-n">${correndo ? tvRelogio(passou) : (Number(e.min) || 20) + ' min'}</b><small id="tv-aero-de">${correndo ? 'de ' + (Number(e.min) || 20) + ' min' : ''}</small></div>
      </div>
      <div class="tv-ajustes"><div class="tv-aj"><button type="button" onclick="tvAeroAjustar(-5)" aria-label="Menos 5 minutos">−</button><span><b>${Number(e.min) || 20}</b><small>min</small></span><button type="button" onclick="tvAeroAjustar(5)" aria-label="Mais 5 minutos">＋</button></div></div>
      ${ints}
      ${tvAguaHTML(s)}
      <button type="button" class="tv-fiz" onclick="${correndo ? 'tvAeroTerminar()' : 'tvAeroComecar()'}">${correndo ? `✓ Terminei · ${tvAeroMin(e)} min` : `▶ Começar ${Number(e.min) || 20} min`}</button>
    </div>`;
}

// ── alongamento ao vivo (20/10, ideia dele) — tempo de sustentação, um cronômetro por lado ──
// ▶ Segurar 30 s → o anel conta para trás → bipe/vibra → (cada lado) "agora o esquerdo" → ▶ → conta a vez → descanso curto.
function tvNovoAlong(e) {
  return { id: e.id || novoId(), nome: e.nome, grupo: e.grupo || 'mobilidade', grupos: e.grupos, along: true, seg: Number(e.seg) || 30,
    lados: e.lados === undefined ? exLadosPadrao(e.nome) : !!e.lados, series: Math.max(1, Number(e.series) || 2), reps: (Number(e.seg) || 30) + ' s',
    carga: 0, descanso: Number(e.descanso) || 15, repsAgora: '', cargaAgora: 0, feitas: [], alIni: 0, alLado: 0 };
}
function tvAlongComecar() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.along || e.alIni) return;
  tvAcordarSom(); e.alIni = Date.now(); s.descansoAte = 0; tvVibrar(40); tvGravar(); tvRender();
}
/** O tempo acabou (o relógio chama) ou ele tocou em "pronto": direito → esquerdo; os dois lados → conta a vez. */
function tvAlongFim() {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.along || !e.alIni) return;
  e.alIni = 0; tvVibrar([120, 60, 120]); tvBipe(1);
  if (e.lados && !e.alLado) { e.alLado = 1; tvGravar(); tvRender(); return; }
  e.alLado = 0; e.feitas.push({ seg: e.seg, lados: e.lados, em: Date.now() });
  if (s.ex.every(x => x.feitas.length >= x.series)) { s.descansoAte = 0; s.fim = true; tvGravar(); tvRender(); tvBipe(2); return; }
  if (e.feitas.length >= e.series) { const i = tvProximoIndice(s, s.atual); if (i >= 0) s.atual = i; }
  s.descansoDe = e.descanso; s.descansoAte = Date.now() + e.descanso * 1000; tvAvisou = false;
  tvGravar(); tvRender();
}
function tvAlongAjustar(d) {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e || !e.along || e.alIni) return;
  e.seg = Math.max(10, Math.min(180, (Number(e.seg) || 30) + d)); e.reps = e.seg + ' s'; tvGravar(); tvRender();
}
function tvAlongHTML(s, e) {
  const correndo = !!e.alIni, alvo = (Number(e.seg) || 30) * 1000, passou = correndo ? Date.now() - e.alIni : 0;
  const c = 2 * Math.PI * 52, p = Math.min(1, passou / alvo), lado = e.lados ? (e.alLado ? 'esquerdo' : 'direito') : '';
  const vez = Math.min(e.series, e.feitas.length + 1);
  return `<div class="tv-aero tv-along">
      <div class="tv-descanso tv-aero-anel">
        <svg viewBox="0 0 120 120" class="tv-anel" aria-hidden="true"><circle cx="60" cy="60" r="52" class="tv-anel-fundo"/>
          <circle cx="60" cy="60" r="52" class="tv-anel-cheio" id="tv-along-anel" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - p)).toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
        <div class="tv-desc-txt"><small>${correndo ? 'SEGURE' : 'SUSTENTAÇÃO'}</small><b id="tv-along-n">${correndo ? tvRelogio(alvo - passou) : e.seg + ' s'}</b><small>${e.lados ? 'lado ' + lado : 'corpo todo'}</small></div>
      </div>
      <div class="tv-lados">${e.lados ? `<span class="${e.alLado ? '' : 'on'}">Direito</span><span class="${e.alLado ? 'on' : ''}">Esquerdo</span>` : ''}<span class="tv-vez">vez ${vez} de ${e.series}</span></div>
      ${correndo ? '' : `<div class="tv-ajustes"><div class="tv-aj"><button type="button" onclick="tvAlongAjustar(-5)" aria-label="Menos 5 segundos">−</button><span><b>${e.seg}</b><small>segundos</small></span><button type="button" onclick="tvAlongAjustar(5)" aria-label="Mais 5 segundos">＋</button></div></div>`}
      <button type="button" class="tv-fiz" onclick="${correndo ? 'tvAlongFim()' : 'tvAlongComecar()'}">${correndo ? '✓ Pronto' : `▶ Segurar ${e.seg} s${lado ? ' · ' + lado : ''}`}</button>
    </div>`;
}

/** O que vem a seguir, em palavras ("Série 3 · 10 × 30 kg" ou o próximo exercício). */
function tvASeguir(s) {
  const e = s.ex[s.atual]; if (!e) return '';
  const fmt = x => x.aerob ? `${Number(x.min) || 20} min` : x.along ? `${x.series} × ${Number(x.seg) || 30} s${x.lados ? ' cada lado' : ''}`
    : `${esc(String(x.repsAgora || x.reps))} × ${x.cargaAgora ? spNum(x.cargaAgora, x.cargaAgora % 1 ? 1 : 0) + ' kg' : 'peso do corpo'}`;
  if (e.aerob && e.feitas.length < e.series) return `${esc(e.nome)} · ${fmt(e)}`;
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
      ex: d.exercicios.map(e => exAerobico(e) ? tvNovoAero(e) : exAlongamento(e) ? tvNovoAlong(e)
        : ({ id: e.id, nome: e.nome, grupo: e.grupo, grupos: e.grupos, series: Math.max(1, Number(e.series) || 3),
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
  if (e.aerob && e.feitas.length < e.series) { if (e.aeroPend) tvAeroGuardar(); else if (e.aeroIni) tvAeroTerminar(); else tvAeroComecar(); return; }
  if (e.along && e.feitas.length < e.series) { if (e.alIni) tvAlongFim(); else tvAlongComecar(); return; }
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
// (20/10, ideia dele) "o marcador de peso tem que pedir valores além dos automáticos de 2,5 kg a cada clique: aumentar de
// 1 em 1 kg e poder escolher o valor quebrado (ex.: 37,5)" → − e ＋ andam 1 kg; o número é uma caixinha que aceita
// qualquer valor (vírgula ou ponto), arredondado a 0,1 kg.
function tvCarga(txt) {
  const s = treinoEmAndamento(); if (!s) return; const e = s.ex[s.atual]; if (!e) return;
  const n = parseFloat(String(txt || '').replace(',', '.'));
  e.cargaAgora = isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
  tvGravar(); tvRender();
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
    // (20/10) o aeróbico leva os números medidos: "Corrida ao ar livre 31 min 5,2 km (6:01 /km) · 430 kcal"
    if (e.aerob) return `${e.nome} ${e.feitas.map(f => `${Number(f.min) || 0} min${f.dist ? ' ' + String(f.dist).replace('.', ',') + ' ' + f.unid : ''}${f.ritmo ? ' (' + f.ritmo + ')' : ''}${f.kcal ? ' · ' + f.kcal + ' kcal' : ''}`).join(' + ')}`;
    if (e.along) return `${e.nome} ${e.feitas.length}x${Number(e.seg) || 30}s${e.lados ? ' cada lado' : ''}`;
    const reps = unicos(e.feitas.map(f => String(f.reps))), cargas = unicos(e.feitas.map(f => Number(f.carga) || 0)).filter(Boolean);
    return `${e.nome} ${e.feitas.length}x${reps.join('/')}${cargas.length ? ' ' + cargas.map(c => String(c).replace('.', ',')).join('/') + 'kg' : ''}`;
  });
  // só aeróbico no treino? então o tipo é o do aeróbico (esteira = corrida, bike = bike…), não "musculação"
  const aeros = feitos.filter(e => e.aerob), soAero = aeros.length === feitos.length, soAlong = feitos.every(e => e.along);
  const tipoAero = n => /corrida|esteira/i.test(n) ? 'corrida' : /caminhada/i.test(n) ? 'caminhada' : /bike|bicicleta/i.test(n) ? 'bike' : /nata/i.test(n) ? 'natacao' : 'outro';
  const intAero = { leve: 1, moderado: 2, forte: 3 };
  // a intensidade (1–3) agora sai do MET medido; o aeróbico antigo (sem MET) ainda usa leve/moderado/forte
  const intDe = f => f.met ? exIntDoMet(f.met) : intAero[f.int] || 2;
  const cardioMin = aeros.reduce((a, e) => a + e.feitas.reduce((b, f) => b + (Number(f.min) || 0), 0), 0);
  const kcal = aeros.reduce((a, e) => a + e.feitas.reduce((b, f) => b + (Number(f.kcal) || 0), 0), 0);
  workouts.push({ id: novoId(), createdAt: Date.now(), date: s.data, type: soAero ? tipoAero(aeros[0].nome) : soAlong ? 'alongamento' : 'musculacao', minutes: tvMinutos(s),
    intensity: soAero ? Math.max(...aeros.flatMap(e => e.feitas.map(intDe))) : soAlong ? 1 : 2,
    exercises: linhas, note: s.titulo, aoVivo: { series: tvFeitas(s), volume: Math.round(tvVolume(s)), ...(cardioMin ? { cardioMin } : {}), ...(kcal ? { kcal } : {}) } });
  salvar('workouts', workouts);
  const f = fichaPorId(s.fichaId), d = f && f.dias[s.dia];
  if (f && d) {
    f.ultimoUso = s.data; d.ultimoUso = s.data;
    if (s.atualizarFicha) feitos.filter(e => !e.aerob).forEach(e => {
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
  const ea = s.ex[s.atual];
  // (20/10) o alongamento conta PARA TRÁS; no fim do tempo, troca de lado ou conta a vez sozinho
  if (ea && ea.along && ea.alIni && !s.fim) {
    const alvo = (Number(ea.seg) || 30) * 1000, passou = Date.now() - ea.alIni;
    const n = document.getElementById('tv-along-n'); if (n) n.textContent = tvRelogio(Math.max(0, alvo - passou));
    const anel = document.getElementById('tv-along-anel');
    if (anel) { const c = 2 * Math.PI * 52; anel.style.strokeDashoffset = (c * (1 - Math.min(1, passou / alvo))).toFixed(1); }
    if (passou >= alvo) tvAlongFim();
  }
  if (ea && ea.aerob && ea.aeroIni && !s.fim) {
    const passou = Date.now() - ea.aeroIni, alvo = (Number(ea.min) || 20) * 60000;
    const n = document.getElementById('tv-aero-n'); if (n) n.textContent = tvRelogio(passou);
    const anel = document.getElementById('tv-aero-anel');
    if (anel) { const c = 2 * Math.PI * 52; anel.style.strokeDashoffset = (c * (1 - Math.min(1, passou / alvo))).toFixed(1); }
    const bt = document.querySelector('#tv-caixa .tv-aero .tv-fiz'); if (bt) bt.textContent = `✓ Terminei · ${tvAeroMin(ea)} min`;
    if (passou >= alvo && !ea.aeroAvisou) { ea.aeroAvisou = true; tvGravar(); tvBipe(2); tvVibrar([180, 90, 180]); toast(`🏃 ${ea.nome}: ${ea.min} min feitos! Pode seguir ou terminar.`, 4000); }
  }
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
          <p>${tvMinutos(s)} min · ${feitas} de ${total} séries${vol ? ` · ${vol.toLocaleString('pt-BR')} kg levantados` : ''}${s.agua ? ` · 💧 ${s.agua} ml de água` : ''}</p></div></div>
        ${cfgTreinoVivo().agua ? tvAguaHTML(s) : ''}
        <ul class="tv-fim-lista">${s.ex.map(e => `<li class="${e.feitas.length ? '' : 'pulado'}"><b>${esc(e.nome)}</b><span>${e.feitas.length ? e.feitas.map(f => e.aerob ? `${Number(f.min) || 0} min${f.dist ? ' · ' + String(f.dist).replace('.', ',') + ' ' + f.unid : ''}${f.ritmo ? ' · ' + f.ritmo : ''}${f.kcal ? ' · ≈ ' + f.kcal + ' kcal' : ''}${f.int && !f.met ? ' · ' + (EX_INTENSIDADE[f.int] || EX_INTENSIDADE.moderado)[1] : ''}` : e.along ? `${Number(f.seg) || 30} s${f.lados ? ' cada lado' : ''}` : `${esc(String(f.reps))}×${f.carga ? spNum(f.carga, f.carga % 1 ? 1 : 0) : '—'}`).join(' · ') : 'não feito'}</span></li>`).join('')}</ul>
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
  const papel = typeof musculosDoExercicio === 'function' ? musculosDoExercicio(e.nome, e.grupo, e.grupos) : { padrao: 'alongar' };
  const mov = (typeof EX_FIGURAS !== 'undefined' && EX_FIGURAS[papel.padrao]) ? EX_FIGURAS[papel.padrao].nome : '';
  // (19/10) todos os grupos do exercício, não só o principal ("Costas · com Bíceps, Antebraço")
  const grupoNome = typeof gruposDoExercicioTexto === 'function' ? gruposDoExercicioTexto(e.nome, e.grupo, e.grupos) : esc((GRUPOS_MUSC[e.grupo] || ['', ''])[1]);
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
        ${tvAguaHTML(s)}
        <p class="tv-seguir"><small>A SEGUIR</small>${tvASeguir(s)}</p>
      </div>`
    : `${acabouDescanso ? `<p class="tv-bora">Bora! ${tvASeguir(s)}</p>` : ''}
      <button type="button" class="tv-fiz" onclick="tvFiz()" ${completo ? 'title="Este já acabou — vai para o próximo"' : ''}>${completo ? 'Próximo exercício ›' : `✓ Fiz a série ${serie}`}</button>`;
  caixa.innerHTML = `${topo}
    <section class="tv-palco">
      <div class="tv-fig">${typeof mapaDoExercicio === 'function' ? mapaDoExercicio(e.nome, e.grupo, '', e.grupos) : ''}
        <span class="tv-mov">${typeof figuraDoNome === 'function' ? figuraDoNome(e.nome, e.grupo, 26) : ''}<small>${esc(mov)}</small></span></div>
      <div class="tv-ex">
        <small class="tv-ex-n">Exercício ${s.atual + 1} de ${s.ex.length}${grupoNome ? ' · ' + grupoNome : ''}</small>
        <h2>${esc(e.nome)}</h2>
        ${banco && banco.dica ? `<p class="tv-dica">${esc(banco.dica)}</p>` : ''}
        ${e.aerob ? (completo ? `<p class="tv-ok">✓ ${e.feitas.reduce((a, f) => a + (Number(f.min) || 0), 0)} min feitos</p>${acao}` : tvAeroHTML(s, e))
          : e.along && !completo && !(s.descansoAte > Date.now()) ? tvAlongHTML(s, e) : `<div class="tv-series" aria-label="Séries">${Array.from({ length: e.series }, (_, k) => `<i class="${k < e.feitas.length ? 'ok' : k === e.feitas.length ? 'agora' : ''}">${k < e.feitas.length ? '✓' : k + 1}</i>`).join('')}</div>
        ${completo ? '<p class="tv-ok">✓ Todas as séries feitas</p>' : e.along ? '' : `<div class="tv-ajustes">
          <div class="tv-aj"><button type="button" onclick="tvAjustar('reps', -1)" aria-label="Menos repetições">−</button><span><b>${esc(String(e.repsAgora || e.reps))}</b><small>reps</small></span><button type="button" onclick="tvAjustar('reps', 1)" aria-label="Mais repetições">＋</button></div>
          <div class="tv-aj"><button type="button" onclick="tvAjustar('carga', -1)" aria-label="Menos 1 kg">−</button><span><input type="text" class="tv-carga-in" inputmode="decimal" enterkeyhint="done" aria-label="Carga em kg (pode digitar, ex.: 37,5)" value="${e.cargaAgora ? String(spNum(e.cargaAgora, e.cargaAgora % 1 ? 1 : 0)) : ''}" placeholder="—" onfocus="this.select()" onchange="tvCarga(this.value)" onkeydown="if (event.key === 'Enter') this.blur()"><small>kg</small></span><button type="button" onclick="tvAjustar('carga', 1)" aria-label="Mais 1 kg">＋</button></div>
        </div>`}
        ${acao}`}
        ${feitas ? '<button type="button" class="tv-desfaz" onclick="tvDesfazer()">↶ desfazer a última série</button>' : ''}
      </div>
    </section>
    ${lista}
    ${tvEscolhendoAero ? `<div class="tv-add-aero"><span class="tv-rot">Qual aeróbico?</span>${(EXERCICIOS.cardio || []).map((n, i) => `<button type="button" class="tv-sup-novo" onclick="tvAddAero(${i})">${esc(n)}</button>`).join('')}</div>` : ''}
    ${tvSuplementosHTML()}
    <footer class="tv-pe"><button type="button" class="mini-btn${tvEscolhendoAero ? ' on' : ''}" onclick="tvAddAero()" title="Pôr um aeróbico no fim do treino de hoje">🏃 ＋ aeróbico</button><button type="button" class="mini-btn" onclick="tvTerminar()">Terminar treino</button><button type="button" class="mini-btn" onclick="tvDescartar()">Descartar</button></footer>`;
}

// teclado (computador): espaço/Enter = fiz a série; Esc = sair (o treino fica guardado)
document.addEventListener('keydown', ev => {
  if (!tvAberto()) return;
  if (ev.key === 'Escape') { ev.preventDefault(); tvFechar(); return; }
  if ((ev.key === ' ' || ev.key === 'Enter') && !(ev.target && ev.target.closest && ev.target.closest('button, input, select, textarea'))) {
    ev.preventDefault(); const s = treinoEmAndamento(); if (s && !s.fim && !(s.descansoAte > Date.now())) tvFiz();
  }
});
