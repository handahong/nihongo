(() => {
"use strict";
const $ = s => document.querySelector(s);
const main = $("#main");
const ICO = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  shadow: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  browse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/></svg>',
  repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
};
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const store = {
  get(k, d){ try { const v = localStorage.getItem("hd:"+k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem("hd:"+k, JSON.stringify(v)); } catch {} }
};
const S = {
  newPerDay: store.get("newPerDay", 10), speed: store.get("speed", 0.9), showKana: store.get("showKana", true),
  repeatTimes: store.get("repeatTimes", 2), activeDecks: store.get("activeDecks", null), voice: store.get("voice", ""),
  ink: store.get("ink", "ink"), penWidth: store.get("penWidth", 4), fingerDraw: store.get("fingerDraw", false), guideNew: store.get("guideNew", true),
};
let prog = store.get("prog", {});
let days = store.get("days", {});
let DATA = null, CARDS = [], BYID = {};
let tab = "home";

// ---------- 데이터 ----------
const kanaLine = c => (c.kana.replace(/\s/g,"") === c.jp.replace(/\s/g,"") ? "" : c.kana);
function hashId(s){ let h = 5381; for (const c of s) h = ((h << 5) + h + c.codePointAt(0)) | 0; return (h >>> 0).toString(36); }
async function load(){
  const r = await fetch("decks.json?v=" + (window.APP_V || "1"), { cache: "no-cache" });
  DATA = await r.json();
  CARDS = []; BYID = {};
  for (const d of DATA.decks) for (const sc of d.scenes) for (const it of sc.items) {
    const c = { id: d.id + "-" + hashId(it[0]), deck: d.id, deckName: d.name, kind: d.kind, scene: sc.name, jp: it[0], kana: it[1], ko: it[2], note: it[3] || "" };
    CARDS.push(c); BYID[c.id] = c;
  }
  if (!S.activeDecks) S.activeDecks = DATA.decks.map(d => d.id);
  S.activeDecks = S.activeDecks.filter(id => DATA.decks.some(d => d.id === id));
  if (!S.activeDecks.length) S.activeDecks = DATA.decks.map(d => d.id);
}

// ---------- 복습 간격 ----------
const STEPS = [0, 10*60e3, 1*864e5, 3*864e5, 7*864e5, 14*864e5, 30*864e5, 60*864e5];
const active = c => S.activeDecks.includes(c.deck);
function dueCards(){ const now = Date.now(); return CARDS.filter(c => active(c) && prog[c.id] && prog[c.id].due <= now).sort((a,b)=>prog[a.id].due-prog[b.id].due); }
function newCards(limit){ return CARDS.filter(c => active(c) && !prog[c.id]).slice(0, Math.max(0, limit)); }
function todayStat(){ return days[todayKey()] || (days[todayKey()] = { new: 0, review: 0 }); }
function rate(card, grade){ // 0 모름 1 애매 2 알아
  const p = prog[card.id] || { step: 0, due: 0, seen: 0, lapses: 0 };
  const first = p.seen === 0;
  p.seen++;
  if (grade === 0) { p.step = 0; p.lapses++; p.due = Date.now() + 5*60e3; }
  else if (grade === 1) { p.due = Date.now() + (p.step === 0 ? 10*60e3 : STEPS[p.step] * 0.6); }
  else { p.step = Math.min(STEPS.length - 1, p.step + 1); p.due = Date.now() + STEPS[p.step]; }
  prog[card.id] = p; store.set("prog", prog);
  const t = todayStat(); if (first) t.new++; else t.review++; store.set("days", days);
}
function streak(){
  let n = 0; const d = new Date();
  for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; const s = days[k]; if (s && (s.new + s.review) > 0) { n++; d.setDate(d.getDate()-1); } else if (n === 0 && k === todayKey()) { d.setDate(d.getDate()-1); } else break; }
  return n;
}

// ---------- 소리 ----------
const TTS = window.speechSynthesis;
let voices = [];
function refreshVoices(){ voices = TTS ? TTS.getVoices().filter(v => /^ja/i.test(v.lang)) : []; }
if (TTS) { refreshVoices(); TTS.onvoiceschanged = refreshVoices; }
function pickVoice(){
  refreshVoices();
  if (S.voice) { const v = voices.find(v => v.name === S.voice); if (v) return v; }
  return voices.find(v => /Siri/i.test(v.name)) || voices.find(v => /Premium|Enhanced|拡張/i.test(v.name)) || voices.find(v => /Kyoko|O-ren|Otoya|Hattori/i.test(v.name)) || voices[0] || null;
}
let speakToken = 0;
function speak(text, rate = S.speed){
  return new Promise(res => {
    if (!TTS) return res();
    const my = ++speakToken;
    TTS.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[（(].*?[)）]/g, ""));
    u.lang = "ja-JP"; const v = pickVoice(); if (v) u.voice = v; u.rate = rate; u.pitch = 1;
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(() => { if (my === speakToken) fin(); }, 1500 + text.length * 350 / rate);
    TTS.speak(u);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function estimateMs(text, rate){ return Math.min(9000, 600 + text.replace(/\s/g,"").length * 260 / rate); }
let loopToken = 0;
async function shadow(card, times = S.repeatTimes, onPhase){ // 기기가 말함 → 내 차례(쉼) → 다시 들려줌
  const my = ++loopToken;
  for (let i = 0; i < times; i++) {
    onPhase && onPhase(i === 0 ? "듣기" : `다시 듣기 ${i+1}/${times}`);
    await speak(card.jp); if (my !== loopToken) return false;
    onPhase && onPhase("따라 말하기 ▶");
    await sleep(estimateMs(card.jp, S.speed) + 500); if (my !== loopToken) return false;
  }
  onPhase && onPhase(""); return true;
}
function stopAll(){ loopToken++; speakToken++; TTS && TTS.cancel(); }

// ---------- 쓰기 공간 (애플펜슬) ----------
// 펜슬 입력만 받고 손바닥·손가락은 무시(설정에서 손가락 허용 가능). 획은 CSS 픽셀 좌표로 저장해 두고 크기가 바뀌면 다시 그림.
const INKS = [["ink","검정"],["blue","파랑"],["red","빨강"]];
function makePad({ guide = "", kana = "", showGuide = true, hint = "" } = {}){
  const root = el(`<div class="pad">
    <div class="tools"><button data-act="undo">↶ 되돌리기</button><button data-act="clear">지우기</button><span class="hint">${esc(hint)}</span><span class="sp"></span>
      <button data-act="guide" aria-pressed="${showGuide}">안내선</button>
      ${INKS.map(([k,l]) => `<button class="dot" data-ink="${k}" aria-pressed="${S.ink === k}" style="--c:var(--${k})" title="${l}">${l}</button>`).join("")}</div>
    <div class="sheet"><div class="guide jp" ${showGuide ? "" : "hidden"}>${esc(guide)}${kana ? `<small>${esc(kana)}</small>` : ""}</div><canvas></canvas></div></div>`);
  const sheet = root.querySelector(".sheet"), cv = root.querySelector("canvas"), g = root.querySelector(".guide");
  const ctx = cv.getContext("2d");
  let strokes = [], cur = null, W = 0, H = 0, dpr = 1;
  const color = k => getComputedStyle(document.documentElement).getPropertyValue(`--${k}`).trim() || "#000";
  function size(){ const r = sheet.getBoundingClientRect(); if (!r.width || !r.height) return; W = r.width; H = r.height; dpr = Math.min(3, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); redraw(); }
  function seg(st, a, b){ ctx.strokeStyle = color(st.ink); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = S.penWidth * (0.55 + Math.min(1, b.p) * 0.9); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  function dot(st, a){ ctx.fillStyle = color(st.ink); ctx.beginPath(); ctx.arc(a.x, a.y, S.penWidth * 0.5, 0, Math.PI * 2); ctx.fill(); }
  function redraw(){ ctx.clearRect(0, 0, W, H); for (const st of strokes) { if (st.pts.length === 1) dot(st, st.pts[0]); for (let i = 1; i < st.pts.length; i++) seg(st, st.pts[i-1], st.pts[i]); } }
  const t0 = Date.now();
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5, t: Date.now() - t0 }; };
  const allowed = e => e.pointerType === "pen" || e.pointerType === "mouse" || (e.pointerType === "touch" && S.fingerDraw);
  cv.addEventListener("pointerdown", e => { if (!allowed(e) || cur) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { id: e.pointerId, ink: S.ink, pts: [pt(e)] }; dot(cur, cur.pts[0]); });
  cv.addEventListener("pointermove", e => { if (!cur || e.pointerId !== cur.id) return; e.preventDefault(); const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const ev of evs) { const q = pt(ev); seg(cur, cur.pts[cur.pts.length-1], q); cur.pts.push(q); } });
  const up = e => { if (!cur || e.pointerId !== cur.id) return; strokes.push(cur); cur = null; };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  root.querySelector('[data-act="undo"]').onclick = () => { strokes.pop(); redraw(); };
  root.querySelector('[data-act="clear"]').onclick = () => { strokes = []; redraw(); };
  root.querySelector('[data-act="guide"]').onclick = e => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); g.hidden = !on; };
  root.querySelectorAll(".dot").forEach(b => b.onclick = () => { S.ink = b.dataset.ink; store.set("ink", S.ink); root.querySelectorAll(".dot").forEach(x => x.setAttribute("aria-pressed", x.dataset.ink === S.ink)); });
  const ro = new ResizeObserver(size); ro.observe(sheet);
  return {
    el: root,
    setGuide(j, k){ g.innerHTML = esc(j) + (k ? `<small>${esc(k)}</small>` : ""); },
    showGuide(on){ g.hidden = !on; root.querySelector('[data-act="guide"]').setAttribute("aria-pressed", on); },
    clear(){ strokes = []; redraw(); },
    isEmpty(){ return strokes.length === 0; },
    // 구글 손글씨 인식에 보낼 형태: 획마다 [x들, y들, 시각들]
    ink(){ return { ink: strokes.map(st => [st.pts.map(q => Math.round(q.x)), st.pts.map(q => Math.round(q.y)), st.pts.map(q => q.t)]), w: Math.round(W), h: Math.round(H) }; },
  };
}

