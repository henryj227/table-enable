// Helper to create a table with chairs at a given position (CRS.Simple pixel coords)
function createTableWithChairs(tableId, centerX, centerY, radius = 80, chairSize = 40, chairPadding = 40) {
  const chairDistance = radius + chairPadding
  return {
    table: {
      id: tableId,
      type: "circle",
      center: [centerX, centerY],
      radius
    },
    chairs: [
      { id: `${tableId}-n`, table_id: tableId, position: "north", x: centerX, y: centerY - chairDistance, size: chairSize },
      { id: `${tableId}-s`, table_id: tableId, position: "south", x: centerX, y: centerY + chairDistance, size: chairSize },
      { id: `${tableId}-e`, table_id: tableId, position: "east",  x: centerX + chairDistance, y: centerY, size: chairSize },
      { id: `${tableId}-w`, table_id: tableId, position: "west",  x: centerX - chairDistance, y: centerY, size: chairSize }
    ]
  }
}

// Floorplan pixel size (match your 1294x1300 JPG)
const roomWidth = 1294
const roomHeight = 1300

// Scale table/seat sizes relative to image for sensible defaults
const base = Math.min(roomWidth, roomHeight)
const tableRadius = Math.round(base * 0.06)      // ~6% of min dimension
const chairSize = Math.round(base * 0.035)       // ~3.5% of min dimension
const chairPadding = Math.round(base * 0.03)
const spacing = Math.round(base * 0.17)          // offset from center

// Position four tables in a 2x2 around the image center
const centerX = roomWidth / 2
const centerY = roomHeight / 2
const table1 = createTableWithChairs("table_1", centerX - spacing, centerY - spacing, tableRadius, chairSize, chairPadding) // top-left
const table2 = createTableWithChairs("table_2", centerX + spacing, centerY - spacing, tableRadius, chairSize, chairPadding) // top-right
const table3 = createTableWithChairs("table_3", centerX - spacing, centerY + spacing, tableRadius, chairSize, chairPadding) // bottom-left
const table4 = createTableWithChairs("table_4", centerX + spacing, centerY + spacing, tableRadius, chairSize, chairPadding) // bottom-right

// Room geometry sized to the floorplan image
export const defaultRoom = {
  room_id: "default-room",
  name: "Demo Room",
  size: { w: roomWidth, h: roomHeight },
  tables: [table1.table, table2.table, table3.table, table4.table],
  seats: [
    ...table1.chairs,
    ...table2.chairs,
    ...table3.chairs,
    ...table4.chairs
  ]
}

// Mock occupancy data for visualization - 4 tables with varied statuses
export const mockOccupancyData = {
  tables: {
    "table_1": { status: "occupied", confidence: 0.85 },
    "table_2": { status: "free",      confidence: 0.92 },
    "table_3": { status: "occupied",  confidence: 0.78 },
    "table_4": { status: "free",      confidence: 0.88 }
  },
  seats: {}
}

