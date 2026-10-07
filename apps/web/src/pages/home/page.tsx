import { Alert, Button, Code, CopyButton, Group, Modal, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconWifi } from '@tabler/icons-react'
import { useField } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { campaignsQuery, createCampaignMutation, joinMutation, lanHostsQuery } from '@/shared/api'
import { token } from '@/shared/session'
import { AccountMenu } from '@/shared/ui/account-menu'
import {
  campaignCreateRequested,
  campaignDeleteConfirmed,
  campaignDeleteDismissed,
  campaignDeletePending,
  campaignDeletePressed,
  campaignName,
  campaignOpened,
  joinCode,
  joinRequested,
  pendingCampaignDelete,
} from './model'

export function HomePage() {
  const name = useField(campaignName)
  const code = useField(joinCode)
  const {
    campaigns,
    pending,
    createRequested,
    openCampaign,
    join,
    joinPending,
    joinFailed,
    sessionToken,
    pendingDelete,
    deletePressed,
    deleteDismissed,
    deleteConfirmed,
    deletePending,
  } = useUnit({
    campaigns: campaignsQuery.data,
    pending: createCampaignMutation.pending,
    createRequested: campaignCreateRequested,
    openCampaign: campaignOpened,
    join: joinRequested,
    joinPending: joinMutation.pending,
    joinFailed: joinMutation.error,
    sessionToken: token,
    pendingDelete: pendingCampaignDelete,
    deletePressed: campaignDeletePressed,
    deleteDismissed: campaignDeleteDismissed,
    deleteConfirmed: campaignDeleteConfirmed,
    deletePending: campaignDeletePending,
  })
  if (!sessionToken)
    return null
  const doomed = campaigns?.find(campaign => campaign.id === pendingDelete) ?? null
  return (
    <Stack maw={720} mx="auto" p="md">
      <Group justify="space-between">
        <Title order={2}>Кампании</Title>
        <AccountMenu />
      </Group>
      <LanInvite />
      <Group align="end">
        <TextInput
          label="Код приглашения"
          placeholder="код или ссылка"
          value={code.value}
          onChange={event => void code.fill(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter')
              void join()
          }}
        />
        <Button loading={joinPending} disabled={!code.value.trim()} onClick={() => void join()}>Войти по коду</Button>
      </Group>
      {joinFailed != null ? <Text c="red">Приглашение не найдено</Text> : null}
      <Group align="end">
        <TextInput label="Название" value={name.value} onChange={event => void name.fill(event.currentTarget.value)} />
        <Button loading={pending} onClick={() => void createRequested()}>Создать</Button>
      </Group>
      <Stack>
        {(campaigns ?? []).map(campaign => (
          <Paper key={campaign.id} withBorder p="sm">
            <Group justify="space-between">
              <div>
                <Text fw={700}>{campaign.name}</Text>
                <Text size="sm" c="dimmed">
                  {campaign.role === 'dm' ? `Мастер · код ${campaign.inviteCode}` : 'Игрок'}
                </Text>
              </div>
              <Group gap="xs">
                <Button onClick={() => openCampaign(campaign.id)}>Открыть</Button>
                {campaign.role === 'dm' && (
                  <Button color="red" variant="light" onClick={() => deletePressed(campaign.id)}>Удалить</Button>
                )}
              </Group>
            </Group>
          </Paper>
        ))}
        {campaigns?.length === 0 && <Text c="dimmed">Кампаний пока нет.</Text>}
      </Stack>
      <Modal opened={doomed != null} onClose={deleteDismissed} title="Удалить кампанию?" centered>
        <Stack>
          <Text>
            {doomed
              ? `Кампания «${doomed.name}» исчезнет вместе со столом, героями и картами.`
              : ''}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => deleteDismissed()}>Оставить</Button>
            <Button color="red" loading={deletePending} onClick={() => deleteConfirmed()}>Удалить</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}

function LanInvite() {
  const hosts = useUnit(lanHostsQuery.data)
  if (!onLoopback())
    return null
  const urls = lanOrigins(hosts?.hosts ?? [])
  return (
    <Alert color="gray" icon={<IconWifi size={16} />} title="Для друзей в той же сети">
      <Stack gap={8}>
        <Text size="sm">С localhost они не зайдут. Скопируй адрес и открой стол уже по нему — приглашение подставит его само.</Text>
        {urls.length === 0 && <Text size="sm" c="dimmed">Адрес в сети пока не нашёлся.</Text>}
        {urls.map(url => (
          <Group key={url} gap="xs" wrap="nowrap">
            <Code>{url}</Code>
            <CopyButton value={url} timeout={1500}>
              {({ copied, copy }) => (
                <Button size="compact-xs" variant="light" onClick={copy}>
                  {copied ? 'Скопировано' : 'Копировать'}
                </Button>
              )}
            </CopyButton>
          </Group>
        ))}
      </Stack>
    </Alert>
  )
}

function onLoopback() {
  if (typeof window === 'undefined')
    return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function lanOrigins(hosts: string[]) {
  const { protocol, port } = window.location
  const suffix = port ? `:${port}` : ''
  return hosts.map(host => `${protocol}//${host}${suffix}`)
}
