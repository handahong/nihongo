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
  talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3a2 2 0 0 1-1-2V7a2 2 0 0 1 0 0"/><path d="M20 9v6a2 2 0 0 1-2 2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
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
  showHangul: store.get("showHangul", true), myLine: store.get("myLine", "kana"), traceGrade: store.get("traceGrade", false),
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
const DEFAULT_ON = ["n5", "grammar", "daily", "real", "dialog"];
async function load(){
  const v = "?v=" + (window.APP_V || "1");
  const [decks, vocab, clips] = await Promise.all([
    fetch("decks.json" + v, { cache: "no-cache" }).then(r => r.json()),
    fetch("words-vocab.json" + v).then(r => r.ok ? r.json() : { cards: [] }).catch(() => ({ cards: [] })),
    fetch("clips.json" + v, { cache: "no-cache" }).then(r => r.ok ? r.json() : []).catch(() => []),
  ]);
  DATA = decks;
  // 실제 음성 덱 (clips.json) 과 어휘 덱 (words-vocab.json) 을 끼워 넣는다
  if (clips.length) {
    const half = Math.ceil(clips.length / 2);
    const mk = (n, arr) => ({ name: n, items: arr.map(c => [c.jp, c.kana, c.ko, "", c.a]) });
    const real = { id: "real", name: "실제 음성 듣기", kind: "sentence", desc: "방송·라디오 토크에서 자른 진짜 목소리. 듣고 받아쓰기.", scenes: [mk("토크·라디오 1", clips.slice(0, half)), mk("토크·라디오 2", clips.slice(half))] };
    const i = DATA.decks.findIndex(d => d.id === "dialog"); DATA.decks.splice(i < 0 ? DATA.decks.length : i, 0, real);
  }
  for (const lv of ["N4", "N3", "N2"]) {
    const by = new Map();
    for (const c of vocab.cards || []) if (c.level === lv) { if (!by.has(c.tag)) by.set(c.tag, []); by.get(c.tag).push([c.word, c.reading, c.meaning, ""]); }
    if (by.size) DATA.decks.push({ id: "vocab-" + lv.toLowerCase(), name: "어휘 " + lv, kind: "word", desc: `JLPT ${lv} 수준 단어`, scenes: [...by].map(([n, items]) => ({ name: n, items })) });
  }
  CARDS = []; BYID = {};
  for (const d of DATA.decks) for (const sc of d.scenes) for (const it of sc.items) {
    if (d.kind === "dialog") continue;
    const c = { id: d.id + "-" + hashId(it[0]), deck: d.id, deckName: d.name, kind: d.kind, scene: sc.name, jp: it[0], kana: it[1], ko: it[2], note: it[3] || "", audio: it[4] || "" };
    CARDS.push(c); BYID[c.id] = c;
  }
  if (!S.activeDecks) S.activeDecks = DEFAULT_ON.filter(id => DATA.decks.some(d => d.id === id));
  S.activeDecks = S.activeDecks.filter(id => DATA.decks.some(d => d.id === id));
  if (!S.activeDecks.length) S.activeDecks = DATA.decks.map(d => d.id);
}

