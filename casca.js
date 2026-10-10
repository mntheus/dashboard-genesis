// ════════════════════════════════════════════════════════════════════════════
// CASCA — a apresentação nova do Genesis (Etapa 1, 03/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Este arquivo NÃO substitui nenhuma função do app.js. Ele VESTE o que já existe:
//   • os mesmos botões de aba viram um trilho de ícones (PC) ou uma grade (celular)
//   • cada aba ganha um cabeçalho: rótulo miúdo, título grande e uma linha de estado
//   • os formulários saem da frente e abrem numa folha pelo botão "＋"
//   • a barra "Como vamos atuar hoje?" fica sempre embaixo (hoje: busca global;
//     nas Etapas 4/5: IA e voz)
//
// Liga/desliga em Config → Aparência → Apresentação (prefs.aparencia.casca).
// Na "clássica", tudo volta exatamente como era — é a saída de emergência.
// Para tirar a casca de vez: apagar este arquivo e a linha <script src="casca.js">.
// ════════════════════════════════════════════════════════════════════════════

// --- ícones de linha (24×24, traço) — herdam a cor do tema, iguais em qualquer aparelho ---
const ICONES = {
  focus:    'M12 3.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zM12 8.2a3.8 3.8 0 100 7.6 3.8 3.8 0 000-7.6z',
  home:     'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 3.5v4M15.5 3.5v4M8 14h2M12 14h2M8 17h2',
  finances: 'M3.5 7.5h15a2 2 0 012 2v8a2 2 0 01-2 2h-13a2 2 0 01-2-2zM3.5 7.5V6.3a1.8 1.8 0 011.8-1.8H16M16.5 13.5h1.5',
  tasks:    'M8.5 12.2l2.3 2.3 4.7-4.8M12 20.5a8.5 8.5 0 110-17 8.5 8.5 0 010 17z',
  notes:    'M6.5 3.5h8l4 4v13h-12zM14 3.5v4.5h4.5M9.5 12.5h6M9.5 16h4',
  studies:  'M4.5 5.5a2 2 0 012-2h12v14h-12a2 2 0 00-2 2zM4.5 19.5v-14M8.5 7.5h6',
  business: 'M3.5 17l5.5-5.5 4 4 7.5-7.5M15 8h5.5v5.5',
  inventory: 'M8.5 7.5V6a3.5 3.5 0 017 0v1.5M5.5 7.5h13a1 1 0 011 1v10a2 2 0 01-2 2h-11a2 2 0 01-2-2v-10a1 1 0 011-1zM4.5 12.5h15M10 12.5v2h4v-2',
  health:   'M3 12h4l2.5-6 4 12 2.5-6h5',
  leisure:  'M3.5 8.5a2 2 0 002-2h13a2 2 0 002 2v1.5a2 2 0 000 4v1.5a2 2 0 00-2 2h-13a2 2 0 00-2-2V14a2 2 0 000-4zM13.5 6.5v11',
  trips:    'M12 20.5a8.5 8.5 0 110-17 8.5 8.5 0 010 17zM3.5 12h17M12 3.5c2.6 2.6 2.6 14.4 0 17M12 3.5c-2.6 2.6-2.6 14.4 0 17',
  net:      'M15.5 19v-1a3.5 3.5 0 00-3.5-3.5H7A3.5 3.5 0 003.5 18v1M9.5 11a3 3 0 100-6 3 3 0 000 6zM20.5 19v-1a3.5 3.5 0 00-2.6-3.4M15.5 5.2a3 3 0 010 5.6',
  clinic:   'M12 7.5v9M7.5 12h9M6 3.5h12a2.5 2.5 0 012.5 2.5v12a2.5 2.5 0 01-2.5 2.5H6A2.5 2.5 0 013.5 18V6A2.5 2.5 0 016 3.5z',
  prod:     'M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7zM12 12l7.5-4.3M12 12v8.5M12 12L4.5 7.7',
  settings: 'M4.5 7h9M17.5 7h2M4.5 12h3M11.5 12h8M4.5 17h11M19.5 17h0M15.5 5v4M9.5 10v4M17.5 15v4',
  mais:     'M12 5v14M5 12h14',
  busca:    'M10.5 17.5a7 7 0 110-14 7 7 0 010 14zM20.5 20.5l-5-5',
  grade:    'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
  fechar:   'M6.5 6.5l11 11M17.5 6.5l-11 11',
  seta:     'M9.5 6l6 6-6 6'
};
function ic(nome, cls) { return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nome] || ''}"/></svg>`; }

// nome curto de cada área (o nome longo continua nas listas da Config)
const NOMES_CASCA = {
  focus: 'Painel', home: 'Agenda', finances: 'Finanças', tasks: 'Tarefas', notes: 'Notas',
  studies: 'Estudos', business: 'Negócios', inventory: 'Inventário', health: 'Saúde', leisure: 'Lazer', trips: 'Viagens',
  net: 'Rede', clinic: 'Clínica', prod: 'Produção', settings: 'Config'
};
function nomeAba(id) {
  if (id === 'clinic' || id === 'prod') {
    const b = document.getElementById('btn-' + id);
    const txt = b && b.dataset.classico ? b.dataset.classico.replace(/<[^>]+>/g, '').replace(/^[^\p{L}]+/u, '').trim() : '';
    if (txt) return txt;
  }
  return NOMES_CASCA[id] || id;
}

const cascaNova = () => (typeof cfgAparencia === 'function' ? cfgAparencia().casca : 'nova') !== 'classica';

