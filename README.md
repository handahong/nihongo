# 일본어 단어장 — 아이폰 홈 화면 설치용

맥도 Xcode도 개발자 계정도 필요 없음. 만료 없음. 비용 0.

## 파일

- `index.html` — 앱 전부 (화면, 복습 알고리즘, 데이터)
- `manifest.json` — 앱 이름과 아이콘 정보
- `sw.js` — 오프라인용 캐시
- `icon-*.png`, `apple-touch-icon.png` — 홈 화면 아이콘

## 올리는 법 (GitHub Pages, 무료)

1. github.com 가입 → 오른쪽 위 `+` → **New repository**
2. 이름은 아무거나 (예: `nihongo`), **Public** 선택 → Create
3. 저장소 화면에서 **Add file → Upload files** → 이 폴더의 파일을 전부 끌어다 놓고 Commit
4. 위쪽 **Settings** 탭 → 왼쪽 **Pages** → Source를 `Deploy from a branch`,
   Branch를 `main` / `/(root)` 로 두고 Save
5. 1~2분 뒤 Pages 화면에 `https://아이디.github.io/nihongo/` 주소가 뜸

`Public`이어야 Pages가 무료로 동작함. 코드는 공개되지만 학습 기록은 폰 안에만 있고
어디로도 전송되지 않음.

## 아이폰에 설치

1. **사파리로** 위 주소를 연다 (크롬은 홈 화면 추가가 제대로 안 됨)
2. 아래 공유 버튼 → **홈 화면에 추가** → 추가
3. 홈 화면에 아이콘이 생김. 누르면 주소창 없이 전체화면으로 열림

설치 후에는 인터넷 없이도 동작함.

## 고칠 때

복습 간격이 몸에 안 맞으면 `index.html` 안의 `nextCard` 함수만 고치면 됨.
신규 카드 하루 개수는 `NEW_PER_DAY`, 학습 단계는 `STEPS`.

파일을 고쳐서 다시 올릴 때는 `sw.js` 첫 줄의 `jp-srs-v1` 을 `jp-srs-v2` 처럼
숫자를 올려야 새 버전이 폰에 반영됨. 안 올리면 캐시된 옛날 화면이 계속 뜸.

## 백업

홈 화면에 추가한 웹앱은 사파리의 7일 저장소 삭제 대상이 아니라서 기록이 유지됨.
다만 저장 공간이 심하게 부족하거나 사파리 데이터를 통째로 지우면 날아갈 수 있으니,
가끔 기록 탭에서 **내보내기**를 눌러 파일로 남겨두면 안전함.
