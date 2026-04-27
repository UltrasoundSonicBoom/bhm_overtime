import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Vitest globals (테스트 파일 전용 fallback)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      'no-prototype-builtins': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'archive/**',
      'public/legacy/**',
      'shorts-studio/**',
      'public/admin/**',
      'public/sw.js',
      'public/data/**',
      'public/tabs/**',
      '.worktrees/**',
      '.claude/**',
      'ops/**',
    ],
  },
];
