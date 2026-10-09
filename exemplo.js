// ════════════════════════════════════════════════════════════════════════════
// MODO EXEMPLO — O APP INTEIRO PREENCHIDO, SEM TOCAR NOS DADOS DE NINGUÉM (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: "é muito diferente usar o aplicativo e ver os prints… quero que em
// cada aba você coloque uma miniaturazinha que eu possa clicar e ver exemplo de
// como ela fica preenchida" — para o desenvolvedor enxergar o que o app em branco
// não mostra, e um dia para apresentar o app.
//
// COMO FUNCIONA (e por que é seguro):
//   • a miniatura grava UMA marca na sessionStorage (só desta aba do navegador)
//     e recarrega a página;
//   • com a marca, ESTE arquivo — o primeiro script do app — troca o
//     localStorage por um ARMÁRIO NA MEMÓRIA antes de qualquer outro código ler
//     algo: tudo que o app lê vem dos dados de exemplo e tudo que ele grava fica
//     só na memória. O localStorage de verdade não é lido nem escrito, e sem a
//     configuração da planilha não há sincronização nenhuma;
//   • "Sair do exemplo" tira a marca e recarrega: os dados reais voltam intactos.
//   • A aparência deste aparelho (tema, casca) é copiada para o exemplo, para
//     ele ver o app com a cara de sempre — só a cópia, e só para ler.
// A pessoa do exemplo é INVENTADA (nada pessoal: o repositório é público).
// ════════════════════════════════════════════════════════════════════════════

