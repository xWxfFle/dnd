export type HexFacing = 'pointy' | 'flat'

export interface BoardGrid {
  columns: number
  rows: number
  cellSize: number
  kind: 'square' | 'hex'
  hexFacing: HexFacing
  color: string
  opacity: number
  imageScale: number
  offsetX: number
  offsetY: number
  smoothing: 'linear' | 'nearest'
}

export interface CellPoint {
  x: number
  y: number
}

const kindByValue: Record<string, BoardGrid['kind'] | undefined> = {
  hex: 'hex',
  square: 'square',
}

const hexFacingByValue: Record<string, HexFacing | undefined> = {
  flat: 'flat',
  pointy: 'pointy',
}

const smoothingByValue: Record<string, BoardGrid['smoothing'] | undefined> = {
  linear: 'linear',
  nearest: 'nearest',
}

const hexRoot = Math.sqrt(3)

export function readBoardGrid(grid: {
  columns: number
  rows: number
  cellSize: number
  kind?: string
  hexFacing?: string
  color?: string
  opacity?: number
  imageScale?: number
  offsetX?: number
  offsetY?: number
  smoothing?: string
}): BoardGrid {
  const color = grid.color ?? ''
  return {
    cellSize: grid.cellSize,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#3a3348',
    columns: grid.columns,
    imageScale: clamp(grid.imageScale ?? 1, 0.1, 8),
    hexFacing: hexFacingByValue[grid.hexFacing ?? ''] ?? 'pointy',
    kind: kindByValue[grid.kind ?? ''] ?? 'square',
    offsetX: clamp(grid.offsetX ?? 0, -4000, 4000),
    offsetY: clamp(grid.offsetY ?? 0, -4000, 4000),
    opacity: clamp(grid.opacity ?? 1, 0, 1),
    rows: grid.rows,
    smoothing: smoothingByValue[grid.smoothing ?? ''] ?? 'linear',
  }
}

export function mapOrigin(grid: BoardGrid) {
  return { x: Math.max(0, -grid.offsetX), y: Math.max(0, -grid.offsetY) }
}

export function gridShift(grid: BoardGrid) {
  const origin = mapOrigin(grid)
  return { x: origin.x + grid.offsetX, y: origin.y + grid.offsetY }
}

export function boardSize(grid: BoardGrid, map?: { height: number, width: number } | null) {
  const extent = gridExtent(grid)
  const origin = mapOrigin(grid)
  const shift = gridShift(grid)
  const right = Math.max(origin.x + (map?.width ?? 0), shift.x + extent.width)
  const bottom = Math.max(origin.y + (map?.height ?? 0), shift.y + extent.height)
  return { height: Math.max(1, bottom), width: Math.max(1, right) }
}

const hexCenterByFacing = {
  flat(radius: number, col: number, row: number) {
    return {
      x: radius + radius * 1.5 * col,
      y: hexRoot * radius * (row + 0.5 * (col & 1)) + hexRoot * radius / 2,
    }
  },
  pointy(radius: number, col: number, row: number) {
    return {
      x: hexRoot * radius * (col + 0.5 * (row & 1)) + hexRoot * radius / 2,
      y: radius + radius * 1.5 * row,
    }
  },
} satisfies Record<HexFacing, (radius: number, col: number, row: number) => { x: number, y: number }>

const hexAngleByFacing = {
  flat: 0,
  pointy: -30,
} as const satisfies Record<HexFacing, number>

const hexCellByFacing = {
  flat(localX: number, localY: number, radius: number) {
    const x = localX - radius
    const y = localY - hexRoot * radius / 2
    const axial = axialRound((2 / 3 * x) / radius, (-x / 3 + hexRoot / 3 * y) / radius)
    const col = axial.q
    return { x: col, y: axial.r + (col - (col & 1)) / 2 }
  },
  pointy(localX: number, localY: number, radius: number) {
    const x = localX - hexRoot * radius / 2
    const y = localY - radius
    const axial = axialRound((hexRoot / 3 * x - y / 3) / radius, (2 / 3 * y) / radius)
    const row = axial.r
    return { x: axial.q + (row - (row & 1)) / 2, y: row }
  },
} satisfies Record<HexFacing, (localX: number, localY: number, radius: number) => CellPoint>

