import { Button, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useField, useForm } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { Link } from '@virentia/router-react'
import { registerMutation } from '@/shared/api'
import { registerForm } from '@/shared/boot'
import { loginRoute } from '@/shared/routing'

export function RegisterPage() {
  const form = useForm(registerForm)
  const displayName = useField(registerForm.fields.displayName)
  const email = useField(registerForm.fields.email)
  const password = useField(registerForm.fields.password)
  const pending = useUnit(registerMutation.pending)
  return (
    <Stack maw={420} mx="auto" mt={80} p="md">
      <Title order={2}>Новый игрок</Title>
      <Paper withBorder p="md">
        <form onSubmit={(event) => {
          event.preventDefault()
          void form.submit()
        }}
        >
          <Stack>
            <TextInput label="Имя" value={displayName.value} onChange={event => void displayName.fill(event.currentTarget.value)} error={displayName.errors} />
            <TextInput label="Почта" value={email.value} onChange={event => void email.fill(event.currentTarget.value)} error={email.errors} />
            <PasswordInput label="Пароль" value={password.value} onChange={event => void password.fill(event.currentTarget.value)} error={password.errors} />
            <Button type="submit" loading={pending}>Создать</Button>
            <Link to={loginRoute}>Уже есть вход</Link>
          </Stack>
        </form>
      </Paper>
    </Stack>
  )
}
