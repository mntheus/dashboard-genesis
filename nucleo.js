// ════════════════════════════════════════════════════════════════════════════
// NÚCLEO — a tela de entrada do Genesis (Etapa 1b, 03/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// O caminho da entrada, em três camadas:
//   1. a ENTRADA: saudação, "o Genesis te avisa", o que tem hoje e o cérebro;
//   2. tocar numa área abre a JANELINHA (resumo da área, setores, itens, ＋ ações);
//   3. "Abrir ›" leva à página completa da área (a aba de sempre, já com a cara nova).
// E o que é só do Genesis: AFASTAR o zoom abre o ANEL CULTURAL em volta (obra do dia,
// frase, o filme da lista, a próxima saída, aniversário chegando, cotação).
//
// O cérebro 3D é o do J.A.R.V.I.S. (jarvis3d.js, Trinca de Ases). Aqui só se monta
// o grafo com os dados do Genesis e se escuta o que ele avisa. Sem WebGL (ou no
// modo "Leve"), cai numa versão 2D que faz exatamente as mesmas coisas.
//
// Nada aqui grava dado do usuário: só preferências de tela (prefs.nucleo) e
// quais cartões do anel foram fechados hoje (lifeos_anel_fechados, só local).
// ════════════════════════════════════════════════════════════════════════════

ICONES.nucleo = 'M12 12m-2.6 0a2.6 2.6 0 105.2 0 2.6 2.6 0 10-5.2 0M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9L18 18M6 18l2.1-2.1M15.9 8.1L18 6';
ICONES.afastar = 'M10.5 17.5a7 7 0 110-14 7 7 0 010 14zM20.5 20.5l-5-5M7.5 10.5h6';
ICONES.janelas = 'M4.5 5.5h15v13h-15zM4.5 9.5h15M8 7.5h0';
NOMES_CASCA.nucleo = 'Núcleo';

// ───────────────────────────── preferências ────────────────────────────────
/** Mostrado na Config → Núcleo: confere se o aparelho está mesmo na versão nova. */
const GENESIS_VERSAO = '10/10/2026 · v54';
const NUCLEO_PADRAO = { inicio: true, anel: true, janelas: false, visual: 'auto', fundo: 'tema', claro: 'aurora' };
function cfgNucleo() {   // devolve SEMPRE o mesmo objeto (armadilha nº 6)
  const c = prefs.nucleo = prefs.nucleo || {};
  // 🪤 04/10: um visual antigo SALVO (ex.: 'vidro' = anel de Saturno azul) mandava mais que o padrão e
  // ignorava a cor do tema — era o que ele via, enquanto os testes (sem nada salvo) mostravam outra coisa.
  if (!c.visualV2) { if (c.visual !== 'leve') c.visual = 'auto'; c.visualV2 = true; try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { } }
  if (!['auto', 'leve'].includes(c.visual)) c.visual = 'auto';
  if (c.fundo !== undefined && !NU_FUNDOS[c.fundo]) c.fundo = 'tema';
  if (c.claro !== undefined && !NU_ESTILOS_CLAROS[c.claro]) c.claro = 'aurora';
  Object.keys(NUCLEO_PADRAO).forEach(k => { if (c[k] === undefined) c[k] = NUCLEO_PADRAO[k]; });
  return c;
}
// ── O FUNDO DO NÚCLEO (09/10, ditado dele): "escolhi um tema claro, quero o Núcleo claro como
//    um todo, não só a cor do meio". Padrão = segue o tema: tema claro → Núcleo claro (3 estilos
//    para ele comparar e escolher); tema escuro → o escuro ganha a cor do tema. 'escuro' = o de antes.
const NU_FUNDOS = { tema: 'Segue o tema (claro nos temas claros)', escuro: 'Sempre o escuro clássico' };
const NU_ESTILOS_CLAROS = { aurora: 'Aurora — brilho da cor do tema no centro', papel: 'Papel — liso, traço de tinta', nevoa: 'Névoa — degradê suave, tons de grafite' };
const corDoTema = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function nuClaro() { return cfgNucleo().fundo !== 'escuro' && TEMAS_CLAROS.includes(cfgAparencia().tema); }
/** A cor REAL atrás do cérebro (o 3D usa na névoa de profundidade; o CSS, no fundo da tela inteira). */
function nuCorFundo() {
  if (cfgNucleo().fundo === 'escuro') return '#02040a';
  const bg = corDoTema('--bg') || '#08090b';
  if (nuClaro()) return cfgNucleo().claro === 'papel' ? (corDoTema('--bg2') || bg) : bg;
  return misturarCor(bg, '#02040a', 0.45);
}
function aplicarFundoNucleo() {
  const claro = nuClaro();
  document.body.classList.toggle('nu-claro', claro);
  document.body.dataset.nuEstilo = claro ? cfgNucleo().claro : '';
  document.body.style.setProperty('--nu-fundo', nuCorFundo());
}
function salvarNucleo() { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); renderNucleoConfig(); }
const VISUAIS_NUCLEO_JARVIS = {
  auto: 'Genesis — espalhado, com a cor do tema', vidro: 'Holograma em anel (Jarvis)', escuro: 'Holograma espalhado (Jarvis, branco)', perola: 'Pérola', cristal: 'Cristal',
  grafite: 'Grafite', claro: 'Claro', leve: 'Leve (2D, para aparelho mais simples)'
};
const VISUAIS_NUCLEO = { auto: 'Genesis — sistema espalhado, com a cor do tema', leve: 'Leve (2D) — para aparelho mais simples' };
const TEMAS_CLAROS = ['claro', 'papel', 'menta', 'nevoa'];
function visualDoCerebro() {
  const v = cfgNucleo().visual;
  if (v !== 'auto') return v;
  return 'genesis';   // espalhado em 3D + a cor do tema (ele NÃO quer o anel plano do 'vidro')
}

// ───────────────────────────── as áreas ────────────────────────────────────
const COR_STATUS = { perigo: '#ef4444', atencao: '#f59e0b', ok: '#22c55e', vazio: '' };
// Zoom do cerebro: o modulo foi feito para tela cheia; no palco do Nucleo ele fica mais perto.
const NU_ZOOM_BASE = 0.78, NU_ZOOM_LONGE = 1.5, NU_ZOOM_LIMIAR = 1.02;
/** Áreas = abas visíveis (respeita as ocultas da Config), menos Painel, Núcleo e Config. */
function areasNucleo() {
  return [...document.querySelectorAll('.tab-btn')].filter(b => !b.hidden)
    .map(b => b.id.replace('btn-', '')).filter(id => !['focus', 'settings', 'nucleo'].includes(id));
}
const brCurto = iso => (typeof isoParaBRCurto === 'function' ? isoParaBRCurto(iso) : iso);
const somaDiasN = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoDe(new Date(y, m - 1, d + n)); };
const tenta = fn => { try { return fn(); } catch (e) { return undefined; } };
function irPara(tab, secaoFn, secao) {
  changeTab(tab);
  if (secaoFn && typeof window[secaoFn] === 'function') tenta(() => window[secaoFn](secao));
}
function editar(fn, ...args) { if (typeof window[fn] === 'function') tenta(() => window[fn](...args)); }

/**
 * Os SETORES de cada área (o "seus agentes" do Jarvis): cada um com os itens que
 * pedem atenção e a ação de abrir. urg: 2 = vermelho, 1 = âmbar, 0 = normal.
 */
function setoresDaArea(id) {
  const hoje = hojeISO();
  const S = [];
  const setor = (nome, itens, abrir, vazio) => S.push({ nome, itens: itens || [], abrir, vazio: vazio || 'nada aqui agora' });
  const it = (nome, sub, urg, abrir) => ({ nome: String(nome || ''), sub: sub || '', urg: urg || 0, abrir });
  switch (id) {
    case 'home': {
      const hojeIt = tenta(() => itensDoDia(hoje)) || [];
      setor('Hoje', hojeIt.map(x => {
        const o = x.obj;
        if (x.kind === 'shift') return it(`${x.time ? x.time + ' · ' : ''}${o.desc || 'Trabalho'}`, formatCurrency(Number(o.amount) || 0), 1, () => { changeTab('home'); editar('editarPlantao', o.id); });
        if (x.kind === 'event') return it(`${x.time ? x.time + ' · ' : ''}${o.title}`, '', 1, () => { changeTab('home'); editar('editarEvento', o.id); });
        return it(o.text, 'tarefa de hoje', 1, () => { changeTab('tasks'); editar('editarTarefa', o.id); });
      }), () => irPara('home', 'verSecaoAgenda', 'cal'), 'dia livre na agenda');
      const prox = [];
      for (let d = 1; d <= 7 && prox.length < 6; d++) {
        const iso = somaDiasN(hoje, d);
        (tenta(() => itensDoDia(iso)) || []).filter(x => x.kind !== 'task').forEach(x => {
          const o = x.obj;
          prox.push(it(`${brCurto(iso)} · ${x.kind === 'shift' ? (o.desc || 'Trabalho') : o.title}`, x.time || '', 0,
            () => { changeTab('home'); editar(x.kind === 'shift' ? 'editarPlantao' : 'editarEvento', o.id); }));
        });
      }
      setor('Próximos 7 dias', prox.slice(0, 6), () => irPara('home', 'verSecaoAgenda', 'cal'), 'semana livre');
      const receber = shifts.filter(s => s.date < hoje && !s.paid);
      setor('A receber', receber.slice(-6).reverse().map(s => it(`${brCurto(s.date)} · ${s.desc || 'Trabalho'}`, formatCurrency(Number(s.amount) || 0), 1,
        () => { irPara('home', 'verSecaoAgenda', 'plantoes'); editar('editarPlantao', s.id); })), () => irPara('home', 'verSecaoAgenda', 'plantoes'), 'tudo recebido');
      break;
    }
    case 'finances': {
      const dt = t => (typeof dataTransacao === 'function' ? dataTransacao(t) : t.date) || '';
      const pagar = transactions.filter(t => t.type === 'expense' && t.pending).sort((a, b) => dt(a).localeCompare(dt(b)));
      setor('A pagar', pagar.slice(0, 6).map(t => it(t.desc, `${formatCurrency(t.amount)} · ${brCurto(dt(t))}`, dt(t) < hoje ? 2 : 1,
        () => editar('editarTransacao', transactions.indexOf(t)))), () => changeTab('finances'), 'nenhuma conta pendente');
      const receber = transactions.filter(t => t.type === 'income' && t.pending).sort((a, b) => dt(a).localeCompare(dt(b)));
      setor('A receber', receber.slice(0, 6).map(t => it(t.desc, `${formatCurrency(t.amount)} · ${brCurto(dt(t))}`, 0,
        () => editar('editarTransacao', transactions.indexOf(t)))), () => changeTab('finances'), 'nada a receber');
      break;
    }
    case 'tasks': {
      const abertas = tasks.filter(t => !t.done);
      setor('Atrasadas', abertas.filter(t => t.due && t.due < hoje).map(t => it(t.text, `venceu ${brCurto(t.due)}`, 2, () => editar('editarTarefa', t.id))),
        () => changeTab('tasks'), 'nada atrasado');
      setor('Hoje', abertas.filter(t => t.due === hoje).map(t => it(t.text, 'para hoje', 1, () => editar('editarTarefa', t.id))),
        () => changeTab('tasks'), 'nada marcado para hoje');
      setor('Com estrela', abertas.filter(t => t.starred).map(t => it(t.text, t.due ? `prazo ${brCurto(t.due)}` : '', 0, () => editar('editarTarefa', t.id))),
        () => changeTab('tasks'), 'nenhuma com estrela');
      break;
    }
    case 'notes': {
      const at = notes.filter(n => !n.archived);
      setor('Fixadas', at.filter(n => n.pinned).map(n => it(n.title || 'Sem título', n.checklist ? `${n.checklist.filter(i => !i.done).length} itens abertos` : '', 0,
        () => { changeTab('notes'); editar('editarNota', n.id); })), () => changeTab('notes'), 'nenhuma fixada');
      setor('Listas', at.filter(n => n.checklist && !n.pinned).map(n => it(n.title || 'Lista', `${n.checklist.filter(i => !i.done).length} itens abertos`, 0,
        () => { changeTab('notes'); editar('editarNota', n.id); })), () => changeTab('notes'), 'nenhuma lista solta');
      break;
    }
    case 'studies': {
      setor('Em andamento', (materials || []).filter(m => m.status === 'andamento').map(m => it(m.title, m.progress ? `${m.progress}%` : '', 0,
        () => { changeTab('studies'); editar('editarMaterial', m.id); })), () => changeTab('studies'), 'nada em andamento');
      setor('Temas', (topics || []).map(t => it(t.name || t.title || 'Tema', t.area || '', 0, () => { changeTab('studies'); editar('editarTema', t.id); })),
        () => changeTab('studies'), 'nenhum tema');
      break;
    }
    case 'business': {
      setor('Carteira', (assets || []).map(a => it(a.name, formatCurrency(Number(a.current) || 0), 0, () => { changeTab('business'); editar('editarAtivo', a.id); })),
        () => changeTab('business'), 'carteira vazia');
      setor('Metas', (goals || []).map(g => it(g.name, g.target ? formatCurrency(g.target) : '', 0, () => { changeTab('business'); editar('editarMeta', g.id); })),
        () => changeTab('business'), 'nenhuma meta');
      setor('Projetos', (projects || []).filter(p => !/^encerr/.test(p.stage || '')).map(p => it(p.name, p.stage || '', 0, () => { changeTab('business'); editar('editarProjeto', p.id); })),
        () => changeTab('business'), 'nenhum projeto');
      break;
    }
    case 'inventory': {
      const inv = typeof inventario !== 'undefined' ? inventario : [];
      setor('Mais valiosos', [...inv].sort((a, b) => invValorTotal(b) - invValorTotal(a)).slice(0, 8)
        .map(x => it(`${x.ic || ''} ${x.nome}`, formatCurrency(invValorTotal(x)), 0, () => { changeTab('inventory'); invSelecionar(x.id); })),
        () => changeTab('inventory'), 'mochila vazia');
      break;
    }
    case 'health': {
      const med = (typeof medical !== 'undefined' ? medical : []).filter(m => m.date && m.date >= hoje).sort((a, b) => a.date.localeCompare(b.date));
      setor('Consultas e exames', med.map(m => it(m.title || m.kind, brCurto(m.date), m.date === hoje ? 1 : 0, () => irPara('health', 'verSecaoSaude', 'medico'))),
        () => irPara('health', 'verSecaoSaude', 'medico'), 'nada marcado');
      setor('Fichas de treino', (typeof fichas !== 'undefined' ? fichas : []).map(f => it(f.nome, '', 0, () => irPara('health', 'verSecaoSaude', 'treinos'))),
        () => irPara('health', 'verSecaoSaude', 'treinos'), 'nenhuma ficha');
      break;
    }
    case 'leisure': {
      setor('Quero ver', (media || []).filter(m => m.status === 'quero').map(m => it(m.title, m.kind || '', 0, () => { changeTab('leisure'); editar('editarMidia', m.id); })),
        () => irPara('leisure', 'verSecaoLazer', 'midia'), 'lista vazia');
      const sai = (typeof saidas !== 'undefined' ? saidas : []).filter(s => s.status === 'marcado' || s.status === 'quero')
        .sort((a, b) => (a.data || '9').localeCompare(b.data || '9'));
      setor('Sair', sai.map(s => it(s.nome, s.data ? brCurto(s.data) : (s.status === 'quero' ? 'quero ir' : ''), s.data === hoje ? 1 : 0,
        () => { irPara('leisure', 'verSecaoLazer', 'sair'); editar('editarSaida', s.id); })), () => irPara('leisure', 'verSecaoLazer', 'sair'), 'nenhuma saída');
      break;
    }
    case 'trips': {
      setor('Próximas viagens', (trips || []).filter(v => v.inicio && v.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map(v => it(v.destino, brCurto(v.inicio), 0, () => { irPara('trips', 'verSecaoViagens', 'viagens'); editar('abrirViagem', v.id); })),
        () => irPara('trips', 'verSecaoViagens', 'viagens'), 'nenhuma marcada');
      setor('Milhas', (typeof milhas !== 'undefined' ? milhas : []).map(p => it(p.programa, `${Number(p.saldo || 0).toLocaleString('pt-BR')} milhas`,
        p.validade && p.validade < somaDiasN(hoje, 30) ? 1 : 0, () => irPara('trips', 'verSecaoViagens', 'milhas'))),
        () => irPara('trips', 'verSecaoViagens', 'milhas'), 'nenhum programa');
      break;
    }
    case 'net': {
      const falar = typeof precisaFalar === 'function' ? (contacts || []).filter(precisaFalar) : [];
      setor('Retomar contato', falar.map(c => it(c.nome, c.papel || '', 1, () => { irPara('net', 'verSecaoRede', 'contatos'); editar('editarContato', c.id); })),
        () => irPara('net', 'verSecaoRede', 'contatos'), 'ninguém esperando');
      setor('Aniversários (30 dias)', aniversariosProximos(30).map(a => it(a.c.nome, `${brCurto(a.iso)} · ${a.idade ? a.idade + ' anos' : ''}`, a.dias === 0 ? 1 : 0,
        () => { irPara('net', 'verSecaoRede', 'contatos'); editar('editarContato', a.c.id); })), () => irPara('net', 'verSecaoRede', 'contatos'), 'nenhum no mês');
      break;
    }
    default:
      setor('Abrir a área', [], () => changeTab(id), 'veja a página completa');
  }
  return S;
}
function aniversariosProximos(dias) {
  const hoje = hojeISO(), ano = Number(hoje.slice(0, 4)), out = [];
  (contacts || []).forEach(c => {
    if (!c.nascimento || c.nascimento.length < 10) return;
    const md = c.nascimento.slice(5);
    let iso = `${ano}-${md}`; if (iso < hoje) iso = `${ano + 1}-${md}`;
    const [y, m, d] = iso.split('-').map(Number), [hy, hm, hd] = hoje.split('-').map(Number);
    const falta = Math.round((new Date(y, m - 1, d) - new Date(hy, hm - 1, hd)) / 86400000);
    if (falta <= dias) out.push({ c, iso, dias: falta, idade: y - Number(c.nascimento.slice(0, 4)) });
  });
  return out.sort((a, b) => a.dias - b.dias);
}
/** Cor da bolinha de cada área: o pior estado entre os itens dela. */
function statusDaArea(id) {
  const s = setoresDaArea(id); const itens = s.flatMap(x => x.itens);
  if (itens.some(i => i.urg === 2)) return 'perigo';
  if (itens.some(i => i.urg === 1)) return 'atencao';
  return itens.length ? 'ok' : 'vazio';
}

// ───────────────────────────── o grafo (para o 3D) ─────────────────────────
let nuAcoes = {};          // id do nó → o que fazer quando tocado
let nuAssinatura = '';     // evita remontar o 3D (e perder o foco) se nada mudou
function montarGrafoNucleo() {
  const nos = [], mapa = {}, links = [];
  const no = (id, d) => { const n = { id, grau: 0, ...d }; nos.push(n); mapa[id] = n; return n; };
  const liga = (a, b) => { if (mapa[a] && mapa[b]) { links.push({ a: mapa[a], b: mapa[b] }); mapa[a].grau++; mapa[b].grau++; } };
  nuAcoes = {};
  no('centro', { nome: (profile && profile.name) || 'Genesis', tipo: 'centro', area: null });
  areasNucleo().forEach(area => {
    no('a-' + area, { nome: nomeAba(area), tipo: 'area', area, icone: ic(area) });
    liga('centro', 'a-' + area);
    setoresDaArea(area).forEach((s, i) => {
      const sid = `s-${area}-${i}`;
      no(sid, { nome: s.nome, tipo: 'secao', area }); liga('a-' + area, sid); nuAcoes[sid] = s.abrir;
      s.itens.slice(0, 3).forEach((x, j) => {   // só os 3 que mais importam de cada setor: o sistema fica limpo
        const iid = `i-${area}-${i}-${j}`;
        no(iid, { nome: x.nome.length > 34 ? x.nome.slice(0, 33) + '…' : x.nome, tipo: 'item', area, icone: ic(area) }); liga(sid, iid); nuAcoes[iid] = x.abrir;
      });
    });
  });
  return { nos, links };
}
function svgDoIcone(nome) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONES[nome] || ''}"/></svg>`;
}

