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
  showHangul: store.get("showHangul", true), reviewMode: store.get("reviewMode", "alt"), myLine: store.get("myLine", "kana"),
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

// ---------- 빈칸 채우기 ----------
// 문장에서 2~4글자 덩어리 하나를 비운다. 같은 카드는 같은 날 같은 자리가 비도록 날짜로 고정.
function clozeOf(c){
  const chars = [...c.jp]; const isJ = ch => /[぀-ヿ一-鿿々]/.test(ch);
  const runs = []; let s = -1;
  for (let i = 0; i <= chars.length; i++) { if (i < chars.length && isJ(chars[i])) { if (s < 0) s = i; } else if (s >= 0) { runs.push([s, i]); s = -1; } }
  if (!runs.length) return null;
  const seed = [...(c.id + todayKey())].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const [rs, re] = runs[seed % runs.length];
  const maxLen = Math.min(4, re - rs); const len = Math.max(1, Math.min(maxLen, 2 + (seed >>> 3) % 3));
  const start = rs + ((seed >>> 6) % (re - rs - len + 1));
  return { pre: chars.slice(0, start).join(""), blank: chars.slice(start, start + len).join(""), post: chars.slice(start + len).join("") };
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
    box.innerHTML = svg.replace(/<\?xml[^>]*>|<!DOCTYPE[\s\S]*?>|<!--[\s\S]*?-->/g, "");
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
function setTab(t){ stopAll(); closeModal(); if (t !== "study") session = null; tab = t; render(); }
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
function deckCounts(d){ const all = CARDS.filter(c => c.deck === d.id); return { n: d.kind === "dialog" ? d.scenes.length : all.length, done: all.filter(c => prog[c.id]).length }; }
const answerHtml = c => `<div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div>${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}`;
function pickers(deckSel, sceneSel, scenes, onDeck, onScene, filter){
  const decks = DATA.decks.filter(filter || (() => true));
  const w = el(`<div class="card" style="padding:14px 18px"><div class="chips" id="deckPick">${decks.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === deckSel}">${esc(d.name)}</button>`).join("")}</div>
    <div class="chips" id="scenePick" style="margin-top:8px">${scenes.map(x => `<button data-s="${esc(x.name)}" aria-pressed="${x.name === sceneSel}">${esc(x.name)}</button>`).join("")}</div></div>`);
  w.querySelectorAll("#deckPick button").forEach(b => b.onclick = () => { stopAll(); onDeck(b.dataset.d); });
  w.querySelectorAll("#scenePick button").forEach(b => b.onclick = () => { stopAll(); onScene(b.dataset.s); });
  return w;
}

function renderSide(){
  const side = $("#side"); side.innerHTML = "";
  const todayN = kindStat("word").due + kindStat("word").fresh + kindStat("sentence").due + kindStat("sentence").fresh;
  const cur = (tab === "study" ? "home" : tab);
  const item = (id, color, ico, label, right) => { const b = el(`<button class="srow" aria-current="${cur === id}"><span class="ic" style="background:${color}">${ico}</span><span>${label}</span>${right}</button>`); b.onclick = () => setTab(id); return b; };
  side.append(el(`<h1>일본어</h1>`));
  side.append(item("home", "var(--blue)", ICO.today, "오늘", `<span class="n">${todayN || ""}</span>`));
  side.append(item("shadow", "var(--orange)", ICO.shadow, "따라 말하기", ""));
  side.append(item("write", "var(--green)", ICO.pen, "쓰기 연습", ""));
  side.append(item("dialog", "var(--red)", ICO.talk, "대화 연습", ""));
  side.append(item("browse", "var(--purple)", ICO.browse, "둘러보기", ""));
  side.append(el(`<div class="sec">덱 (눌러서 켜고 끄기)</div>`));
  for (const d of DATA.decks) {
    if (d.kind === "dialog") continue;
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<button class="srow ${on ? "" : "dim"}"><span>${esc(d.name)}</span><span class="n">${done}/${n}</span><span class="ck">${on ? "✓" : ""}</span></button>`);
    b.onclick = () => toggleDeck(d.id); side.append(b);
  }
  side.append(el(`<div class="sec">기록</div>`));
  side.append(el(`<div class="srow"><span>연속</span><span class="n">${streak()}일</span></div>`));
  side.append(el(`<div class="spacer"></div>`));
  side.append(item("settings", "var(--gray)", ICO.settings, "설정", ""));
  const nav = $("#nav"); nav.innerHTML = "";
  for (const [id, label, ico] of [["home","오늘",ICO.today],["shadow","말하기",ICO.shadow],["write","쓰기",ICO.pen],["dialog","대화",ICO.talk],["browse","둘러보기",ICO.browse],["settings","설정",ICO.settings]]) {
    const b = el(`<button aria-selected="${cur === id}">${ico}${label}</button>`); b.onclick = () => setTab(id); nav.append(b);
  }
}
function render(){ main.innerHTML = ""; renderSide(); ({ home, shadow: shadowTab, write: writeTab, dialog: dialogTab, browse, settings, study }[tab])(); main.scrollTop = 0; }

