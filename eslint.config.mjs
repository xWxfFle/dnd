import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  react: true,
  ignores: [
    '**/drizzle/meta/**',
    '.nx/**',
    '.agents/**',
    'dist/**',
  ],
}, {
  files: ['apps/api/**/*.ts'],
  rules: {
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
  },
}, {
  files: ['apps/api/src/main.ts', 'apps/api/src/seed.ts'],
  rules: {
    'no-console': 'off',
  },
})
