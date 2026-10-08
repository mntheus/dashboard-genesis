// ════════════════════════════════════════════════════════════════════════════
// NEGÓCIOS — O PAINEL VISUAL, O MERCADO VIVO E AS NOTÍCIAS (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Pedido dele, depois de aprovar a Saúde: "quero esse empenho para as outras
// abas". Queixas antigas desta aba: o gráfico "é só um print" e "não dá para
// acrescentar moedas". Pedidos novos: notícias, vários tipos de ativo juntos,
// "os principais seus ali na frente", e "extrapole, seja fantástico".
//
// Cada parte com a sua cara (mesmo método da Saúde):
//   • MERCADO   → uma fita de cotações (os favoritos ⭐ na frente) e um gráfico
//                 que responde ao dedo, com modo COMPARAR dois ativos em %.
//   • NOTÍCIAS  → manchetes de vários jornais + as notícias dos SEUS ativos.
//   • CARTEIRA  → a rosca por classe (toque na fatia) e a linha do patrimônio
//                 com o que foi aportado; quantos meses a reserva aguenta.
//   • METAS     → cada meta é uma TRILHA com marcos, "em que mês você chega" e
//                 onde deveria estar hoje para cumprir o prazo.
//   • PROJETOS  → um FUNIL de estágios e um quadro de colunas (arrasta e solta).
//
// FONTES (decisão dele em 08/10: "os dois"): Banco Central e CoinGecko direto
// do navegador (aprovadas em 30/09); brapi.dev para a B3 (token grátis DELE,
// guardado só no aparelho); e a PONTE no Apps Script Genesis (Yahoo Finance e
// RSS de notícias), porque esses sites não deixam o navegador ler direto.
//
// O que ele escolhe acompanhar (`wealth.radar`) sincroniza — é escolha dele.
// As cotações e as notícias NÃO: são dado público e refazível (fica local).
// Carrega ANTES do app.js: aqui só se DECLARA; nada roda no carregamento.
// ════════════════════════════════════════════════════════════════════════════

// ───────────────────────────── catálogo e estado ──────────────────────────
const NG_PERIODOS = { '15d': [15, '1mo', '15 dias'], '1m': [31, '1mo', '1 mês'], '3m': [92, '3mo', '3 meses'], '6m': [183, '6mo', '6 meses'], '1a': [366, '1y', '1 ano'] };
const MERCADO_VALIDADE_MS = 6 * 3600 * 1000;   // cotação de hoje serve; de ontem, busca de novo
const NG_NOTICIAS_VALIDADE_MS = 30 * 60 * 1000;
const NG_CORES = ['#22c55e', '#38bdf8', '#f59e0b', '#a78bfa', '#f472b6', '#14b8a6', '#fb923c', '#60a5fa', '#e879f9', '#facc15', '#34d399', '#f87171'];
const NG_FONTES = {
  bcb:   ['🏛️', 'Banco Central'],
  coin:  ['🪙', 'CoinGecko'],
  brapi: ['🇧🇷', 'brapi (B3)'],
  yahoo: ['🌎', 'Yahoo (pela ponte)']
};
/** Moedas e juros do Banco Central. Números de série conferidos com curl
 *  (armadilha nº 31): libra 21623, iene 21621, poupança 195. */
const NG_BCB = [
  { ref: 1,     nome: 'Dólar',          ic: '💵', un: 'R$' },
  { ref: 21619, nome: 'Euro',           ic: '💶', un: 'R$' },
  { ref: 21623, nome: 'Libra',          ic: '💷', un: 'R$' },
  { ref: 21621, nome: 'Iene',           ic: '💴', un: 'R$' },
  { ref: 4389,  nome: 'CDI (a.a.)',     ic: '🏦', un: '%' },
  { ref: 432,   nome: 'Selic meta',     ic: '🎯', un: '%' },
  { ref: 13522, nome: 'IPCA 12 meses',  ic: '📊', un: '%' },
  { ref: 189,   nome: 'IGP-M (mês)',    ic: '📉', un: '%' },
  { ref: 195,   nome: 'Poupança (mês)', ic: '🐷', un: '%' }
];
/** Atalhos de cada aba do "＋ acompanhar" — o que a maioria procura primeiro. */
const NG_SUGESTOES = {
  b3:    [['PETR4', 'Petrobras', '⛽'], ['VALE3', 'Vale', '⛏️'], ['ITUB4', 'Itaú', '🏦'], ['BBAS3', 'Banco do Brasil', '🏦'], ['WEGE3', 'WEG', '⚙️'], ['BOVA11', 'ETF Ibovespa', '🧺'], ['MXRF11', 'FII Maxi Renda', '🏢'], ['HGLG11', 'FII CSHG Logística', '🏢']],
  mundo: [['^BVSP', 'Ibovespa', '🇧🇷', 'pts'], ['^GSPC', 'S&P 500', '🇺🇸', 'pts'], ['^IXIC', 'Nasdaq', '💻', 'pts'], ['GC=F', 'Ouro', '🥇'], ['SI=F', 'Prata', '🥈'], ['BZ=F', 'Petróleo Brent', '🛢️'], ['NVDA', 'NVIDIA', '🟩'], ['AAPL', 'Apple', '🍎'], ['MSFT', 'Microsoft', '🪟'], ['TSLA', 'Tesla', '🚗'], ['USDBRL=X', 'Dólar (Yahoo)', '💵']],
  cripto: [['bitcoin', 'Bitcoin', '🪙'], ['ethereum', 'Ethereum', '💠'], ['solana', 'Solana', '🌀'], ['ripple', 'XRP', '💧'], ['cardano', 'Cardano', '🔷'], ['binancecoin', 'BNB', '🟡']]
};
const NG_JORNAIS = {
  infomoney:  ['InfoMoney', '#16a34a'], moneytimes: ['Money Times', '#0ea5e9'], exame: ['Exame', '#ef4444'],
  g1: ['g1 Economia', '#dc2626'], investing: ['Investing', '#f59e0b'], google: ['Google Notícias', '#60a5fa']
};
const ngEstado = { sel: '', comparar: '', buscando: false, aba: 'b3', resultados: [], buscaTimer: null,
  noticiasFiltro: 'tudo', buscandoNoticias: false, fatia: '', metaSel: null, projetoAberto: null };

// ───────────────────────────── utilidades ─────────────────────────────────
function ngPausa(ms) { return new Promise(r => setTimeout(r, ms)); }
function ngCompacto(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace('.', ',') + ' mi';
  if (a >= 1e4) return (v / 1e3).toFixed(0) + ' mil';
  if (a >= 1e3) return (v / 1e3).toFixed(1).replace('.', ',') + ' mil';
  return Math.round(v).toString();
}
function ngHa(iso) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (isNaN(min)) return '';
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}
function ngMesAno(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').replace(' de ', '/'); }

// ═══════════════════════════════ O RADAR ══════════════════════════════════
// Item: { k, fonte: 'bcb'|'coin'|'brapi'|'yahoo', ref, nome, ic, un, cor, fav, logo }
function ngItemBCB(b) { return { k: 'bcb:' + b.ref, fonte: 'bcb', ref: b.ref, nome: b.nome, ic: b.ic, un: b.un }; }
function ngItemCoin(id, nome, ic) { return { k: 'coin:' + id, fonte: 'coin', ref: id, nome, ic: ic || '🪙', un: 'R$' }; }
/** O radar dele. Se ainda não existe, nasce do que estava escolhido no
 *  aparelho — mas SÓ EM MEMÓRIA: gravar aqui, ao desenhar, carimbaria a hora e
 *  podia passar por cima do radar do outro aparelho (armadilha nº 2). */
function ngRadar() {
  if (Array.isArray(wealth.radar)) return wealth.radar.map((x, i) => x.cor ? x : { ...x, cor: NG_CORES[i % NG_CORES.length] });
  const antigos = { usd: 1, eur: 21619, cdi: 4389, selic: 432, ipca: 13522, igpm: 189 };
  const coins = { btc: ['bitcoin', 'Bitcoin', '🪙'], eth: ['ethereum', 'Ethereum', '💠'], sol: ['solana', 'Solana', '🌀'] };
  const esc_ = (prefs.mercado && Array.isArray(prefs.mercado.escolhidos)) ? prefs.mercado.escolhidos : ['usd', 'btc', 'cdi', 'ipca'];
  const r = [];
  esc_.forEach(k => {
    if (antigos[k]) { const b = NG_BCB.find(x => x.ref === antigos[k]); if (b) r.push(ngItemBCB(b)); }
    else if (coins[k]) r.push(ngItemCoin(...coins[k]));
  });
  r.forEach((it, i) => { it.cor = NG_CORES[i % NG_CORES.length]; it.fav = i < 3; });
  return r;
}
function ngGravarRadar(lista) {
  wealth.radar = lista; salvar('wealth', wealth);
}
function ngItem(k) { return ngRadar().find(x => x.k === k) || null; }
function ngNoRadar(k) { return ngRadar().some(x => x.k === k); }
function ngAdicionar(item) {
  const lista = [...ngRadar()];
  if (lista.some(x => x.k === item.k)) { toast('Já está no seu radar.'); return; }
  item.cor = item.cor || NG_CORES[lista.length % NG_CORES.length];
  item.fav = lista.filter(x => x.fav).length < 4;
  lista.push(item); ngGravarRadar(lista);
  toast(`${item.ic || '📈'} ${item.nome} no radar${item.fav ? ' — e na frente, como favorito' : ''}.`);
  ngEstado.sel = item.k;
  ngRedesenhar(); renderAcompanhar(); atualizarMercado(false);
}
function ngRemover(k) {
  const it = ngItem(k); if (!it || !confirm(`Tirar ${it.nome} do radar?`)) return;
  ngGravarRadar(ngRadar().filter(x => x.k !== k));
  if (ngEstado.sel === k) ngEstado.sel = '';
  if (ngEstado.comparar === k) ngEstado.comparar = '';
  ngRedesenhar();
}
function ngFavoritar(k) {
  const lista = ngRadar().map(x => ({ ...x }));
  const it = lista.find(x => x.k === k); if (!it) return;
  it.fav = !it.fav; ngGravarRadar(lista); ngRedesenhar();
}
/** Favoritos primeiro (é o "os principais seus ali na frente"). */
function ngRadarOrdenado() { const r = ngRadar(); return [...r.filter(x => x.fav), ...r.filter(x => !x.fav)]; }

// ═════════════════════════════ AS FONTES ══════════════════════════════════
function cfgMercado() {
  prefs.mercado = prefs.mercado || {};
  if (prefs.mercado.ligado === undefined) prefs.mercado.ligado = true;
  if (!NG_PERIODOS[prefs.mercado.periodo]) prefs.mercado.periodo = '3m';
  return prefs.mercado;
}
function gravarMercado() { localStorage.setItem('lifeos_prefs', JSON.stringify(prefs)); }
function lerCotacoes() {
  try { return JSON.parse(localStorage.getItem('lifeos_cotacoes')) || { em: 0, dados: {} }; }
  catch (e) { return { em: 0, dados: {} }; }
}
function gravarCotacoes(c) {
  try { localStorage.setItem('lifeos_cotacoes', JSON.stringify(c)); } catch (e) { /* memória cheia: segue sem cache */ }
}
/** Token da brapi: só neste aparelho, nunca na tela, nunca na planilha
 *  (mesma regra do token da sincronização). */
function ngBrapiToken() { try { return localStorage.getItem('lifeos_brapi') || ''; } catch (e) { return ''; } }
function ngSalvarBrapi() {
  const el = document.getElementById('ng-brapi-token'); if (!el) return;
  const v = el.value.trim(); el.value = '';
  try { if (v) localStorage.setItem('lifeos_brapi', v); else localStorage.removeItem('lifeos_brapi'); } catch (e) { toast('Não consegui guardar neste aparelho.'); return; }
  toast(v ? '🔑 Token da brapi guardado neste aparelho.' : 'Token da brapi apagado deste aparelho.');
  ngRenderFontes(); atualizarMercado(true);
}
/** Estado da ponte no Apps Script: 'sem-sync' (falta ligar a sincronização),
 *  'velha' (o script ainda não tem a ponte), 'ok' ou '?' (ainda não testei). */
function ngPonteEstado() {
  if (typeof syncConfig === 'undefined' || !syncConfig.url || !syncConfig.token) return 'sem-sync';
  const p = prefs.ponte || {};
  return p.ok === true ? 'ok' : p.ok === false ? 'velha' : '?';
}
function ngMarcarPonte(ok) {
  const p = prefs.ponte || {};
  if (p.ok === ok) return;
  prefs.ponte = { ok, em: Date.now() }; gravarMercado();
}
async function ngPonte(acao, extra) {
  if (ngPonteEstado() === 'sem-sync') throw new Error('sem-sync');
  const r = await fetch(syncConfig.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // sem preflight (o Apps Script não responde)
    body: JSON.stringify({ token: syncConfig.token, acao, ...extra })
  });
  const j = await r.json();
  if (!j.ok) {
    if (/acao desconhecida/.test(j.erro || '')) { ngMarcarPonte(false); throw new Error('ponte-velha'); }
    throw new Error(j.erro || 'a ponte não respondeu');
  }
  ngMarcarPonte(true);
  return j;
}
function ngMsgErro(e) {
  const m = String((e && e.message) || e || '');
  if (m === 'sem-sync') return 'ligue a sincronização (Config) — a ponte usa o mesmo script';
  if (m === 'ponte-velha') return 'falta atualizar o script do Google (1 passo seu)';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'a fonte não respondeu agora';
  return m;
}

