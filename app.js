function changeTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.getElementById('btn-' + tabId).classList.add('active');
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

function formatCurrency(value) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// --- POMODORO TIMER ---
let studyData = JSON.parse(localStorage.getItem('lifeos_study')) || { date: new Date().toLocaleDateString('pt-BR'), minutes: 0 };
if (studyData.date !== new Date().toLocaleDateString('pt-BR')) {
  studyData = { date: new Date().toLocaleDateString('pt-BR'), minutes: 0 };
  localStorage.setItem('lifeos_study', JSON.stringify(studyData));
}

let pomodoroDuration = parseInt(document.getElementById('pomodoro-input').value) * 60;
let timerTimeLeft = pomodoroDuration;
let timerInterval = null;

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
}

function updateStudyStats() {
  const h = Math.floor(studyData.minutes / 60);
  const m = studyData.minutes % 60;
  document.getElementById('study-time-today').innerText = `${h}h ${m}m`;
}

function startTimer() {
  if (timerInterval) return;
  document.getElementById('btn-start-timer').style.display = 'none';
  document.getElementById('btn-pause-timer').style.display = 'inline-block';
  document.getElementById('pomodoro-input').disabled = true;
  timerInterval = setInterval(() => {
    if (timerTimeLeft > 0) { timerTimeLeft--; updateTimerDisplay(); } 
    else { clearInterval(timerInterval); timerInterval = null; completePomodoro(); }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval); timerInterval = null;
  document.getElementById('btn-start-timer').style.display = 'inline-block';
  document.getElementById('btn-pause-timer').style.display = 'none';
}

function resetTimer() {
  pauseTimer();
  let inputVal = parseInt(document.getElementById('pomodoro-input').value);
  if(isNaN(inputVal) || inputVal <= 0) inputVal = 50;
  pomodoroDuration = inputVal * 60; timerTimeLeft = pomodoroDuration;
  document.getElementById('pomodoro-input').disabled = false; updateTimerDisplay();
}

function completePomodoro() {
  const mins = parseInt(document.getElementById('pomodoro-input').value);
  studyData.minutes += mins; salvar('study', studyData);
  updateStudyStats(); resetTimer(); alert("Sessão concluída! Tempo registrado.");
}

// --- RELÓGIO PRINCIPAL ---
function updateMainClock() {
  const now = new Date();
  document.getElementById('big-clock').innerText = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  let dateStr = now.toLocaleDateString('pt-BR', options);
  dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  document.getElementById('big-date').innerText = dateStr.replace('-feira', '').replace(',', ' |');
}
setInterval(updateMainClock, 1000); updateMainClock();

// --- HÁBITOS, JOURNALS & OVERVIEW (Keep Style) ---
let currentHabitFilter = 'do';

function changeHabitTab(filter, element) {
  document.querySelectorAll('#habit-tabs span').forEach(el => el.classList.remove('active'));
  element.classList.add('active'); currentHabitFilter = filter; renderFocusTab();
}

function renderFocusTab() {
  const mainHabits = document.getElementById('main-habits-list'); mainHabits.innerHTML = '';
  let completedHabits = 0; habits.forEach(h => { if (h.done) completedHabits++; });

  let filteredHabits = habits.map((h, i) => ({...h, originalIndex: i}));
  
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
      mainHabits.innerHTML += `<li style="color: ${h.done ? '#64748b' : '#e2e8f0'};">
        <input type="checkbox" ${h.done ? 'checked' : ''} onclick="toggleHabit(${h.originalIndex})" style="accent-color: #22c55e;">
        <span style="opacity: ${h.done ? 0.5 : 1}; cursor: pointer;" onclick="toggleHabit(${h.originalIndex})">${h.icon}</span> 
        <span style="${h.done ? 'text-decoration: line-through; opacity: 0.5' : ''}; cursor: pointer; flex:1;" onclick="toggleHabit(${h.originalIndex})">${h.text}</span>
      </li>`;
    });
  }

  const progress = habits.length === 0 ? 0 : Math.round((completedHabits / habits.length) * 100);
  document.getElementById('progress-fill').style.width = `${progress}%`;
  document.getElementById('progress-text').innerText = `${progress}% Concluído`;
}

