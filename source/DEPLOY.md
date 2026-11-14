# 배포 및 데이터 동기화 가이드

## 1. GitHub Pages 배포 파일 구성

저장소 루트에 아래 파일과 폴더를 업로드합니다.

- `index.html`
- `mark.svg`
- `roster-data.json`
- `assets/` (`index-DT3dDEh1.js`, `index-DuBVqMlW.css`)
- `photos/` (선수 프로필 사진 폴더)
- `README.md`, `DEPLOY.md`

## 2. GitHub 실시간 자동 저장(Auto-Sync) 설정

사이트에서 추가·삭제·수정한 선수 데이터를 파일 다운로드 없이 깃허브 저장소의 `roster-data.json`에 즉시 커밋하려면 아래 절차를 1회 수행합니다.

1. GitHub 우측 상단 프로필 → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** 이동
2. **Generate new token (classic)** 클릭 후 **`repo`** 권한 체크 및 토큰(`ghp_...`) 발급
3. 사이트 상단 헤더의 **깃허브 자동저장** 버튼 클릭
4. **현재 주소에서 저장소 자동 감지** 클릭 후 발급받은 토큰 입력
5. **설정 저장 및 지금 깃허브에 동기화** 클릭

설정이 완료되면 선수 추가·삭제·수정·챔피언 벨트(찜) 변경 시 0.9초 디바운스 후 저장소의 `roster-data.json`이 자동 업데이트됩니다.
