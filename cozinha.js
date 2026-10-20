// ════════════════════════════════════════════════════════════════════════════
// COZINHA — a aba da cozinha (20/10/2026, revisão geral, item 10)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: o livro de receitas sai da Saúde para "uma aba própria (Cozinha)", com a lista de compras, os
// pratos prontos, a despensa e "os itens (geladeira / airfryer / etc.), pois serão otimizados em casa
// inteligente no futuro". Desenho aprovado em 20/10, em duas partes:
//   · parte 1 (v74): 📖 Receitas (o receitas.js, só mudou de lugar) · 🛒 Compras · ⚡ Pratos
//   · parte 2 (v75): 🥫 Despensa (módulo 51 `despensa`) · 🔌 Aparelhos · 📊 Painel (resumos.js, rsRenderKitchen)
// UMA FONTE SÓ para cada dado (armadilha 21):
//   · Compras   = a MESMA lista "Compras" das Notas (rcListaCompras);
//   · Pratos    = o módulo `pratos` (o diário da Saúde continua usando; o formulário é o prFormHtml da saude.js);
//   · Aparelhos = os itens do INVENTÁRIO com "Onde fica" = cozinha (o campo `onde` que ele já usa);
//   · Despensa  = o único dado novo: [{ id, nome, qtd, local: geladeira|freezer|armario, criadoEm }].
// O caminho das coisas: marcou "comprado" nas Compras → entra na Despensa; "acabou" na Despensa → volta às
// Compras; o "tenho" de cada ingrediente das receitas vem da Despensa (czTem). A geladeira 3D vem depois, em
// cima desta mesma despensa.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

let cozinhaSecao = 'receitas';
const CZ_SECOES = ['receitas', 'compras', 'despensa', 'pratos', 'aparelhos'];

function verSecaoCozinha(s, el) {
  if (!CZ_SECOES.includes(s)) s = 'receitas';
  cozinhaSecao = s;
  const abas = document.querySelectorAll('#cozinha-secoes > span');
  abas.forEach(x => x.classList.remove('active'));
  // pelo NOME, não pela posição (armadilhas 12 e 80): micro-aba nova na frente não desalinha
  const alvo = el || [...abas].find(x => (x.getAttribute('onclick') || '').includes(`'${s}'`));
  if (alvo) alvo.classList.add('active');
  CZ_SECOES.forEach(k => { const d = document.getElementById('sec-cz-' + k); if (d) d.hidden = k !== s; });
  renderCozinha();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
/** Redesenha o que está na Cozinha (a troca de aba e a sincronização chamam). */
function renderCozinha() {
  if (cozinhaSecao === 'receitas' && typeof rcRender === 'function') rcRender();
  czRenderCompras(); czRenderDespensa(); czRenderPratos(); czRenderAparelhos();
}
/** Abre o livro direto na página de uma receita (o Painel da Cozinha usa). */
function czAbrirReceita(id) {
  if (typeof rcEstado === 'undefined') return;
  rcEstado.cat = ''; rcEstado.busca = '';
  const i = typeof rcFiltradas === 'function' ? rcFiltradas().findIndex(r => r.id === id) : -1;
  rcEstado.pag = i >= 0 ? i + 1 : 0;
  verSecaoCozinha('receitas');
}

// ───────────────────── nomes: "300 g de peito de frango" × "frango" ─────────────────────
const czSemAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** A quantidade na frente do item: número + unidade + "de" ("2 kg de", "1 colher de sopa de", "½"). */
const CZ_QTD = /^\s*((?:\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])\s*(?:(?:kg|g|gr|gramas?|mg|ml|l|litros?|x[ií]caras?(?: de ch[aá])?|colher(?:es)?(?: de (?:sopa|ch[aá]|sobremesa))?|copos?|latas?|pacotes?|unidades?|un|dentes?|fatias?|pitadas?|punhados?|ramos?|ma[cç]os?|caixas?|potes?|d[uú]zias?|bandejas?)(?![\p{L}])\.?\s*)?(?:(?:de|da|do|das|dos)\s+)?)/iu;
/** Separa "2 kg de arroz" em { qtd: '2 kg', nome: 'Arroz' }. */
function czSepararQtd(txt) {
  const t = String(txt || '').trim(), m = t.match(CZ_QTD);
  const nome = m && m[1].trim() ? t.slice(m[1].length).trim() || t : t;
  const qtd = m && m[1].trim() ? m[1].replace(/\s+(de|da|do|das|dos)\s*$/i, '').trim() : '';
  return { qtd, nome: nome.charAt(0).toUpperCase() + nome.slice(1) };
}
const CZ_VAZIAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'a', 'o', 'em', 'gosto', 'madura', 'maduro', 'picada',
  'picado', 'fresca', 'fresco', 'grande', 'pequena', 'pequeno', 'media', 'medio', 'inteira', 'inteiro', 'ralada', 'ralado', 'cozida', 'cozido']);