// ───────────────────────────── NAVEGAÇÃO ───────────────────────────────────
/** Veste (ou desveste) os botões de aba. Os botões continuam os mesmos — ordem,
 *  abas ocultas e aba ativa seguem funcionando pelo app.js. */
function vestirNavegacao() {
  const nova = cascaNova();
  document.querySelectorAll('.tab-btn').forEach(b => {
    const id = b.id.replace('btn-', '');
    const dot = b.querySelector('#sync-dot');   // a bolinha da sincronização é o MESMO nó
    if (b.dataset.classico === undefined) b.dataset.classico = b.innerHTML;
    if (nova) {
      if (b.dataset.vestido === '1') return;
      b.innerHTML = ic(id) + `<span class="tab-rot">${nomeAba(id)}</span>`;
      b.title = nomeAba(id);
      b.dataset.vestido = '1';
    } else {
      if (b.dataset.vestido !== '1') return;
      b.innerHTML = b.dataset.classico;
      b.removeAttribute('title');
      b.dataset.vestido = '0';
    }
    if (dot) { const velho = b.querySelector('#sync-dot'); if (velho && velho !== dot) velho.replaceWith(dot); else if (!velho) b.appendChild(dot); }
  });
}

/** A grade de áreas (celular): todas as abas visíveis, na ordem escolhida na Config. */
function abrirGrade() {
  const g = document.getElementById('cs-grade'); if (!g) return;
  const ativa = (document.querySelector('.tab-btn.active') || {}).id;
  const itens = [...document.querySelectorAll('.tab-btn')].filter(b => !b.hidden).map(b => {
    const id = b.id.replace('btn-', '');
    return `<button class="cs-tile ${b.id === ativa ? 'on' : ''}" onclick="fecharGrade(); changeTab('${id}')">${ic(id)}<span>${esc(nomeAba(id))}</span></button>`;
  }).join('');
  g.querySelector('.cs-grade-itens').innerHTML = itens;
  g.hidden = false;
  requestAnimationFrame(() => g.classList.add('aberta'));
}
function fecharGrade() {
  const g = document.getElementById('cs-grade'); if (!g) return;
  g.classList.remove('aberta'); setTimeout(() => { g.hidden = true; }, 200);
}

// ─────────────────────────── CABEÇALHO DE CADA ABA ─────────────────────────
function saudacaoCurta() {
  const h = new Date().getHours();
  const s = h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const nome = (typeof profile !== 'undefined' && profile.name) ? profile.name.split(' ')[0] : '';
  return nome ? `${s}, ${esc(nome)}.` : `${s}.`;
}

/** A linha de estado de cada aba — o "como está" em uma frase. Nunca quebra a tela:
 *  se algum dado não existir, a linha só fica vazia. */
