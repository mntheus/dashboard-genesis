function changeTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.getElementById('btn-' + tabId).classList.add('active');
}

// --- UTILITÁRIOS ---
/** Protege texto digitado pelo usuário antes de ir pra tela (um "<b>" digitado vira texto, não negrito). */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function isoDe(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function hojeISO() { return isoDe(new Date()); }
function hojeBR() { return new Date().toLocaleDateString('pt-BR'); }
function brParaISO(br) { const [d, m, y] = (br || '').split('/'); return y ? `${y}-${m}-${d}` : hojeISO(); }
function isoParaBR(iso) { const [y, m, d] = (iso || '').split('-'); return d ? `${d}/${m}/${y}` : ''; }
function formatCurrency(value) { return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
let ultimoIdGerado = 0;
/** Id único mesmo que dois itens sejam criados no mesmo milissegundo. */
function novoId() { let id = Date.now(); if (id <= ultimoIdGerado) id = ultimoIdGerado + 1; ultimoIdGerado = id; return id; }

let toastTimer = null;
function toast(msg, ms = 3500) {
  const el = document.getElementById('toast'); if (!el) return;
  el.innerText = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// Bando de dados e Migração
let shifts = JSON.parse(localStorage.getItem('lifeos_shifts')) || [];
let transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
let notes = JSON.parse(localStorage.getItem('lifeos_notes')) || [];
let events = JSON.parse(localStorage.getItem('lifeos_events')) || [];   // compromissos da agenda geral
let recurring = JSON.parse(localStorage.getItem('lifeos_recurring')) || []; // lançamentos recorrentes (modelos)
let tasklists = JSON.parse(localStorage.getItem('lifeos_tasklists')) || [{ id: 'padrao', name: 'Minhas tarefas' }]; // listas de tarefas
let places = JSON.parse(localStorage.getItem('lifeos_places')) || [       // locais de plantão com padrões (hora, duração, valor)
  { name: 'PSMI', time: '07:00', hours: 12, amount: 0 },
  { name: 'CISURG', time: '07:00', hours: 12, amount: 0 }
];

// Migração das tarefas de Strings para Objetos (Estilo Keep Notes)
let tasks = JSON.parse(localStorage.getItem('lifeos_tasks')) || [];
tasks = tasks.map(t => typeof t === 'string' ? { text: t, done: false } : t);

let habits = JSON.parse(localStorage.getItem('lifeos_habits')) || [
  { text: 'Cold Shower', icon: '💧', done: false },
  { text: 'Walk / Sunlight', icon: '🚶‍♂️', done: false },
  { text: 'Meditate', icon: '🧘‍♂️', done: false },
  { text: 'Workout', icon: '🏋️‍♂️', done: false },
  { text: 'Read', icon: '📖', done: false }
];

// Histórico dos hábitos: { date: 'dd/mm/aaaa' (dia a que os "done" atuais pertencem), dias: { 'aaaa-mm-dd': { total, feitos: [nomes] } } }
let habitLog = JSON.parse(localStorage.getItem('lifeos_habitlog')) || { date: hojeBR(), dias: {} };
if (!habitLog.dias) habitLog.dias = {};

// Preferências deste aparelho (não sincronizam): alarme do pomodoro
let prefs = JSON.parse(localStorage.getItem('lifeos_prefs')) || { alarmeTipo: 'sino', alarmeVolume: 70 };
function salvarPrefs() {
  const tipo = document.getElementById('alarme-tipo'); const vol = document.getElementById('alarme-volume');
  if (tipo) prefs.alarmeTipo = tipo.value;
  if (vol) prefs.alarmeVolume = Number(vol.value);
  localStorage.setItem('lifeos_prefs', JSON.stringify(prefs));
}
function carregarPrefsNaTela() {
  const tipo = document.getElementById('alarme-tipo'); const vol = document.getElementById('alarme-volume');
  if (tipo) tipo.value = prefs.alarmeTipo;
  if (vol) vol.value = prefs.alarmeVolume;
}

// --- POMODORO TIMER ---
// { date: 'dd/mm/aaaa', minutes: minutos de hoje, dias: { 'aaaa-mm-dd': minutos } }
let studyData = JSON.parse(localStorage.getItem('lifeos_study')) || { date: hojeBR(), minutes: 0, dias: {} };
if (!studyData.dias) studyData.dias = {};

let pomodoroDuration = parseInt(document.getElementById('pomodoro-input').value) * 60;
let timerTimeLeft = pomodoroDuration;
let timerInterval = null;
let timerEnd = null; // instante em que a sessão termina (funciona mesmo com a aba em segundo plano)

function updatePomodoroTime() {
  const inputVal = parseInt(document.getElementById('pomodoro-input').value);
  if (inputVal > 0 && !timerInterval) {
    pomodoroDuration = inputVal * 60;
    timerTimeLeft = pomodoroDuration;
    updateTimerDisplay();
  }
}

function updateTimerDisplay() {
  const m = Math.floor(timerTimeLeft / 60).toString().padStart(2, '0');
  const s = (timerTimeLeft % 60).toString().padStart(2, '0');
  document.getElementById('timer-display').innerText = `${m}:${s}`;
  document.title = timerInterval ? `${m}:${s} · Genesis` : 'Dashboard Genesis';
}

function updateStudyStats() {
  const h = Math.floor(studyData.minutes / 60);
  const m = studyData.minutes % 60;
  document.getElementById('study-time-today').innerText = `${h}h ${m}m`;
}

function startTimer() {
  if (timerInterval) return;
  prepararAudio(); // o navegador só libera som depois de um clique — este é o clique
  document.getElementById('btn-start-timer').style.display = 'none';
  document.getElementById('btn-pause-timer').style.display = 'inline-block';
  document.getElementById('pomodoro-input').disabled = true;
  timerEnd = Date.now() + timerTimeLeft * 1000;
  timerInterval = setInterval(() => {
    timerTimeLeft = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
    updateTimerDisplay();
    if (timerTimeLeft <= 0) { clearInterval(timerInterval); timerInterval = null; completePomodoro(); }
  }, 500);
  updateTimerDisplay();
}

function pauseTimer() {
  if (timerInterval) timerTimeLeft = Math.max(0, Math.round((timerEnd - Date.now()) / 1000));
  clearInterval(timerInterval); timerInterval = null;
  document.getElementById('btn-start-timer').style.display = 'inline-block';
  document.getElementById('btn-pause-timer').style.display = 'none';
  updateTimerDisplay();
}

function resetTimer() {
  pauseTimer();
  let inputVal = parseInt(document.getElementById('pomodoro-input').value);
  if (isNaN(inputVal) || inputVal <= 0) inputVal = 50;
  pomodoroDuration = inputVal * 60; timerTimeLeft = pomodoroDuration;
  document.getElementById('pomodoro-input').disabled = false; updateTimerDisplay();
}

function completePomodoro() {
  const mins = Math.round(pomodoroDuration / 60);
  studyData.minutes += mins; salvar('study', studyData);
  updateStudyStats(); renderJournal(); resetTimer();
  tocarAlarme();
  toast(`⏱ Sessão concluída! +${mins} min de estudo registrados.`, 6000);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Pomodoro concluído', { body: `+${mins} min de estudo.` }); } catch (e) {}
  }
}

// Alarme gerado pelo próprio navegador (Web Audio) — não depende de arquivo nem de internet
let audioCtx = null;
function prepararAudio() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { console.warn('Áudio indisponível:', e); }
}
function tocarAlarme(tipo = prefs.alarmeTipo, volume = prefs.alarmeVolume) {
  if (tipo === 'mudo' || !volume) return;
  prepararAudio(); if (!audioCtx) return;
  const master = audioCtx.createGain(); master.gain.value = (volume / 100) * 0.6; master.connect(audioCtx.destination);
  const t0 = audioCtx.currentTime;
  const nota = (freq, inicio, dur, forma = 'sine') => {
    const o = audioCtx.createOscillator(); o.type = forma; o.frequency.value = freq;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, t0 + inicio);
    g.gain.exponentialRampToValueAtTime(1, t0 + inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + dur);
    o.connect(g); g.connect(master); o.start(t0 + inicio); o.stop(t0 + inicio + dur + 0.05);
  };
  if (tipo === 'beep') { [0, 0.4, 0.8, 1.2].forEach(i => nota(880, i, 0.22, 'square')); }
  else if (tipo === 'sino') { nota(1046, 0, 1.6); nota(1318, 0.04, 1.6); nota(1568, 0.08, 1.3); nota(1046, 1.3, 2); nota(1318, 1.34, 2); }
  else if (tipo === 'suave') { [523, 659, 784, 1046].forEach((f, i) => nota(f, i * 0.32, 1)); }
  else if (tipo === 'alarme') { for (let i = 0; i < 10; i++) nota(i % 2 ? 660 : 990, i * 0.17, 0.14, 'sawtooth'); }
}
function testarAlarme() { salvarPrefs(); tocarAlarme(); }

// --- RELÓGIO PRINCIPAL E SAUDAÇÃO ---
function updateMainClock() {
  const now = new Date();
  document.getElementById('big-clock').innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  let dateStr = now.toLocaleDateString('pt-BR', options);
  dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  document.getElementById('big-date').innerText = dateStr.replace('-feira', '').replace(',', ' |');
}
setInterval(updateMainClock, 1000); updateMainClock();

function atualizarSaudacao() {
  const h = new Date().getHours();
  const saud = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('greeting-text').innerText = `${saud}, Matheus`;
  const hoje = hojeISO();
  const plantoesHoje = shifts.filter(s => s.date === hoje).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const pendentes = tasks.filter(t => !t.done).length;
  const habPend = habits.filter(h => !h.done).length;
  const partes = [];
  partes.push(plantoesHoje.length ? `🚑 ${plantoesHoje.map(s => `${s.desc} ${s.time || ''}`.trim()).join(', ')}` : '🚑 sem plantão hoje');
  const evHoje = events.filter(e => e.date === hoje && !e.done).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  if (evHoje.length) partes.push(`📅 ${evHoje.map(e => `${e.time ? e.time + ' ' : ''}${e.title}`).join(', ')}`);
  partes.push(`✅ ${pendentes} tarefa${pendentes === 1 ? '' : 's'} pendente${pendentes === 1 ? '' : 's'}`);
  partes.push(`🎮 ${habPend} hábito${habPend === 1 ? '' : 's'} a cumprir`);
  document.getElementById('greeting-sub').innerText = partes.join(' · ');
}
setInterval(atualizarSaudacao, 60000);

function atualizarBotaoDia() {
  const btn = document.getElementById('btn-iniciar-dia'); if (!btn) return;
  const feito = localStorage.getItem('lifeos_dia_iniciado') === hojeISO();
  btn.innerText = feito ? '✓ Dia iniciado' : '➔ Iniciar o Dia';
  btn.classList.toggle('done', feito);
}
function iniciarDia() {
  verificarNovoDia();
  localStorage.setItem('lifeos_dia_iniciado', hojeISO()); atualizarBotaoDia();
  changeJournalTab('day', document.querySelector('#journal-tabs span'));
  const hoje = hojeISO();
  const pl = shifts.filter(s => s.date === hoje).length; const pend = tasks.filter(t => !t.done).length;
  toast(`☀️ Bom trabalho hoje! ${pl} plant${pl === 1 ? 'ão' : 'ões'} · ${pend} tarefa${pend === 1 ? '' : 's'} pendente${pend === 1 ? '' : 's'} · ${habits.length} hábitos pra cumprir.`, 6000);
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}

/** Virou o dia? Fecha o dia anterior (hábitos → histórico, estudo → histórico) e zera o de hoje. */
function verificarNovoDia() {
  const hoje = hojeBR();
  let mudou = false;
  if (studyData.date !== hoje) {
    if (studyData.minutes > 0) { const k = brParaISO(studyData.date); studyData.dias[k] = (studyData.dias[k] || 0) + studyData.minutes; }
    studyData = { date: hoje, minutes: 0, dias: studyData.dias };
    salvar('study', studyData); mudou = true;
  }
  if (habitLog.date !== hoje) {
    if (habits.length) habitLog.dias[brParaISO(habitLog.date)] = { total: habits.length, feitos: habits.filter(h => h.done).map(h => h.text) };
    habits.forEach(h => h.done = false);
    habitLog.date = hoje;
    salvar('habits', habits); salvar('habitlog', habitLog); mudou = true;
  }
  if (mudou) { renderFocusTab(); updateStudyStats(); renderJournal(); atualizarSaudacao(); }
}