// ---------- 손글씨 자동 채점 ----------
// 구글 입력 도구의 손글씨 인식(일본어)에 획 좌표를 보내 글자로 바꾼 뒤 정답과 비교한다. 인터넷이 있어야 함.
async function recognizeInk({ ink, w, h }){
  const body = { options: "enable_pre_space", requests: [{ writing_guide: { writing_area_width: w, writing_area_height: h }, ink, language: "ja" }] };
  const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch("https://inputtools.google.com/request?itc=ja-t-i0-handwrit&app=translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
    const j = await r.json();
    if (j[0] !== "SUCCESS") throw new Error(j[0] || "인식 실패");
    return j[1][0][1] || [];
  } finally { clearTimeout(tm); }
}
const normJ = s => String(s).replace(/[\s　。、．，！？!?「」『』（）()・…〜～ー]/g, "").replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
// 두 문자열의 글자 단위 정렬(편집 거리). 인식 결과 글자마다 맞음/틀림 표시를 만들기 위해.
function align(a, b){
  const n = a.length, m = b.length; const D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i; for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i-1][j] + 1, D[i][j-1] + 1, D[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  const out = []; let i = n, j = m; // out: 정답 기준으로 각 글자 상태
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)) { out.unshift({ ch: a[i-1], ok: a[i-1] === b[j-1], got: b[j-1] }); i--; j--; }
    else if (i > 0 && D[i][j] === D[i-1][j] + 1) { out.unshift({ ch: a[i-1], ok: false, got: "" }); i--; }
    else { out.unshift({ ch: "", ok: false, got: b[j-1] }); j--; }
  }
  return { dist: D[n][m], out };
}
// 정답(한자 표기 또는 가나 읽기 둘 다 인정) 대비 가장 가까운 후보를 골라 점수를 낸다.
function gradeInk(cands, card){
  const targets = [normJ(card.jp)]; const k = normJ(card.kana); if (k && k !== targets[0]) targets.push(k);
  let best = null;
  for (const c of cands.slice(0, 10)) { const nc = normJ(c); for (const t of targets) { const { dist, out } = align(t, nc); const score = t.length ? 1 - dist / Math.max(t.length, nc.length) : 0; if (!best || score > best.score) best = { score, dist, out, got: c, target: t }; } }
  return best;
}
async function gradePad(pad, card, box){
  if (pad.isEmpty()) { box.innerHTML = `<span class="muted">먼저 펜슬로 써 주세요.</span>`; return null; }
  box.innerHTML = `<span class="muted">글자를 읽는 중…</span>`;
  try {
    const cands = await recognizeInk(pad.ink());
    if (!cands.length) { box.innerHTML = `<span class="muted">글자를 읽지 못했어요. 조금 더 크게, 한 줄로 써 보세요.</span>`; return null; }
    const g = gradeInk(cands, card);
    const chars = g.out.map(o => o.ch ? `<span class="${o.ok ? "ok" : "miss"}">${esc(o.ch)}</span>` : `<span class="extra">${esc(o.got)}</span>`).join("");
    const perfect = g.dist === 0;
    box.innerHTML = `<div class="gr ${perfect ? "pass" : g.score >= 0.7 ? "near" : "fail"}"><div class="v">${perfect ? "맞았어요" : g.score >= 0.7 ? `거의 맞았어요 · ${g.dist}글자 다름` : "다시 써 볼까요"}</div><div class="chars jp">${chars}</div><div class="muted">읽힌 글자: <span class="jp">${esc(g.got)}</span>${cands.filter(x => x !== g.got).length ? ` · 다른 후보: ${cands.filter(x => x !== g.got).slice(0, 3).map(esc).join(", ")}` : ""}</div></div>`;
    return g;
  } catch (e) {
    box.innerHTML = `<span class="muted">${e.name === "AbortError" ? "인식 서버가 응답이 없어요." : "인터넷이 있어야 자동 채점이 돼요."} 정답을 보고 직접 고르세요.</span>`;
    return null;
  }
}

