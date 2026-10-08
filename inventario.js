// ════════════════════════════════════════════════════════════════════════════
// INVENTÁRIO — os bens como itens de jogo (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele: "um setor que seja tipo o inventário da pessoa, como se fosse um
// inventário de jogo, onde você seleciona cada coisa, cada peça, cada item que
// você tem e visualiza ele, e valor e tudo mais (…) de uma forma lúdica (…) um
// apartamento, um carro, um computador, uma geladeira (…) a quantidade de
// impressoras que tem ali, o que isso é em termos de patrimônio".
// Decisões dele (08/10): ABA PRÓPRIA; patrimônio mostra OS DOIS números
// (investido, como sempre, e o completo = investido + bens); visual de JOGO
// COMPLETO (raridade pelo valor, atributos, quantidade, foto opcional).
//
// Módulo novo `inventario` → Regra da União (SYNC_MODULOS, export, import,
// redesenharTudo e a recarga do aplicarRemoto). A foto, se houver, mora em
// `lifeos_imgs` (local): base64 estoura a célula da planilha (armadilha nº 4).
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

/** Categorias: a figura de cada item sai daqui (o dono escolhe entre as da
 *  categoria) e a depreciação anual sugerida também. */
const INV_CATS = {
  imovel:     { nome: 'Imóveis',               ic: '🏠', icones: ['🏠', '🏢', '🏡', '🏬', '🏗️', '🌳'], dep: 0 },
  veiculo:    { nome: 'Veículos',              ic: '🚗', icones: ['🚗', '🏍️', '🚲', '🛻', '🚐', '🛵'], dep: 10 },
  eletronico: { nome: 'Eletrônicos',           ic: '💻', icones: ['💻', '🖥️', '📱', '📺', '🎮', '📷', '🎧', '⌚'], dep: 20 },
  casa:       { nome: 'Eletrodomésticos',      ic: '🧊', icones: ['🧊', '🍳', '🧺', '🌀', '☕', '🔥'], dep: 10 },
  movel:      { nome: 'Móveis',                ic: '🛋️', icones: ['🛋️', '🛏️', '🪑', '🗄️', '🚪'], dep: 8 },
  maquina:    { nome: 'Máquinas e ferramentas', ic: '🖨️', icones: ['🖨️', '🛠️', '⚙️', '🪚', '🔧', '🧰'], dep: 15 },
  medico:     { nome: 'Equipamento médico',    ic: '🩺', icones: ['🩺', '💉', '🩻', '🦴', '🧪'], dep: 10 },
  hobby:      { nome: 'Hobby e esporte',       ic: '🎸', icones: ['🎸', '🚴', '⚽', '🎾', '🏋️', '🎣', '🎹'], dep: 10 },
  joia:       { nome: 'Joias e relógios',      ic: '💍', icones: ['💍', '⌚', '💎', '📿'], dep: 0 },
  colecao:    { nome: 'Arte e coleção',        ic: '🖼️', icones: ['🖼️', '🗿', '📚', '🏺', '🪙'], dep: 0 },
  outro:      { nome: 'Outros',                ic: '📦', icones: ['📦', '🎁', '🧳', '🔑'], dep: 10 }
};
/** Raridade pelo valor de UMA unidade — as cores clássicas de jogo. */
const INV_RARIDADE = [
  { min: 100000, k: 'lendario', nome: 'Lendário', cor: '#f59e0b' },
  { min: 20000,  k: 'epico',    nome: 'Épico',    cor: '#a855f7' },
  { min: 5000,   k: 'raro',     nome: 'Raro',     cor: '#3b82f6' },
  { min: 1000,   k: 'incomum',  nome: 'Incomum',  cor: '#22c55e' },
  { min: 0,      k: 'comum',    nome: 'Comum',    cor: '#9ca3af' }
];
const INV_ESTADOS = { novo: ['Novo', 5], otimo: ['Ótimo', 4], bom: ['Bom', 3], gasto: ['Gasto', 2], quebrado: ['Precisa de conserto', 1] };
/** Níveis do inventário (o "nível do personagem"): soma dos bens. */
const INV_NIVEIS = [0, 5000, 15000, 40000, 100000, 250000, 500000, 1000000, 2500000, 5000000];
const invEstado = { sel: null, cat: '', dono: '', ordem: 'valor' };

