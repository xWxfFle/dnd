import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { joinMutation } from '@/shared/api'
import { joinRoute } from '@/shared/routing'

export function JoinPage() {
  const params = useUnit(joinRoute.params)
  const pending = useUnit(joinMutation.pending)
  const error = useUnit(joinMutation.error)
  return (
    <Stack maw={480} mx="auto" mt={80}>
      <Title order={2}>Вход в кампанию</Title>
      <Text>{pending ? `Подключаемся по коду ${params.code}…` : `Код ${params.code}`}</Text>
      {error != null ? <Text c="red">Приглашение не найдено</Text> : null}
      <Group>
        <Button component="a" href="/">К кампаниям</Button>
      </Group>
      <Paper />
    </Stack>
  )
}