(function () {
  let ativo = false;
  try { ativo = sessionStorage.getItem('genesis_exemplo') === '1'; } catch (e) { ativo = false; }
  window.GENESIS_EXEMPLO = ativo;
  if (!ativo) return;

  // ───────────────────── o armário na memória ─────────────────────
  const L = window.localStorage, P = Storage.prototype, mem = Object.create(null);
  const og = { get: P.getItem, set: P.setItem, rem: P.removeItem, key: P.key, clear: P.clear };
  let aparencia = {};
  try { aparencia = JSON.parse(og.get.call(L, 'lifeos_prefs')) || {}; } catch (e) { aparencia = {}; }
  P.getItem = function (k) { if (this !== L) return og.get.call(this, k); k = String(k); return k in mem ? mem[k] : null; };
  P.setItem = function (k, v) { if (this !== L) return og.set.call(this, k, v); mem[String(k)] = String(v); };
  P.removeItem = function (k) { if (this !== L) return og.rem.call(this, k); delete mem[String(k)]; };
  P.key = function (i) { if (this !== L) return og.key.call(this, i); const ks = Object.keys(mem); return i >= 0 && i < ks.length ? ks[i] : null; };
  P.clear = function () { if (this !== L) return og.clear.call(this); Object.keys(mem).forEach(k => delete mem[k]); };
  const compr = Object.getOwnPropertyDescriptor(P, 'length');
  if (compr && compr.get && compr.configurable) Object.defineProperty(P, 'length', { configurable: true, enumerable: compr.enumerable, get() { return this === L ? Object.keys(mem).length : compr.get.call(this); } });

  // ───────────────────── utilidades das datas ─────────────────────
  const hoje = new Date(), pad = n => String(n).padStart(2, '0');
  const iso = x => x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
  const d = n => iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n));
  const ym = k => { const x = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1); return x.getFullYear() + '-' + pad(x.getMonth() + 1); };
  const ts = n => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n, 15, 0).toISOString();
  const br = iso2 => iso2.slice(8, 10) + '/' + iso2.slice(5, 7) + '/' + iso2.slice(0, 4);
  const S = (k, v) => { mem['lifeos_' + k] = JSON.stringify(v); };
  let id = 100000; const nid = () => ++id;

  // ───────────────────── a pessoa e o aparelho ─────────────────────
  const ap = aparencia.aparencia || {};
  S('prefs', Object.assign({}, aparencia, { abertura: 'off',
    aparencia: Object.assign({ casca: 'nova', tema: 'noite', cores: 'colorido', abas: 'topo', ordem: [], relogio: 'digital', segundos: false, capa: 'auto' }, ap, { ocultas: [] }) }));
  mem.lifeos_apresentacao = '1';
  S('profile', { name: 'Helena', initials: 'HS', subtitle: 'Life OS', trabalho: 'plantao', corpo: { altura: 168, nascimento: '1990-05-12', sexo: 'f' }, producao: { custoKwh: 0.95, maoHora: 25 } });

  // ───────────────────── Agenda: turnos, plantões e compromissos ─────────────────────
  S('places', [
    { id: 90001, name: 'Pronto-socorro infantil 12h', local: 'Hospital Central', time: '07:00', hours: 12, amount: 1400, repete: true, weekdays: [1, 4], desde: d(0), skips: [] },
    { id: 90002, name: 'Regulação noturna', local: 'Central de Regulação', time: '19:00', hours: 12, amount: 1200, repete: true, weekdays: [3], desde: d(0), skips: [] }
  ]);
  const ev = (title, n, time, endTime, type, extra) => Object.assign({ id: nid(), title, date: d(n), time, endTime, type, notes: '', done: false }, extra || {});
  S('events', [
    ev('Reunião com o contador', 0, '18:00', '19:00', 'negocios', { local: 'Escritório', agenda: [{ text: 'Pró-labore do trimestre', done: false }, { text: 'Abertura da filial', done: false }] }),
    ev('Academia', 1, '06:30', '07:30', 'saude'),
    ev('Aniversário da Ana', 2, '20:00', '23:00', 'social', { local: 'Casa da Ana' }),
    ev('Curso de gestão — módulo 3', 3, '19:30', '21:00', 'estudo'),
    ev('Dentista', 5, '10:00', '11:00', 'saude', { local: 'Clínica Sorriso' }),
    ev('Almoço com os sócios', 6, '12:30', '14:00', 'reuniao', { people: 'Ana, Rafael' }),
    ev('Pagar IPVA', 9, '', '', 'pessoal'),
    ev('Congresso de pediatria', 14, '08:00', '18:00', 'trabalho', { local: 'Centro de convenções' })
  ]);

  // ───────────────────── Finanças (12 meses) + plantões já feitos ─────────────────────
  const tx = [], shifts = [];
  for (let k = -11; k <= 0; k++) {
    const m = ym(k), f = 1 + (k % 3) * 0.05;
    tx.push({ id: nid(), date: m + '-05', desc: 'Salário', amount: 6200, type: 'income', category: 'Salário CLT', pending: false, paidAt: m + '-05' });
    tx.push({ id: nid(), date: m + '-10', desc: 'Aluguel', amount: 2200, type: 'expense', category: 'Moradia / Aluguel', pending: k === 0, paidAt: k === 0 ? null : m + '-10' });
    tx.push({ id: nid(), date: m + '-12', desc: 'Supermercado', amount: Math.round(1300 * f), type: 'expense', category: 'Supermercado', pending: false, paidAt: m + '-12' });
    tx.push({ id: nid(), date: m + '-15', desc: 'Conta de luz', amount: Math.round(240 * f), type: 'expense', category: 'Luz', pending: false, paidAt: m + '-15' });
    tx.push({ id: nid(), date: m + '-18', desc: 'iFood', amount: Math.round(380 * f), type: 'expense', category: 'Alimentação', pending: false, paidAt: m + '-18' });
    tx.push({ id: nid(), date: m + '-20', desc: 'Posto de combustível', amount: Math.round(450 * f), type: 'expense', category: 'Combustível', pending: false, paidAt: m + '-20' });
    tx.push({ id: nid(), date: m + '-22', desc: 'Netflix', amount: 55.9, type: 'expense', category: 'Aplicativos e assinaturas', pending: false, paidAt: m + '-22' });
    tx.push({ id: nid(), date: m + '-25', desc: 'Academia', amount: 119.9, type: 'expense', category: 'Academia / Esportes', pending: false, paidAt: m + '-25' });
    [3, 17].forEach(dia => {
      const data = m + '-' + pad(dia);
      if (data > d(0)) return;
      const pago = k < -1, sid = nid();
      shifts.push({ id: sid, paid: pago, paidAt: pago ? m + '-28' : null, date: data, time: '07:00', hours: 12, desc: 'Hospital Central', amount: 1400, notes: '', swap: '', parts: [] });
      tx.push({ id: sid, date: data, desc: 'Plantão: Hospital Central', amount: 1400, type: 'income', category: 'Plantão', pending: !pago, paidAt: pago ? m + '-28' : null });
    });
  }
  tx.push({ id: nid(), date: ym(0) + '-02', desc: 'Restaurante aniversário', amount: 640, type: 'expense', category: 'Alimentação', pending: false, paidAt: ym(0) + '-02' });
  tx.push({ id: nid(), date: ym(0) + '-28', desc: 'IPTU parcela', amount: 310, type: 'expense', category: 'IPTU', pending: true, paidAt: null });
  S('budget', { aberto: true, items: [
    { id: 61, name: 'Salário líquido', kind: 'receita', amount: 6200 }, { id: 62, name: 'Plantão', kind: 'receita', amount: 2800 },
    { id: 63, name: 'Moradia / Aluguel', kind: 'essencial', amount: 2200 }, { id: 64, name: 'Supermercado', kind: 'essencial', amount: 1200 },
    { id: 65, name: 'Luz', kind: 'essencial', amount: 250 }, { id: 66, name: 'Alimentação', kind: 'nao', amount: 600 },
    { id: 67, name: 'Combustível', kind: 'nao', amount: 500 }, { id: 68, name: 'Aplicativos e assinaturas', kind: 'nao', amount: 80 },
    { id: 69, name: 'Academia / Esportes', kind: 'nao', amount: 120 }, { id: 70, name: 'IPTU', kind: 'essencial', amount: 310 }] });
  S('recurring', [
    { id: 81, desc: 'Aluguel', amount: 2200, type: 'expense', category: 'Moradia / Aluguel', day: 10, active: true, since: ym(-11) },
    { id: 82, desc: 'Netflix', amount: 55.9, type: 'expense', category: 'Aplicativos e assinaturas', day: 22, active: true, since: ym(-11) },
    { id: 83, desc: 'Internet', amount: 129.9, type: 'expense', category: 'Celular / Telefonia', day: 27, active: true, since: ym(0) }]);

  // ───────────────────── Tarefas e rotinas ─────────────────────
  S('tasklists', [{ id: 'padrao', name: 'Minhas tarefas' }, { id: 'l901', name: 'Empresa' }, { id: 'l902', name: 'Casa' }, { id: 'l903', name: 'Estudos' }, { id: 'l904', name: 'Rotinas' }]);
  const t = (text, list, due, extra) => Object.assign({ id: nid(), text, done: false, list, due, notes: '', starred: false, subtasks: [], createdAt: id }, extra || {});
  const tarefas = [
    t('Enviar documentos ao contador', 'l901', d(0), { starred: true, subtasks: [{ text: 'Separar notas fiscais', done: true }, { text: 'Extrato do mês', done: true }, { text: 'Mandar por e-mail', done: false }] }),
    t('Pagar DAS do Simples', 'l901', d(-2), { starred: true, notes: 'ver juros' }),
    t('Renovar alvará da empresa', 'l901', d(12), { starred: true }),
    t('Curso PALS — inscrição', 'l903', '', { starred: true }),
    t('Ligar para o banco sobre a tarifa', 'padrao', d(1)),
    t('Comprar filamento PLA preto', 'l901', d(0)),
    t('Trocar a resistência do chuveiro', 'l902', d(-1)),
    t('Ler o artigo de bronquiolite', 'l903', ''),
    t('Organizar fotos do celular', 'padrao', ''),
    t('Levar o carro na revisão', 'l902', d(5), { subtasks: [{ text: 'Agendar horário', done: false }, { text: 'Separar manual', done: false }] }),
    t('Revisar protocolo de sepse pediátrica', 'l903', d(8), { starred: true }),
    t('Responder e-mail da contabilidade sobre a distribuição de lucros', 'l901', d(2))
  ];
  [[0, 'Conferir a escala do plantão'], [0, 'Separar roupa do plantão'], [-1, 'Pagar luz'], [-2, 'Comprar remédio'], [-3, 'Ligar para o síndico'],
   [-5, 'Imprimir peças de teste'], [-5, 'Cotar seguro'], [-6, 'Agendar dentista'], [-8, 'Pagar IPVA'], [-12, 'Trocar óleo']].forEach(([n, tx2]) => tarefas.push(t(tx2, 'padrao', d(n), { done: true, doneAt: ts(n) })));
  const rot = [
    { id: 7001, text: '💸 Conferir extrato e lançar gastos da semana', freq: 'semanal', weekdays: [0], list: 'l904', active: true, count: 5 },
    { id: 7002, text: '✂️ Cortar cabelo', freq: 'apos', interval: 21, list: 'l904', active: true, count: 3 },
    { id: 7003, text: '💾 Exportar backup do Genesis', freq: 'semanal', weekdays: [6], list: 'l904', active: true, count: 2 }
  ];
  const hist = (r, ns, estados) => ns.forEach((n, i) => tarefas.push(t(r.text, r.list, d(n), { routineId: r.id, occur: d(n), done: estados[i] === 1, doneAt: estados[i] === 1 ? ts(n) : undefined })));
  hist(rot[0], [-42, -35, -28, -21, -14, -7], [1, 1, 0, 1, 1, 1]); hist(rot[1], [-63, -42, -21], [1, 1, 1]); hist(rot[2], [-15, -8], [1, 1]);
  rot[0].next = d((7 - hoje.getDay()) % 7 || 7); rot[1].next = d(0); rot[2].next = d((6 - hoje.getDay() + 7) % 7 || 7);
  S('tasks', tarefas); S('routines', rot);

  // ───────────────────── Notas, listas e entregas ─────────────────────
  const nota = (title, content, extra) => Object.assign({ id: nid(), title, content, checklist: null, color: 'default', labels: [], pinned: false, archived: false, createdAt: Date.now() - (id % 90) * 36e5, updatedAt: Date.now() - (id % 40) * 36e5 }, extra || {});
  const lista = (title, itens, extra) => nota(title, '', Object.assign({ checklist: itens.map(x => typeof x === 'string' ? { text: x, done: false } : x), color: 'yellow' }, extra || {}));
  S('notes', [
    nota('Ideias do app', 'Barra rápida em todas as abas\nMural de notas\nRastreador de entregas\nModo exemplo para apresentar', { color: 'purple', labels: ['app', 'ideias'], pinned: true }),
    nota('Wi-Fi da casa', 'Rede: Casa_5G\nSenha está no cofre', { color: 'blue', pinned: true }),
    nota('Reunião da regulação', 'Pauta: escala de dezembro, protocolo de transporte inter-hospitalar, treinamento da equipe. Levar a planilha de horas e conversar sobre a cobertura dos fins de semana do fim do ano.', { color: 'teal', labels: ['trabalho'] }),
    nota('Livros para ler', 'O Mito da Startup\nA Psicologia Financeira\nHábitos Atômicos', { color: 'orange', labels: ['estudos'] }),
    nota('', 'Ligar para a contabilidade sobre o pró-labore', { labels: ['empresa'] }),
    nota('Doses de pediatria', 'Dipirona 10–15 mg/kg/dose\nIbuprofeno 5–10 mg/kg/dose\nParacetamol 10–15 mg/kg/dose', { color: 'red', labels: ['trabalho'] }),
    nota('Viagem a Ouro Preto', 'Pousada perto da praça Tiradentes; ver feriado de novembro.', { color: 'green', labels: ['viagem'] }),
    nota('Treino da semana', 'Seg: peito e tríceps\nQua: costas e bíceps\nSex: pernas', { color: 'mint', labels: ['saúde'] }),
    nota('Presente da mãe', 'Livro de receitas ou o vaso da feira de sábado.', { color: 'rose' }),
    nota('Frase para o site', '"Cuidar de criança é cuidar de família inteira."', { color: 'indigo', labels: ['empresa'] }),
    nota('Conserto do carro', 'Pastilha de freio e alinhamento — orçamento de R$ 480.', { color: 'coral' }),
    lista('Compras', ['Leite', 'Café', { text: 'Pão', done: true }, 'Purificador de água https://www.mercadolivre.com.br/', { text: 'Ovos', done: true }, 'Detergente'], { pinned: true, labels: ['casa'] }),
    lista('Mala do plantão', ['Estetoscópio', 'Carregador', { text: 'Jaleco', done: true }, 'Lanche', { text: "Garrafa d'água", nivel: 1 }, { text: 'Barra de cereal', nivel: 1 }], { color: 'blue', labels: ['trabalho'] }),
    lista('Impressão 3D — peças', [{ text: 'Suporte de celular', done: true }, { text: 'Organizador de cabos', done: true }], { color: 'green', labels: ['empresa'] })
  ]);
  S('orders', [
    { id: nid(), item: 'Filamento PLA preto 1kg', store: 'Amazon', amount: 119.9, url: 'https://www.amazon.com.br/', tracking: 'BR123456789', eta: d(2), status: 'caminho', boughtAt: d(-4), deliveredAt: '', notes: '', financeId: null },
    { id: nid(), item: 'Fone Bluetooth', store: 'Mercado Livre', amount: 249, url: '', tracking: '', eta: d(-3), status: 'caminho', boughtAt: d(-10), deliveredAt: '', notes: '', financeId: null },
    { id: nid(), item: 'Livro A Psicologia Financeira', store: 'Amazon', amount: 49.9, url: '', tracking: '', eta: d(6), status: 'comprado', boughtAt: d(0), deliveredAt: '', notes: '', financeId: null },
    { id: nid(), item: 'Cadeira de escritório', store: 'Magalu', amount: 890, url: '', tracking: '', eta: d(-6), status: 'entregue', boughtAt: d(-15), deliveredAt: d(-5), notes: '', financeId: null }
  ]);

  // ───────────────────── Estudos ─────────────────────
  S('topics', [
    { id: 3101, name: 'Gestão de clínicas', area: 'negocios', weeklyGoalMin: 180, color: '#fbbf24', archived: false, createdAt: 1 },
    { id: 3102, name: 'Urgência pediátrica', area: 'medicina', weeklyGoalMin: 240, color: '#38bdf8', archived: false, createdAt: 2 },
    { id: 3103, name: 'Inglês', area: 'idiomas', weeklyGoalMin: 120, color: '#a78bfa', archived: false, createdAt: 3 },
    { id: 3104, name: 'Investimentos', area: 'investimentos', weeklyGoalMin: 60, color: '#22c55e', archived: false, createdAt: 4 }
  ]);
  S('materials', [
    { id: 3201, topicId: 3101, title: 'O Mito da Startup', kind: 'livro', status: 'andamento', progress: 45, link: '', notes: '', createdAt: 1, updatedAt: Date.now() },
    { id: 3202, topicId: 3102, title: 'PALS — Suporte Avançado de Vida em Pediatria', kind: 'curso', status: 'concluido', progress: 100, link: '', notes: '', createdAt: 2, updatedAt: Date.now() },
    { id: 3203, topicId: 3102, title: 'Diretriz de bronquiolite', kind: 'artigo', status: 'afazer', progress: 0, link: '', notes: '', createdAt: 3, updatedAt: Date.now() },
    { id: 3204, topicId: 3103, title: 'Podcast de inglês para médicos', kind: 'podcast', status: 'andamento', progress: 30, link: '', notes: '', createdAt: 4, updatedAt: Date.now() },
    { id: 3205, topicId: 3104, title: 'A Psicologia Financeira', kind: 'livro', status: 'afazer', progress: 0, link: '', notes: '', createdAt: 5, updatedAt: Date.now() }
  ]);
  const ses = []; [[0, 3102, 50], [-1, 3101, 40], [-1, 3103, 25], [-2, 3102, 60], [-3, 3101, 45], [-4, 3104, 30], [-5, 3102, 50], [-6, 3103, 25], [-8, 3101, 60], [-10, 3102, 40]].forEach(([n, tp, mn]) => ses.push({ id: nid(), topicId: tp, date: d(n), minutes: mn, note: '', createdAt: id }));
  S('sessions', ses);
  const dias = {}; ses.forEach(s => { dias[s.date] = (dias[s.date] || 0) + s.minutes; });
  S('study', { date: br(d(0)), minutes: dias[d(0)] || 0, dias });

  // ───────────────────── Negócios ─────────────────────
  S('assets', [
    { id: 701, name: 'Tesouro Selic 2029', institution: 'Tesouro', klass: 'reserva', current: 18400, currentAt: d(-3), due: '', rate: 'Selic', notes: '', archived: false, createdAt: Date.now() - 200 * 864e5 },
    { id: 702, name: 'CDB 110% CDI', institution: 'Banco digital', klass: 'rf', current: 9300, currentAt: d(-3), due: d(20), rate: '110% CDI', notes: '', archived: false, createdAt: Date.now() - 200 * 864e5 },
    { id: 703, name: 'BOVA11', institution: 'Corretora', klass: 'acao', current: 6200, currentAt: d(-3), due: '', rate: '', notes: '', archived: false, createdAt: Date.now() - 150 * 864e5 },
    { id: 704, name: 'MXRF11', institution: 'Corretora', klass: 'fii', current: 3100, currentAt: d(-3), due: '', rate: '', notes: '', archived: false, createdAt: Date.now() - 120 * 864e5 },
    { id: 705, name: 'Bitcoin', institution: 'Exchange', klass: 'cripto', current: 2400, currentAt: d(-3), due: '', rate: '', notes: '', archived: false, createdAt: Date.now() - 90 * 864e5 }]);
  const mv = [];
  mv.push({ id: nid(), assetId: 701, date: d(-200), type: 'aporte', amount: 12000, note: 'Saldo inicial', financeId: null, initial: true });
  mv.push({ id: nid(), assetId: 702, date: d(-200), type: 'aporte', amount: 8000, note: 'Saldo inicial', financeId: null, initial: true });
  for (let i = 6; i >= 1; i--) { mv.push({ id: nid(), assetId: 701, date: d(-i * 30 + 2), type: 'aporte', amount: 800, note: '', financeId: null }); mv.push({ id: nid(), assetId: 703, date: d(-i * 30 + 5), type: 'aporte', amount: 900, note: '', financeId: null }); }
  mv.push({ id: nid(), assetId: 704, date: d(-100), type: 'aporte', amount: 3000, note: '', financeId: null });
  mv.push({ id: nid(), assetId: 705, date: d(-80), type: 'aporte', amount: 2000, note: '', financeId: null });
  S('moves', mv);
  S('goals', [
    { id: 901, name: 'Reserva de 6 meses', target: 30000, deadline: d(300), linkedTo: 'reserva', note: '', createdAt: Date.now() - 180 * 864e5 },
    { id: 902, name: 'Capital para a clínica', target: 120000, deadline: d(900), linkedTo: 'total', note: 'entrada + equipamentos', createdAt: Date.now() - 240 * 864e5 },
    { id: 903, name: 'Viagem ao Japão', target: 5000, deadline: '', linkedTo: '705', note: '', createdAt: Date.now() - 60 * 864e5 }]);
  S('projects', [
    { id: 951, name: 'Clínica popular', stage: 'estudo', desc: 'Consultas a preço acessível', steps: [{ text: 'Conversar com contador', done: true }, { text: 'Pesquisar ponto comercial', done: false }, { text: 'Estimar custo mensal', done: false }], contacts: 'contador', budget: 5000, spent: 1200, notes: '', createdAt: 1, updatedAt: Date.now() - 2 * 864e5 },
    { id: 952, name: 'Impressão 3D sob encomenda', stage: 'andamento', desc: 'Peças e brindes', steps: [{ text: 'Comprar segunda impressora', done: false }], contacts: '', budget: 3000, spent: 3400, notes: '', createdAt: 1, updatedAt: Date.now() - 864e5 },
    { id: 953, name: 'Curso online para pais', stage: 'ideia', desc: 'Primeiros socorros infantis', steps: [], contacts: '', budget: 0, spent: 0, notes: '', createdAt: 1, updatedAt: Date.now() - 9 * 864e5 },
    { id: 954, name: 'Telemedicina', stage: 'validacao', desc: '', steps: [{ text: 'Validar com 10 pacientes', done: false }], contacts: '', budget: 0, spent: 0, notes: '', createdAt: 1, updatedAt: Date.now() - 5 * 864e5 }]);
  const snaps = {}; [31000, 32500, 33900, 35200, 36100, 37600, 38500].forEach((v, i) => { snaps[ym(i - 6)] = v; });
  S('wealth', { snapshots: snaps, indicators: { cdi: 13.65, selic: 13.75, ipca: 4.22, ref: 'Banco Central' } });

  // ───────────────────── Saúde ─────────────────────
  S('workouts', [
    { id: nid(), date: d(-1), type: 'musculacao', minutes: 60, intensity: 2, exercises: ['Supino reto 4x10 30kg', 'Crucifixo 3x12 10kg', 'Tríceps corda 3x12 20kg'], note: 'Treino A — Peito e tríceps' },
    { id: nid(), date: d(-3), type: 'musculacao', minutes: 55, intensity: 3, exercises: ['Agachamento livre 4x8 40kg', 'Leg press 4x12 100kg'], note: 'Treino B — Pernas' },
    { id: nid(), date: d(-4), type: 'corrida', minutes: 30, intensity: 2, exercises: [], note: '5 km' },
    { id: nid(), date: d(-6), type: 'musculacao', minutes: 50, intensity: 2, exercises: ['Puxada frontal 4x10 35kg', 'Remada 3x10 25kg'], note: 'Treino C — Costas e bíceps' }]);
  S('measures', [[-60, 68.4], [-45, 67.9], [-30, 67.2], [-20, 66.8], [-12, 66.1], [-2, 65.6]].map((p, i) => ({ id: nid(), date: d(p[0]), weight: p[1], waist: 74 - i * 0.4, hip: 98, neck: 32, fat: 26 - i * 0.3, sis: 116, dia: 74, bpm: 66 })));
  S('fichas', [{ id: 301, nome: 'ABC', objetivo: '', criadoEm: 1, dias: [
    { nome: 'A — Peito e tríceps', ultimoUso: d(-1), exercicios: [{ id: 3011, nome: 'Supino reto', grupo: 'peito', series: 4, reps: '10', carga: 30, descanso: 90 }, { id: 3012, nome: 'Tríceps corda', grupo: 'triceps', series: 3, reps: '12', carga: 20, descanso: 60 }] },
    { nome: 'B — Pernas', ultimoUso: d(-3), exercicios: [{ id: 3021, nome: 'Agachamento livre', grupo: 'perna', series: 4, reps: '8', carga: 40, descanso: 120 }] },
    { nome: 'C — Costas e bíceps', ultimoUso: d(-6), exercicios: [{ id: 3031, nome: 'Puxada frontal', grupo: 'costas', series: 4, reps: '10', carga: 35, descanso: 90 }, { id: 3032, nome: 'Remada baixa', grupo: 'costas', series: 3, reps: '12', carga: 30, descanso: 75 }, { id: 3033, nome: 'Rosca direta', grupo: 'biceps', series: 3, reps: '10', carga: 12, descanso: 60 }] }] }]);
  S('dietas', [{ id: 401, nome: 'Dia de treino', ativo: true, criadoEm: 1, refeicoes: [
    { nome: 'Café da manhã', hora: '07:00', itens: [{ id: 4011, alimento: 'Ovos mexidos', qtd: '2 un', kcal: 140, prot: 12 }, { id: 4012, alimento: 'Pão integral', qtd: '2 fatias', kcal: 140, prot: 6 }] },
    { nome: 'Almoço', hora: '12:00', itens: [{ id: 4021, alimento: 'Arroz', qtd: '120 g', kcal: 150, prot: 3 }, { id: 4022, alimento: 'Frango grelhado', qtd: '120 g', kcal: 190, prot: 36 }] },
    { nome: 'Jantar', hora: '20:00', itens: [] }] }]);
  S('meals', [{ id: nid(), date: d(0), time: '07:10', type: 'cafe', desc: 'Café da manhã: ovos e pão', quality: 'boa', planoRef: '401:0' }, { id: nid(), date: d(0), time: '12:30', type: 'almoco', desc: 'Marmita do plantão', quality: 'ok' }]);
  S('medical', [
    { id: nid(), kind: 'consulta', title: 'Dermatologista', date: d(12), time: '15:00', place: 'Clínica X', notes: '', done: false, eventId: null },
    { id: nid(), kind: 'exame', title: 'Hemograma e perfil lipídico', date: d(-200), time: '', place: '', notes: 'tudo normal', done: true, doneAt: d(-200), eventId: null },
    { id: nid(), kind: 'vacina', title: 'Gripe', date: d(-150), time: '', place: 'UBS', notes: '', done: true, doneAt: d(-150), eventId: null },
    { id: nid(), kind: 'medicamento', title: 'Creatina', date: '', time: '', place: '', notes: '', done: false, eventId: null,
      rotina: { tipo: 'suplemento', dose: '5 g', horarios: [], dias: 'todos', semana: [], ate: '', estoque: null, porDose: 1, habito: false, ativo: true, notas: '', inicio: d(-30), cor: '#34d399' },
      tomadas: Object.fromEntries([...Array(14)].map((_, i) => [d(-(i + 1)), ['']]).filter((_, i) => i % 5 !== 3)) },
    { id: nid(), kind: 'medicamento', title: 'Whey protein', date: '', time: '', place: '', notes: '', done: false, eventId: null,
      rotina: { tipo: 'suplemento', dose: '30 g', horarios: [], dias: 'todos', semana: [], ate: '', estoque: null, porDose: 1, habito: false, ativo: true, notas: 'depois do treino', inicio: d(-30), cor: '#a78bfa' },
      tomadas: Object.fromEntries([...Array(14)].map((_, i) => [d(-(i + 1)), ['']]).filter((_, i) => i % 2 === 0)) }]);
  S('hydration', { date: br(d(0)), ml: 1250, goal: 2500, dias: { [d(-1)]: 2400, [d(-2)]: 1900, [d(-3)]: 2600 } });
  S('habits', [{ text: 'Água', icon: '💧', done: false }, { text: 'Treino', icon: '🏋️', done: false }, { text: 'Ler', icon: '📖', done: false }]);

  // ───────────────────── Lazer ─────────────────────
  const md = (title, kind, status, extra) => Object.assign({ id: nid(), title, kind, status, where: '', who: '', url: '', season: 0, episode: 0, rating: 0, comment: '', addedAt: d(-(id % 30)), watchedAt: '' }, extra || {});
  S('media', [
    md('Severance', 'serie', 'assistindo', { where: 'Apple TV+', season: 2, episode: 5 }), md('The Bear', 'serie', 'assistindo', { where: 'Disney+', season: 3, episode: 2 }),
    md('Duna: Parte Dois', 'filme', 'quero', { where: 'Max', who: 'Rafael' }), md('O Poço', 'filme', 'quero', { where: 'Netflix' }), md('Free Solo', 'doc', 'quero', { where: 'Disney+' }),
    md('Frieren', 'anime', 'quero', { where: 'Crunchyroll' }), md('Pobres Criaturas', 'filme', 'quero', {}),
    md('Oppenheimer', 'filme', 'visto', { rating: 5, watchedAt: d(-10), comment: 'trilha absurda' }), md('Ainda Estou Aqui', 'filme', 'visto', { rating: 5, watchedAt: d(-20) }),
    md('Round 6', 'serie', 'visto', { rating: 3, watchedAt: d(-40) })]);
  const sd = (nome, tipo, status, extra) => Object.assign({ id: nid(), nome, tipo, status, cidade: '', local: '', data: '', hora: '', valor: 0, com: '', url: '', notas: '', nota: 0, img: '', sobre: '', wiki: '', buscadoEm: d(-1), eventId: null, addedAt: d(-(id % 20)), feitoEm: '' }, extra || {});
  S('saidas', [
    sd('Show de MPB', 'show', 'marcado', { cidade: 'Belo Horizonte', data: d(3), hora: '21:00', valor: 180, com: 'Ana' }),
    sd('Jantar no restaurante italiano', 'restaurante', 'marcado', { cidade: 'Belo Horizonte', data: d(0), hora: '20:30', valor: 320 }),
    sd('Inhotim', 'museu', 'marcado', { cidade: 'Brumadinho', data: d(9), valor: 50 }),
    sd('Pinacoteca de São Paulo', 'museu', 'quero', { cidade: 'São Paulo' }), sd('Festival de Inverno de Ouro Preto', 'festival', 'quero', { cidade: 'Ouro Preto' }),
    sd('Museu de Artes e Ofícios', 'museu', 'fui', { cidade: 'Belo Horizonte', nota: 4, feitoEm: d(-12) }), sd('Teatro do Galpão', 'teatro', 'fui', { nota: 5, feitoEm: d(-30), valor: 90 })]);
  S('playlists', [
    { id: nid(), name: 'Lo-fi para estudar', url: 'https://open.spotify.com/', moment: 'foco' }, { id: nid(), name: 'Treino pesado', url: 'https://www.youtube.com/', moment: 'treino' },
    { id: nid(), name: 'Madrugada no plantão', url: 'https://open.spotify.com/', moment: 'plantao' }, { id: nid(), name: 'Clube da Esquina', url: 'https://open.spotify.com/', moment: 'viagem' }]);

  // ───────────────────── Viagens e milhas ─────────────────────
  const mala = (tenho, comprar) => ['Documentos (RG/CNH)', 'Carregador', 'Remédios', 'Escova de dentes', 'Roupa íntima', 'Roupa de banho', 'Tênis confortável', 'Fone de ouvido'].map((x, i) => ({ text: x, estado: i < tenho ? 'tenho' : i < tenho + comprar ? 'comprar' : 'falta', done: i < tenho }));
  const docs = tenho => ['Identidade em dia', 'Cartão de vacinas', 'Seguro viagem', 'Reserva impressa/salva', 'Dinheiro trocado'].map((x, i) => ({ text: x, estado: i < tenho ? 'tenho' : 'falta', done: i < tenho }));
  const vg = (destino, inicio, fim, status, extra) => Object.assign({ id: nid(), destino, inicio, fim, status, orcamento: 0, gasto: 0, notas: '', mala: mala(0, 0), docs: docs(0), roteiro: [], reservas: [], createdAt: id }, extra || {});
  S('trips', [
    vg('Lisboa', d(23), d(33), 'confirmada', { orcamento: 15000, gasto: 9200, notas: 'com Ana · ver Sintra', mala: mala(5, 2), docs: docs(3),
      reservas: [{ tipo: 'voo', desc: 'Voo BH → Lisboa', valor: 5400, url: 'ABC123', data: d(23) }, { tipo: 'hotel', desc: 'Hotel no Chiado', valor: 3800, url: '', data: d(23) }],
      roteiro: [{ dia: d(24), texto: 'Alfama e Castelo de São Jorge' }, { dia: d(25), texto: 'Sintra (bate-volta)' }, { dia: '', texto: 'Pastéis de Belém' }] }),
    vg('Rio de Janeiro', d(58), d(61), 'planejando', { orcamento: 3000, mala: mala(2, 0), docs: docs(1) }),
    vg('Ouro Preto', d(-80), d(-77), 'feita'), vg('Salvador', d(-200), d(-194), 'feita'), vg('Buenos Aires', d(-400), d(-395), 'feita'),
    vg('Japão', '', '', 'ideia', { notas: 'cerejeiras em abril' }), vg('Patagônia', '', '', 'ideia')]);
  S('milhas', [
    { id: nid(), programa: 'Smiles', numero: '', saldo: 45000, saldoEm: d(-3), validade: d(40), custoMilheiro: 0, notas: '',
      movs: [{ id: nid(), tipo: 'compra', qtd: 20000, valor: 340, data: d(-60), desc: 'Promoção 100%', tripId: null }, { id: nid(), tipo: 'resgate', qtd: 30000, valor: 870, data: d(-30), desc: 'BH → Salvador', tripId: null }] },
    { id: nid(), programa: 'Livelo', numero: '', saldo: 120000, saldoEm: d(-10), validade: d(300), custoMilheiro: 0, notas: 'transferir só com bônus', movs: [{ id: nid(), tipo: 'compra', qtd: 50000, valor: 1000, data: d(-90), desc: 'Compra com 50% off', tripId: null }] },
    { id: nid(), programa: 'Latam Pass', numero: '', saldo: 8000, saldoEm: d(-40), validade: d(-5), custoMilheiro: 0, notas: '', movs: [] }]);

  // ───────────────────── Rede e currículo ─────────────────────
  const ct = (nome, extra) => Object.assign({ id: nid(), nome, papel: '', onde: '', tags: [], tel: '', email: '', links: '', notas: '', lembrar: 0, nascimento: '', favorito: false, ultimo: '', createdAt: id }, extra || {});
  const aniv = (n, ano) => ano + d(n).slice(4);
  S('contacts', [
    ct('João Contador', { papel: 'contador da empresa', onde: 'indicação', tags: ['negócios'], tel: '(31) 99999-9999', email: 'joao.exemplo@email.com', ultimo: d(-3), lembrar: 30, favorito: true }),
    ct('Ana Sócia', { papel: 'sócia', onde: 'faculdade', tags: ['negócios', 'amigos'], ultimo: d(-1), nascimento: aniv(2, 1992), favorito: true }),
    ct('Dr. Carlos Mendes', { papel: 'coordenador do pronto-socorro', onde: 'trabalho', tags: ['plantão'], ultimo: d(-20), lembrar: 14 }),
    ct('Pedro', { papel: 'revendedor de impressoras', onde: 'feira', tags: ['negócios'], ultimo: d(-50) }),
    ct('Mariana', { papel: 'enfermeira', onde: 'regulação', tags: ['plantão'], ultimo: d(-10), nascimento: aniv(14, 1988) }),
    ct('Tio Zé', { onde: 'família', tags: ['família'], ultimo: d(-200), nascimento: aniv(25, 1960) }),
    ct('Fernanda', { papel: 'advogada trabalhista', onde: 'congresso', tags: ['negócios'], ultimo: d(-120) })]);
  S('curriculo', {
    nome: 'Helena Souza (exemplo)', titulo: 'Médica generalista · Urgência pediátrica · Regulação', email: 'helena.exemplo@email.com', tel: '', cidade: 'Belo Horizonte/MG', registro: 'CRM 00000',
    links: 'LinkedIn https://www.linkedin.com/', sobre: 'Médica generalista com atuação em urgência pediátrica e regulação médica. Interesse em gestão, tecnologia e empreendedorismo na saúde.',
    experiencias: [{ id: nid(), cargo: 'Pediatra plantonista', org: 'Hospital Central', local: 'Belo Horizonte', inicio: '2022-03', fim: '', desc: 'Urgência pediátrica.' },
      { id: nid(), cargo: 'Médica reguladora', org: 'Central de Regulação', local: '', inicio: '2023-06', fim: '', desc: '' },
      { id: nid(), cargo: 'Médica de saúde da família', org: 'Prefeitura', local: '', inicio: '2021-02', fim: '2022-02', desc: '' }],
    formacoes: [{ id: nid(), curso: 'Medicina', org: 'Universidade (exemplo)', nivel: 'Graduação', inicio: '2015-02', fim: '2020-12', desc: '' }],
    cursos: [{ id: nid(), curso: 'PALS', org: 'AHA', fim: '2023', horas: '16h', url: '' }],
    competencias: [{ id: nid(), nome: 'Urgência pediátrica', nivel: 5 }, { id: nid(), nome: 'Regulação', nivel: 4 }, { id: nid(), nome: 'Gestão', nivel: 3 }],
    idiomas: [{ id: nid(), nome: 'Inglês', grau: 'intermediário' }], producoes: [] });

  // ───────────────────── Inventário ─────────────────────
  const anos = n => iso(new Date(hoje.getFullYear() - n, hoje.getMonth(), 10));
  S('inventario', [
    { id: 1301, nome: 'Apartamento', cat: 'imovel', ic: '🏢', qtd: 1, valor: 420000, compra: 360000, data: anos(4), estado: 'otimo', dep: '', dono: 'pessoal', onde: 'Belo Horizonte', garantia: '', notas: 'escritura no Drive', criadoEm: 1 },
    { id: 1302, nome: 'Carro', cat: 'veiculo', ic: '🚗', qtd: 1, valor: 0, compra: 110000, data: anos(5), estado: 'bom', dep: '', dono: 'pessoal', onde: 'garagem', garantia: '', notas: '', criadoEm: 2 },
    { id: 1303, nome: 'Computador', cat: 'eletronico', ic: '🖥️', qtd: 1, valor: 9000, compra: 12000, data: anos(2), estado: 'otimo', dep: '', dono: 'pessoal', onde: 'escritório', garantia: iso(new Date(hoje.getFullYear() + 1, 0, 1)), notas: '', criadoEm: 3 },
    { id: 1304, nome: 'Geladeira', cat: 'casa', ic: '🧊', qtd: 1, valor: 2800, compra: 4200, data: anos(3), estado: 'bom', dep: '', dono: 'pessoal', onde: 'cozinha', garantia: '', notas: '', criadoEm: 4 },
    { id: 1305, nome: 'Estetoscópio', cat: 'medico', ic: '🩺', qtd: 1, valor: 900, compra: 1100, data: anos(6), estado: 'bom', dep: '', dono: 'empresa', onde: 'consultório', garantia: '', notas: '', criadoEm: 5 },
    { id: 1306, nome: 'Relógio de herança', cat: 'joia', ic: '⌚', qtd: 1, valor: 25000, compra: 0, data: '', estado: 'otimo', dep: '', dono: 'pessoal', onde: 'cofre', garantia: '', notas: 'herança', criadoEm: 6 },
    { id: 1307, nome: 'Impressora 3D Bambu', cat: 'maquina', ic: '🖨️', qtd: 1, valor: 5400, compra: 6000, data: anos(1), estado: 'otimo', dep: '', dono: 'empresa', onde: 'Produção', garantia: '', notas: '', criadoEm: 7, maquinaId: 1201 }]);

  // ───────────────────── Clínica ─────────────────────
  const sv = [
    { id: 9601, nome: 'Implante capilar — 2.000 fios', tipo: 'procedimento', preco: 12000, custo: 3000, sessoes: '', comissaoPct: 12, notas: 'inclui retorno de 30 dias', ativo: true },
    { id: 9602, nome: 'Avaliação capilar', tipo: 'consulta', preco: 300, custo: 0, sessoes: '', comissaoPct: 0, notas: '', ativo: true },
    { id: 9603, nome: 'Pacote de laser — 10 sessões', tipo: 'pacote', preco: 2500, custo: 600, sessoes: 10, comissaoPct: 10, notas: '', ativo: true }];
  S('servicos', sv);
  const hs = (...e) => e.map((x, i) => ({ etapa: x, quando: Date.now() - (e.length - i) * 864e5 * 3 }));
  const pc = (nome, sid, etapa, h, extra) => Object.assign({ id: nid(), nome, telefone: '', origem: 'Instagram', servicoId: sid, valor: '', etapa, proximaData: '', proximaHora: '', responsavel: '', notas: '', criadoEm: Date.now() - (id % 20) * 864e5, etapaEm: d(-2), recebido: false, eventId: null, historico: h }, extra || {});
  const pacs = [
    pc('Maria Souza', 9601, 'lead', hs('lead')), pc('José Lima', 9602, 'lead', hs('lead'), { origem: 'Google' }), pc('Renata Alves', 9601, 'lead', hs('lead'), { origem: 'Indicação' }),
    pc('Paulo Henrique', 9603, 'avaliacao', hs('lead', 'avaliacao'), { proximaData: d(2), proximaHora: '14:00', origem: 'WhatsApp' }),
    pc('Bruno Costa', 9601, 'agendado', hs('lead', 'avaliacao', 'agendado'), { proximaData: d(6), proximaHora: '08:00', responsavel: 'Dr. Rafael', origem: 'Indicação' }),
    pc('Ricardo Nunes', 9601, 'feito', hs('lead', 'avaliacao', 'agendado', 'feito'), { feitoEm: d(-5), responsavel: 'Dr. Rafael', recebido: true, recebidoEm: d(-5), origem: 'Indicação' }),
    pc('Patrícia Gomes', 9603, 'feito', hs('lead', 'avaliacao', 'agendado', 'feito'), { feitoEm: d(-2), responsavel: 'Enf. Júlia' }),
    pc('Sônia Prado', 9601, 'retorno', hs('lead', 'avaliacao', 'agendado', 'feito', 'retorno'), { feitoEm: d(-40), proximaData: d(10), recebido: true, origem: 'Indicação' }),
    pc('Hugo Martins', 9601, 'perdido', hs('lead', 'avaliacao', 'perdido'))];
  S('pacientes', pacs);
  S('repasses', [{ id: nid(), pacienteId: pacs[5].id, pessoa: 'Dr. Rafael', servicoNome: sv[0].nome, base: 12000, pct: 12, valor: 1440, pago: false, pagoEm: null, financeId: null, criadoEm: Date.now() - 5 * 864e5 }]);

  // ───────────────────── Produção (impressão 3D) ─────────────────────
  S('maquinas', [
    { id: 1201, nome: 'Bambu Lab P1S', potenciaW: 350, desgasteHora: 0.8, manutencaoCadaH: 200, ativo: true, horasRodadas: 160, horasNaUltimaManut: 0, criadoEm: 1 },
    { id: 1202, nome: 'Ender 3 V3', potenciaW: 300, desgasteHora: 0.5, manutencaoCadaH: 150, ativo: true, horasRodadas: 320, horasNaUltimaManut: 150, criadoEm: 2 }]);
  const fil = [
    { id: 1401, material: 'pla', cor: 'Preto', marca: 'Voolt', precoRolo: 110, gramasRolo: 1000, gramasRestantes: 720 },
    { id: 1402, material: 'petg', cor: 'Branco', marca: '3D Lab', precoRolo: 130, gramasRolo: 1000, gramasRestantes: 400 },
    { id: 1403, material: 'pla', cor: 'Vermelho', marca: '', precoRolo: 105, gramasRolo: 1000, gramasRestantes: 80 },
    { id: 1404, material: 'pla', cor: 'Azul', marca: 'Voolt', precoRolo: 110, gramasRolo: 1000, gramasRestantes: 950 }];
  S('filamentos', fil);
  const prods = [
    { id: 1501, nome: 'Suporte de fone personalizado', gramas: 45, horas: 3.5, minAcabamento: 10, filamentoId: 1401, maquinaId: 1201, custoExtra: 2, margemAlvo: 60, preco: 49.9, notas: '', ativo: true },
    { id: 1502, nome: 'Chaveiro com nome', gramas: 8, horas: 0.6, minAcabamento: 3, filamentoId: 1403, maquinaId: 1202, custoExtra: 0.5, margemAlvo: 70, preco: 12, notas: '', ativo: true },
    { id: 1503, nome: 'Vaso geométrico', gramas: 120, horas: 6, minAcabamento: 15, filamentoId: 1402, maquinaId: 1201, custoExtra: 3, margemAlvo: 55, preco: 0, notas: '', ativo: true },
    { id: 1504, nome: 'Organizador de cabos', gramas: 30, horas: 2, minAcabamento: 5, filamentoId: 1404, maquinaId: 1202, custoExtra: 0, margemAlvo: 60, preco: 24.9, notas: '', ativo: true }];
  S('produtos', prods);
  const od = (produtoId, qtd, status, extra) => Object.assign({ id: nid(), produtoId, qtd, maquinaId: prods.find(p => p.id === produtoId).maquinaId, cliente: '', prazo: '', notas: '', status, consumido: ['acabamento', 'pronto', 'entregue', 'falhou'].includes(status), criadoEm: id }, extra || {});
  S('ordens', [od(1502, 5, 'fila', { cliente: 'Escola Municipal', prazo: d(4) }), od(1503, 2, 'fila', { prazo: d(-1) }), od(1501, 3, 'imprimindo', { cliente: 'Ana', inicio: d(0) }),
    od(1504, 1, 'acabamento', { gramasUsados: 30 }), od(1501, 1, 'pronto', { cliente: 'João', gramasUsados: 45 }), od(1502, 10, 'entregue', { gramasUsados: 80, fim: d(-3) }), od(1503, 1, 'falhou', { gramasUsados: 120 })]);
  const custo = p => { const f = fil.find(x => x.id === p.filamentoId), m = [{ id: 1201, w: 350, g: 0.8 }, { id: 1202, w: 300, g: 0.5 }].find(x => x.id === p.maquinaId); return p.gramas * f.precoRolo / 1000 + p.horas * (m.w / 1000 * 0.95 + m.g) + p.minAcabamento / 60 * 25 + p.custoExtra; };
  const vd = (produtoId, plataforma, qtd, preco, taxaPct, frete, n) => ({ id: nid(), produtoId, ordemId: '', plataforma, qtd, preco, taxaPct, frete, custoUnit: custo(prods.find(p => p.id === produtoId)), data: d(-n), financeId: null, criadoEm: id });
  S('vendas', [vd(1501, 'mercadolivre', 2, 49.9, 16, 0, 2), vd(1501, 'shopee', 1, 47.9, 14, 8, 4), vd(1502, 'direto', 10, 12, 0, 0, 3), vd(1504, 'shopee', 3, 24.9, 14, 0, 6), vd(1501, 'elo7', 1, 54.9, 12, 12, 1)]);

  S('finances', tx); S('shifts', shifts);
})();

