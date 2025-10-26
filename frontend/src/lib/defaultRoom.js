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

// Table size
const tableRadius = 10  // pixels
const chairSize = 6     // pixels (not visible but kept for data structure)
const chairPadding = 5  // pixels

// Position 16 tables using direct pixel coordinates (X, Y)
// Column 1 (left)
const table1 = createTableWithChairs("table_1", 143, 468, tableRadius, chairSize, chairPadding)
const table2 = createTableWithChairs("table_2", 143, 601, tableRadius, chairSize, chairPadding)
const table3 = createTableWithChairs("table_3", 143, 735, tableRadius, chairSize, chairPadding)
const table4 = createTableWithChairs("table_4", 147, 835, tableRadius, chairSize, chairPadding)

// Column 2
const table5 = createTableWithChairs("table_5", 145, 358, tableRadius, chairSize, chairPadding)
const table6 = createTableWithChairs("table_6", 145, 310, tableRadius, chairSize, chairPadding)
const table7 = createTableWithChairs("table_7", 147, 888, tableRadius, chairSize, chairPadding)
const table8 = createTableWithChairs("table_8", 73, 963, tableRadius, chairSize, chairPadding)

// Column 3
const table9 = createTableWithChairs("table_9", 73, 1155, tableRadius, chairSize, chairPadding)
const table10 = createTableWithChairs("table_10", 146, 205, tableRadius, chairSize, chairPadding)
const table11 = createTableWithChairs("table_11", 487, 1241, tableRadius, chairSize, chairPadding)
const table12 = createTableWithChairs("table_12", 538, 1241, tableRadius, chairSize, chairPadding)

// Column 4 (right)
const table13 = createTableWithChairs("table_13", 664, 1241, tableRadius, chairSize, chairPadding)
const table14 = createTableWithChairs("table_14", 714, 1241, tableRadius, chairSize, chairPadding)
const table15 = createTableWithChairs("table_15", 825, 1241, tableRadius, chairSize, chairPadding)
const table16 = createTableWithChairs("table_16", 876, 1241, tableRadius, chairSize, chairPadding)

// Additional tables (17-22)
const table17 = createTableWithChairs("table_17", 669, 450, tableRadius, chairSize, chairPadding)
const table18 = createTableWithChairs("table_18", 664, 530, tableRadius, chairSize, chairPadding)
const table19 = createTableWithChairs("table_19", 664, 610, tableRadius, chairSize, chairPadding)
const table20 = createTableWithChairs("table_20", 655, 705, tableRadius, chairSize, chairPadding)
const table21 = createTableWithChairs("table_21", 680, 747, tableRadius, chairSize, chairPadding)
const table22 = createTableWithChairs("table_22", 671, 836, tableRadius, chairSize, chairPadding)

// Room geometry sized to the floorplan image
export const defaultRoom = {
  room_id: "default-room",
  name: "Demo Room",
  size: { w: roomWidth, h: roomHeight },
  tables: [
    table1.table, table2.table, table3.table, table4.table,
    table5.table, table6.table, table7.table, table8.table,
    table9.table, table10.table, table11.table, table12.table,
    table13.table, table14.table, table15.table, table16.table,
    table17.table, table18.table, table19.table, table20.table,
    table21.table, table22.table
  ],
  seats: [
    ...table1.chairs, ...table2.chairs, ...table3.chairs, ...table4.chairs,
    ...table5.chairs, ...table6.chairs, ...table7.chairs, ...table8.chairs,
    ...table9.chairs, ...table10.chairs, ...table11.chairs, ...table12.chairs,
    ...table13.chairs, ...table14.chairs, ...table15.chairs, ...table16.chairs,
    ...table17.chairs, ...table18.chairs, ...table19.chairs, ...table20.chairs,
    ...table21.chairs, ...table22.chairs
  ]
}

// Mock occupancy data for visualization - 22 tables with varied statuses
export const mockOccupancyData = {
  tables: {
    "table_1": { status: "occupied", confidence: 0.85 },
    "table_2": { status: "free", confidence: 0.92 },
    "table_3": { status: "occupied", confidence: 0.78 },
    "table_4": { status: "free", confidence: 0.88 },
    "table_5": { status: "free", confidence: 0.91 },
    "table_6": { status: "occupied", confidence: 0.83 },
    "table_7": { status: "free", confidence: 0.89 },
    "table_8": { status: "occupied", confidence: 0.76 },
    "table_9": { status: "occupied", confidence: 0.82 },
    "table_10": { status: "free", confidence: 0.94 },
    "table_11": { status: "occupied", confidence: 0.79 },
    "table_12": { status: "free", confidence: 0.90 },
    "table_13": { status: "free", confidence: 0.93 },
    "table_14": { status: "occupied", confidence: 0.81 },
    "table_15": { status: "free", confidence: 0.87 },
    "table_16": { status: "occupied", confidence: 0.84 },
    "table_17": { status: "free", confidence: 0.86 },
    "table_18": { status: "occupied", confidence: 0.80 },
    "table_19": { status: "free", confidence: 0.95 },
    "table_20": { status: "occupied", confidence: 0.77 },
    "table_21": { status: "free", confidence: 0.91 },
    "table_22": { status: "occupied", confidence: 0.83 }
  },
  seats: {}
}