/** As palavras que importam de um nome, sem acento, quantidade nem plural ("2 ovos" → ["ovo"]). */
function czPalavras(txt) {
  const nome = czSepararQtd(txt).nome;
  return czSemAcento(nome).replace(/\(.*?\)/g, ' ').split(/[^a-z0-9]+/)
    .filter(p => p.length > 1 && !CZ_VAZIAS.has(p)).map(p => p.replace(/(oes|aes)$/, 'ao').replace(/s$/, ''));
}
/** Tem em casa? Toda palavra do item da despensa aparece no ingrediente ("frango" ⊂ "peito de frango"; "sal" ≠ "salsinha"). */
function czTem(ingrediente) {
  if (typeof despensa === 'undefined' || !despensa.length) return false;
  const a = czPalavras(ingrediente); if (!a.length) return false;
  return despensa.some(d => { const b = czPalavras(d.nome); return b.length && b.every(p => a.includes(p)); });
}
/** A prateleira provável pelo nome (ele pode mudar depois). */
function czLocalProvavel(nome) {
  const t = czSemAcento(nome);
  if (/congelad|sorvete|gelo\b|polpa|hamburguer|nugget|empanad|pao de queijo/.test(t)) return 'freezer';
  if (/leite\b|iogurte|queijo|requeij|manteiga|margarina|presunto|peito de peru|mortadela|ovo|carne|frango|peixe|file|linguica|salsicha|bacon|alface|rucula|couve|espinafre|tomate|cenoura|abobrinha|brocolis|pepino|pimentao|morango|uva|limao|suco|creme de leite aberto|cream cheese|ricota/.test(t)) return 'geladeira';
  return 'armario';
}

