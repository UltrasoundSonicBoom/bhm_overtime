---
title: "Karpathy의 AutoResearch: AI 에이전트에게 코드 최적화를 자동으로 맡기기"
source: "https://www.gpters.org/nocode/post/autoresearch-karpathy-automatically-leave-Bk0shiVsTJOzhp8"
author: "null"
clipped_at: "2026-03-17T07:55:47Z"
word_count: 537
method: "article-defuddle"
---

## 20년간 손으로 하던 일을 에이전트가 2일 만에 해냈다

Andrej Karpathy가 3월 9일 X(트위터)에 올린 글이 AI 커뮤니티를 뒤흔들고 있어요.  
좋아요 1.7만, 조회수 234만. 내용은 이렇습니다.

**\\"AI 에이전트(Claude)에게 내 프로젝트 nanochat의 하이퍼파라미터 최적화를 맡겼더니, 2일 동안 혼자서 약 700번의 실험을 거쳐 GPT-2 학습 시간을 2.02시간에서 1.80시간으로 단축했다.\\"**

11% 개선. 이미 수동으로 꽤 잘 튜닝해놓은 프로젝트에서 이 정도를 뽑아냈다는 겁니다.  

![\"그룹의](https://tribe-s3-production.imgix.net/cfbpjoawnWqwuI7s20pxa?auto=compress,format)

## 무슨 일이 있었나?

Karpathy는 자신의 오픈소스 프로젝트 [nanochat](https://github.com/karpathy/nanochat) 에 **autoresearch** 라는 방식을 적용했습니다. 핵심은 간단합니다.

1. AI 에이전트(Claude)에게 학습 코드와 목표 지표(검증 손실)를 줌
2. 에이전트가 스스로 아이디어를 내고, 코드를 수정하고, 실험을 돌리고, 결과를 분석함
3. 그 결과를 바탕으로 다음 실험을 설계함
4. 이 루프를 2일 동안 약 700번 반복

Karpathy는 이 과정에 **아무것도 건드리지 않았습니다**.  
에이전트가 알아서 20개의 개선 사항을 발견했고, 이걸 전부 합치니 실제로 성능이 올라갔습니다.

## 에이전트가 찾아낸 것들

커밋 내용을 뜯어보면, 에이전트가 발견한 문제들이 상당히 구체적입니다.

발견

내용

의미

**QKnorm 스케일러 누락**

Attention이 너무 흐릿했음. q, k에 1.15 승수 추가

Karpathy가 놓친 설계 실수를 에이전트가 잡음

**Value Embedding 정규화 없음**

weight decay를 전혀 안 걸고 있었음

\\"oops\\"라고 본인이 인정

**어텐션 윈도우 미튜닝**

seq\_len/2 → seq\_len/3로 조정

튜닝을 깜빡한 부분을 발견

**AdamW 베타값 엉망**

공유 글로벌 베타 → 파라미터 그룹별 개별 베타

옵티마이저 세팅이 대충이었음

**Weight decay 스케줄**

선형 감소 → 코사인 감소

학습 후반 안정성 개선

**네트워크 초기화**

임베딩 std 1.0→0.8, MLP 초기화 0.5배 축소

학습 초기 안정성 개선

  
Karpathy 본인 말로는 \\"이미 꽤 오래 수동으로 튜닝한 프로젝트\\"였는데,  
에이전트가 여전히 놓친 부분들을 찾아냈다는 겁니다.

## 왜 중요한가?

이건 단순한 하이퍼파라미터 서치가 아닙니다.  
기존의 그리드 서치나 베이지안 최적화와 근본적으로 다른 점이 있습니다.

**에이전트가 \\"생각\\"하면서 실험을 설계했다는 것.**

Karpathy의 표현을 빌리면:

> \\"It really looked at the sequence of results of experiments and used that to plan the next ones.\\"

에이전트는 이전 실험 결과의 흐름을 보고, 다음에 뭘 시도할지 판단했습니다.  
이건 사람이 20년간 해온 \\"아이디어 → 구현 → 검증 → 새 아이디어\\" 루프와 동일한 패턴입니다.

그리고 Karpathy는 이렇게 예고합니다.

> \\"All LLM frontier labs will do this. It's the final boss battle.\\"

에이전트 스웜(swarm)이 소형 모델에서 아이디어를 검증하고,  
유망한 것만 대형 모델로 확장하는 구조. 그리고 사람은 \\"가장자리에서 선택적으로 기여\\"하는 역할.

## 실전에서 어떻게 쓸 수 있을까?

Karpathy는 글 마지막에 이렇게 말합니다.

> \\"Any metric you care about that is reasonably efficient to evaluate can be autoresearched by an agent swarm.\\"

즉, 측정 가능한 지표가 있으면 어떤 문제든 에이전트 자동 최적화의 대상이 될 수 있다는 겁니다.  

### 활용 시나리오 1: 모델 학습 최적화

- 이미 잘 튜닝했다고 생각하는 학습 파이프라인에 에이전트를 붙여보기
- 목표 지표(검증 손실, 추론 속도 등)만 명확하면 됨
- Karpathy처럼 \\"첫 시도에서\\" 11% 개선을 얻을 수도 있음

### 활용 시나리오 2: 소프트웨어 성능 튜닝

- 응답 시간, 메모리 사용량 등 측정 가능한 지표
- 에이전트가 설정값, 알고리즘 선택, 캐시 전략 등을 자동 탐색
- CI/CD 파이프라인에 autoresearch 루프를 통합하는 것도 가능

### 활용 시나리오 3: 프롬프트(Prompt) 최적화

- LLM 기반 서비스의 프롬프트를 자동으로 A/B 테스트
- 평가 지표(정확도, 응답 품질 점수)가 있으면 에이전트가 자동 탐색

---

![\"Google](https://tribe-s3-production.imgix.net/50VSWStvS5XTPMxSQb6Ef?auto=compress,format)

[(관련 레포)](https://github.com/karpathy/autoresearch)  
  
바이브코딩이 \\"코드를 짜는 방식\\"을 바꿨다면, autoresearch는 **\\"연구하는 방식\\"을 바꾸는 시작점** 입니다. 그리고 이건 AI 연구에만 국한되지 않습니다. 마케팅 A/B 테스트, 제품 파라미터 최적화, 콘텐츠 성과 튜닝 — 측정 가능한 지표가 있는 모든 곳에서 같은 패턴이 작동할 수 있습니다.

질문은 \\"에이전트가 이걸 할 수 있을까?\\"가 아니라, **\\"내 업무에서 측정 가능한 지표가 뭐지?\\"** 로 바뀌어야겠네요!
