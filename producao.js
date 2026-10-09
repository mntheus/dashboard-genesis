// ════════════════════════════════════════════════════════════════════════════
// PRODUÇÃO (IMPRESSÃO 3D) — A OFICINA AO VIVO, O QUADRO, OS CARRETÉIS (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • PAINEL = a OFICINA AO VIVO: cada impressora como máquina (o que está
//     imprimindo agora, o medidor das horas até a revisão) e a CASCATA da venda
//     (vendido → − taxa e frete → − custo da peça = sobrou), e o que deu lucro;
//   • FILA como QUADRO (Na fila · Imprimindo · Acabamento · Pronto), arrastar
//     muda o status — e sair de "imprimindo" continua baixando o filamento;
//   • ESTOQUE em CARRETÉIS com a cor do filamento e o anel do quanto resta;
//   • PRODUTOS com a RECEITA DO CUSTO (barra empilhada filamento · máquina ·
//     acabamento · extras), o preço e o que sobra;
//   • VENDAS e MÁQUINAS em cartões; a BARRA RÁPIDA na fila ("3 suporte para João
//     sexta") e nas vendas ("vendi 2 suporte shopee 59,90").
// Nenhum dado novo: maquinas, filamentos, produtos, ordens e vendas como estão.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const prEstado = { arrastando: null };
const PR_CORES_FIL = [
  [/pret|black/, '#1f2937'], [/branc|white/, '#f3f4f6'], [/cinz|gray|grey|chumbo/, '#9ca3af'], [/prat|silver/, '#c0c0c0'],
  [/vermelh|red/, '#ef4444'], [/azul|blue/, '#3b82f6'], [/verde|green/, '#22c55e'], [/amarel|yellow/, '#facc15'],
  [/laranj|orange/, '#f97316'], [/rosa|pink/, '#ec4899'], [/roxo|lilas|purple/, '#a855f7'], [/marrom|madeira|wood|brown/, '#92400e'],
  [/dourad|ouro|gold/, '#d4a017'], [/transp|natural|clear/, '#e5e7eb']
];

