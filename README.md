# 13주차 웹프로그래밍 게시판

이번 주 실습 확인 경로는 루트의 My Web Board 화면과 `/users/reg`의 EJS 회원가입 폼입니다. Express와 EJS로 만든 회원제 게시판입니다. 회원가입·로그인·로그아웃, 게시글 목록·상세·작성·수정·삭제 및 조회수를 구현했습니다. 글은 누구나 읽을 수 있고 작성자만 수정하거나 삭제할 수 있습니다.

## 실행

Node.js 22에서 `npm ci`, `npm start`를 실행하면 http://localhost:3000 에서 열 수 있습니다.

- 로컬 기본 저장소는 `data/board.sqlite`입니다.
- 수업의 MySQL 연결은 `.env.example`을 참고해 `.env`에 `DBHOST`, `DBUSER`, `DBPASSWD`, `DATABASE`를 설정합니다. URL 형식은 `MYSQL_URL`도 지원합니다. 데이터베이스를 먼저 만든 후 시작하면 회원과 게시판 테이블을 초기화합니다. 스키마는 `db/schema.mysql.sql`에 있습니다.
- Render PostgreSQL을 사용할 때는 `DATABASE_URL`로 연결합니다. 두 연결 주소를 모두 제공하면 MySQL을 사용합니다.
- SQLite로 Render 무료 서비스를 실행하면 인스턴스 교체나 재배포 시 로컬 데이터가 초기화될 수 있습니다. 실습에서는 테스트용 정보만 입력하세요.

## Render

Web Service에 저장소를 연결하고 Runtime을 Node로 선택합니다. Build Command는 `npm ci`, Start Command는 `npm start`, Health Check Path는 `/health`입니다. 학교 실습 MySQL에 연결할 때는 Render 환경 변수에도 `DBHOST`, `DBUSER`, `DBPASSWD`, `DATABASE`를 등록합니다. `MYSQL_URL` 또는 `DATABASE_URL`로 다른 데이터베이스도 연결할 수 있습니다. 브라우저에는 HTTPS 세션 쿠키만 전달되며 비밀번호는 솔트가 적용된 해시로 저장합니다. 세션은 실습용 서버 메모리에 저장되어 인스턴스가 재시작되면 다시 로그인해야 합니다.
