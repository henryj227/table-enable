// create table at pixel coordinates
const level2Image = '/level2.jpg';

function createTable(tableId, centerX, centerY, radius = 80) {
  return {
    id: tableId,
    type: "circle",
    center: [centerX, centerY],
    radius
  }
}

export const building = "245 Beacon St."
// floorplan image size (px)
const roomWidth = 1294
const roomHeight = 1300

const tableRadius = 10  // pixels

// Position 16 tables using direct pixel coordinates (X, Y)
//west column
const table1 = createTable("table_1", 146, 205, tableRadius)
const table2 = createTable("table_2", 145, 310, tableRadius)
const table3 = createTable("table_3", 145, 358, tableRadius)
const table4 = createTable("table_4", 143, 468, tableRadius)
const table5 = createTable("table_5", 143, 601, tableRadius)
const table6 = createTable("table_6", 143, 735, tableRadius)
const table7 = createTable("table_7", 147, 835, tableRadius)
const table8 = createTable("table_8", 147, 888, tableRadius)
const table9 = createTable("table_9", 73, 963, tableRadius)
const table10 = createTable("table_10", 73, 1155, tableRadius)

//north row
const table11 = createTable("table_11", 487, 1241, tableRadius)
const table12 = createTable("table_12", 538, 1241, tableRadius)
const table13 = createTable("table_13", 664, 1241, tableRadius)
const table14 = createTable("table_14", 714, 1241, tableRadius)
const table15 = createTable("table_15", 825, 1241, tableRadius)
const table16 = createTable("table_16", 876, 1241, tableRadius)

//east column
const table17 = createTable("table_17", 669, 450, tableRadius)
const table18 = createTable("table_18", 664, 530, tableRadius)
const table19 = createTable("table_19", 664, 610, tableRadius)
const table20 = createTable("table_20", 655, 705, tableRadius)
const table21 = createTable("table_21", 680, 747, tableRadius)

// Room geometry sized to the floorplan image
export const defaultRoom = {
  building_id: building,
  name: "Level 2",
  floorplan: level2Image,
  size: { w: roomWidth, h: roomHeight },
  tables: [
    table1, table2, table3, table4,
    table5, table6, table7, table8,
    table9, table10, table11, table12,
    table13, table14, table15, table16,
    table17, table18, table19, table20,
    table21
  ]
}

// mock data
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
  }
}