// ───────────────────────────── contas ─────────────────────────────────────
function invCat(k) { return INV_CATS[k] || INV_CATS.outro; }
function invAnos(iso) { if (!iso) return 0; return Math.max(0, (Date.now() - new Date(iso + 'T12:00:00').getTime()) / (365.25 * 864e5)); }
/** Valor de UMA unidade hoje: o que ele informou; se não informou, a conta da
 *  depreciação sobre o que pagou. */
function invValorUnit(it) {
  if (Number(it.valor) > 0) return { v: Number(it.valor), estimado: false };
  const pago = Number(it.compra) || 0; if (!pago) return { v: 0, estimado: false };
  const dep = (it.dep === undefined || it.dep === '' ? invCat(it.cat).dep : Number(it.dep)) / 100;
  return { v: Math.round(pago * Math.pow(1 - dep, invAnos(it.data))), estimado: dep > 0 && !!it.data };
}
function invValorTotal(it) { return invValorUnit(it).v * (Number(it.qtd) || 1); }
function invRaridade(it) { const v = invValorUnit(it).v; return INV_RARIDADE.find(r => v >= r.min); }
/** Total dos bens (opcional: só pessoal ou só empresa). */
function valorBens(dono) { return inventario.filter(it => !dono || (it.dono || 'pessoal') === dono).reduce((a, it) => a + invValorTotal(it), 0); }
function invNivel(total) {
  let n = 0; INV_NIVEIS.forEach((lim, i) => { if (total >= lim) n = i; });
  const ini = INV_NIVEIS[n], fim = INV_NIVEIS[n + 1];
  return { n: n + 1, frac: fim ? (total - ini) / (fim - ini) : 1, falta: fim ? fim - total : 0, prox: fim };
}

