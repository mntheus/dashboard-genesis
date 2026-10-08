// ════════════════════════════════════════════════════════════════════════════
// BANCOS DA SAÚDE (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: "coloque mais coisas na aba de saúde… preencha mais, enriqueça
// mais os bancos de dados". Aqui ficam os catálogos que a aba consulta: são
// dado PÚBLICO e fixo (nasce com o app, não sincroniza, não é dado dele).
// O que é dele — os remédios que toma, o que já fez — vive em `medical`.
//
// Os números são REFERÊNCIA geral (tabela TACO/USDA para alimento; Ministério da
// Saúde e SBIm para prevenção). Tudo pode ser ajustado no próprio formulário.
// Carrega ANTES do app.js, como o exercicios.js.
// ════════════════════════════════════════════════════════════════════════════

/** Alimentos comuns: [nome, porção, kcal, proteína em g]. Ao escolher um no
 *  plano alimentar, porção, kcal e proteína se preenchem sozinhos. */
const ALIMENTOS = [
  // cereais, pães e tubérculos
  ['Arroz branco cozido', '4 col. sopa (100 g)', 128, 2.5],
  ['Arroz integral cozido', '4 col. sopa (100 g)', 124, 2.6],
  ['Feijão carioca cozido', '1 concha (86 g)', 65, 4.1],
  ['Feijão preto cozido', '1 concha (86 g)', 66, 3.9],
  ['Macarrão cozido', '1 prato raso (150 g)', 230, 8],
  ['Batata inglesa cozida', '1 unidade (130 g)', 68, 1.6],
  ['Batata-doce cozida', '1 unidade média (150 g)', 116, 0.9],
  ['Mandioca cozida', '2 pedaços (100 g)', 125, 0.6],
  ['Cuscuz de milho', '1 fatia (100 g)', 113, 2.2],
  ['Tapioca (goma)', '1 unidade (50 g de goma)', 120, 0],
  ['Pão francês', '1 unidade (50 g)', 150, 4],
  ['Pão de forma integral', '2 fatias (50 g)', 124, 6],
  ['Pão de queijo', '1 unidade média (40 g)', 145, 2],
  ['Aveia em flocos', '2 col. sopa (30 g)', 118, 4.2],
  ['Granola', '3 col. sopa (30 g)', 130, 3],
  ['Wrap / tortilha', '1 unidade (40 g)', 120, 3],
  ['Farofa', '2 col. sopa (30 g)', 120, 0.6],
  ['Batata frita', '1 porção (100 g)', 300, 3.4],
  // proteínas
  ['Ovo cozido', '1 unidade (50 g)', 73, 6.6],
  ['Ovo frito', '1 unidade', 110, 7],
  ['Ovos mexidos', '2 unidades', 180, 13],
  ['Clara de ovo', '1 unidade (33 g)', 17, 3.6],
  ['Peito de frango grelhado', '1 filé (100 g)', 159, 32],
  ['Coxa de frango assada', '1 unidade (100 g)', 215, 28],
  ['Patinho grelhado', '1 bife (100 g)', 219, 36],
  ['Alcatra grelhada', '1 bife (100 g)', 241, 32],
  ['Carne moída refogada', '3 col. sopa (100 g)', 212, 27],
  ['Picanha grelhada', '1 fatia (100 g)', 289, 26],
  ['Tilápia grelhada', '1 filé (100 g)', 128, 26],
  ['Salmão grelhado', '1 posta (100 g)', 229, 24],
  ['Atum em água', '1 lata drenada (100 g)', 116, 26],
  ['Sardinha em lata', '1 lata drenada (85 g)', 170, 20],
  ['Lombo de porco assado', '1 fatia (100 g)', 210, 36],
  ['Linguiça grelhada', '1 gomo (80 g)', 237, 18],
  ['Presunto', '2 fatias (30 g)', 28, 4.2],
  ['Peito de peru', '2 fatias (30 g)', 33, 6],
  ['Tofu', '1 fatia (100 g)', 76, 8],
  // laticínios
  ['Queijo muçarela', '2 fatias (30 g)', 99, 6.8],
  ['Queijo minas frescal', '1 fatia (30 g)', 79, 5.2],
  ['Queijo cottage', '2 col. sopa (50 g)', 49, 5.6],
  ['Requeijão', '1 col. sopa (30 g)', 78, 2.9],
  ['Iogurte natural', '1 pote (170 g)', 87, 7],
  ['Iogurte grego natural', '1 pote (100 g)', 97, 9],
  ['Leite integral', '1 copo (200 ml)', 122, 6.4],
  ['Leite desnatado', '1 copo (200 ml)', 70, 6.8],
  ['Whey protein', '1 dose (30 g)', 120, 24],
  ['Barra de proteína', '1 unidade (45 g)', 170, 15],
  // frutas
  ['Banana', '1 unidade (70 g)', 69, 0.9],
  ['Maçã', '1 unidade (130 g)', 73, 0.4],
  ['Mamão papaia', '½ unidade (150 g)', 60, 0.8],
  ['Laranja', '1 unidade (180 g)', 67, 1.6],
  ['Morango', '10 unidades (120 g)', 36, 1.1],
  ['Abacate', '2 col. sopa (60 g)', 58, 0.7],
  ['Uva', '1 cacho pequeno (100 g)', 53, 0.7],
  ['Melancia', '1 fatia (200 g)', 66, 1.8],
  ['Manga', '1 unidade (150 g)', 108, 0.6],
  ['Açaí (polpa sem açúcar)', '1 pacote (100 g)', 58, 0.8],
  // verduras e legumes
  ['Salada de folhas', '1 prato (50 g)', 6, 0.7],
  ['Tomate', '1 unidade (100 g)', 15, 1.1],
  ['Brócolis cozido', '1 xícara (100 g)', 25, 2.1],
  ['Cenoura crua', '1 unidade (70 g)', 24, 0.9],
  ['Abobrinha refogada', '3 col. sopa (100 g)', 25, 1],
  ['Legumes no vapor', '1 xícara (100 g)', 35, 1.5],
  // gorduras e oleaginosas
  ['Azeite', '1 col. sopa (13 ml)', 108, 0],
  ['Manteiga', '1 col. chá (10 g)', 73, 0],
  ['Pasta de amendoim', '1 col. sopa (15 g)', 94, 3.9],
  ['Castanha-do-pará', '2 unidades (8 g)', 52, 1.2],
  ['Castanha de caju', '10 unidades (15 g)', 85, 2.8],
  ['Amendoim torrado', '1 punhado (30 g)', 182, 6.8],
  // bebidas e outros
  ['Café sem açúcar', '1 xícara (50 ml)', 2, 0],
  ['Café com leite', '1 xícara (200 ml)', 110, 5],
  ['Suco de laranja natural', '1 copo (250 ml)', 92, 1.7],
  ['Refrigerante', '1 lata (350 ml)', 149, 0],
  ['Cerveja', '1 lata (350 ml)', 144, 1.4],
  ['Mel', '1 col. sopa (20 g)', 62, 0],
  ['Chocolate ao leite', '1 barrinha (25 g)', 135, 1.8],
  ['Pizza de muçarela', '1 fatia (100 g)', 270, 11],
  ['Hambúrguer de lanchonete', '1 unidade', 500, 25],
  ['Salgado frito (coxinha, pastel)', '1 unidade (80 g)', 240, 8],
  ['Lasanha à bolonhesa', '1 porção (250 g)', 400, 21],
  ['Strogonoff de frango', '1 porção (150 g)', 230, 18]
];
const ALIMENTO_POR_NOME = new Map(ALIMENTOS.map(a => [a[0].toLowerCase(), a]));