// ---------- 오늘 ----------
const KINDS = [["word", "단어", "짧게 외우기 · 한 단어씩"], ["sentence", "문장", "통째로 외우기 · 문법과 회화"]];
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
    if (d.kind === "dialog") continue;
    const on = S.activeDecks.includes(d.id); const { n, done } = deckCounts(d);
    const b = el(`<button class="li"><span class="t">${esc(d.name)}<small>${esc(d.desc || "")}</small></span><span class="v">${done}/${n}</span><span class="ck">${on ? "✓" : ""}</span></button>`);
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
  // 새 카드: 글자와 안내선을 보여 주고 따라 쓰기. 복습: 받아쓰기 또는 빈칸 채우기.
  const trace = isNew && S.guideNew;
  const seen = prog[c.id] ? prog[c.id].seen : 0;
  const cloze = !trace && kind === "sentence" && (S.reviewMode === "cloze" || (S.reviewMode === "alt" && seen % 2 === 1)) ? clozeOf(c) : null;
  const modeLabel = trace ? "새 카드" : cloze ? "복습 · 빈칸" : "복습 · 받아쓰기";
  main.append(header(kname + " 공부", `${s.i + 1} / ${s.total} · ${modeLabel}`, speedSeg()));
  const quizHtml = cloze
    ? `<span class="q jp cloze">${esc(cloze.pre)}<span class="blank">${"　".repeat(Math.max(2, [...cloze.blank].length))}</span>${esc(cloze.post)}</span><span class="w">빈칸에 들어갈 글자를 써 보세요</span>`
    : `<span class="q">듣고 아래에 써 보세요</span><span class="w">${esc(c.deckName)} › ${esc(c.scene)}${c.audio ? " · 실제 음성" : ""}</span>`;
  const wrap = el(`<div class="content fill">
    <div class="prog"><i style="width:${(s.i / s.total) * 100}%"></i></div>
    <div class="ans ${trace ? "" : "quiz"}" id="ans">${trace ? answerHtml(c) : quizHtml}</div>
    <div class="row"><button class="btn fill" id="playBtn">${ICO.play} 듣기</button><button class="btn" id="shadowBtn">${ICO.repeat} 따라하기</button><button class="btn" id="micBtn">${ICO.mic} 발음</button><button class="btn" id="strokeBtn">획순</button><button class="btn" id="gradeBtn" style="color:var(--green)">✓ 채점</button><button class="btn" id="revealBtn" ${trace ? "hidden" : ""}>정답</button></div>
    <div class="phase" id="phase"></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:300px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="rate" id="rate" ${trace ? "" : "hidden"}><button class="no" data-g="0">모름<small>5분 뒤 다시</small></button><button class="mid" data-g="1">애매<small>조금 뒤 다시</small></button><button class="ok" data-g="2">알아<small>${isNew ? "내일" : "더 나중에"}</small></button></div>
  </div>`);
  main.append(wrap);
  const target = cloze ? { ...c, jp: cloze.blank, kana: "" } : c;
  const pad = makePad({ guide: cloze ? cloze.blank : c.jp, kana: cloze ? "" : (S.showKana ? kanaLine(c) : ""), showGuide: trace, hint: trace ? "연한 글자를 따라 써 보세요" : cloze ? "빈칸 부분만 써 보세요" : "펜슬로 들은 문장을 써 보세요" });
  $("#padSlot").append(pad.el);
  const phase = t => { const p = $("#phase"); if (p) p.textContent = t; };
  $("#playBtn").onclick = () => { stopAll(); phase("듣기"); say(c).then(() => phase("")); };
  $("#shadowBtn").onclick = () => { stopAll(); shadow(c, S.repeatTimes, phase); };
  $("#strokeBtn").onclick = () => { stopAll(); showStrokes(c.jp); };
  const reveal = () => { const a = $("#ans"); a.classList.remove("quiz"); a.innerHTML = answerHtml(c); pad.showGuide(true); if (cloze) pad.setGuide(c.jp, S.showKana ? kanaLine(c) : ""); $("#rate").hidden = false; $("#revealBtn").hidden = true; };
  $("#revealBtn").onclick = reveal;
  const suggest = g => { if (!g) return; const hint = g.dist === 0 ? "알아" : g.score >= 0.7 ? "애매" : "모름"; const b = $("#rate"); if (b) b.querySelectorAll("button").forEach(x => x.style.outline = x.textContent.startsWith(hint) ? "2px solid var(--blue)" : ""); };
  $("#gradeBtn").onclick = async () => { const box = $("#grade"); box.hidden = false; box.scrollIntoView({ block: "nearest" }); const g = await gradePad(pad, target, box); if (g) { reveal(); suggest(g); } };
  $("#micBtn").onclick = async () => { stopAll(); const g = await gradeSpeech(c, $("#grade"), $("#micBtn")); if (g) { reveal(); suggest(g); } };
  wrap.querySelectorAll("#rate button").forEach(b => b.onclick = () => { stopAll(); rate(c, +b.dataset.g); s.done++; if (+b.dataset.g === 0) { s.q.push(c); s.total++; } s.i++; render(); });
  if (isNew) setTimeout(() => shadow(c, S.repeatTimes, phase), 250); else setTimeout(() => say(c), 250);
}