export function cellCenter(grid: BoardGrid, col: number, row: number) {
  const shift = gridShift(grid)
  if (grid.kind === 'square')
    return { x: shift.x + (col + 0.5) * grid.cellSize, y: shift.y + (row + 0.5) * grid.cellSize }
  const local = hexCenterByFacing[grid.hexFacing](grid.cellSize / 2, col, row)
  return { x: shift.x + local.x, y: shift.y + local.y }
}

export function cellAt(grid: BoardGrid, x: number, y: number): CellPoint {
  const shift = gridShift(grid)
  if (grid.kind === 'square') {
    return {
      x: clamp(Math.floor((x - shift.x) / grid.cellSize), 0, grid.columns - 1),
      y: clamp(Math.floor((y - shift.y) / grid.cellSize), 0, grid.rows - 1),
    }
  }
  const local = hexCellByFacing[grid.hexFacing](x - shift.x, y - shift.y, grid.cellSize / 2)
  return {
    x: clamp(local.x, 0, grid.columns - 1),
    y: clamp(local.y, 0, grid.rows - 1),
  }
}

export function cellSpaceToPixels(grid: BoardGrid, points: number[]) {
  const shift = gridShift(grid)
  const pixels: number[] = []
  for (let index = 0; index < points.length; index += 2)
    pixels.push(shift.x + (points[index] ?? 0) * grid.cellSize, shift.y + (points[index + 1] ?? 0) * grid.cellSize)
  return pixels
}

export function cellOutline(grid: BoardGrid, col: number, row: number) {
  if (grid.kind === 'square') {
    const shift = gridShift(grid)
    const x = shift.x + col * grid.cellSize
    const y = shift.y + row * grid.cellSize
    return [x, y, x + grid.cellSize, y, x + grid.cellSize, y + grid.cellSize, x, y + grid.cellSize]
  }
  const center = cellCenter(grid, col, row)
  const radius = grid.cellSize / 2
  const turn = hexAngleByFacing[grid.hexFacing]
  const points: number[] = []
  for (let index = 0; index < 6; index += 1) {
    const angle = Math.PI / 180 * (60 * index + turn)
    points.push(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle))
  }
  return points
}

const hexExtentByFacing = {
  flat(radius: number, columns: number, rows: number) {
    return {
      height: hexRoot * radius * (rows + 0.5),
      width: radius * 2 + radius * 1.5 * (columns - 1),
    }
  },
  pointy(radius: number, columns: number, rows: number) {
    return {
      height: radius * 2 + radius * 1.5 * (rows - 1),
      width: hexRoot * radius * (columns + 0.5),
    }
  },
} satisfies Record<HexFacing, (radius: number, columns: number, rows: number) => { height: number, width: number }>

export function hexFieldSize(facing: HexFacing, columns: number, rows: number, cellSize: number) {
  return hexExtentByFacing[facing](cellSize / 2, columns, rows)
}

function gridExtent(grid: BoardGrid) {
  if (grid.kind === 'square')
    return { height: grid.rows * grid.cellSize, width: grid.columns * grid.cellSize }
  return hexFieldSize(grid.hexFacing, grid.columns, grid.rows, grid.cellSize)
}

function axialRound(q: number, r: number) {
  const x = q
  const z = r
  const y = -x - z
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const xDiff = Math.abs(rx - x)
  const yDiff = Math.abs(ry - y)
  const zDiff = Math.abs(rz - z)
  if (xDiff > yDiff && xDiff > zDiff)
    rx = -ry - rz
  else if (yDiff > zDiff)
    ry = -rx - rz
  else
    rz = -rx - ry
  return { q: rx, r: rz }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