// ───────────────────────────── utilidades ─────────────────────────────────
function prSecao() { return typeof producaoSecao !== 'undefined' ? producaoSecao : 'painel'; }
function prCorFil(f) {
  const t = tarSemAcento((f && f.cor) || '');
  const a = PR_CORES_FIL.find(([re]) => re.test(t)); if (a) return a[1];
  let h = 0; for (const c of t) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ['#38bdf8', '#a78bfa', '#2dd4bf', '#fb923c'][h % 4];
}
/** O produto que mais bate com o texto (palavras de 3+ letras em comum). */
function prAcharProduto(txt) {
  const pal = new Set(tarSemAcento(txt).split(/[^a-z0-9]+/).filter(w => w.length >= 3));
  let melhor = null, pontos = 0;
  produtos.filter(p => p.ativo !== false).forEach(p => {
    const n = tarSemAcento(p.nome).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && pal.has(w)).length;
    if (n > pontos) { pontos = n; melhor = p; }
  });
  return melhor;
}
function prOrdemNa(m) { return ordens.find(o => o.status === 'imprimindo' && Number(o.maquinaId) === m.id) || null; }

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function prEntender(txt) {
  let resto = String(txt || '').trim();
  const tirar = re => { let a = null; resto = resto.replace(re, (...m) => { a = m; return ' '; }); return a; };
  const venda = prSecao() === 'vendas' || /^vendi\b/i.test(resto);
  resto = resto.replace(/^vendi\s+/i, '');
  const qtd = tirar(/^(\d{1,3})\s*(?:x\s+|un\w*\s+|pe[çc]as?\s+)?(?=\D)|(?:^|\s)(?:x(\d{1,3})|(\d{1,3})x)(?=\s|$)/i);
  const q = qtd ? Number(qtd[1] || qtd[2] || qtd[3]) || 1 : 1;
  if (venda) {
    const frete = tirar(/(?:^|\s)frete\s*R?\$?\s*(\d+(?:[.,]\d{1,2})?)/i);
    const preco = tirar(/(?:^|\s)R?\$?\s*(\d+(?:[.,]\d{1,2}))(?=\s|$)/) || tirar(/(?:^|\s)R\$\s*(\d+)/i);
    const pl = Object.entries(PLATAFORMAS).find(([k, v]) => new RegExp('(^|\\s)(' + (k === 'mercadolivre' ? 'mercado\\s*livre|ml|meli' : k === 'direto' ? 'direto|direta|pessoalmente|pix' : k) + ')(\\s|$)', 'i').test(tarSemAcento(resto)));
    if (pl) resto = tarSemAcento(resto).replace(new RegExp('(^|\\s)(' + (pl[0] === 'mercadolivre' ? 'mercado\\s*livre|ml|meli' : pl[0] === 'direto' ? 'direto|direta|pessoalmente|pix' : pl[0]) + ')(?=\\s|$)', 'i'), ' ');
    const p = prAcharProduto(resto);
    return { tipo: 'venda', qtd: q, produto: p, plataforma: pl ? pl[0] : 'direto', preco: preco ? parseFloat(preco[1].replace(',', '.')) : (p ? Number(p.preco) || Math.round(precoSugerido(p) * 100) / 100 : 0), frete: frete ? parseFloat(frete[1].replace(',', '.')) : 0 };
  }
  // cliente só com nome em MAIÚSCULA ("para João"): "Suporte para fone" não vira cliente "fone"
  const cli = tirar(/(?:^|\s)(?:para|pra|pro|p\/)\s+(?:o\s+|a\s+)?([\p{Lu}][\p{L}.]*(?:\s+[\p{Lu}][\p{L}.]*)?)/u);
  const d = tarAcharData(resto); let prazo = '';
  if (d) { prazo = d.due; resto = resto.slice(0, d.ini) + ' ' + resto.slice(d.fim); }
  const p = prAcharProduto(resto);
  return { tipo: 'ordem', qtd: q, produto: p, cliente: cli ? cli[1].trim() : '', prazo };
}
function prRapidaPrevia() {
  const el = document.getElementById('pr-rapida-previa'), inp = document.getElementById('pr-rapida'); if (!el || !inp) return;
  const vnd = prSecao() === 'vendas';
  inp.placeholder = vnd ? 'O que vendeu?' : 'O que imprimir?';
  if (!inp.value.trim()) { el.innerHTML = '<span class="tar-dica">' + (vnd ? 'Ex.: <b>2 suporte shopee 59,90 frete 12</b> — entra o líquido em Finanças.' : 'Ex.: <b>3 suporte de fone para João sexta</b> — vai para a fila com a impressora do produto. Começar com <b>vendi</b> registra uma venda.') + '</span>'; return; }
  const e = prEntender(inp.value), p = [];
  if (!e.produto) { el.innerHTML = `<span class="tar-entendi">entendi:</span> <span class="tar-due atras">não achei o produto no catálogo</span>`; return; }
  if (e.tipo === 'venda') {
    const pl = PLATAFORMAS[e.plataforma] || PLATAFORMAS.direto, r = liquidoVenda({ qtd: e.qtd, preco: e.preco, taxaPct: pl[2], frete: e.frete, custoUnit: custoProduto(e.produto).total });
    p.push(`<span class="tar-lt" style="--cor:var(--ok)">💰 venda</span>`, `<span class="nt-marc sem-hash">${pl[0]} ${esc(pl[1])} · taxa ${pl[2]}%</span>`, `<span class="nt-marc sem-hash">${e.qtd} × ${formatCurrency(e.preco)}</span>`);
    if (e.frete) p.push(`<span class="nt-marc sem-hash">frete ${formatCurrency(e.frete)}</span>`);
    p.push(`<span class="tar-due ${r.liquido >= 0 ? 'prox' : 'atras'}">sobra ${formatCurrency(r.liquido)}</span>`);
  } else {
    p.push(`<span class="tar-lt" style="--cor:var(--info)">📋 para a fila</span>`, `<span class="nt-marc sem-hash">×${e.qtd}</span>`);
    if (e.cliente) p.push(`<span class="nt-marc sem-hash">👤 ${esc(e.cliente)}</span>`);
    if (e.prazo) p.push(`<span class="tar-due prox">📅 ${esc(rotuloDataLonga(e.prazo))}</span>`);
  }
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.produto.nome)}</b> ${p.join(' ')}`;
}
function prRapidaAdicionar() {
  const inp = document.getElementById('pr-rapida'); if (!inp) return;
  const e = prEntender(inp.value);
  if (!e.produto) { toast('Não achei o produto no catálogo. Cadastre em 🧩 Produtos.'); inp.focus(); return; }
  if (e.tipo === 'venda') {
    if (!e.preco) { toast('Faltou o preço (ex.: 59,90).'); inp.focus(); return; }
    const pl = PLATAFORMAS[e.plataforma] || PLATAFORMAS.direto;
    lancarVenda({ id: novoId(), produtoId: e.produto.id, ordemId: '', plataforma: e.plataforma, qtd: e.qtd, preco: e.preco, taxaPct: pl[2], frete: e.frete, custoUnit: custoProduto(e.produto).total, data: hojeISO(), financeId: null, criadoEm: Date.now() });
  } else {
    ordens.push({ id: novoId(), produtoId: e.produto.id, qtd: e.qtd, maquinaId: e.produto.maquinaId || (maquinaPadrao() ? maquinaPadrao().id : ''), cliente: e.cliente, prazo: e.prazo, notas: '', status: 'fila', consumido: false, criadoEm: Date.now() });
    salvar('ordens', ordens); renderProducao(); toast(`📋 ${e.produto.nome} ×${e.qtd} na fila.`);
  }
  inp.value = ''; prRapidaPrevia(); inp.focus();
}

// ═══════════════════════ 2. A OFICINA AO VIVO (painel) ════════════════════
function prMaquinaCartao(m, comAcoes) {
  const o = prOrdemNa(m), p = o ? produtoPorId(o.produtoId) : null, cada = Number(m.manutencaoCadaH) || 0;
  const desde = (Number(m.horasRodadas) || 0) - (Number(m.horasNaUltimaManut) || 0), pct = cada ? Math.min(100, Math.round(desde / cada * 100)) : 0, alerta = precisaManutencao(m);
  return `<div class="pr-maq${o ? ' rodando' : ''}${m.ativo === false ? ' off' : ''}${alerta ? ' alerta' : ''}">
    <div class="pr-maq-topo"><span class="pr-maq-ic" aria-hidden="true">🖨️</span><div><b>${esc(m.nome)}</b><small>${m.potenciaW || 0} W · ${formatCurrency(custoHoraMaquina(m))}/h</small></div><span class="pr-maq-estado">${o ? '● imprimindo' : '💤 parada'}</span></div>
    <div class="pr-maq-agora">${o ? `<b>${esc(p ? p.nome : 'peça')}</b>${o.qtd > 1 ? ` ×${o.qtd}` : ''}${o.cliente ? ` · 👤 ${esc(o.cliente)}` : ''}` : '<span class="tar-dica">nada na mesa</span>'}</div>
    <div class="pr-maq-rev" title="${cada ? `${Math.round(desde)} de ${cada} h desde a última revisão` : 'sem intervalo de revisão definido'}"><div class="pr-rev-barra"><i style="width:${pct}%" class="${alerta ? 'alerta' : pct > 75 ? 'quase' : ''}"></i></div><small>${cada ? (alerta ? '🔧 revisão vencida' : `revisão em ${Math.max(0, Math.round(cada - desde))} h`) : `${Math.round(Number(m.horasRodadas) || 0)} h rodadas`}</small></div>
    ${comAcoes ? `<div class="cl-pac-acoes">${alerta ? `<button type="button" class="mini-btn on" onclick="manutencaoFeita(${m.id})">🔧 revisão feita</button>` : ''}<button type="button" class="mini-btn" title="Editar" onclick="editarMaquina(${m.id})">✎</button><button type="button" class="mini-btn" title="Apagar" onclick="removerMaquina(${m.id})">✕</button></div>` : (alerta ? `<div class="cl-pac-acoes"><button type="button" class="mini-btn on" onclick="manutencaoFeita(${m.id})">🔧 revisão feita</button></div>` : '')}
  </div>`;
}
function prRenderPainel() {
  const el = document.getElementById('producao-painel'); if (!el) return;
  const ym = hojeISO().slice(0, 7), doMes = vendas.filter(v => (v.data || '').startsWith(ym)), rs = doMes.map(liquidoVenda);
  const bruto = rs.reduce((a, r) => a + r.bruto, 0), taxas = rs.reduce((a, r) => a + r.taxa + r.frete, 0), custo = rs.reduce((a, r) => a + r.custo, 0), sobra = bruto - taxas - custo;
  const naFila = ordens.filter(o => ['fila', 'imprimindo', 'acabamento'].includes(o.status));
  const horasFila = naFila.reduce((a, o) => { const p = produtoPorId(o.produtoId); return a + (p ? (Number(p.horas) || 0) * (Number(o.qtd) || 1) : 0); }, 0);
  const falhas = ordens.filter(o => o.status === 'falhou').length, taxaFalha = ordens.length ? Math.round(falhas / ordens.length * 100) : 0;
  const estoque = filamentos.reduce((a, f) => a + (Number(f.gramasRestantes) || 0), 0), acabando = filamentos.filter(filamentoBaixo).length;
  const pct = v => bruto ? Math.max(0, v / bruto * 100) : 0;
  const linha = (rot, valor, ini, larg, cls) => `<div class="cl-casc-fila"><span class="cl-casc-rot">${rot}</span><div class="cl-casc-trilho"><i class="${cls}" style="left:${ini.toFixed(2)}%; width:${Math.max(0.8, larg).toFixed(2)}%"></i></div><b class="${cls}">${formatCurrency(valor)}</b></div>`;
  const porProduto = {}; doMes.forEach(v => { const p = produtoPorId(v.produtoId), n = p ? p.nome : 'Sem produto'; porProduto[n] = (porProduto[n] || 0) + liquidoVenda(v).liquido; });
  const itens = Object.entries(porProduto).sort((a, b) => b[1] - a[1]), maxL = Math.max(1, ...itens.map(([, x]) => Math.abs(x)));
  el.innerHTML = (maquinas.length ? `<h3 class="tar-gr-tit lz-tit-agora">🏭 A oficina agora</h3><div class="pr-maquinas">${maquinas.map(m => prMaquinaCartao(m, false)).join('')}</div>` : '<div class="sp-vazio">Cadastre uma impressora em 🖨️ Máquinas para ver a oficina ao vivo.</div>') +
    `<div class="lz-resumo cl-tiles" style="margin-top:12px">
      <div class="tar-num"><b>${naFila.length}</b><small>na fila · ${horasFila.toFixed(1).replace('.', ',')} h</small></div>
      <div class="tar-num${acabando ? ' alerta' : ''}"><b>${(estoque / 1000).toFixed(1).replace('.', ',')} kg</b><small>${acabando ? plural(acabando, 'rolo acabando', 'rolos acabando') : 'de filamento'}</small></div>
      <div class="tar-num${taxaFalha > 15 ? ' alerta' : ''}"><b>${taxaFalha}%</b><small>de falha · ${plural(falhas, 'perda', 'perdas')}</small></div>
      <div class="tar-num"><b>${doMes.length}</b><small>${palavra(doMes.length, 'venda', 'vendas')} no mês</small></div>
    </div>
    <h3 class="tar-gr-tit">💧 O que sobrou das vendas de ${esc(nomeMes(ym).toLowerCase())}</h3>
    ${bruto ? `<div class="cl-cascata">${linha('🧾 Vendido', bruto, 0, 100, 'fat')}${linha('− Taxa e frete', taxas, pct(bruto - taxas), pct(taxas), 'com')}${linha('− Custo da peça', custo, pct(bruto - taxas - custo), pct(custo), 'cus')}${linha('= Sobrou', sobra, 0, pct(sobra), sobra >= 0 ? 'luc' : 'neg')}</div>` : '<div class="sp-vazio">Nenhuma venda este mês ainda.</div>'}
    ${itens.length ? `<h3 class="tar-gr-tit">🧩 O que deu lucro</h3><div class="cl-origens pr-lucros">${itens.map(([k, x]) => `<div class="cl-orig"><span title="${esc(k)}">${esc(k)}</span><div><i style="width:${Math.round(Math.abs(x) / maxL * 100)}%; background:${x >= 0 ? 'var(--ok)' : 'var(--perigo)'}"></i></div><b class="pr-val">${formatCurrency(x)}</b></div>`).join('')}</div>` : ''}`;
  const det = document.getElementById('producao-detalhe'); if (det) det.innerHTML = '';
}

// ═════════════════════════════ 3. O QUADRO DA FILA ════════════════════════
function prCartaoOrdem(o) {
  const p = produtoPorId(o.produtoId), m = maquinaPorId(o.maquinaId), i = FLUXO_ORDEM.indexOf(o.status), pode = i >= 0 && i < FLUXO_ORDEM.length - 1;
  const atras = o.prazo && o.prazo < hojeISO() && !['entregue', 'falhou'].includes(o.status);
  return `<div class="cl-pac pr-ordem" draggable="true" data-id="${o.id}" style="--cor:${STATUS_ORDEM[o.status][2]}">
    <div class="cl-pac-topo"><b>${esc(p ? p.nome : 'produto apagado')}</b><strong>×${o.qtd || 1}</strong></div>
    <small>${m ? '🖨️ ' + esc(m.nome) : 'sem impressora'}${o.cliente ? ' · 👤 ' + esc(o.cliente) : ''}</small>
    ${o.prazo ? `<small class="cl-pac-data${atras ? ' atras' : ''}">📅 ${esc(rotuloData(o.prazo))}${atras ? ' · atrasado' : ''}</small>` : ''}
    ${o.gramasUsados ? `<small>🧵 ${Math.round(o.gramasUsados)} g usados</small>` : ''}${o.notas ? `<small>${esc(o.notas)}</small>` : ''}
    <div class="cl-pac-acoes">${pode && o.status !== 'pronto' ? `<button type="button" class="mini-btn" onclick="avancarOrdem(${o.id})">▶ ${STATUS_ORDEM[FLUXO_ORDEM[i + 1]][1].toLowerCase()}</button>` : ''}${o.status === 'pronto' ? `<button type="button" class="mini-btn on" title="Registrar a venda" onclick="venderOrdem(${o.id})">💰 vender</button><button type="button" class="mini-btn" title="Entregue sem venda registrada" onclick="mudarStatusOrdem(${o.id}, 'entregue')">🚚</button>` : ''}${!['falhou', 'entregue', 'pronto'].includes(o.status) ? `<button type="button" class="mini-btn" title="Deu ruim (perdeu o material)" onclick="mudarStatusOrdem(${o.id}, 'falhou')">💥</button>` : ''}<button type="button" class="mini-btn" title="Apagar" onclick="removerOrdem(${o.id})">✕</button></div>
  </div>`;
}
function prRenderFila() {
  const el = document.getElementById('ord-lista'); if (!el) return;
  if (!ordens.length) { el.innerHTML = '<div class="sp-vazio">Fila vazia. Escreva na barra acima (ex.: <b>3 suporte para João sexta</b>) ou use o ▶ de um produto.</div>'; return; }
  const cols = ['fila', 'imprimindo', 'acabamento', 'pronto'], fim = ordens.filter(o => o.status === 'entregue' || o.status === 'falhou').sort((a, b) => (b.fim || '').localeCompare(a.fim || '') || b.id - a.id);
  el.innerHTML = `<div class="cl-quadro pr-quadro">${cols.map(k => {
    const lst = ordens.filter(o => o.status === k).sort((a, b) => (a.prazo || '9').localeCompare(b.prazo || '9')), st = STATUS_ORDEM[k];
    const horas = lst.reduce((a, o) => { const p = produtoPorId(o.produtoId); return a + (p ? (Number(p.horas) || 0) * (Number(o.qtd) || 1) : 0); }, 0);
    return `<section class="cl-coluna" data-status="${k}" style="--cor:${st[2]}"><header><b>${st[0]} ${st[1]}</b><small>${lst.length}${horas && k !== 'pronto' ? ' · ' + horas.toFixed(1).replace('.', ',') + ' h' : ''}</small></header><div class="cl-coluna-lista">${lst.map(prCartaoOrdem).join('') || '<div class="cl-vazio">—</div>'}</div></section>`;
  }).join('')}</div>
  ${fim.length ? `<details class="lz-largados"><summary>🚚 Entregues e 💥 falhas <small>${fim.length}</small></summary><div class="pr-fim">${fim.slice(0, 40).map(o => { const p = produtoPorId(o.produtoId); return `<span class="cl-perdido">${STATUS_ORDEM[o.status][0]} ${esc(p ? p.nome : 'produto')} ×${o.qtd || 1}<button type="button" class="mini-btn xs" title="Apagar" onclick="removerOrdem(${o.id})">✕</button></span>`; }).join('')}</div></details>` : ''}
  <p class="tar-legenda">Arraste para outra coluna (ou ▶). Ao sair de <b>Imprimindo</b>, o filamento sai do estoque e as horas entram na impressora.</p>`;
  prLigarArraste(el);
}
function prLigarArraste(el) {
  if (el._arraste) return; el._arraste = true;
  const col = e => e.target && e.target.closest ? e.target.closest('.cl-coluna') : null;
  el.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.pr-ordem'); if (!c) return; prEstado.arrastando = Number(c.dataset.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (_) { /* o id fica no estado */ } c.classList.add('arrastando'); });
  el.addEventListener('dragend', () => { prEstado.arrastando = null; el.querySelectorAll('.arrastando, .alvo').forEach(x => x.classList.remove('arrastando', 'alvo')); });
  el.addEventListener('dragover', e => { const c = col(e); if (!c || prEstado.arrastando == null) return; e.preventDefault(); el.querySelectorAll('.cl-coluna.alvo').forEach(x => { if (x !== c) x.classList.remove('alvo'); }); c.classList.add('alvo'); });
  el.addEventListener('dragleave', e => { const c = col(e); if (c && !c.contains(e.relatedTarget)) c.classList.remove('alvo'); });
  el.addEventListener('drop', e => { const c = col(e); if (!c || prEstado.arrastando == null) return; e.preventDefault(); const id = prEstado.arrastando; prEstado.arrastando = null; const o = ordemPorId(id); if (o && o.status !== c.dataset.status) mudarStatusOrdem(id, c.dataset.status); });
}

// ═══════════════════════ 4. A RECEITA DO CUSTO (produtos) ═════════════════
function prRenderProdutos() {
  const el = document.getElementById('prd-lista'); if (!el) return;
  if (!produtos.length) { el.innerHTML = '<div class="sp-vazio">Cadastre uma peça com gramas e horas — o app calcula o custo e sugere o preço.</div>'; return; }
  el.innerHTML = `<div class="cl-cardapio">${produtos.map(p => {
    const c = custoProduto(p), sug = !Number(p.preco), preco = Number(p.preco) || precoSugerido(p), lucro = preco - c.total, pct = preco > 0 ? Math.round(lucro / preco * 100) : 0;
    const seg = (v, cls, t) => c.total ? `<i class="${cls}" style="width:${(v / c.total * 100).toFixed(1)}%" title="${t} ${formatCurrency(v)}"></i>` : '';
    const vendidos = vendas.filter(v => Number(v.produtoId) === p.id).reduce((a, v) => a + (Number(v.qtd) || 1), 0);
    return `<div class="cl-prato pr-prod${p.ativo === false ? ' off' : ''}">
      <div class="cl-prato-topo"><span class="cl-prato-ic">🧩</span><div><b>${esc(p.nome)}</b><small>${p.gramas || 0} g · ${String(p.horas || 0).replace('.', ',')} h de máquina${p.minAcabamento ? ' · ' + p.minAcabamento + ' min de acabamento' : ''}</small></div></div>
      <div class="pr-receita"><div class="pr-receita-barra">${seg(c.filamento, 'fil', '🧵 filamento')}${seg(c.maquina, 'maq', '🖨️ máquina')}${seg(c.mao, 'mao', '🧽 acabamento')}${seg(c.extra, 'ext', '➕ extras')}</div>
        <div class="pr-receita-leg"><span class="fil">🧵 ${formatCurrency(c.filamento)}</span><span class="maq">🖨️ ${formatCurrency(c.maquina)}</span><span class="mao">🧽 ${formatCurrency(c.mao)}</span>${c.extra ? `<span class="ext">➕ ${formatCurrency(c.extra)}</span>` : ''}</div></div>
      <div class="pr-prod-contas"><div><small>custo</small><b>${formatCurrency(c.total)}</b></div><div><small>${sug ? 'sugerido' : 'vende'}</small><b>${formatCurrency(preco)}</b></div><div><small>sobra · ${pct}%</small><b class="${lucro >= 0 ? 'bom' : 'ruim'}">${formatCurrency(lucro)}</b></div></div>
      ${vendidos ? `<small class="cl-prato-nota">${plural(vendidos, 'unidade vendida', 'unidades vendidas')}</small>` : ''}
      <div class="cl-pac-acoes"><button type="button" class="mini-btn on" title="Mandar para a fila" onclick="ordemDoProduto(${p.id})">▶ imprimir</button><button type="button" class="mini-btn" title="Editar" onclick="editarProduto(${p.id})">✎</button><button type="button" class="mini-btn" title="Apagar" onclick="removerProduto(${p.id})">✕</button></div>
    </div>`;
  }).join('')}</div>`;
}

// ═════════════════════════ 5. OS CARRETÉIS (estoque) ══════════════════════
function prRenderFilamentos() {
  const el = document.getElementById('fil-lista'); if (!el) return;
  const total = filamentos.reduce((a, f) => a + (Number(f.gramasRestantes) || 0), 0), valor = filamentos.reduce((a, f) => a + (Number(f.gramasRestantes) || 0) * custoPorGrama(f), 0);
  const resumo = document.getElementById('fil-resumo');
  if (resumo) resumo.innerHTML = filamentos.length ? `<div class="tar-num"><b>${(total / 1000).toFixed(2).replace('.', ',')} kg</b><small>em ${plural(filamentos.length, 'rolo', 'rolos')}</small></div><div class="tar-num"><b>R$ ${finCompacto(valor)}</b><small>valor em estoque</small></div><div class="tar-num${filamentos.filter(filamentoBaixo).length ? ' alerta' : ''}"><b>${filamentos.filter(filamentoBaixo).length}</b><small>acabando</small></div>` : '';
  if (!filamentos.length) { el.innerHTML = '<div class="sp-vazio">Cadastre os rolos: é daqui que sai o custo por grama de cada peça.</div>'; return; }
  const r = 34, c = 2 * Math.PI * r;
  el.innerHTML = `<div class="pr-carreteis">${[...filamentos].sort((a, b) => (Number(a.gramasRestantes) || 0) / (Number(a.gramasRolo) || 1000) - (Number(b.gramasRestantes) || 0) / (Number(b.gramasRolo) || 1000)).map(f => {
    const mat = MATERIAIS[f.material] || MATERIAIS.outro, resta = Number(f.gramasRestantes) || 0, pct = Math.max(0, Math.min(100, Math.round(resta / (Number(f.gramasRolo) || 1000) * 100))), baixo = filamentoBaixo(f), cor = prCorFil(f);
    const usos = produtos.filter(p => Number(p.filamentoId) === f.id && Number(p.gramas) > 0), media = usos.length ? usos.reduce((a, p) => a + Number(p.gramas), 0) / usos.length : 0;
    return `<div class="pr-carretel${baixo ? ' baixo' : ''}">
      <svg viewBox="0 0 90 90" aria-hidden="true"><circle cx="45" cy="45" r="42" class="aba"/><circle cx="45" cy="45" r="${r}" fill="none" stroke="${cor}" stroke-opacity=".22" stroke-width="12"/><circle cx="45" cy="45" r="${r}" fill="none" stroke="${cor}" stroke-width="12" stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 45 45)" class="fio"/><circle cx="45" cy="45" r="18" class="miolo"/><text x="45" y="49" class="pct">${pct}%</text></svg>
      <b>${esc(mat[1])} ${esc(f.cor || '')}</b>
      <small>${Math.round(resta)} g${f.marca ? ' · ' + esc(f.marca) : ''}</small>
      <small class="pr-pecas">${baixo ? '⚠️ acabando' : media ? `~${Math.floor(resta / media)} ${palavra(Math.floor(resta / media), 'peça', 'peças')}` : formatCurrency(custoPorGrama(f) * 1000) + '/kg'}</small>
      <div class="cl-pac-acoes"><button type="button" class="mini-btn${baixo ? ' on' : ''}" title="Repor o rolo (volta ao cheio)" onclick="reporFilamento(${f.id})">↻ repor</button><button type="button" class="mini-btn" title="Editar" onclick="editarFilamento(${f.id})">✎</button><button type="button" class="mini-btn" title="Apagar" onclick="removerFilamento(${f.id})">✕</button></div>
    </div>`;
  }).join('')}</div>`;
}

// ═══════════════════════ 6. AS VENDAS E AS MÁQUINAS ═══════════════════════
function prRenderVendas() {
  const el = document.getElementById('vnd-lista'); if (!el) return;
  const ym = hojeISO().slice(0, 7), doMes = vendas.filter(v => (v.data || '').startsWith(ym));
  const r = document.getElementById('vnd-resumo');
  const somaB = doMes.reduce((a, v) => a + liquidoVenda(v).bruto, 0), somaL = doMes.reduce((a, v) => a + liquidoVenda(v).liquido, 0);
  const porPl = {}; vendas.forEach(v => { const k = v.plataforma || 'direto', c = liquidoVenda(v); porPl[k] = porPl[k] || { b: 0, l: 0, n: 0 }; porPl[k].b += c.bruto; porPl[k].l += c.liquido; porPl[k].n++; });
  if (r) r.innerHTML = `<div class="lz-resumo cl-tiles"><div class="tar-num"><b>R$ ${finCompacto(somaB)}</b><small>vendido no mês (${doMes.length})</small></div><div class="tar-num"><b class="${somaL >= 0 ? '' : 'pr-neg'}">R$ ${finCompacto(somaL)}</b><small>sobrou de verdade</small></div><div class="tar-num"><b>${somaB ? Math.round(somaL / somaB * 100) : 0}%</b><small>fica com você</small></div></div>` +
    (Object.keys(porPl).length > 1 ? `<h3 class="tar-gr-tit">🏪 Onde sobra mais (de cada R$ 100 vendidos)</h3><div class="cl-origens">${Object.entries(porPl).sort((a, b) => b[1].l / (b[1].b || 1) - a[1].l / (a[1].b || 1)).map(([k, x]) => { const pl = PLATAFORMAS[k] || PLATAFORMAS.direto, pc = x.b ? Math.round(x.l / x.b * 100) : 0; return `<div class="cl-orig"><span>${pl[0]} ${esc(pl[1])}</span><div><i style="width:${Math.max(0, pc)}%; background:${pc >= 0 ? 'var(--ok)' : 'var(--perigo)'}"></i></div><b class="pr-val">R$ ${pc}</b></div>`; }).join('')}</div>` : '');
  el.innerHTML = vendas.length ? `<div class="pr-vendas">${[...vendas].sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.id - a.id).slice(0, 40).map(v => {
    const p = produtoPorId(v.produtoId), pl = PLATAFORMAS[v.plataforma] || PLATAFORMAS.direto, c = liquidoVenda(v), b = c.bruto || 1;
    return `<div class="pr-venda"><div class="pr-venda-topo"><span>${pl[0]}</span><div><b>${esc(p ? p.nome : 'produto apagado')}${v.qtd > 1 ? ` ×${v.qtd}` : ''}</b><small>${esc(pl[1])} · ${isoParaBR(v.data).slice(0, 5)} · bruto ${formatCurrency(c.bruto)}</small></div><strong class="${c.liquido >= 0 ? 'bom' : 'ruim'}">${formatCurrency(c.liquido)}</strong></div>
      <div class="pr-venda-barra" title="sobra ${formatCurrency(c.liquido)} · custo ${formatCurrency(c.custo)} · taxa ${formatCurrency(c.taxa)} · frete ${formatCurrency(c.frete)}"><i class="sob" style="width:${Math.max(0, c.liquido / b * 100).toFixed(1)}%"></i><i class="cus" style="width:${(c.custo / b * 100).toFixed(1)}%"></i><i class="tax" style="width:${((c.taxa + c.frete) / b * 100).toFixed(1)}%"></i></div>
      <div class="pr-venda-pe"><small>custo ${formatCurrency(c.custo)} · taxa ${formatCurrency(c.taxa)}${c.frete ? ' · frete ' + formatCurrency(c.frete) : ''}</small><button type="button" class="mini-btn xs" title="Apagar (o lançamento em Finanças sai junto)" onclick="removerVenda(${v.id})">✕</button></div></div>`;
  }).join('')}</div>` : '<div class="sp-vazio">As vendas entram aqui com taxa e frete descontados. Escreva na barra acima, ex.: <b>2 suporte shopee 59,90</b>.</div>';
}
function prRenderMaquinas() {
  const el = document.getElementById('maq-lista'); if (!el) return;
  el.innerHTML = maquinas.length ? `<div class="pr-maquinas">${maquinas.map(m => prMaquinaCartao(m, true)).join('')}</div>` : '<div class="sp-vazio">Nenhuma impressora. Cadastre uma para o custo por hora entrar no preço.</div>';
}

// ══════════════════════════ O DESENHO GERAL ═══════════════════════════════
/** Chamado pelo verSecaoProducao() do app.js depois de trocar a micro-aba. */
function prAoTrocar() {
  const r = document.getElementById('sec-pr-rapida'); if (r) r.hidden = !['painel', 'fila', 'vendas'].includes(prSecao());
  prRapidaPrevia();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
