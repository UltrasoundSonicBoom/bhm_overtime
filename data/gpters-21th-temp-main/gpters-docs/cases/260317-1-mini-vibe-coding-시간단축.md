---
title: "모두의 사인 계약서 발송시 시간 단축을 위한 미니 바이브 코딩"
source: "https://www.gpters.org/dev/post/mini-vibe-coding-reduce-tnq5vt9IHgLcUN1"
author: "null"
clipped_at: "2026-03-17T07:39:51Z"
word_count: 357
method: "article-defuddle"
---

## 모두의 사인 계약서 업무 과정 개선 소개

저희 회사는 고객 계약서 활용에 모두의 사인을 많이 활용하고 있습니다.

처음 모두의 사인이 나왔을때만 해도 공간을 초월한 편리함이 있긴 했지만 고객별로 이름/전화번호/생년월일/주소/날짜를 업로드한 계약서에 하나하나 붙여서 보내는게 생각보다 시간이 걸리는 작업이었습니다.

그렇다고 정보 입력 미리 안하고 발송하면 고객들은 입력이 어려워서 포기...결국 서명하시는 내용 빼고 전부 입력 해야 하는데...아쉽게도 아직 모두의 사인 입력 인터페이스가 그리 사용자 친화적인 편은 아닙니다...

![\"\"](https://tribe-s3-production.imgix.net/HcfUT26iMy4riWUMY4xJG?auto=compress,format)

## 도구 활용을 통한 진행 방법

어떤 도구를 사용했고, 어떻게 활용하셨나요?

클로드 코드를 통해 필요한 정보와 기입되는 위치를 미리 정해놓고

입력 후 PDF로 추출되는 파이썬 버전으로 먼저 만들어봤습니다.

1차로 만든걸 회사 팀원들 함께 사용 가능하게 스트림릿에

배포해서 웹 버전으로 함께 활용해보았습니다.

\[파이썬 1차 버전\]

![\"한국어](https://tribe-s3-production.imgix.net/oQYDD2ToF1fcg8evpfqAJ?auto=compress,format)

\[스트림릿 웹 1차 버전\]

![\"한국사이트](https://tribe-s3-production.imgix.net/A1CEIUFue96UEBg8jQmP6?auto=compress,format)

나중에 추가로 받게 되는 병원 의무기록 동의서 위임장도 고객의 정보와 일치하면 연동 할 수 있게 추가로 만들었습니다.

![\"한국](https://tribe-s3-production.imgix.net/uxhyMXKiisF6cSnjBl8x0?auto=compress,format)

## 시행착오 과정

처음에는 원하는 위치별로 입력값이 나오게 싱크를 맞추는게 쉽지 않았습니다. 문서에 표기를 해서 직접 클로드 코드가 확인해서 쓰게 했더니 위치를 계속 틀리더라구요.

차라리 첨부터 문서를 보고 좌표값을 달라고 한 다음에

1P 이름은 X = 좌표, Y = 좌표, 생년월일은 X = 좌표, Y = 좌표 로 찝어 주는게 젤 좋습니다. 그러고 나서 출력물 보고 이름을 20 정도 이동, 서명란은 위로 10 이동 일케 최종 조절 해줬어여 했는데 아쉬웠던,,,, ㅎ

![\"한국어](https://tribe-s3-production.imgix.net/j6rXZcN9Khi3ndW5f9nZo?auto=compress,format)

![\"한국어가](https://tribe-s3-production.imgix.net/I7B3O9EwVsy10O8rRHdNc?auto=compress,format)

![\"한국어](https://tribe-s3-production.imgix.net/WcceoYTz7L9R5kk7zNx7t?auto=compress,format)

4페이지 계약서 + 동의서 위임장 2페이지 작업 + 모두의 사인 발송 평균 소요시간 20분 이상에서 3분 컷 작업으로 개선되었습니다!

## 모바일에서 사인까지 받는다면?

한단계 더 고도화 작업을 해봤습니다.

만약 고객을 현장에서 대면했는데 바로 서명을 받아야 하는 경우가 있다면...

예전에는 아이패드에서 굿노트를 통해서 받거나 터치 가능한 360도 노트북을 통해서 받았는데...

앞으로는 서류로 설명은 먼저 드리고 핸드폰으로 서명 받은 다음에 고객님께 그자리에서 사본까지 발송 해드릴수 있게... 전자서명 기능을 붙여달라고 요청했습니다.

\[버셀을 통한 배포 및 전자서명 기능 붙인 2차 버전\]

![\"모바일](https://tribe-s3-production.imgix.net/5Nx1cCuiwSwPHBnF0uRRM?auto=compress,format)

![\"한국어](https://tribe-s3-production.imgix.net/R7sRwch78d5mioxPumtvP?auto=compress,format)

## 결과와 배운 점

컴퓨터 앞에 꼭 앉아야 하거나 기차 안 랩탑에서는 터치 마우스로 스트레스 받으면서 하던 작업이 발송까지 이젠 거의 3분 안에 뚝딱이라 너무 편하고 팀원들도 금방 익숙해져서 잘 사용중입니다. (이...이젠 추가 계약만 더 많이들 해오시면....ㅎㅎ)

지난 AI 워크스페이스 스터디에서 클로드 코드를 활용해 각자 분야에 패인 포인트를 함께 고민해봤던 시간들이 이렇게 저에게도 좋은 생산성 개선 사례를 만들수 있는 기회를 준 것 같습니다 ㅎ

긴 글 읽어주셔서 감사합니다 ^^