// ───────────────────────────── cadastro ───────────────────────────────────
function preencherFormInventario() {
  const c = document.getElementById('inv-cat');
  if (c && !c.options.length) c.innerHTML = Object.entries(INV_CATS).map(([k, v]) => `<option value="${k}">${v.ic} ${v.nome}</option>`).join('');
  const e = document.getElementById('inv-estado');
  if (e && !e.options.length) e.innerHTML = Object.entries(INV_ESTADOS).map(([k, v]) => `<option value="${k}"${k === 'bom' ? ' selected' : ''}>${'★'.repeat(v[1])} ${v[0]}</option>`).join('');
  invDesenharIcones();
}
/** As figuras da categoria escolhida, para tocar e escolher. */
function invDesenharIcones() {
  const el = document.getElementById('inv-icones'); const c = document.getElementById('inv-cat'); const h = document.getElementById('inv-ic');
  if (!el || !c || !h) return;
  const cat = invCat(c.value); if (!cat.icones.includes(h.value)) h.value = cat.icones[0];
  el.innerHTML = cat.icones.map((ic, i) => `<button type="button" class="inv-ic-op${h.value === ic ? ' on' : ''}" onclick="invEscolherIcone(${i})">${ic}</button>`).join('');
  const dep = document.getElementById('inv-dep'); if (dep && !dep.dataset.mexeu) dep.placeholder = cat.dep + '% (sugestão)';
}
function invEscolherIcone(i) {
  const c = document.getElementById('inv-cat'); const h = document.getElementById('inv-ic'); if (!c || !h) return;
  h.value = invCat(c.value).icones[i] || h.value; invDesenharIcones();
}
function salvarItemInventario(ev) {
  if (ev) ev.preventDefault();
  const v = id => (document.getElementById(id) || {}).value || '';
  const num = id => { const n = parseFloat(String(v(id)).replace(',', '.')); return isFinite(n) ? n : 0; };
  const nome = v('inv-nome').trim(); if (!nome) { toast('Dê um nome ao item.'); return; }
  const dados = { nome, cat: v('inv-cat') || 'outro', ic: v('inv-ic') || invCat(v('inv-cat')).ic, qtd: Math.max(1, Math.round(num('inv-qtd')) || 1),
    valor: num('inv-valor'), compra: num('inv-compra'), data: v('inv-data'), estado: v('inv-estado') || 'bom',
    dep: v('inv-dep') === '' ? '' : num('inv-dep'), dono: v('inv-dono') || 'pessoal', onde: v('inv-onde').trim(),
    garantia: v('inv-garantia'), notas: v('inv-notas').trim(), atualizadoEm: Date.now() };
  const id = v('inv-id');
  if (id) { const it = inventario.find(x => String(x.id) === id); if (!it) return; Object.assign(it, dados); invEstado.sel = it.id; }
  else { const it = { id: novoId(), criadoEm: Date.now(), ...dados }; inventario.push(it); invEstado.sel = it.id; }
  salvar('inventario', inventario); cancelarItemInventario(); renderInventario();
  if (typeof redesenharNegociosVisual === 'function') redesenharNegociosVisual();
  toast(id ? '🎒 Item atualizado.' : `🎒 ${dados.ic} ${nome} entrou no inventário.`);
}
function cancelarItemInventario() {
  const f = document.getElementById('inv-form'); if (!f) return;
  f.reset(); document.getElementById('inv-id').value = ''; document.getElementById('inv-ic').value = '';
  const dep = document.getElementById('inv-dep'); if (dep) delete dep.dataset.mexeu;
  document.getElementById('inv-submit').innerText = 'Guardar no inventário';
  document.getElementById('inv-cancel').hidden = true; invDesenharIcones();
}
function editarItemInventario(id) {
  const it = inventario.find(x => x.id === id); if (!it) return;
  const s = (k, val) => { const e = document.getElementById(k); if (e) e.value = val === undefined || val === null ? '' : val; };
  s('inv-id', it.id); s('inv-nome', it.nome); s('inv-cat', it.cat); s('inv-ic', it.ic); s('inv-qtd', it.qtd || 1);
  s('inv-valor', it.valor || ''); s('inv-compra', it.compra || ''); s('inv-data', it.data); s('inv-estado', it.estado || 'bom');
  s('inv-dep', it.dep); s('inv-dono', it.dono || 'pessoal'); s('inv-onde', it.onde); s('inv-garantia', it.garantia); s('inv-notas', it.notas);
  invDesenharIcones();
  document.getElementById('inv-submit').innerText = 'Salvar o item'; document.getElementById('inv-cancel').hidden = false;
  // na casca nova o formulário mora numa folha: o focus() é o que a abre
  const n = document.getElementById('inv-nome'); if (n) n.focus();
}
function removerItemInventario(id) {
  const it = inventario.find(x => x.id === id); if (!it || !confirm(`Tirar "${it.nome}" do inventário?`)) return;
  inventario = inventario.filter(x => x.id !== id); salvar('inventario', inventario);
  const im = lerImgs(); if (im['inv-' + id]) { delete im['inv-' + id]; gravarImgs(im); }
  if (invEstado.sel === id) invEstado.sel = null;
  renderInventario(); if (typeof redesenharNegociosVisual === 'function') redesenharNegociosVisual();
}
function invQtd(id, d) {
  const it = inventario.find(x => x.id === id); if (!it) return;
  it.qtd = Math.max(1, (Number(it.qtd) || 1) + d); it.atualizadoEm = Date.now();
  salvar('inventario', inventario); renderInventario(); if (typeof redesenharNegociosVisual === 'function') redesenharNegociosVisual();
}
function invAtualizarValor(id) {
  const it = inventario.find(x => x.id === id); if (!it) return;
  const r = prompt(`Quanto vale hoje UMA unidade de "${it.nome}" (R$)? Vazio = estimar pela depreciação.`, it.valor ? String(it.valor).replace('.', ',') : '');
  if (r === null) return;
  const n = parseFloat(String(r).replace(/\./g, '').replace(',', '.'));
  it.valor = isFinite(n) && n > 0 ? n : 0; it.atualizadoEm = Date.now();
  salvar('inventario', inventario); renderInventario(); if (typeof redesenharNegociosVisual === 'function') redesenharNegociosVisual();
}
/** As impressoras (e o resto) cadastradas na Produção viram itens num toque. */
function invMaquinasForaDoInventario() { return (typeof maquinas !== 'undefined' ? maquinas : []).filter(m => m && m.id && !inventario.some(it => it.maquinaId && it.maquinaId === m.id)); }
function invTrazerDaProducao() {
  const lista = invMaquinasForaDoInventario(); if (!lista.length) return;
  lista.forEach(m => inventario.push({ id: novoId(), criadoEm: Date.now(), atualizadoEm: Date.now(), nome: m.nome, cat: 'maquina', ic: '🖨️', qtd: 1,
    valor: 0, compra: 0, data: '', estado: 'bom', dep: '', dono: 'empresa', onde: 'Produção', garantia: '', notas: '', maquinaId: m.id }));
  salvar('inventario', inventario); renderInventario();
  toast(`🖨️ ${plural(lista.length, 'máquina entrou', 'máquinas entraram')} no inventário. Toque em cada uma e informe o valor.`, 6000);
}