function toggleHabit(index) { habits[index].done = !habits[index].done; salvar('habits', habits); renderFocusTab(); }
function addNewHabit() {
  const newHabit = prompt("Digite o nome do novo hábito:");
  if (newHabit) {
    const iconMatch = newHabit.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
    const icon = iconMatch ? iconMatch[0] : '📌';
    const text = iconMatch ? newHabit.replace(icon, '').trim() : newHabit.trim();
    habits.push({ text, icon, done: false }); salvar('habits', habits); renderFocusTab();
  }
}

function changeJournalTab(period, element) {
  document.querySelectorAll('#journal-tabs span').forEach(el => el.classList.remove('active'));
  element.classList.add('active'); const content = document.getElementById('journal-content');
  if (period === 'day') {
    content.innerHTML = `<div class="journal-card"><div class="j-img" style="background: url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=300') center/cover;"></div><div class="j-info"><strong>🗓 Hoje</strong><div class="j-bar"><div style="width: 50%; background:#ef4444;"></div></div></div></div><div class="journal-card"><div class="j-img" style="background: url('https://images.unsplash.com/photo-1506744626753-dba7d41cf369?w=300') center/cover;"></div><div class="j-info"><strong>🗓 Ontem</strong><div class="j-bar"><div style="width: 80%; background:#38bdf8;"></div></div></div></div><div class="journal-card"><div class="j-img" style="background: url('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=300') center/cover;"></div><div class="j-info"><strong>🗓 Anteontem</strong><div class="j-bar"><div style="width: 100%; background:#22c55e;"></div></div></div></div>`;
  } else if (period === 'week') {
    content.innerHTML = `<div class="journal-card" style="min-width: 250px;"><div class="j-img" style="background: url('https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=300') center/cover;"></div><div class="j-info"><strong>📅 Esta Semana</strong><div class="j-bar"><div style="width: 65%; background:#22c55e;"></div></div></div></div>`;
  } else { content.innerHTML = `<div style="padding: 20px; color: #64748b; font-size: 0.9rem;">Visão estrutural de ${period} em desenvolvimento...</div>`; }
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
    dayShifts.sort((a,b) => (a.time || "00:00").localeCompare(b.time || "00:00")).forEach(s => {
      modalList.innerHTML += `<li class="shift-item"><span style="display:flex; flex-direction:column;"><strong>${s.time || ''}</strong> <span style="font-size:0.85rem;">${s.desc}</span></span><strong>${formatCurrency(s.amount)}</strong></li>`;
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
    li.innerHTML = `<div class="transaction-info"><span>${t.desc}</span><small class="category-badge">${t.category || 'Sem categoria'}</small></div>
      <div><strong>${formatCurrency(t.amount)}</strong><button class="delete-btn" onclick="removeFinance(${i})">✕</button></div>`;
    tList.appendChild(li);
  });
}
document.getElementById('finance-form').addEventListener('submit', (e) => {
  e.preventDefault(); const desc = document.getElementById('desc').value.trim(); const amount = parseFloat(document.getElementById('amount').value);
  if (!desc || isNaN(amount)) return;
  transactions.push({ id: Date.now(), desc, amount, type: document.getElementById('type').value, category: document.getElementById('category').value });
  salvar('finances', transactions); updateFinanceValues(); renderFinances(); document.getElementById('finance-form').reset();
});
function removeFinance(index) { transactions.splice(index, 1); salvar('finances', transactions); updateFinanceValues(); renderFinances(); }

