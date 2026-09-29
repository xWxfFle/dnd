import type { SceneDto, TokenDto } from '@dnd/shared'
import { isBloodied } from '@dnd/shared'
import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core'
import { IconMinus, IconPlus } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { Circle, Layer, Line, Image as MapImage, Rect, Group as ShapeGroup, Text as ShapeText, Stage } from 'react-konva'

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
const minFeet = 5
const maxFeet = 300

const sizeByTool: Partial<Record<Tool, { label: string, presets: number[] }>> = {
  circle: { label: 'Радиус шара', presets: [10, 15, 20, 30, 40] },
  cone: { label: 'Длина конуса', presets: [15, 30, 60] },
  line: { label: 'Длина линии', presets: [15, 30, 60, 100] },
}

interface StagePointerEvent {
  target: { getStage: () => { getPointerPosition: () => { x: number, y: number } | null } | null }
}

interface CellPoint {
  x: number
  y: number
}

export function MapBoard(props: {
  scene: SceneDto
  tokens: TokenDto[]
  dm: boolean
  onTokenMoved: (move: { tokenId: string, x: number, y: number }) => void
  onFogUpdated: (fog: SceneDto['fog']) => void
  focusToken?: { x: number, y: number, tick: number } | null
}) {
  const cell = props.scene.grid.cellSize
  const columns = props.scene.grid.columns
  const rows = props.scene.grid.rows
  const width = columns * cell
  const height = rows * cell
  const [tool, setTool] = useState<Tool>('move')
  const [anchor, setAnchor] = useState<CellPoint | null>(null)
  const [hover, setHover] = useState<CellPoint | null>(null)
  const [reachFeet, setReachFeet] = useState(30)
  const [radiusFeet, setRadiusFeet] = useState(20)
  const [fogDraft, setFogDraft] = useState<CellPoint[]>([])
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const draggedRef = useRef(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const focus = props.focusToken

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

  useEffect(() => {
    const node = scrollerRef.current
    if (!focus || !node)
      return
    node.scrollTo({
      left: Math.max(0, (focus.x + 0.5) * cell - node.clientWidth / 2),
      top: Math.max(0, (focus.y + 0.5) * cell - node.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [focus, cell])

  function selectTool(next: Tool) {
    setTool(next)
    setAnchor(null)
    if (next !== 'fog')
      setFogDraft([])
  }

  function cellOf(x: number, y: number): CellPoint {
    return {
      x: clamp(Math.floor(x / cell), 0, columns - 1),
      y: clamp(Math.floor(y / cell), 0, rows - 1),
    }
  }

  function readCell(event: StagePointerEvent) {
    const pointer = event.target.getStage()?.getPointerPosition()
    if (!pointer)
      return null
    return cellOf(pointer.x, pointer.y)
  }

  function onStageMove(event: StagePointerEvent) {
    const point = readCell(event)
    if (!point)
      return
    setHover(current => sameCell(current, point) ? current : point)
  }

  function onStageClick(event: StagePointerEvent) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    const point = readCell(event)
    if (!point || tool === 'move')
      return
    if (tool === 'fog' && props.dm) {
      const covered = props.scene.fog.find(polygon => sameCell(squareOf(polygon.points), point))
      if (covered) {
        props.onFogUpdated(props.scene.fog.filter(polygon => polygon.id !== covered.id))
        return
      }
      setFogDraft(cells => cells.some(item => sameCell(item, point))
        ? cells.filter(item => !sameCell(item, point))
        : [...cells, point])
      return
    }
    setAnchor(point)
    setHover(point)
  }

  const origin = anchor ?? hover
  const aim = anchor ? hover : null
  const reachCells = Math.max(1, Math.round(reachFeet / feetPerCell))
  const radiusCells = Math.max(1, Math.round(radiusFeet / feetPerCell))
  const template = templateCells(tool, origin, aim, columns, rows, reachCells, radiusCells)
  const size = sizeByTool[tool]
  const feetByTool: Partial<Record<Tool, number>> = { circle: radiusFeet, cone: reachFeet, line: reachFeet }
  const setFeetByTool: Partial<Record<Tool, (feet: number) => void>> = {
    circle: setRadiusFeet,
    cone: setReachFeet,
    line: setReachFeet,
  }
  const measure = measureLabel(tool, Boolean(anchor), origin, aim, template.length, fogDraft.length, reachFeet, radiusFeet, columns, rows)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack gap={6} mb="xs" style={{ flex: 'none' }}>
        <Group gap={6} wrap="wrap" align="center">
          {(['move', 'ruler', 'circle', 'cone', 'line'] as Tool[]).map(item => (
            <Button key={item} size="xs" variant={tool === item ? 'filled' : 'default'} onClick={() => selectTool(item)}>{toolLabel[item]}</Button>
          ))}
          {props.dm && (
            <>
              <Button size="xs" variant={tool === 'fog' ? 'filled' : 'default'} onClick={() => selectTool('fog')}>Туман</Button>
              <Button
                size="xs"
                variant="light"
                disabled={fogDraft.length === 0}
                onClick={() => {
                  props.onFogUpdated([
                    ...props.scene.fog,
                    ...fogDraft.map(item => ({ id: crypto.randomUUID(), points: cellSquare(item) })),
                  ])
                  setFogDraft([])
                }}
              >
                Наложить туман
              </Button>
              <Button size="xs" variant="default" onClick={() => props.onFogUpdated([])}>Сбросить туман</Button>
            </>
          )}
        </Group>
        {size && (
          <ReachControl
            label={size.label}
            feet={feetByTool[tool] ?? reachFeet}
            presets={size.presets}
            onFeet={setFeetByTool[tool] ?? setReachFeet}
          />
        )}
        <Text size="xs" c="dimmed">{measure}</Text>
      </Stack>
      <div ref={scrollerRef} style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Stage width={width} height={height} onClick={onStageClick} onMouseMove={onStageMove}>
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
            <CellMarks cells={template} cell={cell} fill={tool === 'ruler' ? 'rgba(143,208,255,0.35)' : 'rgba(212,93,93,0.35)'} />
            <CellMarks cells={fogDraft} cell={cell} fill="rgba(240,213,140,0.45)" />
            {tool === 'fog' && hover && (
              <Rect x={hover.x * cell} y={hover.y * cell} width={cell} height={cell} stroke="#f0d58c" strokeWidth={2} listening={false} />
            )}
            {anchor && hover && aimsWithPointer(tool) && !sameCell(anchor, hover) && (
              <Line
                points={[(anchor.x + 0.5) * cell, (anchor.y + 0.5) * cell, (hover.x + 0.5) * cell, (hover.y + 0.5) * cell]}
                stroke="#f4efe4"
                dash={[6, 4]}
                listening={false}
              />
            )}
            {anchor && tool !== 'move' && tool !== 'fog' && (
              <Rect x={anchor.x * cell} y={anchor.y * cell} width={cell} height={cell} stroke="#f4efe4" strokeWidth={2} listening={false} />
            )}
            {props.tokens.map(token => (
              <TokenPiece
                key={token.id}
                token={token}
                cell={cell}
                columns={columns}
                rows={rows}
                imageUrl={token.obscured ? null : token.imageUrl}
                draggable={tool === 'move'}
                onDragged={() => {
                  draggedRef.current = true
                }}
                onMoved={props.onTokenMoved}
              />
            ))}
            {props.tokens.filter(token => token.obscured).map(token => (
              <Rect
                key={`unknown-${token.id}`}
                x={token.x * cell + 2}
                y={token.y * cell + 2}
                width={cell - 4}
                height={cell - 4}
                stroke="#f0d58c"
                strokeWidth={3}
                listening={false}
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
  imageUrl: string | null
  draggable: boolean
  onDragged: () => void
  onMoved: (move: { tokenId: string, x: number, y: number }) => void
}) {
  const radius = Math.max(props.token.size, 1) * props.cell / 2
  const labelWidth = props.cell * 3
  const unknown = props.token.obscured
  const portrait = usePortrait(props.imageUrl)
  const frame = portrait ? coverBox(portrait, radius * 2) : null
  return (
    <ShapeGroup
      x={(props.token.x + 0.5) * props.cell}
      y={(props.token.y + 0.5) * props.cell}
      opacity={props.token.hidden ? 0.4 : 1}
      draggable={props.draggable}
      listening={props.draggable}
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
        props.onMoved({ tokenId: props.token.id, x: cellX, y: cellY })
      }}
    >
      <Circle radius={radius} fill={tokenFill(props.token)} />
      {portrait && frame && (
        <ShapeGroup
          clipFunc={(ctx) => {
            ctx.beginPath()
            ctx.arc(0, 0, Math.max(radius - 2, 1), 0, Math.PI * 2, false)
            ctx.closePath()
          }}
          listening={false}
        >
          <MapImage image={portrait} x={frame.x} y={frame.y} width={frame.width} height={frame.height} listening={false} />
        </ShapeGroup>
      )}
      <Circle
        radius={radius}
        fillEnabled={false}
        stroke={unknown ? '#f0d58c' : tokenStroke(props.token)}
        strokeWidth={unknown ? 4 : 2}
        dash={props.token.hidden ? [6, 4] : undefined}
        listening={false}
      />
      <ShapeText
        text={unknown ? 'Неизвестный' : props.token.name}
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

function coverBox(image: HTMLImageElement, size: number) {
  const width = image.width || 1
  const height = image.height || 1
  const scale = Math.max(size / width, size / height)
  return {
    x: -(width * scale) / 2,
    y: -(height * scale) / 2,
    width: width * scale,
    height: height * scale,
  }
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

function tokenFill(token: TokenDto) {
  if (token.obscured)
    return '#2a2436'
  if (token.hpCurrent <= 0)
    return '#3a2a32'
  return token.color
}

function tokenStroke(token: TokenDto) {
  if (token.hpCurrent <= 0)
    return '#d45d5d'
  if (isBloodied(token.hpCurrent, token.hpMax))
    return '#e08a3c'
  if (token.hidden)
    return '#f0d58c'
  return '#f4efe4'
}

function ReachControl(props: { label: string, feet: number, presets: number[], onFeet: (feet: number) => void }) {
  return (
    <Group gap={4} wrap="wrap" align="center">
      <Text size="xs">{props.label}</Text>
      <ActionIcon size="xs" variant="default" aria-label="Меньше" disabled={props.feet <= minFeet} onClick={() => props.onFeet(props.feet - feetPerCell)}>
        <IconMinus size={14} />
      </ActionIcon>
      <Text size="xs" w={58} ta="center">{`${props.feet} фт`}</Text>
      <ActionIcon size="xs" variant="default" aria-label="Больше" disabled={props.feet >= maxFeet} onClick={() => props.onFeet(props.feet + feetPerCell)}>
        <IconPlus size={14} />
      </ActionIcon>
      {props.presets.map(feet => (
        <Button key={feet} size="xs" variant={props.feet === feet ? 'light' : 'default'} onClick={() => props.onFeet(feet)}>{feet}</Button>
      ))}
    </Group>
  )
}

function CellMarks(props: { cells: CellPoint[], cell: number, fill: string }) {
  return props.cells.map(point => (
    <Rect
      key={`${point.x},${point.y}`}
      x={point.x * props.cell}
      y={point.y * props.cell}
      width={props.cell}
      height={props.cell}
      fill={props.fill}
      listening={false}
    />
  ))
}

function sameCell(left: CellPoint | null, right: CellPoint) {
  return left?.x === right.x && left.y === right.y
}

function cellSquare(point: CellPoint) {
  return [point.x, point.y, point.x + 1, point.y, point.x + 1, point.y + 1, point.x, point.y + 1]
}

function squareOf(points: number[]): CellPoint | null {
  const [x, y, x2, y2, x3, y3, x4, y4] = points
  if (points.length !== 8 || x2 !== x + 1 || y2 !== y || x3 !== x + 1 || y3 !== y + 1 || x4 !== x || y4 !== y + 1)
    return null
  return { x: x ?? 0, y: y ?? 0 }
}

function heading(origin: CellPoint, aim: CellPoint | null) {
  if (!aim || sameCell(aim, origin))
    return { x: 0, y: 1 }
  const dx = aim.x - origin.x
  const dy = aim.y - origin.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function inside(point: CellPoint, columns: number, rows: number) {
  return point.x >= 0 && point.y >= 0 && point.x < columns && point.y < rows
}

function circleCells(origin: CellPoint, radius: number, columns: number, rows: number) {
  const cells: CellPoint[] = []
  for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
    for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
      const point = { x, y }
      if (!inside(point, columns, rows))
        continue
      if (Math.hypot(x - origin.x, y - origin.y) <= radius)
        cells.push(point)
    }
  }
  return cells
}

function coneCells(origin: CellPoint, aim: CellPoint | null, length: number, columns: number, rows: number) {
  const aimPoint = heading(origin, aim)
  const cells: CellPoint[] = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      if (x === origin.x && y === origin.y)
        continue
      const along = (x - origin.x) * aimPoint.x + (y - origin.y) * aimPoint.y
      const aside = Math.abs((x - origin.x) * -aimPoint.y + (y - origin.y) * aimPoint.x)
      if (along >= 0.5 && along <= length && aside <= along / 2)
        cells.push({ x, y })
    }
  }
  return cells
}

function lineCells(origin: CellPoint, aim: CellPoint | null, length: number, columns: number, rows: number) {
  const aimPoint = heading(origin, aim)
  const end = {
    x: clamp(Math.round(origin.x + aimPoint.x * length), 0, columns - 1),
    y: clamp(Math.round(origin.y + aimPoint.y * length), 0, rows - 1),
  }
  return bresenham(origin, end).filter(point => !sameCell(point, origin)).slice(0, length)
}

function rulerCells(origin: CellPoint, aim: CellPoint | null) {
  if (!aim)
    return [origin]
  return bresenham(origin, aim)
}

function bresenham(start: CellPoint, end: CellPoint) {
  const cells: CellPoint[] = []
  let x = start.x
  let y = start.y
  const dx = Math.abs(end.x - start.x)
  const dy = Math.abs(end.y - start.y)
  const sx = start.x < end.x ? 1 : -1
  const sy = start.y < end.y ? 1 : -1
  let error = dx - dy
  for (;;) {
    cells.push({ x, y })
    if (x === end.x && y === end.y)
      return cells
    const doubled = error * 2
    if (doubled > -dy) {
      error -= dy
      x += sx
    }
    if (doubled < dx) {
      error += dx
      y += sy
    }
  }
}

function templateCells(tool: Tool, origin: CellPoint | null, aim: CellPoint | null, columns: number, rows: number, reachCells: number, radiusCells: number) {
  if (!origin || tool === 'move' || tool === 'fog')
    return []
  const cellsByTool: Record<'ruler' | 'circle' | 'cone' | 'line', CellPoint[]> = {
    ruler: rulerCells(origin, aim),
    circle: circleCells(origin, radiusCells, columns, rows),
    cone: coneCells(origin, aim, reachCells, columns, rows),
    line: lineCells(origin, aim, reachCells, columns, rows),
  }
  return cellsByTool[tool]
}

function aimsWithPointer(tool: Tool) {
  const aimed: Partial<Record<Tool, true>> = { ruler: true, cone: true, line: true }
  return aimed[tool] === true
}

function measureLabel(tool: Tool, placed: boolean, origin: CellPoint | null, aim: CellPoint | null, cells: number, fogCells: number, reachFeet: number, radiusFeet: number, columns: number, rows: number) {
  const steps = origin && aim ? Math.max(Math.abs(aim.x - origin.x), Math.abs(aim.y - origin.y)) : 0
  const hintByTool: Record<Tool, string> = {
    move: `Поле ${columns}×${rows} · клетка 5 футов`,
    fog: fogCells > 0 ? `Туман: ${fogCells} кл. в черновике. Клик красит, повтор стирает` : 'Туман: курсор показывает клетку. Клик красит, повтор стирает',
    ruler: placed ? `Линейка: ${steps} кл. · ${steps * feetPerCell} футов. Веди мышь. Клик переносит начало` : 'Линейка: клик ставит начало, длина идёт за курсором',
    circle: placed ? `Шар: радиус ${radiusFeet} футов · ${cells} кл. Клик переносит центр` : `Шар: радиус ${radiusFeet} футов. Шаблон за курсором, клик ставит центр`,
    cone: placed ? `Конус: ${reachFeet} футов · ${cells} кл. Веди мышь — направление` : `Конус: ${reachFeet} футов. Шаблон за курсором, клик ставит источник`,
    line: placed ? `Линия: ${reachFeet}×${feetPerCell} футов · ${cells} кл. Веди мышь — направление` : `Линия: ${reachFeet} футов. Шаблон за курсором, клик ставит источник`,
  }
  return hintByTool[tool]
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
