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
    const pend = tasks.filter(t => !t.done).slice(0, 5);
    html += '<div class="stat-lists">';
    html += `<div><h5>🚑 Plantões de hoje</h5>${plHoje.length ? plHoje.map(s => `<div class="stat-line"><strong>${esc(s.time || '')}</strong> ${esc(s.desc)} <span style="color:#f59e0b">${formatCurrency(s.amount)}</span></div>`).join('') : '<div class="stat-line muted">nenhum</div>'}</div>`;
    html += `<div><h5>✅ Próximas tarefas</h5>${pend.length ? pend.map(t => `<div class="stat-line">• ${esc(t.text)}</div>`).join('') : '<div class="stat-line muted">tudo em dia</div>'}</div>`;
    html += '</div>';
  }
  content.innerHTML = html;
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
  let daysHTML = '';
  for (let x = 0; x < firstDayIndex; x++) daysHTML += `<div class="calendar-day empty"></div>`;

  for (let i = 1; i <= lastDay; i++) {
    const hasShift = shifts.some(s => { const [sy, sm, sd] = s.date.split('-'); return parseInt(sy) === year && parseInt(sm) - 1 === month && parseInt(sd) === i; });
    const dotHTML = hasShift ? '<div class="shift-dot"></div>' : '';
    const isToday = i === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
    daysHTML += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="openDayModal(${year}, ${month + 1}, ${i})">${i}${dotHTML}</div>`;
  }
  calendarDaysEl.innerHTML = daysHTML;
}
document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

function openDayModal(year, month, day) {
  const m = month.toString().padStart(2, '0'); const d = day.toString().padStart(2, '0');
  selectedModalDate = `${year}-${m}-${d}`; document.getElementById('modal-date-title').innerText = `${d}/${m}/${year}`;

  const dayShifts = shifts.filter(s => s.date === selectedModalDate);
  const modalList = document.getElementById('modal-shift-list'); modalList.innerHTML = '';

  if (dayShifts.length === 0) {
    modalList.innerHTML = '<li style="justify-content:center; color:#64748b; background: transparent; border:none;">Nenhum plantão agendado.</li>';
  } else {
    // Organiza por horário
    dayShifts.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00")).forEach(s => {
      modalList.innerHTML += `<li class="shift-item"><span style="display:flex; flex-direction:column;"><strong>${esc(s.time || '')}</strong> <span style="font-size:0.85rem;">${esc(s.desc)}</span></span><strong>${formatCurrency(s.amount)}</strong></li>`;
    });
  }
  document.getElementById('day-modal').style.display = 'flex';
}
function closeModal() { document.getElementById('day-modal').style.display = 'none'; }
function goToAddShift() { closeModal(); changeTab('shifts'); document.getElementById('shift-date').value = selectedModalDate; setTimeout(() => document.getElementById('shift-desc').focus(), 100); }
document.getElementById('day-modal').addEventListener('click', (e) => { if (e.target.id === 'day-modal') closeModal(); });

// --- FINANÇAS ---
function updateFinanceValues() {
  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const total = income - expense;
  document.getElementById('total-income').innerText = formatCurrency(income);
  document.getElementById('total-expense').innerText = formatCurrency(expense);
  document.getElementById('net-balance').innerText = formatCurrency(total);
  document.getElementById('net-balance').style.color = total >= 0 ? '#22c55e' : '#ef4444';
}
function renderFinances() {
  const tList = document.getElementById('transaction-list'); tList.innerHTML = '';
  transactions.forEach((t, i) => {
    const li = document.createElement('li'); li.classList.add(t.type === 'income' ? 'income-item' : 'expense-item');
    li.innerHTML = `<div class="transaction-info"><span>${esc(t.desc)}</span><small class="category-badge">${esc(t.category || 'Sem categoria')}</small></div>
      <div><strong>${formatCurrency(t.amount)}</strong><button class="delete-btn" onclick="removeFinance(${i})">✕</button></div>`;
    tList.appendChild(li);
  });
}
document.getElementById('finance-form').addEventListener('submit', (e) => {
  e.preventDefault(); const desc = document.getElementById('desc').value.trim(); const amount = parseFloat(document.getElementById('amount').value);
  if (!desc || isNaN(amount)) return;
  transactions.push({ id: Date.now(), date: hojeISO(), desc, amount, type: document.getElementById('type').value, category: document.getElementById('category').value });
  salvar('finances', transactions); updateFinanceValues(); renderFinances(); renderJournal(); document.getElementById('finance-form').reset();
});
function removeFinance(index) { transactions.splice(index, 1); salvar('finances', transactions); updateFinanceValues(); renderFinances(); renderJournal(); }

// --- PLANTÕES ---
function renderShifts() {
  const sList = document.getElementById('shift-list'); sList.innerHTML = '';
  shifts.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((s, i) => {
    const [y, m, d] = s.date.split('-'); const li = document.createElement('li'); li.classList.add('shift-item');
    li.innerHTML = `<div class="transaction-info"><span>${esc(s.desc)}</span><small class="category-badge" style="color:#f59e0b; background: rgba(245,158,11,0.1)">${d}/${m}/${y} às ${esc(s.time || '')}</small></div>
      <div><strong>${formatCurrency(s.amount)}</strong><button class="delete-btn" onclick="removeShift(${i})">✕</button></div>`;
    sList.appendChild(li);
  }); renderCalendar();
}
document.getElementById('shift-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('shift-date').value;
  const time = document.getElementById('shift-time').value;
  const desc = document.getElementById('shift-desc').value.trim();
  const amount = parseFloat(document.getElementById('shift-amount').value);

  if (!date || !time || !desc || isNaN(amount)) return;
  const uid = Date.now();
  shifts.push({ id: uid, date, time, desc, amount }); salvar('shifts', shifts);

  const [y, m, d] = date.split('-');
  transactions.push({ id: uid, date, desc: `Plantão: ${desc} (${d}/${m} às ${time})`, amount: amount, type: 'income', category: 'Plantão SAMU' });
  salvar('finances', transactions);
  renderShifts(); updateFinanceValues(); renderFinances(); renderJournal(); atualizarSaudacao(); document.getElementById('shift-form').reset();
});
function removeShift(index) {
  const sId = shifts[index].id; shifts.splice(index, 1); salvar('shifts', shifts);
  transactions = transactions.filter(t => t.id !== sId); salvar('finances', transactions); renderShifts(); updateFinanceValues(); renderFinances(); renderJournal(); atualizarSaudacao();
}

// --- TAREFAS (KEEP STYLE) ---
document.getElementById('task-form').addEventListener('submit', (e) => {
  e.preventDefault(); const desc = document.getElementById('task-desc').value.trim();
  if (!desc) return; tasks.push({ text: desc, done: false }); salvar('tasks', tasks); renderTasks(); renderJournal(); atualizarSaudacao(); document.getElementById('task-form').reset();
});
function renderTasks() {
  const list = document.getElementById('task-list'); list.innerHTML = '';
  const sortedTasks = [...tasks].map((t, i) => ({ ...t, originalIndex: i })).sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);

  sortedTasks.forEach(t => {
    const li = document.createElement('li');
    li.style.borderLeftColor = '#38bdf8';
    if (t.done) li.style.opacity = '0.5';

    li.innerHTML = `<div style="display:flex; align-items:center; gap:10px; width:100%;">
      <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTask(${t.originalIndex})" style="accent-color: #38bdf8;">
      <span style="${t.done ? 'text-decoration: line-through;' : ''}; cursor: pointer; flex:1;" onclick="toggleTask(${t.originalIndex})">${esc(t.text)}</span>
    </div>
    <button class="delete-btn" onclick="removeTask(${t.originalIndex})">✕</button>`;
    list.appendChild(li);
  });
}
function toggleTask(i) {
  tasks[i].done = !tasks[i].done;
  if (tasks[i].done) tasks[i].doneAt = new Date().toISOString(); else delete tasks[i].doneAt;
  salvar('tasks', tasks); renderTasks(); renderJournal(); atualizarSaudacao();
}
function removeTask(i) { tasks.splice(i, 1); salvar('tasks', tasks); renderTasks(); renderJournal(); atualizarSaudacao(); }

// --- NOTAS ---
document.getElementById('note-form').addEventListener('submit', (e) => { e.preventDefault(); const t = document.getElementById('note-title').value.trim(); const c = document.getElementById('note-content').value.trim(); if (!t || !c) return; notes.push({ title: t, content: c }); salvar('notes', notes); renderNotes(); document.getElementById('note-form').reset(); });
function renderNotes() { const list = document.getElementById('note-list'); list.innerHTML = ''; notes.forEach((n, i) => { const div = document.createElement('div'); div.classList.add('note-card'); div.innerHTML = `<div class="note-header"><h4>${esc(n.title)}</h4><button class="delete-btn" onclick="removeNote(${i})">✕</button></div><div class="note-body">${esc(n.content)}</div>`; list.appendChild(div); }); }
function removeNote(i) { notes.splice(i, 1); salvar('notes', notes); renderNotes(); }

// Config/Backup
function exportData() { const data = { habits, habitlog: habitLog, shifts, finances: transactions, tasks, notes, study: studyData }; const dataStr = JSON.stringify(data, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const d = new Date(); const dateString = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`; a.download = `genesis_backup_${dateString}.json`; a.click(); URL.revokeObjectURL(url); const statusEl = document.getElementById('backup-status'); statusEl.innerText = "Backup exportado!"; setTimeout(() => statusEl.innerText = "", 3000); }
function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const data = JSON.parse(e.target.result); if (data.habits) salvar('habits', data.habits); if (data.habitlog) salvar('habitlog', data.habitlog); if (data.shifts) salvar('shifts', data.shifts); if (data.finances) salvar('finances', data.finances); if (data.tasks) salvar('tasks', data.tasks); if (data.notes) salvar('notes', data.notes); if (data.study) salvar('study', data.study); location.reload(); } catch (error) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); }

