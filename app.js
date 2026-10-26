(() => {
"use strict";
const HD = window.HD = window.HD || {};
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
  showHangul: store.get("showHangul", true),
};
let prog = store.get("prog", {});
let days = store.get("days", {});
let DATA = null, CARDS = [], BYID = {};
let tab = "home";

// ---------- 데이터 ----------
const kanaLine = c => (c.kana.replace(/\s/g,"") === c.jp.replace(/\s/g,"") ? "" : c.kana);

const kanaToHangul = (...a) => HD.kanaToHangul(...a);
const hangulLine = c => S.showHangul ? kanaToHangul(c.kana) : "";
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
function newCards(limit, kind){ return CARDS.filter(c => active(c) && !prog[c.id] && (!kind || c.kind === kind)).slice(0, Math.max(0, limit)); }
function todayStat(){ return days[todayKey()] || (days[todayKey()] = { new: 0, review: 0 }); }
function rate(card, grade){ // 0 모름 1 애매 2 알아
  const p = prog[card.id] || { step: 0, due: 0, seen: 0, lapses: 0 };
  const first = p.seen === 0;
  p.seen++;
  if (grade === 0) { p.step = 0; p.lapses++; p.due = Date.now() + 5*60e3; }
  else if (grade === 1) { p.due = Date.now() + (p.step === 0 ? 10*60e3 : STEPS[p.step] * 0.6); }
  else { p.step = Math.min(STEPS.length - 1, p.step + 1); p.due = Date.now() + STEPS[p.step]; }
  prog[card.id] = p; store.set("prog", prog);
  const t = todayStat(); if (first) { t.new++; if (card.kind === "word") t.newW = (t.newW || 0) + 1; else t.newS = (t.newS || 0) + 1; } else t.review++; store.set("days", days);
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

const makePad = (...a) => HD.makePad(...a);
const gradePad = (...a) => HD.gradePad(...a);

// ---------- 공통 ----------
let toastTimer;
function toast(m){ const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200); }
function el(html){ const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
Object.assign(HD, { S, store, el, esc }); // pen.js·kana.js 가 쓰는 공용 도구
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
  const todayN = kindStat("word").due + kindStat("word").fresh + kindStat("sentence").due + kindStat("sentence").fresh;
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
const KINDS = [["word", "단어", "짧게 외우기 · 한 단어씩"], ["sentence", "문장", "통째로 외우기 · 공연장에서 바로 쓰는 말"]];
function kindStat(kind){ const t = todayStat(); const used = kind === "word" ? (t.newW || 0) : (t.newS || 0); return { due: dueCards().filter(c => c.kind === kind).length, fresh: newCards(S.newPerDay - used, kind).length, used }; }
function home(){
  const t = todayStat(); const learned = Object.keys(prog).length;
  const m = new Date().getMonth() + 1; const plan = DATA.plan.find(p => parseInt(p.month) === m) || DATA.plan[0];
  const d = new Date(); const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
  main.append(header("오늘", dateStr));
  const c = el(`<div class="content">
    <div class="two" id="kinds"></div>
    <div class="muted" style="margin:-4px 4px 0">오늘 한 카드 ${t.new + t.review} · 외운 카드 ${learned} / 전체 ${CARDS.filter(active).length} · 연속 ${streak()}일</div>
    <div class="card"><h3>${esc(plan.month)} 목표</h3><div>${esc(plan.goal)}</div></div>
    <div class="only-narrow"><h3 class="sec" style="margin-left:4px">덱 (눌러서 켜고 끄기)</h3><div class="list" id="deckList"></div></div>
  </div>`);
  main.append(c);
  for (const [kind, name, desc] of KINDS) {
    const k = kindStat(kind); const total = CARDS.filter(x => active(x) && x.kind === kind).length;
    const b = el(`<div class="card kind"><h3>${name} 공부</h3><div class="muted">${desc}</div>
      <div class="stats" style="margin-top:12px"><div><b>${k.due}</b><span>복습</span></div><div><b>${k.fresh}</b><span>새 ${name}</span></div><div><b>${total}</b><span>전체</span></div></div>
      <button class="btn fill" style="width:100%;margin-top:14px;font-size:20px;min-height:60px" data-k="${kind}">${total === 0 ? "켜진 덱에 " + name + " 없음" : k.due + k.fresh > 0 ? name + " 학습 시작" : "오늘 몫 끝 · 10장 더"}</button></div>`);
    b.querySelector("button").disabled = total === 0;
    b.querySelector("button").onclick = () => { session = null; studyKind = kind; tab = "study"; render(); };
    $("#kinds").append(b);
  }
  const dl = $("#deckList");
  for (const d of DATA.decks) {
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<button class="li"><span class="t">${esc(d.name)}<small>${esc(d.desc)}</small></span><span class="v">${done}/${n}</span><span class="ck">${on ? "✓" : ""}</span></button>`);
    b.onclick = () => toggleDeck(d.id); dl.append(b);
  }
}

// ---------- 학습 ----------
let session = null, studyKind = "sentence";
function study(){
  const kind = studyKind, kname = kind === "word" ? "단어" : "문장";
  if (!session) {
    const k = kindStat(kind);
    let q = [...dueCards().filter(c => c.kind === kind), ...newCards(S.newPerDay - k.used, kind)];
    if (!q.length) q = newCards(10, kind);
    if (!q.length) { toast(`새 ${kname} 카드가 다 떨어졌어요. 덱을 더 켜 주세요.`); tab = "home"; return home(); }
    session = { q, i: 0, total: q.length, done: 0 };
  }
  const s = session;
  if (s.i >= s.q.length) {
    main.append(header(kname + " 공부", "끝"));
    main.append(el(`<div class="content"><div class="card done"><div class="big">🎉</div><h2 style="font-size:22px;margin:8px 0">오늘 ${kname} 몫 끝</h2><p class="muted">${s.done}장 공부했어요. 연속 ${streak()}일.</p><div class="row" style="max-width:420px;margin:12px auto 0"><button class="btn fill" id="moreBtn">10장 더</button><button class="btn" id="homeBtn">오늘로</button></div></div></div>`));
    $("#moreBtn").onclick = () => { session = { q: newCards(10, kind), i: 0, total: 10, done: 0 }; if (!session.q.length) { session = null; toast(`새 ${kname} 카드가 다 떨어졌어요. 덱을 더 켜 주세요.`); setTab("home"); return; } render(); };
    $("#homeBtn").onclick = () => setTab("home");
    return;
  }
  const c = s.q[s.i]; const isNew = !prog[c.id];
  // 새 카드: 글자와 안내선을 보여 주고 따라 쓰기. 복습: 듣고 받아쓰기(정답은 숨김).
  const trace = isNew && S.guideNew;
  main.append(header(kname + " 공부", `${s.i + 1} / ${s.total} · ${isNew ? "새 카드" : "복습"}`, speedSeg()));
  const wrap = el(`<div class="content fill">
    <div class="prog"><i style="width:${(s.i / s.total) * 100}%"></i></div>
    <div class="ans ${trace ? "" : "quiz"}" id="ans">${trace
      ? `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div><div class="note">${esc(c.note)}</div>`
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
    a.innerHTML = `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div><div class="note">${esc(c.note)}</div>`;
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
    <div class="ans quiz" id="ans"><span class="q">${esc(c.ko)}</span><span class="w">${S.showHangul ? `<span class="hg">${esc(hangulLine(c))}</span> ` : ""}${c.note ? esc(c.note) : ""}</span></div>
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
    <div class="qcard open" id="qcard"><div class="where">${sh.i + 1} / ${items.length}</div><div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div></div>
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
      const q = $("#qcard"); if (q) { q.querySelector(".where").textContent = `${k + 1} / ${items.length}`; q.querySelector(".main").textContent = card.jp; q.querySelector(".kana").textContent = kanaLine(card); q.querySelector(".hg").textContent = hangulLine(card); q.querySelector(".ko").textContent = card.ko; }
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
    const it = el(`<div class="li"><button class="play">${ICO.play}</button><button class="t"><div class="j jp">${esc(c.jp)}</div><div class="k jp">${esc(kanaLine(c))}${S.showHangul ? ` <span class="hg">${esc(kanaToHangul(c.kana))}</span>` : ""}</div><div class="m">${esc(c.ko)}${c.note ? " · " + esc(c.note) : ""}</div></button><span class="badge ${p ? (p.step >= 4 ? "ok" : "") : "new"}">${p ? (p.step >= 4 ? "외움" : "학습 중") : "새"}</span></div>`);
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
      <label class="li"><span class="t">한글 발음 표시<small>예: きょう → 켄오. 익숙해지면 꺼 보세요</small></span><select id="hangul"><option value="1" ${S.showHangul ? "selected" : ""}>보이기</option><option value="0" ${!S.showHangul ? "selected" : ""}>숨기기</option></select></label>
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
  $("#hangul").onchange = e => { S.showHangul = e.target.value === "1"; store.set("showHangul", S.showHangul); };
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