/** O que dá para pôr na rotina do Médico. `cuidado` é o hábito médico que não
 *  é comprimido: medir pressão, colírio, fisioterapia… */
const TIPOS_ROTINA = {
  remedio:    ['💊', 'Remédio'],
  suplemento: ['🌿', 'Suplemento'],
  topico:     ['🧴', 'Uso tópico'],
  cuidado:    ['🩺', 'Cuidado de rotina']
};
/** Sugestões para o campo "o quê" (o datalist). Ele é médico: não precisa de
 *  bula, só de não digitar o nome inteiro toda vez. */
const ROTINA_SUGESTOES = {
  remedio: ['Losartana', 'Enalapril', 'Anlodipino', 'Hidroclorotiazida', 'Atenolol', 'Metformina', 'Gliclazida',
    'Sinvastatina', 'Atorvastatina', 'Rosuvastatina', 'AAS', 'Omeprazol', 'Pantoprazol', 'Levotiroxina',
    'Sertralina', 'Escitalopram', 'Fluoxetina', 'Bupropiona', 'Venlafaxina', 'Clonazepam', 'Zolpidem',
    'Dipirona', 'Paracetamol', 'Ibuprofeno', 'Loratadina', 'Desloratadina', 'Budesonida spray nasal',
    'Anticoncepcional', 'Isotretinoína', 'Finasterida', 'Colírio lubrificante'],
  suplemento: ['Vitamina D', 'Vitamina B12', 'Ômega 3', 'Creatina', 'Whey protein', 'Magnésio', 'Ferro',
    'Ácido fólico', 'Multivitamínico', 'Melatonina', 'Zinco', 'Colágeno'],
  topico: ['Protetor solar', 'Minoxidil', 'Hidratante', 'Pomada', 'Ácido retinoico'],
  cuidado: ['Medir a pressão', 'Medir a glicemia', 'Fio dental', 'Fisioterapia', 'Alongamento', 'Pesar-se',
    'Colírio', 'CPAP', 'Insulina', 'Desligar telas antes de dormir']
};

