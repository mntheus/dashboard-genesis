// ════════════════════════════════════════════════════════════════════════════
// LAZER — A ESTANTE DE CAPAS, OS INGRESSOS E O ÁLBUM, OS DISCOS (08/10/2026)
// ────────────────────────────────────────────────────────────────────────────
// Proposta aprovada em 08/10, cada parte com a sua cara:
//   • FILMES E SÉRIES como estante de streaming: no alto o que ele está
//     ASSISTINDO (temporada e episódio grandes, − e ＋), embaixo as CAPAS da
//     fila "quero ver" e dos vistos com estrelas. Sem capa, um cartão colorido;
//   • SAIR: o que está MARCADO vira INGRESSO (canhoto picotado, dia, contagem);
//     o "quero ir" é um mural de fotos; o "já fui" é um ÁLBUM com nota e gasto;
//   • MÚSICA: cada momento (foco, treino, plantão…) é um DISCO; tocar abre;
//   • a BARRA RÁPIDA em cada micro-aba (a mesma de Tarefas e Notas).
// Tocar numa capa, ingresso ou disco abre o DETALHE (pop-up) com as ações;
// editar tudo continua no formulário do ＋ (a casca o abre como folha).
// As fotos e resumos vêm da Wikipedia (só o ENDEREÇO da imagem é guardado).
// Nenhum dado novo: `media`, `saidas` e `playlists` com o mesmo formato.
// Carrega ANTES do app.js: aqui só se DECLARA.
// ════════════════════════════════════════════════════════════════════════════

const lzEstado = { tudoVistos: false, tudoFui: false, detalhe: null };
const LZ_COR_TIPO = { filme: '#f97316', serie: '#8b5cf6', doc: '#14b8a6', anime: '#ec4899', outro: '#64748b' };
const LZ_COR_MOMENTO = { foco: '#38bdf8', treino: '#f97316', plantao: '#ef4444', relax: '#8b5cf6', viagem: '#22c55e', festa: '#ec4899', outro: '#94a3b8' };
const LZ_ONDE = { netflix: 'Netflix', prime: 'Prime Video', primevideo: 'Prime Video', amazon: 'Prime Video', max: 'Max', hbo: 'Max', disney: 'Disney+', appletv: 'Apple TV+', apple: 'Apple TV+', globoplay: 'Globoplay', cinema: 'Cinema', youtube: 'YouTube', paramount: 'Paramount+', crunchyroll: 'Crunchyroll' };

