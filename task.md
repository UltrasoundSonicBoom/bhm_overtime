<!-- /autoplan restore point: /Users/momo/.gstack/projects/UltrasoundSonicBoom-bhm_overtime/main-autoplan-restore-20260404-145619.md -->
# SNUH 급여 도우미 - Design Context (Linear Branch)

## Design Context

### Users
병원(서울대학교병원 보라매병원) 소속 직원들이 자신의 급여, 시간외 근무수당, 휴가 현황을 확인하고 시뮬레이션하기 위해 사용하는 도구.
- **주 사용 환경:** 모바일 브라우저 (출퇴근 시, 병원 내)
- **해야 할 일(Job to be Done):** "이번 달 급여가 얼마나 나올지 빠르고 정확하게 확인하고 싶다"
- **감정 목표:** 신뢰(Trust), 명확함(Clarity), 차분함(Calm)

### Brand Personality
**정확한(Precise)** · **절제된(Restrained)** · **전문적인(Professional)**

### Aesthetic Direction
**Linear / Raycast Style — Restrained Dark Tech**

- **톤:** 철저하게 절제된 다크 모드. 깊은 검정(#09090b) 위에 매우 얇은 1px 내부 테두리(inner border)로만 영역 구분.
- **포인트:** CTA 버튼(저장, 계산) 한두 개에만 밝은 컬러 글로우를 줌. 나머지는 모노톤 중립.
- **레퍼런스:** linear.app, raycast.com, vercel.com/dashboard
- **안티레퍼런스 (절대 하지 말 것):**
  - ❌ Glassmorphism (backdrop-filter: blur, 유리 질감 카드)
  - ❌ 그라데이션 텍스트 남발
  - ❌ 방사형 배경 애니메이션 (ambientMove)
  - ❌ 모든 카드에 hover glow shadow 넣기
  - ❌ 과도한 이모지 아이콘
- **테마:** Dark mode only

### Design Principles
1. **데이터가 주인공이다:** 숫자(급여/시간/수당)가 가장 먼저 눈에 띄어야 한다. 장식은 최소화.
2. **구조로 말한다:** 색이 아니라 여백(spacing)과 타이포그래피 위계(weight/size)로 정보를 구분한다.
3. **한 화면에 한 행동:** 사용자가 지금 해야 할 일이 무엇인지 즉시 알 수 있어야 한다.
4. **안 보이는 게 좋은 디자인:** 장식적 요소를 제거할수록 앱이 더 빨라 보이고 신뢰감이 올라간다.
5. **기능은 건드리지 않는다:** CSS-only 변경. JS 로직, HTML 구조, ID/class 바인딩은 절대 변경하지 않는다.

### Change Rules (엄격)
- **수정 가능:** `style.css`, `minimal-spacing-fix.css`
- **수정 가능 (제한적):** `index.html` — class 추가/제거만 허용, 요소 삭제·이동·ID 변경 금지
- **수정 불가:** `app.js`, `calculators.js`, `data.js`, `holidays.js`, `profile.js`, `overtime.js`, `leave.js`, `payroll.js`, `supabaseClient.js`