async function serieBCB(serie, dias) {
  const fim = new Date(); const ini = new Date(); ini.setDate(ini.getDate() - dias);
  const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${fmt(ini)}&dataFinal=${fmt(fim)}`);
  if (!r.ok) throw new Error('Banco Central ' + r.status);
  const j = await r.json();
  return { pontos: j.map(x => { const [d, m, y] = x.data.split('/'); return { d: `${y}-${m}-${d}`, v: parseFloat(x.valor) }; }).filter(x => isFinite(x.v)), moeda: 'BRL' };
}
async function serieCoin(id, dias) {
  const r = await fetch(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=brl&days=${dias}&interval=daily`);
  if (!r.ok) throw new Error('CoinGecko ' + r.status);
  const j = await r.json();
  return { pontos: (j.prices || []).map(p => ({ d: isoDe(new Date(p[0])), v: p[1] })).filter(x => isFinite(x.v)), moeda: 'BRL' };
}
async function serieBrapi(sym, faixa) {
  const tok = ngBrapiToken();
  const pede = async f => {
    const r = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(sym)}?range=${f}&interval=1d${tok ? '&token=' + encodeURIComponent(tok) : ''}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      const e = new Error(j.code === 'MISSING_TOKEN' || /token/i.test(j.message || '') ? 'falta o token da brapi (Fontes e conexões)' : (j.message || 'brapi ' + r.status));
      e.faixa = /range|intervalo|plano/i.test(j.message || '');
      throw e;
    }
    return j;
  };
  let j;
  // o plano grátis da brapi pode não liberar 6 meses ou 1 ano: cai para 3 meses
  try { j = await pede(faixa); } catch (e) { if (faixa !== '3mo' && (e.faixa || /plano|range/i.test(e.message))) j = await pede('3mo'); else throw e; }
  const res = (j.results || [])[0]; if (!res) throw new Error('sem dados');
  const pontos = (res.historicalDataPrice || []).filter(p => isFinite(p.close) && p.close !== null)
    .map(p => ({ d: isoDe(new Date(p.date * 1000)), v: p.close })).sort((a, b) => a.d.localeCompare(b.d));
  if (isFinite(res.regularMarketPrice) && pontos.length && pontos[pontos.length - 1].d < hojeISO()) pontos.push({ d: hojeISO(), v: res.regularMarketPrice });
  if (!pontos.length && isFinite(res.regularMarketPrice)) pontos.push({ d: hojeISO(), v: res.regularMarketPrice });
  return { pontos, moeda: res.currency || 'BRL', logo: res.logourl || '' };
}
function ngCorta(pontos, dias) {
  const corte = isoDe(new Date(Date.now() - dias * 864e5));
  const c = pontos.filter(p => p.d >= corte);
  return c.length >= 2 ? c : pontos.slice(-Math.max(2, Math.min(pontos.length, 30)));
}
/** Uma tentativa e, se falhar, outra depois de um respiro (armadilha nº 28). */
async function ngComRespiro(f) { try { return await f(); } catch (e) { await ngPausa(800); return f(); } }
function ngSerieDe(it, dias, faixa) {
  if (it.fonte === 'bcb') return serieBCB(it.ref, dias);
  if (it.fonte === 'coin') return serieCoin(it.ref, dias);
  if (it.fonte === 'brapi') return serieBrapi(it.ref, faixa);
  throw new Error('fonte desconhecida');
}
function ngGuardar(cache, it, per, r, erro) {
  const k = it.k + '|' + per; const antigo = cache.dados[k] || {};
  // erro NÃO apaga o que já havia: cotação de ontem vale mais que gráfico vazio
  cache.dados[k] = r && r.pontos && r.pontos.length
    ? { pontos: r.pontos, moeda: r.moeda || antigo.moeda || '', em: Date.now() }
    : { pontos: antigo.pontos || [], moeda: antigo.moeda || '', em: Date.now(), erro: erro || 'sem dados' };
  cache.em = Date.now();
}
function ngDado(it, per) { const d = lerCotacoes().dados[it.k + '|' + (per || cfgMercado().periodo)]; return d || null; }
/** A cotação mais recente de um item, em qualquer período guardado. */
function ultimaCotacao(k) {
  const dados = lerCotacoes().dados; let melhor = null;
  Object.keys(dados).forEach(x => {
    if (!x.startsWith(k + '|')) return;
    const p = (dados[x].pontos || []); const u = p[p.length - 1];
    if (u && (!melhor || u.d > melhor.d)) melhor = { ...u, moeda: dados[x].moeda };
  });
  return melhor;
}

/** Busca o que falta ou está velho. Sequencial e com pausa: fontes públicas
 *  e gratuitas não se martelam. O Yahoo vai num pacote só, pela ponte. */
async function atualizarMercado(forcar) {
  const c = cfgMercado();
  if (!c.ligado) return;
  // já buscando: anota o pedido e repete no fim (senão o ativo recém-acrescentado ficava sem cotação)
  if (ngEstado.buscando) { ngEstado.deNovo = true; return; }
  if (!navigator.onLine) { ngRedesenhar(); return; }
  const per = c.periodo; const [dias, faixa] = NG_PERIODOS[per];
  const cache = lerCotacoes();
  // limpa o que saiu do radar (o cache mora no aparelho, que tem pouco espaço)
  const vivos = new Set(ngRadar().map(x => x.k));
  Object.keys(cache.dados).forEach(k => { if (!vivos.has(k.split('|')[0])) delete cache.dados[k]; });
  const faltam = ngRadar().filter(it => {
    const d = cache.dados[it.k + '|' + per];
    return forcar || !d || (Date.now() - (d.em || 0)) > MERCADO_VALIDADE_MS;
  });
  if (!faltam.length) { gravarCotacoes(cache); return; }
  ngEstado.buscando = true; ngRedesenhar();
  // `finally`: se uma busca travar, a bandeira TEM de baixar (armadilha nº 30)
  try {
    const yahoo = faltam.filter(i => i.fonte === 'yahoo');
    if (yahoo.length) {
      try {
        const j = await ngPonte('mercado', { simbolos: yahoo.map(i => i.ref), faixa });
        yahoo.forEach(i => { const s = (j.series || {})[i.ref] || {}; ngGuardar(cache, i, per, s.pontos ? { pontos: ngCorta(s.pontos, dias), moeda: s.moeda } : null, s.erro); });
      } catch (e) { yahoo.forEach(i => ngGuardar(cache, i, per, null, ngMsgErro(e))); }
      gravarCotacoes(cache); ngRedesenhar();
    }
    for (const it of faltam.filter(i => i.fonte !== 'yahoo')) {
      let r = null, erro = '';
      try { r = await ngComRespiro(() => ngSerieDe(it, dias, faixa)); } catch (e) { erro = ngMsgErro(e); }
      if (r && r.logo && !it.logo) { const l = ngRadar().map(x => x.k === it.k ? { ...x, logo: r.logo } : x); wealth.radar = l; }
      ngGuardar(cache, it, per, r ? { pontos: ngCorta(r.pontos, dias), moeda: r.moeda } : null, erro);
      gravarCotacoes(cache); ngRedesenhar();
      await ngPausa(300);
    }
  } finally {
    ngEstado.buscando = false; ngRedesenhar();
    if (ngEstado.deNovo) { ngEstado.deNovo = false; setTimeout(() => atualizarMercado(false), 50); }
  }
}
function mudarPeriodoMercado(p) {
  if (!NG_PERIODOS[p]) return;
  cfgMercado().periodo = p; gravarMercado(); ngRedesenhar(); atualizarMercado(false);
}
function alternarMercadoLigado() {
  const c = cfgMercado(); c.ligado = !c.ligado; gravarMercado(); ngRedesenhar();
  if (c.ligado) atualizarMercado(true);
}

// ═════════════════════ FORMATO DE NÚMEROS E VARIAÇÃO ══════════════════════
function ngFmt(v, it, moeda) {
  if (!isFinite(v)) return '—';
  if (it.un === '%') return v.toFixed(2).replace('.', ',') + '%';
  if (it.un === 'pts') return Math.round(v).toLocaleString('pt-BR') + ' pts';
  const cur = String(moeda || it.moeda || 'BRL').toUpperCase();
  const a = Math.abs(v); const casas = a >= 1000 ? 0 : a >= 1 ? 2 : 4;
  try { return v.toLocaleString('pt-BR', { style: 'currency', currency: cur, minimumFractionDigits: casas, maximumFractionDigits: casas }); }
  catch (e) { return v.toFixed(casas).replace('.', ',') + ' ' + cur; }
}
/** Resumo de um item no período: último valor, variação, mínimo e máximo. */
function ngResumo(it) {
  const d = ngDado(it); const pts = (d && d.pontos) || [];
  if (!pts.length) return { pts, d };
  const prim = pts[0].v, ult = pts[pts.length - 1].v;
  // taxa (%) varia em pontos percentuais; preço varia em %
  const vr = it.un === '%' ? ult - prim : (prim ? (ult - prim) / Math.abs(prim) * 100 : 0);
  const vs = pts.map(p => p.v);
  return { pts, d, prim, ult, vr, min: Math.min(...vs), max: Math.max(...vs), moeda: d.moeda };
}
function ngVarTxt(it, vr) {
  const s = (vr >= 0 ? '▲ ' : '▼ ') + Math.abs(vr).toFixed(2).replace('.', ',');
  return it.un === '%' ? s + ' p.p.' : s + '%';
}
/** Mini-linha (fita e painel): só a forma, sem eixo. */
function ngMiniLinha(pts, cor, L, A) {
  if (!pts || pts.length < 2) return `<svg class="ng-mini" viewBox="0 0 ${L} ${A}"></svg>`;
  const vs = pts.map(p => p.v); let min = Math.min(...vs), max = Math.max(...vs); if (max === min) { max += 1; min -= 1; }
  const px = i => 1 + i * (L - 2) / (pts.length - 1), py = v => A - 2 - (v - min) / (max - min) * (A - 4);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(p.v).toFixed(1)}`).join(' ');
  return `<svg class="ng-mini" viewBox="0 0 ${L} ${A}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d} L${L - 1} ${A} L1 ${A} Z" style="fill:${cor}" opacity=".13"/><path d="${d}" style="fill:none;stroke:${cor}" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