// --- HÁBITOS ---
let currentHabitFilter = 'do';

function changeHabitTab(filter, element) {
  document.querySelectorAll('#habit-tabs span').forEach(el => el.classList.remove('active'));
  element.classList.add('active'); currentHabitFilter = filter; renderFocusTab();
}

/** Dias seguidos cumprindo o hábito (conta hoje se já estiver feito). */
function streakHabito(h) {
  let n = h.done ? 1 : 0;
  const d = new Date(); d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    const reg = habitLog.dias[isoDe(d)];
    if (reg && reg.feitos && reg.feitos.includes(h.text)) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

function renderFocusTab() {
  const mainHabits = document.getElementById('main-habits-list'); mainHabits.innerHTML = '';
  let completedHabits = 0; habits.forEach(h => { if (h.done) completedHabits++; });

  let filteredHabits = habits.map((h, i) => ({ ...h, originalIndex: i }));

  // Keep Style: Em "Do" ou "All", mostrar os feitos no final
  if (currentHabitFilter === 'do' || currentHabitFilter === 'all') {
    filteredHabits.sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
  } else if (currentHabitFilter === 'todo') {
    filteredHabits = filteredHabits.filter(h => !h.done);
  } else if (currentHabitFilter === 'completed') {
    filteredHabits = filteredHabits.filter(h => h.done);
  }

  if (filteredHabits.length === 0) {
    mainHabits.innerHTML = '<li style="color:#64748b; font-size:0.85rem;">Nenhum hábito nesta categoria.</li>';
  } else {
    filteredHabits.forEach(h => {
      const streak = streakHabito(h);
      mainHabits.innerHTML += `<li style="color: ${h.done ? '#64748b' : '#e2e8f0'};">
        <input type="checkbox" ${h.done ? 'checked' : ''} onclick="toggleHabit(${h.originalIndex})" style="accent-color: #22c55e;">
        <span style="opacity: ${h.done ? 0.5 : 1}; cursor: pointer;" onclick="toggleHabit(${h.originalIndex})">${esc(h.icon)}</span>
        <span style="${h.done ? 'text-decoration: line-through; opacity: 0.5' : ''}; cursor: pointer; flex:1;" onclick="toggleHabit(${h.originalIndex})">${esc(h.text)}</span>
        ${streak > 0 ? `<span class="streak" title="${streak} dia(s) seguidos">🔥 ${streak}</span>` : ''}
        <span class="habit-actions"><button class="mini-btn" title="Editar" onclick="editarHabito(${h.originalIndex})">✎</button><button class="mini-btn" title="Apagar" onclick="removerHabito(${h.originalIndex})">✕</button></span>
      </li>`;
    });
  }

  const progress = habits.length === 0 ? 0 : Math.round((completedHabits / habits.length) * 100);
  document.getElementById('progress-fill').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `${progress}% Concluído`;
}

function toggleHabit(index) { habits[index].done = !habits[index].done; salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao(); }
function separarIconeTexto(str) {
  const iconMatch = str.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  const icon = iconMatch ? iconMatch[0] : '📌';
  const text = iconMatch ? str.replace(icon, '').trim() : str.trim();
  return { icon, text };
}
function addNewHabit() {
  const newHabit = prompt("Digite o nome do novo hábito (pode começar com um emoji):");
  if (newHabit && newHabit.trim()) {
    const { icon, text } = separarIconeTexto(newHabit);
    habits.push({ text, icon, done: false }); salvar('habits', habits); renderFocusTab(); atualizarSaudacao();
  }
}
function editarHabito(index) {
  const h = habits[index];
  const novo = prompt("Novo nome do hábito:", `${h.icon} ${h.text}`);
  if (novo && novo.trim()) {
    const { icon, text } = separarIconeTexto(novo);
    // mantém o histórico/sequência: renomeia o hábito nos dias já registrados
    Object.values(habitLog.dias).forEach(r => { if (r.feitos) r.feitos = r.feitos.map(f => f === h.text ? text : f); });
    h.icon = icon; h.text = text;
    salvar('habits', habits); salvar('habitlog', habitLog); renderFocusTab();
  }
}
function removerHabito(index) {
  if (!confirm(`Apagar o hábito "${habits[index].text}"?`)) return;
  habits.splice(index, 1); salvar('habits', habits); renderFocusTab(); renderJournal(); atualizarSaudacao();
}

// --- RESUMO (ex-Journals): números reais do período ---
let currentJournal = 'day';
function changeJournalTab(period, element) {
  document.querySelectorAll('#journal-tabs span').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');
  currentJournal = period; renderJournal();
}

function periodoIntervalo(p) {
  const hoje = new Date(); const ini = new Date(hoje); const fim = new Date(hoje);
  if (p === 'week') { const dow = hoje.getDay(); ini.setDate(hoje.getDate() - dow); fim.setDate(ini.getDate() + 6); }
  else if (p === 'month') { ini.setDate(1); fim.setMonth(hoje.getMonth() + 1, 0); }
  else if (p === 'quarter') { const q = Math.floor(hoje.getMonth() / 3) * 3; ini.setMonth(q, 1); fim.setMonth(q + 3, 0); }
  else if (p === 'year') { ini.setMonth(0, 1); fim.setMonth(11, 31); }
  return [isoDe(ini), isoDe(fim)];
}

function dataTransacao(t) { return t.date || (t.id ? isoDe(new Date(t.id)) : hojeISO()); }

function renderJournal() {
  const content = document.getElementById('journal-content'); if (!content) return;
  const [ini, fim] = periodoIntervalo(currentJournal);
  const dentro = iso => iso >= ini && iso <= fim;
  const hoje = hojeISO();

  // hábitos: média de conclusão nos dias do período (inclui hoje ao vivo)
  let dias = 0, soma = 0;
  Object.entries(habitLog.dias).forEach(([d, r]) => { if (dentro(d) && r.total) { dias++; soma += (r.feitos || []).length / r.total; } });
  if (dentro(hoje) && habits.length) { dias++; soma += habits.filter(h => h.done).length / habits.length; }
  const habPct = dias ? Math.round(soma / dias * 100) : 0;

  const pl = shifts.filter(s => dentro(s.date)); const plR = pl.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const tarefasFeitas = tasks.filter(t => t.done && t.doneAt && dentro(t.doneAt.slice(0, 10))).length;
  const tarefasPend = tasks.filter(t => !t.done).length;
  let estudo = 0; Object.entries(studyData.dias).forEach(([d, m]) => { if (dentro(d)) estudo += m; }); if (dentro(hoje)) estudo += studyData.minutes;
  const tr = transactions.filter(t => dentro(dataTransacao(t)));
  const inc = tr.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const exp = tr.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  const nomes = { day: 'Hoje', week: 'Esta semana', month: 'Este mês', quarter: 'Este trimestre', year: 'Este ano' };
  const tile = (icone, valor, rotulo, cor) => `<div class="stat-tile"><span class="stat-icon">${icone}</span><strong style="color:${cor}">${valor}</strong><small>${rotulo}</small></div>`;
  let html = `<div class="stat-period">${nomes[currentJournal]} · ${isoParaBR(ini)}${ini !== fim ? ' a ' + isoParaBR(fim) : ''}</div><div class="stat-grid">`;
  html += tile('🎮', `${habPct}%`, currentJournal === 'day' ? 'hábitos hoje' : 'média de hábitos', '#22c55e');
  html += tile('🚑', `${pl.length}`, `plant${pl.length === 1 ? 'ão' : 'ões'} · ${formatCurrency(plR)}`, '#f59e0b');
  html += tile('✅', `${tarefasFeitas}`, `concluída${tarefasFeitas === 1 ? '' : 's'} · ${tarefasPend} pendente${tarefasPend === 1 ? '' : 's'}`, '#38bdf8');
  html += tile('📚', `${Math.floor(estudo / 60)}h ${estudo % 60}m`, 'de estudo', '#a78bfa');
  html += tile('💰', formatCurrency(inc - exp), `↑ ${formatCurrency(inc)} · ↓ ${formatCurrency(exp)}`, inc - exp >= 0 ? '#22c55e' : '#ef4444');
  html += '</div>';

  if (currentJournal === 'day') {
    const plHoje = pl.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const pend = tarefasPrioritarias(5);
    html += '<div class="stat-lists">';
    html += `<div><h5>🚑 Plantões de hoje</h5>${plHoje.length ? plHoje.map(s => `<div class="stat-line"><strong>${esc(s.time || '')}</strong> ${esc(s.desc)} <span style="color:#f59e0b">${formatCurrency(s.amount)}</span></div>`).join('') : '<div class="stat-line muted">nenhum</div>'}</div>`;
    const evHoje = events.filter(e => e.date === hoje).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    html += `<div><h5>📅 Compromissos de hoje</h5>${evHoje.length ? evHoje.map(e => `<div class="stat-line" style="${e.done ? 'opacity:0.5;text-decoration:line-through' : ''}">${tipoEvento(e.type).icone} <strong>${esc(e.time || '')}</strong> ${esc(e.title)}</div>`).join('') : '<div class="stat-line muted">nenhum</div>'}</div>`;
    html += `<div><h5>✅ Próximas tarefas</h5>${pend.length ? pend.map(t => `<div class="stat-line">${t.starred ? '★' : '•'} ${esc(t.text)}${t.due ? ` <span class="due ${prazoInfo(t).classe}">${esc(prazoInfo(t).rotulo)}</span>` : ''}</div>`).join('') : '<div class="stat-line muted">tudo em dia</div>'}</div>`;
    html += '</div>';
  }
  content.innerHTML = html;
}

// --- AGENDA: TIPOS DE COMPROMISSO ---
const TIPOS_EVENTO = {
  trabalho: { nome: 'Trabalho', cor: '#38bdf8', icone: '💼' },
  pessoal:  { nome: 'Pessoal',  cor: '#a78bfa', icone: '🏠' },
  saude:    { nome: 'Saúde',    cor: '#22c55e', icone: '🩺' },
  estudo:   { nome: 'Estudo',   cor: '#f472b6', icone: '📚' },
  negocios: { nome: 'Negócios', cor: '#fbbf24', icone: '📈' },
  social:   { nome: 'Social',   cor: '#fb923c', icone: '🎉' },
  outro:    { nome: 'Outro',    cor: '#94a3b8', icone: '📌' }
};
const COR_PLANTAO = '#f59e0b';
function tipoEvento(t) { return TIPOS_EVENTO[t] || TIPOS_EVENTO.outro; }
function diaSemanaCurto(iso) { const [y, m, d] = iso.split('-'); return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); }
function rotuloData(iso) {
  const hoje = hojeISO(); const am = new Date(); am.setDate(am.getDate() + 1);
  if (iso === hoje) return 'Hoje'; if (iso === isoDe(am)) return 'Amanhã';
  return `${diaSemanaCurto(iso)} ${isoParaBR(iso).slice(0, 5)}`;
}
function rotuloDataLonga(iso) { const r = rotuloData(iso); return (r === 'Hoje' || r === 'Amanhã' ? r : diaSemanaCurto(iso)) + ' · ' + isoParaBR(iso); }

/** Tudo que acontece num dia (plantões + compromissos), em ordem de horário. */
function itensDoDia(iso) {
  const itens = [];
  shifts.filter(s => s.date === iso).forEach(s => itens.push({ kind: 'shift', time: s.time || '', obj: s }));
  events.filter(e => e.date === iso).forEach(e => itens.push({ kind: 'event', time: e.time || '', obj: e }));
  tasks.filter(t => t.due === iso && !t.done).forEach(t => itens.push({ kind: 'task', time: '', obj: t }));
  return itens.sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
}

// --- CALENDÁRIO COM HORÁRIO ---
const monthYearEl = document.getElementById('month-year');
const calendarDaysEl = document.getElementById('calendar-days');
let currentDate = new Date(); let selectedModalDate = '';