// ════════════════════ AS MINIATURAS (em todas as abas) ════════════════════
/** Abre o app inteiro preenchido, começando pela aba de onde veio o clique. */
function exemploEntrar(aba) {
  try { sessionStorage.setItem('genesis_exemplo', '1'); sessionStorage.setItem('genesis_exemplo_aba', aba || ''); } catch (e) { alert('Este navegador não deixou abrir o modo exemplo.'); return; }
  location.reload();
}
function exemploSair() {
  const aba = (document.querySelector('.tab-content.active') || {}).id || '';
  try { sessionStorage.removeItem('genesis_exemplo'); sessionStorage.setItem('genesis_exemplo_volta', aba); } catch (e) { /* a marca é desta aba: fechar o app também sai */ }
  location.reload();
}
function exemploAbaAtual() { return (document.querySelector('.tab-content.active') || {}).id || 'nucleo'; }
/** A miniatura: no cabeçalho de cada aba e entre os atalhos do Núcleo. Chamado pela casca. */
function exemploMontarBotoes() {
  const ex = !!window.GENESIS_EXEMPLO;
  document.querySelectorAll('.tab-content:not(#nucleo) > .cs-hero').forEach(h => {
    const acoes = h.querySelector('.cs-acoes'); if (!acoes) return;
    let b = acoes.querySelector('.ex-mini');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'ex-mini';
      b.onclick = () => (window.GENESIS_EXEMPLO ? exemploSair() : exemploEntrar(h.parentElement.id));
    }
    // sempre por último: os ＋ das folhas entram depois e não podem ficar atrás dela
    if (acoes.lastElementChild !== b) acoes.appendChild(b);
    b.innerHTML = ex ? '<span class="ex-mini-tela" aria-hidden="true">✕</span><span>Sair do exemplo</span>' : '<span class="ex-mini-tela" aria-hidden="true"><i></i><i></i><i></i></span><span>Ver exemplo</span>';
    b.title = ex ? 'Voltar aos seus dados (o exemplo não guardou nada)' : 'Ver esta aba (e o app inteiro) preenchida com dados de exemplo — nada seu é tocado';
    if (ex && !h.querySelector('.ex-faixa')) { const f = document.createElement('p'); f.className = 'ex-faixa'; f.innerHTML = '🖼️ <b>MODO EXEMPLO</b> · dados de mentira, nada é salvo'; h.insertBefore(f, acoes); }
  });
  const nav = document.querySelector('#nucleo .nu-micro');
  if (nav && !nav.querySelector('.ex-nu')) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nu-mi ex-nu';
    b.title = ex ? 'Sair do exemplo' : 'Ver o app preenchido (exemplo)'; b.setAttribute('aria-label', b.title);
    b.innerHTML = `<span class="ex-nu-ic" aria-hidden="true">${ex ? '✕' : '🖼️'}</span>`;
    b.onclick = () => (window.GENESIS_EXEMPLO ? exemploSair() : exemploEntrar('nucleo'));
    nav.appendChild(b);
    if (ex) { const e = document.getElementById('nu-estado'); if (e && !document.querySelector('#nucleo .ex-faixa')) { const f = document.createElement('p'); f.className = 'ex-faixa'; f.innerHTML = '🖼️ <b>MODO EXEMPLO</b> · dados de mentira, nada é salvo'; e.after(f); } }
  }
  const cfg = document.getElementById('ex-cfg-botao');
  if (cfg) { cfg.textContent = ex ? '✕ Sair do modo exemplo' : '🖼️ Abrir o app preenchido (modo exemplo)'; cfg.onclick = () => (window.GENESIS_EXEMPLO ? exemploSair() : exemploEntrar('settings')); }
}
/** Depois que o app sobe: põe as miniaturas e volta para a aba certa (a partida troca de aba sozinha ~1 s depois). */
window.addEventListener('load', () => {
  if (window.GENESIS_EXEMPLO) document.body.classList.add('modo-exemplo');
  setTimeout(exemploMontarBotoes, 300); setTimeout(exemploMontarBotoes, 2000);
  let alvo = '';
  try { alvo = window.GENESIS_EXEMPLO ? sessionStorage.getItem('genesis_exemplo_aba') : sessionStorage.getItem('genesis_exemplo_volta'); if (!window.GENESIS_EXEMPLO) sessionStorage.removeItem('genesis_exemplo_volta'); } catch (e) { alvo = ''; }
  if (!alvo || typeof changeTab !== 'function') return;
  let n = 0;
  const ir = () => { if (!document.getElementById(alvo)) return; if (!document.querySelector('#' + alvo + '.active')) changeTab(alvo); if (++n < 4) setTimeout(ir, 700); };
  setTimeout(ir, 1500);
});