// ═════════════════════ O GRÁFICO VIVO (genérico) ══════════════════════════
// series: [{ nome, cor, pontos: [{d, v}], fmt: v => texto }]
// o: { L, A, norm (compara em % desde o início), area, marcas: [{d, rot}] }
const NG_G = {};
function ngGrafico(id, series, o) {
  o = o || {};
  const L = o.L || 640, A = o.A || 200, mx = 58, mr = 14, mt = 14, mb = 22;
  const norm = !!o.norm;
  const ss = series.filter(s => s.pontos && s.pontos.length >= 2).map(s => {
    const b = s.pontos[0].v;
    return { ...s, pts: s.pontos.map(p => ({ d: p.d, v: norm ? (b ? (p.v / b - 1) * 100 : 0) : p.v, bruto: p.v })) };
  });
  if (!ss.length) return '<div class="sp-vazio">Ainda sem dados para desenhar.</div>';
  const t = d => new Date(d + 'T12:00:00').getTime();
  const t0 = Math.min(...ss.map(s => t(s.pts[0].d))), t1 = Math.max(...ss.map(s => t(s.pts[s.pts.length - 1].d)));
  const todos = ss.flatMap(s => s.pts.map(p => p.v));
  let min = Math.min(...todos), max = Math.max(...todos);
  if (norm) { min = Math.min(min, 0); max = Math.max(max, 0); }
  const folga = Math.max((max - min) * 0.12, Math.abs(max) * 0.002, 0.0001); min -= folga; max += folga;
  const px = d => mx + (t1 === t0 ? 0.5 : (t(d) - t0) / (t1 - t0)) * (L - mx - mr);
  const py = v => mt + (1 - (v - min) / (max - min)) * (A - mt - mb);
  const fmtEixo = v => norm ? (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' : ss[0].fmt(v);
  const grade = [0, 0.5, 1].map(f => { const v = min + (max - min) * (1 - f); const y = py(v);
    return `<line class="sp-g-grade" x1="${mx}" x2="${L - mr}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="sp-g-eixo" x="${mx - 5}" y="${(y + 3).toFixed(1)}">${fmtEixo(v)}</text>`; }).join('');
  const zero = norm ? `<line class="ng-g-zero" x1="${mx}" x2="${L - mr}" y1="${py(0).toFixed(1)}" y2="${py(0).toFixed(1)}"/>` : '';
  const linhas = ss.map((s, k) => {
    const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(p.d).toFixed(1)} ${py(p.v).toFixed(1)}`).join(' ');
    const area = k === 0 && o.area !== false ? `<path d="${d} L${px(s.pts[s.pts.length - 1].d).toFixed(1)} ${A - mb} L${px(s.pts[0].d).toFixed(1)} ${A - mb} Z" style="fill:${s.cor}" opacity=".12"/>` : '';
    return `${area}<path d="${d}" style="fill:none;stroke:${s.cor}" stroke-width="${k ? 1.8 : 2.2}" stroke-linejoin="round" stroke-linecap="round"${k ? ' stroke-dasharray="5 3"' : ''}/>`;
  }).join('');
  // máxima e mínima da série principal, marcadas no próprio desenho
  let extremos = '';
  if (!norm && o.extremos !== false) {
    const s = ss[0]; let iMax = 0, iMin = 0;
    s.pts.forEach((p, i) => { if (p.v > s.pts[iMax].v) iMax = i; if (p.v < s.pts[iMin].v) iMin = i; });
    const marca = (i, cima) => { const p = s.pts[i]; const x = px(p.d), y = py(p.v);
      const anc = x > L * 0.8 ? 'end' : x < L * 0.2 ? 'start' : 'middle';
      return `<circle class="ng-g-ext" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" style="stroke:${s.cor}"/><text class="ng-g-ext-t" x="${x.toFixed(1)}" y="${(cima ? y - 7 : y + 13).toFixed(1)}" text-anchor="${anc}">${cima ? 'máx' : 'mín'} ${s.fmt(p.v)}</text>`; };
    if (iMax !== iMin) extremos = marca(iMax, true) + marca(iMin, false);
  }
  const marcas = (o.marcas || []).filter(m => t(m.d) >= t0 && t(m.d) <= t1).map(m =>
    `<g class="ng-g-marca"><line x1="${px(m.d).toFixed(1)}" x2="${px(m.d).toFixed(1)}" y1="${A - mb - 6}" y2="${A - mb}"/><circle cx="${px(m.d).toFixed(1)}" cy="${A - mb - 8}" r="${Math.min(6, 2.5 + (m.peso || 0))}"><title>${esc(m.rot)}</title></circle></g>`).join('');
  const s0 = ss[0];
  NG_G[id] = { norm, L, series: ss.map(s => ({ nome: s.nome, cor: s.cor, fmt: s.fmt, pts: s.pts.map(p => ({ x: px(p.d), y: py(p.v), d: p.d, v: p.v, bruto: p.bruto })) })), marcas: o.marcas || [], passo: o.passo || 'no dia' };
  return `<div class="sp-graf ng-graf">
    <svg viewBox="0 0 ${L} ${A}" onpointermove="ngGrafMover(event, '${id}')" onpointerdown="ngGrafMover(event, '${id}')" onpointerleave="spGrafSair(event)">
      ${grade}${zero}${linhas}${extremos}${marcas}
      <text class="sp-g-eixo ini" x="${mx}" y="${A - 5}">${isoParaBR(s0.pts[0].d).slice(0, 5)}</text>
      <text class="sp-g-eixo fim" x="${L - mr}" y="${A - 5}">${isoParaBR(s0.pts[s0.pts.length - 1].d)}</text>
      <g class="sp-g-mira" style="display:none"><line x1="0" x2="0" y1="${mt}" y2="${A - mb}"/>${ss.map(s => `<circle r="4.5" cx="0" cy="0" style="fill:${s.cor}"/>`).join('')}</g>
    </svg><div class="sp-g-dica ng-g-dica" hidden></div></div>`;
}
function ngGrafMover(ev, id) {
  const g = NG_G[id]; if (!g) return;
  const svg = ev.currentTarget; const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
  const x = (ev.clientX - r.left) / r.width * vb.width;
  const base = g.series[0].pts;
  let k = 0; base.forEach((q, i) => { if (Math.abs(q.x - x) < Math.abs(base[k].x - x)) k = i; });
  const q = base[k];
  const mira = svg.querySelector('.sp-g-mira'); mira.style.display = '';
  const ln = mira.querySelector('line'); ln.setAttribute('x1', q.x); ln.setAttribute('x2', q.x);
  const linhas = [];
  g.series.forEach((s, i) => {
    // cada série no ponto de data mais próxima da escolhida
    let m = s.pts[0]; s.pts.forEach(p => { if (Math.abs(p.x - q.x) < Math.abs(m.x - q.x)) m = p; });
    const c = mira.querySelectorAll('circle')[i]; if (c) { c.setAttribute('cx', m.x); c.setAttribute('cy', m.y); }
    const ant = i === 0 ? s.pts[k - 1] : null;
    const dif = ant ? (g.norm ? m.v - ant.v : (ant.bruto ? (m.bruto / ant.bruto - 1) * 100 : 0)) : null;
    linhas.push(`<span style="--c:${s.cor}"><i></i>${g.series.length > 1 ? esc(s.nome) + ' ' : ''}<strong>${s.fmt(m.bruto)}</strong>${g.norm ? ` <em>${m.v >= 0 ? '+' : ''}${m.v.toFixed(2).replace('.', ',')}%</em>` : dif !== null ? ` <em class="${dif >= 0 ? 'sobe' : 'desce'}">${dif >= 0 ? '+' : ''}${dif.toFixed(2).replace('.', ',')}% ${g.passo}</em>` : ''}</span>`);
  });
  const doMes = g.marcas.filter(mm => mm.d.slice(0, 7) === q.d.slice(0, 7));
  const dica = svg.parentElement.querySelector('.sp-g-dica');
  dica.innerHTML = `<small>${diaSemanaCurto(q.d)} ${isoParaBR(q.d)}</small>${linhas.join('')}${doMes.length ? `<small class="ng-g-dica-marca">${doMes.map(mm => esc(mm.rot)).join(' · ')}</small>` : ''}`;
  dica.hidden = false;
  const larg = r.width, w = dica.offsetWidth || 170;
  dica.style.left = Math.max(0, Math.min(larg - w, q.x / vb.width * larg - w / 2)) + 'px';
}

// ═════════════════════════ A SEÇÃO MERCADO ════════════════════════════════
function ngSelecionar(k) {
  if (ngEstado.comparando) { ngEstado.comparar = ngEstado.comparar === k || k === ngEstado.sel ? '' : k; ngEstado.comparando = false; }
  else ngEstado.sel = k;
  renderMercado();
}
function ngModoComparar() {
  if (ngEstado.comparar) { ngEstado.comparar = ''; ngEstado.comparando = false; }
  else { ngEstado.comparando = !ngEstado.comparando; if (ngEstado.comparando) toast('Toque no outro ativo da fita para comparar.'); }
  renderMercado();
}
function ngIrParaAtivo(k) { ngEstado.sel = k; verSecaoNegocios('mercado'); }
function renderMercado() {
  const c = cfgMercado();
  const per = document.getElementById('mercado-periodos');
  if (per) per.innerHTML = Object.entries(NG_PERIODOS).map(([k, v]) => `<button type="button" class="${c.periodo === k ? 'on' : ''}" onclick="mudarPeriodoMercado('${k}')">${v[2]}</button>`).join('');
  const lig = document.getElementById('mercado-ligar'); if (lig) lig.checked = c.ligado;
  const st = document.getElementById('mercado-status'); const cache = lerCotacoes();
  if (st) st.innerText = !c.ligado ? '⚪ cotações desligadas'
    : ngEstado.buscando ? '🔄 buscando…'
    : !navigator.onLine ? '🔴 sem internet — última cotação guardada'
    : cache.em ? '🟢 ' + new Date(cache.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
  ngRenderFontes();
  const fita = document.getElementById('mercado-fita'); const corpo = document.getElementById('mercado-corpo');
  if (!fita || !corpo) return;
  const radar = ngRadarOrdenado();
  if (!c.ligado) { fita.innerHTML = ''; corpo.innerHTML = '<div class="sp-vazio">Cotações desligadas. Ligue em ⚙️ Fontes e conexões.</div>'; return; }
  if (!radar.length) { fita.innerHTML = ''; corpo.innerHTML = '<div class="sp-vazio">Seu radar está vazio. Toque em <strong>＋ acompanhar</strong>.</div>'; return; }
  if (!ngEstado.sel || !ngItem(ngEstado.sel)) ngEstado.sel = radar[0].k;
  fita.innerHTML = radar.map(it => {
    const s = ngResumo(it);
    const cls = ['ng-tick', it.k === ngEstado.sel ? 'sel' : '', it.k === ngEstado.comparar ? 'cmp' : '', ngEstado.comparando ? 'escolher' : ''].filter(Boolean).join(' ');
    const i = radar.indexOf(it);
    return `<div class="${cls}" style="--c:${it.cor}" onclick="ngSelecionar(ngRadarOrdenado()[${i}].k)" role="button" tabindex="0">
      <div class="ng-tick-cab">${it.logo ? `<img src="${esc(it.logo)}" alt="" loading="lazy">` : `<span>${it.ic || '📈'}</span>`}<strong>${esc(it.nome)}</strong>
        <button type="button" class="ng-estrela${it.fav ? ' on' : ''}" title="${it.fav ? 'Tirar da frente' : 'Pôr na frente (favorito)'}" onclick="event.stopPropagation(); ngFavoritar(ngRadarOrdenado()[${i}].k)">${it.fav ? '★' : '☆'}</button></div>
      ${s.pts.length ? `<div class="ng-tick-val">${ngFmt(s.ult, it, s.moeda)}</div><div class="ng-tick-var ${s.vr >= 0 ? 'sobe' : 'desce'}">${ngVarTxt(it, s.vr)}</div>${ngMiniLinha(s.pts, it.cor, 120, 30)}`
        : `<div class="ng-tick-vazio">${ngEstado.buscando ? 'buscando…' : s.d && s.d.erro ? '⚠️ ' + esc(s.d.erro) : 'sem dados ainda'}</div>`}
      ${s.d && s.d.erro && s.pts.length ? '<small class="ng-tick-velho" title="Não consegui atualizar agora — mostrando o último guardado">⚠️ antigo</small>' : ''}
    </div>`;
  }).join('');
  // o gráfico grande do selecionado (e do comparado, se houver)
  const it = ngItem(ngEstado.sel); const s = ngResumo(it);
  const cmp = ngEstado.comparar ? ngItem(ngEstado.comparar) : null; const sc = cmp ? ngResumo(cmp) : null;
  const larg = Math.max(320, Math.round(corpo.clientWidth || 700));
  const series = [{ nome: it.nome, cor: it.cor, pontos: s.pts, fmt: v => ngFmt(v, it, s.moeda) }];
  if (cmp && sc.pts.length) series.push({ nome: cmp.nome, cor: cmp.cor, pontos: sc.pts, fmt: v => ngFmt(v, cmp, sc.moeda) });
  const fonte = NG_FONTES[it.fonte] || ['', ''];
  corpo.innerHTML = `<div class="ng-destaque" style="--c:${it.cor}">
      <div class="ng-dest-cab">
        <div class="ng-dest-nome">${it.logo ? `<img src="${esc(it.logo)}" alt="">` : `<span>${it.ic || '📈'}</span>`}<div><strong>${esc(it.nome)}</strong><small>${fonte[0]} ${fonte[1]}${it.fonte !== 'bcb' ? ' · ' + esc(String(it.ref)) : ''}</small></div></div>
        ${s.pts.length ? `<div class="ng-dest-val"><strong>${ngFmt(s.ult, it, s.moeda)}</strong><span class="${s.vr >= 0 ? 'sobe' : 'desce'}">${ngVarTxt(it, s.vr)} em ${NG_PERIODOS[cfgMercado().periodo][2]}</span></div>` : ''}
        <div class="ng-dest-acoes">
          <button type="button" class="mini-btn${ngEstado.comparando || cmp ? ' on' : ''}" onclick="ngModoComparar()">${cmp ? '✕ parar de comparar' : ngEstado.comparando ? 'escolha na fita…' : '⇄ comparar'}</button>
          <button type="button" class="mini-btn" title="Tirar do radar" onclick="ngRemover('${it.k}')">✕</button></div>
      </div>
      ${cmp ? `<p class="hint ng-cmp-dica">Comparando em <strong>% desde o início do período</strong>: quem termina mais alto rendeu mais. Tracejado = ${esc(cmp.nome)}.</p>` : ''}
      ${s.pts.length ? ngGrafico('mercado', series, { L: larg, A: 230, norm: !!(cmp && sc.pts.length) })
        : `<div class="sp-vazio">${ngEstado.buscando ? 'Buscando…' : s.d && s.d.erro ? '⚠️ ' + esc(s.d.erro) : 'Ainda sem dados.'}</div>`}
      ${s.pts.length ? `<div class="ng-dest-pe"><span>mín <b>${ngFmt(s.min, it, s.moeda)}</b></span><span>máx <b>${ngFmt(s.max, it, s.moeda)}</b></span><span>início <b>${ngFmt(s.prim, it, s.moeda)}</b></span>
        ${it.fonte === 'bcb' && it.un === '%' ? `<button type="button" class="mini-btn" onclick="usarIndicadoresDoMercado()" title="Leva CDI, Selic e IPCA para a régua da Carteira">📌 usar na régua</button>` : ''}</div>` : ''}
    </div>`;
}
/** As conexões: brapi (token) e a ponte (estado + guia de 1 passo). */
function ngRenderFontes() {
  const el = document.getElementById('mercado-fontes-corpo'); if (!el) return;
  const ponte = ngPonteEstado(); const tok = ngBrapiToken();
  const ptxt = { ok: ['🟢', 'ligada — ações do mundo, ouro, índices e notícias funcionando'], velha: ['🟡', 'o script do Google ainda é o antigo: falta 1 passo seu'],
    'sem-sync': ['⚪', 'precisa da sincronização ligada (Config) — a ponte mora no mesmo script'], '?': ['⚪', 'ainda não testada'] }[ponte];
  el.innerHTML = `<div class="ng-fonte-linha"><strong>🏛️ Banco Central</strong> e <strong>🪙 CoinGecko</strong><small>direto do navegador, sem cadastro</small></div>
    <div class="ng-fonte-linha"><strong>🇧🇷 brapi (B3)</strong><small>${tok ? '🔑 token guardado neste aparelho' : 'sem token: só PETR4, VALE3, ITUB4 e MGLU3 funcionam'}</small>
      <form class="ng-token" onsubmit="event.preventDefault(); ngSalvarBrapi()"><input type="password" id="ng-brapi-token" autocomplete="off" placeholder="${tok ? 'trocar o token (vazio = apagar)' : 'cole aqui o token grátis da brapi.dev'}" aria-label="Token da brapi">
        <button type="button" class="mini-btn" onclick="ngSalvarBrapi()">Guardar</button></form>
      <small>Crie em <a href="https://brapi.dev/dashboard" target="_blank" rel="noopener">brapi.dev</a> (grátis). Fica só neste aparelho — nunca vai para a planilha nem para o GitHub.</small></div>
    <div class="ng-fonte-linha"><strong>🌎 Ponte no seu Apps Script</strong><small>${ptxt[0]} ${ptxt[1]}</small>
      <span><button type="button" class="mini-btn" onclick="ngTestarPonte()">Testar a ponte</button> <button type="button" class="mini-btn" onclick="ngGuiaPonte()">Como ligar</button></span></div>`;
}
async function ngTestarPonte() {
  try { await ngPonte('buscar', { q: 'ibovespa' }); toast('🟢 Ponte ligada!'); atualizarMercado(true); ngNoticias(true); }
  catch (e) { toast('🟡 ' + ngMsgErro(e), 7000); }
  ngRenderFontes();
}
function ngGuiaPonte() {
  ngFolha('Ligar a ponte (1 passo seu)', `<ol class="ng-guia">
    <li>No computador, abra o arquivo <code>computador\\sincronizacao\\Code.gs</code> da pasta do Genesis e copie <strong>tudo</strong>.</li>
    <li>Abra o seu script <strong>Genesis Sync</strong> em <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a>.</li>
    <li><strong>Antes de colar:</strong> copie a linha <code>const TOKEN = '…'</code> do script que já está lá (é a sua frase secreta).</li>
    <li>Apague tudo, cole o arquivo novo e <strong>troque a linha do TOKEN pela sua</strong>. Salve (Ctrl+S).</li>
    <li>Menu <strong>Implantar → Gerenciar implantações</strong> → ✎ editar → Versão: <strong>Nova versão</strong> → Implantar. O endereço continua o mesmo.</li>
    <li>O Google vai pedir permissão nova (<em>conectar a um serviço externo</em>): é a ponte buscando cotações e notícias. Autorize.</li>
    <li>Volte aqui e toque em <strong>Testar a ponte</strong>.</li></ol>
    <p class="hint">A ponte só LÊ: busca cotações no Yahoo e manchetes de jornais e devolve para o app. Não grava nada em lugar nenhum e só atende quem tem o seu token.</p>`);
}

// ═════════════════════ "＋ ACOMPANHAR" (a folha de busca) ══════════════════
function ngFolha(titulo, html) {
  let el = document.getElementById('ng-folha');
  if (!el) {
    el = document.createElement('div'); el.id = 'ng-folha'; el.className = 'ng-folha';
    el.addEventListener('click', e => { if (e.target === el) ngFecharFolha(); });
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="ng-folha-caixa" role="dialog" aria-modal="true"><header><h3>${titulo}</h3>
    <button type="button" class="mini-btn" onclick="ngFecharFolha()" aria-label="Fechar">✕</button></header><div class="ng-folha-corpo">${html}</div></div>`;
  el.hidden = false; document.body.classList.add('ng-folha-aberta');
}
function ngFecharFolha() { const el = document.getElementById('ng-folha'); if (el) el.hidden = true; document.body.classList.remove('ng-folha-aberta'); }
function abrirAcompanhar() {
  ngFolha('Acompanhar', `<div class="ng-abas" id="ng-acomp-abas"></div>
    <input type="search" id="ng-acomp-busca" placeholder="Buscar pelo nome ou código…" autocomplete="off" oninput="ngBuscarDigitando(this.value)">
    <div id="ng-acomp-lista" class="ng-acomp-lista"></div><p class="hint" id="ng-acomp-pe"></p>`);
  ngEstado.resultados = []; renderAcompanhar();
  setTimeout(() => { const b = document.getElementById('ng-acomp-busca'); if (b && window.matchMedia('(min-width: 701px)').matches) b.focus(); }, 60);
}
function ngAbaAcompanhar(a) { ngEstado.aba = a; ngEstado.resultados = []; const b = document.getElementById('ng-acomp-busca'); if (b) b.value = ''; renderAcompanhar(); }
function ngBuscarDigitando(q) {
  clearTimeout(ngEstado.buscaTimer);
  ngEstado.buscaTimer = setTimeout(() => ngBuscar(q), 420);
}
async function ngBuscar(q) {
  q = String(q || '').trim(); const aba = ngEstado.aba;
  if (!q) { ngEstado.resultados = []; renderAcompanhar(); return; }
  const lista = document.getElementById('ng-acomp-lista'); if (lista) lista.innerHTML = '<div class="sp-vazio">Buscando…</div>';
  try {
    let r = [];
    if (aba === 'b3') {
      const j = await (await fetch(`https://brapi.dev/api/quote/list?search=${encodeURIComponent(q)}&limit=12`)).json();
      r = (j.stocks || []).map(s => ({ k: 'brapi:' + s.stock, fonte: 'brapi', ref: s.stock, nome: s.name || s.stock, ic: s.type === 'fund' ? '🏢' : '📈', un: 'R$', logo: s.logo || '', sub: s.stock + (s.sector ? ' · ' + s.sector : '') }));
    } else if (aba === 'cripto') {
      const j = await (await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`)).json();
      r = (j.coins || []).slice(0, 12).map(c => ({ k: 'coin:' + c.id, fonte: 'coin', ref: c.id, nome: c.name, ic: '🪙', un: 'R$', logo: c.thumb || '', sub: c.symbol + (c.market_cap_rank ? ' · #' + c.market_cap_rank : '') }));
    } else if (aba === 'mundo') {
      const j = await ngPonte('buscar', { q });
      r = (j.itens || []).map(x => ({ k: 'yahoo:' + x.s, fonte: 'yahoo', ref: x.s, nome: x.n, ic: x.t === 'INDEX' ? '📊' : x.t === 'FUTURE' ? '🛢️' : x.t === 'CRYPTOCURRENCY' ? '🪙' : x.t === 'CURRENCY' ? '💱' : '📈', un: x.t === 'INDEX' ? 'pts' : '', sub: x.s + (x.b ? ' · ' + x.b : '') }));
    }
    if (q !== String((document.getElementById('ng-acomp-busca') || {}).value || '').trim() || aba !== ngEstado.aba) return;   // o usuário já mudou
    ngEstado.resultados = r; renderAcompanhar();
  } catch (e) {
    if (lista) lista.innerHTML = `<div class="sp-vazio">⚠️ ${esc(ngMsgErro(e))}</div>`;
  }
}
/** As sugestões de cada aba viram itens do mesmo jeito que um resultado de busca. */
function ngSugestoesDaAba(aba) {
  if (aba === 'moedas') return NG_BCB.map(b => ({ ...ngItemBCB(b), sub: 'Banco Central · série ' + b.ref }));
  if (aba === 'b3') return NG_SUGESTOES.b3.map(([s, n, ic]) => ({ k: 'brapi:' + s, fonte: 'brapi', ref: s, nome: n, ic, un: 'R$', sub: s }));
  if (aba === 'cripto') return NG_SUGESTOES.cripto.map(([id, n, ic]) => ({ ...ngItemCoin(id, n, ic), sub: 'CoinGecko' }));
  return NG_SUGESTOES.mundo.map(([s, n, ic, un]) => ({ k: 'yahoo:' + s, fonte: 'yahoo', ref: s, nome: n, ic, un: un || '', sub: s }));
}
function renderAcompanhar() {
  const abas = document.getElementById('ng-acomp-abas'); if (!abas) return;
  const a = ngEstado.aba;
  abas.innerHTML = [['b3', '🇧🇷 B3 e FIIs'], ['mundo', '🌎 Mundo'], ['cripto', '🪙 Cripto'], ['moedas', '💱 Moedas e juros']]
    .map(([k, r]) => `<button type="button" class="${a === k ? 'on' : ''}" onclick="ngAbaAcompanhar('${k}')">${r}</button>`).join('');
  const busca = document.getElementById('ng-acomp-busca'); if (busca) busca.hidden = a === 'moedas';
  const temBusca = busca && busca.value.trim();
  const lista = temBusca ? ngEstado.resultados : ngSugestoesDaAba(a);
  ngEstado.mostrando = lista;
  const el = document.getElementById('ng-acomp-lista');
  if (el) el.innerHTML = (temBusca ? '' : '<small class="ng-acomp-rot">SUGESTÕES</small>') + (lista.length ? lista.map((it, i) => {
    const tem = ngNoRadar(it.k);
    return `<div class="ng-acomp-item"><span class="ng-acomp-ic">${it.logo ? `<img src="${esc(it.logo)}" alt="" loading="lazy">` : it.ic}</span>
      <span class="ng-acomp-txt"><strong>${esc(it.nome)}</strong><small>${esc(it.sub || '')}</small></span>
      <button type="button" class="mini-btn${tem ? ' on' : ''}" ${tem ? 'disabled' : `onclick="ngAdicionar({ ...ngEstado.mostrando[${i}] })"`}>${tem ? '✓ no radar' : '＋'}</button></div>`;
  }).join('') : '<div class="sp-vazio">Nada encontrado.</div>');
  const pe = document.getElementById('ng-acomp-pe');
  if (pe) pe.innerHTML = a === 'b3' ? (ngBrapiToken() ? 'Cotações da B3 pela brapi, com o seu token.' : '⚠️ Sem o token da brapi só PETR4, VALE3, ITUB4 e MGLU3 trazem cotação. Guarde o token em ⚙️ Fontes e conexões.')
    : a === 'mundo' ? (ngPonteEstado() === 'ok' ? 'Pelo Yahoo Finance, através da ponte no seu Apps Script.' : '⚠️ Precisa da ponte no seu Apps Script — veja ⚙️ Fontes e conexões → Como ligar.')
    : a === 'cripto' ? 'Cotação em reais pela CoinGecko.' : 'Séries oficiais do Banco Central.';
}

/** Leva CDI, Selic e IPCA reais para a régua (indicadores) da Carteira. */
function usarIndicadoresDoMercado() {
  const pega = ref => { const u = ultimaCotacao('bcb:' + ref); return u ? u.v : null; };
  const cdi = pega(4389), selic = pega(432), ipca = pega(13522);
  if (cdi === null && selic === null && ipca === null) { toast('Ponha CDI, Selic ou IPCA no radar primeiro (＋ acompanhar → Moedas e juros).', 6000); return; }
  wealth.indicators = wealth.indicators || {};
  if (cdi !== null) wealth.indicators.cdi = Math.round(cdi * 100) / 100;
  if (selic !== null) wealth.indicators.selic = Math.round(selic * 100) / 100;
  if (ipca !== null) wealth.indicators.ipca = Math.round(ipca * 100) / 100;
  wealth.indicators.ref = 'Banco Central · ' + isoParaBR(hojeISO());
  salvar('wealth', wealth); redesenharNegocios();
  toast('📈 Régua atualizada com os números do Banco Central.', 6000);
}

// ═════════════════════════════ NOTÍCIAS ═══════════════════════════════════
function lerNoticias() { try { return JSON.parse(localStorage.getItem('lifeos_noticias')) || { em: 0, itens: [] }; } catch (e) { return { em: 0, itens: [] }; } }
/** O que buscar "dos seus ativos": o nome dos favoritos (sem o que é taxa). */
function ngBuscasDosAtivos() {
  return ngRadarOrdenado().filter(x => x.fav && x.un !== '%').slice(0, 5).map(x => x.nome.replace(/\s*\(.*\)$/, ''));
}
async function ngNoticias(forcar) {
  if (ngEstado.buscandoNoticias) return;
  const c = lerNoticias();
  if (!forcar && c.em && Date.now() - c.em < NG_NOTICIAS_VALIDADE_MS) return;
  if (ngPonteEstado() === 'sem-sync' || !navigator.onLine) { renderNoticias(); return; }
  ngEstado.buscandoNoticias = true; renderNoticias();
  try {
    const j = await ngPonte('noticias', { fontes: Object.keys(NG_JORNAIS), buscas: ngBuscasDosAtivos() });
    const vistos = new Set(); const itens = [];
    (j.itens || []).sort((a, b) => (b.d || '').localeCompare(a.d || '')).forEach(it => {
      const chave = (it.t || '').toLowerCase().replace(/\s+-\s+[^-]+$/, '').slice(0, 70);
      if (vistos.has(chave)) return; vistos.add(chave); itens.push(it);
    });
    try { localStorage.setItem('lifeos_noticias', JSON.stringify({ em: Date.now(), itens: itens.slice(0, 150) })); } catch (e) { /* sem espaço: segue */ }
  } catch (e) {
    ngEstado.erroNoticias = ngMsgErro(e);
  } finally {
    ngEstado.buscandoNoticias = false; renderNoticias(); if (typeof renderPainelNegocios === 'function') renderPainelNegocios();
  }
}
function ngFiltrarNoticias(f) { ngEstado.noticiasFiltro = f; renderNoticias(); }
function ngFonteDaNoticia(it) {
  if (it.q) return ['⭐ ' + it.q, 'var(--atencao)'];
  const j = NG_JORNAIS[it.k]; if (j) return j;
  return [it.f || 'Notícia', 'var(--txt3)'];
}
function ngCartaoNoticia(it, curto) {
  const [fonte, cor] = ngFonteDaNoticia(it);
  // Google Notícias põe " - Jornal" no fim do título: vira a assinatura
  const m = (it.t || '').match(/^(.*)\s+-\s+([^-]{2,40})$/);
  const titulo = m && (it.q || it.k === 'google') ? m[1] : it.t;
  const jornal = m && (it.q || it.k === 'google') ? m[2] : (it.f && it.f !== fonte ? it.f : '');
  return `<a class="ng-not${curto ? ' curto' : ''}" href="${esc(it.l)}" target="_blank" rel="noopener noreferrer" style="--c:${cor}">
    <span class="ng-not-cab"><b>${esc(fonte)}</b>${jornal ? `<small>${esc(jornal)}</small>` : ''}<small>${ngHa(it.d)}</small></span>
    <strong>${esc(titulo)}</strong>${!curto && it.r ? `<small class="ng-not-resumo">${esc(it.r)}</small>` : ''}</a>`;
}
function renderNoticias() {
  const el = document.getElementById('noticias-corpo'); if (!el) return;
  const ponte = ngPonteEstado();
  if (ponte === 'sem-sync' || ponte === 'velha') {
    el.innerHTML = `<div class="ng-ligar"><span>📰</span><div><strong>Falta ligar a ponte</strong>
      <small>${ponte === 'sem-sync' ? 'As notícias passam pelo seu script do Google, o mesmo da sincronização — ligue a sincronização em Config.' : 'O seu script do Google ainda é a versão antiga. É um passo só, e eu te guio.'}</small></div>
      <button type="button" class="btn-treinar" onclick="ngGuiaPonte()">Como ligar</button></div>`;
    return;
  }
  const c = lerNoticias(); const f = ngEstado.noticiasFiltro;
  const fontesTem = [...new Set(c.itens.filter(x => !x.q).map(x => x.k))];
  const chips = [['tudo', 'Tudo'], ['seus', '⭐ Seus ativos'], ...fontesTem.map(k => [k, (NG_JORNAIS[k] || [k])[0]])];
  const lista = c.itens.filter(x => f === 'tudo' ? true : f === 'seus' ? !!x.q : x.k === f && !x.q);
  el.innerHTML = `<div class="ng-not-barra"><div class="sp-faixas">${chips.map(([k, r]) => `<button type="button" class="${f === k ? 'on' : ''}" onclick="ngFiltrarNoticias('${esc(k)}')">${esc(r)}</button>`).join('')}</div>
      <small class="item-date">${ngEstado.buscandoNoticias ? '🔄 buscando…' : c.em ? 'atualizado ' + ngHa(new Date(c.em).toISOString()) : ''}</small>
      <button type="button" class="mini-btn" onclick="ngNoticias(true)" title="Buscar de novo">↻</button></div>
    ${ngEstado.erroNoticias && !c.itens.length ? `<div class="sp-vazio">⚠️ ${esc(ngEstado.erroNoticias)}</div>` : ''}
    <div class="ng-not-grade">${lista.slice(0, 60).map(it => ngCartaoNoticia(it)).join('') || `<div class="sp-vazio">${ngEstado.buscandoNoticias ? 'Buscando as manchetes…' : 'Nada por aqui ainda.'}</div>`}</div>
    <p class="hint">Manchetes de InfoMoney, Money Times, Exame, g1, Investing e Google Notícias, mais as notícias dos seus ⭐ favoritos. Tocar abre a matéria no site do jornal.</p>`;
}

// ═════════════════════════════ CARTEIRA ═══════════════════════════════════
/** Média do que sai por mês (Finanças, últimos 3 meses fechados, sem
 *  investimento) — é a régua de quantos meses a reserva aguenta. */
function ngGastoMensal() {
  const hoje = new Date(); const meses = [];
  for (let i = 1; i <= 3; i++) { const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1); meses.push(isoDe(d).slice(0, 7)); }
  const tot = transactions.filter(t => t.type === 'expense' && !/investimento/i.test(t.category || '') && meses.includes((t.date || '').slice(0, 7)))
    .reduce((a, t) => a + (Number(t.amount) || 0), 0);
  return tot / 3;
}
function ngClasses() {
  const total = patrimonioTotal();
  return Object.keys(CLASSES_ATIVO).map(k => ({ k, v: totalClasse(k), c: classeAtivo(k) })).filter(x => x.v > 0)
    .sort((a, b) => b.v - a.v).map(x => ({ ...x, p: total ? x.v / total : 0 }));
}
/** A rosca: cada fatia uma classe; tocar mostra os ativos dela. */
function ngRosca(tam) {
  const cls = ngClasses(); const total = patrimonioTotal();
  const R = 44, cx = 60, cy = 60, folga = cls.length > 1 ? 2.5 : 0;
  let ang = 0;
  const pt = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
  const fatias = cls.map(x => {
    const a0 = ang + folga / 2, a1 = ang + x.p * 360 - folga / 2; ang += x.p * 360;
    if (a1 - a0 <= 0.2) return '';
    const [x1, y1] = pt(a0, R), [x2, y2] = pt(a1, R);
    const caminho = cls.length === 1 ? `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R}` : `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    return `<path class="ng-fatia${ngEstado.fatia === x.k ? ' sel' : ''}" d="${caminho}" style="stroke:${x.c.cor}" onclick="ngTocarClasse('${x.k}')"><title>${x.c.nome}: ${formatCurrency(x.v)} (${Math.round(x.p * 100)}%)</title></path>`;
  }).join('');
  return `<svg class="ng-rosca" viewBox="0 0 120 120" width="${tam}" height="${tam}" role="img" aria-label="Carteira por classe">
    <circle cx="60" cy="60" r="${R}" class="ng-rosca-trilho"/>${fatias}
    <text x="60" y="58" class="ng-rosca-n">${total ? 'R$ ' + ngCompacto(total) : '—'}</text><text x="60" y="71" class="ng-rosca-r">investidos</text></svg>`;
}
function ngTocarClasse(k) { ngEstado.fatia = ngEstado.fatia === k ? '' : k; renderPainelNegocios(); renderCarteiraVis(); }
/** A linha do patrimônio: as fotografias mensais + o acumulado aportado. */
function ngSeriesPatrimonio() {
  const snaps = Object.entries(wealth.snapshots || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const valor = snaps.map(([m, v]) => ({ d: m + '-15', v: Number(v) || 0 }));
  if (valor.length) valor[valor.length - 1] = { d: hojeISO(), v: patrimonioTotal() };
  const mv = [...moves].sort((a, b) => a.date.localeCompare(b.date));
  let acc = 0; const aportado = [];
  mv.forEach(m => { acc += m.type === 'resgate' ? -m.amount : m.amount; const d = m.date; if (aportado.length && aportado[aportado.length - 1].d === d) aportado[aportado.length - 1].v = acc; else aportado.push({ d, v: acc }); });
  if (aportado.length) aportado.push({ d: hojeISO(), v: acc });
  // aportes do mês viram pontinhos no rodapé do gráfico
  const porMes = {};
  mv.filter(m => !m.initial).forEach(m => { const k = m.date.slice(0, 7); porMes[k] = (porMes[k] || 0) + (m.type === 'resgate' ? -m.amount : m.amount); });
  const marcas = Object.entries(porMes).map(([k, v]) => ({ d: k + '-15', rot: `${v >= 0 ? 'aportou' : 'resgatou'} ${formatCurrency(Math.abs(v))} em ${nomeMes(k).split(' ')[0].toLowerCase()}`, peso: Math.min(3.5, Math.log10(Math.abs(v) + 1) - 1) }));
  return { valor, aportado, marcas };
}
function renderCarteiraVis() {
  const el = document.getElementById('carteira-vis'); if (!el) return;
  if (!assets.filter(a => !a.archived).length) { el.innerHTML = '<div class="sp-vazio">Cadastre o primeiro ativo (botão ＋ no topo) e a carteira ganha forma aqui.</div>'; return; }
  const total = patrimonioTotal(), inv = investidoTotal(), res = total - inv, p = inv ? res / inv * 100 : 0;
  const cls = ngClasses(); const sel = ngEstado.fatia;
  const serie = ngSeriesPatrimonio();
  const larg = Math.max(320, Math.round((el.clientWidth || 700) - 4));
  const series = [];
  if (serie.valor.length >= 2) series.push({ nome: 'Patrimônio', cor: 'var(--roxo)', pontos: serie.valor, fmt: v => formatCurrency(v) });
  if (serie.aportado.length >= 2) series.push({ nome: 'Aportado', cor: 'var(--info)', pontos: serie.aportado, fmt: v => formatCurrency(v) });
  const ind = wealth.indicators || {};
  el.innerHTML = `<div class="ng-cart">
    <div class="ng-cart-rosca">${ngRosca(190)}
      <ul class="ng-legenda">${cls.map(x => `<li class="${sel === x.k ? 'sel' : ''}" onclick="ngTocarClasse('${x.k}')" style="--c:${x.c.cor}"><i></i>${x.c.icone} ${x.c.nome}<b>${Math.round(x.p * 100)}%</b></li>`).join('')}</ul></div>
    <div class="ng-cart-lado">
      <div class="ng-cart-num"><strong>${formatCurrency(total)}</strong><span class="${res >= 0 ? 'sobe' : 'desce'}">${res >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(res))} (${pct(p)}) sobre o aportado</span></div>
      ${sel ? `<div class="ng-cart-classe" style="--c:${classeAtivo(sel).cor}"><strong>${classeAtivo(sel).icone} ${classeAtivo(sel).nome}</strong>${assets.filter(a => !a.archived && a.klass === sel).sort((a, b) => (b.current || 0) - (a.current || 0)).map(a => `<span>${esc(a.name)}<b>${formatCurrency(a.current)}</b></span>`).join('')}</div>` : ''}
      ${series.length ? '<div id="cart-graf"></div>' : '<div class="sp-vazio">A linha do patrimônio aparece com o segundo mês de registro.</div>'}
      <div class="ng-cart-regua">📏 Régua${ind.ref ? ' (' + esc(ind.ref) + ')' : ''}: <span>CDI <b>${ind.cdi ? spNum(ind.cdi, 2) + '%' : '—'}</b></span><span>Selic <b>${ind.selic ? spNum(ind.selic, 2) + '%' : '—'}</b></span><span>IPCA <b>${ind.ipca ? spNum(ind.ipca, 2) + '%' : '—'}</b></span></div>
    </div></div>`;
  // o gráfico mora na coluna da direita: só depois de montada dá para medir
  // a largura certa (medindo o cartão inteiro ele encolhia e as letras sumiam)
  const lugar = document.getElementById('cart-graf');
  if (lugar) lugar.outerHTML = ngGrafico('patrimonio', series, { L: Math.max(300, Math.round(lugar.parentElement.clientWidth || larg)), A: 190, area: true, extremos: false, marcas: serie.marcas, passo: 'desde o mês anterior' });
}

// ═══════════════════════════════ METAS ════════════════════════════════════
/** O ritmo: quanto entra por mês no que a meta acompanha (aportes líquidos dos
 *  últimos 6 meses; para o patrimônio total, as fotografias mensais, que
 *  contam também o rendimento, valem se forem maiores). */
function ngRitmoMeta(g) {
  const ids = g.linkedTo === 'total' ? assets.filter(a => !a.archived).map(a => a.id)
    : g.linkedTo === 'reserva' ? assets.filter(a => a.klass === 'reserva').map(a => a.id) : [Number(g.linkedTo)];
  const ini = spSomaDias(hojeISO(), -183);
  const liq = moves.filter(m => ids.includes(m.assetId) && m.date >= ini && !m.initial).reduce((a, m) => a + (m.type === 'resgate' ? -m.amount : m.amount), 0);
  let porMes = liq / 6;
  if (g.linkedTo === 'total') {
    const s = Object.entries(wealth.snapshots || {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
    if (s.length >= 3) { const m = (Number(s[s.length - 1][1]) - Number(s[0][1])) / (s.length - 1); if (m > porMes) porMes = m; }
  }
  return porMes;
}
function ngPrevisaoMeta(g) {
  const atual = valorMeta(g); const falta = Math.max(0, g.target - atual); const ritmo = ngRitmoMeta(g);
  const out = { atual, falta, ritmo, f: g.target ? Math.min(1, atual / g.target) : 0 };
  if (falta <= 0) { out.feita = true; return out; }
  if (ritmo > 0) { const meses = Math.ceil(falta / ritmo); const d = new Date(); d.setMonth(d.getMonth() + meses); out.chega = isoDe(d); out.meses = meses; }
  if (g.deadline) {
    const meses = Math.max(1, Math.round((new Date(g.deadline + 'T12:00:00') - new Date()) / (30.44 * 864e5)));
    out.precisa = falta / meses; out.mesesPrazo = meses;
    if (g.createdAt) { const t0 = g.createdAt, t1 = new Date(g.deadline + 'T12:00:00').getTime(); out.esperado = Math.max(0, Math.min(1, (Date.now() - t0) / Math.max(1, t1 - t0))); }
  }
  return out;
}
/** A trilha: uma estrada sinuosa com bandeiras em 25, 50, 75 e o troféu no fim. */
function ngTrilha(g, pv, L, A) {
  const n = 80, pts = [];
  for (let i = 0; i <= n; i++) { const f = i / n; pts.push([24 + f * (L - 58), A / 2 + Math.sin(f * Math.PI * 2.3) * (A * 0.24)]); }
  const acum = [0]; for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = acum[acum.length - 1];
  const em = f => { const alvo = f * tot; let i = acum.findIndex(a => a >= alvo); if (i <= 0) return pts[0]; const k = (alvo - acum[i - 1]) / (acum[i] - acum[i - 1]); return [pts[i - 1][0] + k * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + k * (pts[i][1] - pts[i - 1][1])]; };
  const caminho = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const feito = pts.filter((p, i) => acum[i] <= pv.f * tot).map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const bandeiras = [0.25, 0.5, 0.75].map(f => { const [x, y] = em(f); const ok = pv.f >= f;
    return `<g class="ng-band${ok ? ' ok' : ''}"><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - 20).toFixed(1)}"/><path d="M${x.toFixed(1)} ${(y - 20).toFixed(1)} l11 4 l-11 4 Z"/><text x="${x.toFixed(1)}" y="${(y + 14).toFixed(1)}">${f * 100}%</text></g>`; }).join('');
  const [ex, ey] = em(1); const [ax, ay] = em(pv.f);
  const fantasma = pv.esperado !== undefined && !pv.feita ? (() => { const [gx, gy] = em(pv.esperado); return `<g class="ng-fantasma"><circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="9"/><text x="${gx.toFixed(1)}" y="${(gy - 13).toFixed(1)}">o prazo pede aqui</text></g>`; })() : '';
  return `<svg class="ng-trilha" viewBox="0 0 ${L} ${A}" role="img" aria-label="Trilha da meta ${esc(g.name)}">
    <path class="ng-trilha-base" d="${caminho}"/>${feito ? `<path class="ng-trilha-feito" d="${feito}"/>` : ''}
    ${bandeiras}${fantasma}
    <text class="ng-trilha-ini" x="${pts[0][0]}" y="${(pts[0][1] + 4).toFixed(1)}">🏁</text>
    <text class="ng-trilha-fim" x="${ex.toFixed(1)}" y="${(ey + 6).toFixed(1)}">🏆</text>
    <g class="ng-voce"><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="11"/><text x="${ax.toFixed(1)}" y="${(ay + 5).toFixed(1)}">${pv.feita ? '🎉' : '🧗'}</text></g></svg>`;
}
function ngTextoPrevisao(g, pv) {
  if (pv.feita) return '<b class="sobe">Meta alcançada! 🎉</b>';
  const partes = [];
  partes.push(pv.chega ? `no ritmo atual (${formatCurrency(pv.ritmo)}/mês) você chega em <b>${ngMesAno(pv.chega)}</b>` : '<b class="desce">no ritmo atual a meta não anda</b> — nenhum aporte nos últimos 6 meses');
  if (pv.precisa) partes.push(`para o prazo (${isoParaBR(g.deadline)}): <b>${formatCurrency(pv.precisa)}/mês</b> por ${plural(pv.mesesPrazo, 'mês', 'meses')}`);
  if (pv.esperado !== undefined) { const d = Math.round((pv.f - pv.esperado) * 100); partes.push(d >= 0 ? `<span class="sobe">${d} pontos adiantado</span>` : `<span class="desce">${-d} pontos atrasado</span>`); }
  return partes.join(' · ');
}
function renderMetas() {
  const el = document.getElementById('goal-list'); if (!el) return;
  if (!goals.length) { el.innerHTML = '<div class="sp-vazio">Ex.: "Reserva de 6 meses" (vinculada à reserva) ou "Capital para a clínica". Crie com o ＋ no topo.</div>'; return; }
  const larg = Math.max(320, Math.round((el.clientWidth || 640)));
  el.innerHTML = goals.map(g => {
    const pv = ngPrevisaoMeta(g);
    return `<div class="ng-meta">
      <div class="ng-meta-cab"><strong>🎯 ${esc(g.name)}</strong><small>${rotuloVinculo(g)}</small>
        <span class="ng-meta-num"><b>${formatCurrency(pv.atual)}</b> de ${formatCurrency(g.target)} · ${Math.round(pv.f * 100)}%</span>
        <span class="item-actions"><button class="mini-btn" title="Editar" onclick="editarMeta(${g.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerMeta(${g.id})">✕</button></span></div>
      ${ngTrilha(g, pv, Math.min(larg, 900), 120)}
      <p class="ng-meta-prev">${ngTextoPrevisao(g, pv)}</p>${g.note ? `<small class="item-notes">${esc(g.note)}</small>` : ''}</div>`;
  }).join('');
}

// ══════════════════════════════ PROJETOS ══════════════════════════════════
const NG_FUNIL = ['ideia', 'estudo', 'validacao', 'andamento'];
function ngFunil(L) {
  const A = 132, h = A / NG_FUNIL.length;
  const conta = k => projects.filter(p => (p.stage || 'ideia') === k).length;
  return `<svg class="ng-funil" viewBox="0 0 ${L} ${A}" role="img" aria-label="Funil de projetos">${NG_FUNIL.map((k, i) => {
    const e = ESTAGIOS_PROJETO[k]; const w0 = L * (1 - i * 0.16), w1 = L * (1 - (i + 1) * 0.16) ; const y = i * h;
    const x0 = (L - w0) / 2, x1 = (L - w1) / 2; const n = conta(k);
    return `<g class="ng-funil-faixa${n ? '' : ' vazia'}" onclick="verSecaoNegocios('projetos')" style="--c:${e[2]}"><title>${e[1]}: ${n}</title>
      <path d="M${x0.toFixed(1)} ${(y + 1).toFixed(1)} H${(x0 + w0).toFixed(1)} L${(x1 + w1).toFixed(1)} ${(y + h - 1).toFixed(1)} H${x1.toFixed(1)} Z"/>
      <text x="${L / 2}" y="${(y + h / 2 + 4).toFixed(1)}">${e[0]} ${e[1]} · ${n}</text></g>`;
  }).join('')}</svg>`;
}
let ngArrastando = null;
function ngArrastar(ev, id) { ngArrastando = id; try { ev.dataTransfer.setData('text/plain', String(id)); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* ok */ } }
function ngSobre(ev) { ev.preventDefault(); ev.currentTarget.classList.add('alvo'); }
function ngSaiu(ev) { ev.currentTarget.classList.remove('alvo'); }
function ngSoltar(ev, stage) {
  ev.preventDefault(); ev.currentTarget.classList.remove('alvo');
  const id = Number((ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || ngArrastando);
  ngArrastando = null; if (id) mudarEstagio(id, stage);
}
function ngPassoEstagio(id, dir) {
  const p = projects.find(x => x.id === id); if (!p) return;
  const ordem = [...NG_FUNIL, 'pausado', 'encerrado']; const i = Math.max(0, ordem.indexOf(p.stage || 'ideia'));
  const j = Math.max(0, Math.min(NG_FUNIL.length - 1, (i >= NG_FUNIL.length ? NG_FUNIL.length - 1 : i) + dir));
  mudarEstagio(id, NG_FUNIL[j]);
}
function ngAbrirProjeto(id) { ngEstado.projetoAberto = ngEstado.projetoAberto === id ? null : id; renderProjetos(); }
function ngCartaoProjeto(p) {
  const e = ESTAGIOS_PROJETO[p.stage] || ESTAGIOS_PROJETO.ideia;
  const tot = (p.steps || []).length, feitos = (p.steps || []).filter(s => s.done).length;
  const prox = (p.steps || []).find(s => !s.done);
  const aberto = ngEstado.projetoAberto === p.id;
  const gasto = Number(p.spent) || 0, orc = Number(p.budget) || 0;
  const estourou = orc && gasto > orc;
  return `<div class="ng-proj${aberto ? ' aberto' : ''}" draggable="true" ondragstart="ngArrastar(event, ${p.id})" style="--c:${e[2]}">
    <div class="ng-proj-cab" onclick="ngAbrirProjeto(${p.id})">
      ${tot ? spAnel(feitos / tot, e[2], 34, `${feitos}/${tot}`) : `<span class="ng-proj-ic">${e[0]}</span>`}
      <div><strong>${esc(p.name)}</strong>${prox ? `<small>→ ${esc(prox.text)}</small>` : p.desc ? `<small>${esc(p.desc).slice(0, 70)}</small>` : ''}</div></div>
    ${orc || gasto ? `<div class="ng-proj-orc${estourou ? ' estourou' : ''}"><i></i>💸 ${formatCurrency(gasto)}${orc ? ` de ${formatCurrency(orc)}` : ''}${estourou ? ' · passou do previsto' : ''}</div>` : ''}
    ${aberto ? `<div class="ng-proj-mais">${p.desc ? `<p>${esc(p.desc)}</p>` : ''}
      ${tot ? p.steps.map((s, i) => `<label class="subtask ${s.done ? 'done' : ''}"><input type="checkbox" ${s.done ? 'checked' : ''} onclick="togglePasso(${p.id}, ${i})"> ${esc(s.text)}</label>`).join('') : ''}
      ${p.contacts ? `<small class="item-notes">👥 ${esc(p.contacts)}</small>` : ''}${p.notes ? `<small class="item-notes">${esc(p.notes)}</small>` : ''}
      <div class="ng-proj-acoes"><button class="mini-btn" title="Voltar um estágio" onclick="ngPassoEstagio(${p.id}, -1)">◀</button><button class="mini-btn" title="Avançar um estágio" onclick="ngPassoEstagio(${p.id}, 1)">▶</button>
        <button class="mini-btn" onclick="mudarEstagio(${p.id}, '${p.stage === 'pausado' ? 'ideia' : 'pausado'}')">${p.stage === 'pausado' ? '▶ retomar' : '⏸ pausar'}</button>
        <button class="mini-btn" onclick="mudarEstagio(${p.id}, 'encerrado')">🏁</button>
        <button class="mini-btn" title="Editar" onclick="editarProjeto(${p.id})">✎</button><button class="mini-btn" title="Apagar" onclick="removerProjeto(${p.id})">✕</button></div></div>` : ''}
  </div>`;
}
function renderProjetos() {
  const el = document.getElementById('project-list'); if (!el) return;
  if (!projects.length) { el.innerHTML = '<div class="sp-vazio">Nenhum projeto ainda. Ex.: "Clínica popular", "Telemedicina", "Curso online" — crie com o ＋ no topo.</div>'; return; }
  const ord = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
  const parados = projects.filter(p => ['pausado', 'encerrado'].includes(p.stage)).sort(ord);
  el.innerHTML = `<p class="hint ng-kanban-dica">Arraste um cartão de uma coluna para outra (no computador) ou abra o cartão e use ◀ ▶.</p>
    <div class="ng-kanban">${NG_FUNIL.map(k => {
      const e = ESTAGIOS_PROJETO[k]; const l = projects.filter(p => (p.stage || 'ideia') === k).sort(ord);
      return `<div class="ng-coluna" style="--c:${e[2]}" ondragover="ngSobre(event)" ondragleave="ngSaiu(event)" ondrop="ngSoltar(event, '${k}')">
        <div class="ng-coluna-cab">${e[0]} ${e[1]}<b>${l.length}</b></div>${l.map(ngCartaoProjeto).join('') || '<div class="ng-coluna-vazia">solte aqui</div>'}</div>`;
    }).join('')}</div>
    ${parados.length ? `<details class="ng-parados"><summary>🗄️ Pausados e encerrados (${parados.length})</summary><div class="ng-parados-lista">${parados.map(ngCartaoProjeto).join('')}</div></details>` : ''}`;
}

// ═════════════════════════════ O PAINEL ═══════════════════════════════════
function ngQuadroMercado() {
  const radar = ngRadarOrdenado(); const favs = radar.filter(x => x.fav); const mostrar = (favs.length ? favs : radar).slice(0, 5);
  const c = cfgMercado();
  return `<section class="sp-quadro ng-q-mercado">
    <button type="button" class="sp-cab" onclick="verSecaoNegocios('mercado')"><span class="sp-ic">📈</span><span class="sp-tit">Mercado</span>
      <small>${c.ligado ? (ngEstado.buscando ? 'buscando…' : NG_PERIODOS[c.periodo][2]) : 'desligado'}</small><span class="sp-ir">›</span></button>
    ${mostrar.length ? `<div class="ng-q-lista">${mostrar.map(it => { const s = ngResumo(it);
      return `<button type="button" class="ng-q-linha" style="--c:${it.cor}" onclick="ngIrParaAtivo('${esc(it.k)}')">
        <span class="ng-q-nome">${it.logo ? `<img src="${esc(it.logo)}" alt="">` : it.ic || '📈'} ${esc(it.nome)}</span>
        ${ngMiniLinha(s.pts, it.cor, 70, 22)}
        <span class="ng-q-val">${s.pts.length ? ngFmt(s.ult, it, s.moeda) : '—'}<small class="${s.vr >= 0 ? 'sobe' : 'desce'}">${s.pts.length ? ngVarTxt(it, s.vr) : ''}</small></span></button>`; }).join('')}</div>`
      : '<div class="sp-vazio">Radar vazio.</div>'}
    <button type="button" class="mini-btn ng-q-mais" onclick="abrirAcompanhar()">＋ acompanhar outro ativo</button>
  </section>`;
}
function ngQuadroCarteira() {
  const ativos = assets.filter(a => !a.archived);
  const total = patrimonioTotal(), inv = investidoTotal(), res = total - inv, p = inv ? res / inv * 100 : 0;
  const reserva = totalClasse('reserva'); const gasto = ngGastoMensal();
  const sel = ngEstado.fatia;
  let info = '';
  if (sel) info = `<strong>${classeAtivo(sel).icone} ${classeAtivo(sel).nome}</strong> · ${formatCurrency(totalClasse(sel))} em ${plural(ativos.filter(a => a.klass === sel).length, 'ativo', 'ativos')}`;
  else if (reserva && gasto) { const m = reserva / gasto; info = `🛟 A reserva cobre <strong>${spNum(m, 1)} ${m < 2 && m >= 1 ? 'mês' : 'meses'}</strong> dos seus gastos${m < 6 ? ' (o clássico é 6)' : ' ✓'}`; }
  else info = '<span class="sp-dica">Toque numa fatia para ver a classe.</span>';
  const lim = spSomaDias(hojeISO(), 30);
  const venc = ativos.filter(a => a.due && a.due >= hojeISO() && a.due <= lim).sort((a, b) => a.due.localeCompare(b.due))[0];
  return `<section class="sp-quadro ng-q-carteira">
    <button type="button" class="sp-cab" onclick="verSecaoNegocios('carteira')"><span class="sp-ic">💼</span><span class="sp-tit">Carteira</span>
      <small>${plural(ativos.length, 'ativo', 'ativos')}</small><span class="sp-ir">›</span></button>
    ${ativos.length ? `<div class="ng-q-cart">${ngRosca(132)}<div class="ng-q-cart-num"><strong>${formatCurrency(total)}</strong>
      <span class="${res >= 0 ? 'sobe' : 'desce'}">${res >= 0 ? '▲' : '▼'} ${pct(p)}</span><small>sobre ${formatCurrency(inv)} aportados</small></div></div>
      <div class="sp-info">${info}</div>
      ${venc ? `<div class="sp-aviso ng-venc">⏰ <strong>${esc(venc.name)}</strong> vence ${rotuloData(venc.due).toLowerCase()} (${isoParaBR(venc.due).slice(0, 5)})</div>` : ''}`
      : '<div class="sp-vazio">Cadastre o primeiro ativo em Carteira.</div>'}
  </section>`;
}
function ngQuadroMetas() {
  const lista = goals.slice(0, 3);
  return `<section class="sp-quadro ng-q-metas">
    <button type="button" class="sp-cab" onclick="verSecaoNegocios('metas')"><span class="sp-ic">🎯</span><span class="sp-tit">Metas</span>
      <small>${plural(goals.length, 'trilha', 'trilhas')}</small><span class="sp-ir">›</span></button>
    ${lista.length ? `<div class="ng-q-metas-lista">${lista.map(g => { const pv = ngPrevisaoMeta(g); const f = Math.round(pv.f * 100);
      return `<button type="button" class="ng-q-meta" onclick="verSecaoNegocios('metas')">
        <span class="ng-q-meta-cab"><strong>${esc(g.name)}</strong><b>${f}%</b></span>
        <span class="ng-q-trilho"><i style="width:${f}%"></i>${[25, 50, 75].map(x => `<em class="${f >= x ? 'ok' : ''}" style="left:${x}%"></em>`).join('')}
          ${pv.esperado !== undefined && !pv.feita ? `<u style="left:${Math.round(pv.esperado * 100)}%" title="onde o prazo pede que você esteja hoje"></u>` : ''}<span class="ng-q-voce" style="left:${f}%">${pv.feita ? '🎉' : '🧗'}</span></span>
        <small>${pv.feita ? 'alcançada 🎉' : pv.chega ? 'chega em ' + ngMesAno(pv.chega) + ' no ritmo atual' : 'sem aportes recentes — parada'}</small></button>`; }).join('')}</div>`
      : '<div class="sp-vazio">Nenhuma meta ainda.</div>'}
  </section>`;
}
function ngQuadroProjetos() {
  const ativos = projects.filter(p => !['pausado', 'encerrado'].includes(p.stage)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const p = ativos.find(x => (x.steps || []).some(s => !s.done));
  const prox = p ? p.steps.find(s => !s.done) : null;
  return `<section class="sp-quadro ng-q-projetos">
    <button type="button" class="sp-cab" onclick="verSecaoNegocios('projetos')"><span class="sp-ic">🚀</span><span class="sp-tit">Projetos</span>
      <small>${plural(ativos.length, 'em movimento', 'em movimento')}</small><span class="sp-ir">›</span></button>
    ${projects.length ? ngFunil(260) : '<div class="sp-vazio">Nenhum projeto ainda.</div>'}
    ${prox ? `<div class="sp-info"><span>Próximo passo · <strong>${esc(p.name)}</strong>: ${esc(prox.text)}</span>
      <button type="button" class="mini-btn" onclick="togglePasso(${p.id}, ${p.steps.indexOf(prox)}); renderPainelNegocios()">✓ feito</button></div>` : ''}
  </section>`;
}
function ngManchetes() {
  const ponte = ngPonteEstado();
  if (ponte === 'sem-sync' || ponte === 'velha') {
    return `<section class="sp-quadro ng-q-noticias"><button type="button" class="sp-cab" onclick="verSecaoNegocios('noticias')"><span class="sp-ic">📰</span><span class="sp-tit">Notícias</span><small>falta ligar a ponte</small><span class="sp-ir">›</span></button>
      <div class="sp-info"><span>As manchetes e as notícias dos seus ativos chegam pelo seu script do Google — é 1 passo seu.</span><button type="button" class="mini-btn" onclick="ngGuiaPonte()">Como ligar</button></div></section>`;
  }
  const c = lerNoticias();
  // até 3 dos seus ativos e o resto em RODÍZIO de jornais (a mais nova de cada
  // um): sem isso, o jornal que publica mais rápido toma o quadro inteiro
  const seus = c.itens.filter(x => x.q).slice(0, 3);
  const porJornal = {}; c.itens.filter(x => !x.q).forEach(x => { (porJornal[x.k] = porJornal[x.k] || []).push(x); });
  const gerais = []; const filas = Object.values(porJornal);
  for (let i = 0; gerais.length < 6 - seus.length && filas.some(f => f[i]); i++) filas.forEach(f => { if (f[i] && gerais.length < 6 - seus.length) gerais.push(f[i]); });
  const lista = [...seus, ...gerais];
  return `<section class="sp-quadro ng-q-noticias">
    <button type="button" class="sp-cab" onclick="verSecaoNegocios('noticias')"><span class="sp-ic">📰</span><span class="sp-tit">Notícias</span>
      <small>${ngEstado.buscandoNoticias ? 'buscando…' : c.em ? 'atualizado ' + ngHa(new Date(c.em).toISOString()) : ''}</small><span class="sp-ir">›</span></button>
    <div class="ng-manchetes">${lista.map(it => ngCartaoNoticia(it, true)).join('') || '<div class="sp-vazio">Buscando as manchetes…</div>'}</div></section>`;
}
function renderPainelNegocios() {
  const el = document.getElementById('biz-dash'); if (!el) return;
  registrarSnapshot();
  el.innerHTML = `<div class="sp-grade ng-grade">${ngQuadroMercado()}${ngQuadroCarteira()}${ngQuadroMetas()}${ngQuadroProjetos()}${ngManchetes()}</div>`;
}

// ═════════════════════ MICRO-ABAS E REDESENHO ═════════════════════════════
const NG_SECOES = ['painel', 'mercado', 'noticias', 'carteira', 'metas', 'projetos'];
let negociosSecao = 'painel';
function verSecaoNegocios(s, el) {
  if (!NG_SECOES.includes(s)) s = 'painel';
  negociosSecao = s;
  // só os botões (a casca põe um <span> do emoji DENTRO de cada um)
  document.querySelectorAll('#negocios-secoes > span').forEach(x => x.classList.toggle('active', el ? x === el : (x.getAttribute('onclick') || '').includes(`'${s}'`)));
  NG_SECOES.forEach(k => { const d = document.getElementById('sec-ng-' + k); if (d) d.hidden = k !== s; });
  // quem mede a própria largura (gráficos, trilhas) só acerta com a seção à vista
  if (s === 'mercado') renderMercado();
  if (s === 'carteira') renderCarteiraVis();
  if (s === 'metas') renderMetas();
  if (s === 'noticias') { renderNoticias(); ngNoticias(false); }
  if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao();
}
/** Redesenho leve, chamado durante as buscas (não refaz formulários). */
function ngRedesenhar() {
  renderMercado(); renderPainelNegocios();
  const ac = document.getElementById('ng-acomp-lista'); if (ac && !document.getElementById('ng-folha').hidden) renderAcompanhar();
}
function redesenharNegociosVisual() {
  renderPainelNegocios(); renderMercado(); renderCarteiraVis(); renderMetas(); renderProjetos(); renderNoticias();
}

// ═════════════════════ CARTEIRA: os ativos em cartões ═════════════════════
// A lista antiga (linha de texto com 4 botões) espremia no celular: o nome
// quebrava em quatro linhas e os botões vazavam da tela (medido a 344 px).
// Cada ativo vira um cartão com a cor da classe e o PESO dele na carteira.
function renderAtivos() {
  const el = document.getElementById('asset-list'); if (!el) return;
  if (!assets.length) { el.innerHTML = '<div class="sp-vazio">Cadastre seu primeiro ativo — ex.: "CDB Nubank" (Renda fixa) ou "Tesouro Selic" (Reserva).</div>'; return; }
  const hoje = hojeISO(); const total = patrimonioTotal();
  el.innerHTML = [...assets].sort((a, b) => (a.archived === b.archived ? (b.current || 0) - (a.current || 0) : a.archived ? 1 : -1)).map(a => {
    const c = classeAtivo(a.klass); const inv = investidoEm(a.id); const res = (a.current || 0) - inv; const p = inv ? res / inv * 100 : 0;
    const peso = total && !a.archived ? (a.current || 0) / total : 0;
    const venc = a.due ? (a.due < hoje ? `<span class="ng-chip perigo">venceu ${isoParaBR(a.due)}</span>` : `<span class="ng-chip">vence ${isoParaBR(a.due)}</span>`) : '';
    return `<div class="ng-ativo${a.archived ? ' arquivado' : ''}" style="--c:${c.cor}">
      <div class="ng-ativo-cab">${spAnel(peso, c.cor, 38, Math.round(peso * 100) + '%')}
        <div><strong>${c.icone} ${esc(a.name)}</strong><small>${c.nome}${a.institution ? ' · ' + esc(a.institution) : ''}${a.rate ? ' · ' + esc(a.rate) : ''}</small></div></div>
      <div class="ng-ativo-val"><strong>${formatCurrency(a.current)}</strong>
        <span class="${res >= 0 ? 'sobe' : 'desce'}">${res >= 0 ? '▲' : '▼'} ${formatCurrency(Math.abs(res))} (${pct(p)})</span></div>
      <small class="ng-ativo-pe">aportado ${formatCurrency(inv)} · valor de ${isoParaBR(a.currentAt || hoje).slice(0, 5)} ${venc}${a.archived ? ' <span class="ng-chip">arquivado</span>' : ''}</small>
      ${a.notes ? `<small class="item-notes">${esc(a.notes)}</small>` : ''}
      <div class="ng-ativo-acoes"><button class="mini-btn" title="Atualizar o valor de hoje" onclick="atualizarValorAtivo(${a.id})">💰 valor</button><button class="mini-btn" title="Editar" onclick="editarAtivo(${a.id})">✎</button><button class="mini-btn" title="${a.archived ? 'Reativar' : 'Arquivar'}" onclick="arquivarAtivo(${a.id})">${a.archived ? '📤' : '🗄️'}</button><button class="mini-btn" title="Apagar" onclick="removerAtivo(${a.id})">✕</button></div>
    </div>`;
  }).join('');
}