// ---------- 쓰기 연습 ----------
let wr = { deck: null, scene: null, i: 0, guide: true };
function writeTab(){
  const deck = DATA.decks.find(d => d.id === wr.deck && d.kind !== "dialog") || DATA.decks.find(d => d.kind !== "dialog"); wr.deck = deck.id;
  const scenes = deck.scenes; const scene = scenes.find(x => x.name === wr.scene) || scenes[0]; wr.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  wr.i = Math.min(wr.i, items.length - 1);
  const c = items[wr.i];
  main.append(header("쓰기 연습", `${esc(deck.name)} › ${esc(scene.name)} · ${wr.i + 1} / ${items.length}`, speedSeg()));
  const wrap = el(`<div class="content fill">
    <div class="ans quiz" id="ans"><span class="q">${esc(c.ko)}</span><span class="w">${S.showHangul ? `<span class="hg">${esc(hangulLine(c))}</span> ` : ""}${c.note ? esc(c.note) : ""}</span></div>
    <div id="padSlot" style="display:flex;flex:1;min-height:300px"></div>
    <div class="card" id="grade" hidden></div>
    <div class="row"><button class="btn" id="prevBtn">◀</button><button class="btn fill" id="playBtn">${ICO.play} 듣기</button><button class="btn" id="strokeBtn">획순</button><button class="btn" id="gradeBtn" style="color:var(--green)">✓ 채점</button><button class="btn" id="modeBtn">${wr.guide ? "받아쓰기로" : "따라 쓰기로"}</button><button class="btn" id="nextBtn">▶</button></div>
  </div>`);
  wrap.prepend(pickers(deck.id, scene.name, scenes, id => { wr.deck = id; wr.scene = null; wr.i = 0; render(); }, n => { wr.scene = n; wr.i = 0; render(); }, d => d.kind !== "dialog"));
  main.append(wrap);
  const pad = makePad({ guide: c.jp, kana: S.showKana ? kanaLine(c) : "", showGuide: wr.guide, hint: wr.guide ? "연한 글자를 따라 써 보세요" : "듣고 받아써 보세요" });
  $("#padSlot").append(pad.el);
  if (!wr.guide) { const a = $("#ans"); a.innerHTML = `<span class="q">듣고 써 보세요</span><span class="sp" style="flex:1"></span><button class="btn" id="showBtn" style="flex:none;min-height:40px;padding:8px 14px;font-size:15px">정답 보기</button>`; $("#showBtn").onclick = () => { a.innerHTML = `<span class="q jp">${esc(c.jp)}</span><span class="w">${esc(c.ko)}</span>`; pad.showGuide(true); }; }
  $("#prevBtn").onclick = () => { stopAll(); wr.i = (wr.i - 1 + items.length) % items.length; render(); };
  $("#nextBtn").onclick = () => { stopAll(); wr.i = (wr.i + 1) % items.length; render(); };
  $("#playBtn").onclick = () => { stopAll(); say(c); };
  $("#strokeBtn").onclick = () => { stopAll(); showStrokes(c.jp); };
  $("#modeBtn").onclick = () => { stopAll(); wr.guide = !wr.guide; render(); };
  $("#gradeBtn").onclick = async () => { const box = $("#grade"); box.hidden = false; const g = await gradePad(pad, c, box); if (g && !wr.guide) { const a = $("#ans"); a.innerHTML = `<span class="q jp">${esc(c.jp)}</span><span class="w">${esc(c.ko)}</span>`; pad.showGuide(true); } };
  setTimeout(() => say(c), 250);
}

