// ════════════════════════════════════════════════════════════════════════════
// ABERTURA — tela preta → um feixe de luz desce até o centro → a luz pulsa → a onda
// abre o app. Base: a vinheta do J.A.R.V.I.S. (Trinca de Ases). O som é do Genesis:
// "Star Wars, só que aveludado, num corte simples, misturando com Jay Dilla" —
// metais quentes subindo, um grave quando a luz chega ao centro, e um corte de
// acordes e bateria fora da grade (o balanço "bêbado" do Dilla), com chiado de vinil.
// Tudo sintetizado aqui (Web Audio): nenhum arquivo, funciona offline.
//
// O navegador NÃO deixa tocar som sem um toque antes. Por isso: tenta tocar; se o
// aparelho bloquear, aparece um ponto de luz com "toque para entrar" e o toque
// dispara luz e som juntos. Config → Núcleo → Abertura: com som / só luz / desligada.
// Repete ao voltar para o app depois de 5 minutos fora (como no Jarvis).
// ════════════════════════════════════════════════════════════════════════════
const ABERTURA_MODOS = { som: 'Com som (toque para entrar, se o aparelho pedir)', luz: 'Só a luz, sem som', off: 'Desligada' };
function modoAbertura() { return (typeof prefs !== 'undefined' && prefs.abertura) || 'som'; }

let abCtx = null;
function contextoAudio() {
  if (!abCtx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; abCtx = new C(); }
  return abCtx;
}

/** O som da abertura (~3 s). t = instante de início no relógio do áudio. */
function somAbertura(ctx) {
  const t = ctx.currentTime + 0.05;
  // saída: compressor (cola tudo) → "fita" (passa-baixa que fecha no fim) → volume
  const mestre = ctx.createGain(); mestre.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const fita = ctx.createBiquadFilter(); fita.type = 'lowpass'; fita.frequency.value = 9000;
  fita.frequency.setValueAtTime(9000, t + 2.3); fita.frequency.exponentialRampToValueAtTime(500, t + 3.0);
  mestre.connect(comp); comp.connect(fita); fita.connect(ctx.destination);
  mestre.gain.setValueAtTime(0.55, t + 2.6); mestre.gain.linearRampToValueAtTime(0, t + 3.1);

  // ruído (vinil, caixa, chimbal)
  const ruido = (() => { const b = ctx.createBuffer(1, ctx.sampleRate * 3.2, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
  const tocaRuido = (ini, dur, tipo, freq, vol) => {
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(ini, Math.random() * 2); s.stop(ini + dur + 0.05);
  };
  // chiado de vinil por baixo de tudo + alguns estalos
  tocaRuido(t, 3.0, 'bandpass', 2600, 0.03);
  for (let k = 0; k < 9; k++) tocaRuido(t + Math.random() * 2.8, 0.012, 'highpass', 3000, 0.12 * Math.random());

  // os metais: ré menor com nona, subindo e abrindo o filtro (o "Star Wars" aveludado)
  const acorde = [146.83, 220.0, 293.66, 349.23, 329.63];
  const filtroPad = ctx.createBiquadFilter(); filtroPad.type = 'lowpass'; filtroPad.Q.value = 0.8;
  filtroPad.frequency.setValueAtTime(240, t); filtroPad.frequency.exponentialRampToValueAtTime(2300, t + 1.1);
  filtroPad.frequency.exponentialRampToValueAtTime(900, t + 2.8);
  const gPad = ctx.createGain();
  gPad.gain.setValueAtTime(0.0001, t); gPad.gain.exponentialRampToValueAtTime(0.16, t + 1.05);
  gPad.gain.linearRampToValueAtTime(0.05, t + 1.25); gPad.gain.linearRampToValueAtTime(0.0001, t + 2.9);
  filtroPad.connect(gPad); gPad.connect(mestre);
  acorde.forEach((f, i) => [-7, 7].forEach(cents => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents + (i === 4 ? 0 : 0);
    o.connect(filtroPad); o.start(t); o.stop(t + 3);
  }));

  // o grave quando a luz chega ao centro
  const boom = ctx.createOscillator(); boom.type = 'sine';
  boom.frequency.setValueAtTime(92, t + 1.1); boom.frequency.exponentialRampToValueAtTime(41, t + 1.6);
  const gB = ctx.createGain(); gB.gain.setValueAtTime(0.0001, t + 1.08); gB.gain.exponentialRampToValueAtTime(0.7, t + 1.13); gB.gain.exponentialRampToValueAtTime(0.0001, t + 1.85);
  boom.connect(gB); gB.connect(mestre); boom.start(t + 1.05); boom.stop(t + 1.9);

  // o corte (Dilla): o acorde em fatias curtas, FORA da grade de propósito — umas adiantadas, outras arrastadas
  const fatia = (ini, dur, vol) => {
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    f2.connect(g); g.connect(mestre);
    acorde.slice(0, 4).forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * 2; o.detune.value = -4; o.connect(f2); o.start(ini); o.stop(ini + dur + 0.02); });
  };
  [[1.20, 0.12, 0.07], [1.47, 0.09, 0.05], [1.77, 0.13, 0.07], [2.03, 0.10, 0.045]].forEach(([d, dur, v]) => fatia(t + d, dur, v));
  // bateria preguiçosa: bumbo, chimbal adiantado, caixa arrastada
  const bumbo = ini => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, ini); o.frequency.exponentialRampToValueAtTime(45, ini + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.3);
    o.connect(g); g.connect(mestre); o.start(ini); o.stop(ini + 0.32);
  };
  const caixa = ini => {
    tocaRuido(ini, 0.16, 'highpass', 1800, 0.22);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.18, ini); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.1);
    o.connect(g); g.connect(mestre); o.start(ini); o.stop(ini + 0.12);
  };
  bumbo(t + 1.16); bumbo(t + 1.90);
  caixa(t + 1.56); caixa(t + 2.27);
  [1.33, 1.69, 2.06, 2.40].forEach(d => tocaRuido(t + d, 0.035, 'highpass', 7200, 0.06));
}