// ═════════════════════════════ 1. A BARRA RÁPIDA ══════════════════════════
function lzSecao() { return typeof lazerSecao !== 'undefined' ? lazerSecao : 'midia'; }
function lzEntender(txt) {
  let resto = String(txt || ''); const sec = lzSecao(), sem = tarSemAcento;
  const tirar = re => { let achado = null; resto = resto.replace(re, (...m) => { achado = m; return ' '; }); return achado; };
  if (sec === 'musica') {
    const u = tirar(/(https?:\/\/\S+)/);
    let moment = 'outro';
    const tag = tirar(/(^|\s)#([\p{L}]+)/u);
    const chave = sem(tag ? tag[2] : resto);
    const casa = [['foco', /\b(foco|estud)/], ['treino', /\b(treino|academia|corrida)/], ['plantao', /\bplantao/], ['relax', /\b(relax|dormir|calma)/], ['viagem', /\b(estrada|viagem|carro)/], ['festa', /\b(festa|churrasco)/]].find(([, re]) => re.test(chave));
    if (casa) moment = casa[0];
    return { tipo: 'playlist', url: u ? u[1] : '', moment, name: resto.replace(/\s+/g, ' ').trim() };
  }
  if (sec === 'saidas') {
    const valor = tirar(/(^|\s)R\$\s*(\d[\d.]*(?:,\d{1,2})?)/i);
    const hora = tirar(/(^|\s)(?:as\s+|às\s+)?(\d{1,2})(?:h|:)(\d{2})?(?=\s|$)/i);
    const d = tarAcharData(resto);
    let data = '';
    if (d) { data = d.due; resto = resto.slice(0, d.ini) + ' ' + resto.slice(d.fim); }
    const nome = resto.replace(/\s+/g, ' ').trim();
    const n = sem(nome);
    const tipos = [['show', /\bshow/], ['museu', /\bmuseu|pinacoteca|memorial/], ['exposicao', /\bexpos/], ['teatro', /\bteatro|peca\b/], ['cinema', /\bcinema/], ['restaurante', /\brestaurante|jantar|almoco|pizzaria/], ['bar', /\bbar\b|boteco|cervej/], ['parque', /\bparque|cachoeira|trilha|serra\b/], ['festival', /\bfestival|festa\b/], ['esporte', /\bjogo\b|estadio|mineirao|futebol/], ['passeio', /\bpasseio|feira\b/]].find(([, re]) => re.test(n));
    const h = hora ? `${String(hora[2]).padStart(2, '0')}:${hora[3] || '00'}` : '';
    return { tipo: 'saida', nome, tipoSaida: tipos ? tipos[0] : 'outro', data, hora: Number(hora && hora[2]) < 24 ? h : '', valor: valor ? parseFloat(valor[2].replace(/\./g, '').replace(',', '.')) || 0 : 0 };
  }
  const onde = tirar(/(^|\s)#([\p{L}\p{N}+]+)/u);
  // a palavra do tipo só conta no COMEÇO ("O Filme da Minha Vida" não perde o "Filme")
  const k = tirar(/^\s*(serie|série|seriado|filme|documentario|documentário|doc|anime)(?=\s)/i);
  const kw = k ? sem(k[1]) : '';
  const kind = /^seri/.test(kw) ? 'serie' : kw === 'filme' ? 'filme' : /^doc/.test(kw) ? 'doc' : kw === 'anime' ? 'anime' : 'filme';
  const ondeTxt = onde ? (LZ_ONDE[sem(onde[2]).replace(/[^a-z0-9]/g, '')] || onde[2]) : '';
  return { tipo: 'midia', title: resto.replace(/\s+/g, ' ').trim(), kind, where: ondeTxt, kindDito: !!k };
}
function lzRapidaPrevia() {
  const el = document.getElementById('lz-rapida-previa'), inp = document.getElementById('lz-rapida'); if (!el || !inp) return;
  const sec = lzSecao();
  inp.placeholder = sec === 'musica' ? 'Nome da playlist + link…' : sec === 'saidas' ? 'Aonde quer ir?' : 'O que quer assistir?';
  if (!inp.value.trim()) {
    el.innerHTML = '<span class="tar-dica">' + (sec === 'musica' ? 'Ex.: <b>Lo-fi do plantão #plantão https://open.spotify.com/…</b>'
      : sec === 'saidas' ? 'Ex.: <b>Show do Djavan sábado 21h R$ 180</b> — com dia, já entra marcado e no calendário.'
      : 'Ex.: <b>série Severance #appletv</b> — entra na fila e busca a capa sozinho.') + '</span>';
    return;
  }
  const e = lzEntender(inp.value), p = [];
  if (e.tipo === 'midia') {
    const t = TIPOS_MIDIA[e.kind]; p.push(`<span class="tar-lt" style="--cor:${LZ_COR_TIPO[e.kind]}">${t[0]} ${t[1]}${e.kindDito ? '' : ' <small>(padrão)</small>'}</span>`);
    if (e.where) p.push(`<span class="nt-marc">${esc(e.where)}</span>`);
    p.push('<span class="tar-dica">🔖 vai para "quero ver"</span>');
  } else if (e.tipo === 'saida') {
    const t = TIPOS_SAIDA[e.tipoSaida]; p.push(`<span class="tar-lt" style="--cor:var(--info)">${t[0]} ${t[1]}</span>`);
    p.push(e.data ? `<span class="tar-due prox">📅 ${esc(rotuloDataLonga(e.data))}${e.hora ? ' · ' + e.hora : ''} → marcado</span>` : '<span class="tar-dica">💭 sem dia → "quero ir"</span>');
    if (e.valor) p.push(`<span class="nt-marc">${formatCurrency(e.valor)}</span>`);
  } else {
    const m = MOMENTOS[e.moment]; p.push(`<span class="tar-lt" style="--cor:${LZ_COR_MOMENTO[e.moment]}">${m[0]} ${m[1]}</span>`);
    p.push(e.url ? '<span class="tar-dica">🔗 link ok</span>' : '<span class="tar-due atras">falta o link</span>');
  }
  const nome = e.title || e.nome || e.name;
  el.innerHTML = `<span class="tar-entendi">entendi:</span> <b>${esc(nome || '…')}</b> ${p.join(' ')}`;
}
function lzRapidaAdicionar() {
  const inp = document.getElementById('lz-rapida'); if (!inp) return;
  const e = lzEntender(inp.value);
  if (e.tipo === 'midia') {
    if (!e.title) { inp.focus(); return; }
    const m = { id: novoId(), addedAt: hojeISO(), watchedAt: '', title: e.title, kind: e.kind, status: 'quero', where: e.where, who: '', url: '', season: 0, episode: 0, rating: 0, comment: '' };
    media.push(m); salvar('media', media); renderMidia();
    toast(`🎬 "${m.title}" na fila.`);
    if (navigator.onLine) ilustrarMidia(m.id);
  } else if (e.tipo === 'saida') {
    if (!e.nome) { inp.focus(); return; }
    const s = { id: novoId(), nome: e.nome, tipo: e.tipoSaida, status: e.data ? 'marcado' : 'quero', cidade: '', local: '', data: e.data, hora: e.hora, valor: e.valor, com: '', url: '', notas: '', nota: 0, img: '', sobre: '', wiki: '', buscadoEm: '', eventId: null, addedAt: hojeISO(), feitoEm: '' };
    saidas.push(s); sincronizarEventoSaida(s); salvar('saidas', saidas); renderSaidas(); redesenharAgenda();
    toast(`🎟️ "${s.nome}"${s.data ? ' marcado — já está no calendário' : ' na lista'}.`);
    if (navigator.onLine) ilustrarSaida(s.id);
  } else {
    if (!e.url) { toast('Cole o link da playlist junto (Spotify, YouTube…).'); inp.focus(); return; }
    playlists.push({ id: novoId(), name: e.name || MOMENTOS[e.moment][1], url: e.url, moment: e.moment });
    salvar('playlists', playlists); renderPlaylists(); toast('🎵 Playlist salva.');
  }
  inp.value = ''; lzRapidaPrevia(); inp.focus();
}

// ═══════════════════════ 2. O DETALHE (pop-up comum) ══════════════════════
function lzAbrirDetalhe(tipo, id) {
  lzEstado.detalhe = { tipo, id };
  const m = document.getElementById('lz-detalhe'); if (!m) return;
  lzDesenharDetalhe();
  m.style.display = 'flex';
}
function lzFecharDetalhe() { const m = document.getElementById('lz-detalhe'); if (m) m.style.display = 'none'; lzEstado.detalhe = null; }
function lzDesenharDetalhe() {
  const d = lzEstado.detalhe, corpo = document.getElementById('lz-detalhe-corpo'), tit = document.getElementById('lz-detalhe-tit');
  if (!d || !corpo) return;
  let html = '';
  if (d.tipo === 'midia') {
    const x = media.find(i => i.id === d.id); if (!x) { lzFecharDetalhe(); return; }
    const t = TIPOS_MIDIA[x.kind] || TIPOS_MIDIA.outro, s = STATUS_MIDIA[x.status] || STATUS_MIDIA.quero, serie = x.kind === 'serie' || x.kind === 'anime', busc = ilustrando.has(x.id);
    tit.textContent = `${t[0]} ${t[1]}`;
    html = `<div class="lz-det">${lzCapa(x, 'det')}<div class="lz-det-info">
      <h3>${esc(x.title)}</h3>
      <div class="tar-tags"><span class="tar-lt" style="--cor:${s[2]}">${s[0]} ${s[1]}</span>${x.where ? `<span class="nt-marc">${esc(x.where)}</span>` : ''}${serie && x.season ? `<span class="nt-marc">T${x.season} · E${x.episode || 0}</span>` : ''}</div>
      ${x.who ? `<small>indicou: ${esc(x.who)}</small>` : ''}${x.watchedAt ? `<small>visto em ${isoParaBR(x.watchedAt)}</small>` : ''}
      <div class="midia-nota lz-estrelas">${estrelas(x)}</div>
      ${x.sobre ? `<p class="lz-sobre">${esc(x.sobre)}${x.wiki ? ` <a href="${esc(x.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ''}</p>` : ''}
      ${x.comment ? `<p class="lz-coment">“${esc(x.comment)}”</p>` : ''}
      ${x.url ? `<a class="link-chip" href="${esc(x.url)}" target="_blank" rel="noopener">${iconeDoLink(x.url)} abrir link</a>` : ''}
    </div></div>
    <div class="lz-det-acoes">
      ${x.status === 'quero' ? `<button type="button" class="mini-btn on" onclick="avancarStatusMidia(${x.id})">▶ começar</button>` : ''}
      ${x.status === 'assistindo' ? `<button type="button" class="mini-btn on" onclick="avancarStatusMidia(${x.id})">✅ terminei</button>` : ''}
      ${serie && x.status !== 'visto' ? `<button type="button" class="mini-btn" onclick="proximoEpisodio(${x.id}, -1)">− ep</button><button type="button" class="mini-btn" onclick="proximoEpisodio(${x.id}, 1)">＋ ep</button>` : ''}
      ${x.status !== 'largado' && x.status !== 'visto' ? `<button type="button" class="mini-btn" onclick="lzLargar(${x.id})">🚫 larguei</button>` : ''}
      <button type="button" class="mini-btn" ${busc ? 'disabled' : ''} onclick="ilustrarMidia(${x.id})">${busc ? '⏳ buscando' : x.img ? '🌐 buscar de novo' : '🌐 buscar capa'}</button>
      <button type="button" class="mini-btn" onclick="lzFecharDetalhe(); editarMidia(${x.id})">✎ editar</button>
      <button type="button" class="mini-btn" onclick="removerMidia(${x.id})">✕ apagar</button>
    </div>`;
  } else if (d.tipo === 'saida') {
    const x = saidas.find(i => i.id === d.id); if (!x) { lzFecharDetalhe(); return; }
    const t = TIPOS_SAIDA[x.tipo] || TIPOS_SAIDA.outro, s = STATUS_SAIDA[x.status] || STATUS_SAIDA.quero, busc = ilustrando.has(x.id);
    tit.textContent = `${t[0]} ${t[1]}`;
    html = `<div class="lz-det">${lzFoto(x, 'det')}<div class="lz-det-info">
      <h3>${esc(x.nome)}</h3>
      <div class="tar-tags"><span class="tar-lt" style="--cor:${s[2]}">${s[0]} ${s[1]}</span>${x.data ? `<span class="nt-marc">${esc(rotuloDataLonga(x.data))}${x.hora ? ' · ' + esc(x.hora) : ''}</span>` : ''}${x.valor ? `<span class="nt-marc">${formatCurrency(x.valor)}</span>` : ''}</div>
      ${[x.cidade, x.local, x.com ? 'com ' + x.com : ''].filter(Boolean).length ? `<small>${esc([x.cidade, x.local, x.com ? 'com ' + x.com : ''].filter(Boolean).join(' · '))}</small>` : ''}
      <div class="midia-nota lz-estrelas">${estrelasSaida(x)}</div>
      ${x.sobre ? `<p class="lz-sobre">${esc(x.sobre)}${x.wiki ? ` <a href="${esc(x.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ''}</p>` : ''}
      ${x.notas ? `<p class="lz-coment">${linkify(esc(x.notas))}</p>` : ''}
      ${x.url ? `<a class="link-chip" href="${esc(x.url)}" target="_blank" rel="noopener">${iconeDoLink(x.url)} abrir link</a>` : ''}
    </div></div>
    <div class="lz-det-acoes">
      ${x.status === 'quero' ? `<button type="button" class="mini-btn on" onclick="lzFecharDetalhe(); editarSaida(${x.id}); document.getElementById('saida-status').value = 'marcado';">📅 marcar o dia</button>` : ''}
      ${x.status === 'marcado' ? `<button type="button" class="mini-btn on" onclick="avancarStatusSaida(${x.id})">✅ fui</button>` : ''}
      <button type="button" class="mini-btn" ${busc ? 'disabled' : ''} onclick="ilustrarSaida(${x.id})">${busc ? '⏳ buscando' : x.img ? '🌐 buscar de novo' : '🌐 buscar foto'}</button>
      ${x.img ? `<button type="button" class="mini-btn" onclick="tirarIlustracao(${x.id})">🚫 tirar foto</button>` : ''}
      <button type="button" class="mini-btn" onclick="lzFecharDetalhe(); editarSaida(${x.id})">✎ editar</button>
      <button type="button" class="mini-btn" onclick="removerSaida(${x.id})">✕ apagar</button>
    </div>`;
  } else if (d.tipo === 'momento') {
    const mm = MOMENTOS[d.id] || MOMENTOS.outro, lst = playlists.filter(p => p.moment === d.id);
    tit.textContent = `${mm[0]} ${mm[1]}`;
    html = `<div class="lz-momento-lista">${lst.length ? lst.map(p => `<div class="lz-pl"><a href="${esc(p.url)}" target="_blank" rel="noopener">${iconeDoLink(p.url)} ${esc(p.name)}</a><button type="button" class="mini-btn" title="Apagar" onclick="removerPlaylist(${p.id})">✕</button></div>`).join('') : '<div class="sp-vazio">Nenhuma playlist neste momento ainda.</div>'}</div>
      <div class="lz-det-acoes"><button type="button" class="mini-btn on" onclick="lzNovaPlaylist('${d.id}')">＋ playlist de ${esc(mm[1].toLowerCase())}</button></div>`;
  }
  corpo.innerHTML = html;
}
function lzLargar(id) { const x = media.find(i => i.id === id); if (!x) return; x.status = 'largado'; salvar('media', media); renderMidia(); toast(`🚫 ${x.title}: larguei.`); }
function lzNovaPlaylist(moment) {
  lzFecharDetalhe();
  const s = document.getElementById('play-moment'); if (s) s.value = moment;
  const n = document.getElementById('play-name'); if (n) { n.scrollIntoView({ behavior: 'smooth', block: 'center' }); n.focus(); }
}

// ═══════════════════════ 3. A ESTANTE DE CAPAS ════════════════════════════
/** A capa: a foto da Wikipedia, ou um cartão colorido com o emoji e o título. */
function lzCapa(x, tam) {
  const t = TIPOS_MIDIA[x.kind] || TIPOS_MIDIA.outro, busc = ilustrando.has(x.id);
  return `<div class="lz-capa ${tam || ''}" style="--cor:${LZ_COR_TIPO[x.kind] || LZ_COR_TIPO.outro}">
    ${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
    <span class="lz-capa-ic">${busc ? '⏳' : t[0]}</span>
  </div>`;
}
function lzPoster(x, comEstrelas) {
  return `<button type="button" class="lz-poster" onclick="lzAbrirDetalhe('midia', ${x.id})" title="${esc(x.title)}">
    ${lzCapa(x)}<span class="lz-poster-nome">${esc(x.title)}</span>
    ${comEstrelas ? `<span class="lz-poster-nota">${x.rating ? '★'.repeat(x.rating) + '<i>' + '★'.repeat(5 - x.rating) + '</i>' : '<i>sem nota</i>'}</span>` : `<span class="lz-poster-sub">${esc(x.where || (TIPOS_MIDIA[x.kind] || TIPOS_MIDIA.outro)[1])}</span>`}
  </button>`;
}
function lzAssistindo(x) {
  const serie = x.kind === 'serie' || x.kind === 'anime';
  return `<div class="lz-agora">
    <button type="button" class="lz-agora-capa" onclick="lzAbrirDetalhe('midia', ${x.id})">${lzCapa(x, 'media')}</button>
    <div class="lz-agora-info">
      <b onclick="lzAbrirDetalhe('midia', ${x.id})">${esc(x.title)}</b>
      <small>${esc([(TIPOS_MIDIA[x.kind] || TIPOS_MIDIA.outro)[1], x.where].filter(Boolean).join(' · '))}</small>
      ${serie ? `<div class="lz-ep"><span class="lz-ep-n">T${x.season || 1} · E${x.episode || 0}</span>
        <button type="button" class="mini-btn" title="Episódio anterior" onclick="proximoEpisodio(${x.id}, -1)">−</button><button type="button" class="mini-btn lz-ep-mais" title="Vi mais um episódio" onclick="proximoEpisodio(${x.id}, 1)">＋ ep</button></div>` : ''}
      <button type="button" class="mini-btn" onclick="avancarStatusMidia(${x.id})">✅ terminei</button>
    </div>
  </div>`;
}
function lzRenderMidia() {
  const el = document.getElementById('midia-lista'); if (!el) return;
  const por = k => media.filter(m => m.status === k);
  const quero = por('quero').sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.id - a.id);
  const agora = por('assistindo'), largados = por('largado');
  const vistos = por('visto').sort((a, b) => (b.watchedAt || '').localeCompare(a.watchedAt || '') || b.id - a.id);
  const resumo = document.getElementById('midia-resumo');
  if (resumo) {
    const notas = vistos.filter(m => m.rating), media5 = notas.length ? notas.reduce((a, m) => a + m.rating, 0) / notas.length : 0;
    resumo.innerHTML = `<div class="tar-num"><b>${quero.length}</b><small>na fila</small></div><div class="tar-num"><b>${agora.length}</b><small>assistindo</small></div><div class="tar-num"><b>${vistos.length}</b><small>${palavra(vistos.length, 'visto', 'vistos')}</small></div><div class="tar-num quente"><b>${media5 ? '★ ' + media5.toFixed(1).replace('.', ',') : '—'}</b><small>nota média</small></div>`;
  }
  if (!media.length) { el.innerHTML = '<div class="sp-vazio">Nada aqui ainda. Escreva na barra acima aquele filme que te indicaram.</div>'; return; }
  const LIM = 12, vis = lzEstado.tudoVistos ? vistos : vistos.slice(0, LIM);
  el.innerHTML = (agora.length ? `<h3 class="tar-gr-tit lz-tit-agora">▶️ Assistindo agora <small>${agora.length}</small></h3><div class="lz-agora-grade">${agora.map(lzAssistindo).join('')}</div>` : '') +
    `<h3 class="tar-gr-tit">🔖 Quero ver <small>${quero.length}</small></h3>${quero.length ? `<div class="lz-estante">${quero.map(x => lzPoster(x)).join('')}</div>` : '<div class="lz-vazio">Fila vazia.</div>'}` +
    (vistos.length ? `<h3 class="tar-gr-tit lz-tit-visto">✅ Vistos <small>${vistos.length}</small></h3><div class="lz-estante menor">${vis.map(x => lzPoster(x, true)).join('')}</div>${vistos.length > LIM ? `<div class="nt-pe"><button type="button" class="nt-novo" onclick="lzEstado.tudoVistos = !lzEstado.tudoVistos; lzRenderMidia();">${lzEstado.tudoVistos ? 'mostrar menos' : `ver todos os ${vistos.length}`}</button></div>` : ''}` : '') +
    (largados.length ? `<details class="lz-largados"><summary>🚫 Larguei <small>${largados.length}</small></summary><div class="lz-estante menor">${largados.map(x => lzPoster(x)).join('')}</div></details>` : '');
  if (lzEstado.detalhe && lzEstado.detalhe.tipo === 'midia') lzDesenharDetalhe();
}

// ═══════════════════════ 4. OS INGRESSOS E O ÁLBUM ════════════════════════
function lzFoto(x, tam) {
  const t = TIPOS_SAIDA[x.tipo] || TIPOS_SAIDA.outro, busc = ilustrando.has(x.id);
  return `<div class="lz-foto ${tam || ''}">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="lz-foto-ic">${busc ? '⏳' : t[0]}</span></div>`;
}
function lzIngresso(x) {
  const t = TIPOS_SAIDA[x.tipo] || TIPOS_SAIDA.outro, hoje = hojeISO();
  let falta = '', cls = '';
  if (x.data) {
    const d = tarDiasEntre(hoje, x.data);
    falta = d < 0 ? 'já passou' : d === 0 ? 'é hoje!' : d === 1 ? 'amanhã' : `faltam ${d} dias`;
    cls = d < 0 ? 'atras' : d <= 1 ? 'hoje' : '';
  }
  const dt = x.data ? x.data.split('-') : null;
  return `<div class="lz-ingresso" onclick="lzAbrirDetalhe('saida', ${x.id})" tabindex="0" onkeydown="if (event.key === 'Enter') lzAbrirDetalhe('saida', ${x.id})">
    <div class="lz-ing-corpo">${lzFoto(x, 'ing')}<div class="lz-ing-info">
      <small class="lz-ing-tipo">${esc(t[1])}</small>
      <b>${esc(x.nome)}</b>
      <span>${esc([x.cidade, x.hora, x.com ? 'com ' + x.com : ''].filter(Boolean).join(' · '))}${x.valor ? ` · <strong>${formatCurrency(x.valor)}</strong>` : ''}</span>
    </div></div>
    <div class="lz-ing-canhoto ${cls}">${dt ? `<small>${esc(diaSemanaCurto(x.data)).toUpperCase()}</small><b>${dt[2]}/${dt[1]}</b><span>${falta}</span>` : '<small>SEM</small><b>dia</b><span>marcar</span>'}
      <button type="button" class="mini-btn lz-fui" onclick="event.stopPropagation(); avancarStatusSaida(${x.id})" title="Fui!">✅ fui</button></div>
  </div>`;
}
function lzCartaoQuero(x) {
  const t = TIPOS_SAIDA[x.tipo] || TIPOS_SAIDA.outro;
  return `<button type="button" class="lz-quero" onclick="lzAbrirDetalhe('saida', ${x.id})">${lzFoto(x)}<span class="lz-quero-nome">${esc(x.nome)}</span><span class="lz-quero-sub">${esc([t[1], x.cidade].filter(Boolean).join(' · '))}</span></button>`;
}
function lzPolaroide(x) {
  return `<div class="lz-polaroide" onclick="lzAbrirDetalhe('saida', ${x.id})" tabindex="0" onkeydown="if (event.key === 'Enter') lzAbrirDetalhe('saida', ${x.id})">${lzFoto(x)}
    <span class="lz-pol-nome">${esc(x.nome)}</span>
    <span class="midia-nota" onclick="event.stopPropagation()">${estrelasSaida(x)}</span>
    <small>${x.feitoEm ? isoParaBR(x.feitoEm).slice(0, 5) : ''}${x.valor ? ' · ' + formatCurrency(x.valor) : ''}</small>
  </div>`;
}
function lzRenderSaidas() {
  const el = document.getElementById('saida-lista'); if (!el) return;
  const marcados = saidas.filter(s => s.status === 'marcado').sort((a, b) => (a.data || '9999').localeCompare(b.data || '9999'));
  const quero = saidas.filter(s => s.status === 'quero').sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '') || b.id - a.id);
  const fui = saidas.filter(s => s.status === 'fui').sort((a, b) => (b.feitoEm || '').localeCompare(a.feitoEm || '') || b.id - a.id);
  const perdi = saidas.filter(s => s.status === 'passou');
  const resumo = document.getElementById('saida-resumo');
  if (resumo) {
    const gasto = fui.reduce((a, s) => a + (Number(s.valor) || 0), 0);
    resumo.innerHTML = `<div class="tar-num"><b>${marcados.length}</b><small>${palavra(marcados.length, 'marcado', 'marcados')}</small></div><div class="tar-num"><b>${quero.length}</b><small>na vontade</small></div><div class="tar-num"><b>${fui.length}</b><small>${palavra(fui.length, 'já fui', 'já fui')}</small></div><div class="tar-num"><b>${gasto ? finCompacto(gasto) : '—'}</b><small>gasto em lazer</small></div>`;
  }
  if (!saidas.length) { el.innerHTML = '<div class="sp-vazio">Nada ainda. Escreva na barra acima um museu, um show ou um restaurante — com internet, o app busca a foto sozinho.</div>'; return; }
  const LIM = 12, vis = lzEstado.tudoFui ? fui : fui.slice(0, LIM);
  el.innerHTML = `<h3 class="tar-gr-tit lz-tit-agora">🎟️ Marcados <small>${marcados.length}</small></h3>${marcados.length ? `<div class="lz-ingressos">${marcados.map(lzIngresso).join('')}</div>` : '<div class="lz-vazio">Nenhum programa marcado. Dê um dia a algo do "quero ir".</div>'}` +
    `<h3 class="tar-gr-tit">💭 Quero ir <small>${quero.length}</small></h3>${quero.length ? `<div class="lz-mural">${quero.map(lzCartaoQuero).join('')}</div>` : '<div class="lz-vazio">Nada na vontade.</div>'}` +
    (fui.length ? `<h3 class="tar-gr-tit lz-tit-visto">📸 Já fui <small>${fui.length}</small></h3><div class="lz-album">${vis.map(lzPolaroide).join('')}</div>${fui.length > LIM ? `<div class="nt-pe"><button type="button" class="nt-novo" onclick="lzEstado.tudoFui = !lzEstado.tudoFui; lzRenderSaidas();">${lzEstado.tudoFui ? 'mostrar menos' : `ver todos os ${fui.length}`}</button></div>` : ''}` : '') +
    (perdi.length ? `<details class="lz-largados"><summary>⌛ Perdi <small>${perdi.length}</small></summary><div class="lz-mural">${perdi.map(lzCartaoQuero).join('')}</div></details>` : '');
  if (lzEstado.detalhe && lzEstado.detalhe.tipo === 'saida') lzDesenharDetalhe();
}

// ═════════════════════════ 5. OS DISCOS DA MÚSICA ═════════════════════════
function lzRenderPlaylists() {
  const el = document.getElementById('play-lista'); if (!el) return;
  el.innerHTML = `<div class="lz-discos">${Object.entries(MOMENTOS).map(([k, mm]) => {
    const n = playlists.filter(p => p.moment === k).length;
    return `<button type="button" class="lz-disco${n ? '' : ' vazio'}" style="--cor:${LZ_COR_MOMENTO[k]}" onclick="lzTocarMomento('${k}')">
      <span class="lz-vinil"><span class="lz-rotulo">${mm[0]}</span></span>
      <b>${esc(mm[1])}</b><small>${n ? plural(n, 'playlist', 'playlists') : '＋ adicionar'}</small>
    </button>`;
  }).join('')}</div>`;
  if (lzEstado.detalhe && lzEstado.detalhe.tipo === 'momento') lzDesenharDetalhe();
}
/** Um toque no disco: uma playlist só → abre direto; várias (ou nenhuma) → o detalhe. */
function lzTocarMomento(k) {
  const lst = playlists.filter(p => p.moment === k);
  if (lst.length === 1) { window.open(lst[0].url, '_blank', 'noopener'); toast(`🎵 Abrindo "${lst[0].name}".`); return; }
  lzAbrirDetalhe('momento', k);
}

// ══════════════════════════ O DESENHO GERAL ═══════════════════════════════
/** Chamado pelo verSecaoLazer() do app.js depois de trocar a micro-aba. */
function lzAoTrocar() { lzRapidaPrevia(); if (typeof sincronizarBotoesDeSecao === 'function') sincronizarBotoesDeSecao(); }
