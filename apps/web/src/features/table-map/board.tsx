import type { SceneDto, TokenDto } from '@dnd/shared'
import { Button, Group, Text } from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { Circle, Layer, Line, Image as MapImage, Rect, Group as ShapeGroup, Text as ShapeText, Stage } from 'react-konva'
import { sendLive } from '@/pages/table/live'

type Tool = 'move' | 'ruler' | 'circle' | 'cone' | 'line' | 'fog'

const toolLabel: Record<Tool, string> = {
  move: 'Ход',
  ruler: 'Линейка',
  circle: 'Шар',
  cone: 'Конус',
  line: 'Линия',
  fog: 'Туман',
}

const feetPerCell = 5
const coneLength = 6
const lineLength = 6

interface CellPoint {
  x: number
  y: number
}

export function MapBoard(props: {
  scene: SceneDto
  tokens: TokenDto[]
  dm: boolean
  avatars: Record<string, string>
}) {
  const cell = props.scene.grid.cellSize
  const columns = props.scene.grid.columns
  const rows = props.scene.grid.rows
  const width = columns * cell
  const height = rows * cell
  const [tool, setTool] = useState<Tool>('move')
  const [marks, setMarks] = useState<number[]>([])
  const [fogDraft, setFogDraft] = useState<number[]>([])
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => {
    if (!props.scene.imageUrl)
      return
    let alive = true
    const next = new window.Image()
    next.onload = () => {
      if (alive)
        setImage(next)
    }
    next.src = props.scene.imageUrl
    return () => {
      alive = false
    }
  }, [props.scene.imageUrl])

  function selectTool(next: Tool) {
    setTool(next)
    setMarks([])
    if (next !== 'fog')
      setFogDraft([])
  }

  function cellOf(x: number, y: number): CellPoint {
    return {
      x: clamp(Math.floor(x / cell), 0, columns - 1),
      y: clamp(Math.floor(y / cell), 0, rows - 1),
    }
  }

  function onStageClick(event: { target: { getStage: () => { getPointerPosition: () => { x: number, y: number } | null } | null } }) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    const pointer = event.target.getStage()?.getPointerPosition()
    if (!pointer)
      return
    const point = cellOf(pointer.x, pointer.y)
    if (tool === 'fog' && props.dm) {
      setFogDraft(points => [...points, point.x + 0.5, point.y + 0.5])
      return
    }
    if (tool === 'move')
      return
    setMarks(current => current.length >= 4 ? [point.x, point.y] : [...current, point.x, point.y])
  }

  const origin = pair(marks, 0)
  const aim = pair(marks, 1)
  const measure = measureLabel(tool, origin, aim)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Group gap={6} mb="xs" wrap="wrap" style={{ flex: 'none' }} align="center">
        {(['move', 'ruler', 'circle', 'cone', 'line'] as Tool[]).map(item => (
          <Button key={item} size="xs" variant={tool === item ? 'filled' : 'default'} onClick={() => selectTool(item)}>{toolLabel[item]}</Button>
        ))}
        {props.dm && (
          <>
            <Button size="xs" variant={tool === 'fog' ? 'filled' : 'default'} onClick={() => selectTool('fog')}>Туман</Button>
            <Button
              size="xs"
              variant="light"
              disabled={fogDraft.length < 6}
              onClick={() => {
                sendLive({
                  type: 'fog',
                  sceneId: props.scene.id,
                  fog: [...props.scene.fog, { id: crypto.randomUUID(), points: fogDraft }],
                })
                setFogDraft([])
              }}
            >
              Закрыть полигон
            </Button>
            <Button size="xs" variant="default" onClick={() => sendLive({ type: 'fog', sceneId: props.scene.id, fog: [] })}>Сбросить туман</Button>
          </>
        )}
        <Text size="xs" c="dimmed">{measure ?? `Поле ${columns}×${rows} · клетка 5 футов`}</Text>
      </Group>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Stage width={width} height={height} onClick={onStageClick}>
          <Layer>
            <Rect width={width} height={height} fill="#1b1724" />
            {props.scene.imageUrl && image && (
              <MapImage image={image} width={width} height={height} listening={false} />
            )}
            {Array.from({ length: columns + 1 }, (_, index) => (
              <Line key={`v${index}`} points={[index * cell, 0, index * cell, height]} stroke="#3a3348" listening={false} />
            ))}
            {Array.from({ length: rows + 1 }, (_, index) => (
              <Line key={`h${index}`} points={[0, index * cell, width, index * cell]} stroke="#3a3348" listening={false} />
            ))}
            {props.scene.fog.map(polygon => (
              <Line
                key={polygon.id}
                points={polygon.points.map(point => point * cell)}
                closed
                fill={props.dm ? 'rgba(8,6,12,0.55)' : '#05040a'}
                listening={false}
              />
            ))}
            {fogDraft.length >= 2 && (
              <Line points={fogDraft.map(point => point * cell)} stroke="#f0d58c" listening={false} />
            )}
            {origin && tool === 'circle' && (
              <Circle
                x={center(origin, cell).x}
                y={center(origin, cell).y}
                radius={circleRadius(origin, aim) * cell}
                stroke="#d45d5d"
                listening={false}
              />
            )}
            {origin && tool === 'cone' && (
              <Line points={conePoints(origin, aim, cell)} closed stroke="#d45d5d" listening={false} />
            )}
            {origin && tool === 'line' && (
              <Line
                points={linePoints(origin, aim, cell)}
                stroke="#d45d5d"
                strokeWidth={cell}
                lineCap="square"
                listening={false}
              />
            )}
            {origin && tool === 'ruler' && aim && (
              <Line
                points={[center(origin, cell).x, center(origin, cell).y, center(aim, cell).x, center(aim, cell).y]}
                stroke="#8fd0ff"
                listening={false}
              />
            )}
            {props.tokens.map(token => (
              <TokenPiece
                key={token.id}
                token={token}
                cell={cell}
                columns={columns}
                rows={rows}
                avatarUrl={token.characterId ? props.avatars[token.characterId] ?? null : null}
                draggable={tool === 'move'}
                onDragged={() => {
                  draggedRef.current = true
                }}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

function TokenPiece(props: {
  token: TokenDto
  cell: number
  columns: number
  rows: number
  avatarUrl: string | null
  draggable: boolean
  onDragged: () => void
}) {
  const radius = Math.max(props.token.size, 1) * props.cell / 2
  const labelWidth = props.cell * 3
  const dead = props.token.hpCurrent <= 0
  const portrait = usePortrait(props.avatarUrl)
  return (
    <ShapeGroup
      x={(props.token.x + 0.5) * props.cell}
      y={(props.token.y + 0.5) * props.cell}
      draggable={props.draggable}
      dragBoundFunc={pos => ({
        x: clamp(pos.x, radius, props.columns * props.cell - radius),
        y: clamp(pos.y, radius, props.rows * props.cell - radius),
      })}
      onDragEnd={(event) => {
        props.onDragged()
        const cellX = clamp(Math.round(event.target.x() / props.cell - 0.5), 0, props.columns - 1)
        const cellY = clamp(Math.round(event.target.y() / props.cell - 0.5), 0, props.rows - 1)
        event.target.position({
          x: (cellX + 0.5) * props.cell,
          y: (cellY + 0.5) * props.cell,
        })
        sendLive({ type: 'move', tokenId: props.token.id, x: cellX, y: cellY })
      }}
    >
      <Circle
        radius={radius}
        fill={dead ? '#3a2a32' : props.token.color}
        fillPatternImage={portrait ?? undefined}
        fillPatternOffsetX={portrait ? portrait.width / 2 : undefined}
        fillPatternOffsetY={portrait ? portrait.height / 2 : undefined}
        fillPatternScaleX={portrait ? (radius * 2) / portrait.width : undefined}
        fillPatternScaleY={portrait ? (radius * 2) / portrait.height : undefined}
        opacity={props.token.hidden ? 0.4 : 1}
        stroke={tokenStroke(dead, props.token.hidden)}
        strokeWidth={2}
        dash={props.token.hidden ? [6, 4] : undefined}
      />
      <ShapeText
        text={props.token.name}
        width={labelWidth}
        offsetX={labelWidth / 2}
        y={radius + 2}
        align="center"
        fontSize={12}
        fill="#f4efe4"
        listening={false}
      />
    </ShapeGroup>
  )
}

function usePortrait(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!url)
      return
    let alive = true
    const next = new window.Image()
    next.onload = () => {
      if (!alive)
        return
      setImage(next)
      setLoadedUrl(url)
    }
    next.src = url
    return () => {
      alive = false
    }
  }, [url])
  if (!url || loadedUrl !== url)
    return null
  return image
}

