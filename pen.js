// 애플펜슬 쓰기 공간 + 손글씨 자동 채점 (app.js 가 HD.makePad / HD.gradePad 로 사용)
(() => {
"use strict";
const HD = window.HD = window.HD || {};
const el = (...a) => HD.el(...a), esc = (...a) => HD.esc(...a);
const S = new Proxy({}, { get: (_, k) => HD.S[k], set: (_, k, v) => { HD.S[k] = v; return true; } });
const store = { get: (...a) => HD.store.get(...a), set: (...a) => HD.store.set(...a) };
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
  function drawStroke(st){ if (st.pts.length === 1) dot(st, st.pts[0]); for (let i = 1; i < st.pts.length; i++) seg(st, st.pts[i-1], st.pts[i]); }
  function redraw(){ ctx.clearRect(0, 0, W, H); for (const st of strokes) drawStroke(st); if (cur) drawStroke(cur); }
  const t0 = Date.now();
  const pt = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5, t: Date.now() - t0 }; };
  const allowed = e => e.pointerType === "pen" || e.pointerType === "mouse" || (e.pointerType === "touch" && S.fingerDraw);
  // 획 끝 신호(pointerup)가 유실돼도 다음 획이 막히지 않게: 새 획이 시작되면 이전 획을 먼저 마무리한다.
  const finish = () => { if (cur) { if (cur.pts.length) strokes.push(cur); cur = null; } };
  cv.addEventListener("pointerdown", e => { if (!allowed(e)) return; e.preventDefault(); finish(); try { cv.setPointerCapture(e.pointerId); } catch {} cur = { id: e.pointerId, ink: S.ink, pts: [pt(e)] }; dot(cur, cur.pts[0]); });
  cv.addEventListener("pointermove", e => { if (!cur || e.pointerId !== cur.id) return; e.preventDefault(); const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; for (const ev of evs) { const q = pt(ev); const a = cur.pts[cur.pts.length-1]; if (Math.hypot(q.x - a.x, q.y - a.y) < 0.6) continue; seg(cur, a, q); cur.pts.push(q); } });
  const up = e => { if (!cur || e.pointerId !== cur.id) return; finish(); };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up); cv.addEventListener("lostpointercapture", up);
  // 사파리가 펜슬 터치를 스크롤·제스처로 가져가지 않게 (손가락 스크롤은 그대로 둠)
  const stopTouch = e => { const t = e.touches && e.touches[0]; if (cur || (t && t.touchType === "stylus") || S.fingerDraw) e.preventDefault(); };
  cv.addEventListener("touchstart", stopTouch, { passive: false }); cv.addEventListener("touchmove", stopTouch, { passive: false });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  root.querySelector('[data-act="undo"]').onclick = () => { strokes.pop(); redraw(); };
  root.querySelector('[data-act="clear"]').onclick = () => { strokes = []; redraw(); };
  root.querySelector('[data-act="guide"]').onclick = e => { const on = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", on); g.hidden = !on; };
  root.querySelectorAll(".dot").forEach(b => b.onclick = () => { S.ink = b.dataset.ink; store.set("ink", S.ink); root.querySelectorAll(".dot").forEach(x => x.setAttribute("aria-pressed", x.dataset.ink === S.ink)); });
  let raf = 0; const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(size); }); ro.observe(sheet);
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
// 후보 글자들을 정답과 비교해 결과 칸에 그린다 (손글씨·발음 공통)
function showGrade(box, cands, card, label){
  const g = gradeInk(cands, card);
  const chars = g.out.map(o => o.ch ? `<span class="${o.ok ? "ok" : "miss"}">${esc(o.ch)}</span>` : `<span class="extra">${esc(o.got)}</span>`).join("");
  const perfect = g.dist === 0;
  box.innerHTML = `<div class="gr ${perfect ? "pass" : g.score >= 0.7 ? "near" : "fail"}"><div class="v">${perfect ? "맞았어요" : g.score >= 0.7 ? `거의 맞았어요 · ${g.dist}글자 다름` : "다시 해 볼까요"}</div><div class="chars jp">${chars}</div><div class="muted">${label}: <span class="jp">${esc(g.got)}</span>${cands.filter(x => x !== g.got).length ? ` · 다른 후보: ${cands.filter(x => x !== g.got).slice(0, 3).map(esc).join(", ")}` : ""}</div></div>`;
  return g;
}
async function gradePad(pad, card, box){
  if (pad.isEmpty()) { box.innerHTML = `<span class="muted">먼저 펜슬로 써 주세요.</span>`; return null; }
  box.innerHTML = `<span class="muted">글자를 읽는 중…</span>`;
  try {
    const cands = await recognizeInk(pad.ink());
    if (!cands.length) { box.innerHTML = `<span class="muted">글자를 읽지 못했어요. 조금 더 크게, 한 줄로 써 보세요.</span>`; return null; }
    return showGrade(box, cands, card, "읽힌 글자");
  } catch (e) {
    box.innerHTML = `<span class="muted">${e.name === "AbortError" ? "인식 서버가 응답이 없어요." : "인터넷이 있어야 자동 채점이 돼요."} 정답을 보고 직접 고르세요.</span>`;
    return null;
  }
}

HD.makePad = makePad; HD.gradePad = gradePad; HD.showGrade = showGrade; HD.gradeText = gradeInk;
})();
