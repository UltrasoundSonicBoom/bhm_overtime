window.__NURSE_ADMIN_FIXTURES = {
  "teams": {
    "results": [
      {
        "id": 3,
        "slug": "101",
        "name": "101 병동",
        "description": "일반병동 파일럿. Toss식 운영 화면 데모와 AI 초안 검토 흐름 검증용.",
        "metadata": {
          "demoMode": true,
          "designTone": "toss-operations",
          "defaultPeriod": "2026-05"
        },
        "current_status": "published",
        "current_publish_version_id": 2,
        "current_candidate_id": 7
      },
      {
        "id": 4,
        "slug": "angio",
        "name": "Angio Team",
        "description": "특수검사팀 파일럿. 배포 전 검토 중심으로 남겨둔 초안 상태 데모.",
        "metadata": {
          "demoMode": true,
          "designTone": "toss-operations",
          "defaultPeriod": "2026-05"
        },
        "current_status": "review",
        "current_publish_version_id": null,
        "current_candidate_id": 10
      }
    ]
  },
  "datasets": {
    "101:2026-05": {
      "result": {
        "team": {
          "id": 3,
          "slug": "101",
          "name": "101 병동",
          "description": "일반병동 파일럿. Toss식 운영 화면 데모와 AI 초안 검토 흐름 검증용.",
          "metadata": {
            "demoMode": true,
            "designTone": "toss-operations",
            "defaultPeriod": "2026-05"
          },
          "year": 2026,
          "month": 5
        },
        "periodId": 23,
        "members": [
          {
            "id": 24,
            "name": "송채은",
            "age": 26,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "new-grad"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 25,
            "name": "오다은",
            "age": 25,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "new-grad"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 23,
            "name": "윤지아",
            "age": 27,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "ward"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 19,
            "name": "이수민",
            "age": 33,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "iv"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 26,
            "name": "장예린",
            "age": 24,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "new-grad"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 21,
            "name": "정민지",
            "age": 29,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "preceptor"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 20,
            "name": "최유진",
            "age": 31,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "icu-transfer"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 22,
            "name": "한소희",
            "age": 28,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "ward"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 18,
            "name": "박서연",
            "age": 36,
            "roleLabel": "Charge RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "charge",
              "iv"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 17,
            "name": "김하늘",
            "age": 42,
            "roleLabel": "Head Nurse",
            "canNight": false,
            "ftePermille": 1000,
            "skillTags": [
              "charge",
              "preceptor"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          }
        ],
        "shiftTypes": [
          {
            "code": "D",
            "label": "Day",
            "startMinutes": 420,
            "endMinutes": 900,
            "isWork": true
          },
          {
            "code": "E",
            "label": "Evening",
            "startMinutes": 840,
            "endMinutes": 1320,
            "isWork": true
          },
          {
            "code": "N",
            "label": "Night",
            "startMinutes": 1260,
            "endMinutes": 1860,
            "isWork": true
          },
          {
            "code": "OFF",
            "label": "Off",
            "startMinutes": 0,
            "endMinutes": 0,
            "isWork": false
          },
          {
            "code": "LEAVE",
            "label": "Leave",
            "startMinutes": 0,
            "endMinutes": 0,
            "isWork": false
          },
          {
            "code": "EDU",
            "label": "Education",
            "startMinutes": 540,
            "endMinutes": 1020,
            "isWork": false
          }
        ],
        "baseCoverage": [
          {
            "date": "2026-05-01",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-02",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-03",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-04",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-05",
            "requirements": {
              "D": 2,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": true
          },
          {
            "date": "2026-05-06",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-07",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-08",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-09",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-10",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-11",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-12",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-13",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-14",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-15",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-16",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-17",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-18",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-19",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-20",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-21",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-22",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-23",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-24",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-25",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-26",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-27",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-28",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-29",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-30",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-31",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          }
        ],
        "coverage": [
          {
            "date": "2026-05-01",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-02",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-03",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-04",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-05",
            "requirements": {
              "D": 2,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": true
          },
          {
            "date": "2026-05-06",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-07",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-08",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-09",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-10",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-11",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-12",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-13",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-14",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-15",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-16",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-17",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-18",
            "requirements": {
              "D": 3,
              "E": 3,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-19",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-20",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-21",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-22",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-23",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-24",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-25",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-26",
            "requirements": {
              "D": 4,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-27",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-28",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-29",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-30",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-31",
            "requirements": {
              "D": 3,
              "E": 2,
              "N": 2
            },
            "isWeekend": true,
            "isHoliday": false
          }
        ],
        "approvedLeaves": [
          {
            "memberId": 18,
            "date": "2026-05-14",
            "leaveType": "annual"
          },
          {
            "memberId": 18,
            "date": "2026-05-15",
            "leaveType": "annual"
          },
          {
            "memberId": 23,
            "date": "2026-05-27",
            "leaveType": "annual"
          }
        ],
        "preferredOffRequests": [
          {
            "memberId": 19,
            "date": "2026-05-06",
            "requestType": "preferred_off",
            "note": "가족 일정"
          },
          {
            "memberId": 21,
            "date": "2026-05-12",
            "requestType": "preferred_off",
            "note": "외래 예약"
          },
          {
            "memberId": 19,
            "date": "2026-05-18",
            "requestType": "preferred_off",
            "note": "가족 일정"
          },
          {
            "memberId": 24,
            "date": "2026-05-20",
            "requestType": "preferred_off",
            "note": "교육 전 컨디션 조정"
          },
          {
            "memberId": 24,
            "date": "2026-05-21",
            "requestType": "preferred_off",
            "note": "교육 전 컨디션 조정"
          }
        ],
        "locks": [
          {
            "memberId": 17,
            "date": "2026-05-08",
            "shiftCode": "EDU",
            "reason": "수간호사 회의"
          },
          {
            "memberId": 20,
            "date": "2026-05-09",
            "shiftCode": "EDU",
            "reason": "병동 교육"
          },
          {
            "memberId": 25,
            "date": "2026-05-13",
            "shiftCode": "EDU",
            "reason": "프리셉터 동행 교육"
          },
          {
            "memberId": 18,
            "date": "2026-05-14",
            "shiftCode": "EDU",
            "reason": "CS 교육"
          },
          {
            "memberId": 24,
            "date": "2026-05-20",
            "shiftCode": "EDU",
            "reason": "신규간호사 오리엔테이션"
          },
          {
            "memberId": 24,
            "date": "2026-05-21",
            "shiftCode": "EDU",
            "reason": "신규간호사 오리엔테이션"
          }
        ],
        "memberEvents": [
          {
            "id": 1,
            "teamId": 3,
            "periodId": 23,
            "memberId": 17,
            "scope": "member",
            "eventType": "fixed_shift",
            "title": "수간호사 회의",
            "startDate": "2026-05-08",
            "endDate": "2026-05-08",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-08"
            ]
          },
          {
            "id": 2,
            "teamId": 3,
            "periodId": 23,
            "memberId": 20,
            "scope": "member",
            "eventType": "education",
            "title": "병동 교육",
            "startDate": "2026-05-09",
            "endDate": "2026-05-09",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-09"
            ]
          },
          {
            "id": 4,
            "teamId": 3,
            "periodId": 23,
            "memberId": 25,
            "scope": "member",
            "eventType": "education",
            "title": "프리셉터 동행 교육",
            "startDate": "2026-05-13",
            "endDate": "2026-05-13",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-13"
            ]
          },
          {
            "id": 5,
            "teamId": 3,
            "periodId": 23,
            "memberId": 18,
            "scope": "member",
            "eventType": "education",
            "title": "CS 교육",
            "startDate": "2026-05-14",
            "endDate": "2026-05-14",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": "연차와 의도적 중복 시나리오",
            "source": "seed",
            "dates": [
              "2026-05-14"
            ]
          },
          {
            "id": 3,
            "teamId": 3,
            "periodId": 23,
            "memberId": 24,
            "scope": "member",
            "eventType": "orientation",
            "title": "신규간호사 오리엔테이션",
            "startDate": "2026-05-20",
            "endDate": "2026-05-21",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": "교육 주간에는 night 후보에서 후순위",
            "source": "seed",
            "dates": [
              "2026-05-20",
              "2026-05-21"
            ]
          }
        ],
        "wardEvents": [
          {
            "id": 7,
            "teamId": 3,
            "periodId": 23,
            "memberId": null,
            "scope": "team",
            "eventType": "meeting",
            "title": "다학제 컨퍼런스",
            "startDate": "2026-05-18",
            "endDate": "2026-05-18",
            "startMinutes": 900,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {
              "E": 1
            },
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-18"
            ]
          },
          {
            "id": 6,
            "teamId": 3,
            "periodId": 23,
            "memberId": null,
            "scope": "team",
            "eventType": "dinner",
            "title": "101 병동 회식",
            "startDate": "2026-05-22",
            "endDate": "2026-05-22",
            "startMinutes": 1080,
            "endMinutes": 1200,
            "allDay": false,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-22"
            ]
          },
          {
            "id": 8,
            "teamId": 3,
            "periodId": 23,
            "memberId": null,
            "scope": "team",
            "eventType": "ward_event",
            "title": "감염관리 라운딩",
            "startDate": "2026-05-26",
            "endDate": "2026-05-26",
            "startMinutes": null,
            "endMinutes": null,
            "allDay": true,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {
              "D": 1
            },
            "notes": "주간 커버리지 1명 추가 필요",
            "source": "seed",
            "dates": [
              "2026-05-26"
            ]
          }
        ],
        "leaveLedger": [
          {
            "memberId": 24,
            "memberName": "송채은",
            "annualLeaveDays": 0,
            "educationDays": 2,
            "blockedEventDays": 2,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 25,
            "memberName": "오다은",
            "annualLeaveDays": 0,
            "educationDays": 1,
            "blockedEventDays": 1,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 23,
            "memberName": "윤지아",
            "annualLeaveDays": 1,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": "2026-05-27"
          },
          {
            "memberId": 19,
            "memberName": "이수민",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 26,
            "memberName": "장예린",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 21,
            "memberName": "정민지",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 20,
            "memberName": "최유진",
            "annualLeaveDays": 0,
            "educationDays": 1,
            "blockedEventDays": 1,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 22,
            "memberName": "한소희",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          },
          {
            "memberId": 18,
            "memberName": "박서연",
            "annualLeaveDays": 2,
            "educationDays": 1,
            "blockedEventDays": 1,
            "recentNightCount": 7,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": "2026-05-15"
          },
          {
            "memberId": 17,
            "memberName": "김하늘",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 1,
            "recentNightCount": 0,
            "recentWeekendCount": 6,
            "recentPublishedChanges": 31,
            "lastLeaveDate": null
          }
        ],
        "datasetValidation": {
          "summary": {
            "total": 3,
            "errors": 0,
            "warnings": 3,
            "info": 0,
            "blocking": false
          },
          "items": [
            {
              "code": "event.leave_overlap",
              "severity": "warning",
              "title": "휴가와 운영 이벤트 중복",
              "message": "박서연의 휴가와 CS 교육 일정이 겹칩니다.",
              "memberId": 18,
              "eventId": 5,
              "date": "2026-05-14"
            },
            {
              "code": "member.new_grad_no_training",
              "severity": "warning",
              "title": "신규 간호사 교육 일정 누락",
              "message": "장예린에게 이번 기간 교육 또는 오리엔테이션 일정이 없습니다.",
              "memberId": 26
            },
            {
              "code": "fairness.leave_skew",
              "severity": "warning",
              "title": "휴가 사용 편중",
              "message": "최근 3개월 기준 휴가 사용량이 팀 내에서 크게 벌어져 있습니다.",
              "memberId": 18,
              "details": {
                "maxAnnualLeave": 2,
                "minAnnualLeave": 0
              }
            }
          ]
        },
        "validation": {
          "summary": {
            "total": 3,
            "errors": 0,
            "warnings": 3,
            "info": 0,
            "blocking": false
          },
          "items": [
            {
              "code": "event.leave_overlap",
              "severity": "warning",
              "title": "휴가와 운영 이벤트 중복",
              "message": "박서연의 휴가와 CS 교육 일정이 겹칩니다.",
              "memberId": 18,
              "eventId": 5,
              "date": "2026-05-14"
            },
            {
              "code": "member.new_grad_no_training",
              "severity": "warning",
              "title": "신규 간호사 교육 일정 누락",
              "message": "장예린에게 이번 기간 교육 또는 오리엔테이션 일정이 없습니다.",
              "memberId": 26
            },
            {
              "code": "fairness.leave_skew",
              "severity": "warning",
              "title": "휴가 사용 편중",
              "message": "최근 3개월 기준 휴가 사용량이 팀 내에서 크게 벌어져 있습니다.",
              "memberId": 18,
              "details": {
                "maxAnnualLeave": 2,
                "minAnnualLeave": 0
              }
            }
          ]
        },
        "datasetScenarioReport": {
          "total": 6,
          "passed": 6,
          "failed": 0,
          "items": [
            {
              "id": "dataset.leave_education_overlap",
              "title": "승인 휴가와 교육 이벤트 중복 감지",
              "category": "dataset",
              "passed": true,
              "expected": {
                "validationCode": "event.leave_overlap",
                "minimum": 1
              },
              "actual": {
                "count": 1
              }
            },
            {
              "id": "dataset.team_dinner_is_non_blocking",
              "title": "회식은 안내만 하고 근무를 막지 않음",
              "category": "dataset",
              "passed": true,
              "expected": {
                "blocksWork": false
              },
              "actual": {
                "count": 1,
                "blocksWorkFlags": [
                  false
                ]
              }
            },
            {
              "id": "dataset.fixed_shift_enforced",
              "title": "고정 shift 이벤트가 실제 배정에 반영됨",
              "category": "solver",
              "passed": true,
              "expected": {
                "fixedShiftCount": 1
              },
              "actual": {
                "assignmentChecked": true,
                "matchedCount": 1
              }
            },
            {
              "id": "dataset.coverage_delta_applied",
              "title": "공용 이벤트 coverage delta 반영",
              "category": "solver",
              "passed": true,
              "expected": {
                "eventCount": 2
              },
              "actual": {
                "applied": true
              }
            },
            {
              "id": "dataset.leave_fairness_warning",
              "title": "휴가 편중이 크면 fairness 경고 표시",
              "category": "validation",
              "passed": true,
              "expected": {
                "warningWhenSpreadAtLeast": 2
              },
              "actual": {
                "spread": 2,
                "warningCount": 1
              }
            },
            {
              "id": "dataset.new_grad_training_present",
              "title": "신규 간호사 교육 주간 데이터 보유",
              "category": "dataset",
              "passed": true,
              "expected": {
                "newGradCount": 3,
                "trainingEvents": ">= 1"
              },
              "actual": {
                "newGradTrainingCount": 2
              }
            }
          ]
        },
        "scenarioReport": {
          "total": 6,
          "passed": 6,
          "failed": 0,
          "items": [
            {
              "id": "dataset.leave_education_overlap",
              "title": "승인 휴가와 교육 이벤트 중복 감지",
              "category": "dataset",
              "passed": true,
              "expected": {
                "validationCode": "event.leave_overlap",
                "minimum": 1
              },
              "actual": {
                "count": 1
              }
            },
            {
              "id": "dataset.team_dinner_is_non_blocking",
              "title": "회식은 안내만 하고 근무를 막지 않음",
              "category": "dataset",
              "passed": true,
              "expected": {
                "blocksWork": false
              },
              "actual": {
                "count": 1,
                "blocksWorkFlags": [
                  false
                ]
              }
            },
            {
              "id": "dataset.fixed_shift_enforced",
              "title": "고정 shift 이벤트가 실제 배정에 반영됨",
              "category": "solver",
              "passed": true,
              "expected": {
                "fixedShiftCount": 1
              },
              "actual": {
                "assignmentChecked": true,
                "matchedCount": 1
              }
            },
            {
              "id": "dataset.coverage_delta_applied",
              "title": "공용 이벤트 coverage delta 반영",
              "category": "solver",
              "passed": true,
              "expected": {
                "eventCount": 2
              },
              "actual": {
                "applied": true
              }
            },
            {
              "id": "dataset.leave_fairness_warning",
              "title": "휴가 편중이 크면 fairness 경고 표시",
              "category": "validation",
              "passed": true,
              "expected": {
                "warningWhenSpreadAtLeast": 2
              },
              "actual": {
                "spread": 2,
                "warningCount": 1
              }
            },
            {
              "id": "dataset.new_grad_training_present",
              "title": "신규 간호사 교육 주간 데이터 보유",
              "category": "dataset",
              "passed": true,
              "expected": {
                "newGradCount": 3,
                "trainingEvents": ">= 1"
              },
              "actual": {
                "newGradTrainingCount": 2
              }
            }
          ]
        },
        "rules": {
          "ruleProfileId": 3,
          "hospitalRuleVersion": "2026.1",
          "minRestHours": 16,
          "maxNightShiftsPerMonth": 6,
          "forbiddenPatterns": [
            [
              "N",
              "OFF",
              "D"
            ]
          ],
          "weights": {
            "request": 10,
            "fairness": 25,
            "nightCap": 100,
            "continuity": 15
          }
        },
        "currentCandidateId": 7,
        "currentPublishVersionId": 2
      }
    },
    "angio:2026-05": {
      "result": {
        "team": {
          "id": 4,
          "slug": "angio",
          "name": "Angio Team",
          "description": "특수검사팀 파일럿. 배포 전 검토 중심으로 남겨둔 초안 상태 데모.",
          "metadata": {
            "demoMode": true,
            "designTone": "toss-operations",
            "defaultPeriod": "2026-05"
          },
          "year": 2026,
          "month": 5
        },
        "periodId": 24,
        "members": [
          {
            "id": 32,
            "name": "서민아",
            "age": 27,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "angio",
              "new-grad"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 30,
            "name": "이예나",
            "age": 30,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "angio"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 31,
            "name": "장지후",
            "age": 28,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "angio",
              "new-grad"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 29,
            "name": "최다현",
            "age": 32,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "angio",
              "sedation"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 28,
            "name": "윤서진",
            "age": 34,
            "roleLabel": "RN",
            "canNight": true,
            "ftePermille": 1000,
            "skillTags": [
              "angio"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          },
          {
            "id": 27,
            "name": "김도윤",
            "age": 40,
            "roleLabel": "Head Nurse",
            "canNight": false,
            "ftePermille": 1000,
            "skillTags": [
              "angio",
              "charge"
            ],
            "fairness": {
              "night": 0,
              "weekend": 0,
              "holiday": 0,
              "undesirable": 0
            },
            "previousAssignments": []
          }
        ],
        "shiftTypes": [
          {
            "code": "D",
            "label": "Day",
            "startMinutes": 450,
            "endMinutes": 930,
            "isWork": true
          },
          {
            "code": "E",
            "label": "Evening",
            "startMinutes": 870,
            "endMinutes": 1290,
            "isWork": true
          },
          {
            "code": "N",
            "label": "Night",
            "startMinutes": 1260,
            "endMinutes": 1860,
            "isWork": true
          },
          {
            "code": "OFF",
            "label": "Off",
            "startMinutes": 0,
            "endMinutes": 0,
            "isWork": false
          },
          {
            "code": "LEAVE",
            "label": "Leave",
            "startMinutes": 0,
            "endMinutes": 0,
            "isWork": false
          },
          {
            "code": "EDU",
            "label": "Education",
            "startMinutes": 540,
            "endMinutes": 1020,
            "isWork": false
          }
        ],
        "baseCoverage": [
          {
            "date": "2026-05-01",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-02",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-03",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-04",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-05",
            "requirements": {
              "D": 1,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": true
          },
          {
            "date": "2026-05-06",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-07",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-08",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-09",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-10",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-11",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-12",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-13",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-14",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-15",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-16",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-17",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-18",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-19",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-20",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-21",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-22",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-23",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-24",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-25",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-26",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-27",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-28",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-29",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-30",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-31",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          }
        ],
        "coverage": [
          {
            "date": "2026-05-01",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-02",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-03",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-04",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-05",
            "requirements": {
              "D": 1,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": true
          },
          {
            "date": "2026-05-06",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-07",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-08",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-09",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-10",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-11",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-12",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-13",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-14",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-15",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-16",
            "requirements": {
              "D": 3,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-17",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-18",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-19",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-20",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-21",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-22",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-23",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-24",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-25",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-26",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-27",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-28",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-29",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": false,
            "isHoliday": false
          },
          {
            "date": "2026-05-30",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          },
          {
            "date": "2026-05-31",
            "requirements": {
              "D": 2,
              "E": 1,
              "N": 1
            },
            "isWeekend": true,
            "isHoliday": false
          }
        ],
        "approvedLeaves": [
          {
            "memberId": 28,
            "date": "2026-05-19",
            "leaveType": "annual"
          }
        ],
        "preferredOffRequests": [
          {
            "memberId": 29,
            "date": "2026-05-08",
            "requestType": "preferred_off",
            "note": "학회 발표"
          },
          {
            "memberId": 31,
            "date": "2026-05-22",
            "requestType": "preferred_off",
            "note": "개인 일정"
          }
        ],
        "locks": [
          {
            "memberId": 27,
            "date": "2026-05-02",
            "shiftCode": "EDU",
            "reason": "장비 점검 리허설"
          },
          {
            "memberId": 29,
            "date": "2026-05-08",
            "shiftCode": "EDU",
            "reason": "학회 발표"
          },
          {
            "memberId": 31,
            "date": "2026-05-22",
            "shiftCode": "EDU",
            "reason": "신규 장비 교육"
          }
        ],
        "memberEvents": [
          {
            "id": 9,
            "teamId": 4,
            "periodId": 24,
            "memberId": 27,
            "scope": "member",
            "eventType": "fixed_shift",
            "title": "장비 점검 리허설",
            "startDate": "2026-05-02",
            "endDate": "2026-05-02",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-02"
            ]
          },
          {
            "id": 10,
            "teamId": 4,
            "periodId": 24,
            "memberId": 29,
            "scope": "member",
            "eventType": "conference",
            "title": "학회 발표",
            "startDate": "2026-05-08",
            "endDate": "2026-05-08",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-08"
            ]
          },
          {
            "id": 11,
            "teamId": 4,
            "periodId": 24,
            "memberId": 31,
            "scope": "member",
            "eventType": "education",
            "title": "신규 장비 교육",
            "startDate": "2026-05-22",
            "endDate": "2026-05-22",
            "startMinutes": 540,
            "endMinutes": 1020,
            "allDay": false,
            "blocksWork": true,
            "preferredShiftCode": "EDU",
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-22"
            ]
          }
        ],
        "wardEvents": [
          {
            "id": 13,
            "teamId": 4,
            "periodId": 24,
            "memberId": null,
            "scope": "team",
            "eventType": "meeting",
            "title": "시술실 운영 회의",
            "startDate": "2026-05-12",
            "endDate": "2026-05-12",
            "startMinutes": 900,
            "endMinutes": 960,
            "allDay": false,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-12"
            ]
          },
          {
            "id": 12,
            "teamId": 4,
            "periodId": 24,
            "memberId": null,
            "scope": "team",
            "eventType": "dinner",
            "title": "Angio 팀 회식",
            "startDate": "2026-05-14",
            "endDate": "2026-05-14",
            "startMinutes": 1080,
            "endMinutes": 1200,
            "allDay": false,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {},
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-14"
            ]
          },
          {
            "id": 14,
            "teamId": 4,
            "periodId": 24,
            "memberId": null,
            "scope": "team",
            "eventType": "ward_event",
            "title": "조영제 교육 라운딩",
            "startDate": "2026-05-16",
            "endDate": "2026-05-16",
            "startMinutes": null,
            "endMinutes": null,
            "allDay": true,
            "blocksWork": false,
            "preferredShiftCode": null,
            "coverageDelta": {
              "D": 1
            },
            "notes": null,
            "source": "seed",
            "dates": [
              "2026-05-16"
            ]
          }
        ],
        "leaveLedger": [
          {
            "memberId": 32,
            "memberName": "서민아",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": null
          },
          {
            "memberId": 30,
            "memberName": "이예나",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": null
          },
          {
            "memberId": 31,
            "memberName": "장지후",
            "annualLeaveDays": 0,
            "educationDays": 1,
            "blockedEventDays": 1,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": null
          },
          {
            "memberId": 29,
            "memberName": "최다현",
            "annualLeaveDays": 0,
            "educationDays": 1,
            "blockedEventDays": 1,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": null
          },
          {
            "memberId": 28,
            "memberName": "윤서진",
            "annualLeaveDays": 1,
            "educationDays": 0,
            "blockedEventDays": 0,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": "2026-05-19"
          },
          {
            "memberId": 27,
            "memberName": "김도윤",
            "annualLeaveDays": 0,
            "educationDays": 0,
            "blockedEventDays": 1,
            "recentNightCount": 0,
            "recentWeekendCount": 0,
            "recentPublishedChanges": 0,
            "lastLeaveDate": null
          }
        ],
        "datasetValidation": {
          "summary": {
            "total": 1,
            "errors": 0,
            "warnings": 1,
            "info": 0,
            "blocking": false
          },
          "items": [
            {
              "code": "member.new_grad_no_training",
              "severity": "warning",
              "title": "신규 간호사 교육 일정 누락",
              "message": "서민아에게 이번 기간 교육 또는 오리엔테이션 일정이 없습니다.",
              "memberId": 32
            }
          ]
        },
        "validation": {
          "summary": {
            "total": 1,
            "errors": 0,
            "warnings": 1,
            "info": 0,
            "blocking": false
          },
          "items": [
            {
              "code": "member.new_grad_no_training",
              "severity": "warning",
              "title": "신규 간호사 교육 일정 누락",
              "message": "서민아에게 이번 기간 교육 또는 오리엔테이션 일정이 없습니다.",
              "memberId": 32
            }
          ]
        },
        "datasetScenarioReport": {
          "total": 6,
          "passed": 5,
          "failed": 1,
          "items": [
            {
              "id": "dataset.leave_education_overlap",
              "title": "승인 휴가와 교육 이벤트 중복 감지",
              "category": "dataset",
              "passed": false,
              "expected": {
                "validationCode": "event.leave_overlap",
                "minimum": 1
              },
              "actual": {
                "count": 0
              }
            },
            {
              "id": "dataset.team_dinner_is_non_blocking",
              "title": "회식은 안내만 하고 근무를 막지 않음",
              "category": "dataset",
              "passed": true,
              "expected": {
                "blocksWork": false
              },
              "actual": {
                "count": 1,
                "blocksWorkFlags": [
                  false
                ]
              }
            },
            {
              "id": "dataset.fixed_shift_enforced",
              "title": "고정 shift 이벤트가 실제 배정에 반영됨",
              "category": "solver",
              "passed": true,
              "expected": {
                "fixedShiftCount": 1
              },
              "actual": {
                "assignmentChecked": false,
                "matchedCount": 0
              }
            },
            {
              "id": "dataset.coverage_delta_applied",
              "title": "공용 이벤트 coverage delta 반영",
              "category": "solver",
              "passed": true,
              "expected": {
                "eventCount": 1
              },
              "actual": {
                "applied": true
              }
            },
            {
              "id": "dataset.leave_fairness_warning",
              "title": "휴가 편중이 크면 fairness 경고 표시",
              "category": "validation",
              "passed": true,
              "expected": {
                "warningWhenSpreadAtLeast": 2
              },
              "actual": {
                "spread": 1,
                "warningCount": 0
              }
            },
            {
              "id": "dataset.new_grad_training_present",
              "title": "신규 간호사 교육 주간 데이터 보유",
              "category": "dataset",
              "passed": true,
              "expected": {
                "newGradCount": 2,
                "trainingEvents": ">= 1"
              },
              "actual": {
                "newGradTrainingCount": 1
              }
            }
          ]
        },
        "scenarioReport": {
          "total": 6,
          "passed": 5,
          "failed": 1,
          "items": [
            {
              "id": "dataset.leave_education_overlap",
              "title": "승인 휴가와 교육 이벤트 중복 감지",
              "category": "dataset",
              "passed": false,
              "expected": {
                "validationCode": "event.leave_overlap",
                "minimum": 1
              },
              "actual": {
                "count": 0
              }
            },
            {
              "id": "dataset.team_dinner_is_non_blocking",
              "title": "회식은 안내만 하고 근무를 막지 않음",
              "category": "dataset",
              "passed": true,
              "expected": {
                "blocksWork": false
              },
              "actual": {
                "count": 1,
                "blocksWorkFlags": [
                  false
                ]
              }
            },
            {
              "id": "dataset.fixed_shift_enforced",
              "title": "고정 shift 이벤트가 실제 배정에 반영됨",
              "category": "solver",
              "passed": true,
              "expected": {
                "fixedShiftCount": 1
              },
              "actual": {
                "assignmentChecked": false,
                "matchedCount": 0
              }
            },
            {
              "id": "dataset.coverage_delta_applied",
              "title": "공용 이벤트 coverage delta 반영",
              "category": "solver",
              "passed": true,
              "expected": {
                "eventCount": 1
              },
              "actual": {
                "applied": true
              }
            },
            {
              "id": "dataset.leave_fairness_warning",
              "title": "휴가 편중이 크면 fairness 경고 표시",
              "category": "validation",
              "passed": true,
              "expected": {
                "warningWhenSpreadAtLeast": 2
              },
              "actual": {
                "spread": 1,
                "warningCount": 0
              }
            },
            {
              "id": "dataset.new_grad_training_present",
              "title": "신규 간호사 교육 주간 데이터 보유",
              "category": "dataset",
              "passed": true,
              "expected": {
                "newGradCount": 2,
                "trainingEvents": ">= 1"
              },
              "actual": {
                "newGradTrainingCount": 1
              }
            }
          ]
        },
        "rules": {
          "ruleProfileId": 4,
          "hospitalRuleVersion": "2026.1",
          "minRestHours": 16,
          "maxNightShiftsPerMonth": 5,
          "forbiddenPatterns": [
            [
              "N",
              "OFF",
              "D"
            ]
          ],
          "weights": {
            "request": 12,
            "fairness": 20,
            "nightCap": 120,
            "continuity": 12
          }
        },
        "currentCandidateId": 10,
        "currentPublishVersionId": null
      }
    }
  },
  "schedules": {
    "101:2026-05": {
      "result": {
        "period": {
          "id": 23,
          "team_id": 3,
          "year": 2026,
          "month": 5,
          "status": "published",
          "current_candidate_id": 7,
          "current_publish_version_id": 2,
          "latest_run_id": 3
        },
        "candidates": [
          {
            "id": 7,
            "candidate_key": "request_friendly",
            "ranking": 1,
            "status": "selected",
            "score": {
              "total": 908,
              "overcoverage": 2,
              "night_cap_excess": 9,
              "night_balance_gap": 0,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 9건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "101 병동 요청반영형 후보안",
              "tradeoffs": [
                "야간 편차 합계 0",
                "주말·공휴일 편차 합계 0",
                "과편성 2건"
              ]
            },
            "published_diff": {
              "addedAssignments": 310,
              "affectedMemberIds": [
                17,
                18,
                19,
                20,
                21,
                22,
                23,
                24,
                25,
                26
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 310
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-02",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-03",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-04",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-05",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-06",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-07",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-08",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-09",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-10",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-11",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-12",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-13",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-14",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-15",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-16",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-17",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-18",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-19",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-20",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-21",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-22",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-23",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-24",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-25",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-26",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-27",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-28",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-29",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-30",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-31",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-01",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-02",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-03",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-04",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-05",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-06",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-07",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-08",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-09",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-10",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-11",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-12",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-13",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-14",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-15",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-16",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-17",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-18",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-19",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-20",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-21",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-22",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-23",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-24",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-25",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-26",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-27",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-28",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-29",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-30",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-31",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-01",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-02",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-03",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-04",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-05",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-06",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-07",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-08",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-09",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-10",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-11",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-12",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-13",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-14",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-15",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-16",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-17",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-18",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-19",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-20",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-21",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-22",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-23",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-24",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-25",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-26",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-27",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-28",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-29",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-30",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-31",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-01",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-02",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-03",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-04",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-05",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-06",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-07",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-08",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-09",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-10",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-11",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-12",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-13",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-14",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-15",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-16",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-17",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-18",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-19",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-20",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-21",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-22",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-23",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-24",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-25",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-26",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-27",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-28",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-29",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-30",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-31",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-01",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-02",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-03",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-04",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-05",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-06",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-07",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-08",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-09",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-10",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-11",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-12",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-13",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-14",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-15",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-16",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-17",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-18",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-19",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-20",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-21",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-22",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-23",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-24",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-25",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-26",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-27",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-28",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-29",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-30",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-31",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-01",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-02",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-03",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-04",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-05",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-06",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-07",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-08",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-09",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-10",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-11",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-12",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-13",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-14",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-15",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-16",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-17",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-18",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-19",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-20",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-21",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-22",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-23",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-24",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-25",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-26",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-27",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-28",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-29",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-30",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-31",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-01",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-02",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-03",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-04",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-05",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-06",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-07",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-08",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-09",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-10",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-11",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-12",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-13",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-14",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-15",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-16",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-17",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-18",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-19",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-20",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-21",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-22",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-23",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-24",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-25",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-26",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-27",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-28",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-29",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-30",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-31",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-01",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-02",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-03",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-04",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-05",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-06",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-07",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-08",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-09",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-10",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-11",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-12",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-13",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-14",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-15",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-16",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-17",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-18",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-19",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-20",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-21",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-22",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-23",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-24",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-25",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-26",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-27",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-28",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-29",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-30",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-31",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-01",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-02",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-03",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-04",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-05",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-06",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-07",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-08",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-09",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-10",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-11",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-12",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-13",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-14",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-15",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-16",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-17",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-18",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-19",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-20",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-21",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-22",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-23",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-24",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-25",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-26",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-27",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-28",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-29",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-30",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-31",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-01",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-02",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-03",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-04",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-05",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-06",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-07",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-08",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-09",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-10",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-11",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-12",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-13",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-14",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-15",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-16",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-17",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-18",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-19",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-20",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-21",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-22",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-23",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-24",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-25",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-26",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-27",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-28",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-29",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-30",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-31",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-20",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-21",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 18,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 19,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 20,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 21,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 22,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 23,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 24,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 25,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 26,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          },
          {
            "id": 8,
            "candidate_key": "balanced",
            "ranking": 2,
            "status": "draft",
            "score": {
              "total": 911,
              "overcoverage": 3,
              "night_cap_excess": 9,
              "night_balance_gap": 0,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 9건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "101 병동 균형형 후보안",
              "tradeoffs": [
                "야간 편차 합계 0",
                "주말·공휴일 편차 합계 0",
                "과편성 3건"
              ]
            },
            "published_diff": {
              "addedAssignments": 310,
              "affectedMemberIds": [
                17,
                18,
                19,
                20,
                21,
                22,
                23,
                24,
                25,
                26
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 310
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-02",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-03",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-04",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-05",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-06",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-07",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-08",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-09",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-10",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-11",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-12",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-13",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-14",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-15",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-16",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-17",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-18",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-19",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-20",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-21",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-22",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-23",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-24",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-25",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-26",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-27",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-28",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-29",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-30",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-31",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-01",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-02",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-03",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-04",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-05",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-06",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-07",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-08",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-09",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-10",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-11",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-12",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-13",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-14",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-15",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-16",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-17",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-18",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-19",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-20",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-21",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-22",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-23",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-24",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-25",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-26",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-27",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-28",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-29",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-30",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-31",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-01",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-02",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-03",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-04",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-05",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-06",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-07",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-08",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-09",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-10",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-11",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-12",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-13",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-14",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-15",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-16",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-17",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-18",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-19",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-20",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-21",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-22",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-23",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-24",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-25",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-26",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-27",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-28",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-29",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-30",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-31",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-01",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-02",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-03",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-04",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-05",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-06",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-07",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-08",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-09",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-10",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-11",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-12",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-13",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-14",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-15",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-16",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-17",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-18",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-19",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-20",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-21",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-22",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-23",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-24",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-25",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-26",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-27",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-28",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-29",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-30",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-31",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-01",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-02",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-03",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-04",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-05",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-06",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-07",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-08",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-09",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-10",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-11",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-12",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-13",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-14",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-15",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-16",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-17",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-18",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-19",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-20",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-21",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-22",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-23",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-24",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-25",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-26",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-27",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-28",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-29",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-30",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-31",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-01",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-02",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-03",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-04",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-05",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-06",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-07",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-08",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-09",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-10",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-11",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-12",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-13",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-14",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-15",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-16",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-17",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-18",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-19",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-20",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-21",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-22",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-23",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-24",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-25",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-26",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-27",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-28",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-29",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-30",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-31",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-01",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-02",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-03",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-04",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-05",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-06",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-07",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-08",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-09",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-10",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-11",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-12",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-13",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-14",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-15",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-16",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-17",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-18",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-19",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-20",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-21",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-22",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-23",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-24",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-25",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-26",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-27",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-28",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-29",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-30",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-31",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-01",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-02",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-03",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-04",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-05",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-06",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-07",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-08",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-09",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-10",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-11",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-12",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-13",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-14",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-15",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-16",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-17",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-18",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-19",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-20",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-21",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-22",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-23",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-24",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-25",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-26",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-27",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-28",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-29",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-30",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-31",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-01",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-02",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-03",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-04",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-05",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-06",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-07",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-08",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-09",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-10",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-11",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-12",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-13",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-14",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-15",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-16",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-17",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-18",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-19",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-20",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-21",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-22",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-23",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-24",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-25",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-26",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-27",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-28",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-29",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-30",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-31",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-01",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-02",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-03",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-04",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-05",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-06",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-07",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-08",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-09",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-10",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-11",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-12",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-13",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-14",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-15",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-16",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-17",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-18",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-19",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-20",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-21",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-22",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-23",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-24",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-25",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-26",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-27",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-28",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-29",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-30",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-31",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "장예린"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-20",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-21",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 18,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 19,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 20,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 21,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 22,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 23,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 24,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 25,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 26,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          },
          {
            "id": 9,
            "candidate_key": "continuity_friendly",
            "ranking": 3,
            "status": "draft",
            "score": {
              "total": 1002,
              "overcoverage": 0,
              "night_cap_excess": 8,
              "night_balance_gap": 8,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 8건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "101 병동 연속성형 후보안",
              "tradeoffs": [
                "야간 편차 합계 8",
                "주말·공휴일 편차 합계 0",
                "과편성 0건"
              ]
            },
            "published_diff": {
              "addedAssignments": 310,
              "affectedMemberIds": [
                17,
                18,
                19,
                20,
                21,
                22,
                23,
                24,
                25,
                26
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 310
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-02",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-03",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-04",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-05",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-06",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-07",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-08",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-09",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-10",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-11",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-12",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-13",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-14",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-15",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-16",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-17",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-18",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-19",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-20",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-21",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-22",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-23",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-24",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-25",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-26",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-27",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-28",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-29",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-30",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-31",
                "memberId": 17,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "김하늘"
              },
              {
                "date": "2026-05-01",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-02",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-03",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-04",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-05",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-06",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-07",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-08",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-09",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-10",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-11",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-12",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-13",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-14",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-15",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-16",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-17",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-18",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-19",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-20",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-21",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-22",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-23",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-24",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-25",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-26",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-27",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-28",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-29",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-30",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-31",
                "memberId": 18,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "박서연"
              },
              {
                "date": "2026-05-01",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-02",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-03",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-04",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-05",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-06",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-07",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-08",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-09",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-10",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-11",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-12",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-13",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-14",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-15",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-16",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-17",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-18",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-19",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-20",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-21",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-22",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-23",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-24",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-25",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-26",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-27",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-28",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-29",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-30",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-31",
                "memberId": 19,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "이수민"
              },
              {
                "date": "2026-05-01",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-02",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-03",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-04",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-05",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-06",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-07",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-08",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-09",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-10",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-11",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-12",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-13",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-14",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-15",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-16",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-17",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-18",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-19",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-20",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-21",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-22",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-23",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-24",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-25",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-26",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-27",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-28",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-29",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-30",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-31",
                "memberId": 20,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "최유진"
              },
              {
                "date": "2026-05-01",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-02",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-03",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-04",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-05",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-06",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-07",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-08",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-09",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-10",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-11",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-12",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-13",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-14",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-15",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-16",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-17",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-18",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-19",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-20",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-21",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-22",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-23",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-24",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-25",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-26",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-27",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-28",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-29",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-30",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-31",
                "memberId": 21,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "정민지"
              },
              {
                "date": "2026-05-01",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-02",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-03",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-04",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-05",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-06",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-07",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-08",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-09",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-10",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-11",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-12",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-13",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-14",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-15",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-16",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-17",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-18",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-19",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-20",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-21",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-22",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-23",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-24",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-25",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-26",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-27",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-28",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-29",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-30",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-31",
                "memberId": 22,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "한소희"
              },
              {
                "date": "2026-05-01",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-02",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-03",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-04",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-05",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-06",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-07",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-08",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-09",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-10",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-11",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-12",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-13",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-14",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-15",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-16",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-17",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-18",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-19",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-20",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-21",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-22",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-23",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-24",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-25",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-26",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-27",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-28",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-29",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-30",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-31",
                "memberId": 23,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "윤지아"
              },
              {
                "date": "2026-05-01",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-02",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "OFF",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-03",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-04",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-05",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-06",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-07",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-08",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-09",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-10",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-11",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-12",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-13",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-14",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-15",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-16",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-17",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-18",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-19",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-20",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-21",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-22",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-23",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-24",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-25",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-26",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-27",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-28",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-29",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-30",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-31",
                "memberId": 24,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "송채은"
              },
              {
                "date": "2026-05-01",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-02",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-03",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-04",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-05",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-06",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-07",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-08",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-09",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-10",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-11",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-12",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-13",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "EDU",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-14",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-15",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-16",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-17",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-18",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-19",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-20",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-21",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-22",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-23",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-24",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-25",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-26",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-27",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-28",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-29",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-30",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-31",
                "memberId": 25,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "오다은"
              },
              {
                "date": "2026-05-01",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-02",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-03",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-04",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-05",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-06",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-07",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-08",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-09",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-10",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-11",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-12",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-13",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-14",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-15",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-16",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-17",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-18",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-19",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-20",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-21",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-22",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-23",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-24",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-25",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-26",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "D",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-27",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-28",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-29",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "LEAVE",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-30",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "E",
                "memberName": "장예린"
              },
              {
                "date": "2026-05-31",
                "memberId": 26,
                "teamSlug": "101",
                "shiftCode": "N",
                "memberName": "장예린"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-20",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-21",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 24,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 19,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 20,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 21,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 22,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 23,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 24,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 25,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 26,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          }
        ],
        "published": {
          "id": 2,
          "version_number": 1,
          "status": "published",
          "diff_summary": {
            "addedAssignments": 310,
            "affectedMemberIds": [
              17,
              18,
              19,
              20,
              21,
              22,
              23,
              24,
              25,
              26
            ],
            "removedAssignments": 0,
            "totalChangedAssignments": 310
          },
          "assignments_snapshot": [
            {
              "date": "2026-05-01",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-02",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-03",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-04",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-05",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-06",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-07",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-08",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "EDU",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-09",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-10",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-11",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-12",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-13",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-14",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-15",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-16",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-17",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-18",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-19",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-20",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-21",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-22",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-23",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-24",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-25",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-26",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-27",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-28",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-29",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-30",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-31",
              "memberId": 17,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "김하늘"
            },
            {
              "date": "2026-05-01",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-02",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-03",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-04",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-05",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-06",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-07",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-08",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-09",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-10",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-11",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-12",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-13",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-14",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-15",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-16",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-17",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-18",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-19",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-20",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-21",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-22",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-23",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-24",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-25",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-26",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-27",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-28",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-29",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-30",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-31",
              "memberId": 18,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "박서연"
            },
            {
              "date": "2026-05-01",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-02",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-03",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-04",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-05",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-06",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-07",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-08",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-09",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-10",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-11",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-12",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-13",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-14",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-15",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-16",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-17",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-18",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-19",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-20",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-21",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-22",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-23",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-24",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-25",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-26",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-27",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-28",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-29",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-30",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-31",
              "memberId": 19,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "이수민"
            },
            {
              "date": "2026-05-01",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-02",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-03",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-04",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-05",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-06",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-07",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-08",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-09",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "EDU",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-10",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-11",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-12",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-13",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-14",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-15",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-16",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-17",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-18",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-19",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-20",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-21",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-22",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-23",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-24",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-25",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-26",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-27",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-28",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-29",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-30",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-31",
              "memberId": 20,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "최유진"
            },
            {
              "date": "2026-05-01",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-02",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-03",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-04",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-05",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-06",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-07",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-08",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-09",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-10",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-11",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-12",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-13",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-14",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-15",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-16",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-17",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-18",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-19",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-20",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-21",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-22",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-23",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-24",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-25",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-26",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-27",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-28",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-29",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-30",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-31",
              "memberId": 21,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "정민지"
            },
            {
              "date": "2026-05-01",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-02",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-03",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-04",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-05",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-06",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-07",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-08",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-09",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-10",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-11",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-12",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-13",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-14",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-15",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-16",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-17",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-18",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-19",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-20",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-21",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-22",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-23",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-24",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-25",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-26",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-27",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-28",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-29",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-30",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-31",
              "memberId": 22,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "한소희"
            },
            {
              "date": "2026-05-01",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-02",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-03",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-04",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-05",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-06",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-07",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-08",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-09",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-10",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-11",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-12",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-13",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-14",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-15",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-16",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-17",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-18",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-19",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-20",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-21",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-22",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-23",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-24",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-25",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-26",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-27",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-28",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-29",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-30",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-31",
              "memberId": 23,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "윤지아"
            },
            {
              "date": "2026-05-01",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-02",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-03",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-04",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-05",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-06",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-07",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-08",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-09",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-10",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-11",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-12",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-13",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-14",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-15",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-16",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-17",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-18",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-19",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-20",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "EDU",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-21",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "EDU",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-22",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-23",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-24",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-25",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-26",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-27",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-28",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-29",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-30",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-31",
              "memberId": 24,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "송채은"
            },
            {
              "date": "2026-05-01",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-02",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-03",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-04",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-05",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-06",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-07",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-08",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-09",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-10",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-11",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-12",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-13",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "EDU",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-14",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-15",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-16",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-17",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-18",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-19",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-20",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-21",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-22",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-23",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-24",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-25",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-26",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-27",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-28",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-29",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-30",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-31",
              "memberId": 25,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "오다은"
            },
            {
              "date": "2026-05-01",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "OFF",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-02",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-03",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-04",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-05",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-06",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-07",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-08",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-09",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-10",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-11",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-12",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-13",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-14",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-15",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-16",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-17",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-18",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-19",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-20",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-21",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-22",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-23",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-24",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-25",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-26",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "N",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-27",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "LEAVE",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-28",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-29",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "D",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-30",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            },
            {
              "date": "2026-05-31",
              "memberId": 26,
              "teamSlug": "101",
              "shiftCode": "E",
              "memberName": "장예린"
            }
          ],
          "created_at": "2026-04-12 00:14:13.265419+00"
        }
      }
    },
    "angio:2026-05": {
      "result": {
        "period": {
          "id": 24,
          "team_id": 4,
          "year": 2026,
          "month": 5,
          "status": "review",
          "current_candidate_id": 10,
          "current_publish_version_id": null,
          "latest_run_id": 4
        },
        "candidates": [
          {
            "id": 10,
            "candidate_key": "balanced",
            "ranking": 1,
            "status": "selected",
            "score": {
              "total": 820,
              "overcoverage": 6,
              "night_cap_excess": 6,
              "night_balance_gap": 4,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 6건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "Angio Team 균형형 후보안",
              "tradeoffs": [
                "야간 편차 합계 4",
                "주말·공휴일 편차 합계 0",
                "과편성 6건"
              ]
            },
            "published_diff": {
              "addedAssignments": 186,
              "affectedMemberIds": [
                27,
                28,
                29,
                30,
                31,
                32
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 186
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-02",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-03",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-04",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-05",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-06",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-07",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-08",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-09",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-10",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-11",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-12",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-13",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-14",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-15",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-16",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-17",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-18",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-19",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-20",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-21",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-22",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-23",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-24",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-25",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-26",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-27",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-28",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-29",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-30",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-31",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-01",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-02",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-03",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-04",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-05",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-06",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-07",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-08",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-09",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-10",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-11",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-12",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-13",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-14",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-15",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-16",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-17",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-18",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-19",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-20",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-21",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-22",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-23",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-24",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-25",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-26",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-27",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-28",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-29",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-30",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-31",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-01",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-02",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-03",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-04",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-05",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-06",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-07",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-08",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-09",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-10",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-11",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-12",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-13",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-14",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-15",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-16",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-17",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-18",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-19",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-20",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-21",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-22",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-23",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-24",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-25",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-26",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-27",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-28",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-29",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-30",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-31",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-01",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-02",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-03",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-04",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-05",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-06",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-07",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-08",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-09",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-10",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-11",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-12",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-13",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-14",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-15",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-16",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-17",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-18",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-19",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-20",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-21",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-22",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-23",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-24",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-25",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-26",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-27",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-28",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-29",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-30",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-31",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-01",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-02",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-03",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-04",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-05",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-06",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-07",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-08",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-09",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-10",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-11",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-12",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-13",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-14",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-15",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-16",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-17",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-18",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-19",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-20",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-21",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-22",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-23",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-24",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-25",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-26",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-27",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-28",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-29",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-30",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-31",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-01",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-02",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-03",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-04",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-05",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-06",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-07",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-08",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-09",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-10",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-11",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-12",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-13",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-14",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-15",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-16",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-17",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-18",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-19",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-20",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-21",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-22",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-23",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-24",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-25",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-26",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-27",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-28",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-29",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-30",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-31",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-08",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 29,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-22",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 31,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 28,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 29,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 30,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 31,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 2
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 32,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          },
          {
            "id": 11,
            "candidate_key": "request_friendly",
            "ranking": 2,
            "status": "draft",
            "score": {
              "total": 823,
              "overcoverage": 7,
              "night_cap_excess": 6,
              "night_balance_gap": 4,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 6건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "Angio Team 요청반영형 후보안",
              "tradeoffs": [
                "야간 편차 합계 4",
                "주말·공휴일 편차 합계 0",
                "과편성 7건"
              ]
            },
            "published_diff": {
              "addedAssignments": 186,
              "affectedMemberIds": [
                27,
                28,
                29,
                30,
                31,
                32
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 186
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-02",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-03",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-04",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-05",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-06",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-07",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-08",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-09",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-10",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-11",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-12",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-13",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-14",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-15",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-16",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-17",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-18",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-19",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-20",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-21",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-22",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-23",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-24",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-25",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-26",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-27",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-28",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-29",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-30",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-31",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-01",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-02",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-03",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-04",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-05",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-06",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-07",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-08",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-09",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-10",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-11",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-12",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-13",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-14",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-15",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-16",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-17",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-18",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-19",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-20",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-21",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-22",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-23",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-24",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-25",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-26",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-27",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-28",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-29",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-30",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-31",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-01",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-02",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-03",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-04",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-05",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-06",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-07",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-08",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-09",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-10",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-11",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-12",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-13",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-14",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-15",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-16",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-17",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-18",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-19",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-20",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-21",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-22",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-23",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-24",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-25",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-26",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-27",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-28",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-29",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-30",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-31",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-01",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-02",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-03",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-04",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-05",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-06",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-07",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-08",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-09",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-10",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-11",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-12",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-13",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-14",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-15",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-16",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-17",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-18",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-19",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-20",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-21",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-22",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-23",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-24",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-25",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-26",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-27",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-28",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-29",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-30",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-31",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-01",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-02",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-03",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-04",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-05",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-06",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-07",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-08",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-09",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-10",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-11",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-12",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-13",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-14",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-15",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-16",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-17",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-18",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-19",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-20",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-21",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-22",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-23",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-24",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-25",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-26",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-27",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-28",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-29",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-30",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-31",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-01",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-02",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-03",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-04",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-05",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-06",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-07",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-08",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-09",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-10",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-11",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-12",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-13",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-14",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-15",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-16",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-17",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-18",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-19",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-20",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-21",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-22",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-23",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-24",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-25",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-26",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-27",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-28",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-29",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-30",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-31",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-08",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 29,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-22",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 31,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 28,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 2
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 29,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 30,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 31,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 32,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          },
          {
            "id": 12,
            "candidate_key": "continuity_friendly",
            "ranking": 3,
            "status": "draft",
            "score": {
              "total": 823,
              "overcoverage": 7,
              "night_cap_excess": 6,
              "night_balance_gap": 4,
              "continuity_changes": 0,
              "request_violations": 2,
              "weekend_balance_gap": 0
            },
            "explanation": {
              "reasons": [
                "희망 오프 미반영 2건",
                "야간 상한 초과 6건",
                "직전 배포안 대비 변경 0건"
              ],
              "headline": "Angio Team 연속성형 후보안",
              "tradeoffs": [
                "야간 편차 합계 4",
                "주말·공휴일 편차 합계 0",
                "과편성 7건"
              ]
            },
            "published_diff": {
              "addedAssignments": 186,
              "affectedMemberIds": [
                27,
                28,
                29,
                30,
                31,
                32
              ],
              "removedAssignments": 0,
              "totalChangedAssignments": 186
            },
            "assignments_snapshot": [
              {
                "date": "2026-05-01",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-02",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-03",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-04",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-05",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-06",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-07",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-08",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-09",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-10",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-11",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-12",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-13",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-14",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-15",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-16",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-17",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-18",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-19",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-20",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-21",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-22",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-23",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-24",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-25",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-26",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-27",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-28",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-29",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-30",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-31",
                "memberId": 27,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "김도윤"
              },
              {
                "date": "2026-05-01",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-02",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-03",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-04",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-05",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-06",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-07",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-08",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-09",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-10",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-11",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-12",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-13",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-14",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-15",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-16",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-17",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-18",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-19",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-20",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-21",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-22",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-23",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-24",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-25",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-26",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-27",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-28",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-29",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-30",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-31",
                "memberId": 28,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "윤서진"
              },
              {
                "date": "2026-05-01",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-02",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-03",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-04",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-05",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-06",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-07",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-08",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-09",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-10",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-11",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-12",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-13",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-14",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-15",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-16",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-17",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-18",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-19",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-20",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-21",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-22",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-23",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-24",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-25",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-26",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-27",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-28",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-29",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-30",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-31",
                "memberId": 29,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "최다현"
              },
              {
                "date": "2026-05-01",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-02",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-03",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-04",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-05",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-06",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-07",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-08",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-09",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-10",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-11",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-12",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-13",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-14",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-15",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-16",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-17",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-18",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-19",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-20",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-21",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-22",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-23",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-24",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-25",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-26",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-27",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-28",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-29",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-30",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-31",
                "memberId": 30,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "이예나"
              },
              {
                "date": "2026-05-01",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-02",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-03",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-04",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-05",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-06",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-07",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-08",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-09",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-10",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-11",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-12",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-13",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-14",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-15",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-16",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-17",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-18",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-19",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-20",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-21",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-22",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "EDU",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-23",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-24",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-25",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-26",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-27",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-28",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-29",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-30",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-31",
                "memberId": 31,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "장지후"
              },
              {
                "date": "2026-05-01",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "OFF",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-02",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-03",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-04",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-05",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-06",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-07",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-08",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-09",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-10",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-11",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-12",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-13",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-14",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-15",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-16",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-17",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-18",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-19",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-20",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-21",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-22",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-23",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-24",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-25",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-26",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-27",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-28",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "D",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-29",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "N",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-30",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "LEAVE",
                "memberName": "서민아"
              },
              {
                "date": "2026-05-31",
                "memberId": 32,
                "teamSlug": "angio",
                "shiftCode": "E",
                "memberName": "서민아"
              }
            ],
            "violations_snapshot": [
              {
                "date": "2026-05-08",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 29,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "date": "2026-05-22",
                "details": {
                  "assigned": "EDU"
                },
                "message": "희망 오프를 반영하지 못했습니다.",
                "memberId": 31,
                "ruleCode": "request.preferred_off",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 28,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 2
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 29,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 30,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 31,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              },
              {
                "details": {
                  "extraNights": 1
                },
                "message": "월간 야간 상한을 초과했습니다.",
                "memberId": 32,
                "ruleCode": "night.max_monthly",
                "severity": "soft"
              }
            ]
          }
        ],
        "published": null
      }
    }
  },
  "regulations": {
    "2026": {
      "_meta": {
        "id": "nurse_regulation_2026",
        "version": "2026.2.0",
        "title": "병동 간호 운영 규정 마스터",
        "description": "2026 조합원 수첩 전체를 근무표 운영, 임금 계산, 복지, 휴직, 인력운영 관점으로 재구성한 정규화 규정 데이터.",
        "source_pdf": "content/policies/2026/2026_조합원_수첩_최종파일.pdf",
        "source_sha256": "57cca3365f921bc44063299c2c4399052755680cafc839d77c4b5ff18b4406ba",
        "page_count": 104,
        "same_as_legacy_pdf": "data/2026_handbook.pdf",
        "compiled_for": [
          "nurse_admin",
          "regulation ingest",
          "scenario verification"
        ],
        "notes": [
          "운영상 바로 쓰는 값은 handbook 문구를 우선하고, 기존 hospital_rule_master_2026의 수치형 데이터를 병합해 유지했다.",
          "교대 규칙은 병동 운영에 보수적으로 적용하기 위해 stricter-first 원칙을 쓴다."
        ]
      },
      "document_outline": [
        {
          "title": "단체협약서",
          "page_start": 6,
          "page_end": 57
        },
        {
          "title": "의료민주화 및 의료공공성",
          "page_start": 58,
          "page_end": 67
        },
        {
          "title": "비정규직 대책",
          "page_start": 68,
          "page_end": 74
        },
        {
          "title": "고용안정",
          "page_start": 75,
          "page_end": 79
        },
        {
          "title": "인력충원",
          "page_start": 80,
          "page_end": 91
        },
        {
          "title": "2015년 신 취업규칙 도입 합의",
          "page_start": 92,
          "page_end": 92
        },
        {
          "title": "사학연금",
          "page_start": 93,
          "page_end": 93
        },
        {
          "title": "산별교섭 / 치과병원 분립 / 재정자립기금",
          "page_start": 94,
          "page_end": 95
        },
        {
          "title": "임금 구성 및 2025년 보수표",
          "page_start": 96,
          "page_end": 98
        },
        {
          "title": "청원휴가 및 경조금",
          "page_start": 99,
          "page_end": 101
        },
        {
          "title": "휴직제도",
          "page_start": 102,
          "page_end": 103
        },
        {
          "title": "리프레시 지원비 사용가능 항목",
          "page_start": 104,
          "page_end": 104
        }
      ],
      "ui_quick_facts": [
        {
          "id": "rest",
          "label": "최소 휴식",
          "value": "16시간",
          "ref": "제32조 / p20"
        },
        {
          "id": "night_cap",
          "label": "야간 상한",
          "value": "월 6회 운영, 7회 이상 리커버리데이",
          "ref": "제32조 / p20"
        },
        {
          "id": "night_hard_cap",
          "label": "야간 하드캡",
          "value": "월 9회 초과 금지 방향",
          "ref": "교대근로자 야간근무 / p21"
        },
        {
          "id": "age_guard",
          "label": "40세 이상",
          "value": "간호부 교대자 야간 제외 원칙",
          "ref": "제32조 / p20"
        },
        {
          "id": "oncall",
          "label": "온콜 출동",
          "value": "2시간 근무 인정 + 50,000원",
          "ref": "제32조 / p20"
        },
        {
          "id": "prime_team",
          "label": "프라임팀",
          "value": "대체근무 20,000원 가산",
          "ref": "2024.11 합의 / p20-21"
        },
        {
          "id": "taxi",
          "label": "심야 택시",
          "value": "자정 이후 퇴근 시 지원",
          "ref": "2023.11 / 2024.11 / p20"
        },
        {
          "id": "refresh",
          "label": "리프레시",
          "value": "연 360,000원",
          "ref": "p37, p104"
        }
      ],
      "wage_tables_2025": {
        "auto_promotion_rules": {
          "general": {
            "J1_to_J2": 4,
            "J2_to_J3": 7,
            "J3_limit": 8
          },
          "operation": {
            "A1_to_A2": 4,
            "A2_to_A3": 7,
            "A3_limit": 7
          },
          "environment": {
            "SA1_to_SA2": 4,
            "SA2_to_SA3": 7,
            "SA3_limit": 7
          }
        },
        "page_refs": [
          96,
          97,
          98
        ],
        "general_M_grade": {
          "M3": {
            "base_salary_by_year": [
              54482400,
              54944400,
              55411200,
              55874400,
              56349600,
              56824800,
              57310800,
              57796800
            ],
            "ability_pay": 22734000,
            "bonus": 2908800,
            "family_support": 15941330
          },
          "M2": {
            "base_salary_by_year": [
              51369600,
              51798000,
              52226400,
              52666800,
              53106000,
              53545200,
              53996400,
              54446400
            ],
            "ability_pay": 21274800,
            "bonus": 2670000,
            "family_support": 14619150
          },
          "M1": {
            "base_salary_by_year": [
              47559600,
              47956800,
              48354000,
              48750000,
              49155600,
              49562400,
              49981200,
              50401200
            ],
            "ability_pay": 19502400,
            "bonus": 2448000,
            "family_support": 13387470
          }
        },
        "general_S_grade": {
          "S3": {
            "base_salary_by_year": [
              44073600,
              44500800,
              44928000,
              45370800,
              45814800,
              46255200,
              46706400,
              47157600
            ],
            "ability_pay": 16208400,
            "bonus": 2366400,
            "family_support": 12932980
          },
          "S2": {
            "base_salary_by_year": [
              40173600,
              40568400,
              40966800,
              41361600,
              41778000,
              42183600,
              42589200,
              43008000
            ],
            "ability_pay": 14558400,
            "bonus": 2127600,
            "family_support": 11610790
          },
          "S1": {
            "base_salary_by_year": [
              36316800,
              36669600,
              37030800,
              37398000,
              37767600,
              38128800,
              38505600,
              38880000
            ],
            "ability_pay": 12908400,
            "bonus": 1888800,
            "family_support": 10284680
          }
        },
        "general_J_grade": {
          "J3": {
            "base_salary_by_year": [
              32379600,
              32697600,
              33019200,
              33340800,
              33666000,
              33988800,
              34318800,
              34652400
            ],
            "ability_pay": 8965200,
            "bonus": 1880400,
            "family_support": 10237460
          },
          "J2": {
            "base_salary_by_year": [
              28262400,
              28542000,
              28816800,
              29096400,
              29390400,
              29680800,
              29967600,
              30258000
            ],
            "ability_pay": 7569600,
            "bonus": 1588800,
            "family_support": 8622110
          },
          "J1": {
            "base_salary_by_year": [
              25752000,
              26008800,
              26260800,
              26516400,
              26779200,
              27049200,
              27314400,
              27583200
            ],
            "ability_pay": 6710400,
            "bonus": 1410000,
            "family_support": 7634410
          }
        },
        "operation_L_grade": {
          "L3": {
            "base_salary_by_year": [
              41824800,
              42169200,
              42511200,
              42853200,
              43206000,
              43556400,
              43914000,
              44274000
            ],
            "ability_pay": 9142800,
            "bonus": 1899600,
            "family_support": 10361870
          },
          "L2": {
            "base_salary_by_year": [
              38842800,
              39156000,
              39466800,
              39788400,
              40107600,
              40424400,
              40756800,
              41084400
            ],
            "ability_pay": 8671200,
            "bonus": 1744800,
            "family_support": 9502450
          },
          "L1": {
            "base_salary_by_year": [
              36064800,
              36350400,
              36640800,
              36930000,
              37227600,
              37522800,
              37826400,
              38128800
            ],
            "ability_pay": 8202000,
            "bonus": 1600800,
            "family_support": 8701860
          }
        },
        "operation_C_grade": {
          "C3": {
            "base_salary_by_year": [
              33271200,
              33600000,
              33931200,
              34266000,
              34612800,
              34948800,
              35294400,
              35640000
            ],
            "ability_pay": 7279200,
            "bonus": 1546800,
            "family_support": 8406440
          },
          "C2": {
            "base_salary_by_year": [
              30451200,
              30757200,
              31063200,
              31368000,
              31690800,
              32007600,
              32319600,
              32642400
            ],
            "ability_pay": 6770400,
            "bonus": 1392000,
            "family_support": 7547010
          },
          "C1": {
            "base_salary_by_year": [
              27662400,
              27936000,
              28220400,
              28502400,
              28794000,
              29074800,
              29366400,
              29656800
            ],
            "ability_pay": 6249600,
            "bonus": 1237200,
            "family_support": 6685040
          }
        },
        "operation_A_grade": {
          "A3": {
            "base_salary_by_year": [
              24810000,
              25060800,
              25310400,
              25564800,
              25825200,
              26073600,
              26335200,
              26593200
            ],
            "ability_pay": 5545200,
            "bonus": 1231200,
            "family_support": 6654350
          },
          "A2": {
            "base_salary_by_year": [
              21835200,
              22056000,
              22276800,
              22495200,
              22732800,
              22962000,
              23187600,
              23421600
            ],
            "ability_pay": 4929600,
            "bonus": 1041600,
            "family_support": 5604370
          },
          "A1": {
            "base_salary_by_year": [
              20258400,
              20463600,
              20665200,
              20871600,
              21085200,
              21297600,
              21508800,
              21724800
            ],
            "ability_pay": 4371600,
            "bonus": 926400,
            "family_support": 4962370
          }
        },
        "environment_SL_grade": {
          "SL3": {
            "base_salary_by_year": [
              41709600,
              42019200,
              42328800,
              42638400,
              42956400,
              43272000,
              43596000,
              43921200
            ],
            "ability_pay": 8229600,
            "bonus": 1710000,
            "family_support": 2548900
          },
          "SL2": {
            "base_salary_by_year": [
              38683200,
              38966400,
              39244800,
              39535200,
              39824400,
              40112400,
              40407600,
              40706400
            ],
            "ability_pay": 7804800,
            "bonus": 1570800,
            "family_support": 2411400
          },
          "SL1": {
            "base_salary_by_year": [
              35863200,
              36120000,
              36381600,
              36642000,
              36909600,
              37177200,
              37452000,
              37726800
            ],
            "ability_pay": 7382400,
            "bonus": 1441200,
            "family_support": 2283800
          }
        },
        "environment_SC_grade": {
          "SC3": {
            "base_salary_by_year": [
              33208800,
              33507600,
              33808800,
              34108800,
              34419600,
              34725600,
              35036400,
              35349600
            ],
            "ability_pay": 6552000,
            "bonus": 1393200,
            "family_support": 2236500
          },
          "SC2": {
            "base_salary_by_year": [
              30326400,
              30606000,
              30880800,
              31155600,
              31447200,
              31730400,
              32014800,
              32306400
            ],
            "ability_pay": 6093600,
            "bonus": 1252800,
            "family_support": 2099000
          },
          "SC1": {
            "base_salary_by_year": [
              27470400,
              27720000,
              27976800,
              28232400,
              28494000,
              28748400,
              29010000,
              29272800
            ],
            "ability_pay": 5625600,
            "bonus": 1113600,
            "family_support": 1961500
          }
        },
        "environment_SA_grade": {
          "SA3": {
            "base_salary_by_year": [
              24872400,
              25099200,
              25326000,
              25552800,
              25788000,
              26017200,
              26250000,
              26485200
            ],
            "ability_pay": 4990800,
            "bonus": 1108800,
            "family_support": 1956000
          },
          "SA2": {
            "base_salary_by_year": [
              21777600,
              21976800,
              22176000,
              22374000,
              22590000,
              22792800,
              22998000,
              23206800
            ],
            "ability_pay": 4437600,
            "bonus": 938400,
            "family_support": 1788800
          },
          "SA1": {
            "base_salary_by_year": [
              20097600,
              20283600,
              20469600,
              20653200,
              20842800,
              21037200,
              21228000,
              21421200
            ],
            "ability_pay": 3934800,
            "bonus": 834000,
            "family_support": 1686500
          }
        }
      },
      "wage_structure_and_allowances": {
        "page_refs": [
          31,
          34,
          35,
          36,
          37,
          96,
          97,
          98
        ],
        "wage_components": {
          "base_salary": [
            "기준기본급",
            "근속가산기본급",
            "승급조정급",
            "군복무수당"
          ],
          "ordinary_wage": [
            "기준기본급",
            "근속가산기본급",
            "군복무수당",
            "능력급",
            "상여금",
            "가계지원비",
            "조정급",
            "승급조정급",
            "장기근속수당",
            "별정수당(반장/전문직위)",
            "직책급",
            "업무보조비",
            "급식보조비",
            "교통보조비",
            "명절지원비",
            "교육훈련비"
          ],
          "tenure_base_addition": {
            "condition": "2016.02.29 이전 입사자",
            "formula_base": "기준기본급 + (조정급 * 0.5)",
            "rates_by_years": {
              "1_to_4": 0.02,
              "5_to_9": 0.05,
              "10_to_14": 0.06,
              "15_to_19": 0.07,
              "20_over": 0.08
            }
          }
        },
        "fixed_allowances": {
          "meal_subsidy": 150000,
          "transportation_subsidy": 150000,
          "military_service": {
            "amount": 45000,
            "condition": "최대 24개월 월할 계산, 직급연차 미산입"
          },
          "training_monthly": 40000,
          "refresh_support_yearly": 360000
        },
        "family_allowance": {
          "spouse": 40000,
          "other_members": {
            "amount": 20000,
            "max_count": 5
          },
          "child_tiers": {
            "first": 30000,
            "second": 70000,
            "third_and_above": 110000
          }
        },
        "long_service_allowance": {
          "tiers": {
            "5_to_9y": 50000,
            "10_to_14y": 60000,
            "15_to_19y": 80000,
            "20y_over": 100000
          },
          "add_ons": {
            "21y_over_extra": 10000,
            "25y_over_extra": 30000
          },
          "milestone_bonus": {
            "10y": 100000,
            "20y": 100000,
            "30y": 100000
          }
        },
        "conditional_wages": {
          "holiday_support": {
            "formula": "(기준기본급 + 조정급 * 0.5) * 0.5",
            "payment_months": [
              "설날월",
              "추석월",
              5,
              7
            ]
          },
          "family_support_months": [
            3,
            4,
            5,
            6,
            7,
            8,
            10,
            11,
            12,
            "설날월",
            "추석월"
          ],
          "lost_experience_compensation": {
            "A1_to_A2": 120000,
            "SA1_to_SA2": 105600
          },
          "duty_and_night_duty_flat": 50000
        }
      },
      "working_hours_and_shift_rules": {
        "page_refs": [
          20,
          21,
          22,
          27
        ],
        "standard_hours": {
          "daily": 8,
          "weekly": 40,
          "hazardous_daily": 6,
          "hazardous_weekly": 35,
          "rest_time": "1시간 (교대근무자 미사용 시 1인근무지 자동인정, 2인 이상은 수간호사/동료 확인 후 인정)",
          "shift_templates": {
            "D": {
              "start_minutes": 420,
              "end_minutes": 900,
              "is_work": true
            },
            "E": {
              "start_minutes": 840,
              "end_minutes": 1320,
              "is_work": true
            },
            "N": {
              "start_minutes": 1260,
              "end_minutes": 1860,
              "is_work": true
            },
            "OFF": {
              "start_minutes": 0,
              "end_minutes": 0,
              "is_work": false
            },
            "LEAVE": {
              "start_minutes": 0,
              "end_minutes": 0,
              "is_work": false
            },
            "EDU": {
              "start_minutes": 540,
              "end_minutes": 1020,
              "is_work": false
            },
            "9A": {
              "start_minutes": 540,
              "end_minutes": 1020,
              "is_work": false
            }
          }
        },
        "shift_worker_rules": {
          "max_night_shifts_per_month": 6,
          "hard_monthly_night_cap": 9,
          "night_shift_bonus": 10000,
          "min_rest_between_shifts": 16,
          "schedule_change_rest_after_night": 30,
          "age_based_night_exclusion": {
            "age": 40,
            "scope": "간호부 교대근무자",
            "policy": "야간근무 제외 원칙"
          },
          "forbidden_patterns": [
            [
              "N",
              "OFF",
              "D"
            ],
            [
              "N",
              "OFF",
              "9A"
            ]
          ],
          "recovery_day": {
            "monthly_over_7_days": {
              "trigger": 7,
              "reward_days": 1,
              "note": "7일 이상 시 선부여, 누적 15일 계산에서 해당 7일 차감"
            },
            "nurse_cumulative": {
              "trigger": 15,
              "reward_days": 1
            },
            "facility_and_others_cumulative": {
              "trigger": 20,
              "reward_days": 1
            }
          },
          "substitute_work": {
            "emergency_holiday_call": "대체휴일 부여 또는 통상임금 150%",
            "prime_team_allowance": 20000
          }
        },
        "overtime_and_on_call": {
          "calculation_unit_minutes": 15,
          "hourly_wage_formula": "ordinary_wage * (1/209)",
          "multipliers": {
            "standard": 1.5,
            "night_22_to_06": 2,
            "holiday_within_8h": 1.5,
            "holiday_over_8h": 2,
            "standard_worker_continuous_night": 2
          },
          "on_call": {
            "standby_per_day": 10000,
            "dispatch_transport": 50000,
            "dispatch_recognized_hours": 2
          },
          "midnight_taxi_support": {
            "enabled": true,
            "eligible_groups": [
              "3교대 이브닝 근무자",
              "모든 연장근무자"
            ],
            "condition": "자정 이후 퇴근 시"
          }
        }
      },
      "leaves_and_holidays": {
        "page_refs": [
          28,
          29,
          30,
          99,
          100,
          102,
          103
        ],
        "annual_leave": {
          "base": 15,
          "addition_per_2y": 1,
          "max": 25,
          "unused_compensation": "익년 1월 평균임금(법정수당/연차보전/야간가산 제외) 100%",
          "pre_2004_compensation_formula": "(기존 연월차 - 개정 연차) * 통상임금 * 150%",
          "compensation_coefficient_table_pre_2004": {
            "1y_2003": 7,
            "2y_2002": 7,
            "3y_2001": 8,
            "5y_1999": 9,
            "7y_1997": 10,
            "10y_1994": 11,
            "15y_1989": 14,
            "20y_1984": 16,
            "25y_1979": 21
          }
        },
        "official_and_special_holidays": {
          "union_foundation_day": "8월 1일 09:00~13:00 근무 (휴일 시 해당주 금요일 오전 근무)",
          "reserve_forces": "유급, 휴일 시 휴일수당, 야간 훈련 익일 유급휴가",
          "blood_donation": "연 1일 공가",
          "training_leaves": {
            "family_friendly": "연 3회(각 1일)",
            "online_mandatory": "연 3일"
          }
        },
        "maternity_and_protection": {
          "menstruation_leave": "월 1회 무급 (기본급 일액 90% 공제)",
          "maternity_leave": {
            "single": 90,
            "twins": 120,
            "postpartum_min_single": 45,
            "postpartum_min_twins": 60,
            "salary_support": "3개월째 급여-고용보험 차액 병원 지급"
          },
          "miscarriage_weeks": {
            "under_11w": 5,
            "12_to_15w": 10,
            "16_to_21w": 30,
            "22_to_27w": 60,
            "over_28w": 90
          },
          "fetal_checkup": "월 1일 유급",
          "nursing_time": "생후 1년 미만 유아, 1일 2회 30분 유급",
          "reduced_working_hours": "임신 12주 이내 또는 36주 이후 1일 2시간 단축 (주 단위 적치 가능)",
          "night_work_ban_for_pregnancy": true
        },
        "petition_and_special_leaves": {
          "marriage": {
            "self": 5,
            "child": 1
          },
          "childbirth_spouse": 20,
          "adoption": 20,
          "death": {
            "self_spouse_parents": 5,
            "child_and_spouse_child": 3,
            "grandparents_siblings": 3
          },
          "family_care": "연 2일 유급 (2명 이상/장애/한부모는 3일)",
          "long_service": {
            "10_to_19y": 5,
            "over_20y": 7
          },
          "disaster_and_assault": {
            "major_disaster": 3,
            "traffic_block": "당국 지시 기간",
            "assault_victim": "휴가 필요 인정 기간"
          }
        }
      },
      "leave_of_absence_and_retirement": {
        "page_refs": [
          10,
          32,
          35,
          37,
          102,
          103
        ],
        "retirement_and_service_year": {
          "retirement_age": 60,
          "retirement_effective_date": "해당 연도 12월 말일",
          "service_year_pay_rate": 0.6,
          "protection_floor": "운영기능직 최저임금 120%",
          "merit_training_leave_years": 1
        },
        "mandatory_leaves": [
          "질병/부상 장기간 직무 불가",
          "병역 소집",
          "소재 불분명",
          "만 8세/초2 이하 자녀 육아휴직"
        ],
        "discretionary_leaves": {
          "criminal_indictment": "형사 구속기소",
          "work_injury_extension": "상병 6개월 후 업무 불가",
          "family_care": "가족 간병",
          "personal_health_pregnancy": "본인 요양 및 임신(난임/불임)",
          "study_abroad": {
            "condition": "국외 유학",
            "required_tenure": 8
          },
          "self_development": {
            "max_years": 1,
            "required_tenure": 5,
            "bonus_months_for_10y_tenure": 6
          }
        },
        "sick_leave_requirements": {
          "condition": "4대 중증 질환 외 질병/부상",
          "documents": [
            "본원(보라매, 분당 포함) 및 상급종합병원 전문의 진단서"
          ]
        },
        "leave_pay_rates": {
          "childcare_months_1_to_6": {
            "rate": 1,
            "cap_1_to_3m": 2500000,
            "cap_4_to_6m": 2000000
          },
          "childcare_months_7_to_12": {
            "rate": 0.8,
            "cap": 1600000
          },
          "sick_and_injury_leave": {
            "rate": 0.7,
            "formula": "(기준기본급+기준능력급+상여금+조정급) * 0.7"
          }
        }
      },
      "severance_pay_rules": {
        "page_refs": [
          35,
          36,
          37
        ],
        "standard_severance": "평균임금 * 근속연수",
        "pre_2001_multipliers": {
          "1y": 1,
          "2y": 2,
          "3y": 3.5,
          "4y": 5.5,
          "5y": 7.5,
          "6y": 9.1,
          "7y": 10.7,
          "8y": 12.3,
          "9y": 13.9,
          "10y": 15.5,
          "11y": 17.2,
          "12y": 18.9,
          "13y": 20.6,
          "14y": 22.3,
          "15y": 24,
          "20y": 33,
          "25y": 42.5,
          "30y": 52.5
        },
        "pre_2015_severance_addon": {
          "1_to_4y": 0.1,
          "5_to_9y": 0.35,
          "10_to_14y": 0.45,
          "15_to_19y": 0.5,
          "over_20y": 0.6
        }
      },
      "welfare_and_training": {
        "page_refs": [
          38,
          44,
          45,
          66,
          67,
          104
        ],
        "welfare_points": {
          "base": 700,
          "tenure_per_year": 10,
          "tenure_max": 300,
          "family": {
            "spouse": 100,
            "child_1_to_2": 100,
            "child_3_over": 200,
            "others": 50
          },
          "childbirth_bonus": {
            "first": 1000,
            "second": 2000,
            "third_over": 3000
          },
          "student_support": "만 16세부터 7년간 연 1200P"
        },
        "meal_support": {
          "night_worker_meal": true,
          "military_early_shift_meal": true
        },
        "new_hire_training": {
          "nurse_duration_weeks": 8,
          "icu_nurse_duration_weeks": 10,
          "nurse_pay_first_4_weeks_rate": 0.8,
          "preceptor_allowance": 200000,
          "handover_period_days": 5
        },
        "congratulatory_money": {
          "hospital_paid": {
            "marriage_self": 300000,
            "marriage_child": 100000,
            "childbirth_spouse": 100000,
            "death_self_spouse": 1000000,
            "death_parents": 300000,
            "death_child": 300000,
            "death_grandparents_siblings": 50000
          },
          "union_paid": {
            "marriage_self": 100000,
            "marriage_child": 50000,
            "birth": "아기 내복",
            "death_self_spouse_parents_child": 50000,
            "death_self": 100000
          },
          "birthday_gift": 50000
        },
        "refresh_categories": [
          {
            "category": "건강관리",
            "items": [
              "스포츠센터 체력단련",
              "증빙 가능한 골프레슨 강습료"
            ]
          },
          {
            "category": "능력계발",
            "items": [
              "도서",
              "학원/온라인강의",
              "대학(원) 등록금",
              "공연/전시/영화 관람",
              "시험 응시료"
            ]
          }
        ]
      },
      "medical_support": {
        "page_refs": [
          44,
          67
        ],
        "self": {
          "registration_percent": 50,
          "insurance_percent": 50,
          "non_insurance_percent": 50,
          "non_covered_percent": 50,
          "select_doctor_percent": 100
        },
        "family": {
          "eligible": [
            "배우자",
            "부모",
            "만25세 미만 자녀"
          ],
          "insurance_percent": 50,
          "non_insurance_percent": 50,
          "non_covered_percent": 50
        },
        "hospitals": [
          "본원",
          "보라매",
          "분당",
          "치과병원"
        ]
      },
      "staffing_and_public_service": {
        "page_refs": [
          58,
          59,
          60,
          61,
          62,
          63,
          64,
          65,
          80,
          81,
          82,
          83,
          84,
          85,
          86,
          87,
          88,
          89,
          90,
          91
        ],
        "public_service_commitments": [
          "국가중앙병원으로서 공공의료 확대",
          "영리법인 도입 억제",
          "감염관리 및 환자 정보 보호",
          "어린이병원과 공공지원 확대",
          "진료지원 간호사 운영 시 법령·가이드라인 준수"
        ],
        "staffing_timeline": [
          {
            "year": 2021,
            "item": "병동 교대근무자 긴급 결원 대응 예비 간호인력 시범사업",
            "nurse_positions": "본원 약 15명 내외, 보라매 3명"
          },
          {
            "year": 2022,
            "item": "보라매 간호부 및 통합병동 추가 충원",
            "nurse_positions": "보라매 다수 병동 간호직/간호조무사 확대"
          },
          {
            "year": 2023,
            "item": "SICU, MICU, 101병동, 1:7 상향 병동 충원",
            "nurse_positions": "본원 12명, 보라매 14명 포함"
          },
          {
            "year": 2024,
            "item": "교대근무자 예비간호인력 확대",
            "nurse_positions": "본원 1명, 보라매 통합서비스 병동 2명 + 간호조무사 1명"
          },
          {
            "year": 2025,
            "item": "프라임팀 및 소아 프라임팀 정규 충원",
            "nurse_positions": "본원 프라임팀 6명, 소아 프라임팀 2명"
          }
        ]
      },
      "scenario_fixtures": [
        {
          "id": "age-night-guard",
          "type": "schedule",
          "title": "40세 이상 야간 배치 차단",
          "category": "교대보호",
          "input": {
            "member": {
              "age": 41,
              "role": "RN"
            },
            "sequence": [
              "OFF",
              "N",
              "OFF",
              "D"
            ]
          },
          "expected": {
            "flags": [
              "age_night_restriction",
              "forbidden_pattern"
            ]
          }
        },
        {
          "id": "night-recovery-trigger",
          "type": "schedule",
          "title": "월 7회 야간 시 리커버리데이 발생",
          "category": "교대보호",
          "input": {
            "member": {
              "age": 29,
              "role": "RN"
            },
            "sequence": [
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N"
            ]
          },
          "expected": {
            "flags": [
              "night_limit_exceeded",
              "recovery_day_due"
            ]
          }
        },
        {
          "id": "forbidden-n-off-d",
          "type": "schedule",
          "title": "N-OFF-D 패턴 위반 탐지",
          "category": "교대보호",
          "input": {
            "member": {
              "age": 33,
              "role": "RN"
            },
            "sequence": [
              "N",
              "OFF",
              "D",
              "OFF"
            ]
          },
          "expected": {
            "flags": [
              "forbidden_pattern"
            ]
          }
        },
        {
          "id": "rest-gap-breach",
          "type": "schedule",
          "title": "16시간 최소 휴식 위반 탐지",
          "category": "근로시간",
          "input": {
            "member": {
              "age": 30,
              "role": "RN"
            },
            "sequence": [
              "E",
              "D"
            ]
          },
          "expected": {
            "flags": [
              "rest_gap_violation"
            ]
          }
        },
        {
          "id": "n-off-9a-breach",
          "type": "schedule",
          "title": "N-OFF-9A 패턴 위반 탐지",
          "category": "교육/교대",
          "input": {
            "member": {
              "age": 28,
              "role": "RN"
            },
            "sequence": [
              "N",
              "OFF",
              "9A"
            ]
          },
          "expected": {
            "flags": [
              "forbidden_pattern"
            ]
          }
        },
        {
          "id": "oncall-callout",
          "type": "allowance",
          "title": "온콜 출동 보상 계산",
          "category": "수당",
          "input": {
            "event_type": "on_call_callout"
          },
          "expected": {
            "standby_pay": 10000,
            "transport_pay": 50000,
            "recognized_hours": 2
          }
        },
        {
          "id": "prime-team-cover",
          "type": "allowance",
          "title": "프라임팀 대체근무 가산",
          "category": "수당",
          "input": {
            "event_type": "prime_team_substitute"
          },
          "expected": {
            "allowance": 20000
          }
        },
        {
          "id": "night-bonus",
          "type": "allowance",
          "title": "야간근무 가산금",
          "category": "수당",
          "input": {
            "event_type": "night_bonus"
          },
          "expected": {
            "allowance": 10000
          }
        },
        {
          "id": "preceptor-allowance",
          "type": "allowance",
          "title": "프리셉터 수당",
          "category": "교육",
          "input": {
            "event_type": "preceptor_allowance"
          },
          "expected": {
            "allowance": 200000
          }
        },
        {
          "id": "refresh-support",
          "type": "allowance",
          "title": "리프레시지원비",
          "category": "복지",
          "input": {
            "event_type": "refresh_support"
          },
          "expected": {
            "annual_support": 360000
          }
        },
        {
          "id": "spouse-childbirth-leave",
          "type": "allowance",
          "title": "배우자 출산휴가",
          "category": "휴가",
          "input": {
            "event_type": "spouse_childbirth_leave"
          },
          "expected": {
            "days": 20
          }
        },
        {
          "id": "birthday-gift",
          "type": "allowance",
          "title": "생일 온누리상품권",
          "category": "복지",
          "input": {
            "event_type": "birthday_gift"
          },
          "expected": {
            "gift": 50000
          }
        },
        {
          "id": "new-nurse-program",
          "type": "allowance",
          "title": "신규간호사 교육 프로그램",
          "category": "교육",
          "input": {
            "event_type": "new_nurse_program"
          },
          "expected": {
            "duration_weeks": 8,
            "icu_duration_weeks": 10,
            "initial_pay_rate": 0.8
          }
        },
        {
          "id": "night-hard-cap-breach",
          "type": "schedule",
          "title": "월 10회 야간 하드캡 초과 탐지",
          "category": "교대보호",
          "input": {
            "member": {
              "age": 31,
              "role": "RN"
            },
            "sequence": [
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N",
              "OFF",
              "N"
            ]
          },
          "expected": {
            "flags": [
              "night_hard_cap_exceeded",
              "night_limit_exceeded",
              "recovery_day_due"
            ]
          }
        },
        {
          "id": "age-safe-baseline",
          "type": "schedule",
          "title": "40세 이상 주간 전용은 위반 없음",
          "category": "교대보호",
          "input": {
            "member": {
              "age": 44,
              "role": "RN"
            },
            "sequence": [
              "D",
              "OFF",
              "E",
              "OFF",
              "OFF"
            ]
          },
          "expected": {
            "flags": []
          }
        },
        {
          "id": "balanced-safe-sequence",
          "type": "schedule",
          "title": "안전한 D/E/N 순환은 위반 없음",
          "category": "근로시간",
          "input": {
            "member": {
              "age": 29,
              "role": "RN"
            },
            "sequence": [
              "D",
              "OFF",
              "E",
              "OFF",
              "N",
              "OFF",
              "OFF"
            ]
          },
          "expected": {
            "flags": []
          }
        },
        {
          "id": "annual-leave-cap",
          "type": "allowance",
          "title": "연차 기본/상한",
          "category": "휴가",
          "input": {
            "event_type": "annual_leave_cap"
          },
          "expected": {
            "base": 15,
            "max": 25
          }
        },
        {
          "id": "family-allowance-spouse",
          "type": "allowance",
          "title": "배우자 가족수당",
          "category": "수당",
          "input": {
            "event_type": "family_allowance_spouse"
          },
          "expected": {
            "allowance": 40000
          }
        },
        {
          "id": "family-allowance-third-child",
          "type": "allowance",
          "title": "셋째 자녀 가족수당",
          "category": "수당",
          "input": {
            "event_type": "family_allowance_third_child"
          },
          "expected": {
            "allowance": 110000
          }
        },
        {
          "id": "medical-discount-self",
          "type": "allowance",
          "title": "본인 진료비 감면",
          "category": "복지",
          "input": {
            "event_type": "medical_discount_self"
          },
          "expected": {
            "insurance_percent": 50,
            "select_doctor_percent": 100
          }
        },
        {
          "id": "medical-discount-family",
          "type": "allowance",
          "title": "가족 진료비 감면",
          "category": "복지",
          "input": {
            "event_type": "medical_discount_family"
          },
          "expected": {
            "insurance_percent": 50,
            "non_covered_percent": 50
          }
        },
        {
          "id": "childcare-leave-pay",
          "type": "allowance",
          "title": "육아휴직 급여율",
          "category": "휴직",
          "input": {
            "event_type": "childcare_leave_pay"
          },
          "expected": {
            "months_1_to_6_rate": 1,
            "months_7_to_12_rate": 0.8
          }
        },
        {
          "id": "sick-leave-pay",
          "type": "allowance",
          "title": "질병/공상 휴직 급여율",
          "category": "휴직",
          "input": {
            "event_type": "sick_leave_pay"
          },
          "expected": {
            "rate": 0.7
          }
        },
        {
          "id": "maternity-leave-twins",
          "type": "allowance",
          "title": "쌍둥이 출산휴가",
          "category": "휴가",
          "input": {
            "event_type": "maternity_leave_twins"
          },
          "expected": {
            "total_days": 120,
            "postpartum_min": 60
          }
        },
        {
          "id": "congratulatory-marriage-self",
          "type": "allowance",
          "title": "본인 결혼 경조금",
          "category": "복지",
          "input": {
            "event_type": "congratulatory_marriage_self"
          },
          "expected": {
            "hospital_paid": 300000,
            "union_paid": 100000
          }
        },
        {
          "id": "welfare-points-childbirth-second",
          "type": "allowance",
          "title": "둘째 출산 복지포인트",
          "category": "복지",
          "input": {
            "event_type": "welfare_points_childbirth_second"
          },
          "expected": {
            "points": 2000
          }
        },
        {
          "id": "long-service-20y",
          "type": "allowance",
          "title": "20년 이상 장기근속수당",
          "category": "수당",
          "input": {
            "event_type": "long_service_20y"
          },
          "expected": {
            "allowance": 100000
          }
        }
      ],
      "scenarioReport": {
        "total": 27,
        "passed": 27,
        "failed": 0,
        "items": [
          {
            "id": "age-night-guard",
            "title": "40세 이상 야간 배치 차단",
            "category": "교대보호",
            "passed": true,
            "expected": {
              "flags": [
                "age_night_restriction",
                "forbidden_pattern"
              ]
            },
            "actual": {
              "flags": [
                "age_night_restriction",
                "forbidden_pattern"
              ]
            }
          },
          {
            "id": "night-recovery-trigger",
            "title": "월 7회 야간 시 리커버리데이 발생",
            "category": "교대보호",
            "passed": true,
            "expected": {
              "flags": [
                "night_limit_exceeded",
                "recovery_day_due"
              ]
            },
            "actual": {
              "flags": [
                "night_limit_exceeded",
                "recovery_day_due"
              ]
            }
          },
          {
            "id": "forbidden-n-off-d",
            "title": "N-OFF-D 패턴 위반 탐지",
            "category": "교대보호",
            "passed": true,
            "expected": {
              "flags": [
                "forbidden_pattern"
              ]
            },
            "actual": {
              "flags": [
                "forbidden_pattern"
              ]
            }
          },
          {
            "id": "rest-gap-breach",
            "title": "16시간 최소 휴식 위반 탐지",
            "category": "근로시간",
            "passed": true,
            "expected": {
              "flags": [
                "rest_gap_violation"
              ]
            },
            "actual": {
              "flags": [
                "rest_gap_violation"
              ]
            }
          },
          {
            "id": "n-off-9a-breach",
            "title": "N-OFF-9A 패턴 위반 탐지",
            "category": "교육/교대",
            "passed": true,
            "expected": {
              "flags": [
                "forbidden_pattern"
              ]
            },
            "actual": {
              "flags": [
                "forbidden_pattern"
              ]
            }
          },
          {
            "id": "oncall-callout",
            "title": "온콜 출동 보상 계산",
            "category": "수당",
            "passed": true,
            "expected": {
              "standby_pay": 10000,
              "transport_pay": 50000,
              "recognized_hours": 2
            },
            "actual": {
              "standby_pay": 10000,
              "transport_pay": 50000,
              "recognized_hours": 2
            }
          },
          {
            "id": "prime-team-cover",
            "title": "프라임팀 대체근무 가산",
            "category": "수당",
            "passed": true,
            "expected": {
              "allowance": 20000
            },
            "actual": {
              "allowance": 20000
            }
          },
          {
            "id": "night-bonus",
            "title": "야간근무 가산금",
            "category": "수당",
            "passed": true,
            "expected": {
              "allowance": 10000
            },
            "actual": {
              "allowance": 10000
            }
          },
          {
            "id": "preceptor-allowance",
            "title": "프리셉터 수당",
            "category": "교육",
            "passed": true,
            "expected": {
              "allowance": 200000
            },
            "actual": {
              "allowance": 200000
            }
          },
          {
            "id": "refresh-support",
            "title": "리프레시지원비",
            "category": "복지",
            "passed": true,
            "expected": {
              "annual_support": 360000
            },
            "actual": {
              "annual_support": 360000
            }
          },
          {
            "id": "spouse-childbirth-leave",
            "title": "배우자 출산휴가",
            "category": "휴가",
            "passed": true,
            "expected": {
              "days": 20
            },
            "actual": {
              "days": 20
            }
          },
          {
            "id": "birthday-gift",
            "title": "생일 온누리상품권",
            "category": "복지",
            "passed": true,
            "expected": {
              "gift": 50000
            },
            "actual": {
              "gift": 50000
            }
          },
          {
            "id": "new-nurse-program",
            "title": "신규간호사 교육 프로그램",
            "category": "교육",
            "passed": true,
            "expected": {
              "duration_weeks": 8,
              "icu_duration_weeks": 10,
              "initial_pay_rate": 0.8
            },
            "actual": {
              "duration_weeks": 8,
              "icu_duration_weeks": 10,
              "initial_pay_rate": 0.8
            }
          },
          {
            "id": "night-hard-cap-breach",
            "title": "월 10회 야간 하드캡 초과 탐지",
            "category": "교대보호",
            "passed": true,
            "expected": {
              "flags": [
                "night_hard_cap_exceeded",
                "night_limit_exceeded",
                "recovery_day_due"
              ]
            },
            "actual": {
              "flags": [
                "night_hard_cap_exceeded",
                "night_limit_exceeded",
                "recovery_day_due"
              ]
            }
          },
          {
            "id": "age-safe-baseline",
            "title": "40세 이상 주간 전용은 위반 없음",
            "category": "교대보호",
            "passed": true,
            "expected": {
              "flags": []
            },
            "actual": {
              "flags": []
            }
          },
          {
            "id": "balanced-safe-sequence",
            "title": "안전한 D/E/N 순환은 위반 없음",
            "category": "근로시간",
            "passed": true,
            "expected": {
              "flags": []
            },
            "actual": {
              "flags": []
            }
          },
          {
            "id": "annual-leave-cap",
            "title": "연차 기본/상한",
            "category": "휴가",
            "passed": true,
            "expected": {
              "base": 15,
              "max": 25
            },
            "actual": {
              "base": 15,
              "max": 25
            }
          },
          {
            "id": "family-allowance-spouse",
            "title": "배우자 가족수당",
            "category": "수당",
            "passed": true,
            "expected": {
              "allowance": 40000
            },
            "actual": {
              "allowance": 40000
            }
          },
          {
            "id": "family-allowance-third-child",
            "title": "셋째 자녀 가족수당",
            "category": "수당",
            "passed": true,
            "expected": {
              "allowance": 110000
            },
            "actual": {
              "allowance": 110000
            }
          },
          {
            "id": "medical-discount-self",
            "title": "본인 진료비 감면",
            "category": "복지",
            "passed": true,
            "expected": {
              "insurance_percent": 50,
              "select_doctor_percent": 100
            },
            "actual": {
              "insurance_percent": 50,
              "select_doctor_percent": 100
            }
          },
          {
            "id": "medical-discount-family",
            "title": "가족 진료비 감면",
            "category": "복지",
            "passed": true,
            "expected": {
              "insurance_percent": 50,
              "non_covered_percent": 50
            },
            "actual": {
              "insurance_percent": 50,
              "non_covered_percent": 50
            }
          },
          {
            "id": "childcare-leave-pay",
            "title": "육아휴직 급여율",
            "category": "휴직",
            "passed": true,
            "expected": {
              "months_1_to_6_rate": 1,
              "months_7_to_12_rate": 0.8
            },
            "actual": {
              "months_1_to_6_rate": 1,
              "months_7_to_12_rate": 0.8
            }
          },
          {
            "id": "sick-leave-pay",
            "title": "질병/공상 휴직 급여율",
            "category": "휴직",
            "passed": true,
            "expected": {
              "rate": 0.7
            },
            "actual": {
              "rate": 0.7
            }
          },
          {
            "id": "maternity-leave-twins",
            "title": "쌍둥이 출산휴가",
            "category": "휴가",
            "passed": true,
            "expected": {
              "total_days": 120,
              "postpartum_min": 60
            },
            "actual": {
              "total_days": 120,
              "postpartum_min": 60
            }
          },
          {
            "id": "congratulatory-marriage-self",
            "title": "본인 결혼 경조금",
            "category": "복지",
            "passed": true,
            "expected": {
              "hospital_paid": 300000,
              "union_paid": 100000
            },
            "actual": {
              "hospital_paid": 300000,
              "union_paid": 100000
            }
          },
          {
            "id": "welfare-points-childbirth-second",
            "title": "둘째 출산 복지포인트",
            "category": "복지",
            "passed": true,
            "expected": {
              "points": 2000
            },
            "actual": {
              "points": 2000
            }
          },
          {
            "id": "long-service-20y",
            "title": "20년 이상 장기근속수당",
            "category": "수당",
            "passed": true,
            "expected": {
              "allowance": 100000
            },
            "actual": {
              "allowance": 100000
            }
          }
        ]
      }
    }
  }
};
