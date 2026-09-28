import { SRD_ATTRIBUTION } from '@dnd/shared'
import { Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { useField, useForm } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { Link } from '@virentia/router-react'
import { loginMutation } from '@/shared/api'
import { loginForm } from '@/shared/boot'
import { registerRoute } from '@/shared/routing'

export function LoginPage() {
  const form = useForm(loginForm)
  const email = useField(loginForm.fields.email)
  const password = useField(loginForm.fields.password)
  const pending = useUnit(loginMutation.pending)
  return (
    <Stack maw={420} mx="auto" mt={80} p="md">
      <Title order={2}>Стол D&D</Title>
      <Text c="dimmed">Вход в кампанию. Голос остаётся в Discord.</Text>
      <Paper withBorder p="md">
        <form onSubmit={(event) => {
          event.preventDefault()
          void form.submit()
        }}
        >
          <Stack>
            <TextInput label="Почта" value={email.value} onChange={event => void email.fill(event.currentTarget.value)} error={email.errors} />
            <PasswordInput label="Пароль" value={password.value} onChange={event => void password.fill(event.currentTarget.value)} error={password.errors} />
            <Button type="submit" loading={pending}>Войти</Button>
            <Link to={registerRoute}>Регистрация</Link>
          </Stack>
        </form>
      </Paper>
      <Text size="xs" c="dimmed">{SRD_ATTRIBUTION}</Text>
    </Stack>
  )
}