// ───────────────────────────── a tela (imersiva, minimalista) ──────────────
// Como no Jarvis: na tela fica SÓ a saudação e o cérebro. Todo o resto mora em
// MICRO-ÍCONES no canto (sem texto — o nome aparece ao passar o mouse) e no anel que
// abre ao AFASTAR o zoom. Uma janela por vez: abrir uma fecha a outra.
ICONES.aviso = 'M12 4.5a5 5 0 015 5v3.2l1.6 2.8H5.4L7 12.7V9.5a5 5 0 015-5zM10 18.5a2 2 0 004 0';
ICONES.marcador = 'M9.5 4.5l-2 15M16.5 4.5l-2 15M5 9h15M4 15h15';
ICONES.dia = 'M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6M12 8a4 4 0 100 8 4 4 0 000-8z';
const AVISO_AREA = { tarefas: 'tasks', contas: 'finances', plantoes: 'home', plantao: 'home', evento: 'home', reuniao: 'home', estudo: 'studies',
  habitos: 'health', agua: 'health', entrega: 'notes', saida: 'leisure', viagem: 'trips', milhas: 'trips', rede: 'net' };
const PRIO_NOME = { 1: 'URGENTE', 2: 'ATENÇÃO', 3: 'LEMBRETE' };
const areaDoAviso = a => AVISO_AREA[String(a.chave || '').split(':')[0]] || 'focus';

function montarNucleo() {
  if (document.getElementById('nucleo')) return;
  const nav = document.querySelector('.tabs');
  const b = document.createElement('button');
  b.className = 'tab-btn'; b.id = 'btn-nucleo'; b.setAttribute('onclick', "changeTab('nucleo')");
  b.innerHTML = '🌌 Núcleo';
  nav.prepend(b);
  const sec = document.createElement('div');
  sec.id = 'nucleo'; sec.className = 'tab-content';
  const mi = (id, icone, titulo, acao) => `<button class="nu-mi" id="${id}" title="${titulo}" aria-label="${titulo}" onclick="${acao}">${ic(icone)}<i class="nu-mi-ponto"></i></button>`;
  sec.innerHTML = `
    <div class="nu-palco" id="nu-palco">
      <div class="nu-3d" id="nu-3d"><div class="nu-rotulos" id="nu-rotulos"></div></div>
      <div class="nu-2d" id="nu-2d" hidden></div>
      <div class="nu-anel" id="nu-anel" aria-label="Descobertas"></div>
      <div class="nu-dica" id="nu-dica"></div>
    </div>
    <div class="nu-hud" id="nu-hud">
      <header class="nu-hud-esq">
        <div class="cs-rotulo"><span class="cs-trinca">A♠ <b>A♥</b> <b>A♦</b></span> · GENESIS</div>
        <h1 class="nu-saud" id="nu-saud"></h1>
        <p class="nu-estado" id="nu-estado"></p>
      </header>
      <div class="nu-hud-dir">
        <div class="nu-relogio"><b id="nu-hora"></b><span id="nu-data"></span></div>
        <nav class="nu-micro" aria-label="Atalhos do Núcleo">
          ${mi('nu-mi-avisos', 'aviso', 'O Genesis te avisa', 'abrirJanelaAvisos()')}
          ${mi('nu-mi-dia', 'dia', 'O dia', 'abrirJanelaDia()')}
          ${mi('nu-mi-modo', 'marcador', 'Áreas ↔ Marcadores', "definirModoNucleo(nuModo === 'areas' ? 'marcadores' : 'areas')")}
          ${mi('nu-btn-afastar', 'afastar', 'Afastar — descobertas ao redor', 'alternarAfastar()')}
          ${mi('nu-btn-janelas', 'janelas', 'Janelas flutuantes', 'alternarJanelasNucleo()')}
        </nav>
      </div>
      <aside class="nu-janela" id="nu-janela" hidden></aside>
    </div>`;
  const cont = document.querySelector('.container');
  cont.insertBefore(sec, document.getElementById('focus'));
  document.getElementById('nu-2d').addEventListener('wheel', e => { e.preventDefault(); definirAfastado(e.deltaY > 0); }, { passive: false });
  vestirNavegacao();
}

// (10/10, auditoria da Config) o estilo do relógio da Config (digital, minimalista, analógico, por extenso) e os
// segundos valem aqui também: antes só o relógio da apresentação clássica, que nem aparece na cara nova, mudava.
function relogioNucleo() {
  const h = document.getElementById('nu-hora'); if (!h) return;
  const d = new Date(), c = typeof cfgAparencia === 'function' ? cfgAparencia() : {}, est = c.relogio || 'digital';
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0'), ss = String(d.getSeconds()).padStart(2, '0');
  h.className = 'rel-' + est;
  if (est === 'analogico' && typeof relogioAnalogico === 'function') h.innerHTML = relogioAnalogico(d);
  else if (est === 'texto' && typeof horaPorExtenso === 'function') { const t = horaPorExtenso(d.getHours(), d.getMinutes()); h.textContent = t.charAt(0).toUpperCase() + t.slice(1); }
  else h.innerHTML = `${hh}:${mm}${c.segundos ? `<span class="rel-seg">${ss}</span>` : ''}`;
  const s = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('nu-data').textContent = s.charAt(0).toUpperCase() + s.slice(1);
}
// com segundos (ou o ponteiro deles), a cada segundo; sem, a cada 20 s como antes
let nuTique = 0;
setInterval(() => {
  if (!document.body.classList.contains('nu-ativo')) return;
  const c = typeof cfgAparencia === 'function' ? cfgAparencia() : {};
  if (c.segundos || ++nuTique % 20 === 0) relogioNucleo();
}, 1000);

/** "O dia": o principal de hoje, em linhas curtas que abrem a área certa. */
function linhasDoDia() {
  const hoje = hojeISO(), L = [];
  const agoraHM = (d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)(new Date());
  const itens = (tenta(() => itensDoDia(hoje)) || []).filter(x => x.kind !== 'task');
  const prox = itens.find(x => x.time && x.time >= agoraHM) || itens.find(x => !x.time);
  if (prox) { const o = prox.obj; L.push({ area: 'home', txt: `${prox.time ? prox.time + ' · ' : ''}${prox.kind === 'shift' ? (o.desc || 'Trabalho') : o.title}`, sub: 'a seguir' }); }
  else L.push({ area: 'home', txt: 'Agenda livre hoje', sub: '' });
  const abertas = tasks.filter(t => !t.done);
  const nHoje = abertas.filter(t => t.due === hoje).length, nAtr = abertas.filter(t => t.due && t.due < hoje).length;
  L.push({ area: 'tasks', txt: nHoje || nAtr ? `${nHoje ? plural(nHoje, 'tarefa', 'tarefas') + ' hoje' : 'nada hoje'}${nAtr ? ` · ${nAtr} atrasada${nAtr > 1 ? 's' : ''}` : ''}` : 'Tarefas em dia', sub: '', urg: nAtr ? 2 : nHoje ? 1 : 0 });
  const dt = t => (typeof dataTransacao === 'function' ? dataTransacao(t) : t.date) || '';
  const conta = transactions.filter(t => t.type === 'expense' && t.pending).sort((a, b) => dt(a).localeCompare(dt(b)))[0];
  if (conta) L.push({ area: 'finances', txt: `${conta.desc} · ${formatCurrency(conta.amount)}`, sub: `vence ${brCurto(dt(conta))}`, urg: dt(conta) < hoje ? 2 : dt(conta) <= somaDiasN(hoje, 3) ? 1 : 0 });
  const h = typeof hydration !== 'undefined' ? hydration : null;
  if (h && h.goal) L.push({ area: 'health', txt: `Água ${(h.ml / 1000).toFixed(1).replace('.', ',')} de ${(h.goal / 1000).toFixed(1).replace('.', ',')} L`, sub: '' });
  return L;
}
const corUrg = u => u === 2 ? 'var(--perigo)' : u === 1 ? 'var(--atencao)' : 'transparent';
const htmlLinhasDia = () => linhasDoDia().map(l => `<button class="nu-dia-linha" onclick="abrirJanelaArea('${l.area}')">${ic(l.area)}<span>${esc(l.txt)}</span>${l.sub ? `<small>${esc(l.sub)}</small>` : '<small></small>'}<i class="nu-pt" style="background:${corUrg(l.urg)}"></i></button>`).join('');
const fraseAgora = () => { const f = tenta(() => fraseDoDia()); return typeof f === 'string' ? f : f && (f.texto || ''); };

