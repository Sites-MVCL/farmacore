(() => {
'use strict';
/* ============ dados ============ */
const D = JSON.parse(document.getElementById('data').textContent);
const MS = D.missoes, G = D.jogos, META = D.meta, BONUS = META.bonus, LEVELS = META.niveis;
const KEY = 'farmacore:v1';
const LESSON_XP = 10;

/* ============ utilitários ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const ic = (id, cls) => `<svg class="ico ${cls || ''}" aria-hidden="true"><use href="#${id}"/></svg>`;
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad = n => String(n).padStart(2, '0');
const PRAISE = ['Isso!', 'Acertou!', 'Boa!', 'Exato!', 'Perfeito!', 'Checado!'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAGS = {quiz:'Quiz', match:'Conexões', order:'Sequência', pick:'Seleção', explore:'Exploração', janela:'Simulador', adme:'Simulador', curvas:'Simulador', agonista:'Simulador', inspect:'Simulador', checkpoint:'Simulador', codex:'Arsenal', insulina:'Simulador'};
const PERSIST = ['explore', 'janela', 'adme', 'curvas', 'agonista', 'insulina', 'codex'];

/* ============ estado ============ */
const blank = () => ({xp:0, got:{}, games:{}, done:{}, found:{}, lesson:{}, unlocked:{}, name:''});
let S = blank();
let current = 'mapa';
function load() { try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); if (d && typeof d === 'object') S = Object.assign(blank(), d); } } catch (e) {} }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

function gameMax(g) {
  switch (g.tipo) {
    case 'quiz': return g.itens.length * g.pts;
    case 'match': return g.pares.length * g.pts;
    case 'order': return 20;
    case 'pick': return g.itens.length * g.pts;
    case 'explore': return g.pontos.length * g.pts;
    case 'janela': return g.zonas.length * g.pts;
    case 'adme': return g.estacoes.length * g.pts;
    case 'curvas': return g.vias.length * g.pts;
    case 'agonista': return g.estados.length * g.pts;
    case 'insulina': return g.tipos.length * g.pts;
    case 'inspect': return g.casos.reduce((t, c) => t + c.campos.length * g.pts, 0);
    case 'checkpoint': return g.casos.length * (g.certos.length * g.ptsLinha + g.ptsDecisao);
    case 'codex': return g.meta * g.ptsCartao;
  }
  return 0;
}
const gamesOf = m => (m.treino || []).filter(b => b.t === 'game').map(b => b.id);
const missionMax = m => (m.aula ? LESSON_XP : 0) + BONUS + gamesOf(m).reduce((t, id) => t + gameMax(G[id]), 0);
const trainingOpen = m => !m.aula || S.lesson[m.id] || S.unlocked[m.id] || gamesOf(m).some(id => S.games[id]);
const MAX = MS.reduce((t, m) => t + missionMax(m), 0);
function levelOf(p) { let i = 0; LEVELS.forEach((l, k) => { if (p >= Math.ceil(l.a * MAX)) i = k; }); return i; }
function earned(gid) { let t = 0; for (const k in S.got) { if (k === gid || k.indexOf(gid + ':') === 0) t += S.got[k]; } return t; }
const missionOf = gid => MS.find(m => gamesOf(m).includes(gid));
const seloCount = () => MS.filter(m => S.done[m.id]).length;
const nextMission = () => MS.find(m => !S.done[m.id]);

/* ============ pontos e efeitos ============ */
function award(key, n, at) {
  const prev = S.got[key] || 0;
  if (n <= prev) return 0;
  const before = levelOf(S.xp);
  S.got[key] = n; S.xp += n - prev; save();
  floatPts(n - prev, at);
  updateHUD(true);
  const after = levelOf(S.xp);
  if (after > before) toast('Nova patente: ' + LEVELS[after].nome + '!', true);
  return n - prev;
}
function visit(gid, key, pts, at) {
  S.found[gid] = S.found[gid] || {};
  if (S.found[gid][key]) return false;
  S.found[gid][key] = 1; save();
  award(gid + ':' + key, pts, at);
  return true;
}
const foundCount = gid => Object.keys(S.found[gid] || {}).length;
function gameDone(gid) {
  if (!S.games[gid]) { S.games[gid] = true; save(); }
  const sec = $(`.game[data-gid="${gid}"]`);
  if (sec) setTag(sec, true);
  const m = missionOf(gid); if (m) updateMissionEnd(m.id);
}
function setTag(sec, done) {
  const t = $('.g-tag', sec); if (!t) return;
  t.textContent = done ? 'Concluído' : (TAGS[sec.dataset.type] || 'Jogo');
  sec.classList.toggle('is-done', !!done);
}
function floatPts(n, at) {
  if (reduce) return;
  const el = document.createElement('div'); el.className = 'float-pts'; el.textContent = '+' + n + ' XP';
  let x = innerWidth / 2, y = innerHeight / 2;
  if (at && at.getBoundingClientRect) { const r = at.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
  el.style.left = Math.max(30, Math.min(innerWidth - 70, x)) + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 1150);
}
let toastT;
function toast(msg, big) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (big ? ' big' : '');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function burst() {
  if (reduce) return;
  const cols = ['#22E4FF', '#8D7DFF', '#FF4FB0', '#5BFFAA', '#FFC24B'];
  for (let i = 0; i < 34; i++) {
    const s = document.createElement('div'); s.className = 'spark';
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 190;
    s.style.left = innerWidth / 2 + 'px'; s.style.top = innerHeight / 2 + 'px';
    s.style.background = cols[i % cols.length];
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    document.body.appendChild(s); setTimeout(() => s.remove(), 1250);
  }
}