// --- PLANTÕES ---
function renderShifts() {
  const sList = document.getElementById('shift-list'); sList.innerHTML = '';
  shifts.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((s, i) => {
    const [y, m, d] = s.date.split('-'); const li = document.createElement('li'); li.classList.add('shift-item');
    li.innerHTML = `<div class="transaction-info"><span>${s.desc}</span><small class="category-badge" style="color:#f59e0b; background: rgba(245,158,11,0.1)">${d}/${m}/${y} às ${s.time || ''}</small></div>
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
  transactions.push({ id: uid, desc: `Plantão: ${desc} (${d}/${m} às ${time})`, amount: amount, type: 'income', category: 'Plantão SAMU' });
  salvar('finances', transactions); 
  renderShifts(); updateFinanceValues(); renderFinances(); document.getElementById('shift-form').reset();
});
function removeShift(index) {
  const sId = shifts[index].id; shifts.splice(index, 1); salvar('shifts', shifts);
  transactions = transactions.filter(t => t.id !== sId); salvar('finances', transactions); renderShifts(); updateFinanceValues(); renderFinances();
}

// --- TAREFAS (KEEP STYLE) ---
document.getElementById('task-form').addEventListener('submit', (e) => { 
  e.preventDefault(); const desc = document.getElementById('task-desc').value.trim(); 
  if (!desc) return; tasks.push({ text: desc, done: false }); salvar('tasks', tasks); renderTasks(); document.getElementById('task-form').reset(); 
});
function renderTasks() { 
  const list = document.getElementById('task-list'); list.innerHTML = ''; 
  const sortedTasks = [...tasks].map((t, i) => ({...t, originalIndex: i})).sort((a, b) => a.done === b.done ? 0 : a.done ? 1 : -1);
  
  sortedTasks.forEach(t => { 
    const li = document.createElement('li'); 
    li.style.borderLeftColor = '#38bdf8'; 
    if (t.done) li.style.opacity = '0.5';
    
    li.innerHTML = `<div style="display:flex; align-items:center; gap:10px; width:100%;">
      <input type="checkbox" ${t.done ? 'checked' : ''} onclick="toggleTask(${t.originalIndex})" style="accent-color: #38bdf8;">
      <span style="${t.done ? 'text-decoration: line-through;' : ''}; cursor: pointer; flex:1;" onclick="toggleTask(${t.originalIndex})">${t.text}</span>
    </div>
    <button class="delete-btn" onclick="removeTask(${t.originalIndex})">✕</button>`; 
    list.appendChild(li); 
  }); 
}
function toggleTask(i) { tasks[i].done = !tasks[i].done; salvar('tasks', tasks); renderTasks(); }
function removeTask(i) { tasks.splice(i, 1); salvar('tasks', tasks); renderTasks(); }

// --- NOTAS ---
document.getElementById('note-form').addEventListener('submit', (e) => { e.preventDefault(); const t = document.getElementById('note-title').value.trim(); const c = document.getElementById('note-content').value.trim(); if (!t || !c) return; notes.push({ title: t, content: c }); salvar('notes', notes); renderNotes(); document.getElementById('note-form').reset(); });
function renderNotes() { const list = document.getElementById('note-list'); list.innerHTML = ''; notes.forEach((n, i) => { const div = document.createElement('div'); div.classList.add('note-card'); div.innerHTML = `<div class="note-header"><h4>${n.title}</h4><button class="delete-btn" onclick="removeNote(${i})">✕</button></div><div class="note-body">${n.content}</div>`; list.appendChild(div); }); }
function removeNote(i) { notes.splice(i, 1); salvar('notes', notes); renderNotes(); }

// Config/Backup
function exportData() { const data = { habits, shifts, finances: transactions, tasks, notes, study: studyData }; const dataStr = JSON.stringify(data, null, 2); const blob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; const d = new Date(); const dateString = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`; a.download = `genesis_backup_${dateString}.json`; a.click(); URL.revokeObjectURL(url); const statusEl = document.getElementById('backup-status'); statusEl.innerText = "Backup exportado!"; setTimeout(() => statusEl.innerText = "", 3000); }
function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const data = JSON.parse(e.target.result); if (data.habits) salvar('habits', data.habits); if (data.shifts) salvar('shifts', data.shifts); if (data.finances) salvar('finances', data.finances); if (data.tasks) salvar('tasks', data.tasks); if (data.notes) salvar('notes', data.notes); if (data.study) salvar('study', data.study); location.reload(); } catch (error) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); }