function renderNucleo() {
  const sec = document.getElementById('nucleo'); if (!sec) return;
  document.getElementById('nu-saud').innerHTML = saudacaoCurta();
  document.getElementById('nu-estado').textContent = estadoDaAba('focus');
  relogioNucleo();
  const dica = document.getElementById('nu-dica');
  if (dica) dica.textContent = matchMedia('(pointer: coarse)').matches ? 'afaste com dois dedos · descobertas ao redor' : 'role para afastar · descobertas ao redor';
  // o micro-ícone de avisos ganha um ponto colorido (vermelho = urgente) — nada grita na tela
  const av = nuAvisosLigados() ? (tenta(() => calcularAvisos()) || []) : [];
  const urg = av.some(a => a.prio === 1);
  const b = document.getElementById('nu-mi-avisos');
  b.classList.toggle('alerta', urg); b.classList.toggle('aviso', !urg && av.length > 0);
  b.title = av.length ? `O Genesis te avisa — ${plural(av.length, 'coisa', 'coisas')}${urg ? ' (urgente)' : ''}` : 'O Genesis te avisa — nada pendente';
  renderCerebro();
  renderAnel();
  aplicarJanelasNucleo();
  renderModoNucleo();
}

/** Prepara a janelinha para um conteúdo novo: fecha o anel (uma coisa por vez). */
function prepararJanela(chave) {
  const j = document.getElementById('nu-janela'); if (!j) return null;
  nuAreaAberta = chave;
  definirAfastado(false, true);
  return j;
}
function mostrarJanela(j) {
  j.hidden = false; j.classList.remove('fechando'); aplicarPosSalva(j, 'janela');
  requestAnimationFrame(() => j.classList.add('aberta'));
  document.getElementById('nu-palco').classList.add('com-janela');
  if (nu3D && innerWidth > 900) window.JarvisBrain.deslocar(-170, 10);
}
const topoJanela = (icone, rot, titulo) => `
  <div class="nu-j-topo">
    <span class="nu-j-ic">${ic(icone)}</span>
    <div><div class="cs-rotulo">GENESIS <span class="cs-sep">›</span> ${rot}</div><h2>${titulo}</h2></div>
    <button class="cs-folha-x" onclick="fecharJanelaArea()" title="Fechar">${ic('fechar')}</button>
  </div>`;

function abrirJanelaAvisos() {
  const j = prepararJanela('__avisos'); if (!j) return;
  const lig = nuAvisosLigados();
  const av = lig ? (tenta(() => calcularAvisos()) || []).slice().sort((a, b) => a.prio - b.prio) : [];
  const cor = p => p === 1 ? 'var(--perigo)' : p === 2 ? 'var(--atencao)' : 'var(--info)';
  j.innerHTML = topoJanela('aviso', 'AVISOS', 'O Genesis te avisa') + `
    <p class="nu-j-estado">${!lig ? 'Os avisos estão desligados (Config → Avisos e lembretes).' : av.length ? `${plural(av.length, 'coisa pede', 'coisas pedem')} atenção agora.` : 'Nada pendente. Todos os sistemas em ordem.'}</p>
    <div class="nu-j-setores">${av.map(a => {
      const area = areaDoAviso(a);
      return `<button class="nu-aviso" onclick="fecharJanelaArea(); ${a.acao || ''}">
        <span class="nu-aviso-ic" style="color:${cor(a.prio)}">${ic(area === 'focus' ? 'aviso' : area)}</span>
        <span class="nu-aviso-txt"><small style="color:${cor(a.prio)}">${esc(area === 'focus' ? 'GERAL' : nomeAba(area).toUpperCase())} · ${PRIO_NOME[a.prio] || ''}</small>${esc(a.texto)}</span>${ic('seta', 'nu-seta')}</button>`;
    }).join('')}</div>`;
  mostrarJanela(j);
}
function abrirJanelaDia() {
  const j = prepararJanela('__dia'); if (!j) return;
  const fr = fraseAgora();
  j.innerHTML = topoJanela('dia', 'HOJE', 'O dia') + `
    ${fr ? `<p class="nu-frase">“${esc(fr)}”</p>` : ''}
    <div class="nu-dia-lista">${htmlLinhasDia()}</div>`;
  mostrarJanela(j);
}

