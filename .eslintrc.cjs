/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Domain層が外部フレームワークに依存しないことを強制する意図で、
    // 将来的に import/no-restricted-paths 等の追加を検討する。
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  // cloudflare/はtsconfig.eslint.jsonのproject対象外の別tsconfig
  // （cloudflare/tsconfig.json、Workers用の型定義）を使う独立した
  // サブプロジェクトのため、メインのlintからは除外する（Version38）。
  // 型チェックは`pnpm cloudflare:typecheck`、テストは
  // `pnpm cloudflare:test`で個別に検証する。
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'cloudflare'],
};