// ============================================================================
// SINCRONIZAÇÃO (Google Sheets via Apps Script — ver sync/Code.gs)
// Como funciona: cada módulo (habits, shifts, ...) tem um carimbo de hora
// "updatedAt" da última vez que foi salvo neste aparelho. Ao sincronizar, o
// app manda tudo com os carimbos; o Code.gs guarda só o que for mais novo do
// que a planilha tem e devolve o estado final; o app adota daqui o que a
// planilha tiver de mais novo. Em empate, a planilha vence.
// URL e token ficam SÓ no localStorage deste aparelho (aba Config).
// ============================================================================
const SYNC_MODULOS = ['habits', 'habitlog', 'shifts', 'finances', 'tasks', 'notes', 'study'];
const SYNC_INTERVALO_MS = 30000; // sincronização periódica com o app aberto

let syncMeta = JSON.parse(localStorage.getItem('lifeos_sync_meta')) || null;
if (!syncMeta) {
  // Primeira vez com sync neste aparelho: o que já existe ganha carimbo 1
  // ("existe, mas é antigo") e o que não existe ganha 0.
  syncMeta = {};
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
}
SYNC_MODULOS.forEach(m => { if (syncMeta[m] === undefined) syncMeta[m] = localStorage.getItem('lifeos_' + m) ? 1 : 0; });
let syncConfig = JSON.parse(localStorage.getItem('lifeos_sync_config')) || { url: '', token: '' };
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

    // Content-Type text/plain de propósito: evita o "preflight" CORS que o Apps Script não responde.
    const resp = await fetch(syncConfig.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: syncConfig.token, acao: 'push', dados })
    });
    const r = await resp.json();
    if (!r.ok) throw new Error(r.erro || 'resposta inválida do servidor');

    const mudou = aplicarRemoto(r.dados || {});
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
  transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
  tasks = (JSON.parse(localStorage.getItem('lifeos_tasks')) || []).map(t => typeof t === 'string' ? { text: t, done: false } : t);
  notes = JSON.parse(localStorage.getItem('lifeos_notes')) || [];
  const st = JSON.parse(localStorage.getItem('lifeos_study'));
  if (st) { studyData = st; if (!studyData.dias) studyData.dias = {}; }
  renderFocusTab(); renderShifts(); updateFinanceValues(); renderFinances(); renderTasks(); renderNotes(); updateStudyStats(); renderJournal(); atualizarSaudacao();
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
  syncConfig = { url, token };
  localStorage.setItem('lifeos_sync_config', JSON.stringify(syncConfig));
  if (syncConfigurado()) { marcarPendente(true); sincronizar(); } else setSyncStatus('naoconfig');
}

function carregarSyncConfigNaTela() {
  const u = document.getElementById('sync-url'); const t = document.getElementById('sync-token');
  if (u) u.value = syncConfig.url || '';
  if (t) t.value = syncConfig.token || '';
}

// Gatilhos automáticos: voltou a internet / voltou pro app (celular) / a cada 30 s com o app visível
window.addEventListener('online', () => sincronizar());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });
setInterval(() => { if (document.visibilityState === 'visible' && syncConfigurado()) sincronizar(); }, SYNC_INTERVALO_MS);

// INICIALIZAÇÃO
changeJournalTab('day', document.querySelector('#journal-tabs span.active'));
updatePomodoroTime(); updateStudyStats(); renderFocusTab(); renderCalendar(); updateFinanceValues(); renderFinances(); renderShifts(); renderTasks(); renderNotes();
carregarPrefsNaTela(); atualizarSaudacao(); atualizarBotaoDia();
carregarSyncConfigNaTela(); setSyncStatus(syncConfigurado() ? (syncPendente ? "pendente" : "ok") : "naoconfig"); sincronizar();
