import { ensureDemoUsers, ensureSrd } from './lib/table'

async function seed() {
  await ensureSrd()
  await ensureDemoUsers()
  console.log('Сид готов. dm@table.local / player@table.local, пароль password123')
  process.exit(0)
}

void seed()