/** Agenda de PREVENÇÃO: o que um adulto costuma refazer de tempos em tempos.
 *  `meses: 0` = uma vez na vida (esquema completo). `acha` reconhece o que ELE
 *  já registrou em Consultas e exames, sem ele precisar redigitar. Os
 *  intervalos são referência geral; ele pode esconder ou mudar cada um. */
const PREVENCAO = [
  { k: 'checkup',  ic: '🩺', nome: 'Check-up clínico', meses: 12, tipo: 'consulta', acha: /check.?up|cl[ií]nico geral|consulta de rotina/i },
  { k: 'sangue',   ic: '🧪', nome: 'Exames de sangue de rotina', sub: 'hemograma, glicemia, colesterol', meses: 12, tipo: 'exame', acha: /hemograma|glicemia|lip[ií]d|colesterol|exames? de sangue|exames? de rotina/i },
  { k: 'pressao',  ic: '🩸', nome: 'Pressão arterial', sub: 'conta a medida registrada em Corpo', meses: 12, tipo: 'medida', acha: /press[aã]o arterial|aferir press/i },
  { k: 'dentista', ic: '🦷', nome: 'Dentista', sub: 'revisão e limpeza', meses: 6, tipo: 'consulta', acha: /dentista|odonto|limpeza dent/i },
  { k: 'olhos',    ic: '👁️', nome: 'Oftalmologista', meses: 24, tipo: 'consulta', acha: /oftalm|exame de vista/i },
  { k: 'pele',     ic: '🔎', nome: 'Dermatologista', sub: 'mapeamento de pintas', meses: 12, tipo: 'consulta', acha: /dermat|pintas/i },
  { k: 'gripe',    ic: '💉', nome: 'Vacina da gripe', meses: 12, tipo: 'vacina', acha: /gripe|influenza/i },
  { k: 'covid',    ic: '💉', nome: 'COVID-19 (reforço)', meses: 12, tipo: 'vacina', acha: /covid|coronav/i },
  { k: 'tetano',   ic: '💉', nome: 'Difteria e tétano (dT)', sub: 'reforço a cada 10 anos', meses: 120, tipo: 'vacina', acha: /t[eé]tano|dtpa|\bdt\b|difteria/i },
  { k: 'hepb',     ic: '💉', nome: 'Hepatite B', sub: 'esquema completo, uma vez', meses: 0, tipo: 'vacina', acha: /hepatite b/i },
  { k: 'febream',  ic: '💉', nome: 'Febre amarela', sub: 'dose única', meses: 0, tipo: 'vacina', acha: /febre amarela/i },
  { k: 'intestino', ic: '🧬', nome: 'Rastreio de câncer colorretal', sub: 'a partir dos 45 anos', meses: 12, tipo: 'exame', idade: 45, acha: /sangue oculto|colonoscop|colorretal/i },
  { k: 'colo',     ic: '🧬', nome: 'Papanicolau', sub: 'a partir dos 25 anos', meses: 36, tipo: 'exame', idade: 25, sexo: 'f', acha: /papanicolau|citopatol|preventivo ginec/i },
  { k: 'mama',     ic: '🧬', nome: 'Mamografia', sub: 'a partir dos 50 anos', meses: 24, tipo: 'exame', idade: 50, sexo: 'f', acha: /mamograf/i }
];
