// 가나 → 한글 발음 변환 (app.js 가 HD.kanaToHangul 로 사용)
(() => {
"use strict";
const HD = window.HD = window.HD || {};
// ---------- 가나 → 한글 발음 ----------
// 학습용 표기: か행은 카, た행은 타 (어두 무성음도 거센소리로 통일). っ은 받침(ㄱ/ㅅ/ㅂ), ん은 뒤 소리에 따라 ㄴ/ㅁ/ㅇ 받침. お단+う는 장음 '오'.
const KH = {
  "あ":"아","い":"이","う":"우","え":"에","お":"오","か":"카","き":"키","く":"쿠","け":"케","こ":"코","さ":"사","し":"시","す":"스","せ":"세","そ":"소",
  "た":"타","ち":"치","つ":"츠","て":"테","と":"토","な":"나","に":"니","ぬ":"누","ね":"네","の":"노","は":"하","ひ":"히","ふ":"후","へ":"헤","ほ":"호",
  "ま":"마","み":"미","む":"무","め":"메","も":"모","や":"야","ゆ":"유","よ":"요","ら":"라","り":"리","る":"루","れ":"레","ろ":"로","わ":"와","を":"오",
  "が":"가","ぎ":"기","ぐ":"구","げ":"게","ご":"고","ざ":"자","じ":"지","ず":"즈","ぜ":"제","ぞ":"조","だ":"다","ぢ":"지","づ":"즈","で":"데","ど":"도",
  "ば":"바","び":"비","ぶ":"부","べ":"베","ぼ":"보","ぱ":"파","ぴ":"피","ぷ":"푸","ぺ":"페","ぽ":"포",
  "きゃ":"캣","きゅ":"큐","きょ":"켄","しゃ":"샤","しゅ":"슈","しょ":"쇼","ちゃ":"차","ちゅ":"추","ちょ":"초","にゃ":"냐","にゅ":"뉴","にょ":"뇨",
  "ひゃ":"햐","ひゅ":"휴","ひょ":"효","みゃ":"먀","みゅ":"뮸","みょ":"묘","りゃ":"랴","りゅ":"류","りょ":"료","ぎゃ":"갸","ぎゅ":"규","ぎょ":"교",
  "じゃ":"자","じゅ":"주","じょ":"조","びゃ":"밾","びゅ":"뷰","びょ":"뵤","ぴゃ":"필","ぴゅ":"퓨","ぴょ":"표",
  "てぃ":"티","でぃ":"디","とぅ":"투","どぅ":"두","ふぁ":"파","ふぃ":"피","ふぇ":"페","ふぉ":"포","うぃ":"위","うぇ":"웨","うぉ":"워","ゔ":"부",
  "しぇ":"셰","じぇ":"제","ちぇ":"체","つぁ":"차","つぇ":"체","つぉ":"초","いぇ":"예","ゔぁ":"바","ゔぃ":"비","ゔぇ":"베","ゔぉ":"보",
};
const JONG = { k: 1, n: 4, m: 16, p: 17, s: 19, ng: 21 };
const toHira = s => s.replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
const addJong = (syl, j) => { const c = syl.charCodeAt(syl.length - 1) - 0xAC00; if (c < 0 || c > 11171 || c % 28 !== 0) return syl; return syl.slice(0, -1) + String.fromCharCode(0xAC00 + c + j); };
const vowelOf = syl => { const c = syl.charCodeAt(syl.length - 1) - 0xAC00; return c >= 0 ? Math.floor(c / 28) % 21 : -1; }; // 8=ㅗ 12=ㅛ 13=ㅜ 17=ㅠ
function kanaToHangul(kana){
  if (!kana) return "";
  return kana.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return " ";
    let s = toHira(tok); const out = [];
    // 조사 は → 와, へ → 에 (단어 끝에 올 때)
    if (s.length === 1 && s === "は") return "와"; if (s.length === 1 && s === "へ") return "에";
    for (let i = 0; i < s.length; i++) {
      const two = s.slice(i, i + 2), one = s[i];
      if (two.length === 2 && /[ゃゅょぁぃぅぇぉ]$/.test(two) && KH[two]) { out.push(KH[two]); i++; continue; }
      if (one === "は" && i === s.length - 1 && s.length > 1 && !/^(はは|おはは)$/.test(s)) { out.push("와"); continue; }
      if (one === "っ") { const nx = toHira(s.slice(i + 1, i + 2)); const h = KH[nx] || ""; const j = /^[かきくけこ]/.test(nx) || /^[がぎぐげご]/.test(nx) ? JONG.k : /^[ぱぴぷぺぽ]/.test(nx) ? JONG.p : JONG.s; if (out.length) out[out.length - 1] = addJong(out[out.length - 1], j); continue; }
      if (one === "ん") { const nx = s[i + 1] || ""; const j = /[まみむめもばびぶべぼぱぴぷぺぽ]/.test(nx) ? JONG.m : /[かきくけこがぎぐげご]/.test(nx) ? JONG.ng : JONG.n; if (out.length) out[out.length - 1] = addJong(out[out.length - 1], j); else out.push("ㄴ"); continue; }
      if (one === "ー") { if (out.length) { const v = vowelOf(out[out.length - 1]); out.push(v === 0 ? "아" : v === 20 ? "이" : v === 13 || v === 17 ? "우" : v === 5 ? "에" : v === 8 || v === 12 ? "오" : "ー"); } continue; }
      if (one === "う" && out.length) { const v = vowelOf(out[out.length - 1]); if (v === 8 || v === 12) { out.push("오"); continue; } } // お단 + う = 장음
      if (KH[one]) { out.push(KH[one]); continue; }
      out.push(one); // 한자·기호는 그대로
    }
    return out.join("");
  }).join("");
}
HD.kanaToHangul = kanaToHangul;
})();