// ---------- 공통 ----------
let toastTimer;
function toast(m){ const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200); }
function el(html){ const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
function setTab(t){ stopAll(); if (t !== "study") session = null; tab = t; render(); }
function speedSeg(onChange){
  const s = el(`<div class="seg">${[[0.75,"천천히"],[0.9,"조금 천천히"],[1,"보통"]].map(([r,l]) => `<button data-r="${r}" aria-pressed="${S.speed === r}">${l}</button>`).join("")}</div>`);
  s.querySelectorAll("button").forEach(b => b.onclick = () => { S.speed = +b.dataset.r; store.set("speed", S.speed); s.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", +x.dataset.r === S.speed)); onChange && onChange(); });
  return s;
}
function header(title, sub, right){
  const h = el(`<div class="hdr"><h2>${title}</h2>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`);
  if (right) { right.classList.add("right"); h.append(right); }
  return h;
}
function toggleDeck(id){
  const i = S.activeDecks.indexOf(id);
  if (i >= 0) { if (S.activeDecks.length === 1) return toast("덱은 하나 이상 켜 두세요"); S.activeDecks.splice(i, 1); } else S.activeDecks.push(id);
  store.set("activeDecks", S.activeDecks); session = null; render();
}
function deckCounts(d){ const all = CARDS.filter(c => c.deck === d.id); return { n: all.length, done: all.filter(c => prog[c.id]).length }; }

function renderSide(){
  const side = $("#side"); side.innerHTML = "";
  const todayN = dueCards().length + newCards(S.newPerDay - todayStat().new).length;
  const cur = (tab === "study" ? "home" : tab);
  const item = (id, color, ico, label, right) => { const b = el(`<button class="srow" aria-current="${cur === id}"><span class="ic" style="background:${color}">${ico}</span><span>${label}</span>${right}</button>`); b.onclick = () => setTab(id); return b; };
  side.append(el(`<h1>일본어</h1>`));
  side.append(item("home", "var(--blue)", ICO.today, "오늘", `<span class="n">${todayN || ""}</span>`));
  side.append(item("shadow", "var(--orange)", ICO.shadow, "따라 말하기", ""));
  side.append(item("write", "var(--green)", ICO.pen, "쓰기 연습", ""));
  side.append(item("browse", "var(--purple)", ICO.browse, "둘러보기", ""));
  side.append(el(`<div class="sec">덱 (눌러서 켜고 끄기)</div>`));
  for (const d of DATA.decks) {
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<button class="srow ${on ? "" : "dim"}"><span>${esc(d.name)}</span><span class="n">${done}/${n}</span><span class="ck">${on ? "✓" : ""}</span></button>`);
    b.onclick = () => toggleDeck(d.id); side.append(b);
  }
  side.append(el(`<div class="sec">기록</div>`));
  side.append(el(`<div class="srow"><span>연속</span><span class="n">${streak()}일</span></div>`));
  side.append(el(`<div class="spacer"></div>`));
  side.append(item("settings", "var(--gray)", ICO.settings, "설정", ""));
  const nav = $("#nav"); nav.innerHTML = "";
  for (const [id, label, ico] of [["home","오늘",ICO.today],["shadow","따라 말하기",ICO.shadow],["write","쓰기",ICO.pen],["browse","둘러보기",ICO.browse],["settings","설정",ICO.settings]]) {
    const b = el(`<button aria-selected="${cur === id}">${ico}${label}</button>`); b.onclick = () => setTab(id); nav.append(b);
  }
}
function render(){ main.innerHTML = ""; renderSide(); ({ home, shadow: shadowTab, write: writeTab, browse, settings, study }[tab])(); main.scrollTop = 0; }

// ---------- 오늘 ----------
function home(){
  const due = dueCards().length, fresh = newCards(S.newPerDay - todayStat().new).length;
  const t = todayStat(); const learned = Object.keys(prog).length;
  const m = new Date().getMonth() + 1; const plan = DATA.plan.find(p => parseInt(p.month) === m) || DATA.plan[0];
  const d = new Date(); const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
  main.append(header("오늘", dateStr));
  const c = el(`<div class="content">
    <div class="card">
      <div class="stats"><div><b>${due}</b><span>복습할 카드</span></div><div><b>${fresh}</b><span>새 카드</span></div><div><b>${t.new + t.review}</b><span>오늘 한 카드</span></div></div>
      <div class="row" style="margin-top:14px"><button class="btn fill" id="startBtn" style="font-size:20px;min-height:60px">${due + fresh > 0 ? "학습 시작" : "오늘 몫 끝 · 10장 더 하기"}</button></div>
      <div class="muted" style="margin-top:10px">외운 카드 ${learned} / 전체 ${CARDS.filter(active).length} · 연속 ${streak()}일</div>
    </div>
    <div class="card"><h3>${esc(plan.month)} 목표</h3><div>${esc(plan.goal)}</div></div>
    <div class="only-narrow"><h3 class="sec" style="margin-left:4px">덱 (눌러서 켜고 끄기)</h3><div class="list" id="deckList"></div></div>
  </div>`);
  main.append(c);
  $("#startBtn").onclick = () => { session = null; tab = "study"; render(); };
  const dl = $("#deckList");
  for (const d of DATA.decks) {
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<button class="li"><span class="t">${esc(d.name)}<small>${esc(d.desc)}</small></span><span class="v">${done}/${n}</span><span class="ck">${on ? "✓" : ""}</span></button>`);
    b.onclick = () => toggleDeck(d.id); dl.append(b);
  }
}

// ---------- 학습 ----------
let session = null;
function study(){
  if (!session) {
    const fresh = newCards(S.newPerDay - todayStat().new);
    let q = [...dueCards(), ...fresh];
    if (!q.length) q = newCards(10);
    if (!q.length) { toast("새 카드가 다 떨어졌어요. 덱을 더 켜 주세요."); tab = "home"; return home(); }
    session = { q, i: 0, total: q.length, done: 0 };
  }
  const s = session;
  if (s.i >= s.q.length) {
    main.append(header("오늘", "끝"));
    main.append(el(`<div class="content"><div class="card done"><div class="big">🎉</div><h2 style="font-size:22px;margin:8px 0">오늘 몫 끝</h2><p class="muted">${s.done}장 공부했어요. 연속 ${streak()}일.</p><div class="row" style="max-width:420px;margin:12px auto 0"><button class="btn fill" id="moreBtn">10장 더</button><button class="btn" id="homeBtn">오늘로</button></div></div></div>`));
    $("#moreBtn").onclick = () => { session = { q: newCards(10), i: 0, total: 10, done: 0 }; if (!session.q.length) { session = null; toast("새 카드가 다 떨어졌어요. 덱을 더 켜 주세요."); setTab("home"); return; } render(); };
    $("#homeBtn").onclick = () => setTab("home");
    return;
  }
  const c = s.q[s.i]; const isNew = !prog[c.id];
  // 새 카드: 글자와 안내선을 보여 주고 따라 쓰기. 복습: 듣고 받아쓰기(정답은 숨김).
  const trace = isNew && S.guideNew;
  main.append(header("오늘", `${s.i + 1} / ${s.total} · ${isNew ? "새 카드" : "복습"}`, speedSeg()));
  const wrap = el(`<div class="content fill">
    <div class="prog"><i style="width:${(s.i / s.total) * 100}%"></i></div>
    <div class="ans ${trace ? "" : "quiz"}" id="ans">${trace
      ? `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="ko">${esc(c.ko)}</div><div class="note">${esc(c.note)}</div>`
      : `<span class="q">듣고 아래에 써 보세요</span><span class="w">${esc(c.deckName)} › ${esc(c.scene)}</span>`}</div>
    <div class="row"><button class="btn fill" id="playBtn">${ICO.play} 듣기</button><button class="btn" id="shadowBtn">${ICO.repeat} 따라 말하기 ${S.repeatTimes}회</button><button class="btn" id="gradeBtn" style="color:var(--green)">✓ 채점</button><button class="btn" id="revealBtn" ${trace ? "hidden" : ""}>정답 보기</button></div>
    <div class="phase" id="phase"></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:300px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="rate" id="rate" ${trace ? "" : "hidden"}><button class="no" data-g="0">모름<small>5분 뒤 다시</small></button><button class="mid" data-g="1">애매<small>조금 뒤 다시</small></button><button class="ok" data-g="2">알아<small>${isNew ? "내일" : "더 나중에"}</small></button></div>
  </div>`);
  main.append(wrap);
  const pad = makePad({ guide: c.jp, kana: S.showKana ? kanaLine(c) : "", showGuide: trace, hint: trace ? "연한 글자를 따라 써 보세요" : "펜슬로 들은 문장을 써 보세요" });
  $("#padSlot").append(pad.el);
  const phase = t => { const p = $("#phase"); if (p) p.textContent = t; };
  $("#playBtn").onclick = () => { stopAll(); phase("듣기"); speak(c.jp).then(() => phase("")); };
  $("#shadowBtn").onclick = () => { stopAll(); shadow(c, S.repeatTimes, phase); };
  const reveal = () => {
    const a = $("#ans"); a.classList.remove("quiz");
    a.innerHTML = `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="ko">${esc(c.ko)}</div><div class="note">${esc(c.note)}</div>`;
    pad.showGuide(true); $("#rate").hidden = false; $("#revealBtn").hidden = true;
  };
  $("#revealBtn").onclick = reveal;
  $("#gradeBtn").onclick = async () => {
    const box = $("#grade"); box.hidden = false; box.scrollIntoView({ block: "nearest" });
    const g = await gradePad(pad, c, box);
    if (g) { reveal(); const hint = g.dist === 0 ? "알아" : g.score >= 0.7 ? "애매" : "모름"; const b = $("#rate"); if (b) b.querySelectorAll("button").forEach(x => x.style.outline = x.textContent.startsWith(hint) ? "2px solid var(--blue)" : ""); }
  };
  wrap.querySelectorAll("#rate button").forEach(b => b.onclick = () => { stopAll(); rate(c, +b.dataset.g); s.done++; if (+b.dataset.g === 0) { s.q.push(c); s.total++; } s.i++; render(); });
  if (isNew) setTimeout(() => shadow(c, S.repeatTimes, phase), 250); else setTimeout(() => speak(c.jp), 250);
}

// ---------- 쓰기 연습 ----------
let wr = { deck: null, scene: null, i: 0, guide: true };
function writeTab(){
  const deck = DATA.decks.find(d => d.id === (wr.deck || S.activeDecks[0])) || DATA.decks[0]; wr.deck = deck.id;
  const scenes = deck.scenes; const scene = scenes.find(x => x.name === wr.scene) || scenes[0]; wr.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  wr.i = Math.min(wr.i, items.length - 1);
  const c = items[wr.i];
  main.append(header("쓰기 연습", `${esc(deck.name)} › ${esc(scene.name)} · ${wr.i + 1} / ${items.length}`, speedSeg()));
  const wrap = el(`<div class="content fill">
    <div class="card" style="padding:14px 18px"><div class="chips" id="deckPick">${DATA.decks.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === deck.id}">${esc(d.name)}</button>`).join("")}</div>
      <div class="chips" id="scenePick" style="margin-top:8px">${scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === scene.name}">${esc(x.name)}</button>`).join("")}</div></div>
    <div class="ans quiz" id="ans"><span class="q">${esc(c.ko)}</span><span class="w">${c.note ? esc(c.note) : ""}</span></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:300px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="row"><button class="btn" id="prevBtn">◀ 이전</button><button class="btn fill" id="playBtn">${ICO.play} 듣기</button><button class="btn" id="gradeBtn" style="color:var(--green)">✓ 채점</button><button class="btn" id="modeBtn">${wr.guide ? "받아쓰기로" : "따라 쓰기로"}</button><button class="btn" id="nextBtn">다음 ▶</button></div>
  </div>`);
  main.append(wrap);
  const pad = makePad({ guide: c.jp, kana: S.showKana ? kanaLine(c) : "", showGuide: wr.guide, hint: wr.guide ? "연한 글자를 따라 써 보세요" : "듣고 받아써 보세요" });
  $("#padSlot").append(pad.el);
  if (!wr.guide) { const a = $("#ans"); a.innerHTML = `<span class="q">듣고 써 보세요</span><span class="sp" style="flex:1"></span><button class="btn" id="showBtn" style="flex:none;min-height:40px;padding:8px 14px;font-size:15px">정답 보기</button>`; $("#showBtn").onclick = () => { a.innerHTML = `<span class="q jp">${esc(c.jp)}</span><span class="w">${esc(c.ko)}</span>`; pad.showGuide(true); }; }
  wrap.querySelectorAll("#deckPick button").forEach(b => b.onclick = () => { stopAll(); wr.deck = b.dataset.d; wr.scene = null; wr.i = 0; render(); });
  wrap.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { stopAll(); wr.scene = b.dataset.s; wr.i = 0; render(); });
  $("#prevBtn").onclick = () => { stopAll(); wr.i = (wr.i - 1 + items.length) % items.length; render(); };
  $("#nextBtn").onclick = () => { stopAll(); wr.i = (wr.i + 1) % items.length; render(); };
  $("#playBtn").onclick = () => { stopAll(); speak(c.jp); };
  $("#modeBtn").onclick = () => { stopAll(); wr.guide = !wr.guide; render(); };
  $("#gradeBtn").onclick = async () => { const box = $("#grade"); box.hidden = false; const g = await gradePad(pad, c, box); if (g && !wr.guide) { const a = $("#ans"); a.innerHTML = `<span class="q jp">${esc(c.jp)}</span><span class="w">${esc(c.ko)}</span>`; pad.showGuide(true); } };
  setTimeout(() => speak(c.jp), 250);
}

// ---------- 따라 말하기 ----------
let sh = { deck: null, scene: null, i: 0, running: false };
function shadowTab(){
  const deck = DATA.decks.find(d => d.id === (sh.deck || S.activeDecks[0])) || DATA.decks[0]; sh.deck = deck.id;
  const scenes = deck.scenes; const scene = scenes.find(x => x.name === sh.scene) || scenes[0]; sh.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  sh.i = Math.min(sh.i, items.length - 1);
  const c = items[sh.i];
  main.append(header("따라 말하기", `${esc(deck.name)} › ${esc(scene.name)}`, speedSeg()));
  const wrap = el(`<div class="content">
    <div class="card"><h3>덱</h3><div class="chips" id="deckPick">${DATA.decks.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === deck.id}">${esc(d.name)}</button>`).join("")}</div>
      <h3 style="margin-top:14px">장면</h3><div class="chips" id="scenePick">${scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === scene.name}">${esc(x.name)}</button>`).join("")}</div></div>
    <div class="qcard open" id="qcard"><div class="where">${sh.i + 1} / ${items.length}</div><div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="ko">${esc(c.ko)}</div></div>
    <div class="phase" id="phase">${sh.running ? "" : "시작을 누르면 한 문장씩: 듣기 → 따라 말하기 → 다시 듣기 → 다음 문장"}</div>
    <div class="row"><button class="btn" id="prevBtn">◀ 이전</button><button class="btn fill" id="runBtn" style="flex:2;font-size:20px">${sh.running ? "■ 멈춤" : "▶ 시작"}</button><button class="btn" id="nextBtn">다음 ▶</button></div>
  </div>`);
  main.append(wrap);
  wrap.querySelectorAll("#deckPick button").forEach(b => b.onclick = () => { stopAll(); sh = { deck: b.dataset.d, scene: null, i: 0, running: false }; render(); });
  wrap.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { stopAll(); sh.scene = b.dataset.s; sh.i = 0; sh.running = false; render(); });
  $("#prevBtn").onclick = () => { stopAll(); sh.i = (sh.i - 1 + items.length) % items.length; sh.running = false; render(); };
  $("#nextBtn").onclick = () => { stopAll(); sh.i = (sh.i + 1) % items.length; sh.running = false; render(); };
  $("#qcard").onclick = () => { stopAll(); sh.running = false; speak(c.jp); };
  $("#runBtn").onclick = async () => {
    if (sh.running) { stopAll(); sh.running = false; render(); return; }
    sh.running = true; render();
    const my = ++loopToken;
    for (let k = sh.i; k < items.length; k++) {
      sh.i = k; const card = items[k];
      const q = $("#qcard"); if (q) { q.querySelector(".where").textContent = `${k + 1} / ${items.length}`; q.querySelector(".main").textContent = card.jp; q.querySelector(".kana").textContent = kanaLine(card); q.querySelector(".ko").textContent = card.ko; }
      const ok = await shadow(card, S.repeatTimes, t => { const p = $("#phase"); if (p) p.textContent = t; });
      if (!ok || my !== loopToken) return;
      await sleep(600); if (my !== loopToken) return;
    }
    sh.running = false; sh.i = 0; toast("이 장면 끝. 처음부터 다시 할 수 있어요."); render();
  };
}

// ---------- 둘러보기 ----------
let br = { deck: null, scene: null };
function browse(){
  const deck = DATA.decks.find(d => d.id === br.deck) || DATA.decks[0]; br.deck = deck.id;
  const scenes = [{ name: "전체" }, ...deck.scenes]; const scene = scenes.find(x => x.name === br.scene) || scenes[0]; br.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && (scene.name === "전체" || c.scene === scene.name));
  main.append(header("둘러보기", `${items.length}장`));
  const wrap = el(`<div class="content"><div class="card"><div class="chips" id="deckPick">${DATA.decks.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === deck.id}">${esc(d.name)}</button>`).join("")}</div>
    <div class="chips" id="scenePick" style="margin-top:10px">${scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === scene.name}">${esc(x.name)}</button>`).join("")}</div></div>
    <div class="muted" style="margin:-4px 4px 0">재생 버튼은 듣기, 글자를 누르면 따라 말하기 한 번</div><div class="list" id="list"></div></div>`);
  main.append(wrap);
  wrap.querySelectorAll("#deckPick button").forEach(b => b.onclick = () => { br = { deck: b.dataset.d, scene: null }; render(); });
  wrap.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { br.scene = b.dataset.s; render(); });
  const list = $("#list");
  for (const c of items) {
    const p = prog[c.id];
    const it = el(`<div class="li"><button class="play">${ICO.play}</button><button class="t"><div class="j jp">${esc(c.jp)}</div><div class="k jp">${esc(kanaLine(c))}</div><div class="m">${esc(c.ko)}${c.note ? " · " + esc(c.note) : ""}</div></button><span class="badge ${p ? (p.step >= 4 ? "ok" : "") : "new"}">${p ? (p.step >= 4 ? "외움" : "학습 중") : "새"}</span></div>`);
    it.querySelector(".play").onclick = () => { stopAll(); speak(c.jp); };
    it.querySelector(".t").onclick = () => { stopAll(); shadow(c, 1); };
    list.append(it);
  }
}

// ---------- 설정 ----------
function settings(){
  refreshVoices();
  const total = Object.values(days).reduce((a, b) => a + b.new + b.review, 0);
  main.append(header("설정"));
  const wrap = el(`<div class="content">
    <div class="sec" style="margin:0 4px -6px">학습</div>
    <div class="list">
      <label class="li"><span class="t">하루 새 카드<small>복습은 별도로 다 나와요</small></span><select id="npd">${[5,10,15,20].map(n => `<option value="${n}" ${S.newPerDay === n ? "selected" : ""}>${n}장</option>`).join("")}</select></label>
      <label class="li"><span class="t">따라 말하기 반복<small>듣기 → 말하기를 몇 번 할지</small></span><select id="rep">${[1,2,3].map(n => `<option value="${n}" ${S.repeatTimes === n ? "selected" : ""}>${n}번</option>`).join("")}</select></label>
      <label class="li"><span class="t">읽는 법(가나) 표시<small>익숙해지면 꺼 보세요</small></span><select id="kana"><option value="1" ${S.showKana ? "selected" : ""}>보이기</option><option value="0" ${!S.showKana ? "selected" : ""}>숨기기</option></select></label>
      <label class="li"><span class="t">일본어 목소리<small>${voices.length ? voices.length + "개 사용 가능" : "목록을 못 불러왔어요. 소리를 한 번 재생한 뒤 다시 열어 보세요."}</small></span><select id="voice"><option value="">자동(가장 좋은 것)</option>${voices.map(v => `<option value="${esc(v.name)}" ${S.voice === v.name ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      <button class="li" id="testVoice" style="color:var(--blue)">목소리 들어보기</button>
    </div>
    <div class="sec" style="margin:8px 4px -6px">애플펜슬</div>
    <div class="list">
      <label class="li"><span class="t">펜 굵기</span><select id="penw">${[[3,"가늘게"],[4,"보통"],[6,"굵게"]].map(([n,l]) => `<option value="${n}" ${S.penWidth === n ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label class="li"><span class="t">손가락으로도 쓰기<small>끄면 펜슬만 인식해서 손바닥이 닿아도 안 그려져요</small></span><select id="finger"><option value="0" ${!S.fingerDraw ? "selected" : ""}>펜슬만</option><option value="1" ${S.fingerDraw ? "selected" : ""}>손가락도</option></select></label>
      <label class="li"><span class="t">새 카드는 안내선 따라 쓰기<small>끄면 새 카드도 듣고 받아쓰기</small></span><select id="gnew"><option value="1" ${S.guideNew ? "selected" : ""}>켬</option><option value="0" ${!S.guideNew ? "selected" : ""}>끔</option></select></label>
    </div>
    <div class="sec" style="margin:8px 4px -6px">기록</div>
    <div class="card"><div class="stats"><div><b>${streak()}</b><span>연속 일</span></div><div><b>${Object.keys(prog).length}</b><span>본 카드</span></div><div><b>${total}</b><span>누적 학습</span></div></div></div>
    <div class="list">
      <button class="li" id="exportBtn" style="color:var(--blue)">기록 내보내기 (파일로 저장)</button>
      <label class="li" style="color:var(--blue)">기록 가져오기<input type="file" id="importFile" accept="application/json" hidden></label>
      <button class="li" id="resetBtn" style="color:var(--red)">기록 초기화</button>
    </div>
    <div class="muted" style="margin:-4px 4px 0">기록은 이 기기 안에만 있어요. 가끔 내보내기로 파일을 남겨 두세요.</div>
    <div class="sec" style="margin:8px 4px -6px">3월까지 플랜</div>
    <div class="list">${DATA.plan.map(p => `<div class="li"><span class="t"><b>${esc(p.month)}</b><small style="font-size:15px;color:var(--ink)">${esc(p.goal)}</small></span></div>`).join("")}</div>
    <div class="muted" style="text-align:center;margin-top:8px">버전 ${window.APP_V || "1"} · 자막·토크에서 뽑은 새 덱은 Claude에게 부탁하면 추가돼요</div>
  </div>`);
  main.append(wrap);
  $("#npd").onchange = e => { S.newPerDay = +e.target.value; store.set("newPerDay", S.newPerDay); };
  $("#rep").onchange = e => { S.repeatTimes = +e.target.value; store.set("repeatTimes", S.repeatTimes); };
  $("#kana").onchange = e => { S.showKana = e.target.value === "1"; store.set("showKana", S.showKana); };
  $("#voice").onchange = e => { S.voice = e.target.value; store.set("voice", S.voice); };
  $("#penw").onchange = e => { S.penWidth = +e.target.value; store.set("penWidth", S.penWidth); };
  $("#finger").onchange = e => { S.fingerDraw = e.target.value === "1"; store.set("fingerDraw", S.fingerDraw); };
  $("#gnew").onchange = e => { S.guideNew = e.target.value === "1"; store.set("guideNew", S.guideNew); };
  $("#testVoice").onclick = () => speak("今日は来てくれてありがとう。楽しんでますか？");
  $("#exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ prog, days, settings: S }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `일본어기록_${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  $("#importFile").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.prog) prog = d.prog; if (d.days) days = d.days; store.set("prog", prog); store.set("days", days); toast("가져왔어요"); render(); } catch { toast("파일을 읽지 못했어요"); } };
  let armed = false;
  $("#resetBtn").onclick = () => { if (!armed) { armed = true; $("#resetBtn").textContent = "정말 초기화 (한 번 더 누르기)"; setTimeout(() => { armed = false; const b = $("#resetBtn"); if (b) b.textContent = "기록 초기화"; }, 4000); return; } prog = {}; days = {}; store.set("prog", prog); store.set("days", days); toast("초기화했어요"); render(); };
}

// ---------- 시작 ----------
load().then(() => { render(); }).catch(e => { main.innerHTML = `<div class="card" style="margin:20px">카드 파일을 불러오지 못했어요. 인터넷을 확인하고 다시 열어 주세요.<br><small>${esc(e)}</small></div>`; });
let rw = window.innerWidth >= 900; window.addEventListener("resize", () => { const w = window.innerWidth >= 900; if (w !== rw) { rw = w; renderSide(); } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