function tokenStroke(dead: boolean, hidden: boolean) {
  if (dead)
    return '#d45d5d'
  if (hidden)
    return '#f0d58c'
  return '#f4efe4'
}

function pair(points: number[], index: number): CellPoint | null {
  const offset = index * 2
  if (points.length < offset + 2)
    return null
  return { x: points[offset] ?? 0, y: points[offset + 1] ?? 0 }
}

function center(point: CellPoint, cell: number) {
  return { x: (point.x + 0.5) * cell, y: (point.y + 0.5) * cell }
}

function circleRadius(origin: CellPoint, aim: CellPoint | null) {
  if (!aim)
    return 4
  return Math.max(1, Math.round(Math.hypot(aim.x - origin.x, aim.y - origin.y)))
}

function direction(origin: CellPoint, aim: CellPoint | null, distance: number): CellPoint {
  const dx = (aim?.x ?? origin.x) - origin.x
  const dy = (aim?.y ?? origin.y + 1) - origin.y
  const length = Math.hypot(dx, dy) || 1
  return {
    x: origin.x + dx / length * distance,
    y: origin.y + dy / length * distance,
  }
}

function conePoints(origin: CellPoint, aim: CellPoint | null, cell: number) {
  const end = direction(origin, aim, coneLength)
  const dx = end.x - origin.x
  const dy = end.y - origin.y
  const length = Math.hypot(dx, dy) || 1
  const half = coneLength / 3
  const px = -dy / length * half
  const py = dx / length * half
  const left = { x: end.x + px, y: end.y + py }
  const right = { x: end.x - px, y: end.y - py }
  return [origin, left, right].flatMap(point => [center(point, cell).x, center(point, cell).y])
}

function linePoints(origin: CellPoint, aim: CellPoint | null, cell: number) {
  const end = direction(origin, aim, lineLength)
  return [center(origin, cell).x, center(origin, cell).y, center(end, cell).x, center(end, cell).y]
}

function measureLabel(tool: Tool, origin: CellPoint | null, aim: CellPoint | null) {
  if (!origin || tool === 'move' || tool === 'fog')
    return null
  if (tool === 'ruler') {
    if (!aim)
      return 'Линейка: вторая точка'
    const feet = Math.hypot(aim.x - origin.x, aim.y - origin.y) * feetPerCell
    return `Линейка: ${feet.toFixed(0)} футов`
  }
  if (tool === 'circle')
    return `Шар: радиус ${circleRadius(origin, aim) * feetPerCell} футов`
  if (tool === 'cone')
    return 'Конус: 30 футов'
  return 'Линия: 30×5 футов'
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
