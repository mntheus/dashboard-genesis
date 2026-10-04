// ════════════════════════════════════════════════════════════════════════════
// APRESENTAÇÃO DE PRIMEIRO USO (Etapa 1 da fila, 04/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Quem abre o Genesis pela primeira vez (um amigo, um aparelho novo) vê, depois
// da abertura do Jarvis: boas-vindas → o nome → o perfil de trabalho → o tema →
// um tour curto do Núcleo (micro-ícones, afastar, marcadores) → como sincronizar.
//
// QUANDO APARECE SOZINHA: só em aparelho virgem. A conta é feita no index.html,
// ANTES do app.js rodar, porque a própria partida do app já grava chaves
// (lifeos_prefs, ritual, rotinas, sync_meta) e um aparelho virgem passaria a
// parecer usado. O resultado chega aqui em `window.GENESIS_PRIMEIRO_USO`.
//   lifeos_apresentacao = '1'        → já viu, ou já era usuário antigo: nunca aparece
//   lifeos_apresentacao = 'pendente' → começou e fechou o app no meio: aparece de novo
// A chave é só deste aparelho (como lifeos_nucleo_dica), fora da sincronização.
//
// Rever a qualquer hora: ⚙️ Config → Núcleo → "Rever a apresentação".
//
// Nada aqui inventa dado: o nome passa por salvar('profile', …), o perfil é o
// escolherPerfilTrabalho() de sempre e o tema é o cfgAparencia() de sempre.
// ════════════════════════════════════════════════════════════════════════════

const AP_MICRO = [
  ['aviso',    'O Genesis te avisa',  'conta a vencer, tarefa atrasada, consulta chegando'],
  ['dia',      'O dia',               'o principal de hoje em quatro linhas'],
  ['marcador', 'Marcadores',          'troca o cérebro de Áreas para Marcadores'],
  ['afastar',  'Afastar',             'o cérebro diminui e as descobertas aparecem em volta'],
  ['janelas',  'Janelas flutuantes',  'mostra ou esconde as janelinhas aqui no Núcleo']
];