// ───────────────────────────── foto (local) ───────────────────────────────
function invEscolherFoto(id) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const lado = 420, k = Math.min(1, lado / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      const dado = cv.toDataURL('image/jpeg', 0.78);
      const im = lerImgs(); im['inv-' + id] = { data: dado, nome: f.name, em: Date.now() };
      if (!gravarImgs(im)) { toast('Sem espaço neste aparelho para a foto.'); return; }
      renderInventario(); toast('📷 Foto guardada neste aparelho (não sincroniza — fica só aqui).', 5000);
    };
    img.src = url;
  };
  inp.click();
}
function invTirarFoto(id) { const im = lerImgs(); delete im['inv-' + id]; gravarImgs(im); renderInventario(); }
function invFoto(id) { const f = lerImgs()['inv-' + id]; return f && f.data ? f.data : ''; }

// ───────────────────────────── a tela ─────────────────────────────────────
function invFiltrar(k, val) { invEstado[k] = invEstado[k] === val ? '' : val; renderInventario(); }
function invOrdenar(o) { invEstado.ordem = o; renderInventario(); }
function invSelecionar(id) { invEstado.sel = invEstado.sel === id ? null : id; renderInventario();
  if (invEstado.sel && window.matchMedia('(max-width: 899px)').matches) { const f = document.getElementById('inv-ficha'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
function invNovoNaCategoria(cat) {
  cancelarItemInventario(); const c = document.getElementById('inv-cat'); if (c && cat) { c.value = cat; invDesenharIcones(); }
  const n = document.getElementById('inv-nome'); if (n) n.focus();
}
/** O anel de dois lados: investido × bens (o "patrimônio completo"). */
function invAnelCompleto(inv, bens, tam) {
  const tot = inv + bens; const r = 15.5, C = 2 * Math.PI * r; const f = tot ? inv / tot : 0;
  return `<svg class="inv-anel2" viewBox="0 0 40 40" width="${tam}" height="${tam}" aria-hidden="true">
    <circle cx="20" cy="20" r="${r}" style="stroke:var(--atencao)" class="inv-anel2-a"/>
    ${f > 0 ? `<circle cx="20" cy="20" r="${r}" style="stroke:var(--info)" class="inv-anel2-a" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/>` : ''}</svg>`;
}
function invTopo() {
  const bens = valorBens(); const inv = typeof patrimonioTotal === 'function' ? patrimonioTotal() : 0;
  const nv = invNivel(bens); const cont = {};
  inventario.forEach(it => { const r = invRaridade(it).k; cont[r] = (cont[r] || 0) + (Number(it.qtd) || 1); });
  const top = [...inventario].sort((a, b) => invValorUnit(b).v - invValorUnit(a).v)[0];
  const emp = valorBens('empresa');
  return `<div class="inv-topo">
    <div class="inv-nivel">${spAnel(nv.frac, 'var(--atencao)', 74, 'nv ' + nv.n)}
      <div><strong>Nível ${nv.n}</strong><small>${nv.prox ? `faltam ${formatCurrency(nv.falta)} para o nível ${nv.n + 1}` : 'nível máximo 👑'}</small></div></div>
    <div class="inv-bens"><small>BENS NO INVENTÁRIO</small><strong>${formatCurrency(bens)}</strong>
      <span>${plural(inventario.reduce((a, it) => a + (Number(it.qtd) || 1), 0), 'item', 'itens')}${emp ? ` · ${formatCurrency(emp)} da empresa` : ''}</span></div>
    <div class="inv-completo">${invAnelCompleto(inv, bens, 62)}
      <div><small>PATRIMÔNIO COMPLETO</small><strong>${formatCurrency(inv + bens)}</strong>
        <span><i style="background:var(--info)"></i>investido ${formatCurrency(inv)}</span><span><i style="background:var(--atencao)"></i>bens ${formatCurrency(bens)}</span></div></div>
    <div class="inv-raros">${INV_RARIDADE.map(r => `<span class="inv-raro" style="--r:${r.cor}" title="${r.nome}: a partir de ${formatCurrency(r.min)} por unidade"><i></i>${cont[r.k] || 0}</span>`).join('')}
      ${top ? `<small>mais valioso: <b>${top.ic} ${esc(top.nome)}</b></small>` : ''}</div>
  </div>`;
}
function invSlot(it) {
  const r = invRaridade(it); const u = invValorUnit(it); const foto = invFoto(it.id);
  return `<button type="button" class="inv-slot r-${r.k}${invEstado.sel === it.id ? ' sel' : ''}" style="--r:${r.cor}" onclick="invSelecionar(${it.id})" title="${esc(it.nome)} · ${r.nome}">
    <span class="inv-slot-fig">${foto ? `<img src="${foto}" alt="">` : it.ic || invCat(it.cat).ic}</span>
    ${(Number(it.qtd) || 1) > 1 ? `<b class="inv-qtd">×${it.qtd}</b>` : ''}
    ${(it.dono || 'pessoal') === 'empresa' ? '<i class="inv-emp" title="da empresa">🏭</i>' : ''}
    <span class="inv-slot-nome">${esc(it.nome)}</span>
    <span class="inv-slot-val">${u.v ? (u.estimado ? '≈ ' : '') + 'R$ ' + ngCompacto(invValorTotal(it)) : '? valor'}</span></button>`;
}
function invFicha(it) {
  if (!it) return `<div class="inv-ficha vazia"><span>🎒</span><strong>Toque num item</strong><small>A ficha dele aparece aqui: valor, raridade, idade, estado e o que ele representa no patrimônio.</small></div>`;
  const r = invRaridade(it); const u = invValorUnit(it); const c = invCat(it.cat); const tot = invValorTotal(it); const foto = invFoto(it.id);
  const bens = valorBens(); const anos = invAnos(it.data); const est = INV_ESTADOS[it.estado] || INV_ESTADOS.bom;
  const dep = it.dep === undefined || it.dep === '' ? c.dep : Number(it.dep);
  const pago = (Number(it.compra) || 0) * (Number(it.qtd) || 1);
  const garantia = it.garantia ? (it.garantia >= hojeISO() ? `até ${isoParaBR(it.garantia)}` : `venceu em ${isoParaBR(it.garantia)}`) : '—';
  const attr = (ic, nome, val) => `<div class="inv-attr"><span>${ic} ${nome}</span><b>${val}</b></div>`;
  return `<div class="inv-ficha r-${r.k}" style="--r:${r.cor}">
    <div class="inv-ficha-fig">${foto ? `<img src="${foto}" alt="">` : it.ic || c.ic}</div>
    <div class="inv-ficha-raro">${r.nome.toUpperCase()}</div>
    <h3>${esc(it.nome)}</h3><small class="inv-ficha-cat">${c.ic} ${c.nome} · ${(it.dono || 'pessoal') === 'empresa' ? '🏭 da empresa' : '🙋 pessoal'}${it.onde ? ' · 📍 ' + esc(it.onde) : ''}</small>
    <div class="inv-attrs">
      ${attr('💰', 'Valor hoje' + ((Number(it.qtd) || 1) > 1 ? ' (cada)' : ''), u.v ? (u.estimado ? '≈ ' : '') + formatCurrency(u.v) : 'não informado')}
      ${(Number(it.qtd) || 1) > 1 ? attr('🧮', `Total (×${it.qtd})`, formatCurrency(tot)) : ''}
      ${pago ? attr('🧾', 'Pago', formatCurrency(pago)) + attr(tot >= pago ? '📈' : '📉', tot >= pago ? 'Valorizou' : 'Perdeu', `${formatCurrency(Math.abs(tot - pago))} (${pago ? Math.round((tot / pago - 1) * 100) : 0}%)`) : ''}
      ${attr('⏳', 'Idade', it.data ? (anos < 1 ? 'menos de 1 ano' : spNum(anos, 1) + ' anos') + ' · desde ' + isoParaBR(it.data).slice(3) : '—')}
      ${attr('❤️', 'Estado', `<span class="inv-estrelas">${'★'.repeat(est[1])}${'☆'.repeat(5 - est[1])}</span> ${est[0]}`)}
      ${attr('📉', 'Depreciação', dep ? dep + '% ao ano' : 'não deprecia')}
      ${attr('🛡️', 'Garantia', garantia)}
      ${attr('⚖️', 'Peso nos bens', bens ? (tot / bens < 0.01 ? 'menos de 1%' : Math.round(tot / bens * 100) + '%') : '—')}
    </div>
    ${it.notas ? `<p class="inv-ficha-notas">${esc(it.notas)}</p>` : ''}
    ${u.estimado ? '<p class="hint">≈ valor estimado pela depreciação sobre o que você pagou. Toque em 💰 para informar o valor real.</p>' : ''}
    <div class="inv-ficha-acoes">
      <button type="button" class="mini-btn" onclick="invAtualizarValor(${it.id})">💰 valor</button>
      <button type="button" class="mini-btn" onclick="invQtd(${it.id}, -1)" title="Um a menos">−</button><button type="button" class="mini-btn" onclick="invQtd(${it.id}, 1)" title="Mais um">＋</button>
      <button type="button" class="mini-btn" onclick="invEscolherFoto(${it.id})">📷 foto</button>${foto ? `<button type="button" class="mini-btn" onclick="invTirarFoto(${it.id})" title="Tirar a foto">🚫📷</button>` : ''}
      <button type="button" class="mini-btn" onclick="editarItemInventario(${it.id})">✎</button>
      <button type="button" class="mini-btn" onclick="removerItemInventario(${it.id})" title="Tirar do inventário">✕</button></div>
  </div>`;
}
function renderInventario() {
  preencherFormInventario();
  const topo = document.getElementById('inv-topo'); const corpo = document.getElementById('inv-corpo');
  if (!topo || !corpo) return;
  topo.innerHTML = invTopo();
  const conta = k => inventario.filter(it => it.cat === k).reduce((a, it) => a + (Number(it.qtd) || 1), 0);
  const cats = Object.entries(INV_CATS).filter(([k]) => conta(k));
  let lista = inventario.filter(it => (!invEstado.cat || it.cat === invEstado.cat) && (!invEstado.dono || (it.dono || 'pessoal') === invEstado.dono));
  const ord = { valor: (a, b) => invValorTotal(b) - invValorTotal(a), raridade: (a, b) => invValorUnit(b).v - invValorUnit(a).v,
    recente: (a, b) => (b.criadoEm || 0) - (a.criadoEm || 0), nome: (a, b) => a.nome.localeCompare(b.nome) }[invEstado.ordem] || (() => 0);
  lista = [...lista].sort(ord);
  const sel = inventario.find(x => x.id === invEstado.sel) || null;
  const maqs = invMaquinasForaDoInventario();
  corpo.innerHTML = `<div class="inv-barra">
      <div class="inv-abas"><button type="button" class="${!invEstado.cat ? 'on' : ''}" onclick="invEstado.cat=''; renderInventario()">🎒 Tudo <b>${inventario.reduce((a, it) => a + (Number(it.qtd) || 1), 0)}</b></button>
        ${cats.map(([k, c]) => `<button type="button" class="${invEstado.cat === k ? 'on' : ''}" onclick="invFiltrar('cat', '${k}')" title="${c.nome}">${c.ic} <b>${conta(k)}</b></button>`).join('')}</div>
      <div class="inv-filtros">
        <button type="button" class="mini-btn${invEstado.dono === 'pessoal' ? ' on' : ''}" onclick="invFiltrar('dono', 'pessoal')">🙋 pessoal</button>
        <button type="button" class="mini-btn${invEstado.dono === 'empresa' ? ' on' : ''}" onclick="invFiltrar('dono', 'empresa')">🏭 empresa</button>
        <select aria-label="Ordenar" onchange="invOrdenar(this.value)">${[['valor', 'maior valor'], ['raridade', 'raridade'], ['recente', 'mais recentes'], ['nome', 'nome']].map(([k, r]) => `<option value="${k}"${invEstado.ordem === k ? ' selected' : ''}>↕ ${r}</option>`).join('')}</select>
        ${maqs.length ? `<button type="button" class="mini-btn inv-prod" onclick="invTrazerDaProducao()">🖨️ trazer ${plural(maqs.length, 'máquina', 'máquinas')} da Produção</button>` : ''}
      </div></div>
    <div class="inv-palco${sel ? ' com-ficha' : ''}">
      <div class="inv-grade" id="inv-grade">${lista.map(invSlot).join('')}
        <button type="button" class="inv-slot inv-novo" onclick="invNovoNaCategoria('${invEstado.cat}')" title="Guardar um item novo"><span class="inv-slot-fig">＋</span><span class="inv-slot-nome">novo item</span></button></div>
      <div id="inv-ficha">${invFicha(sel)}</div>
    </div>
    ${!inventario.length ? '<p class="hint">Comece pelo que vale mais: o apartamento, o carro, o computador. Cada item ganha uma figura, uma raridade pela faixa de valor e uma ficha com os atributos dele.</p>' : ''}`;
  // completa a última linha com espaços vazios: é o que dá a cara de inventário de jogo
  const g = document.getElementById('inv-grade');
  if (g) {
    const cols = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    const n = g.children.length; const vazios = ((cols - (n % cols)) % cols) + (n < cols * 2 ? cols : 0);
    for (let i = 0; i < vazios; i++) { const s = document.createElement('span'); s.className = 'inv-slot inv-vazio'; s.setAttribute('aria-hidden', 'true'); g.appendChild(s); }
  }
}
