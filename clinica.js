// ════════════════════════════════════════════════════════════════════════════
// CLÍNICA — O FUNIL DESENHADO, O QUADRO, A CASCATA E O CARDÁPIO (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • FUNIL de verdade (faixas que afunilam: quantas pessoas e quanto R$ chegaram
//     a cada etapa e o % que passa de uma para a outra) e, embaixo, o QUADRO em
//     colunas Lead · Avaliação · Agendado · Feito · Retorno — arrastar (ou ▶) muda
//     a etapa, com tudo que isso já fazia (receita, comissão, agenda);
//   • PAINEL: a CASCATA do dinheiro do mês (faturado → − custo → − comissões =
//     lucro), a rosca do faturamento por serviço e de onde vêm as pessoas;
//   • SERVIÇOS como CARDÁPIO, com o ANEL da margem (lucro · custo · comissão);
//   • a BARRA RÁPIDA: "Maria Souza implante 31 99999-0000 #instagram".
// Nenhum dado novo: `servicos`, `pacientes` e `repasses` com o mesmo formato.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const clEstado = { arrastando: null, perdidosAbertos: false };
const CL_CORES = ['#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#2dd4bf', '#f87171'];

// ───────────────────────────── utilidades ─────────────────────────────────
function clSecao() { return typeof clinicaSecao !== 'undefined' ? clinicaSecao : 'painel'; }
/** A etapa mais adiantada que a pessoa já alcançou (pelo histórico; o perdido conta até onde chegou). */
function clAlcance(p) {
  let max = ORDEM_ETAPAS.indexOf(p.etapa);
  (p.historico || []).forEach(h => { const i = ORDEM_ETAPAS.indexOf(h.etapa); if (i > max) max = i; });
  return Math.max(0, Math.min(3, max));
}

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function clEntender(txt) {
  let resto = String(txt || '');
  const tirar = re => { let a = null; resto = resto.replace(re, (...m) => { a = m; return ' '; }); return a; };
  const v = tirar(/(^|\s)R\$\s*(\d[\d.]*(?:,\d{1,2})?)/i);
  const tag = tirar(/(^|\s)#([\p{L}]+)/u);
  const origem = tag ? (ORIGENS.find(o => tarSemAcento(o).replace(/\s/g, '').startsWith(tarSemAcento(tag[2]).slice(0, 4))) || 'Outro') : '';
  const tel = tirar(/(\+?\d[\d\s().-]{7,}\d)/);
  const d = tarAcharData(resto); let data = '';
  if (d) { data = d.due; resto = resto.slice(0, d.ini) + ' ' + resto.slice(d.fim); }
  const hora = tirar(/(^|\s)(?:as\s+|às\s+)?(\d{1,2})(?:h|:)(\d{2})?(?=\s|$)/i);
  // o serviço: a primeira palavra forte (4+ letras) de um serviço que aparecer no texto
  const palavras = tarSemAcento(resto).split(/\s+/);
  let serv = null, palavra = '';
  for (const s of servicos.filter(x => x.ativo !== false)) {
    const forte = tarSemAcento(s.nome).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
    const achou = forte.find(w => palavras.includes(w));
    if (achou) { serv = s; palavra = achou; break; }
  }
  if (palavra) resto = resto.split(/\s+/).filter(w => tarSemAcento(w) !== palavra).join(' ');
  return { nome: resto.replace(/\s+/g, ' ').trim(), servico: serv, origem, telefone: tel ? tel[1].trim() : '', valor: v ? parseFloat(v[2].replace(/\./g, '').replace(',', '.')) || '' : '', data, hora: hora && Number(hora[2]) < 24 ? `${String(hora[2]).padStart(2, '0')}:${hora[3] || '00'}` : '' };
}
function clRapidaPrevia() {
  const el = document.getElementById('cl-rapida-previa'), inp = document.getElementById('cl-rapida'); if (!el || !inp) return;
  if (!inp.value.trim()) { el.innerHTML = '<span class="tar-dica">Ex.: <b>Maria Souza implante 31 99999-0000 #instagram</b> — com dia ("sexta 14h"), já entra como agendado e vai para a agenda.</span>'; return; }
  const e = clEntender(inp.value), p = [];
  p.push(e.servico ? `<span class="tar-lt" style="--cor:var(--ok)">✨ ${esc(e.servico.nome)}</span>` : '<span class="tar-dica">sem serviço ligado</span>');
  if (e.valor || e.servico) p.push(`<span class="nt-marc sem-hash">${formatCurrency(e.valor || e.servico.preco)}</span>`);
  if (e.telefone) p.push(`<span class="nt-marc sem-hash">📞 ${esc(e.telefone)}</span>`);
  if (e.origem) p.push(`<span class="nt-marc sem-hash">${esc(e.origem)}</span>`);
  p.push(e.data ? `<span class="tar-due prox">📅 ${esc(rotuloDataLonga(e.data))}${e.hora ? ' · ' + e.hora : ''} → agendado</span>` : '<span class="tar-dica">🌱 entra como lead</span>');
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(e.nome || '…')}</b> ${p.join(' ')}`;
}
function clRapidaAdicionar() {
  const inp = document.getElementById('cl-rapida'); if (!inp) return;
  const e = clEntender(inp.value); if (!e.nome) { inp.focus(); return; }
  const etapa = e.data ? 'agendado' : 'lead';
  const p = { id: novoId(), criadoEm: Date.now(), etapaEm: hojeISO(), recebido: false, eventId: null, historico: [{ etapa, quando: Date.now() }],
    nome: e.nome, telefone: e.telefone, origem: e.origem, servicoId: e.servico ? e.servico.id : '', valor: e.valor, etapa, proximaData: e.data, proximaHora: e.hora, responsavel: '', notas: '' };
  pacientes.push(p); sincronizarEventoPaciente(p); salvarTudoClinica();
  toast(`🌱 ${p.nome} entrou no funil${e.data ? ' — já está na agenda' : ''}.`);
  inp.value = ''; clRapidaPrevia(); inp.focus();
}

// ═══════════════════════ 2. O FUNIL DESENHADO E O QUADRO ══════════════════
function clFunilDesenho() {
  const nomes = ['lead', 'avaliacao', 'agendado', 'feito'];
  const chegou = nomes.map((k, i) => pacientes.filter(p => clAlcance(p) >= i));
  const total = chegou[0].length;
  if (!total) return '';
  return `<div class="cl-funil">${nomes.map((k, i) => {
    const lst = chegou[i], n = lst.length, soma = lst.reduce((a, p) => a + valorPaciente(p), 0), e = ETAPAS[k];
    const larg = Math.max(22, Math.round(n / total * 100)), conv = i && chegou[i - 1].length ? Math.round(n / chegou[i - 1].length * 100) : null;
    return `<div class="cl-funil-fila"><div class="cl-funil-faixa" style="--cor:${e[2]}; width:${larg}%"><b>${e[0]} ${e[1]}</b><span>${n}${soma ? `<em> · ${finCompacto(soma)}</em>` : ''}</span></div>${conv !== null ? `<small class="cl-conv" title="dos que chegaram a ${ETAPAS[nomes[i - 1]][1]}, quantos chegaram a ${e[1]}">${conv}% →</small>` : '<small class="cl-conv">entrou</small>'}</div>`;
  }).join('')}</div>`;
}
function clCartaoPac(p) {
  const s = servicoPorId(p.servicoId), i = ORDEM_ETAPAS.indexOf(p.etapa), pode = i >= 0 && i < ORDEM_ETAPAS.length - 1;
  return `<div class="cl-pac" draggable="true" data-id="${p.id}" style="--cor:${ETAPAS[p.etapa][2]}">
    <div class="cl-pac-topo"><b onclick="editarPaciente(${p.id})" title="Abrir para editar">${esc(p.nome)}</b><strong>${finCompacto(valorPaciente(p))}</strong></div>
    <small>${esc([s ? s.nome : '', p.origem].filter(Boolean).join(' · ')) || '&nbsp;'}</small>
    ${p.proximaData ? `<small class="cl-pac-data${p.proximaData < hojeISO() && p.etapa !== 'feito' ? ' atras' : ''}">📅 ${esc(rotuloData(p.proximaData))}${p.proximaHora ? ' ' + esc(p.proximaHora) : ''}</small>` : ''}
    ${p.responsavel ? `<small>👤 ${esc(p.responsavel)}</small>` : ''}
    <div class="cl-pac-acoes">${p.etapa === 'feito' ? `<button type="button" class="mini-btn${p.recebido ? ' on' : ''}" title="${p.recebido ? 'Voltar para a receber' : 'Marcar como recebido'}" onclick="alternarRecebido(${p.id})">${p.recebido ? '💵 recebido' : '💵 a receber'}</button>` : ''}${pode ? `<button type="button" class="mini-btn" title="Avançar para ${ETAPAS[ORDEM_ETAPAS[i + 1]][1]}" onclick="avancarEtapa(${p.id})">▶ ${ETAPAS[ORDEM_ETAPAS[i + 1]][1].toLowerCase()}</button>` : ''}${p.etapa !== 'perdido' && p.etapa !== 'feito' && p.etapa !== 'retorno' ? `<button type="button" class="mini-btn" title="Não fechou" onclick="moverEtapa(${p.id}, 'perdido')">✖️</button>` : ''}<button type="button" class="mini-btn" title="Editar" onclick="editarPaciente(${p.id})">✎</button></div>
  </div>`;
}
function clRenderFunil() {
  const el = document.getElementById('funil-lista'); if (!el) return;
  if (!pacientes.length) { el.innerHTML = '<div class="sp-vazio">Ninguém no funil ainda. Escreva na barra acima o nome de quem chegou.</div>'; return; }
  const perdidos = pacientes.filter(p => p.etapa === 'perdido');
  el.innerHTML = clFunilDesenho() + `<div class="cl-quadro">${ORDEM_ETAPAS.map(k => {
    const lst = pacientes.filter(p => p.etapa === k).sort((a, b) => (a.proximaData || '9').localeCompare(b.proximaData || '9')), e = ETAPAS[k];
    return `<section class="cl-coluna" data-etapa="${k}" style="--cor:${e[2]}"><header><b>${e[0]} ${e[1]}</b><small>${lst.length}${lst.length ? ' · ' + finCompacto(lst.reduce((a, p) => a + valorPaciente(p), 0)) : ''}</small></header>
      <div class="cl-coluna-lista">${lst.map(clCartaoPac).join('') || `<div class="cl-vazio">${e[3]}</div>`}</div></section>`;
  }).join('')}</div>
  ${perdidos.length ? `<details class="lz-largados"${clEstado.perdidosAbertos ? ' open' : ''} ontoggle="clEstado.perdidosAbertos = this.open"><summary>✖️ Não fecharam <small>${perdidos.length}</small></summary><div class="cl-perdidos">${perdidos.map(p => `<span class="cl-perdido">${esc(p.nome)}<button type="button" class="mini-btn xs" title="Voltar para lead" onclick="moverEtapa(${p.id}, 'lead')">↩</button><button type="button" class="mini-btn xs" title="Apagar" onclick="removerPaciente(${p.id})">✕</button></span>`).join('')}</div></details>` : ''}
  <p class="tar-legenda">Arraste um cartão para outra coluna (ou toque ▶). Ao chegar em <b>Feito</b>, o valor vira receita em Finanças e a comissão vira repasse.</p>`;
  clLigarArraste(el);
}
function clLigarArraste(el) {
  if (el._arraste) return; el._arraste = true;
  const col = e => e.target && e.target.closest ? e.target.closest('.cl-coluna') : null;
  el.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.cl-pac'); if (!c) return; clEstado.arrastando = Number(c.dataset.id); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.dataset.id); } catch (_) { /* o id fica no estado */ } c.classList.add('arrastando'); });
  el.addEventListener('dragend', () => { clEstado.arrastando = null; el.querySelectorAll('.arrastando, .alvo').forEach(x => x.classList.remove('arrastando', 'alvo')); });
  el.addEventListener('dragover', e => { const c = col(e); if (!c || clEstado.arrastando == null) return; e.preventDefault(); el.querySelectorAll('.cl-coluna.alvo').forEach(x => { if (x !== c) x.classList.remove('alvo'); }); c.classList.add('alvo'); });
  el.addEventListener('dragleave', e => { const c = col(e); if (c && !c.contains(e.relatedTarget)) c.classList.remove('alvo'); });
  el.addEventListener('drop', e => {
    const c = col(e); if (!c || clEstado.arrastando == null) return; e.preventDefault();
    const id = clEstado.arrastando; clEstado.arrastando = null;
    const p = pacientePorId(id); if (p && p.etapa !== c.dataset.etapa) moverEtapa(id, c.dataset.etapa);
  });
}

// ═══════════════════════ 3. A CASCATA E A ROSCA ═══════════════════════════
function clCascata(i) {
  if (!i.faturamento) return '<div class="sp-vazio">Nada faturado este mês ainda. Quando alguém for marcado como <b>Feito</b>, a cascata aparece.</div>';
  const F = i.faturamento, pct = v => Math.max(0, v / F * 100);
  const linha = (rot, valor, ini, larg, cls) => `<div class="cl-casc-fila"><span class="cl-casc-rot">${rot}</span><div class="cl-casc-trilho"><i class="${cls}" style="left:${ini.toFixed(2)}%; width:${Math.max(0.8, larg).toFixed(2)}%"></i></div><b class="${cls}">${formatCurrency(valor)}</b></div>`;
  return `<div class="cl-cascata">
    ${linha('💰 Faturado', F, 0, 100, 'fat')}
    ${linha('− Custo', i.custo, pct(F - i.custo), pct(i.custo), 'cus')}
    ${linha('− Comissões', i.comissao, pct(F - i.custo - i.comissao), pct(i.comissao), 'com')}
    ${linha('= Lucro', i.lucro, 0, pct(i.lucro), i.lucro >= 0 ? 'luc' : 'neg')}
  </div>`;
}
function clRosca(mapa) {
  const itens = Object.entries(mapa).sort((a, b) => b[1] - a[1]); if (!itens.length) return '<div class="sp-vazio">Sem atendimentos feitos no mês.</div>';
  const tot = itens.reduce((a, [, v]) => a + v, 0); let acc = 0;
  const r = 40, c = 2 * Math.PI * r;
  const segs = itens.map(([k, v], i) => { const f = v / tot, s = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${CL_CORES[i % CL_CORES.length]}" stroke-width="14" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-acc * c).toFixed(2)}" transform="rotate(-90 50 50)"><title>${esc(k)}: ${formatCurrency(v)}</title></circle>`; acc += f; return s; }).join('');
  return `<div class="cl-rosca"><svg viewBox="0 0 100 100" aria-hidden="true">${segs}<text x="50" y="47" class="t1">${finCompacto(tot)}</text><text x="50" y="60" class="t2">no mês</text></svg>
    <ul>${itens.map(([k, v], i) => `<li><i style="background:${CL_CORES[i % CL_CORES.length]}"></i><span>${esc(k)}</span><b>${Math.round(v / tot * 100)}%</b></li>`).join('')}</ul></div>`;
}
function clRenderPainel() {
  const el = document.getElementById('clinica-painel'); if (!el) return;
  const ym = hojeISO().slice(0, 7), i = indicadoresClinica(ym);
  const porServico = {}, porOrigem = {};
  i.doMes.forEach(p => { const n = nomeServico(p.servicoId) || 'Sem serviço'; porServico[n] = (porServico[n] || 0) + valorPaciente(p); });
  pacientes.forEach(p => { const o = p.origem || 'Sem origem'; porOrigem[o] = (porOrigem[o] || 0) + 1; });
  const origens = Object.entries(porOrigem).sort((a, b) => b[1] - a[1]), totO = origens.reduce((a, [, v]) => a + v, 0);
  el.innerHTML = `<div class="lz-resumo cl-tiles">
      <div class="tar-num"><b>${plural(i.doMes.length, 'atend.', 'atend.')}</b><small>ticket ${finCompacto(i.ticket)}</small></div>
      <div class="tar-num"><b>${i.conversao}%</b><small>do funil vira atendimento</small></div>
      <div class="tar-num"><b>${finCompacto(i.pipeline)}</b><small>em negociação</small></div>
      <div class="tar-num${i.aReceber ? ' alerta' : ''}"><b>${finCompacto(i.aReceber)}</b><small>feito, a receber</small></div>
    </div>
    <h3 class="tar-gr-tit">💧 Para onde vai o dinheiro de ${esc(nomeMes(ym).toLowerCase())}</h3>${clCascata(i)}
    <div class="cl-duas">
      <div><h3 class="tar-gr-tit">✨ Faturamento por serviço</h3>${clRosca(porServico)}</div>
      <div><h3 class="tar-gr-tit">🌱 De onde vêm as pessoas</h3>${origens.length ? `<div class="cl-origens">${origens.map(([k, v]) => `<div class="cl-orig"><span>${esc(k)}</span><div><i style="width:${Math.round(v / totO * 100)}%"></i></div><b>${v}</b></div>`).join('')}</div>` : '<div class="sp-vazio">Ninguém no funil ainda.</div>'}</div>
    </div>`;
  const det = document.getElementById('clinica-detalhe'); if (det) det.innerHTML = '';
}