/** Os passos. `html` é desenhado a cada entrada; `aoEntrar` roda depois de desenhar. */
const AP_PASSOS = [
  {
    chave: 'boas-vindas',
    titulo: 'Bem-vindo ao Genesis',
    html: () => `
      <p class="ap-texto">O Genesis é um <b>Life OS</b>: agenda, dinheiro, tarefas, notas, estudos,
      saúde, viagens e mais — tudo num lugar só, guardado <b>no seu aparelho</b>.
      Funciona sem internet e nada sai daqui sem você mandar.</p>
      <p class="ap-texto ap-texto2">São cinco telas rápidas para deixar o app com a sua cara.
      Você pode pular e mexer depois: tudo que liga e desliga está em ⚙️ Config.</p>`
  },
  {
    chave: 'nome',
    titulo: 'Como posso te chamar?',
    html: () => `
      <div class="ap-campos">
        <div><label for="ap-nome">Seu nome</label>
          <input type="text" id="ap-nome" placeholder="Ex.: Ana" autocomplete="off" maxlength="40"></div>
        <div><label for="ap-iniciais">Iniciais ou apelido</label>
          <input type="text" id="ap-iniciais" placeholder="Ex.: ARS" autocomplete="off" maxlength="12"></div>
      </div>
      <p class="ap-hint">O nome aparece no cumprimento (“Bom dia, Ana”); as iniciais, no cabeçalho.
      Pode deixar em branco e preencher depois em ⚙️ Config → Perfil.</p>`,
    aoEntrar: () => {
      const n = document.getElementById('ap-nome'), i = document.getElementById('ap-iniciais');
      n.value = profile.name || ''; i.value = profile.initials || '';
      n.addEventListener('input', apNomeMudou); i.addEventListener('input', apNomeMudou);
      setTimeout(() => n.focus(), 120);
    },
    aoSair: () => apGravarNome()
  },
  {
    chave: 'perfil',
    titulo: 'Como você chama o seu trabalho?',
    html: () => `
      <div class="ap-opcoes" id="ap-perfis">${Object.entries(PERFIS_TRABALHO).map(([k, p]) => `
        <button type="button" class="ap-opcao" data-k="${k}" onclick="apEscolherPerfil('${k}')">
          <b>${p.ic} ${esc(p.nome)}</b><small>${esc(p.dica)}</small></button>`).join('')}</div>
      <p class="ap-hint">Isto muda só as <b>palavras e o ícone</b> da aba de trabalho — nenhum dado é
      diferente. Plantão, obra, atendimento e lote de produção usam exatamente os mesmos campos.</p>`,
    aoEntrar: () => apMarcarPerfil()
  },
  {
    chave: 'tema',
    titulo: 'Escolha a sua cor',
    html: () => `
      <div class="temas-lista ap-temas" id="ap-temas">${Object.entries(TEMAS).map(([k, t]) => `
        <button type="button" class="tema-chip" data-k="${k}" onclick="apEscolherTema('${k}')"
          style="background:${t[2]}; border-color:${t[3]}"><span>${t[0]}</span>
          <small style="color:${t[3]}">${t[1]}</small></button>`).join('')}</div>
      <p class="ap-hint">Os claros vêm primeiro, depois os escuros. O tema vale <b>só neste aparelho</b> —
      o PC pode ficar claro e o celular escuro. Troque quando quiser em ⚙️ Config → Aparência.</p>`,
    aoEntrar: () => apMarcarTema()
  },
  {
    chave: 'nucleo',
    titulo: 'O Núcleo',
    html: () => `
      <p class="ap-texto">É a tela de entrada: na tela, só a saudação e o cérebro. Cada pérola é uma
      área da sua vida; tocar numa pérola abre o resumo, e <b>“Abrir ›”</b> leva à página completa.</p>
      <div class="ap-tour">
        <div class="ap-tour-l">
          <div class="ap-micro">${AP_MICRO.map(m => ic(m[0])).join('')}</div>
          <div><b>Os micro-ícones</b><small>No alto, à direita. Nada grita na tela: o que você precisa
            saber mora atrás destes cinco botõezinhos.</small>
            <ul class="ap-lista">${AP_MICRO.map(m => `<li>${ic(m[0])}<span><b>${m[1]}</b> — ${m[2]}</span></li>`).join('')}</ul>
          </div>
        </div>
        <div class="ap-tour-l">
          <div class="ap-micro">${ic('afastar')}</div>
          <div><b>Afastar</b><small>Role o mouse para trás (ou afaste com dois dedos). O cérebro diminui e
            em volta aparecem as <b>descobertas</b>: a obra do dia, o filme da sua lista, a próxima saída,
            um aniversário chegando, a cotação.</small></div>
        </div>
        <div class="ap-tour-l">
          <div class="ap-micro">${ic('marcador')}</div>
          <div><b>Marcadores</b><small>Escreva <b>#algo</b> em qualquer título, nota ou observação — em
            qualquer área. Vira marcador. No Núcleo, cada marcador é uma pérola ligada a tudo que você
            marcou, e duas coisas com o mesmo marcador viram uma ponte entre elas.</small></div>
        </div>
      </div>`
  },
  {
    chave: 'sync',
    titulo: 'Usar no PC e no celular',
    html: () => `
      <p class="ap-texto">Por padrão o Genesis guarda tudo <b>só neste aparelho</b>. É assim que ele
      funciona offline e é assim que os seus dados não passam por servidor de ninguém.</p>
      <p class="ap-texto ap-texto2">Para ver as mesmas coisas no PC e no celular, você cria uma
      <b>planilha na sua própria conta Google</b> e cola o endereço e a senha dela em
      ⚙️ <b>Config → Sincronização</b>. O app conversa só com a sua planilha — o passo a passo vem junto
      com o app, e ele funciona inteiro sem isso.</p>
      <p class="ap-hint">Quer só uma cópia de segurança? ⚙️ Config → <b>Exportar backup</b> baixa um
      arquivo com tudo, sem depender de nada online.</p>`
  },
  {
    chave: 'fim',
    titulo: 'Pronto!',
    html: () => `
      <p class="ap-texto">${profile.name ? `Boa, <b>${esc(profile.name)}</b>! O ` : 'O '}Genesis está do
      seu jeito. Nada aqui é definitivo: <b>tudo que liga e desliga está em ⚙️ Config</b>, inclusive
      rever esta apresentação e escolher a abertura (com som, só a luz, ou desligada).</p>
      <p class="ap-texto ap-texto2">Comece pelo que já é seu: lance um compromisso na Agenda ou uma
      tarefa, e o Núcleo passa a te contar o dia.</p>`
  }
];