// ============================================================================
// SINCRONIZAÇÃO (Google Sheets via Apps Script — ver sync/Code.gs)
// Como funciona: cada módulo (habits, shifts, ...) tem um carimbo de hora
// "updatedAt" da última vez que foi salvo neste aparelho. Ao sincronizar, o
// app manda tudo com os carimbos; o Code.gs guarda só o que for mais novo do
// que a planilha tem e devolve o estado final; o app adota daqui o que a
// planilha tiver de mais novo. Em empate, a planilha vence.
// URL e token ficam SÓ no localStorage deste aparelho (aba Config).
// ============================================================================
const SYNC_MODULOS = ['habits', 'shifts', 'finances', 'tasks', 'notes', 'study'];

let syncMeta = JSON.parse(localStorage.getItem('lifeos_sync_meta')) || null;
if (!syncMeta) {
  // Primeira vez com sync neste aparelho: o que já existe ganha carimbo 1
  // ("existe, mas é antigo") e o que não existe ganha 0.
  syncMeta = {};
  SYNC_MODULOS.forEach(m => syncMeta[m] = localStorage.getItem('lifeos_' + m) ? 1 : 0);
  localStorage.setItem('lifeos_sync_meta', JSON.stringify(syncMeta));
}
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
  if (!syncConfigurado()) { setSyncStatus('naoconfig'); return; }
  if (syncEmAndamento) return;
  if (!navigator.onLine) { setSyncStatus('offline'); return; }

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
  }
}

/** Adota o que veio da planilha se for mais novo (ou igual e diferente — empate: planilha vence). */
function aplicarRemoto(remoto) {
  let mudou = false;
  const hoje = new Date().toLocaleDateString('pt-BR');
  SYNC_MODULOS.forEach(m => {
    const r = remoto[m];
    if (!r || r.valor === null || r.valor === undefined) return;
    if (m === 'study' && r.valor.date !== hoje) return; // estudo de outro dia não interessa
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
  shifts = JSON.parse(localStorage.getItem('lifeos_shifts')) || [];
  transactions = JSON.parse(localStorage.getItem('lifeos_finances')) || [];
  tasks = (JSON.parse(localStorage.getItem('lifeos_tasks')) || []).map(t => typeof t === 'string' ? { text: t, done: false } : t);
  notes = JSON.parse(localStorage.getItem('lifeos_notes')) || [];
  const st = JSON.parse(localStorage.getItem('lifeos_study'));
  if (st && st.date === studyData.date) studyData = st;
  renderFocusTab(); renderShifts(); updateFinanceValues(); renderFinances(); renderTasks(); renderNotes(); updateStudyStats();
}

function setSyncStatus(estado, detalhe) {
  const el = document.getElementById('sync-status');
  const dot = document.getElementById('sync-dot');
  const ultima = localStorage.getItem('lifeos_sync_ultima');
  const hora = ultima ? new Date(Number(ultima)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  const mapa = {
    naoconfig: ['⚪', 'Sincronização não configurada — preencha URL e token abaixo.', '#64748b'],
    andamento: ['🔄', 'Sincronizando...', '#38bdf8'],
    ok:        ['🟢', 'Sincronizado' + (hora ? ' às ' + hora : ''), '#22c55e'],
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

// Gatilhos automáticos: voltou a internet / voltou pro app (celular) → sincroniza
window.addEventListener('online', () => sincronizar());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); });

// INICIALIZAÇÃO
changeJournalTab('day', document.querySelector('#journal-tabs span.active'));
updatePomodoroTime(); updateStudyStats(); renderFocusTab(); renderCalendar(); updateFinanceValues(); renderFinances(); renderShifts(); renderTasks(); renderNotes();
carregarSyncConfigNaTela(); setSyncStatus(syncConfigurado() ? (syncPendente ? "pendente" : "ok") : "naoconfig"); sincronizar();