/* ============ blocos de conteúdo ============ */
const CALL_ICON = {atencao:'i-alert', memo:'i-brain', nota:'i-info', ok:'i-check', exemplo:'i-bolt'};
function pulsoSvg(id) {
  return `<svg class="pulso" viewBox="0 0 80 80" aria-hidden="true"><defs><radialGradient id="pg${id}" cx="50%" cy="38%"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#22E4FF"/><stop offset="1" stop-color="#0a2a6a"/></radialGradient></defs><circle cx="40" cy="40" r="38.5" fill="none" stroke="#8D7DFF" stroke-opacity=".55"/><circle cx="40" cy="40" r="35" fill="none" stroke="#22E4FF" stroke-opacity=".6" stroke-dasharray="3 5"/><circle cx="40" cy="40" r="29" fill="url(#pg${id})"/><circle cx="31" cy="37" r="3.2" fill="#031018"/><circle cx="49" cy="37" r="3.2" fill="#031018"/><path d="M32 48q8 6.5 16 0" stroke="#031018" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`;
}
function renderBlock(b) {
  switch (b.t) {
    case 'texto':
      return `<section class="txt">${b.titulo ? `<h2 class="blk-title">${esc(b.titulo)}</h2>` : ''}${(b.p || []).map(p => `<p>${fmt(p)}</p>`).join('')}</section>`;
    case 'cards':
      return `<section>${b.titulo ? `<h2 class="blk-title">${esc(b.titulo)}</h2>` : ''}<div class="cards ${b.cols === 3 ? 'c3' : b.cols === 2 ? 'c2' : ''}">${b.itens.map(c => `<article class="card"><h4>${esc(c.t)}${c.tag ? `<span class="tag">${esc(c.tag)}</span>` : ''}</h4><p>${fmt(c.d)}</p></article>`).join('')}</div></section>`;
    case 'callout':
      return `<aside class="callout ${b.kind}">${ic(CALL_ICON[b.kind] || 'i-info')}<div><b>${esc(b.titulo)}</b><p>${fmt(b.texto)}</p></div></aside>`;
    case 'tabela':
      return `<div class="tbl-wrap"><table><thead><tr>${b.cab.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.linhas.map(r => `<tr>${r.map(c => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'lista': {
      const tag = b.ord ? 'ol' : 'ul';
      return `<section class="txt">${b.titulo ? `<h3 class="sub-title">${esc(b.titulo)}</h3>` : ''}<${tag} class="les-list">${b.itens.map(i => `<li>${fmt(i)}</li>`).join('')}</${tag}></section>`;
    }
    case 'fluxo':
      return `<section>${b.titulo ? `<h3 class="sub-title">${esc(b.titulo)}</h3>` : ''}<div class="fluxo">${b.passos.map((p, i) => `<div class="fl-step"><b>${esc(p.t)}</b><span>${esc(p.d || '')}</span></div>${i < b.passos.length - 1 ? `<span class="fl-arr" aria-hidden="true">${ic('i-play')}</span>` : ''}`).join('')}</div></section>`;
    case 'barra':
      return `<section>${b.titulo ? `<h3 class="sub-title">${esc(b.titulo)}</h3>` : ''}<div class="barra">${b.segs.map(x => `<div class="br-seg ${x.c}"><b>${esc(x.n)}</b><span>${esc(x.d || '')}</span></div>`).join('')}</div></section>`;
    case 'pense':
      return `<aside class="pense"><div class="pn-h">${ic('i-brain')} Pare e pense</div><p class="pn-q">${fmt(b.q)}</p><button class="btn btn-sm" data-act="pense">Ver a resposta</button><p class="pn-a" hidden>${fmt(b.a)}</p></aside>`;
    case 'receita':
      return `<section>${b.titulo ? `<h3 class="sub-title">${esc(b.titulo)}</h3>` : ''}<div class="rx">${b.linhas.map(l => `<div class="rc-row"><span class="k">${esc(l.k)}</span><span class="v">${esc(l.v)}</span><span class="n">${esc(l.n || '')}</span></div>`).join('')}</div></section>`;
    case 'game': {
      const g = G[b.id];
      return `<section class="game panel" data-gid="${b.id}" data-type="${g.tipo}"><div class="g-head"><div><div class="g-tag">${TAGS[g.tipo] || 'Jogo'}</div><h3 class="g-title">${esc(g.titulo)}</h3>${g.dica ? `<p class="g-hint">${esc(g.dica)}</p>` : ''}</div><span class="g-pts">+${gameMax(g)} XP</span></div><div class="g-body"></div></section>`;
    }
  }
  return '';
}

/* ============ jogos: montagem ============ */
function mountGame(sec) {
  const gid = sec.dataset.gid, g = G[gid], body = $('.g-body', sec), R = RENDER[g.tipo];
  setTag(sec, !!S.games[gid]);
  if (!PERSIST.includes(g.tipo) && S.games[gid]) {
    body.innerHTML = `<div class="g-done-strip"><span><b>Concluído</b> · ${earned(gid)}/${gameMax(g)} XP</span><button class="btn btn-sm" data-act="replay">${ic('i-reload')} Jogar de novo</button></div>`;
    $('[data-act=replay]', body).onclick = () => R(body, gid, g, sec);
  } else R(body, gid, g, sec);
}
const endMsg = (r, n) => r >= .9 ? 'Excelente! Domínio total desta etapa.' : r >= .6 ? 'Bom trabalho! Releia os pontos que escaparam e tente de novo se quiser.' : 'Vale reler o conteúdo acima e jogar de novo. Errar aqui é treino.';
const replayBtn = (id) => `<button class="btn btn-sm" id="${id}">${ic('i-reload')} Jogar de novo</button>`;

/* ----- quiz ----- */
function rQuiz(body, gid, g) {
  const items = g.itens, n = items.length; let i = 0, right = 0;
  const step = () => {
    const it = items[i]; let opts, a;
    if (it.opts) { const idx = shuffle(it.opts.map((_, k) => k)); opts = idx.map(k => it.opts[k]); a = idx.indexOf(it.a); }
    else { opts = g.opts; a = it.a; }
    const cols = !it.opts && opts.every(o => o.length < 26);
    body.innerHTML = `<div class="g-prog"><span>${esc(g.rotulo || 'Pergunta')} ${i + 1}/${n}</span><div class="bar"><span style="width:${i / n * 100}%"></span></div></div>
      <p class="q-text">${fmt(it.q)}</p>
      <div class="opts ${cols ? 'cols' : ''}" role="group" aria-label="Alternativas">${opts.map((o, k) => `<button class="opt ${!it.opts && g.tons ? 't-' + g.tons[k] : ''}" data-k="${k}"><span class="k">${'ABCDE'[k]}</span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="fb-slot" role="status"></div>`;
    const bs = $$('.opt', body);
    bs.forEach(b => b.onclick = () => {
      const k = +b.dataset.k, ok = k === a;
      bs.forEach(x => x.disabled = true);
      b.classList.add(ok ? 'ok' : 'bad'); if (!ok) bs[a].classList.add('ok');
      if (ok) { right++; award(gid + ':' + i, g.pts, b); }
      const last = i === n - 1;
      $('.fb-slot', body).innerHTML = `<div class="fb ${ok ? 'good' : 'miss'}"><b>${ok ? pick(PRAISE) : 'Quase lá'}</b>${ok ? '' : 'Resposta certa: <strong>' + esc(opts[a]) + '</strong>. '}${fmt(it.why)}</div><div class="row" style="margin-top:12px"><button class="btn btn-primary" id="nx">${last ? 'Ver resultado' : 'Próxima'} ${ic('i-play')}</button></div>`;
      const nx = $('#nx', body); nx.focus({preventScroll: true});
      nx.onclick = () => { if (last) end(); else { i++; step(); } };
    });
  };
  const end = () => {
    gameDone(gid);
    body.innerHTML = `<div class="g-end"><div class="score">${right}<small> / ${n} acertos</small></div><p>${endMsg(right / n)}</p><p class="mono small muted">XP neste jogo: ${earned(gid)} de ${gameMax(g)}</p>${replayBtn('rp')}</div>`;
    $('#rp', body).onclick = () => { i = 0; right = 0; step(); };
  };
  step();
}

/* ----- ligar pares ----- */
function rMatch(body, gid, g) {
  const n = g.pares.length;
  const L = g.pares.map((p, i) => ({i, t: p.l}));
  let R = shuffle(g.pares.map((p, i) => ({i, t: p.r})));
  let sl = null, sr = null, done = new Set(), mist = 0;
  body.innerHTML = `<div class="g-prog"><span id="mp">0/${n} pares</span><div class="bar"><span id="mb" style="width:0"></span></div></div>
    <div class="mt"><div class="mt-col" id="ml">${L.map(x => `<button class="mt-it" data-s="l" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div>
    <div class="mt-col" id="mr">${R.map(x => `<button class="mt-it" data-s="r" data-i="${x.i}">${esc(x.t)}</button>`).join('')}</div></div><div class="fb-slot" role="status"></div>`;
  const all = $$('.mt-it', body);
  const clear = () => all.forEach(b => b.classList.remove('sel'));
  all.forEach(b => b.onclick = () => {
    const s = b.dataset.s, i = +b.dataset.i;
    if (done.has(i) && b.classList.contains('ok')) return;
    if (s === 'l') sl = i; else sr = i;
    all.filter(x => x.dataset.s === s && !x.classList.contains('ok')).forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    if (sl !== null && sr !== null) {
      if (sl === sr) {
        const pair = all.filter(x => +x.dataset.i === sl);
        pair.forEach(x => { x.classList.remove('sel'); x.classList.add('ok'); x.disabled = true; });
        done.add(sl); award(gid + ':' + sl, g.pts, b);
        $('#mp', body).textContent = done.size + '/' + n + ' pares'; $('#mb', body).style.width = done.size / n * 100 + '%';
        sl = sr = null;
        if (done.size === n) {
          gameDone(gid);
          $('.fb-slot', body).innerHTML = `<div class="fb good"><b>Tudo conectado!</b>${mist ? mist + ' tentativa(s) fora do lugar. ' : 'Sem nenhum erro. '}XP: ${earned(gid)} de ${gameMax(g)}.</div><div class="row" style="margin-top:12px">${replayBtn('rp')}</div>`;
          $('#rp', body).onclick = () => rMatch(body, gid, g);
        }
      } else {
        mist++;
        const bad = all.filter(x => x.classList.contains('sel'));
        bad.forEach(x => x.classList.add('bad'));
        sl = sr = null;
        setTimeout(() => bad.forEach(x => x.classList.remove('bad', 'sel')), 450);
      }
    }
  });
}

/* ----- ordenar ----- */
function rOrder(body, gid, g) {
  const steps = g.passos.map((p, i) => ({...p, i}));
  let pool = shuffle(steps.slice()); if (pool.every((s, k) => s.i === k)) pool.push(pool.shift());
  let next = 0, mist = 0; const placed = [];
  const draw = (msg, bad) => {
    body.innerHTML = `<div class="ord-grid"><div class="ord-col"><h5>Embaralhado</h5><div class="ord-list pool">${pool.map(s => `<button class="step" data-i="${s.i}"><span><b>${esc(s.t)}</b>${s.d ? `<span>${esc(s.d)}</span>` : ''}</span></button>`).join('') || '<p class="muted small">Tudo no lugar.</p>'}</div></div>
      <div class="ord-col"><h5>Sua sequência</h5><div class="ord-list">${placed.map((s, k) => `<div class="step placed"><span class="n">${k + 1}</span><span><b>${esc(s.t)}</b>${s.d ? `<span>${esc(s.d)}</span>` : ''}</span></div>`).join('') || '<p class="muted small">Toque no primeiro passo.</p>'}</div></div></div>
      <div class="fb-slot" role="status">${msg ? `<div class="fb ${bad ? 'info' : 'good'}"><b>${bad ? 'Ainda não' : 'Sequência completa!'}</b>${msg}</div>` : ''}</div>`;
    $$('.pool .step', body).forEach(b => b.onclick = () => {
      const s = steps[+b.dataset.i];
      if (s.i === next) {
        placed.push(s); pool = pool.filter(x => x.i !== s.i); next++;
        if (next === steps.length) {
          const pts = Math.max(5, 20 - 3 * mist); award(gid, pts, b); gameDone(gid);
          draw(`${mist ? mist + ' tentativa(s) fora de ordem. ' : 'Sem nenhum erro. '}XP: ${earned(gid)} de 20.<div class="row" style="margin-top:10px">${replayBtn('rp')}</div>`, false);
          $('#rp', body).onclick = () => rOrder(body, gid, g);
        } else draw('', false);
      } else {
        mist++; b.classList.add('shake');
        const sl = $('.fb-slot', body); sl.innerHTML = `<div class="fb info"><b>Ainda não</b>${esc(steps[next].dica || 'Pense no que vem primeiro.')}</div>`;
        setTimeout(() => b.classList.remove('shake'), 400);
      }
    });
  };
  draw();
}

/* ----- selecionar ----- */
function rPick(body, gid, g) {
  const sel = new Set(); let checked = false;
  body.innerHTML = `<div class="pk">${g.itens.map((it, i) => `<button class="pk-it" data-i="${i}"><span class="box">${ic('i-check')}</span><span>${esc(it.t)}<small></small></span></button>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="btn btn-primary" id="ck">Conferir</button></div><div class="fb-slot" role="status"></div>`;
  const bs = $$('.pk-it', body);
  bs.forEach(b => b.onclick = () => { if (checked) return; const i = +b.dataset.i; sel.has(i) ? sel.delete(i) : sel.add(i); b.classList.toggle('sel'); });
  $('#ck', body).onclick = () => {
    checked = true; let hit = 0;
    bs.forEach((b, i) => {
      const it = g.itens[i], ok = sel.has(i) === it.ok;
      b.classList.remove('sel'); b.classList.add(ok ? 'ok' : 'bad'); b.disabled = true;
      $('small', b).textContent = (it.ok ? 'Fator válido. ' : 'Não é fator. ') + it.why;
      if (ok) { hit++; award(gid + ':' + i, g.pts, b); }
    });
    $('#ck', body).remove(); gameDone(gid);
    $('.fb-slot', body).innerHTML = `<div class="fb ${hit === g.itens.length ? 'good' : 'info'}"><b>${hit} de ${g.itens.length} certos</b>${endMsg(hit / g.itens.length)} XP: ${earned(gid)} de ${gameMax(g)}.</div><div class="row" style="margin-top:12px">${replayBtn('rp')}</div>`;
    $('#rp', body).onclick = () => rPick(body, gid, g);
  };
}

/* ----- explorar ----- */
function rExplore(body, gid, g) {
  body.innerHTML = `<div class="ex">${g.pontos.map((p, i) => `<button class="ex-it ${S.found[gid] && S.found[gid][i] ? 'open' : ''}" data-i="${i}"><b>${ic('i-bolt')} ${esc(p.t)}</b><p>${S.found[gid] && S.found[gid][i] ? fmt(p.d) : 'Toque para revelar'}</p></button>`).join('')}</div>`;
  $$('.ex-it', body).forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    b.classList.add('open'); $('p', b).innerHTML = fmt(g.pontos[i].d);
    visit(gid, i, g.pts, b);
    if (foundCount(gid) >= g.pontos.length) gameDone(gid);
  });
  if (foundCount(gid) >= g.pontos.length) gameDone(gid);
}

/* ----- janela de dose ----- */
function ecgPath(period, amp, jit) {
  let d = 'M0 38'; const mid = 38;
  for (let x = 0; x < 800; x += period) {
    const j = jit ? (Math.random() - .5) * jit : 0;
    d += ` L${x + period * .28} ${mid} L${x + period * .34} ${mid - amp * .22} L${x + period * .4} ${mid} L${x + period * .5} ${mid} L${x + period * .54} ${mid + amp * .2} L${x + period * .6} ${mid - amp - j} L${x + period * .66} ${mid + amp * .42} L${x + period * .72} ${mid} L${x + period * .86} ${mid - amp * .28} L${x + period * .96} ${mid} L${x + period} ${mid}`;
  }
  return d;
}
const TONE = {n:'#8FA3C2', ok:'#5BFFAA', al:'#FFC24B', x:'#FF5470'};
function rJanela(body, gid, g) {
  const ecgs = [ecgPath(400 / 3, 14, 0), ecgPath(100, 30, 0), ecgPath(50, 34, 10), 'M0 38 H800'];
  body.innerHTML = `<div class="jn-mon" id="jm" style="--c:${TONE.n}">
      <div class="jn-top"><span>Monitor do paciente</span><span class="jn-led"><i></i><span id="jz">—</span></span></div>
      <svg class="jn-ecg" viewBox="0 0 400 76" preserveAspectRatio="none" aria-hidden="true" style="overflow:hidden"><path id="je" d="${ecgs[0]}"/></svg></div>
    <div class="jn-gauge" aria-hidden="true">${g.zonas.map(z => `<div class="jn-z ${z.tom}${S.found[gid] && S.found[gid][z.id] ? ' seen' : ''}" data-z="${z.id}" style="width:${z.ate - z.de}%">${esc(z.nome)}</div>`).join('')}</div>
    <input class="jn-range" id="jr" type="range" min="0" max="100" value="8" aria-label="Quantidade de fármaco no organismo">
    <div class="jn-msg" id="jg" style="--c:${TONE.n}" role="status"><b>Mova o controle</b>Arraste para aumentar a quantidade de fármaco no organismo.</div>`;
  const r = $('#jr', body);
  const upd = () => {
    const v = +r.value, zi = g.zonas.findIndex(z => v >= z.de && v < z.ate) < 0 ? g.zonas.length - 1 : g.zonas.findIndex(z => v >= z.de && v < z.ate);
    const z = g.zonas[zi], c = TONE[z.tom];
    $('#jm', body).style.setProperty('--c', c); $('#jg', body).style.setProperty('--c', c);
    $('#jz', body).textContent = z.nome; $('#je', body).setAttribute('d', ecgs[zi]);
    $('#jg', body).innerHTML = `<b>${esc(z.nome)}</b>${esc(z.msg)}`;
    r.setAttribute('aria-valuetext', z.nome);
    if (visit(gid, z.id, g.pts, r)) { const el = $(`.jn-z[data-z="${z.id}"]`, body); if (el) el.classList.add('seen'); }
    if (foundCount(gid) >= g.zonas.length) gameDone(gid);
  };
  r.addEventListener('input', upd); upd();
}

/* ----- ADME ----- */
function rAdme(body, gid, g) {
  const E = g.estacoes; let idx = 0;
  body.innerHTML = `<div class="ad-track"><div class="ad-line"><span id="al" style="width:0"></span></div><div class="ad-cap" id="ac" style="left:12.5%"></div>
      ${E.map((e, i) => `<button class="ad-st" data-i="${i}"><span class="hexd"><b>${e.sigla}</b></span><span>${esc(e.nome)}</span></button>`).join('')}</div>
    <div class="ad-body" id="ab" role="region" aria-live="polite"></div>
    <div class="row" style="margin-top:14px"><button class="btn" id="ap">Anterior</button><button class="btn btn-primary" id="an">Próxima estação ${ic('i-play')}</button></div>`;
  const sel = i => {
    idx = i; const e = E[i];
    $$('.ad-st', body).forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('seen', !!(S.found[gid] && S.found[gid][E[k].id]) || k === i); });
    $('#ac', body).style.left = (12.5 + 25 * i) + '%'; $('#al', body).style.width = (i / (E.length - 1) * 100) + '%';
    $('#ab', body).innerHTML = `<span class="where">${esc(e.local)}</span><h4>${e.sigla} · ${esc(e.nome)}</h4><p>${fmt(e.texto)}</p><ul>${e.pontos.map(p => `<li>${fmt(p)}</li>`).join('')}</ul><div class="callout atencao">${ic('i-alert')}<div><b>Olhar de enfermagem</b><p>${fmt(e.enf)}</p></div></div>`;
    $('#ap', body).disabled = i === 0; $('#an', body).disabled = i === E.length - 1;
    visit(gid, e.id, g.pts, $$('.ad-st', body)[i]);
    if (foundCount(gid) >= E.length) gameDone(gid);
  };
  $$('.ad-st', body).forEach(b => b.onclick = () => sel(+b.dataset.i));
  $('#ap', body).onclick = () => sel(Math.max(0, idx - 1));
  $('#an', body).onclick = () => sel(Math.min(E.length - 1, idx + 1));
  sel(0);
}

/* ----- curvas por via ----- */
function curvePts(v) {
  const N = 90, T = 10, pts = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N * T;
    pts.push(v.ka ? v.ka / (v.ka - v.ke) * (Math.exp(-v.ke * t) - Math.exp(-v.ka * t)) : Math.exp(-v.ke * t));
  }
  const m = Math.max(...pts);
  return pts.map(p => p / m * v.h);
}
function rCurvas(body, gid, g) {
  const X0 = 44, X1 = 346, Y0 = 176, Y1 = 22, N = 90;
  const toPath = pts => pts.map((p, k) => (k ? 'L' : 'M') + (X0 + (X1 - X0) * k / N).toFixed(1) + ' ' + (Y0 - (Y0 - Y1) * p).toFixed(1)).join(' ');
  const ev = toPath(curvePts(g.vias[0]));
  body.innerHTML = `<div class="cv-chips" role="group" aria-label="Vias">${g.vias.map((v, i) => `<button class="cv-chip${S.found[gid] && S.found[gid][v.id] ? ' seen' : ''}" data-i="${i}">${v.sigla}</button>`).join('')}</div>
    <svg class="cv-svg" viewBox="0 0 360 206" role="img" aria-label="Curva ilustrativa de concentração no sangue ao longo do tempo"><defs><linearGradient id="cvg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22E4FF" stop-opacity=".35"/><stop offset="1" stop-color="#22E4FF" stop-opacity="0"/></linearGradient></defs>
      <line class="cv-ax" x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}"/><line class="cv-ax" x1="${X0}" y1="${Y1 - 6}" x2="${X0}" y2="${Y0}"/>
      <text class="cv-t" x="${X1}" y="${Y0 + 18}" text-anchor="end">tempo →</text><text class="cv-t" x="${X0 - 6}" y="${Y1}" text-anchor="end">conc.</text>
      <path class="cv-ref" d="${ev}"/><path class="cv-area" id="ca" d=""/><path class="cv-cur" id="cc" d=""/>
      <text class="cv-t" x="${X1}" y="${Y1 + 6}" text-anchor="end" fill="#aaa">tracejada = EV (referência)</text></svg>
    <div class="cv-info" id="ci" role="region" aria-live="polite"></div>`;
  const sel = i => {
    const v = g.vias[i], pts = curvePts(v), d = toPath(pts);
    $('#cc', body).setAttribute('d', d); $('#ca', body).setAttribute('d', d + ` L${X1} ${Y0} L${X0} ${Y0} Z`);
    $$('.cv-chip', body).forEach((b, k) => { b.classList.toggle('on', k === i); if (k === i) b.classList.add('seen'); });
    $('#ci', body).innerHTML = `<div class="cv-kpis"><span class="kpi">Via: <b>${esc(v.nome)}</b></span><span class="kpi">Início: <b>${esc(v.inicio)}</b></span><span class="kpi">Membrana: <b>${esc(v.membrana)}</b></span></div>
      <div class="pc"><div class="p"><h5>Vantagens</h5><ul>${v.pros.map(x => `<li>${fmt(x)}</li>`).join('')}</ul></div><div class="c"><h5>Desvantagens</h5><ul>${v.contras.map(x => `<li>${fmt(x)}</li>`).join('')}</ul></div></div>
      <div class="callout atencao">${ic('i-alert')}<div><b>Olhar de enfermagem</b><p>${fmt(v.enf)}</p></div></div>`;
    visit(gid, v.id, g.pts, $$('.cv-chip', body)[i]);
    if (foundCount(gid) >= g.vias.length) gameDone(gid);
  };
  $$('.cv-chip', body).forEach(b => b.onclick = () => sel(+b.dataset.i));
  sel(0);
}

/* ----- receptor ----- */
function rAgonista(body, gid, g) {
  body.innerHTML = `<div class="rc-stage" id="rs" data-s="livre"><svg class="rc-svg" viewBox="0 0 400 250" role="img" aria-label="Esquema de receptor na membrana da célula">
      <text class="rc-lab" x="12" y="20">Meio externo</text><text class="rc-lab" x="12" y="236">Dentro da célula</text>
      <rect class="rc-mem" x="0" y="150" width="400" height="34"/>
      <path class="rc-rec" d="M160 150 L160 120 Q160 108 172 108 L190 108 L190 128 L210 128 L210 108 L228 108 Q240 108 240 120 L240 150 Z"/>
      <g class="rc-eff"><path d="M205 192 l-14 24 h12 l-6 22 l22 -30 h-13 l8 -16z" fill="#5BFFAA" stroke="#d8ffe9" stroke-width="1.5"/><text x="238" y="222" fill="#5BFFAA" font-family="JetBrains Mono,monospace" font-size="12">RESPOSTA</text></g>
      <g class="rc-ago"><rect x="190" y="108" width="20" height="20" rx="4"/><text x="190" y="100">agonista</text></g>
      <g class="rc-ant"><rect x="190" y="108" width="20" height="20" rx="4"/><text x="190" y="100">antagonista</text></g>
    </svg></div>
    <div class="rc-btns" role="group" aria-label="Cenários">${g.estados.map((e, i) => `<button class="btn btn-sm" data-i="${i}">${esc(e.nome)}</button>`).join('')}</div>
    <div class="fb info" id="rm" role="status"><b>${esc(g.estados[0].nome)}</b>${esc(g.estados[0].msg)}</div>`;
  const stage = $('#rs', body);
  const sel = i => {
    const e = g.estados[i]; stage.dataset.s = e.id;
    $$('.rc-btns .btn', body).forEach((b, k) => { b.classList.toggle('btn-primary', k === i); });
    $('#rm', body).innerHTML = `<b>${esc(e.nome)}</b>${esc(e.msg)}`;
    visit(gid, e.id, g.pts, $$('.rc-btns .btn', body)[i]);
    if (foundCount(gid) >= g.estados.length) gameDone(gid);
  };
  $$('.rc-btns .btn', body).forEach(b => b.onclick = () => sel(+b.dataset.i));
  sel(0);
}

/* ----- inspetor de prescrição ----- */
function rInspect(body, gid, g) {
  let ci = 0, hit = 0, tot = 0;
  const draw = () => {
    const c = g.casos[ci], ans = {}; let checked = false;
    body.innerHTML = `<div class="g-prog"><span>Caso ${ci + 1}/${g.casos.length}</span><div class="bar"><span style="width:${ci / g.casos.length * 100}%"></span></div></div>
      <div class="rx"><div class="rx-head"><span>Prescrição médica</span><span>${esc(c.titulo)}</span></div>
      ${c.campos.map((f, i) => `<div class="rx-row" data-i="${i}"><span class="k">${esc(f.k)}</span><span class="v ${/^—/.test(f.v) ? 'blank' : ''}">${esc(f.v)}</span><span class="tg"><button data-a="ok">OK</button><button data-a="bad">Problema</button></span></div>`).join('')}
      <div class="rx-foot"><div class="row"><button class="btn btn-primary" id="rxc" disabled>Conferir</button></div><div id="rxr" role="status"></div></div></div>`;
    const rows = $$('.rx-row', body), chk = $('#rxc', body);
    rows.forEach((row, i) => $$('.tg button', row).forEach(b => b.onclick = () => {
      if (checked) return; ans[i] = b.dataset.a;
      $$('.tg button', row).forEach(x => x.classList.remove('on', 'good', 'warn'));
      b.classList.add('on', b.dataset.a === 'ok' ? 'good' : 'warn');
      chk.disabled = Object.keys(ans).length < c.campos.length;
    }));
    chk.onclick = () => {
      if (!checked) {
        checked = true; let h = 0;
        rows.forEach((row, i) => {
          const f = c.campos[i], ok = (ans[i] === 'ok') === f.ok; tot++;
          row.classList.add(ok ? 'res-ok' : 'res-bad');
          if (ok) { h++; hit++; award(`${gid}:${ci}:${i}`, g.pts, row); }
          else if (f.why || !f.ok) row.insertAdjacentHTML('beforeend', `<span class="why">${f.ok ? 'Este campo estava correto.' : esc(f.why || 'Há um problema neste campo.')}</span>`);
          $$('.tg button', row).forEach(x => x.disabled = true);
        });
        $('#rxr', body).innerHTML = `<div class="fb ${h === c.campos.length ? 'good' : 'info'}" style="margin-top:12px"><b>${h} de ${c.campos.length} campos certos</b>${esc(c.fim)}</div>`;
        const last = ci === g.casos.length - 1;
        chk.textContent = last ? 'Finalizar' : 'Próximo caso'; chk.disabled = false;
      } else if (ci < g.casos.length - 1) { ci++; draw(); }
      else {
        gameDone(gid);
        body.innerHTML = `<div class="g-end"><div class="score">${hit}<small> / ${tot} campos corretos</small></div><p>${endMsg(hit / tot)}</p><p class="mono small muted">XP neste jogo: ${earned(gid)} de ${gameMax(g)}</p>${replayBtn('rp')}</div>`;
        $('#rp', body).onclick = () => { ci = 0; hit = 0; tot = 0; draw(); };
      }
    };
  };
  draw();
}

/* ----- simulador dos 5 certos ----- */
function rCheckpoint(body, gid, g) {
  let ci = 0, hit = 0, tot = 0, decHit = 0;
  const draw = () => {
    const c = g.casos[ci], ans = {}; let done = false;
    body.innerHTML = `<div class="g-prog"><span>Caso ${ci + 1}/${g.casos.length}</span><div class="bar"><span style="width:${ci / g.casos.length * 100}%"></span></div></div>
      <div class="rx"><div class="rx-head"><span>${esc(c.titulo)}</span><span>Tolerância de horário: 30 min</span></div>
      <div class="cp-story">${esc(c.historia)}</div>
      <div class="cp-grid"><div class="cp-head"><span>Certo</span><span>Prescrição</span><span>Em mãos</span><span>Confere?</span></div>
      ${g.certos.map((r, i) => `<div class="cp-line" data-i="${i}"><span class="nm">${esc(r.nome)}</span><span class="a">${esc(c.presc[r.k])}</span><span class="b">${esc(c.mao[r.k])}</span><span class="tg"><button data-a="ok">Confere</button><button data-a="bad">Diverge</button></span></div>`).join('')}</div>
      <div class="cp-dec"><button class="btn btn-go" data-d="go" disabled>${ic('i-check')} Administrar</button><button class="btn btn-stop" data-d="stop" disabled>${ic('i-alert')} Parar e comunicar</button></div>
      <div id="cpr" role="status" style="padding:0 14px 14px"></div></div>`;
    const lines = $$('.cp-line', body), decs = $$('.cp-dec .btn', body);
    lines.forEach((ln, i) => $$('.tg button', ln).forEach(b => b.onclick = () => {
      if (done) return; ans[i] = b.dataset.a;
      $$('.tg button', ln).forEach(x => x.classList.remove('on', 'good', 'warn'));
      b.classList.add('on', b.dataset.a === 'ok' ? 'good' : 'warn');
      if (Object.keys(ans).length === g.certos.length) decs.forEach(d => d.disabled = false);
    }));
    decs.forEach(d => d.onclick = () => {
      if (done) return; done = true;
      const hasErr = Object.keys(c.erros).length > 0; let rh = 0;
      lines.forEach((ln, i) => {
        const k = g.certos[i].k, bad = k in c.erros, ok = (ans[i] === 'bad') === bad; tot++;
        ln.classList.add(ok ? 'res-ok' : 'res-bad');
        if (ok) { rh++; hit++; award(`${gid}:${ci}:${k}`, g.ptsLinha, ln); }
        if (bad) ln.insertAdjacentHTML('beforeend', `<span class="why">${esc(c.erros[k])}</span>`);
        else if (!ok) ln.insertAdjacentHTML('beforeend', `<span class="why">Aqui estava tudo certo.</span>`);
        $$('.tg button', ln).forEach(x => x.disabled = true);
      });
      const decOk = (d.dataset.d === 'stop') === hasErr; if (decOk) { decHit++; award(`${gid}:${ci}:dec`, g.ptsDecisao, d); }
      decs.forEach(x => x.disabled = true);
      const last = ci === g.casos.length - 1;
      $('#cpr', body).innerHTML = `<div class="fb ${decOk && rh === g.certos.length ? 'good' : decOk ? 'info' : 'miss'}"><b>${decOk ? 'Decisão correta' : 'Decisão incorreta'} · ${rh}/${g.certos.length} certos conferidos</b>${esc(c.fim)}</div><div class="row" style="margin-top:12px"><button class="btn btn-primary" id="cpn">${last ? 'Ver resultado' : 'Próximo caso'} ${ic('i-play')}</button></div>`;
      $('#cpn', body).onclick = () => {
        if (!last) { ci++; draw(); return; }
        gameDone(gid);
        body.innerHTML = `<div class="g-end"><div class="score">${decHit}<small> / ${g.casos.length} decisões certas</small></div><p>${hit} de ${tot} certos conferidos. ${endMsg(decHit / g.casos.length)}</p><p class="mono small muted">XP neste jogo: ${earned(gid)} de ${gameMax(g)}</p>${replayBtn('rp')}</div>`;
        $('#rp', body).onclick = () => { ci = 0; hit = 0; tot = 0; decHit = 0; draw(); };
      };
      $('#cpn', body).focus({preventScroll: true});
    });
  };
  draw();
}

/* ----- arsenal ----- */
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function rCodex(body, gid, g) {
  let sys = null, q = '', open = null;
  body.innerHTML = `<div class="cx-meter"><span id="cxm"></span><div class="bar"><span id="cxb" style="width:0"></span></div></div>
    <div class="cx-tools"><input class="cx-search" id="cxq" type="search" placeholder="Buscar classe ou exemplo (ex.: digoxina)" aria-label="Buscar no arsenal">
    <div class="cx-sys" role="group" aria-label="Sistemas"><button class="cx-s on" data-s="">Todos</button>${g.sistemas.map(s => `<button class="cx-s" data-s="${s.id}">${esc(s.nome)}</button>`).join('')}</div></div>
    <div class="cx-grid" id="cxg"></div>`;
  const sysName = id => (g.sistemas.find(s => s.id === id) || {}).nome || '';
  const meter = () => { const n = foundCount(gid); $('#cxm', body).textContent = `Cartões abertos: ${Math.min(n, g.meta)}/${g.meta}` + (n >= g.meta ? ' · módulo concluído' : ''); $('#cxb', body).style.width = Math.min(100, n / g.meta * 100) + '%'; };
  const grid = () => {
    const list = g.cartoes.filter(c => (!sys || c.s === sys) && (!q || norm(c.nome + ' ' + c.ex.join(' ') + ' ' + c.fn).includes(q)));
    $('#cxg', body).innerHTML = list.length ? list.map(c => `<button class="cx-c${open === c.id ? ' open' : ''}${S.found[gid] && S.found[gid][c.id] ? ' seen' : ''}" data-id="${c.id}" aria-expanded="${open === c.id}">
      <span class="top"><b>${esc(c.nome)}</b><span class="sysn">${esc(sysName(c.s))}</span></span><span class="fn">${esc(c.fn)}</span>
      <span class="cx-det"><span class="cx-ex">${c.ex.map(e => `<span>${esc(e)}</span>`).join('')}</span>
      ${c.cuidado ? `<span class="cx-care"><b>Cuidado de enfermagem</b>${esc(c.cuidado)}</span>` : ''}${c.alerta ? `<span class="cx-al"><b>Atenção</b>${esc(c.alerta)}</span>` : ''}</span></button>`).join('') : '<div class="cx-empty">Nada encontrado. Tente outro termo.</div>';
    $$('.cx-c', body).forEach(b => b.onclick = () => {
      const id = b.dataset.id; open = open === id ? null : id;
      if (open && !(S.found[gid] && S.found[gid][id])) {
        const n = foundCount(gid);
        S.found[gid] = S.found[gid] || {}; S.found[gid][id] = 1; save();
        if (n < g.meta) award(gid + ':' + id, g.ptsCartao, b);
        if (n + 1 >= g.meta) gameDone(gid);
      }
      grid(); meter();
      if (open) { const el = $(`.cx-c[data-id="${open}"]`, body); if (el && !reduce) el.scrollIntoView({block: 'nearest', behavior: 'smooth'}); }
    });
  };
  $('#cxq', body).addEventListener('input', e => { q = norm(e.target.value.trim()); open = null; grid(); });
  $$('.cx-s', body).forEach(b => b.onclick = () => { sys = b.dataset.s || null; open = null; $$('.cx-s', body).forEach(x => x.classList.toggle('on', x === b)); grid(); });
  grid(); meter(); if (foundCount(gid) >= g.meta) gameDone(gid);
}

/* ----- insulinas ----- */
function rInsulina(body, gid, g) {
  const cols = ['#22E4FF', '#8D7DFF', '#FF4FB0'];
  body.innerHTML = `<div class="in-chart">${g.tipos.map((t, i) => `<button class="in-row" data-i="${i}" style="--c:${cols[i % 3]}"><span class="nm">${esc(t.nome)}<br>${esc(t.acao)}</span><span class="in-track"><span class="in-lat" style="left:0;width:0" data-w="${t.ini / g.max * 100}"></span><span class="in-act" style="left:${t.ini / g.max * 100}%;width:0" data-w="${(t.dur - t.ini) / g.max * 100}"></span></span></button>`).join('')}
    <div class="in-ax">${[0, 10, 20, 30, 40].map(h => `<span>${h} h</span>`).join('')}</div></div><div class="in-det" id="ind" role="region" aria-live="polite"></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', body).forEach(el => { el.style.transition = reduce ? 'none' : 'width .9s ease'; el.style.width = el.dataset.w + '%'; })));
  const sel = i => {
    const t = g.tipos[i];
    $$('.in-row', body).forEach((b, k) => b.classList.toggle('on', k === i));
    $('#ind', body).innerHTML = `<div class="fb info"><b>${esc(t.nome)} · ação ${esc(t.acao.toLowerCase())}</b>Começa a agir em <strong>${esc(t.iniTxt)}</strong> e dura <strong>${esc(t.durTxt)}</strong>, segundo o módulo. A faixa clara é a espera; a colorida, o efeito.</div>`;
    visit(gid, t.id, g.pts, $$('.in-row', body)[i]);
    if (foundCount(gid) >= g.tipos.length) gameDone(gid);
  };
  $$('.in-row', body).forEach(b => b.onclick = () => sel(+b.dataset.i));
}

const RENDER = {quiz:rQuiz, match:rMatch, order:rOrder, pick:rPick, explore:rExplore, janela:rJanela, adme:rAdme, curvas:rCurvas, agonista:rAgonista, inspect:rInspect, checkpoint:rCheckpoint, codex:rCodex, insulina:rInsulina};

/* ============ mapa, HUD e telas ============ */
function nodePos(i) { return [i % 2 === 0 ? 112 : 288, 78 + i * 88]; }
const MAP_H = 78 + (MS.length - 1) * 88 + 74;
function buildMap() {
  const nxt = nextMission();
  let segs = '', nodes = '';
  MS.forEach((m, i) => {
    const [x, y] = nodePos(i);
    if (i < MS.length - 1) {
      const [x2, y2] = nodePos(i + 1);
      segs += `<path class="seg${S.done[m.id] ? ' done' : ''}" d="M${x} ${y} C${x} ${y + 46} ${x2} ${y2 - 46} ${x2} ${y2}"/>`;
    }
    const st = S.done[m.id] ? 'done' : (nxt && nxt.id === m.id ? 'now' : '');
    nodes += `<button class="node ${i % 2 === 0 ? 'node-l' : 'node-r'} ${st}" data-go="${m.id}" style="left:${x / 4}%;top:${y / MAP_H * 100}%" aria-label="Missão ${m.n}: ${esc(m.titulo)}${st === 'done' ? ', concluída' : st === 'now' ? ', recomendada' : ''}">
      <span class="hexd">${ic(S.done[m.id] ? 'i-check' : m.icone)}</span>
      <span class="node-lab"><b>${esc(m.curto)}</b><span>${st === 'done' ? 'concluída' : m.id === 'final' ? 'chefão' : S.lesson[m.id] ? 'treino' : 'missão ' + pad(m.n)}</span></span></button>`;
  });
  return `<div class="map" style="aspect-ratio:400/${MAP_H}"><svg class="map-bg" viewBox="0 0 400 ${MAP_H}" preserveAspectRatio="none" aria-hidden="true">${segs}</svg>${nodes}</div>`;
}
function updateHUD(bump) {
  $('#v-xp').textContent = S.xp;
  $('#v-lvl').textContent = LEVELS[levelOf(S.xp)].nome;
  $('#v-selo').textContent = seloCount() + '/' + MS.length;
  $('#hud-bar').style.width = Math.min(100, S.xp / MAX * 100) + '%';
  if (bump) { const s = $('#st-xp'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
}
function renderHome() {
  const nxt = nextMission(), all = !nxt;
  const started = S.xp > 0 || seloCount() > 0;
  const lvl = levelOf(S.xp);
  return `<div class="home"><div class="home-text">
    <span class="hero-kicker"><i></i> Farmacologia · Técnico de Enfermagem</span>
    <h1 class="hero-title">FARMA<span>CORE</span></h1>
    <p class="lead">Uma trilha com ${MS.length - 1} missões e um desafio final para dominar a administração de medicamentos. Cada missão tem <strong>duas partes</strong>: uma <strong>aula</strong> que ensina do zero, sem pressupor nada, e um <strong>treino gamificado</strong> para fixar. Aprenda, simule, erre sem risco e suba de patente.</p>
    <div class="pulso-row">${pulsoSvg('h')}<div class="bubble"><span class="who">PULSO · assistente de bordo</span>${all ? 'Trilha completa! Você pode rever qualquer missão quando quiser.' : started ? `Bem-vindo de volta, ${LEVELS[lvl].nome}. Sua próxima missão é <strong>${esc(nxt.titulo)}</strong>.` : 'Eu sou o <strong>PULSO</strong>. Em cada missão você faz primeiro a aula, depois libera o treino. Pode começar pelo botão abaixo.'}</div></div>
    <div class="cta-row"><button class="btn btn-primary btn-lg" data-go="${all ? 'm1' : nxt.id}">${all ? 'Rever missões' : started ? (nxt.aula && !trainingOpen(nxt) ? 'Começar a aula ' + pad(nxt.n) : 'Continuar missão ' + pad(nxt.n)) : 'Começar a aula 01'} ${ic('i-play')}</button><span class="cta-note">${started ? S.xp + ' / ' + MAX + ' XP' : '~ ' + MS.reduce((t, m) => t + m.min + (m.aula ? m.aula.tempo : 0), 0) + ' min no total'}</span></div>
    <div class="chips"><span class="chip">${ic('i-book')} Aula do zero + treino</span><span class="chip">${ic('i-target')} Simuladores interativos</span><span class="chip">${ic('i-bolt')} XP e patentes</span><span class="chip">${ic('i-medal')} ${MS.length} selos</span><span class="chip">${ic('i-shield')} Progresso salvo neste aparelho</span></div>
    <section class="vitrine panel" aria-label="Sala de selos"><div class="eyebrow">Sala de selos</div><div class="vit-grid">${MS.map(m => `<div class="selo-box${S.done[m.id] ? ' on' : ''}"><span class="hex" style="width:54px;height:60px">${ic(m.icone)}</span><span>${esc(m.selo)}</span></div>`).join('')}</div></section>
  </div><div class="map-wrap">${buildMap()}<div class="map-legend"><span><i style="background:var(--amber)"></i>recomendada</span><span><i style="background:var(--lime)"></i>concluída</span><span><i style="background:var(--cyan)"></i>disponível</span></div></div></div>${disclaimer()}`;
}
const disclaimer = () => `<footer class="disclaimer view"><p class="credit">Idealizado, planejado e desenvolvido por <strong>Cybele França Brito</strong>.</p>
  <b>Material educativo de apoio.</b><span>Não substitui a prescrição, a bula, os protocolos da sua instituição nem a orientação do enfermeiro e do farmacêutico. Os casos, nomes e valores dos simuladores são fictícios e servem só para treino.</span>
  <details class="refs"><summary>Fonte e bibliografia</summary>
    <p><b>Fonte principal do conteúdo</b></p>
    <ul><li>CETEP. <em>Farmacologia: Técnico em Enfermagem, Módulo 1</em>. Material didático do curso técnico. Base das missões, das aulas, dos exemplos e das tabelas.</li></ul>
    <p><b>Normas e documentos citados ou usados como complemento</b></p>
    <ul>
      <li>CONSELHO FEDERAL DE ENFERMAGEM (COFEN). <em>Resolução COFEN nº 564/2017</em>: Código de Ética dos Profissionais de Enfermagem.</li>
      <li>BRASIL. <em>Lei nº 7.498, de 25 de junho de 1986</em>: dispõe sobre a regulamentação do exercício da enfermagem.</li>
      <li>BRASIL. <em>Lei nº 9.787, de 10 de fevereiro de 1999</em>: institui o medicamento genérico no País.</li>
      <li>ANVISA. <em>Resolução nº 391, de 9 de agosto de 1999</em>: regulamento técnico para medicamentos genéricos (citada no módulo).</li>
      <li>BRASIL. Ministério da Saúde; ANVISA; FIOCRUZ. <em>Protocolo de segurança na prescrição, uso e administração de medicamentos</em>, 2013 (origem dos “9 certos”).</li>
    </ul>
    <p class="small muted">Os complementos que vão além do módulo estão sinalizados no texto. Confira sempre a versão vigente das normas e o protocolo da sua instituição.</p>
  </details>
  <div class="foot-actions"><button class="btn btn-sm btn-ghost" id="reset">${ic('i-reload')} Zerar meu progresso</button></div></footer>`;

let curTab = 'aula';
const defaultTab = m => !m.aula ? 'treino' : (S.done[m.id] || trainingOpen(m) ? 'treino' : 'aula');
function renderMission(m, tab) {
  const gs = gamesOf(m), open = trainingOpen(m);
  const tabs = m.aula ? `<nav class="tabs" role="tablist" aria-label="Partes da missão"><button class="tab${tab === 'aula' ? ' on' : ''}" role="tab" aria-selected="${tab === 'aula'}" data-go="${m.id}/aula">${ic('i-book')}<span><small>Parte 1</small>Aula</span>${S.lesson[m.id] ? ic('i-check', 'tk') : ''}</button><button class="tab${tab === 'treino' ? ' on' : ''}" role="tab" aria-selected="${tab === 'treino'}" data-go="${m.id}/treino">${ic(open ? 'i-target' : 'i-lock')}<span><small>Parte 2</small>Treino gamificado</span>${S.done[m.id] ? ic('i-check', 'tk') : ''}</button></nav>` : '';
  return `<article class="mission"><div class="row" style="margin-bottom:14px"><button class="btn btn-sm btn-ghost" data-go="mapa">${ic('i-map')} Mapa de missões</button></div>
    <header class="m-head"><div class="eyebrow">${m.id === 'final' ? 'Chefão' : 'Missão ' + pad(m.n)} · ${LEVELS[levelOf(S.xp)].nome}</div>
      <h1 class="m-title" tabindex="-1">${esc(m.titulo)}</h1><p class="m-sub">${esc(m.sub)}</p>
      <div class="m-meta">${m.aula ? `<span class="meta-pill">${ic('i-book')} Aula ~${m.aula.tempo} min</span>` : ''}<span class="meta-pill">${ic('i-target')} ${gs.length} ${gs.length === 1 ? 'jogo' : 'jogos'} · ~${m.min} min</span><span class="meta-pill">${ic('i-bolt')} até ${missionMax(m)} XP</span><span class="meta-pill">${ic('i-medal')} Selo: ${esc(m.selo)}</span></div>
      <div class="pulso-row">${pulsoSvg(m.id)}<div class="bubble"><span class="who">PULSO</span>${esc(m.pulso)}</div></div>
      <div class="objetivo"><b>Objetivo da missão</b>${esc(m.objetivo)}</div></header>
    ${tabs}${tab === 'aula' ? renderLesson(m) : renderTreino(m)}</article>${disclaimer()}`;
}
function renderLesson(m) {
  const A = m.aula, n = A.secoes.length;
  return `<div class="blocks lesson"><section class="panel flat les-intro"><p>${fmt(A.intro)}</p><div class="toc" aria-label="Partes da aula">${A.secoes.map((s, i) => `<button class="chip toc-b" data-scroll="sec-${i}"><b>${i + 1}</b> ${esc(s.titulo)}</button>`).join('')}</div></section>
    ${A.secoes.map((s, i) => `<section class="les-sec" id="sec-${i}"><div class="les-eyebrow">Parte ${i + 1} de ${n}</div><h2 class="les-h">${esc(s.titulo)}</h2><div class="les-body">${s.blocos.map(renderBlock).join('')}</div></section>`).join('')}
    <section class="panel resumo"><div class="eyebrow">Para guardar</div><h2 class="les-h">Resumo da aula</h2><ul class="res-list">${A.resumo.map(r => `<li>${ic('i-check')}<span>${fmt(r)}</span></li>`).join('')}</ul></section>
    <section><h2 class="blk-title">Glossário da aula</h2><div class="glos">${A.glossario.map(g => `<div class="gl"><b>${esc(g.t)}</b><span>${esc(g.d)}</span></div>`).join('')}</div></section>
    <section class="panel m-end" id="les-end">${lessonEnd(m)}</section></div>`;
}
function lessonEnd(m) {
  if (S.lesson[m.id]) return `<h3>${ic('i-check')} Aula concluída</h3><p class="muted">Agora é hora de praticar o que você aprendeu.</p><div class="row"><button class="btn btn-primary" data-go="${m.id}/treino">Ir para o treino ${ic('i-play')}</button></div>`;
  return `<h3>Terminou a aula?</h3><p class="muted">Quando sentir que entendeu os conceitos, marque a aula como concluída para liberar o treino gamificado (+${LESSON_XP} XP). Você pode voltar à aula sempre que quiser.</p><div class="row"><button class="btn btn-primary" id="les-fin" data-mid="${m.id}">${ic('i-check')} Concluí a aula, liberar o treino</button></div>`;
}
function renderTreino(m) {
  if (!trainingOpen(m)) return `<section class="panel lock"><div class="lock-ic">${ic('i-lock')}</div><h2>Treino bloqueado</h2><p>O treino cobra o que a aula ensina. Faça a aula primeiro: assim as perguntas deixam de ser adivinhação e viram revisão.</p><div class="row"><button class="btn btn-primary" data-go="${m.id}/aula">${ic('i-book')} Ir para a aula</button><button class="btn btn-ghost" data-act="unlock" data-mid="${m.id}">Já conheço o assunto: liberar o treino</button></div></section>`;
  return `<div class="blocks">${m.aula ? `<aside class="callout nota">${ic('i-info')}<div><b>Treino gamificado</b><p>Aqui você pratica o que viu na aula e ganha XP. Ficou com dúvida? <button class="lnk" data-go="${m.id}/aula">Volte à aula</button> quando quiser.</p></div></aside>` : ''}${m.treino.map(renderBlock).join('')}<section class="panel m-end" id="m-end" aria-label="Fim da missão"></section></div>`;
}
function finishLesson(mid, btn) {
  if (!S.lesson[mid]) { S.lesson[mid] = true; save(); award('lesson:' + mid, LESSON_XP, btn); toast('Aula concluída! Treino liberado.', true); }
  go(mid + '/treino');
}
function updateMissionEnd(mid) {
  const box = $('#m-end'); const m = MS.find(x => x.id === mid); if (!box || !m || current !== mid) return;
  const gs = gamesOf(m), n = gs.filter(id => S.games[id]).length, all = n === gs.length, idx = MS.indexOf(m), nxt = MS[idx + 1];
  let html = '';
  if (S.done[mid]) {
    html = `<h3>${ic('i-check')} Missão concluída</h3><p class="muted">Selo conquistado: <strong>${esc(m.selo)}</strong></p><div class="row">${nxt ? `<button class="btn btn-primary" data-go="${nxt.id}">Próxima: ${esc(nxt.curto)} ${ic('i-play')}</button>` : ''}<button class="btn" data-go="mapa">${ic('i-map')} Mapa</button></div>`;
    if (mid === 'final') html += certHtml();
  } else {
    html = `<h3>Fechamento da missão</h3><div class="prog"><span class="mono small muted">Jogos concluídos: ${n}/${gs.length}</span><div class="bar"><span style="width:${n / gs.length * 100}%"></span></div></div><div class="row"><button class="btn btn-primary" id="fin" ${all ? '' : 'disabled'}>${ic('i-medal')} Concluir missão (+${BONUS} XP)</button></div>${all ? '' : '<p class="muted small">Termine todos os jogos da missão para liberar o selo.</p>'}`;
  }
  box.innerHTML = html;
  const fin = $('#fin', box); if (fin) fin.onclick = () => completeMission(mid);
  bindCert(box);
}
function certHtml() {
  return `<div class="cert" id="cert"><div class="eyebrow">Cartão do operador</div><h3>FARMACORE</h3><p class="muted">Concluiu a trilha de administração de medicamentos</p><div class="nm" id="cert-nm">${esc(S.name || '')}</div><input id="cert-in" placeholder="Digite seu nome" value="${esc(S.name || '')}" maxlength="60" aria-label="Seu nome"><div class="meta">${esc(LEVELS[levelOf(S.xp)].nome)} · ${S.xp} XP · ${new Date().toLocaleDateString('pt-BR')}</div><button class="btn no-print" id="cert-pr">${ic('i-print')} Imprimir cartão</button></div>`;
}
function bindCert(box) {
  const inp = $('#cert-in', box); if (!inp) return;
  inp.oninput = () => { S.name = inp.value.trim(); save(); $('#cert-nm', box).textContent = S.name; };
  $('#cert-pr', box).onclick = () => {
    const holder = $('#cert-print'); holder.innerHTML = $('#cert', box).outerHTML; holder.hidden = false;
    const after = () => { holder.hidden = true; holder.innerHTML = ''; window.removeEventListener('afterprint', after); };
    window.addEventListener('afterprint', after); window.print();
  };
}
function completeMission(mid) {
  const m = MS.find(x => x.id === mid); if (S.done[mid]) return;
  award('bonus:' + mid, BONUS, $('#fin')); S.done[mid] = true; save(); updateHUD(); burst(); updateMissionEnd(mid);
  seloModal(m);
}
function seloModal(m) {
  const md = $('#modal'), idx = MS.indexOf(m), nxt = MS[idx + 1], fim = !MS.some(x => !S.done[x.id]);
  md.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Selo conquistado"><div class="eyebrow">${fim ? 'Trilha completa' : 'Selo conquistado'}</div><div class="hex-big">${ic(m.icone)}</div><h3>${esc(m.selo)}</h3>
    <p class="muted">${fim ? 'Você concluiu toda a trilha. Patente atual: ' : 'Missão concluída. Patente atual: '}<strong>${esc(LEVELS[levelOf(S.xp)].nome)}</strong> · ${S.xp} XP.</p>
    <div class="row center">${nxt ? `<button class="btn btn-primary" data-go="${nxt.id}" data-close>Próxima missão</button>` : ''}<button class="btn" data-go="mapa" data-close>Ver o mapa</button><button class="btn btn-ghost" data-close>Fechar</button></div></div>`;
  md.hidden = false; const f = $('button', md); if (f) f.focus();
  md.onclick = e => { if (e.target === md) closeModal(); };
}
function closeModal() { const md = $('#modal'); md.hidden = true; md.innerHTML = ''; }

/* ============ navegação ============ */
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  if (MS.some(m => m.id === parts[0])) show(parts[0], parts[1]); else show('mapa');
}
function go(id) {
  const target = id === 'mapa' ? '#/' : '#/' + id;
  if (location.hash === target || (id === 'mapa' && !location.hash)) route(); else location.hash = target;
}
function show(id, tab) {
  current = id; document.body.dataset.view = id === 'mapa' ? 'mapa' : 'missao';
  const app = $('#app');
  if (id === 'mapa') app.innerHTML = renderHome();
  else {
    const m = MS.find(x => x.id === id);
    curTab = !m.aula ? 'treino' : (tab === 'aula' || tab === 'treino' ? tab : defaultTab(m));
    app.innerHTML = renderMission(m, curTab);
    if (curTab === 'treino' && trainingOpen(m)) { $$('.game', app).forEach(mountGame); updateMissionEnd(id); }
  }
  window.scrollTo({top: 0, behavior: 'auto'});
  const h = $('.m-title', app) || $('.hero-title', app); if (h) h.focus({preventScroll: true});
  updateHUD(); document.title = (id === 'mapa' ? 'FARMACORE — Administração de Medicamentos' : MS.find(x => x.id === id).titulo + ' · FARMACORE');
}
function bind() {
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) { e.preventDefault(); const cl = g.hasAttribute('data-close'); if (cl) closeModal(); go(g.dataset.go); return; }
    if (e.target.closest('[data-close]')) closeModal();
    const pn = e.target.closest('[data-act=pense]');
    if (pn) { const a = pn.parentElement.querySelector('.pn-a'); a.hidden = !a.hidden; pn.textContent = a.hidden ? 'Ver a resposta' : 'Esconder a resposta'; return; }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { const t = document.getElementById(sc.dataset.scroll); if (t) t.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); return; }
    const lf = e.target.closest('#les-fin'); if (lf) { finishLesson(lf.dataset.mid, lf); return; }
    const ul = e.target.closest('[data-act=unlock]'); if (ul) { S.unlocked[ul.dataset.mid] = true; save(); route(); return; }
    if (e.target.closest('#reset')) { if (confirm('Zerar todo o progresso (XP, selos e jogos) neste aparelho?')) { S = blank(); save(); route(); toast('Progresso zerado.'); } }
  });
  $('#brand').onclick = () => go('mapa'); $('#btn-map').onclick = () => go('mapa');
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
}

/* ============ fundo animado ============ */
function fx() {
  const c = $('#fx'); if (!c || reduce) return;
  const ctx = c.getContext('2d'); let w, h, pts = [], last = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => { w = innerWidth; h = innerHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const n = Math.min(46, Math.round(w * h / 32000)); pts = Array.from({length: n}, () => ({x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25})); };
  resize(); window.addEventListener('resize', resize);
  const loop = t => {
    requestAnimationFrame(loop);
    if (document.hidden || t - last < 33) return; last = t;
    ctx.clearRect(0, 0, w, h);
    pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1; });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = dx * dx + dy * dy;
        if (d < 17000) { ctx.strokeStyle = `rgba(34,228,255,${(1 - d / 17000) * .22})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(120,230,255,.55)'; ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 1.6, 0, 6.3); ctx.fill();
    }
  };
  requestAnimationFrame(loop);
}

/* ============ início ============ */
load(); bind(); fx(); route();
})();