let apN = -1;              // passo atual (-1 = fechada)
let apAuto = false;        // abriu sozinha (primeiro uso) ou pelo botão da Config

function apAberta() { return apN >= 0; }

// ───────────────────────────── gravação ────────────────────────────────────
/** Nome e iniciais: passam por salvar('profile', …), como manda a Regra da Gravação. */
function apGravarNome() {
  const n = document.getElementById('ap-nome'), i = document.getElementById('ap-iniciais');
  if (!n || !i) return;
  const nome = n.value.trim(), ini = i.value.trim().slice(0, 12);
  if (nome === (profile.name || '') && ini === (profile.initials || '')) return;
  profile.name = nome; profile.initials = ini;
  if (!profile.subtitle) profile.subtitle = 'Life OS';
  salvar('profile', profile);
  aplicarPerfil();
  if (typeof renderNucleo === 'function' && document.body.classList.contains('nu-ativo')) renderNucleo();
}
let apTimerNome = null;
function apNomeMudou() { clearTimeout(apTimerNome); apTimerNome = setTimeout(apGravarNome, 600); }

function apEscolherPerfil(p) { escolherPerfilTrabalho(p); apMarcarPerfil(); }
function apMarcarPerfil() {
  const atual = (profile && profile.trabalho) || 'geral';
  document.querySelectorAll('#ap-perfis .ap-opcao').forEach(b => b.classList.toggle('sel', b.dataset.k === atual));
}

function apEscolherTema(t) {
  cfgAparencia().tema = t; salvarAparencia();     // mesmo caminho do escolherTema(), sem o aviso na tela
  apMarcarTema();
  if (typeof renderNucleo === 'function' && document.body.classList.contains('nu-ativo')) renderNucleo();
}
function apMarcarTema() {
  const atual = cfgAparencia().tema;
  document.querySelectorAll('#ap-temas .tema-chip').forEach(b => b.classList.toggle('sel', b.dataset.k === atual));
}

// ───────────────────────────── a tela ──────────────────────────────────────
/** Monta a casca uma vez. Fica como filho direto do <body>: nenhum ancestral com
 *  `filter` pode quebrar o position:fixed (armadilha nº 17). */
function apMontar() {
  let el = document.getElementById('ap-tela');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'ap-tela'; el.className = 'ap-tela'; el.hidden = true;
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'ap-titulo');
  el.innerHTML = `
    <div class="ap-caixa">
      <header class="ap-topo">
        <div class="cs-rotulo"><span class="cs-trinca">A&#9824; <b>A&#9829;</b> <b>A&#9830;</b></span> · GENESIS</div>
        <button type="button" class="ap-pular" id="ap-pular" onclick="apPular()">pular</button>
      </header>
      <h2 class="ap-titulo" id="ap-titulo"></h2>
      <div class="ap-corpo" id="ap-corpo"></div>
      <footer class="ap-rodape">
        <div class="ap-pontos" id="ap-pontos"></div>
        <div class="ap-botoes">
          <button type="button" class="mini-btn" id="ap-voltar" onclick="apVoltar()">‹ Voltar</button>
          <button type="button" class="btn ap-ok" id="ap-ok" onclick="apProximo()">Continuar ›</button>
        </div>
      </footer>
    </div>`;
  document.body.appendChild(el);
  return el;
}