// ───────────────────────────── a luz ───────────────────────────────────────
let abTimers = [];
function animarAbertura(comSom) {
  const el = document.getElementById('gn-abertura'); if (!el) return;
  el.classList.remove('esperando'); el.classList.add('rodando');
  if (comSom) { const ctx = contextoAudio(); if (ctx) { try { if (ctx.state !== 'running') ctx.resume(); somAbertura(ctx); } catch (e) { } } }
  abTimers.forEach(clearTimeout);
  // a esfera chega de longe logo depois do pulso da luz
  abTimers.push(setTimeout(() => { if (window.JarvisBrain && document.body.classList.contains('nu-ativo')) window.JarvisBrain.entrada(); }, 1150));
  abTimers.push(setTimeout(() => { el.classList.remove('rodando'); el.hidden = true; document.documentElement.classList.remove('gn-abrindo'); }, 2350));
}
function esperarToque() {
  const el = document.getElementById('gn-abertura'); if (!el) return;
  el.classList.add('esperando');
  const vai = e => {
    if (e && e.type === 'keydown' && !['Enter', ' ', 'Escape'].includes(e.key)) return;
    el.removeEventListener('pointerdown', vai); window.removeEventListener('keydown', vai);
    animarAbertura(!(e && e.key === 'Escape'));
  };
  el.addEventListener('pointerdown', vai); window.addEventListener('keydown', vai);
}
function iniciarAbertura() {
  const el = document.getElementById('gn-abertura'); if (!el) return;
  const modo = modoAbertura();
  const nova = typeof cascaNova !== 'function' || cascaNova();
  if (modo === 'off' || !nova) { el.hidden = true; document.documentElement.classList.remove('gn-abrindo'); return; }
  el.hidden = false; document.documentElement.classList.add('gn-abrindo');
  if (modo === 'luz') { animarAbertura(false); return; }
  // com som: o aparelho já deixa tocar? então vai direto; se não, espera um toque
  const ctx = contextoAudio();
  if (ctx && ctx.state === 'running') animarAbertura(true); else esperarToque();
}
function escolherAbertura(m) { prefs.abertura = m; localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); if (typeof renderNucleoConfig === 'function') renderNucleoConfig(); }
function previaAbertura() { const ctx = contextoAudio(); if (ctx && ctx.state !== 'running') ctx.resume(); const el = document.getElementById('gn-abertura'); if (!el) return; el.hidden = false; document.documentElement.classList.add('gn-abrindo'); animarAbertura(modoAbertura() !== 'luz'); }

// repete ao voltar depois de 5 minutos fora
let abSaiuEm = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { abSaiuEm = Date.now(); return; }
  if (abSaiuEm && Date.now() - abSaiuEm > 5 * 60000 && document.body.classList.contains('nu-ativo')) iniciarAbertura();
});

iniciarAbertura();