// ───────────────────────────── 🛒 compras ─────────────────────────────────
/** A lista de compras das Notas ("Compras", ou mercado/feira). Só nasce quando ele anota o primeiro item. */
function czListaCompras(criar) {
  const l = notes.find(n => !n.archived && Array.isArray(n.checklist) && /compra|mercado|feira|supermerc/i.test(n.title || ''));
  return l || (criar && typeof rcListaCompras === 'function' ? rcListaCompras() : null);
}
function czRenderCompras() {
  const el = document.getElementById('cz-compras'); if (!el) return;
  const l = czListaCompras(false), itens = (l ? l.checklist : []).map((it, i) => ({ it, i }));
  const abertos = itens.filter(x => !x.it.done), feitos = itens.filter(x => x.it.done);
  // dentro de onclick vai o ÍNDICE, nunca o texto (armadilha 8)
  const linha = ({ it, i }) => `<li class="cz-item${it.done ? ' feito' : ''}">
      <button type="button" class="cz-marca" onclick="czMarcarCompra(${i})" aria-pressed="${it.done ? 'true' : 'false'}" title="${it.done ? 'Voltar para a lista' : 'Comprado: vai para a despensa'}">${it.done ? '✓' : ''}</button>
      <span class="cz-item-tx">${esc(it.text)}</span>
      <button type="button" class="cz-tirar" onclick="czTirarCompra(${i})" title="Tirar da lista" aria-label="Tirar da lista">✕</button></li>`;
  el.innerHTML = `<form class="cz-add" onsubmit="event.preventDefault(); czAddCompra()">
      <input type="text" id="cz-compra-novo" placeholder="O que falta comprar? (leite, 2 kg de arroz…)" autocomplete="off" enterkeyhint="done" aria-label="Item para comprar">
      <button type="submit" title="Pôr na lista" aria-label="Pôr na lista">＋</button></form>
    <ul class="cz-lista">${abertos.map(linha).join('') || '<li class="cz-vazio">Nada para comprar. Anote acima, use o 🛒 de uma receita ou o "acabou" da despensa.</li>'}</ul>
    ${feitos.length ? `<details class="cz-feitos"><summary>Comprados · ${feitos.length}</summary><ul class="cz-lista">${feitos.map(linha).join('')}</ul>
      <button type="button" class="mini-btn" onclick="czLimparComprados()">Tirar os comprados da lista</button></details>` : ''}
    <p class="cz-pe">É a mesma lista "${esc(l ? l.title : 'Compras')}" das Notas. Marcar como comprado <b>aqui</b> põe o item na despensa.</p>`;
}
function czMudouCompras(l) {
  l.updatedAt = Date.now(); salvar('notes', notes);
  if (typeof renderNotes === 'function') renderNotes();
  czRenderCompras();
}
/** Põe um texto na lista de compras (sem repetir o que já está em aberto). Devolve true se entrou. */
function czPorNasCompras(t) {
  t = String(t || '').trim(); if (!t) return false;
  const l = czListaCompras(true);
  if (l.checklist.some(x => !x.done && String(x.text).trim().toLowerCase() === t.toLowerCase())) return false;
  l.checklist.push({ text: t, done: false, nivel: 0 });
  czMudouCompras(l);
  return true;
}
function czAddCompra() {
  const inp = document.getElementById('cz-compra-novo'); const t = (inp && inp.value || '').trim(); if (!t) return;
  if (!czPorNasCompras(t)) { toast('Já está na lista.'); inp.value = ''; return; }
  const n = document.getElementById('cz-compra-novo'); if (n) n.focus();
}
function czMarcarCompra(i) {
  const l = czListaCompras(false); if (!l || !l.checklist[i]) return;
  const it = l.checklist[i]; it.done = !it.done;
  // comprou → vai para a despensa (se ainda não estiver lá)
  const foi = it.done ? czGuardarNaDespensa(it.text) : null;
  czMudouCompras(l);
  if (foi) toast(`🥫 ${foi.nome} foi para a despensa (${CZ_LOCAIS[foi.local][1]}).`, 3500);
}
function czTirarCompra(i) {
  const l = czListaCompras(false); if (!l || !l.checklist[i]) return;
  l.checklist.splice(i, 1); czMudouCompras(l);
}
function czLimparComprados() {
  const l = czListaCompras(false); if (!l) return;
  const n = l.checklist.filter(x => x.done).length; if (!n) return;
  l.checklist = l.checklist.filter(x => !x.done); czMudouCompras(l);
  toast(`🧹 ${plural(n, 'item comprado saiu', 'itens comprados saíram')} da lista.`);
}

