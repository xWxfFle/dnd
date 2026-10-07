import type { SceneDto, TokenDto } from '@dnd/shared'
import { isBloodied } from '@dnd/shared'
import { ActionIcon, Button, Group, Stack, Text } from '@mantine/core'
import { IconArrowsMaximize, IconMinus, IconPlus } from '@tabler/icons-react'
import { memo, useEffect, useRef, useState } from 'react'
import { Circle, Layer, Line, Image as MapImage, Rect, Group as ShapeGroup, Text as ShapeText, Stage } from 'react-konva'
import { boardSize, cellAt, cellCenter, cellOutline, cellSpaceToPixels, gridShift, mapOrigin, readBoardGrid } from './grid'

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

interface StageNode {
  name: () => string
  getParent: () => StageNode | null
  getStage: () => {
    getPointerPosition: () => { x: number, y: number } | null
    setPointersPositions: (event: MouseEvent) => void
  } | null
}

interface StagePointerEvent {
  evt: MouseEvent
  target: StageNode
}

interface CellPoint {
  x: number
  y: number
}

function MapBoardView(props: {
  scene: SceneDto
  tokens: TokenDto[]
  dm: boolean
  onTokenMoved: (move: { tokenId: string, x: number, y: number }) => void
  onFogUpdated: (fog: SceneDto['fog']) => void
  onMapMeasured: (size: { height: number, width: number }) => void
  focusToken?: { x: number, y: number, tick: number } | null
}) {
  const grid = readBoardGrid(props.scene.grid)
  const { columns, rows } = grid
  const image = usePortrait(props.scene.imageUrl)
  const mapPixels = image
    ? { height: image.naturalHeight * grid.imageScale, width: image.naturalWidth * grid.imageScale }
    : null
  const { width, height } = boardSize(grid, mapPixels)
  const picture = mapOrigin(grid)
  const [tool, setTool] = useState<Tool>('move')
  const [anchor, setAnchor] = useState<CellPoint | null>(null)
  const [hover, setHover] = useState<CellPoint | null>(null)
  const [reachFeet, setReachFeet] = useState(30)
  const [radiusFeet, setRadiusFeet] = useState(20)
  const [fogDrag, setFogDrag] = useState<{ anchor: CellPoint, aim: CellPoint } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panning, setPanning] = useState(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const fogDragRef = useRef<{ anchor: CellPoint, aim: CellPoint } | null>(null)
  const fogUpRef = useRef<(() => void) | null>(null)
  const draggedRef = useRef(false)
  const fittedRef = useRef(true)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(zoom)
  const zoomScrollRef = useRef<{ left: number, top: number } | null>(null)
  const panCleanupRef = useRef<(() => void) | null>(null)
  const spaceRef = useRef(false)
  zoomRef.current = zoom
  const focus = props.focusToken
  const gridRef = useRef(grid)
  gridRef.current = grid
  const onMapMeasured = props.onMapMeasured

  useEffect(() => {
    if (!image)
      return
    onMapMeasured({ height: image.naturalHeight, width: image.naturalWidth })
  }, [image, onMapMeasured])

  useEffect(() => {
    fittedRef.current = true
  }, [props.scene.id, width, height])

  useEffect(() => {
    const node = scrollerRef.current
    if (!node)
      return
    const fit = () => {
      if (!fittedRef.current)
        return
      const next = Math.min(node.clientWidth / width, node.clientHeight / height)
      setZoom(next > 0.05 ? next : 1)
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      fittedRef.current = false
      const current = zoomRef.current
      const next = clamp(current * (event.deltaY > 0 ? 0.9 : 1.1), 0.15, 4)
      const rect = node.getBoundingClientRect()
      const localX = event.clientX - rect.left
      const localY = event.clientY - rect.top
      const ratio = next / current
      zoomScrollRef.current = {
        left: (node.scrollLeft + localX) * ratio - localX,
        top: (node.scrollTop + localY) * ratio - localY,
      }
      setZoom(next)
    }
    const observer = new ResizeObserver(fit)
    observer.observe(node)
    const frame = window.requestAnimationFrame(fit)
    node.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      node.removeEventListener('wheel', onWheel)
    }
  }, [width, height])

  useEffect(() => {
    const node = scrollerRef.current
    const next = zoomScrollRef.current
    if (!node || !next)
      return
    zoomScrollRef.current = null
    node.scrollLeft = next.left
    node.scrollTop = next.top
  }, [zoom])

  useEffect(() => () => {
    panCleanupRef.current?.()
  }, [])

  useEffect(() => {
    const typing = (event: KeyboardEvent) => {
      const target = event.target
      return target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]') != null
    }
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || typing(event))
        return
      event.preventDefault()
      if (spaceRef.current)
        return
      spaceRef.current = true
      setSpaceDown(true)
    }
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space')
        return
      spaceRef.current = false
      setSpaceDown(false)
    }
    const blur = () => {
      spaceRef.current = false
      setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  useEffect(() => {
    const node = scrollerRef.current
    if (!focus || !node)
      return
    const center = cellCenter(gridRef.current, focus.x, focus.y)
    node.scrollTo({
      left: Math.max(0, center.x * zoom - node.clientWidth / 2),
      top: Math.max(0, center.y * zoom - node.clientHeight / 2),
      behavior: 'smooth',
    })
  }, [focus, grid.cellSize, grid.columns, grid.kind, grid.rows, zoom])

  useEffect(() => () => {
    fogUpRef.current?.()
  }, [])

  function dropFogDrag() {
    fogUpRef.current?.()
    fogUpRef.current = null
    fogDragRef.current = null
    setFogDrag(null)
  }

  function resetFog() {
    dropFogDrag()
    props.onFogUpdated([])
  }

  function coverMap() {
    dropFogDrag()
    const shift = gridShift(grid)
    const pad = 0.01
    props.onFogUpdated([{
      id: crypto.randomUUID(),
      points: polygonOf({
        x: -shift.x / grid.cellSize - pad,
        y: -shift.y / grid.cellSize - pad,
        w: width / grid.cellSize + pad * 2,
        h: height / grid.cellSize + pad * 2,
      }),
    }])
  }

  function selectTool(next: Tool) {
    dropFogDrag()
    setTool(next)
    setAnchor(null)
  }

  function cellOf(x: number, y: number) {
    return cellAt(grid, x, y)
  }

  function zoomOut() {
    fittedRef.current = false
    setZoom(current => clamp(current / 1.1, 0.15, 4))
  }

  function zoomIn() {
    fittedRef.current = false
    setZoom(current => clamp(current * 1.1, 0.15, 4))
  }

  function zoomFit() {
    fittedRef.current = true
    setZoom(fitZoom(scrollerRef.current, width, height))
  }

  function readCellFromClient(clientX: number, clientY: number) {
    const canvas = scrollerRef.current?.querySelector('canvas')
    if (!canvas)
      return null
    const box = canvas.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0)
      return null
    return cellOf(
      (clientX - box.left) / box.width * width,
      (clientY - box.top) / box.height * height,
    )
  }

  function readCell(event: StagePointerEvent) {
    const fromClient = readCellFromClient(event.evt.clientX, event.evt.clientY)
    if (fromClient)
      return fromClient
    const stage = event.target.getStage()
    const pointer = stage?.getPointerPosition()
    if (!pointer)
      return null
    return cellOf(pointer.x, pointer.y)
  }

  function onStageMove(event: StagePointerEvent) {
    const point = readCell(event)
    if (!point)
      return
    if (tool !== 'move')
      setHover(current => sameCell(current, point) ? current : point)
    const drag = fogDragRef.current
    if (!drag || sameCell(drag.aim, point))
      return
    drag.aim = point
    setFogDrag({ anchor: drag.anchor, aim: point })
  }

  function startPan(event: MouseEvent) {
    const node = scrollerRef.current
    if (!node)
      return
    if (event.button !== 0)
      event.preventDefault()
    fittedRef.current = false
    const origin = { x: event.clientX, y: event.clientY, left: node.scrollLeft, top: node.scrollTop }
    const move = (next: MouseEvent) => {
      const scroller = scrollerRef.current
      if (!scroller)
        return
      scroller.scrollLeft = origin.left - (next.clientX - origin.x)
      scroller.scrollTop = origin.top - (next.clientY - origin.y)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      panCleanupRef.current = null
      setPanning(false)
    }
    panCleanupRef.current?.()
    panCleanupRef.current = end
    setPanning(true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  function onStageDown(event: StagePointerEvent) {
    const button = event.evt.button
    const gesturePan = button === 1 || button === 2 || (button === 0 && spaceRef.current)
    if (gesturePan) {
      event.evt.stopPropagation()
      startPan(event.evt)
      return
    }
    if (button === 0 && tool === 'fog' && props.dm) {
      // preventDefault на pointerdown гасит mouseup, и мазок не сохраняется.
      event.evt.stopPropagation()
      const point = readCell(event)
      if (!point)
        return
      const drag = { anchor: point, aim: point }
      fogDragRef.current = drag
      setFogDrag(drag)
      const move = (next: PointerEvent) => {
        const aim = readCellFromClient(next.clientX, next.clientY)
        if (!aim)
          return
        const current = fogDragRef.current
        if (!current || sameCell(current.aim, aim))
          return
        current.aim = aim
        setFogDrag({ anchor: current.anchor, aim })
      }
      const gesture = {
        detach() {
          window.removeEventListener('pointermove', move, true)
          window.removeEventListener('pointerup', gesture.finish, true)
          window.removeEventListener('pointercancel', gesture.drop, true)
        },
        drop() {
          gesture.detach()
          fogUpRef.current = null
          fogDragRef.current = null
          setFogDrag(null)
        },
        finish() {
          const current = fogDragRef.current
          gesture.drop()
          if (!current)
            return
          const area = cellSpan(current.anchor, current.aim)
          const next = cellCovered(props.scene.fog, current.anchor) ? cutFog(props.scene.fog, area) : paintFog(props.scene.fog, area)
          props.onFogUpdated(next)
        },
      }
      fogUpRef.current?.()
      fogUpRef.current = gesture.detach
      window.addEventListener('pointermove', move, true)
      window.addEventListener('pointerup', gesture.finish, true)
      window.addEventListener('pointercancel', gesture.drop, true)
      return
    }
    const handPan = button === 0 && tool === 'move' && !fromToken(event.target)
    if (!handPan)
      return
    event.evt.stopPropagation()
    startPan(event.evt)
  }

  function onStageClick(event: StagePointerEvent) {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    const point = readCell(event)
    if (!point || tool === 'move' || tool === 'fog')
      return
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
  const fogSpan = fogDrag ? cellSpan(fogDrag.anchor, fogDrag.aim) : null
  const fogErase = fogDrag ? cellCovered(props.scene.fog, fogDrag.anchor) : false
  const measure = measureLabel(tool, Boolean(anchor), origin, aim, template.length, fogSpan ? fogSpan.w * fogSpan.h : 0, reachFeet, radiusFeet, columns, rows)

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
              <Button size="xs" variant="light" onClick={coverMap}>Туман на всю карту</Button>
              <Button size="xs" variant="default" onClick={resetFog}>Сбросить туман</Button>
              <Text size="xs" c="dimmed">{`На карте: ${props.scene.fog.length}`}</Text>
            </>
          )}
          <ActionIcon size="sm" variant="default" aria-label="Мельче" onClick={zoomOut}>
            <IconMinus size={14} />
          </ActionIcon>
          <ActionIcon size="sm" variant="default" aria-label="Крупнее" onClick={zoomIn}>
            <IconPlus size={14} />
          </ActionIcon>
          <ActionIcon size="sm" variant="default" aria-label="Вписать" onClick={zoomFit}>
            <IconArrowsMaximize size={14} />
          </ActionIcon>
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
      <div
        ref={scrollerRef}
        onMouseDown={(event) => {
          const gesture = event.button === 1 || event.button === 2 || (event.button === 0 && spaceRef.current)
          if (tool === 'fog' && event.button === 0 && !spaceRef.current)
            return
          const empty = event.button === 0 && tool === 'move' && event.target === event.currentTarget
          if (gesture || empty)
            startPan(event.nativeEvent)
        }}
        onAuxClick={event => event.preventDefault()}
        onContextMenu={event => event.preventDefault()}
        style={{ cursor: boardCursor(panning, tool, spaceDown), flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto', width: '100%' }}
      >
        <div style={{ height: height * zoom, width: width * zoom }}>
          <div style={{ height, imageRendering: grid.smoothing === 'nearest' ? 'pixelated' : 'auto', transform: `scale(${zoom})`, transformOrigin: '0 0', width }}>
            <Stage
              width={width}
              height={height}
              style={{ cursor: boardCursor(panning, tool, spaceDown) }}
              onClick={onStageClick}
              onMouseDown={onStageDown}
              onMouseMove={onStageMove}
            >
              <Layer imageSmoothingEnabled={grid.smoothing !== 'nearest'}>
                <Rect name="board" width={width} height={height} fill="#1b1724" />
                {props.scene.imageUrl && image && mapPixels && (
                  <MapImage
                    image={image}
                    x={picture.x}
                    y={picture.y}
                    width={mapPixels.width}
                    height={mapPixels.height}
                    listening={false}
                  />
                )}
                <GridLines grid={grid} />
                <FogLayer fog={props.scene.fog} grid={grid} dm={props.dm} />
              </Layer>
              <Layer>
                <CellMarks cells={template} grid={grid} fill={tool === 'ruler' ? 'rgba(143,208,255,0.35)' : 'rgba(212,93,93,0.35)'} />
                {fogSpan && (
                  <CellMarks
                    cells={cellsInSpan(fogSpan)}
                    grid={grid}
                    fill={fogErase ? 'rgba(143,208,255,0.35)' : 'rgba(240,213,140,0.45)'}
                  />
                )}
                {tool === 'fog' && hover && !fogDrag && (
                  <Line points={cellOutline(grid, hover.x, hover.y)} closed stroke="#f0d58c" strokeWidth={2} listening={false} />
                )}
                {anchor && hover && aimsWithPointer(tool) && !sameCell(anchor, hover) && (
                  <Line
                    points={lineBetween(grid, anchor, hover)}
                    stroke="#f4efe4"
                    dash={[6, 4]}
                    listening={false}
                  />
                )}
                {anchor && tool !== 'move' && tool !== 'fog' && (
                  <Line points={cellOutline(grid, anchor.x, anchor.y)} closed stroke="#f4efe4" strokeWidth={2} listening={false} />
                )}
                {props.tokens.map(token => (
                  <TokenPiece
                    key={token.id}
                    token={token}
                    grid={grid}
                    boardWidth={width}
                    boardHeight={height}
                    imageUrl={token.obscured ? null : token.imageUrl}
                    draggable={tool === 'move' && !spaceDown}
                    onDragged={() => {
                      draggedRef.current = true
                    }}
                    onMoved={props.onTokenMoved}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  )
}

export const MapBoard = memo(MapBoardView, sameMapProps)

function sameMapProps(prev: {
  scene: SceneDto
  tokens: TokenDto[]
  dm: boolean
  focusToken?: { x: number, y: number, tick: number } | null
}, next: {
  scene: SceneDto
  tokens: TokenDto[]
  dm: boolean
  focusToken?: { x: number, y: number, tick: number } | null
}) {
  return prev.dm === next.dm
    && prev.focusToken === next.focusToken
    && prev.scene.id === next.scene.id
    && prev.scene.imageUrl === next.scene.imageUrl
    && prev.scene.fog === next.scene.fog
    && prev.scene.grid === next.scene.grid
    && sameTokens(prev.tokens, next.tokens)
}

function sameTokens(left: TokenDto[], right: TokenDto[]) {
  if (left === right)
    return true
  if (left.length !== right.length)
    return false
  return left.every((token, index) => {
    const other = right[index]
    return other != null
      && token.id === other.id
      && token.x === other.x
      && token.y === other.y
      && token.hpCurrent === other.hpCurrent
      && token.hpMax === other.hpMax
      && token.hidden === other.hidden
      && token.obscured === other.obscured
      && token.name === other.name
      && token.imageUrl === other.imageUrl
  })
}

function TokenPiece(props: {
  token: TokenDto
  grid: ReturnType<typeof readBoardGrid>
  boardWidth: number
  boardHeight: number
  imageUrl: string | null
  draggable: boolean
  onDragged: () => void
  onMoved: (move: { tokenId: string, x: number, y: number }) => void
}) {
  const center = cellCenter(props.grid, props.token.x, props.token.y)
  const radius = Math.max(props.token.size, 1) * props.grid.cellSize / 2
  const labelWidth = props.grid.cellSize * 3
  const unknown = props.token.obscured
  const portrait = usePortrait(props.imageUrl)
  const frame = portrait ? coverBox(portrait, radius * 2) : null
  return (
    <ShapeGroup
      name="token"
      x={center.x}
      y={center.y}
      opacity={props.token.hidden ? 0.4 : 1}
      draggable={props.draggable}
      listening={props.draggable}
      dragBoundFunc={function (pos) {
        const scaleX = this.getStage()?.scaleX() || 1
        const scaleY = this.getStage()?.scaleY() || 1
        return {
          x: clamp(pos.x, radius * scaleX, Math.max(radius * scaleX, (props.boardWidth - radius) * scaleX)),
          y: clamp(pos.y, radius * scaleY, Math.max(radius * scaleY, (props.boardHeight - radius) * scaleY)),
        }
      }}
      onDragEnd={(event) => {
        props.onDragged()
        const next = cellAt(props.grid, event.target.x(), event.target.y())
        const snapped = cellCenter(props.grid, next.x, next.y)
        event.target.position(snapped)
        props.onMoved({ tokenId: props.token.id, x: next.x, y: next.y })
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

function CellMarks(props: { cells: CellPoint[], grid: ReturnType<typeof readBoardGrid>, fill: string, stroke?: string }) {
  return (
    <ShapeGroup listening={false}>
      {props.cells.map(point => (
        <Line
          key={`${point.x},${point.y}`}
          points={cellOutline(props.grid, point.x, point.y)}
          closed
          fill={props.fill}
          stroke={props.stroke}
          strokeWidth={props.stroke ? 1 : 0}
          listening={false}
        />
      ))}
    </ShapeGroup>
  )
}

function GridLines(props: { grid: ReturnType<typeof readBoardGrid> }) {
  if (props.grid.kind === 'hex') {
    const lines = []
    for (let row = 0; row < props.grid.rows; row += 1) {
      for (let col = 0; col < props.grid.columns; col += 1) {
        lines.push(
          <Line
            key={`${col},${row}`}
            points={cellOutline(props.grid, col, row)}
            closed
            stroke={props.grid.color}
            opacity={props.grid.opacity}
            listening={false}
          />,
        )
      }
    }
    return <ShapeGroup listening={false}>{lines}</ShapeGroup>
  }
  const shift = gridShift(props.grid)
  const gridWidth = props.grid.columns * props.grid.cellSize
  const gridHeight = props.grid.rows * props.grid.cellSize
  return (
    <>
      {Array.from({ length: props.grid.columns + 1 }, (_, index) => (
        <Line
          key={`v${index}`}
          points={[shift.x + index * props.grid.cellSize, shift.y, shift.x + index * props.grid.cellSize, shift.y + gridHeight]}
          stroke={props.grid.color}
          opacity={props.grid.opacity}
          listening={false}
        />
      ))}
      {Array.from({ length: props.grid.rows + 1 }, (_, index) => (
        <Line
          key={`h${index}`}
          points={[shift.x, shift.y + index * props.grid.cellSize, shift.x + gridWidth, shift.y + index * props.grid.cellSize]}
          stroke={props.grid.color}
          opacity={props.grid.opacity}
          listening={false}
        />
      ))}
    </>
  )
}

function FogLayer(props: { fog: SceneDto['fog'], grid: ReturnType<typeof readBoardGrid>, dm: boolean }) {
  const fill = props.dm ? 'rgba(5, 3, 10, 0.78)' : '#05040a'
  const stroke = props.dm ? '#f0d58c' : undefined
  if (props.grid.kind === 'hex')
    return <CellMarks cells={coveredCells(props.fog, props.grid)} grid={props.grid} fill={fill} stroke={stroke} />
  return (
    <ShapeGroup listening={false}>
      {props.fog.map(polygon => (
        <FogPatch key={polygon.id} points={polygon.points} grid={props.grid} fill={fill} stroke={stroke} />
      ))}
    </ShapeGroup>
  )
}

function FogPatch(props: { points: number[], grid: ReturnType<typeof readBoardGrid>, fill: string, stroke?: string }) {
  const rect = rectOf(props.points)
  if (rect) {
    const shift = gridShift(props.grid)
    return (
      <Rect
        x={shift.x + rect.x * props.grid.cellSize}
        y={shift.y + rect.y * props.grid.cellSize}
        width={rect.w * props.grid.cellSize}
        height={rect.h * props.grid.cellSize}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={props.stroke ? 1 : 0}
        listening={false}
      />
    )
  }
  return (
    <Line
      points={cellSpaceToPixels(props.grid, props.points)}
      closed
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.stroke ? 1 : 0}
      listening={false}
    />
  )
}

function coveredCells(fog: SceneDto['fog'], grid: ReturnType<typeof readBoardGrid>) {
  const covered = []
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.columns; col += 1) {
      if (cellCovered(fog, { x: col, y: row }))
        covered.push({ x: col, y: row })
    }
  }
  return covered
}

function cellsInSpan(span: FogRect) {
  const cells: CellPoint[] = []
  for (let y = span.y; y < span.y + span.h; y += 1) {
    for (let x = span.x; x < span.x + span.w; x += 1)
      cells.push({ x, y })
  }
  return cells
}

function lineBetween(grid: ReturnType<typeof readBoardGrid>, start: CellPoint, end: CellPoint) {
  const from = cellCenter(grid, start.x, start.y)
  const to = cellCenter(grid, end.x, end.y)
  return [from.x, from.y, to.x, to.y]
}

function fromToken(node: StageNode | null) {
  let current = node
  while (current) {
    if (current.name() === 'token')
      return true
    current = current.getParent()
  }
  return false
}

function boardCursor(panning: boolean, tool: Tool, spaceDown: boolean) {
  if (panning)
    return 'grabbing'
  if (tool === 'move' || spaceDown)
    return 'grab'
  return 'crosshair'
}

function fitZoom(node: HTMLDivElement | null, width: number, height: number) {
  if (!node || width <= 0 || height <= 0)
    return 1
  const next = Math.min(node.clientWidth / width, node.clientHeight / height)
  return next > 0.05 ? next : 1
}

function sameCell(left: CellPoint | null, right: CellPoint) {
  return left?.x === right.x && left.y === right.y
}

interface FogRect {
  x: number
  y: number
  w: number
  h: number
}

function cellSpan(start: CellPoint, end: CellPoint): FogRect {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return { x, y, w: Math.abs(start.x - end.x) + 1, h: Math.abs(start.y - end.y) + 1 }
}

function polygonOf(rect: FogRect) {
  const { x, y, w, h } = rect
  return [x, y, x + w, y, x + w, y + h, x, y + h]
}

function rectOf(points: number[]): FogRect | null {
  const [x, y, x2, y2, x3, y3, x4, y4] = points
  if (points.length !== 8 || x == null || y == null || x2 == null || y3 == null)
    return null
  const w = x2 - x
  const h = y3 - y
  if (w <= 0 || h <= 0 || y2 !== y || x3 !== x2 || y4 !== y3 || x4 !== x)
    return null
  return { x, y, w, h }
}

function cellCovered(fog: { points: number[] }[], point: CellPoint) {
  return fog.some((polygon) => {
    const rect = rectOf(polygon.points)
    if (!rect)
      return false
    return point.x >= rect.x && point.y >= rect.y && point.x < rect.x + rect.w && point.y < rect.y + rect.h
  })
}

function subtractRect(source: FogRect, cut: FogRect): FogRect[] {
  const left = Math.max(source.x, cut.x)
  const top = Math.max(source.y, cut.y)
  const right = Math.min(source.x + source.w, cut.x + cut.w)
  const bottom = Math.min(source.y + source.h, cut.y + cut.h)
  if (left >= right || top >= bottom)
    return [source]
  const pieces: FogRect[] = []
  if (left > source.x)
    pieces.push({ x: source.x, y: source.y, w: left - source.x, h: source.h })
  if (right < source.x + source.w)
    pieces.push({ x: right, y: source.y, w: source.x + source.w - right, h: source.h })
  if (top > source.y)
    pieces.push({ x: left, y: source.y, w: right - left, h: top - source.y })
  if (bottom < source.y + source.h)
    pieces.push({ x: left, y: bottom, w: right - left, h: source.y + source.h - bottom })
  return pieces
}

function cutFog(fog: SceneDto['fog'], cut: FogRect): SceneDto['fog'] {
  return fog.flatMap((polygon) => {
    const rect = rectOf(polygon.points)
    if (!rect)
      return [polygon]
    return subtractRect(rect, cut).map(piece => ({ id: crypto.randomUUID(), points: polygonOf(piece) }))
  })
}

function paintFog(fog: SceneDto['fog'], area: FogRect): SceneDto['fog'] {
  return [...cutFog(fog, area), { id: crypto.randomUUID(), points: polygonOf(area) }]
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
  const dir = coneOctant(origin, aim)
  const place = dir.x !== 0 && dir.y !== 0 ? diagonalConeSquare : orthogonalConeSquare
  const cells: CellPoint[] = []
  const seen = new Set<string>()
  for (let rank = 1; rank <= length; rank += 1) {
    for (let index = 0; index < rank; index += 1) {
      const point = place(origin, dir, rank, index)
      const key = `${point.x},${point.y}`
      if (seen.has(key) || !inside(point, columns, rows))
        continue
      seen.add(key)
      cells.push(point)
    }
  }
  return cells
}

function coneOctant(origin: CellPoint, aim: CellPoint | null) {
  const dx = aim && !sameCell(aim, origin) ? aim.x - origin.x : 0
  const dy = aim && !sameCell(aim, origin) ? aim.y - origin.y : 1
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4))
  const angle = octant * (Math.PI / 4)
  return { x: Math.round(Math.cos(angle)), y: Math.round(Math.sin(angle)) }
}

function orthogonalConeSquare(origin: CellPoint, dir: CellPoint, rank: number, index: number) {
  const lateral = index - Math.floor((rank - 1) / 2)
  return {
    x: origin.x + dir.x * rank - dir.y * lateral,
    y: origin.y + dir.y * rank + dir.x * lateral,
  }
}

function diagonalConeSquare(origin: CellPoint, dir: CellPoint, rank: number, index: number) {
  if (index === 0)
    return { x: origin.x + dir.x * rank, y: origin.y + dir.y * rank }
  const step = Math.ceil(index / 2)
  if (index % 2 === 1)
    return { x: origin.x + dir.x * rank, y: origin.y + dir.y * (rank - step) }
  return { x: origin.x + dir.x * (rank - step), y: origin.y + dir.y * rank }
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
    move: `Тяни карту. Правая кнопка или пробел сдвигают в любом режиме. Если карта вписана, сначала увеличь. Поле ${columns}×${rows}`,
    fog: fogCells > 0 ? `Прямоугольник: ${fogCells} кл. Отпусти, чтобы применить` : 'Тяни прямоугольник. С пустой клетки ставит туман, с туманной снимает',
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