// ---------- 따라 말하기 ----------
let sh = { deck: null, scene: null, i: 0, running: false };
function shadowTab(){
  const deck = DATA.decks.find(d => d.id === sh.deck && d.kind !== "dialog") || DATA.decks.find(d => d.kind !== "dialog"); sh.deck = deck.id;
  const scenes = deck.scenes; const scene = scenes.find(x => x.name === sh.scene) || scenes[0]; sh.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && c.scene === scene.name);
  sh.i = Math.min(sh.i, items.length - 1);
  const c = items[sh.i];
  main.append(header("따라 말하기", `${esc(deck.name)} › ${esc(scene.name)}`, speedSeg()));
  const wrap = el(`<div class="content">
    <div class="qcard open" id="qcard"><div class="where">${sh.i + 1} / ${items.length}</div><div class="main jp">${esc(c.jp)}</div><div class="kana jp" ${S.showKana ? "" : "hidden"}>${esc(kanaLine(c))}</div><div class="hg" ${S.showHangul ? "" : "hidden"}>${esc(hangulLine(c))}</div><div class="ko">${esc(c.ko)}</div></div>
    <div class="phase" id="phase">${sh.running ? "" : "시작을 누르면 한 문장씩: 듣기 → 따라 말하기 → 다시 듣기 → 다음 문장"}</div>
    <div class="card" id="grade" hidden></div>
    <div class="row"><button class="btn" id="prevBtn">◀ 이전</button><button class="btn fill" id="runBtn" style="flex:2;font-size:20px">${sh.running ? "■ 멈춤" : "▶ 시작"}</button><button class="btn" id="micBtn">${ICO.mic} 발음 확인</button><button class="btn" id="nextBtn">다음 ▶</button></div>
  </div>`);
  wrap.prepend(pickers(deck.id, scene.name, scenes, id => { sh = { deck: id, scene: null, i: 0, running: false }; render(); }, n => { sh.scene = n; sh.i = 0; sh.running = false; render(); }, d => d.kind !== "dialog"));
  main.append(wrap);
  $("#prevBtn").onclick = () => { stopAll(); sh.i = (sh.i - 1 + items.length) % items.length; sh.running = false; render(); };
  $("#nextBtn").onclick = () => { stopAll(); sh.i = (sh.i + 1) % items.length; sh.running = false; render(); };
  $("#qcard").onclick = () => { stopAll(); sh.running = false; say(c); };
  $("#micBtn").onclick = async () => { stopAll(); sh.running = false; await gradeSpeech(items[sh.i], $("#grade"), $("#micBtn")); };
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