// ───────────────────────────── o cérebro ───────────────────────────────────
let nu3D = false;          // o 3D subiu?
let nu3DTentou = false;
// o objeto de ícones fica guardado: o modo Marcadores acrescenta o ícone # para cada marcador
const nuIcones = {};
/** Onde o cérebro fica quando nada está aberto: no PC, um pouco à direita (a coluna do HUD fica à esquerda). */
function nuDeslocBase() { return innerWidth > 700 ? [0, 24] : [0, 50]; }   // o cérebro no centro da tela
// ── o visual "Genesis": a forma ESPALHADA (áreas pela esfera toda, em 3D, não num anel)
//    com as cores do tema do app. Trocou o tema, o cérebro troca junto.
function hexParaRgb(h) { h = String(h || '').trim().replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return isNaN(n) || h.length !== 6 ? [240, 166, 47] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function misturarCor(a, b, t) { const A = hexParaRgb(a), B = hexParaRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function registrarPaletaGenesis() {
  if (!window.JarvisBrain || !window.JarvisBrain.definirPaleta) return;
  const ac = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#f0a62f';
  const forma = { semAneis: true, semSubplano: true, itensVisiveis: true, iconeNaPerola: true, tamArea: 17, espalhar: 1.5 };   // sem 'anéis de Saturno'; itens com mini-ícone na visão geral
  const fundo = nuCorFundo();
  if (nuClaro()) {
    // claro: tinta sobre papel (mistura normal, sem brilho somado — no branco o brilho some)
    const est = cfgNucleo().claro, tinta = corDoTema('--txt-forte') || '#1d1d1f';
    const base = est === 'nevoa' ? misturarCor(tinta, fundo, 0.3) : tinta;
    const tom = est === 'aurora' ? 0.55 : est === 'nevoa' ? 0.2 : 0.3;   // quanto da cor do tema entra
    window.JarvisBrain.definirPaleta('genesis', 'claro', Object.assign({
      fundo, nucleo: misturarCor(base, ac, tom + 0.15), area: misturarCor(misturarCor(base, ac, tom), fundo, 0.2),
      secao: misturarCor(base, fundo, 0.4), cat: misturarCor(base, fundo, 0.5), item: misturarCor(base, fundo, 0.6),
      linha: misturarCor(misturarCor(base, ac, tom), fundo, 0.35), hud: misturarCor(base, fundo, 0.2),
      poeira: misturarCor(misturarCor(base, ac, tom), fundo, est === 'aurora' ? 0.5 : 0.62), icone: fundo,
      nevoa: est === 'papel' ? null : est === 'nevoa' ? misturarCor(base, fundo, 0.7) : misturarCor(ac, fundo, 0.55),   // papel = liso, sem nuvem
      aura: est === 'nevoa' ? misturarCor(base, fundo, 0.5) : ac, auraOp: est === 'aurora' ? 0.2 : 0.1
    }, forma));
    return;
  }
  window.JarvisBrain.definirPaleta('genesis', 'escuro', Object.assign({
    fundo, nucleo: misturarCor(ac, '#ffffff', 0.72), area: misturarCor(ac, '#ffffff', 0.86),
    secao: misturarCor(ac, '#ffffff', 0.6), cat: misturarCor(ac, '#ffffff', 0.5), item: misturarCor(ac, '#8e8e93', 0.45),
    linha: misturarCor(ac, '#ffffff', 0.4), hud: misturarCor(ac, '#ffffff', 0.55), poeira: misturarCor(ac, '#ffffff', 0.3),
    nevoa: misturarCor(ac, fundo, 0.35), icone: misturarCor(ac, '#ffffff', 0.7)
  }, forma));
}function iniciar3D() {
  registrarPaletaGenesis();
  areasNucleo().forEach(a => { nuIcones[a] = { svg: svgDoIcone(a) }; });
  if (nu3D || !window.JarvisBrain || visualDoCerebro() === 'leve') return false;
  nu3DTentou = true;
  const ok = window.JarvisBrain.iniciar(document.getElementById('nu-3d'), {
    rotulos: document.getElementById('nu-rotulos'),
    visual: visualDoCerebro(),
    icones: nuIcones,
    onArea: area => (String(area).startsWith('m:') ? abrirJanelaMarcador(area.slice(2)) : abrirJanelaArea(area)),
    onNo: id => { const f = nuAcoes[id]; if (f) f(); },
    onNucleo: () => { const i = document.getElementById('cs-barra-input'); if (i) i.focus(); },
    onToqueVazio: () => fecharJanelaArea(),
    onZoom: rel => definirAfastado(rel > NU_ZOOM_LIMIAR, true)
  });
  if (!ok) return false;
  nu3D = true; nuAssinatura = '';
  document.getElementById('nu-2d').hidden = true;
  document.getElementById('nu-3d').hidden = false;
  renderCerebro();
  // ⚠️ chaves SEMPRE explícitas aqui: uma linha inserida entre um "if" e o "else" dele já fez
  // o cérebro ser pausado logo ao nascer (o else passou a pertencer a outro if).
  const noNucleo = document.getElementById('nucleo').classList.contains('active');
  if (noNucleo) {
    window.JarvisBrain.retomar();
    window.JarvisBrain.entrada();
  } else {
    window.JarvisBrain.pausar();
  }
  // o 3D pode subir DEPOIS de a pessoa ja ter tocado em algo: alinha com o que esta na tela
  window.JarvisBrain.zoom(nuAfastado ? NU_ZOOM_LONGE : NU_ZOOM_BASE);
  window.JarvisBrain.deslocar(...nuDeslocBase());
  if (nuAreaAberta) {
    window.JarvisBrain.focarArea(nuAreaAberta);
    if (innerWidth > 900) window.JarvisBrain.deslocar(-200, 0);
  }
  return true;
}
function renderCerebro() {
  if (nuModo === 'marcadores') {
    const g = montarGrafoMarcadores();
    if (nu3D) {
      g.tags.forEach(t => { nuIcones['m:' + t] = { svg: svgDoIcone('marcador') }; });
      const ass = 'M|' + g.nos.map(n => n.id + n.nome).join('|') + visualDoCerebro();
      if (ass !== nuAssinatura) { nuAssinatura = ass; window.JarvisBrain.carregar(g); }
      window.JarvisBrain.definirStatus({});
    } else render2DMarcadores(g.tags);
    return;
  }
  const areas = areasNucleo();
  const status = Object.fromEntries(areas.map(a => [a, COR_STATUS[statusDaArea(a)]]));
  if (nu3D) {
    const g = montarGrafoNucleo();
    const ass = g.nos.map(n => n.id + n.nome).join('|') + visualDoCerebro();
    if (ass !== nuAssinatura) { nuAssinatura = ass; window.JarvisBrain.carregar(g); }
    window.JarvisBrain.definirStatus(status);
  } else {
    montarGrafoNucleo();        // as ações dos nós servem também à janelinha
    render2D(areas, status);
  }
}
/** A versão 2D: as mesmas áreas em órbita em volta de um núcleo de luz. */
function render2D(areas, status) {
  // Sistema espalhado (espiral do girassol), não um anel: cada área a uma distância diferente do núcleo,
  // ligada a ele por um fio — o mesmo desenho do 3D, em versão leve.
  const el = document.getElementById('nu-2d'); if (!el) return;
  document.getElementById('nu-3d').hidden = true; el.hidden = false;
  const n = areas.length || 1;
  const pos = areas.map((a, i) => { const r = 0.2 + 0.26 * Math.sqrt((i + 0.6) / n), ang = i * 2.39996 - 1.2; return { x: 50 + Math.cos(ang) * r * 100, y: 50 + Math.sin(ang) * r * 92 }; });
  el.innerHTML = `<svg class="nu-2d-fios" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${pos.map((p, i) => `<line x1="50" y1="50" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" style="stroke:${status[areas[i]] || 'rgba(255,255,255,.25)'}"/>`).join('')}</svg>
    <div class="nu-2d-nucleo" onclick="document.getElementById('cs-barra-input').focus()"></div>` +
    areas.map((a, i) => `<button class="nu-2d-area" data-area="${a}" style="--x:${pos[i].x.toFixed(2)}%;--y:${pos[i].y.toFixed(2)}%;--st:${status[a] || 'transparent'};--d:${(i * 0.37).toFixed(2)}s" onclick="abrirJanelaArea('${a}')">
        <span class="nu-perola" style="color:${status[a] || 'var(--txt-forte)'}">${ic(a)}</span><span class="nu-2d-nome">${esc(nomeAba(a))}</span></button>`).join('');
}


// ───────────────────────────── a janelinha da área ─────────────────────────
let nuAreaAberta = null;
function abrirJanelaArea(area) {
  const j = document.getElementById('nu-janela'); if (!j) return;
  nuAreaAberta = area;
  const S = setoresDaArea(area);
  const acoes = [...document.querySelectorAll(`#${area} > .cs-hero .cs-acao`)].filter(b => !b.hidden);
  const cor = u => u === 2 ? 'var(--perigo)' : u === 1 ? 'var(--atencao)' : 'var(--txt4)';
  j.innerHTML = `
    <div class="nu-j-topo">
      <span class="nu-j-ic">${ic(area)}</span>
      <div><div class="cs-rotulo">GENESIS <span class="cs-sep">›</span> ÁREA</div><h2>${esc(nomeAba(area))}</h2></div>
      <button class="cs-folha-x" onclick="fecharJanelaArea()" title="Fechar">${ic('fechar')}</button>
    </div>
    <p class="nu-j-estado">${esc(estadoDaAba(area))}</p>
    <div class="cs-rotulo nu-j-sub">SETORES · TOQUE PARA VER</div>
    <div class="nu-j-setores">${S.map((s, i) => {
      const pior = s.itens.reduce((m, x) => Math.max(m, x.urg), -1);
      return `<div class="nu-setor" data-i="${i}">
        <button class="nu-setor-cab" onclick="alternarSetor(this)">
          <i class="nu-pt" style="background:${s.itens.length ? cor(pior) : 'var(--borda3)'}"></i>
          <span class="nu-setor-nome">${esc(s.nome)}</span>
          <span class="nu-setor-n">${s.itens.length || ''}</span>${ic('seta', 'nu-seta')}
          <span class="nu-setor-prox">${s.itens.length ? '› ' + esc(s.itens[0].nome) : esc(s.vazio)}</span>
        </button>
        <div class="nu-setor-itens" hidden>${s.itens.slice(0, 8).map((x, k) => `<button class="nu-item" onclick="abrirItemNucleo('${area}', ${i}, ${k})"><i class="nu-pt" style="background:${cor(x.urg)}"></i><span>${esc(x.nome)}</span><small>${esc(x.sub)}</small></button>`).join('')}
          <button class="nu-item nu-item-abrir" onclick="abrirSetorNucleo('${area}', ${i})">Ver tudo em ${esc(s.nome)} ›</button></div>
      </div>`;
    }).join('')}</div>
    ${acoes.length ? `<div class="nu-j-acoes">${acoes.map((b, k) => `<button class="cs-acao" onclick="acaoRapidaNucleo('${area}', ${k})">${b.innerHTML}</button>`).join('')}</div>` : ''}
    <button class="nu-j-abrir" onclick="fecharJanelaArea(); changeTab('${area}')">Abrir ${esc(nomeAba(area))} ${ic('seta')}</button>`;
  j.hidden = false; j.classList.remove('fechando'); aplicarPosSalva(j, 'janela');
  definirAfastado(false, true);   // focar a area aproxima o cerebro: o anel fecha junto
  requestAnimationFrame(() => j.classList.add('aberta'));
  document.getElementById('nu-palco').classList.add('com-janela');
  document.querySelectorAll('.nu-2d-area').forEach(el => el.classList.toggle('apagada', el.dataset.area !== area));
  // abre sozinho o primeiro setor que pede atenção
  const alvo = j.querySelector('.nu-setor .nu-pt[style*="perigo"], .nu-setor .nu-pt[style*="atencao"]');
  if (alvo) alternarSetor(alvo.closest('.nu-setor-cab'));
  // no PC o cérebro anda para a esquerda para não ficar atrás da janelinha
  if (nu3D && innerWidth > 900) window.JarvisBrain.deslocar(-Math.min(220, j.offsetWidth / 2), 0);
}
function fecharJanelaArea(manterZoom) {
  const j = document.getElementById('nu-janela'); if (!j || j.hidden) return;
  j.classList.remove('aberta'); j.classList.add('fechando'); nuAreaAberta = null;
  document.getElementById('nu-palco').classList.remove('com-janela');
  document.querySelectorAll('.nu-2d-area').forEach(el => el.classList.remove('apagada'));
  setTimeout(() => { if (!nuAreaAberta) j.hidden = true; }, 180);
  if (nu3D) { window.JarvisBrain.deslocar(...nuDeslocBase()); window.JarvisBrain.voltar(); if (!manterZoom) window.JarvisBrain.zoom(NU_ZOOM_BASE); }
  if (!manterZoom) definirAfastado(false, true);
}
function alternarSetor(cab) {
  const box = cab.parentElement.querySelector('.nu-setor-itens'); if (!box) return;
  box.hidden = !box.hidden; cab.classList.toggle('aberto', !box.hidden);
}
function abrirItemNucleo(area, i, k) { const s = setoresDaArea(area)[i]; const x = s && s.itens[k]; fecharJanelaArea(); if (x && x.abrir) x.abrir(); }
function abrirSetorNucleo(area, i) { const s = setoresDaArea(area)[i]; fecharJanelaArea(); if (s && s.abrir) s.abrir(); }
/** O "＋" da janelinha usa o MESMO botão do cabeçalho da aba: a folha abre por cima do Núcleo,
 *  sem sair dele — dá para lançar uma conta direto da tela de entrada. */
function acaoRapidaNucleo(area, k) {
  const b = [...document.querySelectorAll(`#${area} > .cs-hero .cs-acao`)].filter(x => !x.hidden)[k];
  if (b) b.click();
}

// ───────────────────────────── o anel cultural ─────────────────────────────
// Ao afastar o zoom, o cérebro diminui e o espaço em volta ganha o que NÃO é
// agenda nem tarefa: cultura, descobertas, gente, o mundo lá fora.
function fechadosHoje() {
  const f = tenta(() => JSON.parse(localStorage.getItem('lifeos_anel_fechados'))) || {};
  return f.data === hojeISO() ? f.ids || [] : [];
}
let nuUltimoFechar = 0;
function fecharDoAnel(id) {
  // 09/10: "às vezes ao clicar em uma já fecha ela e mais alguma" — fechado um cartão, os outros
  // se mexem; um segundo toque rápido caía no ✕ do vizinho. Toques em menos de 0,5 s são ignorados.
  if (Date.now() - nuUltimoFechar < 500) return;
  nuUltimoFechar = Date.now();
  try { localStorage.setItem('lifeos_anel_fechados', JSON.stringify({ data: hojeISO(), ids: [...fechadosHoje(), id] })); } catch (e) { }
  renderAnel();
}
function cartoesDoAnel() {
  const C = [], hoje = hojeISO();
  C.push({ id: 'dia', rot: 'O DIA', txt: fraseAgora(), html: `<div class="nu-dia-lista">${htmlLinhasDia()}</div>` });
  const avA = (nuAvisosLigados() ? (tenta(() => calcularAvisos()) || []) : []).slice().sort((a, b) => a.prio - b.prio);
  const feitosH = (habits || []).filter(h => h.done).length, totH = (habits || []).length;
  if (totH) C.push({ id: 'habitos', rot: 'HÁBITOS DE HOJE', tit: `${feitosH} de ${totH}`, html: `<div class="nu-barra"><i style="width:${Math.round(feitosH / totH * 100)}%"></i></div>`, acao: () => changeTab('focus') });
  const minE = typeof studyData !== 'undefined' && studyData.date === hojeBR() ? (studyData.minutes || 0) : 0;
  C.push({ id: 'estudo', rot: 'ESTUDO DE HOJE', tit: minE ? `${Math.floor(minE / 60)}h ${minE % 60}min` : 'Ainda não estudou hoje', sub: (topics || []).length ? plural(topics.length, 'tema', 'temas') : '', acao: () => changeTab('studies') });
  const viag = (trips || []).filter(v => v.inicio && v.inicio >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  if (viag) { const [y, m, d] = viag.inicio.split('-').map(Number), [hy, hm, hd] = hoje.split('-').map(Number); const falta = Math.round((new Date(y, m - 1, d) - new Date(hy, hm - 1, hd)) / 86400000);
    C.push({ id: 'viagem', rot: 'PRÓXIMA VIAGEM', tit: viag.destino, sub: falta ? `faltam ${plural(falta, 'dia', 'dias')}` : 'é hoje!', acao: () => irPara('trips', 'verSecaoViagens', 'viagens') }); }  if (avA.length) C.push({ id: 'avisos', rot: 'O GENESIS TE AVISA', html: avA.slice(0, 3).map(a => `<button class="nu-dia-linha" onclick="${a.acao || ''}">${ic(areaDoAviso(a) === 'focus' ? 'aviso' : areaDoAviso(a))}<span>${esc(a.texto)}</span><small></small><i class="nu-pt" style="background:${corUrg(a.prio === 1 ? 2 : a.prio === 2 ? 1 : 0)}"></i></button>`).join('') + (avA.length > 3 ? `<button class="nu-item nu-item-abrir" onclick="abrirJanelaAvisos()">ver os ${avA.length} ›</button>` : '') });
  const diaDoAno = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const arte = tenta(() => JSON.parse(localStorage.getItem('lifeos_arte_dia')));
  if (arte && arte.obra) {
    const o = arte.obra;
    C.push({ id: 'arte', rot: 'OBRA DO DIA', tit: o.titulo, sub: [o.autor, o.ano].filter(Boolean).join(' · '), img: o.img, txt: o.sobre, acao: o.link ? () => window.open(o.link, '_blank', 'noopener') : null });
  }
  const frase = tenta(() => fraseDoDia());
  // (a frase do período já mora no cartão O DIA — não repete aqui)
  if (false && frase) C.push({ id: 'frase', rot: 'PARA AGORA', tit: '', txt: typeof frase === 'string' ? frase : (frase.texto || ''), sub: typeof frase === 'object' && frase.autor ? frase.autor : '' });
  const quero = (media || []).filter(m => m.status === 'quero');
  if (quero.length) {
    const m = quero[diaDoAno % quero.length];
    C.push({ id: 'midia', rot: 'NA SUA LISTA', tit: m.title, sub: m.kind || '', img: m.img, acao: () => irPara('leisure', 'verSecaoLazer', 'midia') });
  }
  const sai = (typeof saidas !== 'undefined' ? saidas : []);
  const marcada = sai.filter(s => s.status === 'marcado' && s.data && s.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))[0];
  const ideia = sai.filter(s => s.status === 'quero');
  const s = marcada || (ideia.length ? ideia[diaDoAno % ideia.length] : null);
  if (s) C.push({ id: 'saida', rot: marcada ? 'PRÓXIMA SAÍDA' : 'QUE TAL IR?', tit: s.nome, sub: [s.data ? brCurto(s.data) : '', s.cidade || s.local || ''].filter(Boolean).join(' · '), img: s.img, txt: s.sobre, acao: () => irPara('leisure', 'verSecaoLazer', 'sair') });
  const aniv = aniversariosProximos(21)[0];
  if (aniv) C.push({ id: 'aniv', rot: aniv.dias === 0 ? 'ANIVERSÁRIO HOJE' : 'ANIVERSÁRIO', tit: aniv.c.nome, sub: `${brCurto(aniv.iso)}${aniv.idade ? ' · ' + aniv.idade + ' anos' : ''}${aniv.dias ? ' · em ' + plural(aniv.dias, 'dia', 'dias') : ''}`, acao: () => irPara('net', 'verSecaoRede', 'contatos') });
  // 08/10: o cartão do mercado mostra o primeiro FAVORITO do radar (antes lia
  // `cot.usd`, um formato que o cache nunca teve — por isso não aparecia).
  const fav = tenta(() => typeof ngRadarOrdenado === 'function' ? ngRadarOrdenado()[0] : null);
  const ult = fav && tenta(() => ultimaCotacao(fav.k));
  if (ult && isFinite(ult.v)) C.push({ id: 'dolar', rot: 'MERCADO', tit: `${fav.nome} ${ngFmt(ult.v, fav, ult.moeda)}`, sub: (NG_FONTES[fav.fonte] || ['', ''])[1], acao: () => { changeTab('business'); ngIrParaAtivo(fav.k); } });
  const fechados = fechadosHoje();
  return C.filter(c => !fechados.includes(c.id));
}
// lado de cada cartão: à esquerda o SEU DIA, à direita o MUNDO LÁ FORA
const ANEL_LADO = { dia: 'esq', avisos: 'esq', habitos: 'esq', estudo: 'esq', viagem: 'esq', arte: 'dir', midia: 'dir', saida: 'dir', aniv: 'dir', dolar: 'dir' };
const ANEL_NOMES = { dia: 'O dia', avisos: 'O Genesis te avisa', habitos: 'Hábitos de hoje', estudo: 'Estudo de hoje', viagem: 'Próxima viagem', arte: 'Obra do dia', midia: 'Na sua lista', saida: 'Saídas', aniv: 'Aniversários', dolar: 'Mercado' };
/** A última arrumação do anel não coube em órbita (ou ainda não foi feita nesta tela grande o bastante)? */
function nuSemOrbita() {
  if (innerWidth <= 900) return true;
  const el = document.getElementById('nu-anel'), a = el && el.dataset.arranjoReal;
  return a ? a !== 'orbita' : null;   // null = ainda não arrumou nesta tela (o zoom não foi afastado)
}
/** (10/10, auditoria da Config) "Mostrar avisos" desligado vale também no Núcleo (ponto do micro-ícone, cartão e janela). */
function nuAvisosLigados() { return typeof cfgAvisos !== 'function' || cfgAvisos().ligado !== false; }
function cartaoLigado(id) { const c = cfgNucleo(); c.cartoes = c.cartoes || {}; return c.cartoes[id] !== false; }
function renderAnel() {
  const el = document.getElementById('nu-anel'); if (!el) return;
  if (!cfgNucleo().anel) { el.innerHTML = ''; el.hidden = true; return; }
  el.hidden = false;
  const C = cartoesDoAnel().filter(c => cartaoLigado(c.id));
  nuAnelAcoes = C.map(c => c.acao || null);
  const cartao = (c, i) => `
    <article data-id="${c.id}" class="nu-sat nu-sat-${c.id}${c.img ? ' com-img' : ''}" style="--i:${i}" ${c.acao ? `onclick="acaoDoAnel(${i})"` : ''}>
      <span class="nu-sat-alca" aria-hidden="true"></span>
      ${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()" onload="posicionarAnel()">` : ''}
      <div class="nu-sat-txt"><div class="cs-rotulo">${esc(c.rot)}</div>${c.tit ? `<b>${esc(c.tit)}</b>` : ''}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}${c.txt ? `<p>${esc(c.txt)}</p>` : ''}${c.html || ''}</div>
      <button class="nu-sat-x" title="Fechar por hoje" onclick="event.stopPropagation(); fecharDoAnel('${c.id}')">${ic('fechar')}</button>
    </article>`;
  const lado = l => C.map((c, i) => (ANEL_LADO[c.id] || 'dir') === l ? cartao(c, i) : '').join('');
  el.innerHTML = `<div class="nu-anel-col nu-anel-esq">${lado('esq')}</div><div class="nu-anel-col nu-anel-dir">${lado('dir')}</div>`;
  if (innerWidth <= 900) el.querySelectorAll('.nu-sat[data-id]').forEach(s => aplicarPosSalva(s, 'sat-' + s.dataset.id));
  posicionarAnel();
}

// ── A CONSTELAÇÃO (09/10) ────────────────────────────────────────────────────
// Ditado dele: "as janelas flutuantes estão quebradas: não são móveis, não se apresentam
// separadamente e de forma espalhada ao redor do núcleo, tem abas sobrepostas que não enxergo".
// Eram duas colunas coladas nas bordas; o cartão que ele tinha arrastado ficava SOLTO na posição
// guardada, por cima dos outros; e quem era só botões (O dia, Avisos) não se deixava arrastar.
// Agora (tela > 900 px): os cartões se espalham em colunas ESCALONADAS dos dois lados do cérebro
// (até 3 por lado no ultrawide) e cada um é posto num LUGAR LIVRE — nada sobrepõe nada, nem o
// cabeçalho, o relógio ou as janelas flutuantes. Arrasta-se de qualquer ponto do cartão; ao soltar
// ele encaixa no lugar livre mais perto e fica guardado (em fração da tela, para servir em outra
// resolução). Dois cliques devolvem ao lugar automático. No celular continua a faixa de rolar.
const NU_SAT_LARG = 300, NU_SAT_VAO = 14;
/** Posições guardadas (fração da largura/altura). As antigas (px, empilhadas) saem uma vez. */
function nuPos2() {
  const c = cfgNucleo();
  if (!c.posAnelV2) {
    Object.keys(c.pos || {}).forEach(k => { if (k.startsWith('sat-')) delete c.pos[k]; });
    c.posAnelV2 = true; c.pos2 = {};
    try { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); } catch (e) { }
  }
  c.pos2 = c.pos2 || {};
  return c.pos2;
}
const nuSobrepoe = (a, b, m) => a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y;
/** O lugar livre mais perto de `r` (procura em anéis), dentro de `lim`, sem encostar em `obst`. */
function nuLugarLivre(r, obst, lim, m) {
  const cabe = q => q.x >= lim.x && q.y >= lim.y && q.x + q.w <= lim.x + lim.w && q.y + q.h <= lim.y + lim.h && !obst.some(o => nuSobrepoe(q, o, m));
  const base = { x: Math.max(lim.x, Math.min(lim.x + lim.w - r.w, r.x)), y: Math.max(lim.y, Math.min(lim.y + lim.h - r.h, r.y)), w: r.w, h: r.h };
  if (cabe(base)) return base;
  for (let raio = 16; raio < 1800; raio += 16) {
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      const q = { x: Math.round(base.x + Math.cos(a) * raio), y: Math.round(base.y + Math.sin(a) * raio), w: r.w, h: r.h };
      if (cabe(q)) return q;
    }
  }
  return null;
}
/** O que já ocupa a tela, nas coordenadas do anel: cabeçalho, relógio e micro-ícones, a janelinha
 *  de área e as janelas flutuantes (quando ele as deixa à vista no Núcleo). */
function nuObstaculos(camada) {
  const c = camada.getBoundingClientRect(), out = [];
  const add = el => { if (!el || el.hidden) return; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; out.push({ x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }); };
  document.querySelectorAll('.nu-hud-esq > *, .nu-hud-dir > *').forEach(add);
  if (document.body.classList.contains('nu-janelas')) document.querySelectorAll('#paineis .pf, #paineis .pf-dock').forEach(add);
  add(camada.querySelector('.nu-anel-ctl'));
  return out;
}
// ── O ARRANJO (09/10, depois que ele arrumou os cartões à mão): "gostaria que automaticamente
//    adotasse uma posição parecida com a que ordenei — algo ao redor do sistema, de acordo com cada
//    dispositivo; gostei do movimento natural de reorganizar, mas quero mais intuitivo e
//    configurável". ÓRBITA = os cartões numa elipse em volta do cérebro, metade de cada lado, de
//    cima para baixo, deixando livres o alto e o pé do cérebro (como ele arrumou). A elipse se mede
//    em cada tela. COLUNAS = o arranjo de antes. Se nenhum couber sem encostar, colunas com rolagem.
const NU_ARRANJOS = { orbita: 'Órbita — em volta do cérebro', colunas: 'Colunas — dos lados' };
const NU_DISTANCIAS = { perto: ['Perto', 0.74], medio: ['Médio', 0.87], longe: ['Longe', 1] };
const NU_ABERTURAS = { estreita: ['Estreita', 35], media: ['Média', 52], ampla: ['Ampla', 68] };
function cfgAnel() {
  const c = cfgNucleo();
  if (!NU_ARRANJOS[c.anelArranjo]) c.anelArranjo = 'orbita';
  if (!NU_DISTANCIAS[c.anelDist]) c.anelDist = 'medio';
  if (!NU_ABERTURAS[c.anelAbre]) c.anelAbre = 'media';
  return c;
}
function mudarAnel(campo, v) { cfgAnel()[campo] = v; salvarNucleo(); posicionarAnel(); }
function reorganizarAnel() { cfgNucleo().pos2 = {}; salvarNucleo(); posicionarAnel(); toast('Cartões de volta ao arranjo automático.'); }
/** A barrinha de arrumação (embaixo, no meio, só com o zoom afastado). */
function htmlCtlAnel() {
  const c = cfgAnel();
  const seg = (campo, mapa) => `<span class="nu-ctl-seg">${Object.entries(mapa).map(([k, v]) => `<button type="button" class="${c[campo] === k ? 'on' : ''}" onclick="mudarAnel('${campo}', '${k}')">${Array.isArray(v) ? v[0] : v.split(' —')[0]}</button>`).join('')}</span>`;
  return `<div class="nu-anel-ctl" title="Como os cartões se arrumam (também em Config → Núcleo). Arraste um cartão para mudá-lo de lugar; solte em cima de outro para trocar os dois.">${seg('anelArranjo', NU_ARRANJOS)}${c.anelArranjo === 'orbita' ? seg('anelDist', NU_DISTANCIAS) : ''}<button type="button" class="nu-ctl-x" title="Devolver todos ao arranjo automático" onclick="reorganizarAnel()">↺</button></div>`;
}
const nuLadoDe = s => ((ANEL_LADO[s.dataset.id] || 'dir') === 'esq' ? 'esq' : 'dir');
/** Onde está o cérebro, nas coordenadas do anel (3D ou a versão leve 2D, que fica deslocada). */
function nuCentroCerebro(el) {
  const ra = el.getBoundingClientRect();
  const alvo = ['nu-3d', 'nu-2d'].map(id => document.getElementById(id)).find(e => e && !e.hidden && e.offsetWidth) || document.getElementById('nu-palco');
  const r = alvo.getBoundingClientRect(), d = alvo.id === 'nu-3d' ? (nuDeslocBase()[1] || 0) : 0;
  return { x: (r.left + r.right) / 2 - ra.left, y: (r.top + r.bottom) / 2 + d - ra.top };
}
/** Põe primeiro os que ele arrastou (onde ele pôs, ou no lugar livre mais perto). */
function nuPorSoltos(soltos, largDe, ctx) {
  const sobra = [];
  soltos.forEach(s => {
    const pp = ctx.pos2['sat-' + s.dataset.id], w = largDe(s);
    s.style.setProperty('--w', w + 'px');
    const q = nuLugarLivre({ x: pp.x * ctx.W, y: pp.y * ctx.H, w, h: s.offsetHeight }, [...ctx.obst, ...ctx.ocupados], ctx.lim, 10);
    if (!q) { sobra.push(s); return; }
    ctx.ocupados.push(q); ctx.lugares.set(s, q);
  });
  return sobra;
}
function nuArranjoOrbita(ctx, soltos, auto) {
  const c = cfgAnel(), dist = NU_DISTANCIAS[c.anelDist][1], abre = NU_ABERTURAS[c.anelAbre][1] * Math.PI / 180;
  const { W, H } = ctx, cc = nuCentroCerebro(ctx.el);
  const larg = Math.round(Math.max(220, Math.min(NU_SAT_LARG, W * 0.16)));
  const rx = Math.max(0, Math.min(cc.x, W - cc.x) - larg / 2 - 16) * dist;
  const ry = Math.max(0, Math.min(cc.y, H - cc.y) - 30) * dist;
  if (rx < larg || ry < 90) return false;
  const R = Math.max(120, Math.min(rx - larg / 2 - 24, ry * 0.85, 440));   // o miolo do cérebro fica livre
  const nucleo = { x: cc.x - R, y: cc.y - R * 0.8, w: R * 2, h: R * 1.6 };
  const resto = nuPorSoltos(soltos, () => larg, ctx);
  const todos = [...auto, ...resto];
  for (const lado of ['esq', 'dir']) {
    const lista = todos.filter(s => nuLadoDe(s) === lado), n = lista.length;
    for (let i = 0; i < n; i++) {
      const s = lista[i];
      s.style.setProperty('--w', larg + 'px');
      const h = s.offsetHeight;
      const t = n === 1 ? 0 : -abre + (2 * abre * i) / (n - 1);          // de cima para baixo
      const th = lado === 'esq' ? Math.PI - t : t;
      const px = cc.x + rx * Math.cos(th), py = cc.y + ry * Math.sin(th);
      const q = nuLugarLivre({ x: px - larg / 2, y: py - h / 2, w: larg, h }, [...ctx.obst, ...ctx.ocupados, nucleo], ctx.lim, 12);
      if (!q) return false;
      ctx.ocupados.push(q); ctx.lugares.set(s, q);
    }
  }
  return true;
}
function posicionarAnel() {
  const el = document.getElementById('nu-anel'); if (!el) return;
  const cards = [...el.querySelectorAll('.nu-sat[data-id]')];
  const espalha = innerWidth > 900 && cards.length > 0;
  el.classList.toggle('espalhado', espalha);
  let ctl = el.querySelector('.nu-anel-ctl');
  if (ctl) ctl.outerHTML = htmlCtlAnel(); else el.insertAdjacentHTML('beforeend', htmlCtlAnel());
  if (!espalha) return;
  const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
  const pos2 = nuPos2(), base = { el, W, H, lim: { x: 0, y: 0, w: W, h: H }, pos2, obst: nuObstaculos(el) };
  const soltos = cards.filter(s => pos2['sat-' + s.dataset.id]), auto = cards.filter(s => !pos2['sat-' + s.dataset.id]);
  const novo = () => Object.assign({}, base, { ocupados: [], lugares: new Map() });
  let ctx = null;
  let viaOrbita = false;
  if (cfgAnel().anelArranjo === 'orbita') { const t = novo(); if (nuArranjoOrbita(t, soltos, auto)) { ctx = t; viaOrbita = true; } }
  if (!ctx) { const t = novo(); if (nuArranjoColunas(t, soltos, auto)) ctx = t; }
  // Não coube em volta do cérebro sem encostar (notebook baixo: 392 px de altura para 10 cartões)?
  // Volta às duas colunas com rolagem própria — empilhadas, mas NUNCA uma em cima da outra.
  // (10/10) para a Config dizer a verdade: em órbita ou caiu para as colunas
  el.dataset.arranjoReal = viaOrbita ? 'orbita' : 'colunas';
  if (!ctx) {
    el.classList.remove('espalhado');
    cards.forEach(s => { ['--x', '--y', '--w'].forEach(v => s.style.removeProperty(v)); s.classList.remove('movido'); });
    return;
  }
  const chegando = [];
  cards.forEach(s => {
    const q = ctx.lugares.get(s); if (!q) return;
    if (!s.style.getPropertyValue('--x')) { s.classList.add('chegando'); chegando.push(s); }   // 1ª vez: nasce no lugar, sem voar do canto
    s.style.setProperty('--x', Math.round(q.x) + 'px'); s.style.setProperty('--y', Math.round(q.y) + 'px');
    s.classList.toggle('movido', !!pos2['sat-' + s.dataset.id]);
  });
  if (chegando.length) requestAnimationFrame(() => requestAnimationFrame(() => chegando.forEach(s => s.classList.remove('chegando'))));
}
/** O arranjo de COLUNAS escalonadas dos dois lados (o de antes). Devolve false se não couber. */
function nuArranjoColunas(ctx, soltos, auto) {
  const { W, H, lim, pos2, obst } = ctx;
  const meio = Math.max(240, Math.min(W * 0.2, 480));            // meia largura reservada ao cérebro
  const cerebro = { x: W / 2 - meio, y: 0, w: meio * 2, h: H };
  const espaco = W / 2 - meio - 12;                               // largura de cada lado
  const ocupados = ctx.ocupados, cards = [...soltos, ...auto];
  let faltou = false;
  const ladoDe = nuLadoDe;
  // Cada lado escolhe quantas colunas usar (e a largura do cartão): no 16:9 uma coluna de 300 px
  // não cabia na altura (754 px para 712) e um cartão ia parar em cima do outro. Testa 1, 2 e 3
  // colunas, mede as alturas reais em cada largura e fica com: mais colunas largas (≥ 260 px,
  // espalha no ultrawide) entre as que cabem; senão a mais larga que cabe; senão a mais baixa.
  const plano = {};
  ['esq', 'dir'].forEach(lado => {
    const lista = cards.filter(s => ladoDe(s) === lado), soltos = lista.filter(s => pos2['sat-' + s.dataset.id]);
    const auto = lista.filter(s => !pos2['sat-' + s.dataset.id]);
    const opcoes = [];
    for (let n = 1; n <= Math.max(1, Math.min(3, auto.length)); n++) {
      const lg = Math.floor(Math.min(NU_SAT_LARG, (espaco - (n - 1) * NU_SAT_VAO) / n));
      if (lg < 220 && n > 1) break;
      lista.forEach(s => s.style.setProperty('--w', lg + 'px'));
      const alt = new Map(lista.map(s => [s, s.offsetHeight]));
      const cols = Array.from({ length: n }, () => ({ itens: [], h: 0 }));
      auto.forEach(s => { const c = cols.reduce((a, b) => (b.h < a.h ? b : a)); c.itens.push(s); c.h += alt.get(s) + NU_SAT_VAO; });
      const alto = Math.max(0, ...cols.map(c => c.h - NU_SAT_VAO));
      opcoes.push({ n, lg, alt, cols, alto, cabe: alto <= H });
    }
    const cabem = opcoes.filter(o => o.cabe);
    const largas = cabem.filter(o => o.lg >= 260);
    const p = largas.length ? largas[largas.length - 1] : cabem.length ? cabem.sort((a, b) => b.lg - a.lg)[0] : opcoes.sort((a, b) => a.alto - b.alto)[0];
    if (p) { lista.forEach(s => s.style.setProperty('--w', p.lg + 'px')); plano[lado] = Object.assign(p, { soltos }); }
  });
  // 1) os que ele arrastou ficam onde ele pôs (ou no lugar livre mais perto)
  ['esq', 'dir'].forEach(lado => {
    const p = plano[lado]; if (!p) return;
    p.soltos.forEach(s => {
      const pp = pos2['sat-' + s.dataset.id];
      const q = nuLugarLivre({ x: pp.x * W, y: pp.y * H, w: p.lg, h: p.alt.get(s) }, [...obst, ...ocupados], lim, 10);
      if (!q) { p.cols[0].itens.push(s); return; }
      ocupados.push(q); ctx.lugares.set(s, q);
    });
  });
  // 2) os outros: colunas escalonadas dos dois lados; a coluna colada no cérebro recebe primeiro
  ['esq', 'dir'].forEach(lado => {
    const p = plano[lado]; if (!p) return;
    p.cols.forEach((c, k) => {
      if (!c.itens.length) return;
      const x = lado === 'esq' ? W / 2 - meio - 12 - (k + 1) * p.lg - k * NU_SAT_VAO : W / 2 + meio + 12 + k * (p.lg + NU_SAT_VAO);
      const total = c.itens.reduce((a, s) => a + p.alt.get(s) + NU_SAT_VAO, -NU_SAT_VAO);
      let y = Math.max(0, Math.min(H - total, (H - total) / 2 + (k % 2 ? 40 : -16)));   // cada coluna numa altura
      c.itens.forEach(s => {
        const h = p.alt.get(s);
        const q = nuLugarLivre({ x, y, w: p.lg, h }, [...obst, ...ocupados, cerebro], lim, 10);
        if (!q) { faltou = true; return; }
        ocupados.push(q); ctx.lugares.set(s, q);
        y = q.y + q.h + NU_SAT_VAO;
      });
    });
  });
  return !faltou;
}
/** O retângulo de DESTINO de um cartão (as variáveis, não a tela: a animação pode estar no meio). */
const nuRetDe = s => ({ x: parseFloat(s.style.getPropertyValue('--x')) || 0, y: parseFloat(s.style.getPropertyValue('--y')) || 0, w: parseFloat(s.style.getPropertyValue('--w')) || s.offsetWidth, h: s.offsetHeight });
/** Arrastar um cartão: de qualquer ponto (menos o ✕). Enquanto arrasta, um contorno tracejado
 *  mostra onde ele vai cair (o lugar livre mais perto). Soltar EM CIMA de outro cartão troca os
 *  dois de lugar — como os ícones do celular. A posição fica guardada neste aparelho. */
function arrastarSat(e, s) {
  const camada = document.getElementById('nu-anel'), c = camada.getBoundingClientRect(), r = s.getBoundingClientRect();
  const a = { x0: e.clientX, y0: e.clientY, ex: r.left - c.left, ey: r.top - c.top, mexeu: false, alvo: null, sobre: null, t: 0 };
  let fantasma = null;
  const mover = ev => {
    const dx = ev.clientX - a.x0, dy = ev.clientY - a.y0;
    if (!a.mexeu && Math.hypot(dx, dy) < 6) return;          // clique trêmulo não vira arrasto
    if (!a.mexeu) {
      a.mexeu = true; s.classList.add('arrastando-sat'); document.body.classList.add('arrastando');
      fantasma = document.createElement('div'); fantasma.className = 'nu-sat-alvo'; camada.appendChild(fantasma);
    }
    s.style.setProperty('--x', Math.round(a.ex + dx) + 'px'); s.style.setProperty('--y', Math.round(a.ey + dy) + 'px');
    if (Date.now() - a.t < 70) return; a.t = Date.now();
    // em cima de outro cartão? (o arrastado não pega o ponteiro: ver .arrastando-sat no CSS)
    const sob = document.elementFromPoint(ev.clientX, ev.clientY);
    const outro = sob && sob.closest('#nu-anel .nu-sat');
    if (a.sobre && a.sobre !== outro) a.sobre.classList.remove('troca');
    a.sobre = outro && outro !== s ? outro : null;
    const eu = nuRetDe(s);
    if (a.sobre) { a.sobre.classList.add('troca'); a.alvo = nuRetDe(a.sobre); }
    else {
      const outros = [...camada.querySelectorAll('.nu-sat[data-id]')].filter(x => x !== s).map(nuRetDe);
      a.alvo = nuLugarLivre(eu, [...nuObstaculos(camada), ...outros], { x: 0, y: 0, w: camada.clientWidth, h: camada.clientHeight }, 10) || eu;
    }
    Object.assign(fantasma.style, { left: a.alvo.x + 'px', top: a.alvo.y + 'px', width: eu.w + 'px', height: eu.h + 'px' });
    fantasma.classList.toggle('troca', !!a.sobre);
  };
  const soltar = () => {
    removeEventListener('pointermove', mover); removeEventListener('pointerup', soltar); removeEventListener('pointercancel', soltar);
    s.classList.remove('arrastando-sat'); document.body.classList.remove('arrastando');
    if (fantasma) fantasma.remove();
    if (a.sobre) a.sobre.classList.remove('troca');
    if (!a.mexeu) return;
    s._arrastou = true; setTimeout(() => { s._arrastou = false; }, 250);   // o soltar não vira clique
    const W = camada.clientWidth || 1, H = camada.clientHeight || 1, pos2 = nuPos2();
    if (a.sobre && a.sobre.dataset.id) {
      // troca: cada um vai para o lugar do outro
      const b = nuRetDe(a.sobre);
      pos2['sat-' + s.dataset.id] = { x: b.x / W, y: b.y / H };
      pos2['sat-' + a.sobre.dataset.id] = { x: a.ex / W, y: a.ey / H };
    } else {
      const q = a.alvo || nuRetDe(s);
      pos2['sat-' + s.dataset.id] = { x: q.x / W, y: q.y / H };
    }
    salvarNucleo();
    posicionarAnel();
  };
  addEventListener('pointermove', mover); addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
}
let nuTimerAnel = null;
window.addEventListener('resize', () => { clearTimeout(nuTimerAnel); nuTimerAnel = setTimeout(() => { if (nuAfastado) posicionarAnel(); }, 160); });
let nuAnelAcoes = [];
function acaoDoAnel(i) { const f = nuAnelAcoes[i]; if (f) f(); }
let nuAfastado = false;
function definirAfastado(sim, veioDoCerebro) {
  if (sim === nuAfastado) return;
  if (sim && nuAreaAberta) fecharJanelaArea(true);   // uma coisa por vez: afastar fecha a janelinha
  nuAfastado = sim;
  const p = document.getElementById('nu-palco'); if (!p) return;
  p.classList.toggle('afastado', sim);
  document.getElementById('nu-btn-afastar').classList.toggle('on', sim);
  if (sim) { renderAnel(); try { localStorage.setItem('lifeos_nucleo_dica', '1'); } catch (e) { } document.getElementById('nu-dica').classList.add('some'); }
  // o anel ocupa a coluna da direita: o cérebro abre espaço (nada fica por baixo de nada)
  if (nu3D) window.JarvisBrain.deslocar(...nuDeslocBase());   // anel dos DOIS lados: o cérebro fica no centro
  if (nu3D && !veioDoCerebro) window.JarvisBrain.zoom(sim ? NU_ZOOM_LONGE : NU_ZOOM_BASE);
}
function alternarAfastar() { definirAfastado(!nuAfastado); }

// ───────────────────────────── janelas flutuantes ──────────────────────────
// No Núcleo a tela fica limpa: as janelas somem, e o chip "Janelas" as chama de volta.
function aplicarJanelasNucleo() {
  document.body.classList.toggle('nu-janelas', !!cfgNucleo().janelas);
  const b = document.getElementById('nu-btn-janelas'); if (b) b.classList.toggle('on', !!cfgNucleo().janelas);
}
function alternarJanelasNucleo() {
  const c = cfgNucleo(); c.janelas = !c.janelas; salvarNucleo(); aplicarJanelasNucleo(); setTimeout(posicionarAnel, 60);
  toast(c.janelas ? 'Janelas flutuantes visíveis no Núcleo.' : 'Núcleo limpo: janelas escondidas aqui.');
}

// ───────────────────────────── Config ──────────────────────────────────────
function renderNucleoConfig() {
  const el = document.getElementById('nucleo-config'); if (!el) return;
  const c = cfgNucleo();
  el.innerHTML = `
    <label class="check-line"><input type="checkbox" ${c.inicio ? 'checked' : ''} onchange="cfgNucleo().inicio = this.checked; salvarNucleo()"> Abrir o app no Núcleo</label>
    <label class="check-line"><input type="checkbox" ${c.anel ? 'checked' : ''} onchange="cfgNucleo().anel = this.checked; salvarNucleo(); renderAnel()"> Anel cultural ao afastar o zoom (obra do dia, sua lista, saídas, aniversários)</label>
    <label class="check-line"><input type="checkbox" ${c.janelas ? 'checked' : ''} onchange="cfgNucleo().janelas = this.checked; salvarNucleo(); aplicarJanelasNucleo()"> Mostrar as janelas flutuantes no Núcleo</label>
    <label style="display:block; margin-top:10px">Cartões que aparecem ao afastar o zoom:</label>
    <div class="nu-cfg-cartoes">${Object.entries(ANEL_NOMES).map(([k, nome]) => `<label class="check-line"><input type="checkbox" ${cartaoLigado(k) ? 'checked' : ''} onchange="cfgNucleo().cartoes['${k}'] = this.checked; salvarNucleo(); renderAnel()"> ${nome} <small class="item-date">(${ANEL_LADO[k] === 'esq' ? 'esquerda' : 'direita'})</small></label>`).join('')}</div>
    <label style="display:block; margin-top:10px">Como esses cartões se arrumam em volta do cérebro:</label>
    <div class="nu-cfg-arranjo">
      <select onchange="mudarAnel('anelArranjo', this.value)" title="Arranjo">${Object.entries(NU_ARRANJOS).map(([k, n]) => `<option value="${k}" ${cfgAnel().anelArranjo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <select onchange="mudarAnel('anelDist', this.value)" title="Distância do cérebro (órbita)">${Object.entries(NU_DISTANCIAS).map(([k, v]) => `<option value="${k}" ${cfgAnel().anelDist === k ? 'selected' : ''}>Distância: ${v[0]}</option>`).join('')}</select>
      <select onchange="mudarAnel('anelAbre', this.value)" title="Quanto do arco a órbita usa">${Object.entries(NU_ABERTURAS).map(([k, v]) => `<option value="${k}" ${cfgAnel().anelAbre === k ? 'selected' : ''}>Abertura: ${v[0]}</option>`).join('')}</select>
      <button type="button" class="mini-btn" onclick="reorganizarAnel()">↺ Devolver todos ao arranjo automático</button>
    </div>
    <p class="hint" style="margin-top:4px">Arraste um cartão para mudar de lugar (o tracejado mostra onde cai); solte em cima de outro para trocar os dois; dois cliques devolvem um só. Vale só neste aparelho.</p>
    <p class="hint" style="margin-top:4px">Órbita, distância e abertura só valem quando os cartões cabem em volta do cérebro sem encostar um no outro (tela grande, ou poucos cartões ligados). Senão eles ficam em duas colunas, com rolagem${nuSemOrbita() === null ? '' : ` — nesta tela, agora: <b>${nuSemOrbita() ? 'em colunas' : 'em órbita'}</b>`}.</p>
    <label style="display:block; margin-top:10px">Abertura (feixe de luz ao entrar):</label>
    <select onchange="escolherAbertura(this.value)">${typeof ABERTURA_MODOS !== 'undefined' ? Object.entries(ABERTURA_MODOS).map(([k, n]) => `<option value="${k}" ${(prefs.abertura || 'som') === k ? 'selected' : ''}>${n}</option>`).join('') : ''}</select>
    <button type="button" class="mini-btn" style="margin-top:6px" onclick="previaAbertura()">▶ Ver a abertura agora</button>
    <label style="display:block; margin-top:10px">Apresentação de primeiro uso:</label>
    <button type="button" class="mini-btn" onclick="abrirApresentacao(false)">👋 Rever a apresentação</button>
    <p class="hint" style="margin-top:4px">Boas-vindas, nome, perfil de trabalho, tema, tour do Núcleo e como sincronizar. Aparece sozinha <strong>só em aparelho novo</strong> (sem nenhum dado salvo) — aqui ela nunca abre por conta própria.</p>
    <label style="display:block; margin-top:10px">Visual do cérebro:</label>
    <select onchange="escolherVisualNucleo(this.value)">${Object.entries(VISUAIS_NUCLEO).map(([k, n]) => `<option value="${k}" ${c.visual === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label style="display:block; margin-top:10px">Fundo do Núcleo:</label>
    <select onchange="escolherFundoNucleo('fundo', this.value)">${Object.entries(NU_FUNDOS).map(([k, n]) => `<option value="${k}" ${c.fundo === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label style="display:block; margin-top:10px">Estilo do Núcleo claro${nuClaro() ? '' : ' <small class="item-date">(vale quando o tema for claro)</small>'}:</label>
    <select onchange="escolherFundoNucleo('claro', this.value)">${Object.entries(NU_ESTILOS_CLAROS).map(([k, n]) => `<option value="${k}" ${c.claro === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <p class="nu-versao">Versão ${GENESIS_VERSAO} · este aparelho: <b>${nu3D ? 'cérebro 3D' : 'versão 2D'}</b> · visual: <b>${visualDoCerebro() === 'leve' ? 'Leve' : 'Genesis'}</b></p>
    <p class="hint" style="margin-top:6px">O cérebro 3D veio do J.A.R.V.I.S. (Trinca de Ases). "Leve" usa a versão 2D, igual em tudo, mais econômica.${nu3DTentou && !nu3D ? ' <b>Este aparelho não abriu o 3D — usando o 2D.</b>' : ''}</p>`;
}
function escolherVisualNucleo(v) {
  cfgNucleo().visual = v; salvarNucleo();
  if (v === 'leve') { nu3D = false; if (window.JarvisBrain) window.JarvisBrain.pausar(); renderCerebro(); return; }
  if (!nu3D) { if (!iniciar3D()) renderCerebro(); return; }
  registrarPaletaGenesis(); window.JarvisBrain.definirVisual(visualDoCerebro()); nuAssinatura = ''; renderCerebro();
}
function escolherFundoNucleo(campo, v) {
  cfgNucleo()[campo] = v; salvarNucleo(); aplicarFundoNucleo();
  if (nu3D) { registrarPaletaGenesis(); window.JarvisBrain.definirVisual(visualDoCerebro()); nuAssinatura = ''; renderCerebro(); }
}

// ───────────────────────────── MARCADORES (estilo Obsidian) ────────────────
// Qualquer "#palavra" escrita num título, nota ou observação vira MARCADOR — em
// qualquer área do app. Os marcadores que já existiam também contam (marcadores das
// notas e dos contatos). No modo "Marcadores" o cérebro mostra cada marcador como uma
// pérola, e cada coisa marcada se liga a TODOS os seus marcadores: a ligação no
// desenho é real — uma tarefa "#viagem #documentos" é a ponte entre os dois.
// Clicar num #marcador em qualquer lugar do app abre o cérebro naquele marcador.
// Não muda o formato de nenhum dado (a sincronização segue igual).
const RE_TAG = /(^|[\s(,;:>])#([\p{L}\p{N}][\p{L}\p{N}_-]{1,29})/gu;
const normTag = t => String(t || '').trim().replace(/^#/, '').toLowerCase();
const nuNomeTag = {};
function lembrarNomeTag(raw) { const k = normTag(raw); if (k && !nuNomeTag[k]) { const r = String(raw).trim().replace(/^#/, ''); nuNomeTag[k] = r.charAt(0).toUpperCase() + r.slice(1); } return k; }
const nomeTag = k => nuNomeTag[k] || (k.charAt(0).toUpperCase() + k.slice(1));
function tagsDoTexto(...txts) {
  const s = new Set();
  txts.forEach(t => { if (!t) return; String(t).replace(RE_TAG, (m, p, tag) => { s.add(lembrarNomeTag(tag)); return m; }); });
  return s;
}
/** Tudo que tem marcador no app: { area, nome, tags:Set, abrir } */
function coisasMarcadas() {
  const out = [];
  const add = (area, nome, tags, abrir) => { if (tags.size) out.push({ area, nome: String(nome || '').replace(RE_TAG, '$1').trim() || '(sem nome)', tags, abrir }); };
  const juntar = (s, arr) => { (Array.isArray(arr) ? arr : String(arr || '').split(',')).forEach(x => { const n = lembrarNomeTag(x); if (n) s.add(n); }); return s; };
  // o que o app JÁ organiza também é marcador: a lista da tarefa, a categoria do lançamento, o tema do estudo, o tipo da saída
  const nomeLista = id => { const l = (typeof tasklists !== 'undefined' ? tasklists : []).find(x => x.id === id); return l && l.id !== 'padrao' ? l.name : ''; };
  const nomeTema = id => { const t = (topics || []).find(x => x.id === id); return t ? t.name : ''; };
  tasks.forEach(t => add('tasks', t.text, juntar(tagsDoTexto(t.text, t.notes, ...(t.subtasks || []).map(s => s.text)), [nomeLista(t.list)].filter(Boolean)), () => { changeTab('tasks'); editar('editarTarefa', t.id); }));
  notes.filter(n => !n.archived).forEach(n => add('notes', n.title || 'Nota', juntar(tagsDoTexto(n.title, n.content, ...(n.checklist || []).map(i => i.text)), n.labels), () => { changeTab('notes'); editar('editarNota', n.id); }));
  events.forEach(e => add('home', e.title, tagsDoTexto(e.title, e.notes, e.minutes), () => { changeTab('home'); editar('editarEvento', e.id); }));
  transactions.forEach((t, i) => add('finances', t.desc, juntar(tagsDoTexto(t.desc, t.notes), [t.category].filter(Boolean)), () => editar('editarTransacao', i)));
  (contacts || []).forEach(c => add('net', c.nome, juntar(tagsDoTexto(c.notas, c.papel), c.tags), () => { irPara('net', 'verSecaoRede', 'contatos'); editar('editarContato', c.id); }));
  (media || []).forEach(m => add('leisure', m.title, tagsDoTexto(m.title, m.comment), () => { changeTab('leisure'); editar('editarMidia', m.id); }));
  (typeof saidas !== 'undefined' ? saidas : []).forEach(s => add('leisure', s.nome, juntar(tagsDoTexto(s.nome, s.notas), [s.tipo].filter(Boolean)), () => { irPara('leisure', 'verSecaoLazer', 'sair'); editar('editarSaida', s.id); }));
  (trips || []).forEach(v => add('trips', v.destino, tagsDoTexto(v.destino, v.notas), () => { irPara('trips', 'verSecaoViagens', 'viagens'); editar('abrirViagem', v.id); }));
  (materials || []).forEach(m => add('studies', m.title, juntar(tagsDoTexto(m.title, m.notes), [nomeTema(m.topicId)].filter(Boolean)), () => { changeTab('studies'); editar('editarMaterial', m.id); }));
  (projects || []).forEach(p => add('business', p.name, tagsDoTexto(p.name, p.desc), () => { changeTab('business'); editar('editarProjeto', p.id); }));
  (goals || []).forEach(g => add('business', g.name, tagsDoTexto(g.name, g.note), () => { changeTab('business'); editar('editarMeta', g.id); }));
  return out;
}
/** tag → coisas, do marcador mais usado ao menos usado */
function mapaMarcadores() {
  const m = new Map();
  coisasMarcadas().forEach(c => c.tags.forEach(t => { if (!m.has(t)) m.set(t, []); m.get(t).push(c); }));
  return new Map([...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])));
}

let nuModo = 'areas';
function definirModoNucleo(m) {
  if (m === nuModo) return;
  nuModo = m; nuAssinatura = '';
  fecharJanelaArea();
  renderCerebro(); renderModoNucleo();
  if (m === 'marcadores' && !mapaMarcadores().size) toast('Escreva #algo em qualquer título, nota ou observação — vira marcador e ganha ligações aqui.', 6000);
}
let nuTags2D = [];
/** No modo Marcadores, a linha de baixo da saudação conta o que existe — e ensina a criar mais. */
function estadoMarcadores() { const m = mapaMarcadores(); const coisas = new Set(); m.forEach(cs => cs.forEach(c => coisas.add(c))); return `Modo Marcadores · ${plural(m.size, 'marcador liga', 'marcadores ligam')} ${plural(coisas.size, 'coisa', 'coisas')}. Escreva #palavra em qualquer texto para criar outro.`; }
function renderModoNucleo() {
  const est = document.getElementById('nu-estado'); if (est) est.textContent = nuModo === 'marcadores' ? estadoMarcadores() : estadoDaAba('focus');
  const b = document.getElementById('nu-mi-modo'); if (b) { b.classList.toggle('on', nuModo === 'marcadores'); b.title = nuModo === 'marcadores' ? 'Marcadores (toque para voltar às Áreas)' : 'Áreas (toque para ver os Marcadores)'; }
}
/** O grafo dos marcadores: cada marcador é uma pérola; cada coisa liga a TODOS os seus marcadores. */
function montarGrafoMarcadores() {
  const nos = [], mapa = {}, links = [];
  const no = (id, d) => { if (mapa[id]) return mapa[id]; const n = { id, grau: 0, ...d }; nos.push(n); mapa[id] = n; return n; };
  const liga = (a, b) => { if (mapa[a] && mapa[b] && a !== b) { links.push({ a: mapa[a], b: mapa[b] }); mapa[a].grau++; mapa[b].grau++; } };
  nuAcoes = {};
  no('centro', { nome: '#', tipo: 'centro', area: null });
  const tags = [...mapaMarcadores().entries()].slice(0, 16);
  const vistos = new Map();
  tags.forEach(([t, coisas]) => {
    no('a-m:' + t, { nome: nomeTag(t), tipo: 'area', area: 'm:' + t, icone: ic('marcador') });
    liga('centro', 'a-m:' + t);
    coisas.slice(0, 14).forEach(c => {
      let id = vistos.get(c);
      if (!id) { id = 'mi-' + vistos.size; vistos.set(c, id); no(id, { nome: c.nome.length > 32 ? c.nome.slice(0, 31) + '…' : c.nome, tipo: 'item', area: 'm:' + t, icone: ic(c.area) }); nuAcoes[id] = c.abrir; }
      liga('a-m:' + t, id);       // a mesma coisa em dois marcadores = uma ponte entre eles
    });
  });
  return { nos, links, tags: tags.map(x => x[0]) };
}
function render2DMarcadores(tags) {
  const el = document.getElementById('nu-2d'); if (!el) return;
  document.getElementById('nu-3d').hidden = true; el.hidden = false;
  const n = tags.length || 1;
  nuTags2D = tags.slice();
  el.innerHTML = `<div class="nu-2d-nucleo"></div>` + (tags.length ? tags.map((t, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / n;
    return `<button class="nu-2d-area" data-area="m:${t}" style="--x:${(50 + Math.cos(ang) * 38).toFixed(2)}%;--y:${(50 + Math.sin(ang) * 36).toFixed(2)}%;--d:${(i * 0.37).toFixed(2)}s" onclick="abrirJanelaMarcador(nuTags2D[${i}])">
      <span class="nu-perola">${ic('marcador')}</span><span class="nu-2d-nome">${esc(nomeTag(t))}</span></button>`;
  }).join('') : `<p class="nu-vazio-marc">Escreva <b>#algo</b> em qualquer título, nota ou observação.<br>Vira marcador — e ganha ligações aqui.</p>`);
}
function abrirJanelaMarcador(tag) {
  const j = document.getElementById('nu-janela'); if (!j) return;
  tag = normTag(tag);
  const coisas = mapaMarcadores().get(tag) || [];
  nuAreaAberta = 'm:' + tag;
  // ligados: outros marcadores que aparecem nas mesmas coisas
  const lig = new Map();
  coisas.forEach(c => c.tags.forEach(t => { if (t !== tag) lig.set(t, (lig.get(t) || 0) + 1); }));
  const porArea = {};
  coisas.forEach(c => { (porArea[c.area] = porArea[c.area] || []).push(c); });
  nuMarcCoisas = coisas; nuTagsLig = [...lig.keys()];
  j.innerHTML = `
    <div class="nu-j-topo">
      <span class="nu-j-ic">${ic('marcador')}</span>
      <div><div class="cs-rotulo">GENESIS <span class="cs-sep">›</span> MARCADOR</div><h2>${esc(nomeTag(tag))}</h2></div>
      <button class="cs-folha-x" onclick="fecharJanelaArea()" title="Fechar">${ic('fechar')}</button>
    </div>
    <p class="nu-j-estado">${coisas.length ? `${plural(coisas.length, 'coisa', 'coisas')} em ${plural(Object.keys(porArea).length, 'área', 'áreas')}.` : 'Nada com este marcador ainda.'}</p>
    ${lig.size ? `<div class="cs-rotulo nu-j-sub">LIGADO A</div><div class="nu-ligados">${[...lig.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t, n]) => `<button class="gn-tag" onclick="abrirMarcador(nuTagsLig[${[...lig.keys()].indexOf(t)}])">${esc(nomeTag(t))}<small>${n}</small></button>`).join('')}</div>` : ''}
    <div class="nu-j-setores">${Object.entries(porArea).map(([area, cs]) => `
      <div class="cs-rotulo nu-j-sub nu-marc-area">${ic(area)}${esc(nomeAba(area)).toUpperCase()}</div>
      ${cs.map(c => `<button class="nu-item" onclick="abrirCoisaMarcada(${coisas.indexOf(c)})"><i class="nu-pt" style="background:var(--acento)"></i><span>${esc(c.nome)}</span><small>${[...c.tags].filter(t => t !== tag).slice(0, 3).map(t => esc(nomeTag(t))).join(' · ')}</small></button>`).join('')}`).join('')}</div>`;
  j.hidden = false; j.classList.remove('fechando'); aplicarPosSalva(j, 'janela');
  definirAfastado(false, true);
  requestAnimationFrame(() => j.classList.add('aberta'));
  document.getElementById('nu-palco').classList.add('com-janela');
  if (nu3D && innerWidth > 900) window.JarvisBrain.deslocar(-160, 0);
}
let nuMarcCoisas = []; let nuTagsLig = [];
function abrirCoisaMarcada(i) { const c = nuMarcCoisas[i]; fecharJanelaArea(); if (c && c.abrir) c.abrir(); }
/** Clicar num #marcador em qualquer lugar do app: vai ao Núcleo, no modo Marcadores, focado nele. */
function abrirMarcador(tag) {
  tag = normTag(tag);
  if (!document.getElementById('nucleo').classList.contains('active')) changeTab('nucleo');
  if (nuModo !== 'marcadores') definirModoNucleo('marcadores');
  abrirJanelaMarcador(tag);
  if (nu3D) tenta(() => window.JarvisBrain.focarArea('m:' + tag));
}
// #marcador clicável no app inteiro: os textos já passam por linkify / textoComLink
function marcarTags(html) {
  return String(html).replace(RE_TAG, (m, p, tag) => `${p}<span class="gn-tag" role="link" tabindex="0" onclick="event.stopPropagation(); abrirMarcador('${normTag(tag)}')">#${tag}</span>`);
}
['linkify', 'textoComLink'].forEach(nome => {
  if (typeof window[nome] !== 'function') return;
  const orig = window[nome];
  window[nome] = function (...a) { const r = orig.apply(this, a); return cascaNova() ? marcarTags(r) : r; };
});

// ───────────────────────────── POP-UPS MÓVEIS ──────────────────────────────
// Regra dele: "uma coisa não pode sobrepor a outra — o pop-up pode passar por cima se EU quiser
// mover ele". Então: no lugar de sempre, cada pop-up tem o seu espaço (e o cérebro abre lugar);
// pegou e arrastou, ele vira livre, pode passar por cima de tudo e o lugar fica guardado neste
// aparelho (prefs.nucleo.pos). Dois cliques na alça devolvem ao lugar de sempre.
function posicoesNucleo() { const c = cfgNucleo(); c.pos = c.pos || {}; return c.pos; }
function soltarElemento(el, x, y, w) {
  el.style.position = 'fixed'; el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.right = 'auto'; el.style.bottom = 'auto'; el.style.transform = 'none'; el.style.margin = '0';
  if (w) el.style.width = w + 'px';
  el.classList.add('solto');
}
function prenderElemento(el) {
  ['position', 'left', 'top', 'right', 'bottom', 'transform', 'margin', 'width', 'zIndex'].forEach(p => { el.style[p] = ''; });
  el.classList.remove('solto');
}
function aplicarPosSalva(el, chave) {
  const p = posicoesNucleo()[chave];
  if (!p) { if (el.classList.contains('solto')) prenderElemento(el); return; }
  const x = Math.max(4, Math.min(innerWidth - 80, p.x)), y = Math.max(4, Math.min(innerHeight - 60, p.y));
  soltarElemento(el, x, y, p.w);
}
let nuArrasto = null;
/** Começa a arrastar `el` a partir de um pointerdown. `chave` = onde guardar (null = não guarda). */
function comecarArrasto(e, el, chave) {
  if (e.button !== undefined && e.button !== 0) return;
  const r = el.getBoundingClientRect();
  nuArrasto = { el, chave, x0: e.clientX, y0: e.clientY, ex: r.left, ey: r.top, w: r.width, mexeu: false };
}
window.addEventListener('pointermove', e => {
  const a = nuArrasto; if (!a) return;
  const dx = e.clientX - a.x0, dy = e.clientY - a.y0;
  if (!a.mexeu && Math.hypot(dx, dy) < 6) return;          // clique trêmulo não vira arrasto
  if (!a.mexeu) { a.mexeu = true; soltarElemento(a.el, a.ex, a.ey, a.w); a.el.style.zIndex = '40'; document.body.classList.add('arrastando'); }
  const x = Math.max(4 - a.w + 80, Math.min(innerWidth - 80, a.ex + dx)), y = Math.max(4, Math.min(innerHeight - 50, a.ey + dy));
  a.el.style.left = x + 'px'; a.el.style.top = y + 'px';
});
window.addEventListener('pointerup', () => {
  const a = nuArrasto; nuArrasto = null; if (!a || !a.mexeu) return;
  document.body.classList.remove('arrastando');
  a.el._arrastou = true; setTimeout(() => { a.el._arrastou = false; }, 250);   // o soltar não vira clique
  if (a.chave) { posicoesNucleo()[a.chave] = { x: parseFloat(a.el.style.left), y: parseFloat(a.el.style.top), w: a.w }; salvarNucleo(); }
});
// alças: o topo da janelinha, o próprio cartão do anel e o título das folhas de formulário
document.addEventListener('pointerdown', e => {
  // a constelação: arrasta de QUALQUER ponto do cartão, inclusive das linhas-botão (menos o ✕);
  // se não mexer, o clique segue normal; se mexer, o clique do soltar é engolido (ver abaixo)
  const satE = e.target.closest('#nu-anel.espalhado .nu-sat');
  if (satE && satE.dataset.id) {
    if (!e.target.closest('.nu-sat-x, input, select, textarea') && (e.button === undefined || e.button === 0)) arrastarSat(e, satE);
    return;
  }
  if (e.target.closest('button, a, input, select, textarea, label, .gn-tag')) return;
  const topo = e.target.closest('#nu-janela .nu-j-topo');
  if (topo) { comecarArrasto(e, document.getElementById('nu-janela'), 'janela'); return; }
  // fora da constelação (tela baixa: colunas com rolagem) o cartão NÃO se solta — solto, ele
  // ficava por cima dos outros para sempre (o "abas sobrepostas que não enxergo" de 09/10)
  if (e.target.closest('#nu-anel .nu-sat')) return;
  const tit = e.target.closest('.cs-folha.aberta > h2, .cs-folha.aberta > h3');
  if (tit) comecarArrasto(e, tit.parentElement, null);
});
document.addEventListener('dblclick', e => {
  const satE = e.target.closest('#nu-anel.espalhado .nu-sat');
  if (satE && satE.dataset.id && !e.target.closest('.nu-sat-x')) {
    if (!nuPos2()['sat-' + satE.dataset.id]) return;
    delete nuPos2()['sat-' + satE.dataset.id]; salvarNucleo(); posicionarAnel();
    toast('De volta ao lugar de sempre.'); return;
  }
  const topo = e.target.closest('#nu-janela .nu-j-topo');
  const sat = e.target.closest('#nu-anel .nu-sat');
  const alvo = topo ? document.getElementById('nu-janela') : sat;
  const chave = topo ? 'janela' : sat && sat.dataset.id ? 'sat-' + sat.dataset.id : null;
  if (!alvo || !chave) return;
  delete posicoesNucleo()[chave]; salvarNucleo(); prenderElemento(alvo);
  toast('De volta ao lugar de sempre.');
});
// o soltar de um arrasto não pode disparar o clique do cartão
document.addEventListener('click', e => { const el = e.target.closest('.nu-sat, .nu-janela'); if (el && el._arrastou) { e.stopPropagation(); e.preventDefault(); } }, true);
// a folha volta ao centro na próxima vez que abrir
if (typeof fecharFolha === 'function') {
  const _fecharFolhaN = fecharFolha;
  fecharFolha = function (card, salvou) { const c = card || folhaAberta; const r = _fecharFolhaN(card, salvou); if (c) prenderElemento(c); return r; };
}

// ───────────────────────────── O MINI-NÚCLEO DE CADA PÁGINA (item 7) ───────
// Cada aba ganha, no cabeçalho, uma pequena constelação: o núcleo da área no centro
// (com o ícone dela) e os SETORES em volta como satélites ligados por fios — cada um
// com a quantidade e a cor da urgência. É o resumo de todas as sub-partes da área
// (pedido dele: "o painel de cada aba deve conter o resumo de todas as sub-abas") na
// mesma linguagem do Núcleo, e ocupa o espaço que sobrava à direita.
function miniNucleo(area) {
  const S = tenta(() => setoresDaArea(area)) || [];
  if (!S.length || (S.length === 1 && !S[0].itens.length && S[0].nome === 'Abrir a área')) return '';
  const W = 420, H = 210, cx = W / 2, cy = H / 2 + 4, rx = 158, ry = 74;
  const n = S.length;
  const pos = S.map((s, i) => {
    const ang = (-90 + (360 / n) * i + (n === 2 ? 90 : n === 3 ? 30 : 45)) * Math.PI / 180;
    return { x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry };
  });
  const cor = s => { const u = s.itens.reduce((m, x) => Math.max(m, x.urg), -1); return u === 2 ? 'var(--perigo)' : u === 1 ? 'var(--atencao)' : s.itens.length ? 'var(--acento)' : 'var(--borda3)'; };
  return `<div class="cs-orbe" role="group" aria-label="Resumo de ${esc(nomeAba(area))}">
    <svg class="cs-orbe-fios" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />
      ${pos.map((p, i) => `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" style="stroke:${cor(S[i])}" />`).join('')}
    </svg>
    <div class="cs-orbe-nucleo" style="left:${(cx / W * 100).toFixed(2)}%;top:${(cy / H * 100).toFixed(2)}%">${ic(area)}</div>
    ${S.map((s, i) => `<button class="cs-orbe-sat${s.itens.length ? '' : ' vazio'}" style="left:${(pos[i].x / W * 100).toFixed(2)}%;top:${(pos[i].y / H * 100).toFixed(2)}%;--c:${cor(S[i])}"
        onclick="abrirSetorOrbe('${area}', ${i})" title="${esc(s.nome)}${s.itens[0] ? ' — ' + esc(s.itens[0].nome) : ''}">
        <b>${s.itens.length || '–'}</b><small>${esc(s.nome)}</small></button>`).join('')}
  </div>`;
}
function abrirSetorOrbe(area, i) { const s = (tenta(() => setoresDaArea(area)) || [])[i]; if (s && s.abrir) s.abrir(); }
/** 09/10 (cara única): o mesmo resumo da mini-órbita, em PÍLULAS ao lado do título — ele achou
 *  que as bolinhas ocupavam espaço demais. Mesma cor de urgência, mesmo clique. */
function pilulasDaAba(area) {
  const S = (tenta(() => setoresDaArea(area)) || []).filter(s => s.nome !== 'Abrir a área');
  if (!S.length) return '';
  const cor = s => { const u = s.itens.reduce((m, x) => Math.max(m, x.urg), -1); return u === 2 ? 'var(--perigo)' : u === 1 ? 'var(--atencao)' : s.itens.length ? 'var(--acento)' : 'var(--borda3)'; };
  return `<div class="cs-setores" role="group" aria-label="Resumo de ${esc(nomeAba(area))}">${S.map((s, i) => `<button type="button" class="cs-setor${s.itens.length ? '' : ' vazio'}" style="--c:${cor(s)}" onclick="abrirSetorOrbe('${area}', ${i})" title="${esc(s.nome)}${s.itens[0] ? ' — ' + esc(s.itens[0].nome) : ''}"><i></i><b>${s.itens.length || '–'}</b><span>${esc(s.nome)}</span></button>`).join('')}</div>`;
}
function renderOrbeDaAba(id) {
  const h = document.querySelector(`#${id} > .cs-hero`); if (!h) return;
  let box = h.querySelector('.cs-orbe-lugar');
  if (!box) { box = document.createElement('div'); box.className = 'cs-orbe-lugar'; h.appendChild(box); }
  box.innerHTML = !cascaNova() ? '' : (cfgAparencia().resumo || 'pilulas') === 'orbita' ? miniNucleo(id) : pilulasDaAba(id);
}
// acompanha a aba aberta (e os dados mudando)
if (typeof atualizarCabecalhoAtivo === 'function') {
  const _cabAtivo = atualizarCabecalhoAtivo;
  atualizarCabecalhoAtivo = function () { _cabAtivo(); const sec = document.querySelector('.tab-content.active'); if (sec && sec.id !== 'nucleo') renderOrbeDaAba(sec.id); };
}

// ───────────────────────────── ganchos ─────────────────────────────────────
const _changeTabCasca = changeTab;
changeTab = function (id) {
  if (id !== 'nucleo') fecharJanelaArea();
  _changeTabCasca(id);
  const noNucleo = id === 'nucleo';
  document.body.classList.toggle('nu-ativo', noNucleo);
  if (noNucleo) { renderNucleo(); if (nu3D) { window.JarvisBrain.retomar(); } }
  else if (nu3D) window.JarvisBrain.pausar();
};
const _aplicarCascaOriginal = aplicarCasca;
aplicarCasca = function () {
  _aplicarCascaOriginal();
  const nova = cascaNova();
  const b = document.getElementById('btn-nucleo'); if (b) b.hidden = !nova;
  if (!nova && document.getElementById('nucleo') && document.getElementById('nucleo').classList.contains('active')) changeTab('focus');
  aplicarFundoNucleo();
  if (nu3D) { registrarPaletaGenesis(); window.JarvisBrain.definirVisual(visualDoCerebro()); nuAssinatura = ''; }
  renderNucleoConfig();
};
if (typeof redesenharTudo === 'function') {
  const _redesenharN = redesenharTudo;
  redesenharTudo = function () { _redesenharN(); if (document.body.classList.contains('nu-ativo')) renderNucleo(); };
}
// Esc fecha a janelinha
window.addEventListener('keydown', e => { if (e.key === 'Escape' && nuAreaAberta && !folhaAberta) fecharJanelaArea(); });

// ───────────────────────────── INICIALIZAÇÃO ───────────────────────────────
montarNucleo();
aplicarCasca();            // o botão novo ganha ícone e a regra clássica/nova
if (localStorage.getItem('lifeos_nucleo_dica')) document.getElementById('nu-dica').classList.add('some');
// o 3D é um módulo (carrega depois deste arquivo): espera ele avisar; se não vier, fica o 2D
if (!iniciar3D()) {
  window.addEventListener('jarvis3d-pronto', () => { if (iniciar3D() && document.body.classList.contains('nu-ativo')) renderNucleo(); }, { once: true });
  setTimeout(() => { if (!nu3D) { nu3DTentou = true; renderNucleoConfig(); } }, 4000);
}
if (cascaNova() && cfgNucleo().inicio) changeTab('nucleo'); else renderCerebro();
