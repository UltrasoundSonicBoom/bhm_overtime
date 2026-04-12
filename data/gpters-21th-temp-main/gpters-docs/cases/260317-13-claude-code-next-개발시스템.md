---
title: "클로드 코드로 /next 입력하여 개발하는 시스템 보완"
source: "https://www.gpters.org/dev/post/complement-development-system-entering-Pm6bdZus5KLE5hw"
author: "null"
clipped_at: "2026-03-17T07:42:05Z"
word_count: 209
method: "article-defuddle"
---

## 소개

/next custom slash command 실행해서 개발 시 문제점을 보완했습니다. 사용자가 직접 테스트에 개입해야 하는 시점을 판별할 수 있도로 하고, 디버깅 스킬을 추가했습니다.

## 진행 방법

[https://www.gpters.org/dev/post/next-designed-development-system-KQKxuCWEuLVbuW7](/dev/post/next-designed-development-system-KQKxuCWEuLVbuW7)

이 시스템으로 개발하다 보니, 조금 보완해야 할 점들이 보였습니다. 먼저 AI가 보고하는 문서에 \\"발견한 추가 개선점\\"이 있었습니다. 이것을 반영하기 위해 프롬프트를 썼습니다.

![\"여러](https://tribe-s3-production.imgix.net/3F046dZFEatQTdIs9G3mk?auto=compress,format)

그리고 개발을 AI에게 맡겨도 제가 기능을 확인은 해야겠더라구요. 그래서 이런 프롬프트도 썼습니다.

![\"텍스트가](https://tribe-s3-production.imgix.net/UyCOsWifd4xj5kZWR5FeL?auto=compress,format)

이제 문서를 열어보면, 제가 테스트할 수 있는 지점이 기술됩니다. 그래서 테스트를 해 보니, 버그가 있는 경우가 있더군요. 디버깅이 필요해서 디버깅 스킬을 추가했습니다.

```
/insights
```

를 클로드 코드에서 실행하면 클로드 코드 사용 패턴에서 개선할 점이 나옵니다. 마침 디버깅 스킬 생성 프롴프트를 제안해 주었습니다.

![\"\"](https://tribe-s3-production.imgix.net/gq9tvyjZB0xFIdq8oKBZT?auto=compress,format)

스킬을 생성했습니다.

![\"\"](https://tribe-s3-production.imgix.net/aExxlQc1PEBoipGtuw1LE?auto=compress,format)

현재 개발은 90% 정도 진행이 되었고, 열심히 디버깅 스킬로 디버깅 중입니다~!

![\"\"](https://tribe-s3-production.imgix.net/c1yldy92dY9sOnzobMtkS?auto=compress,format)

참고로 이 프로젝트에서 만든 스킬과 에이전트, 훅 정보 첨부합니다.

```
### Phase 2: Skills 구축 (1일)\n1. BLoC 생성 스킬\n2. Freezed 모델 생성 스킬\n3. Repository 패턴 생성 스킬\n4. 테스트 생성 스킬\n5. 기타 유틸리티 스킬\n\n### Phase 3: Hooks 구축 (1일)\n1. 보안 검증 Hook (PreToolUse)\n2. 코드 품질 Hook (PostToolUse)\n3. 커밋 전 검증 Hook\n\n### Phase 4: Agents 구축 (1일)\n1. Security Auditor 에이전트\n2. Architecture Guardian 에이전트\n3. Test Generator 에이전트\n4. Feature Developer 에이전트
```

## 결과와 배운 점

이제 앱을 완성하고, 보안 수준에 대해서 한 번 더 검토한 후, 배포를 하기로 했습니다~!!
