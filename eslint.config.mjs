import antfu from '@antfu/eslint-config'

export default antfu({
  react: true,
  typescript: true,
  ignores: [
    '**/drizzle/meta/**',
    '**/srd-2024-*.json',
    '**/phb-2024-*.json',
    '.nx/**',
    '.agents/**',
    'dist/**',
  ],
}, {
  files: ['apps/api/**/*.ts'],
  rules: {
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/process': 'off',
  },
}, {
  files: ['apps/api/src/main.ts', 'apps/api/src/seed.ts', 'scripts/**/*.ts'],
  rules: {
    'no-console': 'off',
  },
})