function estadoDaAba(id) {
  try {
    const hoje = hojeISO(), ym = hoje.slice(0, 7);
    const brl = v => formatCurrency(v || 0);
    switch (id) {
      case 'focus': {
        const av = typeof calcularAvisos === 'function' ? calcularAvisos() : [];
        const urg = av.filter(a => a.prio === 1).length;
        return av.length ? `${plural(av.length, 'coisa pede', 'coisas pedem')} atenção${urg ? ` · ${urg} urgente${urg > 1 ? 's' : ''}` : ''}. Por onde começamos?` : 'Todos os sistemas em ordem. Por onde começamos?';
      }
      case 'home': {
        const n = typeof itensDoDia === 'function' ? itensDoDia(hoje).length : events.filter(e => e.date === hoje).length;
        return n ? `Hoje: ${plural(n, 'item', 'itens')} na agenda.` : 'Hoje está livre na agenda.';
      }
      case 'finances': {
        const doMes = transactions.filter(t => (typeof dataTransacao === 'function' ? dataTransacao(t) : (t.date || '')).startsWith(ym));
        const ent = doMes.filter(t => t.type === 'income' && !t.pending).reduce((a, t) => a + t.amount, 0);
        const sai = doMes.filter(t => t.type === 'expense' && !t.pending).reduce((a, t) => a + t.amount, 0);
        const aPagar = transactions.filter(t => t.type === 'expense' && t.pending).length;
        return `Saldo do mês ${brl(ent - sai)}${aPagar ? ` · ${aPagar} a pagar` : ''}.`;
      }
      case 'tasks': {
        const abertas = tasks.filter(t => !t.done);
        const atras = abertas.filter(t => t.due && t.due < hoje).length;
        const hojeN = abertas.filter(t => t.due === hoje).length;
        if (!abertas.length) return 'Tudo em dia.';
        return `${plural(abertas.length, 'tarefa aberta', 'tarefas abertas')}${hojeN ? ` · ${hojeN} para hoje` : ''}${atras ? ` · ${atras} atrasada${atras > 1 ? 's' : ''}` : ''}.`;
      }
      case 'notes': {
        const at = notes.filter(n => !n.archived);
        const fix = at.filter(n => n.pinned).length;
        return at.length ? `${plural(at.length, 'nota', 'notas')}${fix ? ` · ${fix} fixada${fix > 1 ? 's' : ''}` : ''}.` : 'Nenhuma nota ainda.';
      }
      case 'studies': {
        const and = (materials || []).filter(m => m.status === 'andamento' || m.status === 'lendo').length;
        return `${plural((topics || []).length, 'tema', 'temas')}${and ? ` · ${and} em andamento` : ''}.`;
      }
      case 'business': {
        const pat = (assets || []).reduce((a, x) => a + (Number(x.current) || 0), 0);
        return pat ? `Patrimônio ${brl(pat)}.` : 'Carteira ainda vazia.';
      }
      case 'inventory': {
        const bens = typeof valorBens === 'function' ? valorBens() : 0;
        const n = (typeof inventario !== 'undefined' ? inventario : []).reduce((a, x) => a + (Number(x.qtd) || 1), 0);
        return n ? `${plural(n, 'item', 'itens')} · ${brl(bens)} em bens.` : 'A mochila ainda está vazia.';
      }
      case 'health': {
        const h = typeof hydration !== 'undefined' ? hydration : null;
        return h && h.goal ? `Água hoje ${(h.ml / 1000).toFixed(1).replace('.', ',')} de ${(h.goal / 1000).toFixed(1).replace('.', ',')} L.` : 'Corpo, treino e comida.';
      }
      case 'leisure': {
        const quero = (media || []).filter(m => m.status === 'quero').length;
        const sai = typeof saidas !== 'undefined' ? saidas.filter(s => s.status === 'marcado').length : 0;
        return `${plural(quero, 'na lista', 'na lista')}${sai ? ` · ${plural(sai, 'saída marcada', 'saídas marcadas')}` : ''}.`;
      }
      case 'trips': {
        const prox = (trips || []).filter(v => v.inicio && v.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
        return prox ? `Próxima: ${esc(prox.destino || 'viagem')} em ${isoParaBRCurto(prox.inicio)}.` : 'Nenhuma viagem marcada.';
      }
      case 'net': {
        const falar = typeof precisaFalar === 'function' ? (contacts || []).filter(precisaFalar).length : 0;
        return `${plural((contacts || []).length, 'contato', 'contatos')}${falar ? ` · ${falar} para retomar` : ''}.`;
      }
      case 'settings': return 'Aparência, sincronização, cópias e perfil.';
      default: return '';
    }
  } catch (e) { return ''; }
}
function isoParaBRCurto(iso) { const [, m, d] = String(iso).split('-'); return d ? `${d}/${m}` : iso; }

function montarCabecalhos() {
  document.querySelectorAll('.tab-content:not(#nucleo)').forEach(sec => {
    let h = sec.querySelector(':scope > .cs-hero');
    if (!h) {
      h = document.createElement('header');
      h.className = 'cs-hero';
      h.innerHTML = `<div class="cs-rotulo"></div><h1 class="cs-titulo"></h1><p class="cs-estado"></p><div class="cs-acoes"></div>`;
      sec.prepend(h);
    }
    const id = sec.id;
    h.querySelector('.cs-rotulo').innerHTML = id === 'focus'
      ? `<span class="cs-trinca">A♠ <b>A♥</b> <b>A♦</b></span> · GENESIS`
      : `GENESIS <span class="cs-sep">›</span> ${esc(nomeAba(id)).toUpperCase()}`;
    h.querySelector('.cs-titulo').innerHTML = id === 'focus' ? saudacaoCurta() : esc(nomeAba(id));
    h.querySelector('.cs-estado').textContent = estadoDaAba(id);
  });
  // o botão "Iniciar o Dia" sobe para o cabeçalho do Painel (é o mesmo botão, mesmo id)
  const bDia = document.getElementById('btn-iniciar-dia');
  const acoesFocus = document.querySelector('#focus > .cs-hero .cs-acoes');
  if (bDia && acoesFocus && cascaNova() && bDia.parentElement !== acoesFocus) {
    if (!bDia._casaOriginal) bDia._casaOriginal = bDia.parentElement;
    acoesFocus.prepend(bDia);
  }
  // a miniatura do modo exemplo (exemplo.js) em cada cabecalho
  if (typeof exemploMontarBotoes === 'function') exemploMontarBotoes();
}
function atualizarCabecalhoAtivo() {
  const sec = document.querySelector('.tab-content.active'); if (!sec) return;
  const h = sec.querySelector(':scope > .cs-hero'); if (!h) return;
  if (sec.id === 'focus') h.querySelector('.cs-titulo').innerHTML = saudacaoCurta();
  h.querySelector('.cs-estado').textContent = estadoDaAba(sec.id);
}

// ──────────────────────── FORMULÁRIOS EM FOLHA ─────────────────────────────
// Um cartão vira folha só se ele for SÓ formulário (título, dicas e o form).
// Cartão que mistura formulário com lista/resultado fica como está — esconder
// esse cartão esconderia conteúdo seu.
function cartaoEhSoFormulario(card) {
  const form = card.querySelector(':scope > form'); if (!form) return false;
  if (!form.querySelector('button[type="submit"], button:not([type])')) return false;
  return [...card.children].every(el => el === form || /^H[2-4]$/.test(el.tagName) || el.tagName === 'P' || el.classList.contains('hint') || el.classList.contains('cs-folha-x') || el.tagName === 'SMALL');
}
/** Limpa o texto de um título para virar rótulo de botão: sem emoji, sem "▾", sem o " · mês". */
function rotuloLimpo(txt) { return String(txt || '').replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s*[▾▸▴].*$/u, '').split(' · ')[0].trim() || 'Novo'; }
function camposVisiveis(form) { return form.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea').length; }

/** Liga um cartão-folha ao seu botão "＋" no cabeçalho da aba. */
function registrarFolha(card, acoes, rot, ehCadastro) {
  if (!card.id) card.id = 'folha-' + Math.random().toString(36).slice(2, 8);
  card.dataset.folha = '1'; card.dataset.rotulo = rot;
  card.classList.add('cs-folha');
  const x = document.createElement('button');
  x.type = 'button'; x.className = 'cs-folha-x'; x.title = 'Fechar'; x.innerHTML = ic('fechar');
  x.onclick = () => fecharFolha(card);
  card.prepend(x);
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'cs-acao'; b.dataset.alvo = card.id;
  // "＋" para cadastro (tem id de edição); "›" para formulário de ajuste (ex.: o ritual de estudo)
  b.innerHTML = ic(ehCadastro ? 'mais' : 'seta') + `<span>${esc(rot)}</span>`;
  b.onclick = () => abrirFolha(card);
  acoes.appendChild(b);
  const form = card.querySelector('form');
  // ao salvar, a folha fecha sozinha (o app.js já tratou o envio antes, porque registrou primeiro)
  if (form) form.addEventListener('submit', () => setTimeout(() => { if (card.classList.contains('aberta')) fecharFolha(card, true); }, 0));
  // seções escondidas (sub-aba da Agenda, Saúde...) também escondem o botão dela
  b._secao = card.closest('.agenda-sec') || (card._lugar && card._lugar.parentNode && card._lugar.parentNode.closest && card._lugar.parentNode.closest('.agenda-sec'));
}

function prepararFolhas() {
  document.querySelectorAll('.tab-content:not(#settings):not(#nucleo)').forEach(sec => {
    const acoes = sec.querySelector(':scope > .cs-hero .cs-acoes'); if (!acoes) return;
    // CASO 1 — o cartão inteiro é só formulário: o cartão vira a folha.
    sec.querySelectorAll('.card').forEach(card => {
      if (card.dataset.folha === '1' || card.closest('.modal, .modal-overlay')) return;
      if (!cartaoEhSoFormulario(card)) return;
      const tit = card.querySelector('h2, h3');
      registrarFolha(card, acoes, rotuloLimpo(tit && tit.textContent), true);
    });
    // CASO 2 — o formulário divide o cartão com uma lista: SÓ o formulário sai para a folha.
    // A lista fica onde está. (Eram 26 dos 37 formulários — Tarefas, Metas, Carteira...)
    sec.querySelectorAll('form').forEach(form => {
      if (form.closest('.cs-folha, .modal, .modal-overlay')) return;
      if (!form.querySelector('button[type="submit"], button:not([type])')) return;
      if (camposVisiveis(form) < 2) return;        // campo rápido de uma linha continua na tela
      const card = form.closest('.card'); if (!card) return;
      const casca = document.createElement('div');
      casca.className = 'card cs-folha-extraida';
      // título da folha: o título PRÓPRIO do formulário (ex.: "Nova Tarefa", que vira "Editar
      // tarefa" na edição) vai junto; se o título for o do cartão inteiro, ele fica e a folha ganha uma cópia.
      const prev = form.previousElementSibling;
      const tituloProprio = prev && /^H[2-4]$/.test(prev.tagName) && prev !== card.firstElementChild ? prev : null;
      form.parentNode.insertBefore(casca, tituloProprio || form);
      if (tituloProprio) casca.appendChild(tituloProprio);
      else {
        const h = document.createElement('h3'); h.className = 'cs-folha-tit';
        const tc = card.querySelector('h2, h3');
        h.textContent = rotuloLimpo(tc && tc.textContent);
        casca.appendChild(h);
      }
      casca.appendChild(form);
      const rot = rotuloLimpo((tituloProprio || casca.querySelector('.cs-folha-tit')).textContent);
      registrarFolha(casca, acoes, rot, !!form.querySelector('input[type="hidden"][id$="-id"]'));
    });
  });
  sincronizarBotoesDeSecao();
}/** Botão "＋" só aparece se a seção do formulário estiver à vista (sub-abas). */
function sincronizarBotoesDeSecao() {
  document.querySelectorAll('.cs-acao').forEach(b => {
    if (!b._secao) return;
    const vis = getComputedStyle(b._secao).display !== 'none';
    b.hidden = !vis;
  });
}
let folhaAberta = null;
function abrirFolha(card) {
  if (!cascaNova()) return;
  if (folhaAberta && folhaAberta !== card) fecharFolha(folhaAberta);
  folhaAberta = card;
  // A folha sai da aba enquanto está aberta e vai direto para o <body>. Motivo: a aba
  // anima a opacidade ao trocar (0,3s) e, durante a animação, vira uma camada própria —
  // o véu passava POR CIMA da folha justo no caminho "editar a partir de outra aba".
  // Fora da aba, nenhum ancestral consegue prender a folha. Ao fechar, ela volta.
  if (!card._lugar) { card._lugar = document.createComment('folha'); card.parentNode.insertBefore(card._lugar, card); }
  card._aba = (card._lugar.parentNode && card._lugar.parentNode.closest) ? (card._lugar.parentNode.closest('.tab-content') || {}).id : '';
  document.body.appendChild(card);
  document.getElementById('cs-veu').hidden = false;
  card.classList.add('aberta');
  document.body.classList.add('cs-com-folha');
  const primeiro = card.querySelector('input:not([type="hidden"]):not([type="checkbox"]), textarea, select');
  if (primeiro && window.matchMedia('(min-width: 701px)').matches) setTimeout(() => _focoOriginal.call(primeiro), 60);
}
function fecharFolha(card, salvou) {
  card = card || folhaAberta; if (!card) return;
  // se fechou no meio de uma EDIÇÃO sem salvar, sai do modo edição (o botão Cancelar do próprio form)
  if (!salvou) {
    const idOculto = card.querySelector('form input[type="hidden"][id$="-id"]');
    if (idOculto && idOculto.value) {
      const cancelar = [...card.querySelectorAll('form button')].find(b => /cancelar/i.test(b.getAttribute('onclick') || '') || /cancelar/i.test(b.textContent));
      if (cancelar) cancelar.click();
      // sem Cancelar no form: lembra que ESTA edicao foi recusada, para a rede de seguranca nao reabrir
      if (idOculto.value) card._recusada = idOculto.value;
    }
  }
  card.classList.remove('aberta');
  if (card._lugar && card._lugar.parentNode) { card._lugar.parentNode.insertBefore(card, card._lugar); }
  if (folhaAberta === card) folhaAberta = null;
  document.getElementById('cs-veu').hidden = true;
  document.body.classList.remove('cs-com-folha');
}
// As 19 funções "editar…" do app.js levam ao formulário com scrollIntoView + focus.
// Com o formulário guardado na folha, esses dois gestos abrem a folha antes — assim
// nenhuma delas precisou mudar.
const _focoOriginal = HTMLElement.prototype.focus;
const _rolarOriginal = Element.prototype.scrollIntoView;
function folhaFechadaDe(el) { const f = el && el.closest && el.closest('.cs-folha'); return f && !f.classList.contains('aberta') ? f : null; }
HTMLElement.prototype.focus = function (...a) { const f = cascaNova() && folhaFechadaDe(this); if (f) { abrirFolha(f); return setTimeout(() => _focoOriginal.apply(this, a), 80); } return _focoOriginal.apply(this, a); };
Element.prototype.scrollIntoView = function (...a) { const f = cascaNova() && folhaFechadaDe(this); if (f) { abrirFolha(f); return; } return _rolarOriginal.apply(this, a); };
// rede de segurança: se algum caminho preencher o id de edição sem focar, abre também
setInterval(() => {
  if (!cascaNova() || folhaAberta) return;
  document.querySelectorAll('.cs-folha').forEach(card => {
    const idOculto = card.querySelector('form input[type="hidden"][id$="-id"]');
    if (idOculto && idOculto.value && card.closest('.tab-content.active') && card._recusada !== idOculto.value) abrirFolha(card);
  });
}, 700);

// ─────────────────── BARRA "COMO VAMOS ATUAR HOJE?" ────────────────────────
// Hoje: é a busca global (a mesma função buscarTudo). Nas Etapas 4/5 vira conversa e voz.
function barraDigitou(v) {
  const res = document.getElementById('busca-res');
  const caixa = document.querySelector('#cs-barra .cs-barra-res');
  if (res && caixa && res.parentElement !== caixa) caixa.appendChild(res);
  if (typeof renderBusca === 'function') renderBusca(v);
}
function barraTecla(e) {
  if (e.key === 'Escape') { e.target.value = ''; barraDigitou(''); e.target.blur(); }
}

// ─────────────────────── EMOJI SÓ ONDE É DADO (opção A) ────────────────────
// Títulos de quadro e chips de sub-aba que vêm do HTML (estrutura) perdem o emoji na
// cara nova — ficam limpos como no Jarvis. O emoji continua no texto (só fica oculto),
// então qualquer código que procure o título pelo texto segue achando.
// O que é desenhado a partir dos SEUS dados (ícone de hábito, de categoria, de lista)
// não é tocado: isto roda uma vez, sobre o HTML fixo, antes dos dados.
const RE_EMOJI_INICIO = /^\s*(?:(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u20E3|\p{Emoji_Modifier})*(?:\u200D(?:\p{Extended_Pictographic})\uFE0F?)*\s*)+/u;
function limparEmojiEstrutura() {
  document.querySelectorAll('.tab-content .card > h2, .tab-content .card > h3, .tab-content [onclick^="verSecao"]').forEach(el => {
    if (el.dataset.emo) return; el.dataset.emo = '1';
    const tn = el.firstChild; if (!tn || tn.nodeType !== 3) return;
    const m = tn.nodeValue.match(RE_EMOJI_INICIO); if (!m || !m[0].trim()) return;
    const s = document.createElement('span'); s.className = 'cs-emo'; s.textContent = m[0];
    tn.nodeValue = tn.nodeValue.slice(m[0].length);
    el.insertBefore(s, tn);
  });
}
// ──────────────────────────── LIGA / DESLIGA ───────────────────────────────
function montarEsqueleto() {
  if (document.getElementById('cs-barra')) return;
  const html = `
    <div id="cs-veu" class="cs-veu" hidden onclick="fecharFolha()"></div>
    <div id="cs-grade" class="cs-grade" hidden onclick="if (event.target === this) fecharGrade()">
      <div class="cs-grade-folha">
        <div class="cs-grade-topo"><span class="cs-rotulo">ÁREAS</span><button class="cs-folha-x" onclick="fecharGrade()" title="Fechar">${ic('fechar')}</button></div>
        <div class="cs-grade-itens"></div>
      </div>
    </div>
    <!-- VAGA DO AGENTE DE IA — a zona do rodapé já guarda o lugar dela.
         Nasce escondida; quando o módulo de agentes chegar, é só preencher este
         div e pôr a classe "com-ia" no body: o conteúdo, o Núcleo, as janelas e
         o esmaecimento se reacomodam sozinhos (ver a variavel zona-ia no style.css). -->
    <div id="cs-ia" class="cs-ia" hidden aria-label="Agente de IA"></div>
    <div id="cs-barra" class="cs-barra">
      <button class="cs-grade-btn" onclick="abrirGrade()" title="Todas as áreas">${ic('grade')}</button>
      <div class="cs-barra-campo">
        <div class="cs-barra-res"></div>
        <span class="cs-nucleo" aria-hidden="true"></span>
        <input id="cs-barra-input" type="search" placeholder="Como vamos atuar hoje?" autocomplete="off"
               oninput="barraDigitou(this.value)" onkeydown="barraTecla(event)" aria-label="Buscar em tudo">
        ${ic('busca', 'cs-barra-lupa')}
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // O trilho de abas aparece só quando o mouse chega à borda esquerda (como pediu: "não gritando").
  // Uma faixa fina e invisível na beira chama o trilho; sair do trilho o recolhe.
  const borda = document.createElement('div'); borda.className = 'cs-borda-trilho'; borda.setAttribute('aria-hidden', 'true');
  document.body.appendChild(borda);
  // Abrir/fechar o trilho EMPURRA o conteudo 88 px (nada sobrepoe nada), entao a
  // coluna do meio muda de lugar e as laterais mudam de tamanho. As janelas
  // precisam ser recolocadas junto, senao a que estava na margem fica por cima
  // do conteudo (medido: 5.512 px2 no desktop 1080p).
  const recolocar = () => { if (typeof recolocarPaineis === 'function') setTimeout(recolocarPaineis, 340); };
  const abre = () => { document.body.classList.add('trilho-aberto'); recolocar(); };
  const fecha = () => { document.body.classList.remove('trilho-aberto'); recolocar(); };
  borda.addEventListener('mouseenter', abre);
  const nav = document.querySelector('.tabs');
  if (nav) { nav.addEventListener('mouseleave', fecha); nav.addEventListener('focusin', abre); nav.addEventListener('focusout', e => { if (!nav.contains(e.relatedTarget)) fecha(); }); nav.addEventListener('click', () => setTimeout(fecha, 150)); }
}
function aplicarCasca() {
  const nova = cascaNova();
  document.body.dataset.casca = nova ? 'nova' : 'classica';
  document.body.dataset.trilho = cfgAparencia().trilho || 'auto';
  document.body.dataset.resumo = cfgAparencia().resumo || 'pilulas';
  vestirNavegacao();
  if (nova) {
    limparEmojiEstrutura();
    montarCabecalhos();
    prepararFolhas();
    juntarBarras();
  } else {
    if (folhaAberta) fecharFolha(folhaAberta);
    const bDia = document.getElementById('btn-iniciar-dia');
    if (bDia && bDia._casaOriginal && bDia.parentElement !== bDia._casaOriginal) bDia._casaOriginal.appendChild(bDia);
    const res = document.getElementById('busca-res'), box = document.getElementById('busca-card');
    if (res && box && res.parentElement !== box) box.appendChild(res);
  }
  renderCascaConfig();
}
function escolherTrilho(m) { cfgAparencia().trilho = m; salvarAparencia(); }
function escolherCasca(m) {
  cfgAparencia().casca = m;
  salvarAparencia();
  toast(m === 'nova' ? '✨ Cara nova ligada.' : '🗂️ Apresentação clássica — a de antes.');
}
function renderCascaConfig() {
  const c = cfgAparencia();
  document.querySelectorAll('#casca-modo span').forEach(s => s.classList.toggle('active', s.dataset.casca === (c.casca || 'nova')));
  document.querySelectorAll('#trilho-modo span').forEach(s => s.classList.toggle('active', s.dataset.trilho === (c.trilho || 'auto')));
  document.querySelectorAll('#resumo-modo span').forEach(s => s.classList.toggle('active', s.dataset.resumo === (c.resumo || 'pilulas')));
}

// ══ CARA ÚNICA (09/10, bloco ③ da 1ª rodada de ajustes ditados) ═════════════
// Ditado dele: "a barra de pesquisa e de início da tarefa ocupa muito espaço junto com aquelas
// bolinhas do lado… está bonito, mas não é coeso"; e nas Notas: "a barra Todas · Fixadas ·
// Arquivo · Mural fica quebrada… busca na mesma barra, e embaixo os marcadores, tudo misturado…
// o exemplo 'ideia do app #genesis' está estranho". Medido nas Notas em 1280×800: 580 px de topo
// antes da 1ª nota. Agora: cabeçalho numa faixa (as bolinhas viraram PÍLULAS — a mini-órbita fica
// como opção em Config → Aparência), abas + barra rápida numa linha só, a prévia DENTRO da barra
// (o exemplo vira o texto de fundo do campo) e os filtros numa linha com rolagem lateral + setinha,
// com os marcadores num seletor. Piloto: Notas (as outras abas entram depois do OK dele).
function escolherResumoAba(m) { cfgAparencia().resumo = m; salvarAparencia(); }
/** Ajustes de texto por aba (o resto é igual em todas as que têm barra rápida + abas de seção). */
const BARRAS_TEXTOS = {
  studies: { exemplo: 'Estudar…   ex.: O Mito da Startup livro #gestão  ·  45 min inglês  ·  ! já estou lendo' },
  notes: { exemplo: 'Anotar…   ex.: ideia do app #genesis  ·  lista compras: leite, pão  ·  ! fixa no topo', busca: ['note-search', 'Buscar nas notas'] }
};
function juntarBarras() {
  // toda aba que tem a barra rápida (.tar-topo) seguida das abas de seção (.tar-secoes):
  // Tarefas, Notas, Lazer, Viagens, Rede, Clínica e Produção
  document.querySelectorAll('.tab-content > .tar-topo').forEach(rapida => {
    const secoes = rapida.nextElementSibling, aba = rapida.parentElement.id;
    if (!secoes || !secoes.classList.contains('tar-secoes')) return;
    // abas e barra numa caixa só (a caixa, e não a barra, recebe as abas: quando uma seção
    // esconde a barra — as Entregas, por exemplo — as abas continuam à vista)
    const caixa = document.createElement('div'); caixa.className = 'cs-barra-aba';
    rapida.parentNode.insertBefore(caixa, rapida);
    caixa.appendChild(secoes); caixa.appendChild(rapida);
    const previa = rapida.querySelector('.tar-rapida-previa'), barra = rapida.querySelector('.tar-rapida');
    const campo = barra && barra.querySelector('input');
    // o exemplo que ficava numa linha embaixo vira o texto de fundo do campo
    const dica = previa && previa.querySelector('.tar-dica');
    const t = BARRAS_TEXTOS[aba] || {};
    if (campo && t.exemplo) campo.placeholder = t.exemplo;
    else if (campo && dica) campo.placeholder = `${(campo.placeholder || '').trim()}   ${dica.textContent.replace(/^\s*Ex\.?:\s*/i, 'ex.: ').split(' — ')[0].trim()}`;
    if (previa && barra) { barra.insertBefore(previa, barra.querySelector('.tar-rapida-ok')); previa.classList.add('dentro'); }
    const busca = t.busca && document.getElementById(t.busca[0]); if (busca) busca.placeholder = t.busca[1];   // o texto longo saía cortado
  });
  montarMarcadoresNotas();
  montarCoresNotas();
}
/** "🎨" ao lado dos marcadores: o estilo das cores do mural (Transparente · Aquarela · Paleta). */
function montarCoresNotas() {
  const linha = document.querySelector('#sec-nt-filtros .nt-filtros-linha'), sec = document.getElementById('sec-nt-filtros');
  if (!linha || !sec || document.getElementById('nt-cores-bt') || typeof ntHtmlCores !== 'function') return;
  const bt = document.createElement('button'); bt.type = 'button'; bt.id = 'nt-cores-bt'; bt.className = 'nt-marc-bt nt-cores-bt';
  bt.title = 'Cores do mural';
  bt.onclick = e => { e.stopPropagation(); sec.classList.remove('marc-aberto'); sec.classList.toggle('cores-aberto'); };
  linha.appendChild(bt);
  const pop = document.createElement('div'); pop.id = 'nt-cores-pop'; pop.className = 'nt-cores-pop';
  // cada escolha redesenha o pop-up: o botão clicado sai da página e o "clique fora" achava que era fora
  pop.addEventListener('click', e => e.stopPropagation());
  sec.appendChild(pop);
  aplicarCoresNotas();
}
if (typeof CFG_ABA_EXTRA !== 'undefined') CFG_ABA_EXTRA['btn-notes'] = () => typeof ntHtmlCores === 'function'
  ? `<h4 class="dev-titulo">Cores das notas</h4><div class="nt-cores-cfg">${ntHtmlCores()}</div>` : '';
/** ⚙ da Agenda (A1): a vista com que ela abre e o horário da grade — por aparelho. */
if (typeof CFG_ABA_EXTRA !== 'undefined') CFG_ABA_EXTRA['btn-home'] = () => {
  if (typeof cfgAgenda !== 'function') return '';
  const c = cfgAgenda(), horas = (de, ate, sel) => Array.from({ length: ate - de + 1 }, (_, i) => de + i)
    .map(h => `<option value="${h}"${h === sel ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('');
  return `<h4 class="dev-titulo">Agenda neste aparelho</h4>
    <label class="cfg-linha">Abrir em <select onchange="mudarCfgAgenda('vista', this.value)">${Object.entries(AG_VISTAS).map(([k, n]) => `<option value="${k}"${c.vista === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="cfg-linha">A grade do dia vai das <select onchange="mudarCfgAgenda('hIni', this.value)">${horas(0, 12, c.hIni)}</select>
      às <select onchange="mudarCfgAgenda('hFim', this.value)">${horas(14, 24, c.hFim)}</select></label>
    <p class="hint" style="margin:4px 0 12px">Compromisso fora da faixa continua aparecendo na lista e no mês; a grade só mostra menos horas vazias.</p>`;
};
/** ⚙ da Saúde: o treino ao vivo (som, vibração, tela acesa) — "tudo que liga/desliga vai para as Configurações". */
if (typeof CFG_ABA_EXTRA !== 'undefined') CFG_ABA_EXTRA['btn-health'] = () => {
  if (typeof cfgTreinoVivo !== 'function') return '';
  const c = cfgTreinoVivo(), item = (k, nome) => `<label class="check-line"><input type="checkbox" ${c[k] ? 'checked' : ''} onchange="tvMudarCfg('${k}')"> ${nome}</label>`;
  return `<h4 class="dev-titulo">Treino ao vivo</h4>
    ${item('som', 'Bipe no fim do descanso')}${item('vibrar', 'Vibrar no fim do descanso (celular)')}${item('telaAcesa', 'Manter a tela acesa durante o treino')}`;
};
/** Os marcadores das Notas saem da linha de baixo e viram um seletor (# marcadores ▾). */
function montarMarcadoresNotas() {
  const linha = document.querySelector('#sec-nt-filtros .nt-filtros-linha'), pop = document.getElementById('note-labels');
  if (!linha || !pop || document.getElementById('nt-marc-bt')) return;
  const bt = document.createElement('button'); bt.type = 'button'; bt.id = 'nt-marc-bt'; bt.className = 'nt-marc-bt';
  bt.title = 'Filtrar por marcador';
  bt.onclick = e => { e.stopPropagation(); const f = document.getElementById('sec-nt-filtros'); f.classList.remove('cores-aberto'); f.classList.toggle('marc-aberto'); };
  linha.appendChild(bt);
  pop.classList.add('nt-marc-pop');
  atualizarBotaoMarcadores();
  ligarRolagemLateral(linha);
}
function atualizarBotaoMarcadores() {
  const bt = document.getElementById('nt-marc-bt'); if (!bt) return;
  const n = typeof todosMarcadores === 'function' ? todosMarcadores().length : 0;
  const atual = typeof noteLabel !== 'undefined' ? noteLabel : '';
  bt.hidden = !n;
  bt.classList.toggle('on', !!atual);
  bt.innerHTML = `<b>#</b><span>${atual ? esc(atual) : 'marcadores'}</span><small>${n}</small>${ic('seta', 'nt-marc-seta')}`;
}
document.addEventListener('click', e => {
  const f = document.getElementById('sec-nt-filtros');
  if (f && f.classList.contains('marc-aberto') && !e.target.closest('#note-labels, #nt-marc-bt')) f.classList.remove('marc-aberto');
  if (f && f.classList.contains('cores-aberto') && !e.target.closest('#nt-cores-pop, #nt-cores-bt')) f.classList.remove('cores-aberto');
});
if (typeof renderFiltrosNota === 'function') {
  const _rfn = renderFiltrosNota;
  renderFiltrosNota = function () { _rfn(); atualizarBotaoMarcadores(); };
}
if (typeof filtrarMarcador === 'function') {
  const _fm = filtrarMarcador;
  filtrarMarcador = function (l) { _fm(l); const f = document.getElementById('sec-nt-filtros'); if (f) f.classList.remove('marc-aberto'); atualizarBotaoMarcadores(); };
}
/** Linha que não cabe: rola para o lado, esmaece na ponta e ganha uma setinha (pedido dele). */
function ligarRolagemLateral(linha) {
  if (!linha || linha._rolagem) return; linha._rolagem = true;
  const host = linha.parentElement; host.classList.add('cs-rola-host');
  const seta = document.createElement('button'); seta.type = 'button'; seta.className = 'cs-rola-seta'; seta.title = 'Ver o resto';
  seta.innerHTML = ic('seta');
  seta.onclick = () => linha.scrollBy({ left: Math.max(120, linha.clientWidth * 0.7), behavior: 'smooth' });
  host.appendChild(seta);
  const medir = () => host.classList.toggle('transborda', linha.scrollWidth - linha.clientWidth - linha.scrollLeft > 4);
  linha.addEventListener('scroll', medir, { passive: true });
  if (typeof ResizeObserver === 'function') new ResizeObserver(medir).observe(linha);
  medir();
}

// ganchos: depois das funções do app.js, a casca acompanha
const _changeTabOriginal = changeTab;
changeTab = function (id) {
  _changeTabOriginal(id);
  if (cascaNova()) { atualizarCabecalhoAtivo(); sincronizarBotoesDeSecao(); if (folhaAberta && folhaAberta._aba !== id) fecharFolha(folhaAberta); }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
};
const _aplicarAparenciaOriginal = aplicarAparencia;
aplicarAparencia = function () { _aplicarAparenciaOriginal(); aplicarCasca(); };
if (typeof redesenharTudo === 'function') {
  const _redesenharOriginal = redesenharTudo;
  redesenharTudo = function () { _redesenharOriginal(); if (cascaNova()) atualizarCabecalhoAtivo(); };
}
// as sub-abas (Agenda, Saúde, Lazer, Viagens, Rede) mudam o que está à vista
['verSecaoAgenda', 'verSecaoSaude', 'verSecaoLazer', 'verSecaoViagens', 'verSecaoRede', 'verSecaoClinica', 'verSecaoProducao'].forEach(nome => {
  if (typeof window[nome] !== 'function') return;
  const orig = window[nome];
  window[nome] = function (...a) { const r = orig.apply(this, a); sincronizarBotoesDeSecao(); return r; };
});

// Ctrl+K e Esc na cara nova
window.addEventListener('keydown', e => {
  if (!cascaNova()) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); e.stopImmediatePropagation();
    const i = document.getElementById('cs-barra-input'); if (i) { i.focus(); i.select(); }
  } else if (e.key === 'Escape') {
    if (folhaAberta) { fecharFolha(folhaAberta); e.stopImmediatePropagation(); }
    else if (!document.getElementById('cs-grade').hidden) fecharGrade();
  }
}, true);

// estado do cabeçalho envelhece (hora do dia, avisos) — renova a cada minuto
setInterval(() => { if (cascaNova()) atualizarCabecalhoAtivo(); }, 60000);

// INICIALIZAÇÃO DA CASCA
montarEsqueleto();
aplicarCasca();
