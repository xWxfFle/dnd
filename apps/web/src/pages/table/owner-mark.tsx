import { Badge, Select } from '@mantine/core'
import { useUnit } from '@virentia/react'
import { campaignMembers, dm, heroOwnerAssigned, viewerId } from './model'
import { ownerCaption, roleSuffix } from './owner'

export function OwnerMark(props: { userId: string }) {
  const { members, viewer } = useUnit({
    members: campaignMembers,
    viewer: viewerId,
  })
  const mine = Boolean(viewer) && props.userId === viewer
  return (
    <Badge size="xs" variant={mine ? 'filled' : 'outline'}>
      {ownerCaption(props.userId, viewer, members)}
    </Badge>
  )
}

export function OwnerAssign(props: { characterId: string, userId: string }) {
  const { members, assign } = useUnit({
    members: campaignMembers,
    assign: heroOwnerAssigned,
  })
  return (
    <Select
      size="xs"
      label="Игрок"
      data={members.map(member => ({
        value: member.userId,
        label: `${member.displayName}${roleSuffix[member.role]}`,
      }))}
      value={props.userId}
      allowDeselect={false}
      onChange={value => value && assign({ characterId: props.characterId, userId: value })}
    />
  )
}

export function OwnerControl(props: { characterId: string, userId: string }) {
  const master = useUnit(dm)
  if (master)
    return <OwnerAssign characterId={props.characterId} userId={props.userId} />
  return <OwnerMark userId={props.userId} />
}
