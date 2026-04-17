# cc-reviewer - Findings Index

> Pure index — each entry should be brief (Status + Report link + Summary).

---

## review-security-audit
- Status: complete
- Report: [findings.md](review-security-audit/findings.md)
- Verdict: [BLOCK]
- Summary: OWASP Top 10 전체 감사. CRITICAL 4건, HIGH 7건, MEDIUM 5건, LOW 2건 (총 18건). 기존 8건 검증 + 신규 10건 발견. RD-1 WEAK → 프로덕션 배포 전 P0/P1 수정 필수. 주요 신규: SSRF(SEC-09), Teams API 인증 미적용(SEC-11), 보안 헤더 누락(SEC-10), 챗봇 응답 XSS(SEC-12).
