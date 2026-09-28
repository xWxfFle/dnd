import { SRD_ATTRIBUTION } from '@dnd/shared'
import { ActionIcon, Menu, Text, useMantineColorScheme } from '@mantine/core'
import { IconLogout, IconMoon, IconSun, IconUser } from '@tabler/icons-react'
import { useUnit } from '@virentia/react'
import { signOut } from '@/shared/boot'
import { currentUser, token } from '@/shared/session'

const labelByScheme = {
  light: 'Тёмная тема',
  dark: 'Светлая тема',
  auto: 'Светлая тема',
} as const

const iconByScheme = {
  light: IconMoon,
  dark: IconSun,
  auto: IconSun,
} as const

export function AccountMenu() {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme()
  const session = useUnit({ user: currentUser, token })
  const ThemeIcon = iconByScheme[colorScheme]
  return (
    <Menu shadow="md" width={360} position="bottom-end">
      <Menu.Target>
        <ActionIcon variant="default" size="input-sm" aria-label="Меню">
          <IconUser size={20} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {session.user && (
          <>
            <Menu.Label>{session.user.displayName}</Menu.Label>
            <Text size="xs" c="dimmed" px="sm" pb="xs">{session.user.email}</Text>
          </>
        )}
        <Menu.Item leftSection={<ThemeIcon size={16} />} onClick={() => toggleColorScheme()}>
          {labelByScheme[colorScheme]}
        </Menu.Item>
        {session.token && (
          <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={signOut}>
            Выйти
          </Menu.Item>
        )}
        <Menu.Divider />
        <Text size="xs" c="dimmed" px="sm" py="xs">{SRD_ATTRIBUTION}</Text>
      </Menu.Dropdown>
    </Menu>
  )
}
