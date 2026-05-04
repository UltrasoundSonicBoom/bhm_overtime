// life-event.js buildMailto — 변수 치환 + URL 인코딩
// Plan dazzling-booping-kettle Task B5
import { describe, it, expect } from 'vitest';
import { buildMailto } from '../../apps/web/src/client/life-event.js';

const SAMPLE_EVENT = {
  email_template: {
    to: 'hr@snuh.org',
    subject: '[청원휴가] {{employeeName}}({{employeeId}})',
    body: '{{department}} 소속 {{employeeName}}({{employeeId}}) 입니다.\n신청합니다.',
  },
};

describe('buildMailto', () => {
  it('프로필 값으로 {{employeeName}}/{{employeeId}}/{{department}} 치환', () => {
    const url = buildMailto(SAMPLE_EVENT, {
      name: '김조합',
      employeeId: '2024A0001',
      department: '간호본부',
    });
    expect(url).toMatch(/^mailto:hr@snuh\.org\?/);
    const decoded = decodeURIComponent(url.split('?')[1]);
    expect(decoded).toContain('김조합(2024A0001)');
    expect(decoded).toContain('간호본부 소속 김조합(2024A0001)');
  });

  it('프로필 누락 시 placeholder ([이름]/[사번]/[부서])', () => {
    const url = buildMailto(SAMPLE_EVENT, {});
    const decoded = decodeURIComponent(url.split('?')[1]);
    expect(decoded).toContain('[이름]');
    expect(decoded).toContain('[사번]');
    expect(decoded).toContain('[부서]');
  });

  it('email_template 없으면 빈 문자열', () => {
    expect(buildMailto({ event_id: 'x' }, { name: '김조합' })).toBe('');
    expect(buildMailto(null, {})).toBe('');
  });

  it('subject·body 의 줄바꿈 (\\n) 은 mailto query 에 보존', () => {
    const url = buildMailto(SAMPLE_EVENT, { name: '김', employeeId: '1', department: '본부' });
    const decoded = decodeURIComponent(url.split('?')[1]);
    expect(decoded).toContain('\n신청합니다.');
  });

  it('+ 기호는 %20 으로 변환되어 클라이언트 호환성 보장', () => {
    const url = buildMailto(
      { email_template: { to: 'x@y.z', subject: 'hello world', body: 'a b' } },
      {}
    );
    expect(url).not.toContain('+');
    expect(url).toContain('%20');
  });
});