function apIrPara(n) {
  const el = apMontar();
  const saindo = AP_PASSOS[apN];
  if (saindo && saindo.aoSair) tenta(saindo.aoSair);
  apN = Math.max(0, Math.min(AP_PASSOS.length - 1, n));
  const p = AP_PASSOS[apN];
  document.getElementById('ap-titulo').innerHTML = p.titulo;
  const corpo = document.getElementById('ap-corpo');
  corpo.innerHTML = p.html();
  corpo.scrollTop = 0;
  el.dataset.passo = p.chave;
  document.getElementById('ap-pontos').innerHTML =
    AP_PASSOS.map((_, i) => `<i class="${i === apN ? 'on' : i < apN ? 'ja' : ''}"></i>`).join('');
  document.getElementById('ap-voltar').disabled = apN === 0;
  const ultimo = apN === AP_PASSOS.length - 1;
  document.getElementById('ap-ok').innerHTML = ultimo ? 'Entrar no Genesis' : apN === 0 ? 'Começar ›' : 'Continuar ›';
  document.getElementById('ap-pular').hidden = ultimo;
  if (p.aoEntrar) tenta(p.aoEntrar);
}
function apProximo() { if (apN >= AP_PASSOS.length - 1) apFechar(true); else apIrPara(apN + 1); }
function apVoltar() { if (apN > 0) apIrPara(apN - 1); }
function apPular() { apFechar(true); }

function abrirApresentacao(auto) {
  apAuto = !!auto;
  const el = apMontar();
  el.hidden = false;
  document.body.classList.add('ap-ativa');
  requestAnimationFrame(() => el.classList.add('entrou'));
  apIrPara(0);
}

function apFechar(concluida) {
  const saindo = AP_PASSOS[apN];
  if (saindo && saindo.aoSair) tenta(saindo.aoSair);
  const el = document.getElementById('ap-tela');
  apN = -1;
  if (el) { el.classList.remove('entrou'); setTimeout(() => { el.hidden = true; }, 260); }
  document.body.classList.remove('ap-ativa');
  if (concluida) { try { localStorage.setItem('lifeos_apresentacao', '1'); } catch (e) { } }
  // Sem aviso temporário aqui: no Núcleo ele cai em cima da dica "role para afastar"
  // (medido: 8 px de sobreposição no PC) e NADA SOBREPÕE NADA. Quem pulou encontra a
  // apresentação em ⚙️ Config → Núcleo, e o último passo já diz isso.
  if (apAuto) {
    apAuto = false;
    if (typeof cascaNova === 'function' && cascaNova() && typeof changeTab === 'function') changeTab('nucleo');
  }
  if (typeof renderNucleoConfig === 'function') renderNucleoConfig();
}

/** Enter avança. Num botão, num select ou num textarea o Enter continua sendo deles. */
window.addEventListener('keydown', e => {
  if (!apAberta() || e.key !== 'Enter') return;
  const tag = e.target && e.target.tagName;
  if (tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'A') return;
  e.preventDefault(); apProximo();
}, true);

// ───────────────────────────── primeiro uso ────────────────────────────────
/** Espera a abertura do Jarvis terminar — inclusive quando ela está parada
 *  esperando um toque (o navegador exige um toque antes de tocar som). */
function apQuandoAberturaAcabar(fn) {
  const el = document.getElementById('gn-abertura');
  if (!el || el.hidden) { setTimeout(fn, 350); return; }
  const t = setInterval(() => { if (el.hidden) { clearInterval(t); setTimeout(fn, 400); } }, 200);
  setTimeout(() => { clearInterval(t); if (!apAberta()) fn(); }, 60000);   // rede de proteção
}

if (window.GENESIS_PRIMEIRO_USO) apQuandoAberturaAcabar(() => { if (!apAberta()) abrirApresentacao(true); });