function renderCalendar() {
  const month = currentDate.getMonth(); const year = currentDate.getFullYear();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  monthYearEl.innerText = `${months[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay(); const lastDay = new Date(year, month + 1, 0).getDate();
  const hoje = hojeISO();
  let daysHTML = '';
  for (let x = 0; x < firstDayIndex; x++) daysHTML += `<div class="calendar-day empty"></div>`;

  for (let i = 1; i <= lastDay; i++) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const itens = itensDoDia(iso);
    const cores = itens.map(it => it.kind === 'shift' ? COR_PLANTAO : it.kind === 'task' ? COR_TAREFA : tipoEvento(it.obj.type).cor);
    const dots = cores.slice(0, 4).map(c => `<span class="day-dot" style="background:${c}"></span>`).join('') + (cores.length > 4 ? '<span class="day-more">+</span>' : '');
    daysHTML += `<div class="calendar-day ${iso === hoje ? 'today' : ''} ${itens.length ? 'has-items' : ''}" onclick="openDayModal(${year}, ${month + 1}, ${i})" title="${itens.length ? itens.length + ' item(ns)' : ''}">${i}<div class="day-dots">${dots}</div></div>`;
  }
  calendarDaysEl.innerHTML = daysHTML;
}
document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
function irParaHoje() { currentDate = new Date(); renderCalendar(); }

function openDayModal(year, month, day) {
  const m = month.toString().padStart(2, '0'); const d = day.toString().padStart(2, '0');
  selectedModalDate = `${year}-${m}-${d}`;
  document.getElementById('modal-date-title').innerText = `${diaSemanaCurto(selectedModalDate)}, ${d}/${m}/${year}`;

  const itens = itensDoDia(selectedModalDate);
  const modalList = document.getElementById('modal-shift-list'); modalList.innerHTML = '';

  if (itens.length === 0) {
    modalList.innerHTML = '<li style="justify-content:center; color:#64748b; background: transparent; border:none;">Nada marcado neste dia.</li>';
  } else {
    itens.forEach(it => {
      if (it.kind === 'shift') {
        const s = it.obj;
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${COR_PLANTAO}"><span style="display:flex; flex-direction:column;"><strong>🚑 ${esc(s.time || '')}${s.hours ? ' · ' + s.hours + 'h' : ''}</strong><span style="font-size:0.85rem;">${esc(s.desc)} ${s.paid ? '<span class="badge-paid">pago</span>' : '<span class="badge-unpaid">a receber</span>'}</span></span><strong style="color:${COR_PLANTAO}">${formatCurrency(s.amount)}</strong></li>`;
      } else if (it.kind === 'task') {
        const t = it.obj;
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${COR_TAREFA}"><span style="display:flex; flex-direction:column;"><strong>✅ Tarefa${t.starred ? ' ★' : ''}</strong><span style="font-size:0.85rem;">${esc(t.text)}</span></span><small class="category-badge">${esc(listaNome(t.list))}</small></li>`;
      } else {
        const e = it.obj; const tp = tipoEvento(e.type);
        modalList.innerHTML += `<li class="shift-item" style="border-left-color:${tp.cor}; ${e.done ? 'opacity:0.5' : ''}"><span style="display:flex; flex-direction:column;"><strong>${tp.icone} ${esc(e.time || 'dia todo')}${e.endTime ? '–' + esc(e.endTime) : ''}</strong><span style="font-size:0.85rem; ${e.done ? 'text-decoration:line-through' : ''}">${esc(e.title)}</span></span><small class="category-badge" style="color:${tp.cor}; background:${tp.cor}22">${tp.nome}</small></li>`;
      }
    });
  }
  document.getElementById('day-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('day-modal').style.display = 'none'; }
function goToAddShift() { closeModal(); changeTab('shifts'); cancelarEdicaoPlantao(); document.getElementById('shift-date').value = selectedModalDate; setTimeout(() => document.getElementById('shift-desc').focus(), 100); }
function goToAddEvent() { closeModal(); cancelarEdicaoEvento(); document.getElementById('event-date').value = selectedModalDate; setTimeout(() => { document.getElementById('event-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('event-title').focus(); }, 100); }
document.getElementById('day-modal').addEventListener('click', (e) => { if (e.target.id === 'day-modal') closeModal(); });

// --- AGENDA: COMPROMISSOS ---
let eventFilter = 'proximos';
function preencherTiposEvento() {
  const sel = document.getElementById('event-type'); if (!sel) return;
  sel.innerHTML = Object.entries(TIPOS_EVENTO).map(([k, t]) => `<option value="${k}">${t.icone} ${t.nome}</option>`).join('');
}
document.getElementById('event-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('event-id').value;
  const dados = {
    title: document.getElementById('event-title').value.trim(),
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    endTime: document.getElementById('event-end').value,
    type: document.getElementById('event-type').value,
    notes: document.getElementById('event-notes').value.trim()
  };
  if (!dados.title || !dados.date) return;
  if (id) { const ev = events.find(x => String(x.id) === id); if (ev) Object.assign(ev, dados); }
  else events.push({ id: novoId(), done: false, ...dados });
  salvar('events', events); cancelarEdicaoEvento(); redesenharAgenda();
  toast(id ? '📅 Compromisso atualizado.' : '📅 Compromisso adicionado.');
});
function cancelarEdicaoEvento() {
  document.getElementById('event-form').reset(); document.getElementById('event-id').value = '';
  document.getElementById('event-form-title').innerText = 'Novo compromisso';
  document.getElementById('event-submit').innerText = 'Adicionar compromisso';
  document.getElementById('event-cancel').hidden = true;
}
function editarEvento(id) {
  const ev = events.find(x => x.id === id); if (!ev) return;
  changeTab('home');
  document.getElementById('event-id').value = ev.id;
  document.getElementById('event-title').value = ev.title; document.getElementById('event-date').value = ev.date;
  document.getElementById('event-time').value = ev.time || ''; document.getElementById('event-end').value = ev.endTime || '';
  document.getElementById('event-type').value = ev.type || 'outro'; document.getElementById('event-notes').value = ev.notes || '';
  document.getElementById('event-form-title').innerText = 'Editar compromisso';
  document.getElementById('event-submit').innerText = 'Salvar alterações';
  document.getElementById('event-cancel').hidden = false;
  document.getElementById('event-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function concluirEvento(id) { const ev = events.find(x => x.id === id); if (!ev) return; ev.done = !ev.done; salvar('events', events); redesenharAgenda(); }
function removerEvento(id) { const ev = events.find(x => x.id === id); if (!ev || !confirm(`Apagar "${ev.title}"?`)) return; events = events.filter(x => x.id !== id); salvar('events', events); redesenharAgenda(); }
function filtrarEventos(f, el) { eventFilter = f; document.querySelectorAll('#event-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderEvents(); }

function renderEvents() {
  const list = document.getElementById('event-list'); if (!list) return; list.innerHTML = '';
  const hoje = hojeISO();
  let lista = [...events];
  if (eventFilter === 'proximos') lista = lista.filter(e => e.date >= hoje && !e.done);
  else if (eventFilter === 'passados') lista = lista.filter(e => e.date < hoje);
  else if (eventFilter === 'concluidos') lista = lista.filter(e => e.done);
  lista.sort((a, b) => (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));
  if (eventFilter === 'passados') lista.reverse();
  if (!lista.length) { list.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nenhum compromisso aqui.</li>'; return; }
  let ultimaData = '';
  lista.forEach(e => {
    if (e.date !== ultimaData) { ultimaData = e.date; list.innerHTML += `<li class="date-sep">${rotuloData(e.date)} <small>${isoParaBR(e.date)}</small></li>`; }
    const tp = tipoEvento(e.type);
    list.innerHTML += `<li class="event-item" style="border-left-color:${tp.cor}; ${e.done ? 'opacity:0.5' : ''}">
      <div class="transaction-info" style="flex:1">
        <span style="${e.done ? 'text-decoration:line-through' : ''}">${tp.icone} <strong>${esc(e.time || 'dia todo')}${e.endTime ? '–' + esc(e.endTime) : ''}</strong> ${esc(e.title)}</span>
        <small class="category-badge" style="color:${tp.cor}; background:${tp.cor}22">${tp.nome}</small>${e.notes ? `<small class="item-notes">${esc(e.notes)}</small>` : ''}
      </div>
      <div class="item-actions"><button class="mini-btn" title="${e.done ? 'Reabrir' : 'Concluir'}" onclick="concluirEvento(${e.id})">${e.done ? '↩' : '✓'}</button><button class="mini-btn" title="Editar" onclick="editarEvento(${e.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerEvento(${e.id})">✕</button></div>
    </li>`;
  });
}
function redesenharAgenda() { renderCalendar(); renderEvents(); renderShifts(); renderJournal(); atualizarSaudacao(); }

// --- FINANÇAS ---
const CATEGORIAS = {
  income:  ['Plantão', 'Salário CLT', 'Consulta / Particular', 'Faturamento CNPJ', 'Investimentos', 'Reembolso', 'Outros'],
  expense: ['Custos Fixos', 'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Assinaturas', 'Educação', 'Lazer', 'Investimentos', 'Impostos', 'Empresa', 'Outros']
};
let finMonth = hojeISO().slice(0, 7); // 'aaaa-mm' do mês em exibição
let finModo = 'mes';                  // 'mes' | 'tudo'
let finFilter = 'todas';
let finSearch = '';

function transacaoPendente(t) { return t.pending === true; }
function transacaoDePlantao(t) { return shifts.some(s => s.id === t.id); }
function nomeMes(ym) { const [y, m] = ym.split('-'); return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase()); }
function somaMes(ym, delta) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + delta, 1); return isoDe(d).slice(0, 7); }
function mudarMesFin(delta) { finMonth = somaMes(finMonth, delta); redesenharFinancas(); }
function irParaMesAtual() { finMonth = hojeISO().slice(0, 7); redesenharFinancas(); }
function alternarModoFin(modo, el) { finModo = modo; document.querySelectorAll('#fin-modo span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); redesenharFinancas(); }
function filtrarFin(f, el) { finFilter = f; document.querySelectorAll('#fin-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderFinances(); }
function buscarFin(v) { finSearch = (v || '').trim().toLowerCase(); renderFinances(); }

/** Lançamentos do escopo em exibição (mês escolhido ou tudo). */
function transacoesEscopo() { return finModo === 'mes' ? transactions.filter(t => dataTransacao(t).startsWith(finMonth)) : [...transactions]; }

function preencherCategorias(manterAtual) {
  const tipo = document.getElementById('type').value; const sel = document.getElementById('category');
  const atual = manterAtual ? sel.value : '';
  sel.innerHTML = CATEGORIAS[tipo].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('') + '<option value="__outra">✏️ Outra (digitar)</option>';
  if (atual && [...sel.options].some(o => o.value === atual)) sel.value = atual;
  document.getElementById('category-custom').hidden = sel.value !== '__outra';
}
function categoriaEscolhida() {
  const sel = document.getElementById('category');
  if (sel.value === '__outra') return document.getElementById('category-custom').value.trim() || 'Outros';
  return sel.value;
}
function definirCategoriaNaTela(cat) {
  const sel = document.getElementById('category');
  if ([...sel.options].some(o => o.value === cat)) { sel.value = cat; document.getElementById('category-custom').hidden = true; }
  else { sel.value = '__outra'; document.getElementById('category-custom').hidden = false; document.getElementById('category-custom').value = cat; }
}

function updateFinanceValues() {
  const esc_ = transacoesEscopo();
  const income = esc_.filter(t => t.type === 'income' && !transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const expense = esc_.filter(t => t.type === 'expense' && !transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const aReceber = esc_.filter(t => t.type === 'income' && transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const aPagar = esc_.filter(t => t.type === 'expense' && transacaoPendente(t)).reduce((a, t) => a + t.amount, 0);
  const total = income - expense;
  const acumulado = transactions.filter(t => !transacaoPendente(t)).reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
  document.getElementById('total-income').innerText = formatCurrency(income);
  document.getElementById('total-expense').innerText = formatCurrency(expense);
  document.getElementById('net-balance').innerText = formatCurrency(total);
  document.getElementById('net-balance').style.color = total >= 0 ? '#22c55e' : '#ef4444';
  const pend = document.getElementById('total-pending'); if (pend) pend.innerText = formatCurrency(aReceber);
  const lbl = document.getElementById('fin-month-label'); if (lbl) lbl.innerText = finModo === 'mes' ? nomeMes(finMonth) : 'Todo o período';
  const extra = document.getElementById('fin-extra');
  if (extra) extra.innerHTML = `<span>💸 A pagar: <strong style="color:#ef4444">${formatCurrency(aPagar)}</strong></span><span>📈 Previsto (saldo + a receber − a pagar): <strong style="color:${total + aReceber - aPagar >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(total + aReceber - aPagar)}</strong></span><span>🏦 Saldo acumulado (tudo): <strong style="color:${acumulado >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(acumulado)}</strong></span>`;
}

function renderFinances() {
  const tList = document.getElementById('transaction-list'); tList.innerHTML = '';
  let lista = transacoesEscopo();
  if (finFilter === 'receitas') lista = lista.filter(t => t.type === 'income');
  else if (finFilter === 'despesas') lista = lista.filter(t => t.type === 'expense');
  else if (finFilter === 'pendentes') lista = lista.filter(transacaoPendente);
  if (finSearch) lista = lista.filter(t => `${t.desc} ${t.category || ''} ${t.notes || ''}`.toLowerCase().includes(finSearch));
  lista.sort((a, b) => dataTransacao(b).localeCompare(dataTransacao(a)) || (b.id || 0) - (a.id || 0));
  if (!lista.length) { tList.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nenhum lançamento aqui.</li>'; }
  lista.forEach(t => {
    const i = transactions.indexOf(t); const pend = transacaoPendente(t); const dePlantao = transacaoDePlantao(t);
    const li = document.createElement('li'); li.classList.add(t.type === 'income' ? 'income-item' : 'expense-item'); if (pend) li.classList.add('pending-item');
    li.innerHTML = `<div class="transaction-info" style="flex:1"><span>${dePlantao ? '🚑 ' : ''}${t.recurringId ? '🔁 ' : ''}${esc(t.desc)}${pend ? (t.type === 'income' ? ' <span class="badge-unpaid">a receber</span>' : ' <span class="badge-topay">a pagar</span>') : ''}</span>
        <small class="category-badge">${esc(t.category || 'Sem categoria')}</small> <small class="item-date">${isoParaBR(dataTransacao(t))}</small>${t.notes ? `<small class="item-notes">${esc(t.notes)}</small>` : ''}</div>
      <div class="item-actions"><strong style="margin-right:6px; color:${t.type === 'income' ? '#22c55e' : '#ef4444'}">${t.type === 'income' ? '+' : '−'}${formatCurrency(t.amount)}</strong><button class="mini-btn ${pend ? '' : 'on'}" title="${pend ? 'Marcar como efetivado' : 'Voltar para pendente'}" onclick="alternarEfetivado(${i})">💵</button><button class="mini-btn" title="Editar" onclick="editarTransacao(${i})">✎</button><button class="mini-btn" title="Apagar" onclick="removeFinance(${i})">✕</button></div>`;
    tList.appendChild(li);
  });
  renderCategoriasFin(); renderMesesFin();
}

function renderCategoriasFin() {
  const el = document.getElementById('fin-categorias'); if (!el) return;
  const esc_ = transacoesEscopo().filter(t => !transacaoPendente(t));
  const bloco = (tipo, cor, titulo) => {
    const mapa = {}; esc_.filter(t => t.type === tipo).forEach(t => { const c = t.category || 'Sem categoria'; mapa[c] = (mapa[c] || 0) + t.amount; });
    const itens = Object.entries(mapa).sort((a, b) => b[1] - a[1]); const total = itens.reduce((a, [, v]) => a + v, 0);
    if (!itens.length) return `<div class="cat-block"><h5>${titulo}</h5><div class="stat-line muted">nada ainda</div></div>`;
    return `<div class="cat-block"><h5>${titulo} · ${formatCurrency(total)}</h5>` + itens.map(([c, v]) => `<div class="cat-row"><span class="cat-name">${esc(c)}</span><div class="cat-bar"><div style="width:${Math.round(v / total * 100)}%; background:${cor}"></div></div><span class="cat-val">${formatCurrency(v)} <small>${Math.round(v / total * 100)}%</small></span></div>`).join('') + '</div>';
  };
  el.innerHTML = bloco('expense', '#ef4444', '💸 Despesas') + bloco('income', '#22c55e', '💰 Receitas');
}

function renderMesesFin() {
  const el = document.getElementById('fin-meses'); if (!el) return;
  const base = finModo === 'mes' ? finMonth : hojeISO().slice(0, 7);
  const meses = []; for (let i = 5; i >= 0; i--) meses.push(somaMes(base, -i));
  const dados = meses.map(m => { const ts = transactions.filter(t => !transacaoPendente(t) && dataTransacao(t).startsWith(m)); return { m, inc: ts.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0), exp: ts.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0) }; });
  const max = Math.max(1, ...dados.map(d => Math.max(d.inc, d.exp)));
  el.innerHTML = dados.map(d => `<div class="mes-col ${d.m === finMonth && finModo === 'mes' ? 'atual' : ''}" onclick="finMonth='${d.m}'; finModo='mes'; redesenharFinancas();" title="Receitas ${formatCurrency(d.inc)} · Despesas ${formatCurrency(d.exp)}">
      <div class="mes-bars"><div class="mes-bar inc" style="height:${Math.round(d.inc / max * 100)}%"></div><div class="mes-bar exp" style="height:${Math.round(d.exp / max * 100)}%"></div></div>
      <small>${nomeMes(d.m).slice(0, 3)}</small><small class="mes-saldo" style="color:${d.inc - d.exp >= 0 ? '#22c55e' : '#ef4444'}">${formatCurrency(d.inc - d.exp).replace('R$', '').trim()}</small></div>`).join('');
}

document.getElementById('type').addEventListener('change', () => preencherCategorias(false));
document.getElementById('category').addEventListener('change', () => { document.getElementById('category-custom').hidden = document.getElementById('category').value !== '__outra'; if (!document.getElementById('category-custom').hidden) document.getElementById('category-custom').focus(); });
document.getElementById('finance-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('finance-id').value;
  const dados = {
    desc: document.getElementById('desc').value.trim(),
    amount: parseFloat(document.getElementById('amount').value),
    date: document.getElementById('fin-date').value || hojeISO(),
    type: document.getElementById('type').value,
    category: categoriaEscolhida(),
    notes: document.getElementById('fin-notes').value.trim(),
    pending: document.getElementById('fin-pending').checked
  };
  if (!dados.desc || isNaN(dados.amount)) return;
  if (id) { const t = transactions.find(x => String(x.id) === id); if (t) Object.assign(t, dados); }
  else transactions.push({ id: novoId(), ...dados });
  salvar('finances', transactions); cancelarEdicaoFin(); redesenharFinancas();
  toast(id ? '💰 Lançamento atualizado.' : '💰 Lançamento adicionado.');
});
function cancelarEdicaoFin() {
  document.getElementById('finance-form').reset(); document.getElementById('finance-id').value = '';
  document.getElementById('fin-date').value = hojeISO(); preencherCategorias(false);
  document.getElementById('finance-form-title').innerText = 'Nova Transação';
  document.getElementById('finance-submit').innerText = 'Adicionar Registro';
  document.getElementById('finance-cancel').hidden = true;
}
function editarTransacao(index) {
  const t = transactions[index]; if (!t) return;
  if (transacaoDePlantao(t)) { editarPlantao(t.id); toast('🚑 Este lançamento vem de um plantão — edite o plantão.'); return; }
  changeTab('finances');
  document.getElementById('finance-id').value = t.id; document.getElementById('desc').value = t.desc; document.getElementById('amount').value = t.amount;
  document.getElementById('fin-date').value = dataTransacao(t); document.getElementById('type').value = t.type; preencherCategorias(false); definirCategoriaNaTela(t.category || 'Outros');
  document.getElementById('fin-notes').value = t.notes || ''; document.getElementById('fin-pending').checked = transacaoPendente(t);
  document.getElementById('finance-form-title').innerText = 'Editar lançamento';
  document.getElementById('finance-submit').innerText = 'Salvar alterações';
  document.getElementById('finance-cancel').hidden = false;
  document.getElementById('desc').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('desc').focus();
}
function alternarEfetivado(index) {
  const t = transactions[index]; if (!t) return;
  if (transacaoDePlantao(t)) { alternarPago(t.id); return; }
  t.pending = !transacaoPendente(t); if (!t.pending) t.date = hojeISO();
  salvar('finances', transactions); redesenharFinancas();
  toast(t.pending ? '⏳ Voltou para pendente.' : '💵 Efetivado hoje.');
}
function removeFinance(index) {
  const t = transactions[index];
  if (transacaoDePlantao(t) && !confirm('Este lançamento veio de um plantão. Apagar mesmo assim? (o plantão continua na agenda)')) return;
  if (!transacaoDePlantao(t) && !confirm(`Apagar "${t.desc}"?`)) return;
  transactions.splice(index, 1); salvar('finances', transactions); redesenharFinancas();
}
function redesenharFinancas() { updateFinanceValues(); renderFinances(); renderRecorrentes(); renderJournal(); }

// --- FINANÇAS: RECORRENTES ---
// Modelo: { id, desc, amount, type, category, day, active, since: 'aaaa-mm' }
// Todo mês (a partir de "since"), gera o lançamento do mês como pendente (a pagar / a receber). Você confirma com 💵.
function gerarRecorrentes() {
  const mesAtual = hojeISO().slice(0, 7); let criou = 0;
  recurring.filter(r => r.active !== false && (!r.since || r.since <= mesAtual)).forEach(r => {
    // já existe neste mês? (gerado antes, ou lançado à mão com o mesmo nome e tipo)
    if (transactions.some(t => dataTransacao(t).startsWith(mesAtual) && (t.recurringId === r.id || (t.type === r.type && t.desc.trim().toLowerCase() === r.desc.trim().toLowerCase())))) return;
    const [y, m] = mesAtual.split('-').map(Number); const ultimo = new Date(y, m, 0).getDate();
    const dia = Math.min(Math.max(1, Number(r.day) || 1), ultimo);
    transactions.push({ id: novoId(), date: `${mesAtual}-${String(dia).padStart(2, '0')}`, desc: r.desc, amount: r.amount, type: r.type, category: r.category, pending: true, recurringId: r.id });
    criou++;
  });
  if (criou) { salvar('finances', transactions); toast(`🔁 ${criou} lançamento${criou > 1 ? 's' : ''} recorrente${criou > 1 ? 's' : ''} gerado${criou > 1 ? 's' : ''} para ${nomeMes(mesAtual)}.`, 5000); }
  return criou > 0;
}
function preencherCategoriasRec() {
  const tipo = document.getElementById('rec-type').value; const sel = document.getElementById('rec-category');
  sel.innerHTML = CATEGORIAS[tipo].map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
document.getElementById('rec-type').addEventListener('change', preencherCategoriasRec);
document.getElementById('rec-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('rec-id').value;
  const dados = { desc: document.getElementById('rec-desc').value.trim(), amount: parseFloat(document.getElementById('rec-amount').value), type: document.getElementById('rec-type').value, category: document.getElementById('rec-category').value, day: parseInt(document.getElementById('rec-day').value) || 1 };
  if (!dados.desc || isNaN(dados.amount)) return;
  if (id) { const r = recurring.find(x => String(x.id) === id); if (r) Object.assign(r, dados); }
  else recurring.push({ id: novoId(), active: true, since: hojeISO().slice(0, 7), ...dados });
  salvar('recurring', recurring); cancelarEdicaoRec(); gerarRecorrentes(); redesenharFinancas();
});
function cancelarEdicaoRec() { document.getElementById('rec-form').reset(); document.getElementById('rec-id').value = ''; preencherCategoriasRec(); document.getElementById('rec-submit').innerText = 'Adicionar recorrente'; document.getElementById('rec-cancel').hidden = true; }
function editarRecorrente(id) {
  const r = recurring.find(x => x.id === id); if (!r) return;
  document.getElementById('rec-id').value = r.id; document.getElementById('rec-desc').value = r.desc; document.getElementById('rec-amount').value = r.amount;
  document.getElementById('rec-type').value = r.type; preencherCategoriasRec(); document.getElementById('rec-category').value = r.category; document.getElementById('rec-day').value = r.day;
  document.getElementById('rec-submit').innerText = 'Salvar recorrente'; document.getElementById('rec-cancel').hidden = false; document.getElementById('rec-desc').focus();
}
function alternarRecorrente(id) { const r = recurring.find(x => x.id === id); if (!r) return; r.active = r.active === false; salvar('recurring', recurring); if (r.active) gerarRecorrentes(); redesenharFinancas(); }
function removerRecorrente(id) {
  const r = recurring.find(x => x.id === id); if (!r || !confirm(`Apagar a recorrente "${r.desc}"? (os lançamentos já gerados ficam)`)) return;
  recurring = recurring.filter(x => x.id !== id); salvar('recurring', recurring); redesenharFinancas();
}
function renderRecorrentes() {
  const ul = document.getElementById('rec-list'); if (!ul) return; ul.innerHTML = '';
  if (!recurring.length) { ul.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nenhuma recorrente. Ex: aluguel, internet, salário CLT, assinatura.</li>'; return; }
  [...recurring].sort((a, b) => (a.day || 0) - (b.day || 0)).forEach(r => {
    const off = r.active === false;
    ul.innerHTML += `<li class="${r.type === 'income' ? 'income-item' : 'expense-item'}" style="${off ? 'opacity:0.45' : ''}"><div class="transaction-info" style="flex:1"><span>🔁 ${esc(r.desc)}${off ? ' <small class="item-date">(pausada)</small>' : ''}</span><small class="category-badge">${esc(r.category)}</small> <small class="item-date">todo dia ${r.day}</small></div>
      <div class="item-actions"><strong style="margin-right:6px; color:${r.type === 'income' ? '#22c55e' : '#ef4444'}">${formatCurrency(r.amount)}</strong><button class="mini-btn ${off ? '' : 'on'}" title="${off ? 'Reativar' : 'Pausar'}" onclick="alternarRecorrente(${r.id})">${off ? '▶' : '⏸'}</button><button class="mini-btn" title="Editar" onclick="editarRecorrente(${r.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerRecorrente(${r.id})">✕</button></div></li>`;
  });
}

// --- PLANTÕES ---
let shiftFilter = 'proximos';
function preencherLocais() {
  const sel = document.getElementById('shift-place'); if (!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">— escolher local —</option>' + places.map((p, i) => `<option value="${i}">${esc(p.name)}${p.amount ? ' · ' + formatCurrency(p.amount) : ''}</option>`).join('') + '<option value="outro">✏️ Outro (digitar)</option>';
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  renderPlaces();
}
function aplicarLocalPlantao() {
  const v = document.getElementById('shift-place').value;
  if (v === '' || v === 'outro') { if (v === 'outro') document.getElementById('shift-desc').focus(); return; }
  const p = places[Number(v)]; if (!p) return;
  document.getElementById('shift-desc').value = p.name;
  if (p.time) document.getElementById('shift-time').value = p.time;
  if (p.hours) document.getElementById('shift-hours').value = p.hours;
  if (p.amount) document.getElementById('shift-amount').value = p.amount;
}
function renderPlaces() {
  const ul = document.getElementById('place-list'); if (!ul) return; ul.innerHTML = '';
  if (!places.length) { ul.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nenhum local cadastrado.</li>'; return; }
  places.forEach((p, i) => {
    ul.innerHTML += `<li><div class="transaction-info"><span>🏥 ${esc(p.name)}</span><small class="item-date">${p.time ? 'às ' + esc(p.time) : ''}${p.hours ? ' · ' + p.hours + 'h' : ''}${p.amount ? ' · ' + formatCurrency(p.amount) : ''}</small></div>
      <div class="item-actions"><button class="mini-btn" title="Editar" onclick="editarLocal(${i})">✎</button><button class="mini-btn" title="Apagar" onclick="removerLocal(${i})">✕</button></div></li>`;
  });
}
document.getElementById('place-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('place-name').value.trim(); if (!name) return;
  const p = { name, time: document.getElementById('place-time').value, hours: parseFloat(document.getElementById('place-hours').value) || 0, amount: parseFloat(document.getElementById('place-amount').value) || 0 };
  const idx = document.getElementById('place-id').value;
  if (idx !== '') places[Number(idx)] = p; else places.push(p);
  salvar('places', places); document.getElementById('place-form').reset(); document.getElementById('place-id').value = ''; document.getElementById('place-submit').innerText = 'Adicionar local';
  preencherLocais();
});
function editarLocal(i) {
  const p = places[i];
  document.getElementById('place-id').value = i; document.getElementById('place-name').value = p.name; document.getElementById('place-time').value = p.time || '';
  document.getElementById('place-hours').value = p.hours || ''; document.getElementById('place-amount').value = p.amount || '';
  document.getElementById('place-submit').innerText = 'Salvar local'; document.getElementById('place-name').focus();
}
function removerLocal(i) { if (!confirm(`Apagar o local "${places[i].name}"?`)) return; places.splice(i, 1); salvar('places', places); preencherLocais(); }

function transacaoDoPlantao(s) { return transactions.find(t => t.id === s.id); }
function descricaoLancamento(s) { const [y, m, d] = s.date.split('-'); return `Plantão: ${s.desc} (${d}/${m} às ${s.time})`; }
/** Mantém o lançamento em Finanças igual ao plantão (valor, data, pago/a receber). */
function sincronizarLancamentoPlantao(s) {
  let t = transacaoDoPlantao(s);
  if (!t) { t = { id: s.id, type: 'income', category: 'Plantão' }; transactions.push(t); }
  t.desc = descricaoLancamento(s); t.amount = s.amount; t.pending = !s.paid; t.date = s.paid ? (s.paidAt || s.date) : s.date;
}

function filtrarPlantoes(f, el) { shiftFilter = f; document.querySelectorAll('#shift-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderShifts(); }
function renderShifts() {
  const sList = document.getElementById('shift-list'); sList.innerHTML = '';
  const hoje = hojeISO();
  let lista = [...shifts];
  if (shiftFilter === 'proximos') lista = lista.filter(s => s.date >= hoje);
  else if (shiftFilter === 'naopagos') lista = lista.filter(s => !s.paid);
  else if (shiftFilter === 'passados') lista = lista.filter(s => s.date < hoje);
  lista.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  if (shiftFilter === 'passados') lista.reverse();

  const aReceber = shifts.filter(s => !s.paid); const totalReceber = aReceber.reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const mes = hoje.slice(0, 7); const doMes = shifts.filter(s => s.date.startsWith(mes)); const recebidoMes = doMes.filter(s => s.paid).reduce((a, s) => a + (Number(s.amount) || 0), 0);
  const resumo = document.getElementById('shift-summary');
  if (resumo) resumo.innerHTML = `<span>⏳ A receber: <strong style="color:${COR_PLANTAO}">${formatCurrency(totalReceber)}</strong> (${aReceber.length})</span><span>💵 Recebido no mês: <strong style="color:#22c55e">${formatCurrency(recebidoMes)}</strong></span><span>📆 Plantões no mês: <strong>${doMes.length}</strong> · ${doMes.reduce((a, s) => a + (Number(s.hours) || 0), 0)}h</span>`;

  if (!lista.length) { sList.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nenhum plantão neste filtro.</li>'; return; }
  lista.forEach(s => {
    const li = document.createElement('li'); li.classList.add('shift-item'); if (s.paid) li.classList.add('paid');
    li.innerHTML = `<div class="transaction-info" style="flex:1"><span>🚑 ${esc(s.desc)} ${s.paid ? '<span class="badge-paid">pago' + (s.paidAt ? ' ' + isoParaBR(s.paidAt).slice(0, 5) : '') + '</span>' : '<span class="badge-unpaid">a receber</span>'}</span>
        <small class="category-badge" style="color:${COR_PLANTAO}; background: rgba(245,158,11,0.1)">${rotuloDataLonga(s.date)} às ${esc(s.time || '')}${s.hours ? ' · ' + s.hours + 'h' : ''}</small>${s.notes ? `<small class="item-notes">${esc(s.notes)}</small>` : ''}</div>
      <div class="item-actions"><strong style="margin-right:6px">${formatCurrency(s.amount)}</strong><button class="mini-btn ${s.paid ? 'on' : ''}" title="${s.paid ? 'Marcar como não pago' : 'Marcar como pago'}" onclick="alternarPago(${s.id})">💵</button><button class="mini-btn" title="Editar" onclick="editarPlantao(${s.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removeShift(${s.id})">✕</button></div>`;
    sList.appendChild(li);
  }); renderCalendar();
}
document.getElementById('shift-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('shift-id').value;
  const dados = {
    date: document.getElementById('shift-date').value,
    time: document.getElementById('shift-time').value,
    hours: parseFloat(document.getElementById('shift-hours').value) || 0,
    desc: document.getElementById('shift-desc').value.trim(),
    amount: parseFloat(document.getElementById('shift-amount').value),
    notes: document.getElementById('shift-notes').value.trim()
  };
  if (!dados.date || !dados.time || !dados.desc || isNaN(dados.amount)) return;
  let s;
  if (id) { s = shifts.find(x => String(x.id) === id); if (!s) return; Object.assign(s, dados); }
  else { s = { id: novoId(), paid: false, paidAt: null, ...dados }; shifts.push(s); }
  sincronizarLancamentoPlantao(s);
  salvar('shifts', shifts); salvar('finances', transactions);
  cancelarEdicaoPlantao(); renderShifts(); updateFinanceValues(); renderFinances(); renderJournal(); atualizarSaudacao();
  toast(id ? '🚑 Plantão atualizado.' : '🚑 Plantão agendado (a receber).');
});
function cancelarEdicaoPlantao() {
  document.getElementById('shift-form').reset(); document.getElementById('shift-id').value = '';
  document.getElementById('shift-form-title').innerText = 'Agendar Novo Plantão';
  document.getElementById('shift-submit').innerText = 'Agendar plantão';
  document.getElementById('shift-cancel').hidden = true;
}
function editarPlantao(id) {
  const s = shifts.find(x => x.id === id); if (!s) return;
  changeTab('shifts');
  document.getElementById('shift-id').value = s.id; document.getElementById('shift-place').value = '';
  document.getElementById('shift-date').value = s.date; document.getElementById('shift-time').value = s.time || '';
  document.getElementById('shift-hours').value = s.hours || ''; document.getElementById('shift-desc').value = s.desc;
  document.getElementById('shift-amount').value = s.amount; document.getElementById('shift-notes').value = s.notes || '';
  document.getElementById('shift-form-title').innerText = 'Editar plantão';
  document.getElementById('shift-submit').innerText = 'Salvar alterações';
  document.getElementById('shift-cancel').hidden = false;
  document.getElementById('shift-desc').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function alternarPago(id) {
  const s = shifts.find(x => x.id === id); if (!s) return;
  s.paid = !s.paid; s.paidAt = s.paid ? hojeISO() : null;
  sincronizarLancamentoPlantao(s);
  salvar('shifts', shifts); salvar('finances', transactions);
  renderShifts(); updateFinanceValues(); renderFinances(); renderJournal();
  toast(s.paid ? `💵 ${s.desc} marcado como pago.` : `⏳ ${s.desc} voltou para "a receber".`);
}
function removeShift(id) {
  const s = shifts.find(x => x.id === id); if (!s || !confirm(`Apagar o plantão ${s.desc} de ${isoParaBR(s.date)}?`)) return;
  shifts = shifts.filter(x => x.id !== id); salvar('shifts', shifts);
  transactions = transactions.filter(t => t.id !== id); salvar('finances', transactions);
  renderShifts(); updateFinanceValues(); renderFinances(); renderJournal(); atualizarSaudacao();
}

// --- TAREFAS (estilo Google Tasks) ---
// Modelo: { id, text, done, doneAt, list, due: 'aaaa-mm-dd' | '', notes, starred, subtasks: [{ text, done }], createdAt }
// Listas: tasklists = [{ id, name }]  (a lista 'padrao' sempre existe)
const COR_TAREFA = '#38bdf8';
let taskView = 'padrao';      // id da lista em exibição, ou '__star' (com estrela) ou '__all' (todas)
let taskShowDone = false;
let taskExpanded = {};        // id -> subtarefas abertas?

function normalizarTarefas() {
  let mudou = false;
  tasks.forEach((t, i) => {
    if (!t.id) { t.id = Date.now() + i; mudou = true; }
    if (!t.list || !tasklists.some(l => l.id === t.list)) { t.list = 'padrao'; mudou = true; }
    if (!Array.isArray(t.subtasks)) { t.subtasks = []; mudou = true; }
  });
  if (!tasklists.some(l => l.id === 'padrao')) { tasklists.unshift({ id: 'padrao', name: 'Minhas tarefas' }); mudou = true; }
  return mudou;
}
function listaNome(id) { const l = tasklists.find(x => x.id === id); return l ? l.name : 'Minhas tarefas'; }
function tarefasVisiveis() {
  if (taskView === '__star') return tasks.filter(t => t.starred);
  if (taskView === '__all') return [...tasks];
  return tasks.filter(t => t.list === taskView);
}
function prazoInfo(t) {
  if (!t.due) return { classe: '', rotulo: '' };
  const hoje = hojeISO(); const r = rotuloData(t.due);
  if (t.done) return { classe: 'due-done', rotulo: r };
  if (t.due < hoje) return { classe: 'due-late', rotulo: 'Atrasada · ' + r };
  if (t.due === hoje) return { classe: 'due-today', rotulo: 'Hoje' };
  return { classe: 'due-soon', rotulo: r };
}
function ordenarTarefas(a, b) {
  if (!!a.starred !== !!b.starred) return a.starred ? -1 : 1;
  if (!!a.due !== !!b.due) return a.due ? -1 : 1;
  if (a.due !== b.due) return a.due.localeCompare(b.due);
  return (a.createdAt || a.id || 0) - (b.createdAt || b.id || 0);
}

function renderTaskLists() {
  const el = document.getElementById('task-lists'); if (!el) return;
  const cont = id => tasks.filter(t => !t.done && (id === '__star' ? t.starred : id === '__all' ? true : t.list === id)).length;
  const aba = (id, nome, icone) => `<span class="${taskView === id ? 'active' : ''}" onclick="verLista('${id}', this)">${icone} ${esc(nome)} <small>${cont(id)}</small></span>`;
  el.innerHTML = aba('__star', 'Com estrela', '⭐') + tasklists.map(l => aba(l.id, l.name, '📋')).join('') + aba('__all', 'Todas', '🗂️') +
    `<span class="add-list" onclick="novaLista()">+ Nova lista</span>`;
  const tools = document.getElementById('task-list-tools');
  if (tools) tools.innerHTML = (taskView !== '__star' && taskView !== '__all') ? `<button class="mini-btn" onclick="renomearLista('${taskView}')" title="Renomear lista">✎ ${esc(listaNome(taskView))}</button>${taskView !== 'padrao' ? `<button class="mini-btn" onclick="apagarLista('${taskView}')" title="Apagar lista">✕</button>` : ''}` : '';
  const sel = document.getElementById('task-list-select'); if (sel) sel.innerHTML = tasklists.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
  if (sel && !document.getElementById('task-id').value) sel.value = (taskView !== '__star' && taskView !== '__all') ? taskView : 'padrao';
}
function verLista(id, el) { taskView = id; renderTaskLists(); renderTasks(); }
function novaLista() {
  const nome = prompt('Nome da nova lista (ex: Trabalho, Casa, Estudos, Negócios):'); if (!nome || !nome.trim()) return;
  const l = { id: 'l' + novoId(), name: nome.trim() }; tasklists.push(l); salvar('tasklists', tasklists); taskView = l.id; renderTaskLists(); renderTasks();
}
function renomearLista(id) {
  const l = tasklists.find(x => x.id === id); if (!l) return;
  const nome = prompt('Novo nome da lista:', l.name); if (!nome || !nome.trim()) return;
  l.name = nome.trim(); salvar('tasklists', tasklists); renderTaskLists();
}
function apagarLista(id) {
  if (id === 'padrao') return;
  const n = tasks.filter(t => t.list === id).length;
  if (!confirm(`Apagar a lista "${listaNome(id)}"?${n ? ` As ${n} tarefa(s) dela vão para "${listaNome('padrao')}".` : ''}`)) return;
  tasks.forEach(t => { if (t.list === id) t.list = 'padrao'; });
  tasklists = tasklists.filter(l => l.id !== id); salvar('tasklists', tasklists); salvar('tasks', tasks);
  taskView = 'padrao'; renderTaskLists(); renderTasks();
}

document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const text = document.getElementById('task-desc').value.trim(); if (!text) return;
  const dados = {
    text, due: document.getElementById('task-due').value || '',
    list: document.getElementById('task-list-select').value || 'padrao',
    notes: document.getElementById('task-notes').value.trim(),
    starred: document.getElementById('task-star').checked
  };
  const linhas = document.getElementById('task-subtasks').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (id) {
    const t = tasks.find(x => String(x.id) === id); if (!t) return;
    const antigas = t.subtasks || [];
    Object.assign(t, dados); t.subtasks = linhas.map(l => ({ text: l, done: !!(antigas.find(a => a.text === l) || {}).done }));
  } else {
    tasks.push({ id: novoId(), done: false, createdAt: Date.now(), subtasks: linhas.map(l => ({ text: l, done: false })), ...dados });
    if (taskView !== '__star' && taskView !== '__all' && dados.list !== taskView) { taskView = dados.list; }
  }
  salvar('tasks', tasks); cancelarEdicaoTarefa(); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
  toast(id ? '✅ Tarefa atualizada.' : '✅ Tarefa adicionada.');
});
function cancelarEdicaoTarefa() {
  document.getElementById('task-form').reset(); document.getElementById('task-id').value = '';
  if (taskView !== '__star' && taskView !== '__all') document.getElementById('task-list-select').value = taskView;
  document.getElementById('task-form-title').innerText = 'Nova Tarefa';
  document.getElementById('task-submit').innerText = 'Adicionar Tarefa';
  document.getElementById('task-cancel').hidden = true;
  document.getElementById('task-more').open = false;
}
function editarTarefa(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  changeTab('tasks');
  document.getElementById('task-id').value = t.id; document.getElementById('task-desc').value = t.text; document.getElementById('task-due').value = t.due || '';
  document.getElementById('task-list-select').value = t.list || 'padrao'; document.getElementById('task-notes').value = t.notes || '';
  document.getElementById('task-star').checked = !!t.starred; document.getElementById('task-subtasks').value = (t.subtasks || []).map(s => s.text).join('\n');
  document.getElementById('task-form-title').innerText = 'Editar tarefa';
  document.getElementById('task-submit').innerText = 'Salvar alterações';
  document.getElementById('task-cancel').hidden = false;
  document.getElementById('task-more').open = !!(t.notes || (t.subtasks || []).length);
  document.getElementById('task-desc').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('task-desc').focus();
}

function renderTasks() {
  const list = document.getElementById('task-list'); list.innerHTML = '';
  const hoje = hojeISO();
  const vis = tarefasVisiveis();
  const abertas = vis.filter(t => !t.done).sort(ordenarTarefas);
  const feitas = vis.filter(t => t.done).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  const grupos = [
    ['⚠️ Atrasadas', abertas.filter(t => t.due && t.due < hoje)],
    ['📌 Hoje', abertas.filter(t => t.due === hoje)],
    ['📅 Próximas', abertas.filter(t => t.due && t.due > hoje)],
    ['📝 Sem prazo', abertas.filter(t => !t.due)]
  ];
  if (!abertas.length && !feitas.length) { list.innerHTML = '<li style="justify-content:center; color:#64748b; background:transparent; border:none;">Nada por aqui. Adicione uma tarefa acima.</li>'; return; }
  grupos.forEach(([titulo, itens]) => {
    if (!itens.length) return;
    list.innerHTML += `<li class="date-sep">${titulo} <small>${itens.length}</small></li>`;
    itens.forEach(t => list.innerHTML += linhaTarefa(t));
  });
  if (feitas.length) {
    list.innerHTML += `<li class="date-sep toggle-done" onclick="taskShowDone = !taskShowDone; renderTasks();">${taskShowDone ? '▾' : '▸'} Concluídas <small>${feitas.length}</small></li>`;
    if (taskShowDone) feitas.forEach(t => list.innerHTML += linhaTarefa(t));
  }
}
function linhaTarefa(t) {
  const p = prazoInfo(t); const subs = t.subtasks || []; const feitasSub = subs.filter(s => s.done).length; const aberto = !!taskExpanded[t.id];
  return `<li class="task-item ${t.done ? 'done' : ''}" style="border-left-color:${t.starred ? '#fbbf24' : COR_TAREFA}">
    <div class="task-main">
      <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTask(${t.id})" style="accent-color: #38bdf8;">
      <div class="task-body" onclick="editarTarefa(${t.id})">
        <span class="task-text">${esc(t.text)}</span>
        <div class="task-meta">${p.rotulo ? `<span class="due ${p.classe}">📅 ${esc(p.rotulo)}</span>` : ''}${taskView === '__star' || taskView === '__all' ? `<span class="task-list-tag">📋 ${esc(listaNome(t.list))}</span>` : ''}${subs.length ? `<span class="sub-count" onclick="event.stopPropagation(); taskExpanded[${t.id}] = !taskExpanded[${t.id}]; renderTasks();">☑ ${feitasSub}/${subs.length}</span>` : ''}${t.notes ? `<span class="task-notes">${esc(t.notes)}</span>` : ''}</div>
      </div>
      <div class="item-actions"><button class="mini-btn star ${t.starred ? 'on' : ''}" title="${t.starred ? 'Tirar estrela' : 'Marcar com estrela'}" onclick="alternarEstrela(${t.id})">${t.starred ? '★' : '☆'}</button><button class="mini-btn" title="Editar" onclick="editarTarefa(${t.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removeTask(${t.id})">✕</button></div>
    </div>
    ${subs.length && aberto ? `<div class="subtasks">${subs.map((s, i) => `<label class="subtask ${s.done ? 'done' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} onclick="toggleSubtask(${t.id}, ${i})"> ${esc(s.text)}</label>`).join('')}</div>` : ''}
  </li>`;
}
function toggleTask(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  t.done = !t.done;
  if (t.done) { t.doneAt = new Date().toISOString(); (t.subtasks || []).forEach(s => s.done = true); } else delete t.doneAt;
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
}
function toggleSubtask(id, i) {
  const t = tasks.find(x => x.id === id); if (!t || !t.subtasks[i]) return;
  t.subtasks[i].done = !t.subtasks[i].done;
  if (t.subtasks.every(s => s.done) && !t.done) { t.done = true; t.doneAt = new Date().toISOString(); toast('✅ Todas as subtarefas feitas — tarefa concluída.'); }
  salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao();
}
function alternarEstrela(id) { const t = tasks.find(x => x.id === id); if (!t) return; t.starred = !t.starred; salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); }
function removeTask(id) {
  const t = tasks.find(x => x.id === id); if (!t || !confirm(`Apagar "${t.text}"?`)) return;
  tasks = tasks.filter(x => x.id !== id); salvar('tasks', tasks); renderTaskLists(); renderTasks(); renderJournal(); atualizarSaudacao(); renderCalendar();
}
/** Tarefas pendentes em ordem de importância (estrela, atrasada, hoje, com prazo, resto) — usada no Painel. */
function tarefasPrioritarias(n) { return tasks.filter(t => !t.done).sort(ordenarTarefas).slice(0, n); }

// --- NOTAS (estilo Google Keep) ---
// Modelo: { id, title, content, checklist: [{ text, done }] | null, color, labels: [], pinned, archived, createdAt, updatedAt }
const CORES_NOTA = {
  default: { nome: 'Padrão',  bg: '#121212', borda: '#2a2a2a' },
  red:     { nome: 'Vermelho', bg: '#3b1f1f', borda: '#7f1d1d' },
  orange:  { nome: 'Laranja',  bg: '#3d2a14', borda: '#9a3412' },
  yellow:  { nome: 'Amarelo',  bg: '#3d3414', borda: '#a16207' },
  green:   { nome: 'Verde',    bg: '#14301f', borda: '#166534' },
  teal:    { nome: 'Azul-petróleo', bg: '#0f2f33', borda: '#0e7490' },
  blue:    { nome: 'Azul',     bg: '#142a3d', borda: '#1d4ed8' },
  purple:  { nome: 'Roxo',     bg: '#2a1a3d', borda: '#6d28d9' },
  pink:    { nome: 'Rosa',     bg: '#3d1a2e', borda: '#be185d' },
  gray:    { nome: 'Cinza',    bg: '#26272b', borda: '#52525b' }
};
let noteFilter = 'ativas';   // 'ativas' | 'fixadas' | 'arquivadas'
let noteLabel = '';          // marcador selecionado
let noteSearch = '';
let noteColorSel = 'default';
let noteTipo = 'texto';      // 'texto' | 'lista'

function normalizarNotas() {
  let mudou = false;
  notes.forEach((n, i) => {
    if (!n.id) { n.id = novoId() + i; mudou = true; }
    if (!n.color) { n.color = 'default'; mudou = true; }
    if (!Array.isArray(n.labels)) { n.labels = []; mudou = true; }
    if (n.pinned === undefined) { n.pinned = false; mudou = true; }
    if (n.archived === undefined) { n.archived = false; mudou = true; }
    if (!n.createdAt) { n.createdAt = n.id; mudou = true; }
  });
  return mudou;
}
function corNota(c) { return CORES_NOTA[c] || CORES_NOTA.default; }
function todosMarcadores() { const s = new Set(); notes.forEach(n => (n.labels || []).forEach(l => s.add(l))); return [...s].sort((a, b) => a.localeCompare(b)); }

function renderPaletaNota() {
  const el = document.getElementById('note-colors'); if (!el) return;
  el.innerHTML = Object.entries(CORES_NOTA).map(([k, c]) => `<span class="color-dot ${noteColorSel === k ? 'sel' : ''}" style="background:${c.bg}; border-color:${c.borda}" title="${c.nome}" onclick="escolherCorNota('${k}')"></span>`).join('');
}
function escolherCorNota(k) { noteColorSel = k; renderPaletaNota(); }
function alternarTipoNota(tipo, el) {
  noteTipo = tipo; document.querySelectorAll('#note-tipo span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active');
  document.getElementById('note-content').hidden = tipo !== 'texto';
  document.getElementById('note-checklist').hidden = tipo !== 'lista';
}
function renderFiltrosNota() {
  const el = document.getElementById('note-labels'); if (!el) return;
  const labels = todosMarcadores();
  el.innerHTML = labels.length ? `<span class="chip ${noteLabel === '' ? 'sel' : ''}" onclick="filtrarMarcador('')">todos</span>` + labels.map(l => `<span class="chip ${noteLabel === l ? 'sel' : ''}" onclick="filtrarMarcador('${esc(l).replace(/'/g, '&#39;')}')">🏷️ ${esc(l)}</span>`).join('') : '';
}
function filtrarMarcador(l) { noteLabel = l; renderNotes(); }
function filtrarNotas(f, el) { noteFilter = f; document.querySelectorAll('#note-filters span').forEach(s => s.classList.remove('active')); if (el) el.classList.add('active'); renderNotes(); }
function buscarNotas(v) { noteSearch = (v || '').trim().toLowerCase(); renderNotes(); }

document.getElementById('note-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('note-id').value;
  const title = document.getElementById('note-title').value.trim();
  const content = noteTipo === 'texto' ? document.getElementById('note-content').value.trim() : '';
  const linhas = noteTipo === 'lista' ? document.getElementById('note-checklist').value.split('\n').map(s => s.trim()).filter(Boolean) : [];
  if (!title && !content && !linhas.length) return;
  const labels = document.getElementById('note-labels-input').value.split(',').map(s => s.trim()).filter(Boolean);
  const dados = { title, content, color: noteColorSel, labels, pinned: document.getElementById('note-pin').checked, updatedAt: Date.now() };
  if (id) {
    const n = notes.find(x => String(x.id) === id); if (!n) return;
    const antigas = n.checklist || [];
    Object.assign(n, dados); n.checklist = noteTipo === 'lista' ? linhas.map(l => ({ text: l, done: !!(antigas.find(a => a.text === l) || {}).done })) : null;
  } else {
    notes.push({ id: novoId(), archived: false, createdAt: Date.now(), checklist: noteTipo === 'lista' ? linhas.map(l => ({ text: l, done: false })) : null, ...dados });
  }
  salvar('notes', notes); cancelarEdicaoNota(); renderNotes();
  toast(id ? '📝 Nota atualizada.' : '📝 Nota salva.');
});
function cancelarEdicaoNota() {
  document.getElementById('note-form').reset(); document.getElementById('note-id').value = '';
  noteColorSel = 'default'; renderPaletaNota(); alternarTipoNota('texto', document.querySelector('#note-tipo span'));
  document.getElementById('note-form-title').innerText = 'Nova Anotação';
  document.getElementById('note-submit').innerText = 'Salvar Nota';
  document.getElementById('note-cancel').hidden = true;
}
function editarNota(id) {
  const n = notes.find(x => x.id === id); if (!n) return;
  changeTab('notes');
  document.getElementById('note-id').value = n.id; document.getElementById('note-title').value = n.title || '';
  const lista = Array.isArray(n.checklist);
  alternarTipoNota(lista ? 'lista' : 'texto', document.querySelectorAll('#note-tipo span')[lista ? 1 : 0]);
  document.getElementById('note-content').value = n.content || ''; document.getElementById('note-checklist').value = lista ? n.checklist.map(c => c.text).join('\n') : '';
  document.getElementById('note-labels-input').value = (n.labels || []).join(', '); document.getElementById('note-pin').checked = !!n.pinned;
  noteColorSel = n.color || 'default'; renderPaletaNota();
  document.getElementById('note-form-title').innerText = 'Editar nota';
  document.getElementById('note-submit').innerText = 'Salvar alterações';
  document.getElementById('note-cancel').hidden = false;
  document.getElementById('note-title').scrollIntoView({ behavior: 'smooth', block: 'center' }); document.getElementById('note-title').focus();
}
function fixarNota(id) { const n = notes.find(x => x.id === id); if (!n) return; n.pinned = !n.pinned; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function arquivarNota(id) { const n = notes.find(x => x.id === id); if (!n) return; n.archived = !n.archived; if (n.archived) n.pinned = false; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); toast(n.archived ? '🗄️ Nota arquivada.' : '📤 Nota desarquivada.'); }
function toggleItemNota(id, i) { const n = notes.find(x => x.id === id); if (!n || !n.checklist || !n.checklist[i]) return; n.checklist[i].done = !n.checklist[i].done; n.updatedAt = Date.now(); salvar('notes', notes); renderNotes(); }
function removeNote(id) {
  const n = notes.find(x => x.id === id); if (!n || !confirm(`Apagar a nota "${n.title || '(sem título)'}"?`)) return;
  notes = notes.filter(x => x.id !== id); salvar('notes', notes); renderNotes();
}

function renderNotes() {
  const list = document.getElementById('note-list'); if (!list) return; list.innerHTML = '';
  renderFiltrosNota();
  let vis = notes.filter(n => noteFilter === 'arquivadas' ? n.archived : !n.archived);
  if (noteFilter === 'fixadas') vis = vis.filter(n => n.pinned);
  if (noteLabel) vis = vis.filter(n => (n.labels || []).includes(noteLabel));
  if (noteSearch) vis = vis.filter(n => `${n.title || ''} ${n.content || ''} ${(n.checklist || []).map(c => c.text).join(' ')} ${(n.labels || []).join(' ')}`.toLowerCase().includes(noteSearch));
  vis.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  const fixadas = vis.filter(n => n.pinned); const outras = vis.filter(n => !n.pinned);
  const cont = document.getElementById('note-count'); if (cont) cont.innerText = `${vis.length} nota${vis.length === 1 ? '' : 's'}`;
  if (!vis.length) { list.innerHTML = '<div class="stat-line muted" style="text-align:center; padding:20px;">Nenhuma nota aqui.</div>'; return; }
  const secao = (titulo, itens) => itens.length ? `<div class="note-section-title">${titulo} <small>${itens.length}</small></div><div class="note-grid">${itens.map(cardNota).join('')}</div>` : '';
  list.innerHTML = (fixadas.length && noteFilter !== 'fixadas' ? secao('📌 Fixadas', fixadas) + secao('Outras', outras) : `<div class="note-grid">${vis.map(cardNota).join('')}</div>`);
}
function cardNota(n) {
  const c = corNota(n.color); const lista = Array.isArray(n.checklist);
  const feitos = lista ? n.checklist.filter(i => i.done).length : 0;
  const quando = new Date(n.updatedAt || n.createdAt || n.id).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `<div class="note-card" style="background:${c.bg}; border-color:${c.borda}" onclick="editarNota(${n.id})">
    <div class="note-header"><h4>${n.pinned ? '📌 ' : ''}${esc(n.title || (lista ? 'Lista' : 'Sem título'))}</h4><div class="item-actions" onclick="event.stopPropagation()"><button class="mini-btn ${n.pinned ? 'on' : ''}" title="${n.pinned ? 'Desafixar' : 'Fixar'}" onclick="fixarNota(${n.id})">📌</button><button class="mini-btn" title="Editar" onclick="editarNota(${n.id})">✎</button><button class="mini-btn" title="${n.archived ? 'Desarquivar' : 'Arquivar'}" onclick="arquivarNota(${n.id})">${n.archived ? '📤' : '🗄️'}</button><button class="mini-btn" title="Apagar" onclick="removeNote(${n.id})">✕</button></div></div>
    ${lista ? `<div class="note-check" onclick="event.stopPropagation()">${n.checklist.map((i, k) => `<label class="subtask ${i.done ? 'done' : ''}"><input type="checkbox" ${i.done ? 'checked' : ''} onclick="toggleItemNota(${n.id}, ${k})"> ${esc(i.text)}</label>`).join('')}<small class="item-date">${feitos}/${n.checklist.length} feitos</small></div>` : (n.content ? `<div class="note-body">${esc(n.content)}</div>` : '')}
    <div class="note-foot">${(n.labels || []).map(l => `<span class="chip small">🏷️ ${esc(l)}</span>`).join('')}<small class="item-date" style="margin-left:auto">${quando}</small></div>
  </div>`;
}

// Config/Backup
function exportData() { const data = { habits, habitlog: habitLog, shifts, places, events, finances: transactions, recurring, tasks, tasklists, notes, study: studyData }; const dataStr = JSON.stringify(data, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const d = new Date(); const dateString = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`; a.download = `genesis_backup_${dateString}.json`; a.click(); URL.revokeObjectURL(url); const statusEl = document.getElementById('backup-status'); statusEl.innerText = "Backup exportado!"; setTimeout(() => statusEl.innerText = "", 3000); }
function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const data = JSON.parse(e.target.result); if (data.habits) salvar('habits', data.habits); if (data.habitlog) salvar('habitlog', data.habitlog); if (data.shifts) salvar('shifts', data.shifts); if (data.places) salvar('places', data.places); if (data.events) salvar('events', data.events); if (data.finances) salvar('finances', data.finances); if (data.recurring) salvar('recurring', data.recurring); if (data.tasks) salvar('tasks', data.tasks); if (data.tasklists) salvar('tasklists', data.tasklists); if (data.notes) salvar('notes', data.notes); if (data.study) salvar('study', data.study); location.reload(); } catch (error) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); }

// ============================================================================
// SINCRONIZAÇÃO (Google Sheets via Apps Script — ver sync/Code.gs)
// Como funciona: cada módulo (habits, shifts, ...) tem um carimbo de hora
// "updatedAt" da última vez que foi salvo neste aparelho. Ao sincronizar, o
// app manda tudo com os carimbos; o Code.gs guarda só o que for mais novo do
// que a planilha tem e devolve o estado final; o app adota daqui o que a
// planilha tiver de mais novo. Em empate, a planilha vence.
// URL e token ficam SÓ no localStorage deste aparelho (aba Config).
// ============================================================================
const SYNC_MODULOS = ['habits', 'habitlog', 'shifts', 'places', 'events', 'finances', 'recurring', 'tasks', 'tasklists', 'notes', 'study'];
const SYNC_INTERVALO_MS = 30000; // sincronização periódica com o app aberto

let syncMeta = JSON.parse(localStorage.getItem('lifeos_sync_meta')) || null;
if (!syncMeta) {
  // Primeira vez com sync neste aparelho: o que já existe ganha carimbo 1
  // ("existe, mas é antigo") e o que não existe ganha 0.
  syncMeta = {};
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
}
SYNC_MODULOS.forEach(m => { if (syncMeta[m] === undefined) syncMeta[m] = localStorage.getItem('lifeos_' + m) ? 1 : 0; });
let syncConfig = JSON.parse(localStorage.getItem('lifeos_sync_config')) || { url: '', token: '', agenda: false };
let agendaForcar = false; // botão "Enviar agenda agora"
let syncPendente = localStorage.getItem('lifeos_sync_pendente') === '1';
let syncTimer = null;
let syncEmAndamento = false;
let syncEditouDurante = false; // alguma gravação aconteceu enquanto a rede respondia?

/** Grava um módulo no localStorage, carimba a hora e agenda uma sincronização. */
function salvar(modulo, valor) {
  localStorage.setItem('lifeos_' + modulo, JSON.stringify(valor));
  syncMeta[modulo] = Date.now();
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
  syncEditouDurante = true;
  marcarPendente(true);
  agendarSync();
}

function marcarPendente(v) {
  syncPendente = v;
  localStorage.setItem('lifeos_sync_pendente', v ? '1' : '0');
  if (v && !syncEmAndamento) setSyncStatus('pendente');
}

/** Espera 2,5 s depois da última alteração antes de sincronizar (junta várias edições numa só). */
function agendarSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => sincronizar(), 2500);
}

function syncConfigurado() { return !!(syncConfig.url && syncConfig.token); }

async function sincronizar() {
  if (!syncConfigurado()) { setSyncStatus('naoconfig'); verificarNovoDia(); return; }
  if (syncEmAndamento) return;
  if (!navigator.onLine) { setSyncStatus('offline'); verificarNovoDia(); return; }

  syncEmAndamento = true; syncEditouDurante = false; setSyncStatus('andamento');
  try {
    const dados = {};
    SYNC_MODULOS.forEach(m => {
      const bruto = localStorage.getItem('lifeos_' + m);
      if (bruto !== null) dados[m] = { updatedAt: syncMeta[m] || 0, valor: JSON.parse(bruto) };
    });

    // Google Calendar: só pede o espelhamento quando plantões/compromissos mudaram desde o último envio
    const agendaStamp = Number(localStorage.getItem('lifeos_agenda_stamp')) || 0;
    const precisaAgenda = !!syncConfig.agenda && (agendaForcar || (syncMeta.shifts || 0) > agendaStamp || (syncMeta.events || 0) > agendaStamp);
    agendaForcar = false;

    // Content-Type text/plain de propósito: evita o "preflight" CORS que o Apps Script não responde.
    const resp = await fetch(syncConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: syncConfig.token, acao: 'push', dados, agenda: precisaAgenda })
    });
    const r = await resp.json();
    if (!r.ok) throw new Error(r.erro || 'resposta inválida do servidor');

    const mudou = aplicarRemoto(r.dados || {});
    if (precisaAgenda) {
      if (r.agenda && r.agenda.ok) {
        localStorage.setItem('lifeos_agenda_stamp', String(Math.max(syncMeta.shifts || 0, syncMeta.events || 0)));
        const a = r.agenda; setAgendaStatus('ok', `${a.total} na agenda · +${a.criados} criado${a.criados === 1 ? '' : 's'}, ${a.atualizados} atualizado${a.atualizados === 1 ? '' : 's'}, ${a.removidos} removido${a.removidos === 1 ? '' : 's'}`);
      } else if (r.agenda) setAgendaStatus('erro', r.agenda.erro || 'falha no Calendar');
      else setAgendaStatus('erro', 'o Code.gs implantado ainda é a versão 1 (sem agenda). Cole a v2 e crie uma nova versão da implantação.');
    }
    // se algo foi editado enquanto a rede respondia, continua pendente
    const editouDurante = syncEditouDurante;
    marcarPendente(editouDurante);
    localStorage.setItem('lifeos_sync_ultima', String(Date.now()));
    setSyncStatus(editouDurante ? 'pendente' : 'ok');
    if (mudou) redesenharTudo();
    if (editouDurante) agendarSync();
  } catch (err) {
    console.error('Sync:', err);
    setSyncStatus(navigator.onLine ? 'erro' : 'offline', String(err.message || err));
  } finally {
    syncEmAndamento = false;
    // Só depois de saber o estado mais novo é que fechamos o dia anterior
    // (evita que um aparelho zere hábitos que o outro já marcou hoje).
    verificarNovoDia();
  }
}

/** Adota o que veio da planilha se for mais novo (ou igual e diferente — empate: planilha vence). */
function aplicarRemoto(remoto) {
  let mudou = false;
  SYNC_MODULOS.forEach(m => {
    const r = remoto[m];
    if (!r || r.valor === null || r.valor === undefined) return;
    const local = syncMeta[m] || 0;
    if (r.updatedAt < local) return;
    const texto = JSON.stringify(r.valor);
    if (r.updatedAt === local && texto === localStorage.getItem('lifeos_' + m)) return;
    localStorage.setItem('lifeos_' + m, texto);
    syncMeta[m] = r.updatedAt; // sem carimbar hora nova: isso não é edição local
    mudou = true;
  });
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
  return mudou;
}

/** Recarrega as variáveis a partir do localStorage e redesenha todas as abas. */
function redesenharTudo() {
  habits = JSON.parse(localStorage.getItem('lifeos_habits')) || habits;
  habitLog = JSON.parse(localStorage.getItem('lifeos_habitlog')) || habitLog; if (!habitLog.dias) habitLog.dias = {};
  shifts = JSON.parse(localStorage.getItem('lifeos_shifts')) || [];
  events = JSON.parse(localStorage.getItem('lifeos_events')) || [];
  places = JSON.parse(localStorage.getItem('lifeos_places')) || places;
  transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
  recurring = JSON.parse(localStorage.getItem('lifeos_recurring')) || [];
  tasks = (JSON.parse(localStorage.getItem('lifeos_tasks')) || []).map(t => typeof t === 'string' ? { text: t, done: false } : t);
  tasklists = JSON.parse(localStorage.getItem('lifeos_tasklists')) || tasklists; normalizarTarefas();
  notes = JSON.parse(localStorage.getItem('lifeos_notes')) || []; normalizarNotas();
  const st = JSON.parse(localStorage.getItem('lifeos_study'));
  if (st) { studyData = st; if (!studyData.dias) studyData.dias = {}; }
  renderFocusTab(); preencherLocais(); renderShifts(); renderEvents(); updateFinanceValues(); renderFinances(); renderRecorrentes(); renderTaskLists(); renderTasks(); renderNotes(); updateStudyStats(); renderJournal(); atualizarSaudacao();
}

function setAgendaStatus(estado, texto) {
  const el = document.getElementById('agenda-status'); if (!el) return;
  localStorage.setItem('lifeos_agenda_status', JSON.stringify({ estado, texto, quando: Date.now() }));
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  el.innerText = (estado === 'ok' ? '📆 Google Agenda ' + hora + ': ' : '📆 Google Agenda — erro: ') + texto;
  el.style.color = estado === 'ok' ? '#22c55e' : '#ef4444';
}
function enviarAgendaAgora() {
  if (!syncConfig.agenda) { toast('Marque "Enviar para o Google Calendar" e clique em Salvar e testar primeiro.'); return; }
  agendaForcar = true; sincronizar();
}
function setSyncStatus(estado, detalhe) {
  const el = document.getElementById('sync-status');
  const dot = document.getElementById('sync-dot');
  const ultima = localStorage.getItem('lifeos_sync_ultima');
  const hora = ultima ? new Date(Number(ultima)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const mapa = {
    naoconfig: ['⚪', 'Sincronização não configurada — preencha URL e token abaixo.', '#64748b'],
    andamento: ['🔄', 'Sincronizando...', '#38bdf8'],
    ok:        ['🟢', 'Sincronizado' + (hora ? ' às ' + hora : '') + ' · automático a cada 30 s', '#22c55e'],
    pendente:  ['🟡', 'Alterações pendentes' + (hora ? ' (último sync ' + hora + ')' : ''), '#f59e0b'],
    offline:   ['🔴', 'Offline — vai sincronizar quando a internet voltar.', '#ef4444'],
    erro:      ['🔴', 'Erro: ' + (detalhe || 'falha na sincronização'), '#ef4444']
  };
  const [icone, texto, cor] = mapa[estado] || mapa.naoconfig;
  if (el) { el.innerText = icone + ' ' + texto; el.style.color = cor; }
  if (dot) { dot.style.background = cor; dot.title = texto; }
}

/** Botão "Salvar e testar" da aba Config. */
function salvarSyncConfig() {
  const url = document.getElementById('sync-url').value.trim();
  const token = document.getElementById('sync-token').value.trim();
  if (url && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
    alert('A URL deve ser a do "App da Web" do Apps Script: começa com https://script.google.com/macros/s/ e termina em /exec');
    return;
  }
  const agenda = !!(document.getElementById('sync-agenda') && document.getElementById('sync-agenda').checked);
  if (agenda && !syncConfig.agenda) agendaForcar = true; // acabou de ligar: manda tudo de uma vez
  syncConfig = { url, token, agenda };
  localStorage.setItem('lifeos_sync_config', JSON.stringify(syncConfig));
  if (syncConfigurado()) { marcarPendente(true); sincronizar(); } else setSyncStatus('naoconfig');
}

function carregarSyncConfigNaTela() {
  const u = document.getElementById('sync-url'); const t = document.getElementById('sync-token');
  if (u) u.value = syncConfig.url || '';
  if (t) t.value = syncConfig.token || '';
  const a = document.getElementById('sync-agenda'); if (a) a.checked = !!syncConfig.agenda;
  const st = JSON.parse(localStorage.getItem('lifeos_agenda_status') || 'null'); const el = document.getElementById('agenda-status');
  if (st && el) { el.innerText = (st.estado === 'ok' ? '📆 Google Agenda ' + new Date(st.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ': ' : '📆 Google Agenda — erro: ') + st.texto; el.style.color = st.estado === 'ok' ? '#22c55e' : '#ef4444'; }
}

// Gatilhos automáticos: voltou a internet / voltou pro app (celular) / a cada 30 s com o app visível
window.addEventListener('online', () => sincronizar());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
setInterval(() => { if (document.visibilityState === 'visible' && syncConfigurado()) sincronizar(); }, SYNC_INTERVALO_MS);

// INICIALIZAÇÃO
changeJournalTab('day', document.querySelector('#journal-tabs span.active'));
if (normalizarNotas()) localStorage.setItem('lifeos_notes', JSON.stringify(notes));
renderPaletaNota(); if (normalizarTarefas()) { localStorage.setItem('lifeos_tasks', JSON.stringify(tasks)); localStorage.setItem('lifeos_tasklists', JSON.stringify(tasklists)); }
renderTaskLists(); preencherTiposEvento(); preencherLocais(); preencherCategorias(false); preencherCategoriasRec(); document.getElementById('fin-date').value = hojeISO(); gerarRecorrentes();
updatePomodoroTime(); updateStudyStats(); renderFocusTab(); renderCalendar(); updateFinanceValues(); renderFinances(); renderShifts(); renderTasks(); renderNotes(); renderEvents(); renderRecorrentes();
carregarPrefsNaTela(); atualizarSaudacao(); atualizarBotaoDia();
carregarSyncConfigNaTela(); setSyncStatus(syncConfigurado() ? (syncPendente ? "pendente" : "ok") : "naoconfig"); sincronizar();