// ---------- 진도·시험 일정 ----------
// prog[id] = { due, ok, ng, first, last }  (공부 페이지에서 본 카드만 생김. due 가 오늘 이전이면 시험 대상)
const DAY = 864e5;
const active = c => S.activeDecks.includes(c.deck);
const at4am = d => { const x = new Date(d); x.setHours(4, 0, 0, 0); return x.getTime(); };
const endOfToday = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };
function migrateProg(){ let changed = false; for (const id in prog) { const p = prog[id]; if (p && "step" in p) { prog[id] = { due: p.due || Date.now(), ok: Math.max(0, (p.step || 0) - 1), ng: p.lapses || 0, first: todayKey(), last: todayKey() }; changed = true; } } if (changed) store.set("prog", prog); }
function learnedCards(kind){ return CARDS.filter(c => active(c) && c.kind === kind && prog[c.id]); }
function unlearnedCards(kind){ return CARDS.filter(c => active(c) && c.kind === kind && !prog[c.id]); }
function dueCards(kind){ const lim = endOfToday(); return CARDS.filter(c => active(c) && (!kind || c.kind === kind) && prog[c.id] && prog[c.id].due <= lim).sort((a, b) => prog[a.id].due - prog[b.id].due); }
function todayStat(){ return days[todayKey()] || (days[todayKey()] = { studied: 0, test: 0, pass: 0 }); }
function markStudied(card){ // 공부 페이지에서 '다음'을 누르면 외운 것으로 치고, 오늘부터 시험 대상이 된다
  if (prog[card.id]) return false;
  prog[card.id] = { due: Date.now(), ok: 0, ng: 0, first: todayKey(), last: todayKey() }; store.set("prog", prog);
  const t = todayStat(); t.studied++; store.set("days", days); return true;
}
function recordTest(card, pass){ // 맞으면 2주 뒤, 틀리면 내일 다시
  const p = prog[card.id] || { ok: 0, ng: 0, first: todayKey() };
  if (pass) { p.ok++; p.due = at4am(Date.now() + 14 * DAY); } else { p.ng++; p.due = at4am(Date.now() + DAY); }
  p.last = todayKey(); prog[card.id] = p; store.set("prog", prog);
  const t = todayStat(); t.test++; if (pass) t.pass++; store.set("days", days);
}
function streak(){
  let n = 0; const d = new Date();
  for (;;) { const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; const s = days[k]; const did = s && ((s.studied || 0) + (s.test || 0) + (s.new || 0) + (s.review || 0)) > 0; if (did) { n++; d.setDate(d.getDate()-1); } else if (n === 0 && k === todayKey()) { d.setDate(d.getDate()-1); } else break; }
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
// 실제 음성 클립이 있는 카드는 녹음을 틀고, 없으면 기계 음성
const player = new Audio(); let audioWarned = false;
function playClip(file, rate = S.speed){
  return new Promise(res => {
    const my = ++speakToken; TTS && TTS.cancel();
    player.src = "audio/" + file; player.playbackRate = Math.max(0.6, Math.min(1.2, rate));
    let done = false; const fin = ok => { if (!done) { done = true; res(ok); } };
    player.onended = () => fin(true); player.onerror = () => fin(false);
    player.play().catch(() => fin(false));
    setTimeout(() => { if (my === speakToken) fin(true); }, 12000);
  });
}
async function say(card, rate = S.speed){
  if (card.audio) { const ok = await playClip(card.audio, rate); if (ok) return; if (!audioWarned) { audioWarned = true; toast("음성 파일이 아직 안 올라가 있어서 기계 음성으로 대신해요"); } }
  return speak(card.jp, rate);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function estimateMs(text, rate){ return Math.min(9000, 600 + text.replace(/\s/g,"").length * 260 / rate); }
let loopToken = 0;
async function shadow(card, times = S.repeatTimes, onPhase){ // 기기가 말함 → 내 차례(쉼) → 다시 들려줌
  const my = ++loopToken;
  for (let i = 0; i < times; i++) {
    onPhase && onPhase(i === 0 ? "듣기" : `다시 듣기 ${i+1}/${times}`);
    await say(card); if (my !== loopToken) return false;
    onPhase && onPhase("따라 말하기 ▶");
    await sleep(estimateMs(card.jp, S.speed) + 500); if (my !== loopToken) return false;
  }
  onPhase && onPhase(""); return true;
}
function stopAll(){ loopToken++; speakToken++; TTS && TTS.cancel(); try { player.pause(); } catch {} stopListening(); }

// ---------- 내 발음 듣기 (음성 인식) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
function stopListening(){ if (rec) { try { rec.abort(); } catch {} rec = null; } }
function listen(onState){ // 말한 내용을 글자 후보들로 돌려준다
  return new Promise((res, rej) => {
    if (!SR) return rej(new Error("이 브라우저는 음성 인식을 지원하지 않아요. 사파리에서 열어 보세요."));
    stopListening(); TTS && TTS.cancel();
    const r = rec = new SR(); r.lang = "ja-JP"; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let got = false;
    r.onstart = () => onState && onState("듣는 중… 말해 보세요");
    r.onresult = e => { got = true; const alts = [...e.results[0]].map(a => a.transcript); res(alts); };
    r.onerror = e => { if (!got) rej(new Error(e.error === "not-allowed" ? "마이크 사용이 막혀 있어요. 설정에서 마이크를 허용해 주세요." : e.error === "no-speech" ? "말소리를 못 들었어요. 다시 눌러서 말해 보세요." : "인식 실패: " + e.error)); };
    r.onend = () => { if (!got) rej(new Error("말소리를 못 들었어요. 다시 눌러서 말해 보세요.")); rec = null; };
    try { r.start(); } catch (e) { rej(e); }
  });
}
async function gradeSpeech(card, box, btn){
  box.hidden = false; box.innerHTML = `<span class="muted">마이크 준비 중…</span>`;
  if (btn) btn.disabled = true;
  try {
    const alts = await listen(t => box.innerHTML = `<span class="muted">🎤 ${t}</span>`);
    return HD.showGrade(box, alts, card, "들린 말");
  } catch (e) { box.innerHTML = `<span class="muted">${esc(e.message)}</span>`; return null; }
  finally { if (btn) btn.disabled = false; }
}

// ---------- 획순 보기 (KanjiVG) ----------
const svgCache = new Map();
async function strokeSvg(ch){
  const code = ch.codePointAt(0).toString(16).padStart(5, "0");
  if (svgCache.has(code)) return svgCache.get(code);
  const p = fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${code}.svg`).then(r => r.ok ? r.text() : null).catch(() => null);
  svgCache.set(code, p); return p;
}
function openModal(html){ const m = $("#modal"); m.innerHTML = `<div class="sheetbox">${html}</div>`; m.hidden = false; m.onclick = e => { if (e.target === m) closeModal(); }; return m; }
function closeModal(){ const m = $("#modal"); m.hidden = true; m.innerHTML = ""; }
async function showStrokes(text){
  const chars = [...text].filter(ch => /[぀-ヿ一-鿿]/.test(ch));
  if (!chars.length) return toast("획순을 보여 줄 글자가 없어요");
  let idx = 0;
  const m = openModal(`<div class="row" style="justify-content:space-between"><h3 style="margin:0;font-size:17px">획순</h3><button class="btn" id="mClose" style="min-height:40px;padding:8px 14px;font-size:15px">닫기</button></div>
    <div class="chips" id="mChars" style="margin:10px 0">${chars.map((ch, i) => `<button data-i="${i}" aria-pressed="${i === 0}" class="jp">${esc(ch)}</button>`).join("")}</div>
    <div class="strokebox" id="mBox"><div class="muted">불러오는 중…</div></div>
    <div class="row" style="margin-top:10px"><button class="btn" id="mPlay">${ICO.play} 다시 보기</button><button class="btn" id="mNext">다음 글자 ▶</button></div>`);
  $("#mClose").onclick = closeModal;
  async function show(i){
    idx = i; m.querySelectorAll("#mChars button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.i === i));
    const box = $("#mBox"); box.innerHTML = `<div class="muted">불러오는 중…</div>`;
    const svg = await strokeSvg(chars[i]);
    if (!svg) { box.innerHTML = `<div class="muted">이 글자의 획순 자료가 없어요 (인터넷 필요)</div>`; return; }
    const at = svg.indexOf("<svg"); box.innerHTML = (at >= 0 ? svg.slice(at) : svg).replace(/<!--[\s\S]*?-->/g, ""); // 머리말(DOCTYPE 등)은 버리고 <svg>부터
    const el = box.querySelector("svg"); el.removeAttribute("width"); el.removeAttribute("height"); el.setAttribute("viewBox", el.getAttribute("viewBox") || "0 0 109 109");
    animate(box);
  }
  function animate(box){
    const paths = [...box.querySelectorAll("path")]; const nums = [...box.querySelectorAll("text")];
    nums.forEach(t => t.style.opacity = 0);
    paths.forEach(p => { const L = p.getTotalLength(); p.style.transition = "none"; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    let t = 0;
    paths.forEach((p, i) => { const L = p.getTotalLength(); const dur = Math.max(250, Math.min(900, L * 9)); setTimeout(() => { p.style.transition = `stroke-dashoffset ${dur}ms ease-out`; p.style.strokeDashoffset = 0; if (nums[i]) nums[i].style.opacity = 1; }, t); t += dur + 180; });
  }
  $("#mPlay").onclick = () => animate($("#mBox"));
  $("#mNext").onclick = () => show((idx + 1) % chars.length);
  m.querySelectorAll("#mChars button").forEach(b => b.onclick = () => show(+b.dataset.i));
  show(0);
}

const makePad = (...a) => HD.makePad(...a);
const gradePad = (...a) => HD.gradePad(...a);

// ---------- 공통 ----------
let toastTimer;
function toast(m){ const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2600); }
function el(html){ const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
Object.assign(HD, { S, store, el, esc }); // pen.js·kana.js 가 쓰는 공용 도구
const KINDS = { word: { name: "단어", desc: "한 단어씩 짧게" }, sentence: { name: "문장", desc: "문법·회화 문장을 통째로" } };
// 단어/문장 페이지 상태: 공부(study)·시험(test)·목록(list) 중 하나와 현재 위치
const st = { word: { mode: "study", deck: null, scene: null, i: 0 }, sentence: { mode: "study", deck: null, scene: null, i: 0 } };
let testSession = { word: null, sentence: null };
function setTab(t){ stopAll(); closeModal(); tab = t; render(); }
function openDeck(id){ const d = DATA.decks.find(x => x.id === id); if (!d) return; if (d.kind === "dialog") return setTab("dialog"); st[d.kind] = { mode: "study", deck: id, scene: null, i: 0 }; setTab(d.kind); }
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
  store.set("activeDecks", S.activeDecks); testSession = { word: null, sentence: null }; render();
}
function deckCounts(d){ const all = CARDS.filter(c => c.deck === d.id); return { n: d.kind === "dialog" ? d.scenes.length : all.length, done: all.filter(c => prog[c.id]).length }; }
const cardHtml = (c, open = true) => `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div>${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}`;
function kindDecks(kind){ return DATA.decks.filter(d => d.kind === kind); }
function pickers(deckSel, sceneSel, scenes, onDeck, onScene, decks){
  const w = el(`<div class="card" style="padding:14px 18px"><div class="chips" id="deckPick">${decks.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === deckSel}">${esc(d.name)}${S.activeDecks.includes(d.id) ? "" : " (꺼짐)"}</button>`).join("")}</div>
    <div class="chips" id="scenePick" style="margin-top:8px">${scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === sceneSel}">${esc(x.name)}</button>`).join("")}</div></div>`);
  w.querySelectorAll("#deckPick button").forEach(b => b.onclick = () => { stopAll(); onDeck(b.dataset.d); });
  w.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { stopAll(); onScene(b.dataset.s); });
  return w;
}
function modeSeg(kind){
  const m = st[kind].mode;
  const s = el(`<div class="seg">${[["study","공부"],["test","시험"],["list","목록"]].map(([k,l]) => `<button data-m="${k}" aria-pressed="${m === k}">${l}${k === "test" ? ` <b>${dueCards(kind).length}</b>` : ""}</button>`).join("")}</div>`);
  s.querySelectorAll("button").forEach(b => b.onclick = () => { stopAll(); st[kind].mode = b.dataset.m; render(); });
  return s;
}

function renderSide(){
  const side = $("#side"); side.innerHTML = "";
  const cur = tab;
  const item = (id, color, ico, label, right) => { const b = el(`<button class="srow" aria-current="${cur === id}"><span class="ic" style="background:${color}">${ico}</span><span>${label}</span>${right}</button>`); b.onclick = () => setTab(id); return b; };
  side.append(el(`<h1>일본어</h1>`));
  const dueAll = dueCards("word").length + dueCards("sentence").length;
  side.append(item("home", "var(--blue)", ICO.today, "오늘", `<span class="n">${dueAll || ""}</span>`));
  side.append(item("word", "var(--orange)", ICO.browse, "단어", `<span class="n">${dueCards("word").length || ""}</span>`));
  side.append(item("sentence", "var(--green)", ICO.pen, "문장", `<span class="n">${dueCards("sentence").length || ""}</span>`));
  side.append(item("dialog", "var(--red)", ICO.talk, "회화", ""));
  side.append(el(`<div class="sec">덱 · 이름을 누르면 공부, ✓는 켜고 끄기</div>`));
  for (const d of DATA.decks) {
    if (d.kind === "dialog") continue;
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<div class="srow deck ${on ? "" : "dim"}" aria-current="${(tab === d.kind && st[d.kind].deck === d.id)}"><button class="nm"><span>${esc(d.name)}</span><span class="n">${done}/${n}</span></button><button class="ck" aria-pressed="${on}" title="${on ? "끄기" : "켜기"}">${on ? "✓" : "○"}</button></div>`);
    b.querySelector(".nm").onclick = () => openDeck(d.id); b.querySelector(".ck").onclick = () => toggleDeck(d.id); side.append(b);
  }
  side.append(el(`<div class="sec">기록</div>`));
  side.append(el(`<div class="srow"><span>연속</span><span class="n">${streak()}일</span></div>`));
  side.append(el(`<div class="spacer"></div>`));
  side.append(item("settings", "var(--gray)", ICO.settings, "설정", ""));
  const nav = $("#nav"); nav.innerHTML = "";
  for (const [id, label, ico] of [["home","오늘",ICO.today],["word","단어",ICO.browse],["sentence","문장",ICO.pen],["dialog","회화",ICO.talk],["settings","설정",ICO.settings]]) {
    const b = el(`<button aria-selected="${cur === id}">${ico}${label}</button>`); b.onclick = () => setTab(id); nav.append(b);
  }
}
function render(){ main.innerHTML = ""; renderSide(); ({ home, word: () => kindPage("word"), sentence: () => kindPage("sentence"), dialog: dialogTab, settings }[tab])(); main.scrollTop = 0; }

// ---------- 오늘 ----------
function home(){
  const t = todayStat(); const learned = Object.keys(prog).length;
  const m = new Date().getMonth() + 1; const plan = DATA.plan.find(p => parseInt(p.month) === m) || DATA.plan[0];
  const d = new Date(); const dateStr = `${d.getMonth()+1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
  main.append(header("오늘", dateStr));
  const c = el(`<div class="content">
    <div class="two" id="kinds"></div>
    <div class="muted" style="margin:-4px 4px 0">오늘 공부 ${t.studied || 0} · 시험 ${t.test || 0}(맞음 ${t.pass || 0}) · 외우는 중 ${learned}장 · 연속 ${streak()}일</div>
    <div class="card"><h3>${esc(plan.month)} 목표</h3><div>${esc(plan.goal)}</div></div>
    <div class="card"><h3>이렇게 써요</h3><div class="muted" style="font-size:16px;line-height:1.6">① <b>공부</b>에서 순서대로 보고 듣고 따라 씁니다. '다음'을 누른 카드는 그날부터 시험 대상이 돼요.<br>② <b>시험</b>에서는 뜻만 보고 펜슬로 쓰거나 말합니다. 맞으면 2주 뒤에, 틀리면 내일 다시 나와요.</div></div>
    <div class="only-narrow"><h3 class="sec" style="margin-left:4px">덱 (이름은 공부, ✓는 켜고 끄기)</h3><div class="list" id="deckList"></div></div>
  </div>`);
  main.append(c);
  for (const kind of ["word", "sentence"]) {
    const K = KINDS[kind]; const fresh = unlearnedCards(kind).length, due = dueCards(kind).length, total = CARDS.filter(x => active(x) && x.kind === kind).length;
    const b = el(`<div class="card kind"><h3>${K.name}</h3><div class="muted">${K.desc}</div>
      <div class="stats" style="margin-top:12px"><div><b>${due}</b><span>오늘 시험</span></div><div><b>${fresh}</b><span>아직 안 본 ${K.name}</span></div><div><b>${total}</b><span>전체</span></div></div>
      <div class="row" style="margin-top:14px"><button class="btn fill" data-m="study" style="font-size:19px;min-height:58px">공부하기</button><button class="btn" data-m="test" style="font-size:19px;min-height:58px">시험 보기${due ? ` (${due})` : ""}</button></div></div>`);
    b.querySelectorAll("button").forEach(x => { x.disabled = total === 0; x.onclick = () => { st[kind].mode = x.dataset.m; if (x.dataset.m === "study") { const first = unlearnedCards(kind)[0]; if (first) { st[kind].deck = first.deck; st[kind].scene = first.scene; st[kind].i = indexInScene(first); } } setTab(kind); }; });
    $("#kinds").append(b);
  }
  const dl = $("#deckList");
  for (const d of DATA.decks) {
    if (d.kind === "dialog") continue;
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<div class="li"><button class="t"><span>${esc(d.name)}</span><small>${esc(d.desc || "")}</small></button><span class="v">${done}/${n}</span><button class="ck" style="padding:6px 10px">${on ? "✓" : "○"}</button></div>`);
    b.querySelector(".t").onclick = () => openDeck(d.id); b.querySelector(".ck").onclick = () => toggleDeck(d.id); dl.append(b);
  }
}
function indexInScene(c){ return CARDS.filter(x => x.deck === c.deck && x.scene === c.scene).indexOf(c); }

// ---------- 단어 / 문장 페이지 ----------
function kindPage(kind){
  const s = st[kind];
  if (s.mode === "test") return testPage(kind);
  if (s.mode === "list") return listPage(kind);
  return studyPage(kind);
}
function resolvePos(kind){ // 현재 덱·장면·번호를 유효한 값으로 맞춘다
  const s = st[kind]; const decks = kindDecks(kind);
  let deck = decks.find(d => d.id === s.deck) || decks.find(d => S.activeDecks.includes(d.id)) || decks[0];
  const scene = deck.scenes.find(x => x.name === s.scene) || deck.scenes[0];
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  s.deck = deck.id; s.scene = scene.name; s.i = Math.max(0, Math.min(s.i, items.length - 1));
  return { deck, scene, items, decks };
}
function stepPos(kind, dir){ // 장면 끝이면 다음 장면, 덱 끝이면 다음 덱 (같은 종류 안에서)
  const s = st[kind]; const { deck, scene, items, decks } = resolvePos(kind);
  const ni = s.i + dir;
  if (ni >= 0 && ni < items.length) { s.i = ni; return true; }
  const si = deck.scenes.indexOf(scene) + dir;
  if (si >= 0 && si < deck.scenes.length) { s.scene = deck.scenes[si].name; s.i = dir > 0 ? 0 : 1e9; resolvePos(kind); return true; }
  const di = decks.indexOf(deck) + dir;
  if (di >= 0 && di < decks.length) { const nd = decks[di]; s.deck = nd.id; s.scene = (dir > 0 ? nd.scenes[0] : nd.scenes[nd.scenes.length - 1]).name; s.i = dir > 0 ? 0 : 1e9; resolvePos(kind); return true; }
  return false;
}

// 공부: 커리큘럼 순서대로 한 장씩. 뜻·듣기·따라하기·발음·따라 쓰기·획순이 한 화면에.
function studyPage(kind){
  const K = KINDS[kind]; const s = st[kind]; const { deck, scene, items, decks } = resolvePos(kind);
  const c = items[s.i]; const seen = !!prog[c.id];
  const t = todayStat();
  main.append(header(K.name, `${esc(deck.name)} › ${esc(scene.name)} · ${s.i + 1} / ${items.length} · 오늘 ${t.studied || 0} / ${S.newPerDay}장`, modeSeg(kind)));
  const wrap = el(`<div class="content fill">
    <div class="qcard open" id="qcard" style="min-height:0;padding:26px 30px">${cardHtml(c)}<div class="where" style="margin-top:10px">${seen ? `<span class="badge ok">본 카드 · 시험 ${prog[c.id].ok}승 ${prog[c.id].ng}패</span>` : `<span class="badge new">새 카드</span>`}</div></div>
    <div class="row"><button class="btn fill" id="playBtn">${ICO.play} 듣기</button><button class="btn" id="shadowBtn">${ICO.repeat} 따라하기</button><button class="btn" id="micBtn">${ICO.mic} 발음</button><button class="btn" id="strokeBtn">획순</button><button class="btn" id="gradeBtn" style="color:var(--green)">✓ 쓴 글자 확인</button></div>
    <div class="phase" id="phase"></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:280px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="row"><button class="btn" id="prevBtn" style="flex:0 0 auto;padding:16px 22px">◀ 이전</button><button class="btn fill" id="nextBtn" style="font-size:20px">${seen ? "다음 ▶" : "외웠어요, 다음 ▶"}</button></div>
  </div>`);
  wrap.prepend(pickers(deck.id, scene.name, deck.scenes, id => { st[kind] = { mode: "study", deck: id, scene: null, i: 0 }; render(); }, n => { s.scene = n; s.i = 0; render(); }, decks));
  main.append(wrap);
  const pad = makePad({ guide: c.jp, kana: S.showKana ? kanaLine(c) : "", showGuide: true, hint: "연한 글자를 펜슬로 따라 써 보세요" });
  $("#padSlot").append(pad.el);
  const phase = x => { const p = $("#phase"); if (p) p.textContent = x; };
  $("#playBtn").onclick = () => { stopAll(); phase("듣기"); say(c).then(() => phase("")); };
  $("#shadowBtn").onclick = () => { stopAll(); shadow(c, S.repeatTimes, phase); };
  $("#strokeBtn").onclick = () => { stopAll(); showStrokes(c.jp); };
  $("#micBtn").onclick = async () => { stopAll(); await gradeSpeech(c, $("#grade"), $("#micBtn")); };
  $("#gradeBtn").onclick = async () => { const box = $("#grade"); box.hidden = false; await gradePad(pad, c, box); };
  $("#prevBtn").onclick = () => { stopAll(); if (!stepPos(kind, -1)) toast("맨 처음이에요"); render(); };
  $("#nextBtn").onclick = () => { stopAll(); const first = markStudied(c); if (first && (todayStat().studied === S.newPerDay)) toast(`오늘 목표 ${S.newPerDay}장을 채웠어요. 시험도 봐 보세요`); if (!stepPos(kind, 1)) { toast(`${K.name} 끝까지 봤어요. 시험 탭에서 확인해 보세요`); } render(); };
  setTimeout(() => say(c), 250);
}

// 시험: 뜻만 보고 쓰거나 말한다. 자동 채점 → 맞으면 2주 뒤, 틀리면 내일.
function testPage(kind){
  const K = KINDS[kind];
  let ses = testSession[kind];
  if (!ses || ses.day !== todayKey()) { const q = dueCards(kind); ses = testSession[kind] = { q, i: 0, ok: 0, ng: 0, day: todayKey() }; }
  main.append(header(K.name, ses.q.length ? `시험 ${Math.min(ses.i + 1, ses.q.length)} / ${ses.q.length} · 맞음 ${ses.ok} · 틀림 ${ses.ng}` : "시험", modeSeg(kind)));
  if (!ses.q.length) {
    const fresh = unlearnedCards(kind).length;
    const w = el(`<div class="content"><div class="card done"><div class="big">✅</div><h2 style="font-size:22px;margin:8px 0">오늘 시험할 ${K.name}가 없어요</h2><p class="muted">${fresh ? `공부 탭에서 새 ${K.name}를 보고 '다음'을 누르면 바로 시험을 볼 수 있어요. (아직 안 본 ${K.name} ${fresh}장)` : `${K.name}를 전부 봤어요. 틀린 카드는 내일, 맞은 카드는 2주 뒤에 다시 나와요.`}</p><div class="row" style="max-width:420px;margin:12px auto 0"><button class="btn fill" id="goStudy">공부하러 가기</button></div></div></div>`);
    main.append(w); $("#goStudy").onclick = () => { st[kind].mode = "study"; render(); }; return;
  }
  if (ses.i >= ses.q.length) {
    const w = el(`<div class="content"><div class="card done"><div class="big">🎉</div><h2 style="font-size:22px;margin:8px 0">오늘 ${K.name} 시험 끝</h2><p class="muted">${ses.q.length}장 중 ${ses.ok}장 맞음. 틀린 ${ses.ng}장은 내일 다시 나와요.</p><div class="row" style="max-width:420px;margin:12px auto 0"><button class="btn fill" id="goStudy">새 ${K.name} 공부하기</button><button class="btn" id="goHome">오늘로</button></div></div></div>`);
    main.append(w); $("#goStudy").onclick = () => { st[kind].mode = "study"; render(); }; $("#goHome").onclick = () => setTab("home"); return;
  }
  const c = ses.q[ses.i]; let answered = false;
  const wrap = el(`<div class="content fill">
    <div class="prog"><i style="width:${(ses.i / ses.q.length) * 100}%"></i></div>
    <div class="qcard" id="qcard" style="min-height:0;padding:26px 30px"><div class="where">${esc(c.deckName)} › ${esc(c.scene)}</div><div class="main" style="font-size:clamp(24px,3.4vw,38px)">${esc(c.ko)}</div><div class="muted" style="margin-top:10px">이 뜻의 일본어를 펜슬로 쓰거나, 마이크로 말해 보세요</div></div>
    <div class="row"><button class="btn fill" id="gradeBtn" style="font-size:20px">✓ 쓴 것 채점</button><button class="btn" id="micBtn">${ICO.mic} 말해서 채점</button><button class="btn" id="dunnoBtn" style="color:var(--red)">모르겠어요</button></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:280px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="row" id="after" hidden><button class="btn" id="hearBtn">${ICO.play} 정답 듣기</button><button class="btn" id="strokeBtn">획순</button><button class="btn fill" id="nextBtn" style="font-size:20px;flex:2">다음 ▶</button></div>
  </div>`);
  main.append(wrap);
  const pad = makePad({ guide: c.jp, kana: S.showKana ? kanaLine(c) : "", showGuide: false, hint: "답을 써 보세요" });
  $("#padSlot").append(pad.el);
  const guideBtn = pad.el.querySelector('[data-act="guide"]'); guideBtn.hidden = true; // 답이 보이면 안 되니 채점 전엔 안내선 버튼을 숨긴다
  function finish(pass, note){
    if (answered) return; answered = true; guideBtn.hidden = false;
    recordTest(c, pass); if (pass) ses.ok++; else ses.ng++;
    const q = $("#qcard"); q.classList.add("open"); q.innerHTML = `<div class="where">${pass ? `<span class="badge ok">맞았어요 · 2주 뒤에 다시</span>` : `<span class="badge" style="color:var(--red)">틀렸어요 · 내일 다시</span>`}${note ? ` <span class="muted">${esc(note)}</span>` : ""}</div>${cardHtml(c)}`;
    pad.showGuide(true);
    $("#gradeBtn").disabled = $("#micBtn").disabled = $("#dunnoBtn").disabled = true; $("#after").hidden = false;
    $("#hearBtn").onclick = () => { stopAll(); say(c); }; $("#strokeBtn").onclick = () => { stopAll(); showStrokes(c.jp); };
    $("#nextBtn").onclick = () => { stopAll(); ses.i++; render(); };
    $("#nextBtn").scrollIntoView({ block: "nearest" }); say(c);
  }
  const passOf = (g, spoken) => !!g && (g.dist === 0 || g.score >= (spoken ? 0.8 : (kind === "sentence" ? 0.9 : 1)));
  $("#gradeBtn").onclick = async () => { if (answered) return; const box = $("#grade"); box.hidden = false; const g = await gradePad(pad, c, box); if (g) finish(passOf(g, false)); };
  $("#micBtn").onclick = async () => { if (answered) return; stopAll(); const g = await gradeSpeech(c, $("#grade"), $("#micBtn")); if (g) finish(passOf(g, true)); };
  $("#dunnoBtn").onclick = () => finish(false);
}

// 목록: 덱·장면별로 훑어보기 (듣기 가능)
function listPage(kind){
  const K = KINDS[kind]; const s = st[kind]; const { deck, scene, decks } = resolvePos(kind);
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  main.append(header(K.name, `${esc(deck.name)} › ${esc(scene.name)} · ${items.length}장`, modeSeg(kind)));
  const wrap = el(`<div class="content"><div class="muted" style="margin:-4px 4px 0">재생은 듣기, 글자를 누르면 그 카드부터 공부</div><div class="list" id="list"></div></div>`);
  wrap.prepend(pickers(deck.id, scene.name, deck.scenes, id => { st[kind] = { mode: "list", deck: id, scene: null, i: 0 }; render(); }, n => { s.scene = n; s.i = 0; render(); }, decks));
  main.append(wrap);
  const list = $("#list");
  items.forEach((c, i) => {
    const p = prog[c.id]; const due = p && p.due <= endOfToday();
    const it = el(`<div class="li"><button class="play">${ICO.play}</button><button class="t"><div class="j jp">${esc(c.jp)}</div><div class="k jp">${esc(kanaLine(c))}${S.showHangul ? ` <span class="hg">${esc(kanaToHangul(c.kana))}</span>` : ""}</div><div class="m">${esc(c.ko)}${c.note ? " · " + esc(c.note) : ""}</div></button><span class="badge ${p ? (due ? "" : "ok") : "new"}">${p ? (due ? "시험 대기" : `${p.ok}승 ${p.ng}패`) : "새"}</span></div>`);
    it.querySelector(".play").onclick = () => { stopAll(); say(c); };
    it.querySelector(".t").onclick = () => { stopAll(); s.mode = "study"; s.i = i; render(); };
    list.append(it);
  });
}

// ---------- 회화 (상황극) ----------
let dg = { scene: null, i: 0, running: false, shown: [] };
function dialogTab(){
  const deck = DATA.decks.find(d => d.kind === "dialog");
  if (!deck) { main.append(header("회화")); main.append(el(`<div class="content"><div class="card">대화 덱이 없어요.</div></div>`)); return; }
  const scene = deck.scenes.find(x => x.name === dg.scene) || deck.scenes[0]; dg.scene = scene.name;
  const turns = scene.items.map(([role, jp, kana, ko]) => ({ role, jp, kana, ko }));
  main.append(header("회화", `${esc(scene.name)} · 상대 말은 앱이, 내 차례엔 내가`, speedSeg()));
  const wrap = el(`<div class="content">
    <div class="card" style="padding:14px 18px"><div class="chips" id="scenePick">${deck.scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === scene.name}">${esc(x.name)}</button>`).join("")}</div></div>
    <div class="chat" id="chat"></div>
    <div class="card" id="grade" hidden></div>
    <div class="row" id="ctl"><button class="btn fill" id="startBtn" style="flex:2;font-size:20px">▶ 처음부터</button><button class="btn" id="hintBtn">내 대사 ${S.myLine === "jp" ? "보기" : S.myLine === "kana" ? "가나만" : "숨김"}</button></div>
  </div>`);
  main.append(wrap);
  wrap.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { stopAll(); dg = { scene: b.dataset.s, i: 0, running: false, shown: [] }; render(); });
  $("#hintBtn").onclick = () => { S.myLine = S.myLine === "jp" ? "kana" : S.myLine === "kana" ? "hide" : "jp"; store.set("myLine", S.myLine); render(); };
  const chat = $("#chat");
  const bubble = (t, i) => el(`<div class="bub ${t.role}" data-i="${i}"><div class="who">${t.role === "them" ? "상대" : "나"}</div><div class="jp line">${t.role === "them" ? esc(t.jp) : S.myLine === "jp" ? esc(t.jp) : S.myLine === "kana" ? esc(t.kana) : "……"}</div><div class="ko">${esc(t.ko)}</div></div>`);
  const myCtl = (t, i) => { const r = el(`<div class="row mine"><button class="btn fill" id="say${i}">${ICO.mic} 말하기</button><button class="btn" id="hear${i}">정답 듣기</button><button class="btn" id="skip${i}">다음 ▶</button></div>`);
    r.querySelector(`#say${i}`).onclick = async () => { const g = await gradeSpeech({ jp: t.jp, kana: t.kana }, $("#grade"), r.querySelector(`#say${i}`)); if (g && g.score >= 0.7) { await sleep(900); next(i + 1); } };
    r.querySelector(`#hear${i}`).onclick = () => { stopAll(); speak(t.jp); const b = chat.querySelector(`.bub[data-i="${i}"] .line`); if (b) b.textContent = t.jp; };
    r.querySelector(`#skip${i}`).onclick = () => { stopAll(); next(i + 1); };
    return r; };
  async function next(i){
    chat.querySelectorAll(".row.mine").forEach(x => x.remove()); $("#grade").hidden = true;
    if (i >= turns.length) { chat.append(el(`<div class="muted" style="text-align:center;padding:10px">대화 끝. 처음부터 다시 해 볼까요?</div>`)); dg.running = false; return; }
    dg.i = i; const t = turns[i];
    chat.append(bubble(t, i)); chat.lastElementChild.scrollIntoView({ block: "nearest" });
    if (t.role === "them") { await speak(t.jp); await sleep(400); next(i + 1); }
    else { chat.append(myCtl(t, i)); chat.lastElementChild.scrollIntoView({ block: "nearest" }); }
  }
  $("#startBtn").onclick = () => { stopAll(); chat.innerHTML = ""; dg.running = true; next(0); };
}

// ---------- 설정 ----------
function settings(){
  refreshVoices();
  const total = Object.values(days).reduce((a, b) => a + (b.studied || 0) + (b.test || 0) + (b.new || 0) + (b.review || 0), 0);
  main.append(header("설정"));
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const wrap = el(`<div class="content">
    <div class="sec" style="margin:0 4px -6px">학습</div>
    <div class="list">
      <label class="li"><span class="t">하루 공부 목표<small>공부 탭에서 '다음'을 누른 새 카드 수. 시험은 목표와 상관없이 밀린 만큼 나와요</small></span>${sel("npd", [[5,"5장"],[10,"10장"],[15,"15장"],[20,"20장"],[30,"30장"]], S.newPerDay)}</label>
      <label class="li"><span class="t">따라하기 반복<small>듣기 → 말하기를 몇 번 할지</small></span>${sel("rep", [[1,"1번"],[2,"2번"],[3,"3번"]], S.repeatTimes)}</label>
      <label class="li"><span class="t">한글 발음 표시<small>예: きょう → 쿄오. 익숙해지면 꺼 보세요</small></span>${sel("hangul", [["1","보이기"],["0","숨기기"]], S.showHangul ? "1" : "0")}</label>
      <label class="li"><span class="t">읽는 법(가나) 표시<small>익숙해지면 꺼 보세요</small></span>${sel("kana", [["1","보이기"],["0","숨기기"]], S.showKana ? "1" : "0")}</label>
      <label class="li"><span class="t">일본어 목소리<small>${voices.length ? voices.length + "개 사용 가능" : "목록을 못 불러왔어요. 소리를 한 번 재생한 뒤 다시 열어 보세요."}</small></span><select id="voice"><option value="">자동(가장 좋은 것)</option>${voices.map(v => `<option value="${esc(v.name)}" ${S.voice === v.name ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      <button class="li" id="testVoice" style="color:var(--blue)">목소리 들어보기</button>
    </div>
    <div class="sec" style="margin:8px 4px -6px">애플펜슬·마이크</div>
    <div class="list">
      <label class="li"><span class="t">펜 굵기</span>${sel("penw", [[3,"가늘게"],[4,"보통"],[6,"굵게"]], S.penWidth)}</label>
      <label class="li"><span class="t">손가락으로도 쓰기<small>끄면 펜슬만 인식해서 손바닥이 닿아도 안 그려져요</small></span>${sel("finger", [["0","펜슬만"],["1","손가락도"]], S.fingerDraw ? "1" : "0")}</label>
      <div class="li"><span class="t">발음 확인(마이크)<small>${SR ? "이 기기에서 사용할 수 있어요. 처음 누르면 마이크 허용을 물어봐요." : "이 브라우저는 음성 인식을 지원하지 않아요. 사파리로 열어 보세요."}</small></span></div>
    </div>
    <div class="sec" style="margin:8px 4px -6px">덱 켜고 끄기</div>
    <div class="list" id="deckList"></div>
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
    <div class="muted" style="text-align:center;margin-top:8px">버전 ${window.APP_V || "1"} · 획순은 KanjiVG, 손글씨·발음 인식은 인터넷이 있을 때만</div>
  </div>`);
  main.append(wrap);
  const dl = $("#deckList");
  for (const d of DATA.decks) { if (d.kind === "dialog") continue; const on = S.activeDecks.includes(d.id); const { n } = deckCounts(d); const b = el(`<button class="li"><span class="t">${esc(d.name)}<small>${esc(d.desc || "")} · ${n}장</small></span><span class="ck">${on ? "✓ 켬" : "꺼짐"}</span></button>`); b.onclick = () => toggleDeck(d.id); dl.append(b); }
  $("#npd").onchange = e => { S.newPerDay = +e.target.value; store.set("newPerDay", S.newPerDay); };
  $("#rep").onchange = e => { S.repeatTimes = +e.target.value; store.set("repeatTimes", S.repeatTimes); };
  $("#kana").onchange = e => { S.showKana = e.target.value === "1"; store.set("showKana", S.showKana); };
  $("#hangul").onchange = e => { S.showHangul = e.target.value === "1"; store.set("showHangul", S.showHangul); };
  $("#voice").onchange = e => { S.voice = e.target.value; store.set("voice", S.voice); };
  $("#penw").onchange = e => { S.penWidth = +e.target.value; store.set("penWidth", S.penWidth); };
  $("#finger").onchange = e => { S.fingerDraw = e.target.value === "1"; store.set("fingerDraw", S.fingerDraw); };
  $("#testVoice").onclick = () => speak("今日は来てくれてありがとう。楽しんでますか？");
  $("#exportBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ prog, days, settings: S }, null, 1)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `일본어기록_${todayKey()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  $("#importFile").onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (d.prog) prog = d.prog; if (d.days) days = d.days; store.set("prog", prog); store.set("days", days); migrateProg(); toast("가져왔어요"); render(); } catch { toast("파일을 읽지 못했어요"); } };
  let armed = false;
  $("#resetBtn").onclick = () => { if (!armed) { armed = true; $("#resetBtn").textContent = "정말 초기화 (한 번 더 누르기)"; setTimeout(() => { armed = false; const b = $("#resetBtn"); if (b) b.textContent = "기록 초기화"; }, 4000); return; } prog = {}; days = {}; store.set("prog", prog); store.set("days", days); testSession = { word: null, sentence: null }; toast("초기화했어요"); render(); };
}

// ---------- 시작 ----------
load().then(() => { migrateProg(); render(); }).catch(e => { main.innerHTML = `<div class="card" style="margin:20px">카드 파일을 불러오지 못했어요. 인터넷을 확인하고 다시 열어 주세요.<br><small>${esc(e)}</small></div>`; });
let rw = window.innerWidth >= 900; window.addEventListener("resize", () => { const w = window.innerWidth >= 900; if (w !== rw) { rw = w; renderSide(); } });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
