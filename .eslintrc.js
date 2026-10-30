// Each tool's folder. A tool may import only from itself and `src/shared/`; anything a second tool
// needs moves to `shared/`, so the tools never form a dependency web between them.
const TOOL_DIRS = ['landing', 'speedruns', 'scoring', 'cardex', 'skilldex', 'eventmaps', 'booty']

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  extends: [
    'next/core-web-vitals',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  rules: {
    // React Rules
    'react/prop-types': 'off', // Since we're using TypeScript
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],

    // TypeScript Rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-require-imports': 'error',

    // Import Rules
    'import/prefer-default-export': 'off',
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          ...TOOL_DIRS.map((tool) => ({
            target: `./src/${tool}`,
            from: TOOL_DIRS.filter((other) => other !== tool).map((other) => `./src/${other}`),
            message: 'Tools must not import from each other — move shared code to src/shared/.',
          })),
          {
            target: './src/shared',
            from: TOOL_DIRS.map((tool) => `./src/${tool}`),
            message: 'src/shared/ must not import from a tool.',
          },
        ],
      },
    ],
    'import/no-unresolved': 'error',
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/shared/**',
            group: 'internal',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
      },
    ],

    // General Rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-unused-expressions': 'error',
    'no-unused-vars': 'off', // Using TypeScript's no-unused-vars instead
  },
  overrides: [
    {
      // Node CLI scripts (data pipeline): CommonJS require() and console logging are
      // the norm there — everything else is linted like the app code.
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
}