// ───────────────────────────── 🥫 despensa (módulo 51) ────────────────────
const CZ_LOCAIS = { geladeira: ['🧊', 'Geladeira'], freezer: ['❄️', 'Freezer'], armario: ['🗄️', 'Armário'] };
let czDespSel = null;   // o item tocado (abre as ações embaixo da prateleira)
function czSalvarDespensa() { salvar('despensa', despensa); czDespSel = czDespSel && despensa.some(d => d.id === czDespSel) ? czDespSel : null; czRenderDespensa(); if (typeof rcRender === 'function' && cozinhaSecao === 'receitas') rcRender(); }
/** Guarda um texto de compra na despensa ("2 kg de arroz" → Arroz · 2 kg · Armário). Devolve o item, ou null se já tinha. */
function czGuardarNaDespensa(texto, local) {
  const { qtd, nome } = czSepararQtd(texto); if (!nome) return null;
  const b = czPalavras(nome);
  if (despensa.some(d => { const a = czPalavras(d.nome); return a.length === b.length && a.every(p => b.includes(p)); })) return null;
  const it = { id: novoId(), nome, qtd, local: local || czLocalProvavel(nome), criadoEm: Date.now() };
  despensa.push(it); czSalvarDespensa();
  return it;
}
function czRenderDespensa() {
  const el = document.getElementById('cz-despensa'); if (!el) return;
  const prat = k => {
    const l = despensa.filter(d => (CZ_LOCAIS[d.local] ? d.local : 'armario') === k).sort((a, b) => a.nome.localeCompare(b.nome));
    const sel = l.find(d => d.id === czDespSel);
    return `<section class="cz-prat cz-prat-${k}">
      <div class="cz-prat-cab"><span aria-hidden="true">${CZ_LOCAIS[k][0]}</span><b>${CZ_LOCAIS[k][1]}</b><small>${l.length ? plural(l.length, 'item', 'itens') : 'vazia'}</small></div>
      <div class="cz-prat-itens">${l.map(d => `<button type="button" class="cz-pote${d.id === czDespSel ? ' sel' : ''}" onclick="czDespTocar(${d.id})" aria-pressed="${d.id === czDespSel}">${esc(d.nome)}${d.qtd ? `<small>${esc(d.qtd)}</small>` : ''}</button>`).join('')
        || `<span class="cz-prat-vazia">Nada aqui. Anote acima ou marque "comprado" nas Compras.</span>`}</div>
      ${sel ? `<div class="cz-pote-acoes"><b>${esc(sel.nome)}</b>
        <button type="button" class="mini-btn" onclick="czAcabou(${sel.id})" title="Sai da despensa e entra nas compras">🛒 Acabou</button>
        ${Object.keys(CZ_LOCAIS).filter(x => x !== k).map(x => `<button type="button" class="mini-btn" onclick="czMoverDesp(${sel.id}, '${x}')">→ ${CZ_LOCAIS[x][0]} ${CZ_LOCAIS[x][1]}</button>`).join('')}
        <button type="button" class="mini-btn" onclick="czTirarDesp(${sel.id})" title="Sai da despensa sem ir para as compras">✕ Tirar</button></div>` : ''}
    </section>`;
  };
  el.innerHTML = `<form class="cz-add" onsubmit="event.preventDefault(); czAddDespensa()">
      <input type="text" id="cz-desp-novo" placeholder="O que tem em casa? (ovos, 2 kg de arroz…)" autocomplete="off" enterkeyhint="done" aria-label="Item da despensa">
      <select id="cz-desp-local" aria-label="Onde fica"><option value="">pelo nome</option>${Object.entries(CZ_LOCAIS).map(([k, v]) => `<option value="${k}">${v[0]} ${v[1]}</option>`).join('')}</select>
      <button type="submit" title="Guardar" aria-label="Guardar">＋</button></form>
    <div class="cz-prats">${['geladeira', 'freezer', 'armario'].map(prat).join('')}</div>
    <p class="cz-pe">Toque num item para "acabou" (volta às compras), mudar de lugar ou tirar. O livro de receitas marca sozinho o "tenho" com o que está aqui.</p>`;
}
function czAddDespensa() {
  const inp = document.getElementById('cz-desp-novo'), t = (inp && inp.value || '').trim(); if (!t) return;
  const it = czGuardarNaDespensa(t, (document.getElementById('cz-desp-local') || {}).value || '');
  if (!it) { toast('Já está na despensa.'); }
  else toast(`🥫 ${it.nome} guardado em ${CZ_LOCAIS[it.local][1]}.`, 2500);
  const n = document.getElementById('cz-desp-novo'); if (n) { n.value = ''; n.focus(); }
}
function czDespTocar(id) { czDespSel = czDespSel === id ? null : id; czRenderDespensa(); }
function czAcabou(id) {
  const d = despensa.find(x => x.id === id); if (!d) return;
  despensa = despensa.filter(x => x.id !== id); czDespSel = null; czSalvarDespensa();
  const foi = czPorNasCompras(d.nome);
  toast(foi ? `🛒 ${d.nome} acabou: foi para as compras.` : `🛒 ${d.nome} acabou (já estava nas compras).`, 3500);
}
function czMoverDesp(id, local) { const d = despensa.find(x => x.id === id); if (!d || !CZ_LOCAIS[local]) return; d.local = local; czSalvarDespensa(); }
function czTirarDesp(id) { despensa = despensa.filter(x => x.id !== id); czDespSel = null; czSalvarDespensa(); }

