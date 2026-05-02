import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const routes = ['index', 'admin', 'import', 'rules', 'approvals', 'audit', 'me', 'swaps'];
const controllers = [
  'admin-controller',
  'import-controller',
  'rule-editor-controller',
  'member-schedule-controller',
  'swap-controller',
];

describe('Team Plan route skeleton contract', () => {
  it('creates new Astro routes without extending legacy nurse_admin', () => {
    for (const route of routes) {
      const file = `apps/web/src/pages/team/schedules/${route}.astro`;
      expect(existsSync(file), `${file} exists`).toBe(true);
      const source = readFileSync(file, 'utf8');
      expect(source).not.toContain('nurse_admin');
      expect(source).not.toContain('schedule_suite');
    }
  });

  it('uses scheduling package as the domain boundary', () => {
    const source = readFileSync('apps/web/src/pages/team/schedules/index.astro', 'utf8');
    expect(source).toContain('@snuhmate/scheduling');
    expect(source).toContain('evaluateSchedule');
    expect(source).toContain('normalizeImportSnapshot');
  });

  it('keeps child routes operational with route-specific surfaces', () => {
    for (const controller of controllers) {
      const file = `apps/web/src/client/team-schedules/${controller}.js`;
      expect(existsSync(file), `${file} exists`).toBe(true);
    }

    expect(readFileSync('apps/web/src/pages/team/schedules/admin.astro', 'utf8')).toContain('관리 큐');
    expect(readFileSync('apps/web/src/pages/team/schedules/import.astro', 'utf8')).toContain('가져오기 미리보기');
    expect(readFileSync('apps/web/src/pages/team/schedules/rules.astro', 'utf8')).toContain('규칙 팩');
    expect(readFileSync('apps/web/src/pages/team/schedules/approvals.astro', 'utf8')).toContain('승인 큐');
    expect(readFileSync('apps/web/src/pages/team/schedules/audit.astro', 'utf8')).toContain('감사 로그');
    expect(readFileSync('apps/web/src/pages/team/schedules/me.astro', 'utf8')).toContain('내 근무');
    expect(readFileSync('apps/web/src/pages/team/schedules/swaps.astro', 'utf8')).toContain('교대 요청');
  });
});
