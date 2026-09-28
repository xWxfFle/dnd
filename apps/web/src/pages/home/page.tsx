import { Button, Group, Paper, Stack, Text, TextInput, Title } from '@mantine/core'
import { scoped } from '@virentia/core'
import { useField } from '@virentia/forms-react'
import { useMutation, useQuery } from '@virentia/net-react'
import { campaignsQuery, createCampaignMutation } from '@/shared/api'
import { campaignName, signOut } from '@/shared/boot'
import { tableRoute } from '@/shared/routing'
import { appScope } from '@/shared/session'

export function HomePage() {
  const campaigns = useQuery(campaignsQuery)
  const create = useMutation(createCampaignMutation)
  const name = useField(campaignName)
  const localhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  return (
    <Stack maw={720} mx="auto" p="md">
      <Group justify="space-between">
        <Title order={2}>Кампании</Title>
        <Button variant="subtle" onClick={signOut}>Выйти</Button>
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
        <Button loading={create.pending} onClick={() => void create.mutate(name.value)}>Создать</Button>
      </Group>
      <Stack>
        {(campaigns.data ?? []).map(campaign => (
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
              <Button onClick={() => {
                scoped(appScope, () => {
                  void tableRoute.open({ params: { id: campaign.id } })
                })
              }}
              >
                Открыть
              </Button>
            </Group>
          </Paper>
        ))}
        {campaigns.data?.length === 0 && <Text c="dimmed">Кампаний пока нет.</Text>}
      </Stack>
    </Stack>
  )
}
