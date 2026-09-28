import { Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { useField } from '@virentia/forms-react'
import { useUnit } from '@virentia/react'
import { campaignsQuery, createCampaignMutation } from '@/shared/api'
import { AccountMenu } from '@/shared/ui/account-menu'
import { campaignCreateRequested, campaignName, campaignOpened } from './model'

export function HomePage() {
  const name = useField(campaignName)
  const { campaigns, pending, createRequested, openCampaign } = useUnit({
    campaigns: campaignsQuery.data,
    pending: createCampaignMutation.pending,
    createRequested: campaignCreateRequested,
    openCampaign: campaignOpened,
  })
  const localhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  return (
    <Stack maw={720} mx="auto" p="md">
      <Group justify="space-between">
        <Title order={2}>Кампании</Title>
        <AccountMenu />
      </Group>
      {localhost && (
        <Paper withBorder p="sm">
          <Text size="sm">
            Друзья по localhost не зайдут. В терминале:
            {' '}
            <Text span ff="monospace">powershell -File scripts/print-join-url.ps1</Text>
          </Text>
        </Paper>
      )}
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
                  {campaign.role === 'dm' ? 'Мастер' : 'Игрок'}
                  {' '}
                  · код
                  {' '}
                  {campaign.inviteCode}
                </Text>
              </div>
              <Button onClick={() => openCampaign(campaign.id)}>Открыть</Button>
            </Group>
          </Paper>
        ))}
        {campaigns?.length === 0 && <Text c="dimmed">Кампаний пока нет.</Text>}
      </Stack>
    </Stack>
  )
}