// ───────────────────────────── ⚡ pratos prontos ──────────────────────────
let czPrForm = null;   // null = fechado · 'novo' · id do prato
function czRenderPratos() {
  const el = document.getElementById('cz-pratos'); if (!el || typeof pratos === 'undefined') return;
  const lista = typeof prOrdenados === 'function' ? prOrdenados(prTipoAgora()) : pratos;
  const f = czPrForm !== null ? (pratos.find(x => x.id === czPrForm) || {}) : null;
  const sub = p => [TIPOS_REFEICAO[p.tipo] ? TIPOS_REFEICAO[p.tipo][1] : 'qualquer hora', prNumeros(p), p.usos ? plural(p.usos, 'vez', 'vezes') : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<div class="cz-pratos">${lista.map(p => `<div class="cz-prato${czPrForm === p.id ? ' editando' : ''}">
        <span class="cz-prato-ic" aria-hidden="true">${(TIPOS_REFEICAO[p.tipo] || ['⚡'])[0]}</span>
        <span class="cz-prato-tx"><b>${esc(p.nome)}</b><small>${esc(sub(p))}</small></span>
        <button type="button" class="mini-btn" onclick="prRegistrar(${p.id}); czRenderPratos()" title="Anota no diário de hoje, na hora">🍽️ Comi agora</button>
        <button type="button" class="mini-btn" onclick="czPrAbrir(${p.id})" title="Mudar ou apagar" aria-label="Mudar ou apagar">✎</button></div>`).join('')
      || '<p class="cz-vazio">Nenhum prato pronto ainda. A refeição que se repete vira um toque: ＋ Novo prato, a ☆ de uma refeição do diário (Saúde → Comida) ou o ⚡ de uma receita.</p>'}</div>
    ${f ? prFormHtml(f, 'cz-pr', czPrForm === 'novo', { guardar: 'czPrGuardar()', apagar: `czPrApagar(${czPrForm})`, cancelar: 'czPrAbrir(null)' })
      : '<button type="button" class="mini-btn cz-prato-novo" onclick="czPrAbrir(\'novo\')">＋ Novo prato</button>'}`;
  if (f) setTimeout(() => { const i = document.getElementById('cz-pr-nome'); if (i && !i.value) i.focus(); }, 30);
}
function czPrAbrir(id) { czPrForm = id; czRenderPratos(); }
function czPrGuardar() { if (!prGravarForm('cz-pr', czPrForm)) return; czPrForm = null; czRenderPratos(); if (typeof prRenderRapidos === 'function') prRenderRapidos(); }
function czPrApagar(id) { if (prApagar(id)) czPrForm = null; czRenderPratos(); }

// ───────────────────────────── 🔌 aparelhos (do Inventário) ───────────────
// Pensando na casa inteligente: cada aparelho é um item do Inventário (valor, garantia, estado, foto… tudo lá).
// Aqui só se vê quem tem "Onde fica" = cozinha, e se cria um novo já com esse lugar.
const CZ_AP_ICONES = ['🧊', '🍳', '🔥', '☕', '🥤', '🍞', '🌀', '🍲', '🫖', '⚖️'];
let czApForm = false, czApIc = '🍳';
const czNaCozinha = it => /cozinha/.test(czSemAcento(it.onde));
function czAparelhos() { return typeof inventario === 'undefined' ? [] : inventario.filter(czNaCozinha).sort((a, b) => a.nome.localeCompare(b.nome)); }
function czRenderAparelhos() {
  const el = document.getElementById('cz-aparelhos'); if (!el || typeof inventario === 'undefined') return;
  const l = czAparelhos(), hoje = hojeISO();
  // eletrodomésticos do Inventário ainda sem lugar: um toque diz que são da cozinha
  const soltos = inventario.filter(it => it.cat === 'casa' && !String(it.onde || '').trim());
  const card = it => {
    const gar = it.garantia ? (it.garantia >= hoje ? `garantia até ${isoParaBR(it.garantia).slice(3)}` : 'garantia vencida') : '';
    return `<button type="button" class="cz-ap" onclick="czAbrirNoInventario(${it.id})" title="Abrir no Inventário (valor, garantia, foto…)">
      <span class="cz-ap-ic" aria-hidden="true">${esc(it.ic || '🔌')}</span>
      <span class="cz-ap-tx"><b>${esc(it.nome)}</b><small>${esc([it.notas, gar, it.qtd > 1 ? it.qtd + ' unidades' : ''].filter(Boolean).join(' · ') || 'toque para ver no Inventário')}</small></span>
      <span class="cz-ap-ir" aria-hidden="true">›</span></button>`;
  };
  el.innerHTML = `<div class="cz-aps">${l.map(card).join('') || '<p class="cz-vazio">Nenhum aparelho ainda. ＋ Aparelho cria o item no Inventário com o lugar "Cozinha".</p>'}</div>
    ${soltos.length ? `<div class="cz-soltos"><small>Eletrodomésticos do Inventário sem lugar:</small>${soltos.map(it => `<button type="button" class="mini-btn" onclick="czPorNaCozinha(${it.id})" title="Muda o Onde fica para Cozinha">${esc(it.ic || '')} ${esc(it.nome)} → é da cozinha</button>`).join('')}</div>` : ''}
    ${czApForm ? `<form class="cz-ap-form" onsubmit="event.preventDefault(); czApGuardar()">
        <span class="cz-ap-ics" role="group" aria-label="Figura">${CZ_AP_ICONES.map(i => `<button type="button" class="${i === czApIc ? 'on' : ''}" onclick="czApIc = '${i}'; czRenderAparelhos()">${i}</button>`).join('')}</span>
        <input type="text" id="cz-ap-nome" placeholder="o aparelho (ex.: Airfryer)" required autocomplete="off">
        <input type="text" id="cz-ap-modelo" placeholder="marca e modelo (opcional — ex.: Mondial AF-30)" autocomplete="off">
        <span class="pr-form-bt"><button type="submit">Guardar</button><button type="button" class="mini-btn" onclick="czApForm = false; czRenderAparelhos()">Cancelar</button></span>
        <small class="pr-form-dica">Vai para o Inventário (Eletrodomésticos, Onde fica: Cozinha). Valor, garantia e foto se põem lá.</small></form>`
      : '<button type="button" class="mini-btn cz-prato-novo" onclick="czApForm = true; czRenderAparelhos(); setTimeout(() => { const i = document.getElementById(\'cz-ap-nome\'); if (i) i.focus(); }, 30)">＋ Aparelho</button>'}`;
}
function czApGuardar() {
  const nome = (document.getElementById('cz-ap-nome').value || '').trim(); if (!nome) return;
  const modelo = (document.getElementById('cz-ap-modelo').value || '').trim();
  // os mesmos campos que o formulário do Inventário grava (salvarItemInventario)
  inventario.push({ id: novoId(), criadoEm: Date.now(), nome, cat: 'casa', ic: czApIc, qtd: 1, valor: 0, compra: 0, data: '', estado: 'bom', dep: '',
    dono: 'pessoal', onde: 'Cozinha', garantia: '', notas: modelo, atualizadoEm: Date.now() });
  salvar('inventario', inventario); czApForm = false; czRenderAparelhos();
  if (typeof renderInventario === 'function') renderInventario();
  toast(`🔌 ${nome} entrou nos aparelhos (e no Inventário).`, 3500);
}
function czPorNaCozinha(id) {
  const it = inventario.find(x => x.id === id); if (!it) return;
  it.onde = 'Cozinha'; it.atualizadoEm = Date.now(); salvar('inventario', inventario);
  czRenderAparelhos(); if (typeof renderInventario === 'function') renderInventario();
}
function czAbrirNoInventario(id) {
  changeTab('inventory');
  if (typeof invEstado !== 'undefined') invEstado.sel = id;
  if (typeof renderInventario === 'function') renderInventario();
}