// ---------- 대화 연습 (상황극) ----------
let dg = { scene: null, i: 0, running: false, shown: [] };
function dialogTab(){
  const deck = DATA.decks.find(d => d.kind === "dialog");
  if (!deck) { main.append(header("대화 연습")); main.append(el(`<div class="content"><div class="card">대화 덱이 없어요.</div></div>`)); return; }
  const scene = deck.scenes.find(x => x.name === dg.scene) || deck.scenes[0]; dg.scene = scene.name;
  const turns = scene.items.map(([role, jp, kana, ko]) => ({ role, jp, kana, ko }));
  main.append(header("대화 연습", `${esc(scene.name)} · 상대 말은 앱이, 내 차례엔 내가`, speedSeg()));
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

// ---------- 둘러보기 ----------
let br = { deck: null, scene: null };
function browse(){
  const deck = DATA.decks.find(d => d.id === br.deck && d.kind !== "dialog") || DATA.decks.find(d => d.kind !== "dialog"); br.deck = deck.id;
  const scenes = [{ name: "전체" }, ...deck.scenes]; const scene = scenes.find(x => x.name === br.scene) || scenes[0]; br.scene = scene.name;
  const items = CARDS.filter(c => c.deck === deck.id && (scene.name === "전체" || c.scene === scene.name));
  main.append(header("둘러보기", `${items.length}장`));
  const wrap = el(`<div class="content"><div class="muted" style="margin:-4px 4px 0">재생 버튼은 듣기, 글자를 누르면 따라 말하기 한 번</div><div class="list" id="list"></div></div>`);
  wrap.prepend(pickers(deck.id, scene.name, scenes, id => { br = { deck: id, scene: null }; render(); }, n => { br.scene = n; render(); }, d => d.kind !== "dialog"));
  main.append(wrap);
  const list = $("#list");
  for (const c of items) {
    const p = prog[c.id];
    const it = el(`<div class="li"><button class="play">${ICO.play}</button><button class="t"><div class="j jp">${esc(c.jp)}</div><div class="k jp">${esc(kanaLine(c))}${S.showHangul ? ` <span class="hg">${esc(kanaToHangul(c.kana))}</span>` : ""}</div><div class="m">${esc(c.ko)}${c.note ? " · " + esc(c.note) : ""}</div></button><span class="badge ${p ? (p.step >= 4 ? "ok" : "") : "new"}">${p ? (p.step >= 4 ? "외움" : "학습 중") : "새"}</span></div>`);
    it.querySelector(".play").onclick = () => { stopAll(); say(c); };
    it.querySelector(".t").onclick = () => { stopAll(); shadow(c, 1); };
    list.append(it);
  }
}

// ---------- 설정 ----------
function settings(){
  refreshVoices();
  const total = Object.values(days).reduce((a, b) => a + b.new + b.review, 0);
  main.append(header("설정"));
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const wrap = el(`<div class="content">
    <div class="sec" style="margin:0 4px -6px">학습</div>
    <div class="list">
      <label class="li"><span class="t">하루 새 카드<small>단어·문장 각각. 복습은 별도로 다 나와요</small></span>${sel("npd", [[5,"5장"],[10,"10장"],[15,"15장"],[20,"20장"]], S.newPerDay)}</label>
      <label class="li"><span class="t">복습 방식<small>받아쓰기 = 문장 전체, 빈칸 = 한 군데만</small></span>${sel("rmode", [["alt","번갈아"],["dict","받아쓰기만"],["cloze","빈칸만"]], S.reviewMode)}</label>
      <label class="li"><span class="t">따라 말하기 반복<small>듣기 → 말하기를 몇 번 할지</small></span>${sel("rep", [[1,"1번"],[2,"2번"],[3,"3번"]], S.repeatTimes)}</label>
      <label class="li"><span class="t">한글 발음 표시<small>예: きょう → 쿄오. 익숙해지면 꺼 보세요</small></span>${sel("hangul", [["1","보이기"],["0","숨기기"]], S.showHangul ? "1" : "0")}</label>
      <label class="li"><span class="t">읽는 법(가나) 표시<small>익숙해지면 꺼 보세요</small></span>${sel("kana", [["1","보이기"],["0","숨기기"]], S.showKana ? "1" : "0")}</label>
      <label class="li"><span class="t">일본어 목소리<small>${voices.length ? voices.length + "개 사용 가능" : "목록을 못 불러왔어요. 소리를 한 번 재생한 뒤 다시 열어 보세요."}</small></span><select id="voice"><option value="">자동(가장 좋은 것)</option>${voices.map(v => `<option value="${esc(v.name)}" ${S.voice === v.name ? "selected" : ""}>${esc(v.name)}</option>`).join("")}</select></label>
      <button class="li" id="testVoice" style="color:var(--blue)">목소리 들어보기</button>
    </div>
    <div class="sec" style="margin:8px 4px -6px">애플펜슬·마이크</div>
    <div class="list">
      <label class="li"><span class="t">펜 굵기</span>${sel("penw", [[3,"가늘게"],[4,"보통"],[6,"굵게"]], S.penWidth)}</label>
      <label class="li"><span class="t">손가락으로도 쓰기<small>끄면 펜슬만 인식해서 손바닥이 닿아도 안 그려져요</small></span>${sel("finger", [["0","펜슬만"],["1","손가락도"]], S.fingerDraw ? "1" : "0")}</label>
      <label class="li"><span class="t">새 카드는 안내선 따라 쓰기<small>끄면 새 카드도 듣고 받아쓰기</small></span>${sel("gnew", [["1","켬"],["0","끔"]], S.guideNew ? "1" : "0")}</label>
      <div class="li"><span class="t">발음 확인(마이크)<small>${SR ? "이 기기에서 사용할 수 있어요. 처음 누르면 마이크 허용을 물어봐요." : "이 브라우저는 음성 인식을 지원하지 않아요. 사파리로 열어 보세요."}</small></span></div>
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
    <div class="muted" style="text-align:center;margin-top:8px">버전 ${window.APP_V || "1"} · 획순은 KanjiVG, 손글씨·발음 인식은 인터넷이 있을 때만</div>
  </div>`);
  main.append(wrap);
  $("#npd").onchange = e => { S.newPerDay = +e.target.value; store.set("newPerDay", S.newPerDay); };
  $("#rmode").onchange = e => { S.reviewMode = e.target.value; store.set("reviewMode", S.reviewMode); };
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