// ═════════════════════════ 4. O CARDÁPIO DE SERVIÇOS ══════════════════════
function clRenderServicos() {
  const el = document.getElementById('serv-lista'); if (!el) return;
  if (!servicos.length) { el.innerHTML = '<div class="sp-vazio">Nenhum serviço ainda. Cadastre o que a clínica vende, com preço <em>e</em> custo — a margem sai sozinha.</div>'; return; }
  el.innerHTML = `<div class="cl-cardapio">${[...servicos].sort((a, b) => (a.ativo === false ? 1 : 0) - (b.ativo === false ? 1 : 0) || (b.preco || 0) - (a.preco || 0)).map(s => {
    const m = margemServico(s), t = TIPOS_SERVICO[s.tipo] || TIPOS_SERVICO.procedimento, off = s.ativo === false, preco = Number(s.preco) || 0;
    const pl = preco ? Math.max(0, m.lucro / preco * 100) : 0, pc = preco ? Math.min(100, (m.comissao / preco) * 100) : 0;
    const anel = `conic-gradient(var(--ok) 0 ${pl.toFixed(1)}%, var(--laranja) ${pl.toFixed(1)}% ${(pl + pc).toFixed(1)}%, color-mix(in srgb, var(--txt4) 70%, transparent) ${(pl + pc).toFixed(1)}% 100%)`;
    const vendas = pacientes.filter(p => Number(p.servicoId) === s.id && p.etapa === 'feito').length;
    return `<div class="cl-prato${off ? ' off' : ''}">
      <div class="cl-prato-topo"><span class="cl-prato-ic">${t[0]}</span><div><b>${esc(s.nome)}</b><small>${esc(t[1])}${s.tipo === 'pacote' ? ` · ${s.sessoes || 1} sessões` : ''}${off ? ' · fora do catálogo' : ''}</small></div></div>
      <div class="cl-prato-meio"><div><strong>${formatCurrency(preco)}</strong>${s.tipo === 'pacote' ? `<small>${formatCurrency(precoPorSessao(s))}/sessão</small>` : ''}<small>${plural(vendas, 'venda feita', 'vendas feitas')}</small></div>
        <span class="cl-anel${m.lucro < 0 ? ' neg' : ''}" style="background:${anel}" title="lucro ${formatCurrency(m.lucro)} · comissão ${formatCurrency(m.comissao)} · custo ${formatCurrency(s.custo || 0)}"><span>${m.pct}%</span></span></div>
      <div class="cl-prato-pe"><span class="cl-leg luc">lucro ${finCompacto(m.lucro)}</span><span class="cl-leg cus">custo ${finCompacto(s.custo || 0)}</span>${m.comissao ? `<span class="cl-leg com">comissão ${s.comissaoPct}%</span>` : ''}</div>
      ${s.notas ? `<small class="cl-prato-nota">${esc(s.notas)}</small>` : ''}
      <div class="cl-pac-acoes"><button type="button" class="mini-btn${off ? '' : ' on'}" title="${off ? 'Voltar ao catálogo' : 'Tirar do catálogo'}" onclick="alternarServicoAtivo(${s.id})">${off ? '▶ voltar' : '⏸'}</button><button type="button" class="mini-btn" title="Editar" onclick="editarServico(${s.id})">✎</button><button type="button" class="mini-btn" title="Apagar" onclick="removerServico(${s.id})">✕</button></div>
    </div>`;
  }).join('')}</div>`;
}

// ══════════════════════════ O DESENHO GERAL ═══════════════════════════════
/** Chamado pelo verSecaoClinica() do app.js depois de trocar a micro-aba. */
function clAoTrocar() {
  const r = document.getElementById('sec-cl-rapida'); if (r) r.hidden = clSecao() === 'servicos';
  clRapidaPrevia();
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
