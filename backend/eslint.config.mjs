// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // Never lint build output, coverage reports, or dependencies. Linting
    // emitted JavaScript produces "not found by the project service" parse
    // errors because those files are not part of any TypeScript project.
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'coverage/**',
      'node_modules/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // `docs/coding-standards.md` allows `any` only where unavoidable. This
      // stays a warning rather than an error so the existing call sites do
      // not fail the build, while new ones stay visible in review.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // A leading underscore is the project's marker for a binding that is
      // deliberately discarded, such as omitting a field via destructuring.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Jest matchers receive mock methods unbound on purpose
    // (`expect(service.method).toHaveBeenCalled()`), which is exactly what
    // unbound-method flags. The rule stays on for application code.
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      // fast-check's asyncProperty requires an async predicate even when the
      // assertion inside it is synchronous.
      '@typescript-eslint/require-await': 'off',
      // Test doubles are deliberately partial: a mock supplies only the
      // members the subject actually calls, and some cases pass a knowingly
      // invalid argument to assert the rejection. Typing those fully would
      // describe the real collaborator rather than the stub. Both rules stay
      // on for application code, which is what they are for.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    // Plain JavaScript helper scripts are not part of the TypeScript project,
    // so type-aware rules cannot resolve them. This override must stay last so
    // it also clears the type-aware rules re-enabled by the block above.
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // CommonJS helper scripts are run directly by node, so `require` is the
      // correct call there rather than a lint violation.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
