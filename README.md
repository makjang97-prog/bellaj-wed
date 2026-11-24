# 벨라제이웨딩 · 프라이빗 피팅 초대전

인천 구월동 벨라제이웨딩의 모바일 이벤트 랜딩페이지와 사전예약 신청 리스트 관리 화면입니다.

## 구성

```
public/            # 랜딩페이지 (정적)
  index.html       # 히어로 → 룩북 → 소개·강점 → 혜택·신청 폼 → 인스타그램 → 오시는 길
  admin.html       # /admin 신청 리스트 관리 (rewrite)
  styles.css / app.js
  admin.css / admin.js
  images/          # 드레스 화보(webp), 공유 썸네일 og.jpg
api/
  inquiries.js          # 신청 접수 (POST)
  admin/login.js        # PIN 로그인
  admin/logout.js
  admin/inquiries.js    # 리스트 조회 / 상태 변경 / 삭제
lib/db.js          # Supabase REST + 관리자 세션(HMAC 쿠키)
```

- 신청 데이터는 Supabase `bellaj_inquiries` 테이블에 저장됩니다.
  (`created_at`, `name`, `phone`, `visit_when`, `plan`, `status`)
- 상태 값: `waiting`(대기) / `contacted`(연락완료) / `booked`(예약확정)
- 테이블은 RLS를 켜 두고 정책을 두지 않았습니다. anon 키로는 읽기·쓰기가 되지 않고,
  서버(api)에서만 서비스 롤 키로 접근합니다.

## 환경변수 (Vercel)

| 이름 | 설명 |
| --- | --- |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 롤 키 (서버 전용, 절대 공개 금지) |
| `ADMIN_PIN` | 관리자 화면 PIN |
| `ADMIN_SECRET` | 관리자 세션 쿠키 서명 키 (임의의 긴 문자열) |

## 고칠 때

```bash
# 파일 수정 후
git add -A && git commit -m "문구 수정" && git push
```

`main`에 푸시하면 Vercel이 자동으로 다시 배포합니다.

## 드레스 사진

`public/images/bellaj-01 ~ 15.webp` 는 벨라제이웨딩 실제 드레스 사진(원본: incheon.wedding 벨라제이웨딩 컬렉션)을
웹용으로 줄여 넣은 것입니다. 사진을 바꾸려면 같은 파일명으로 교체하면 됩니다.
