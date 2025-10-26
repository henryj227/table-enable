// Helper function to create a table with chairs at a given position
function createTableWithChairs(tableId, centerX, centerY, radius = 80, chairSize = 40) {
  const chairDistance = radius + 40; // Distance from center to chair
  
  return {
    table: {
      id: tableId,
      type: "circle",
      center: [centerX, centerY],
      radius: radius
    },
    chairs: [
      { id: `${tableId}-n`, table_id: tableId, position: "north", x: centerX, y: centerY - chairDistance, size: chairSize },
      { id: `${tableId}-s`, table_id: tableId, position: "south", x: centerX, y: centerY + chairDistance, size: chairSize },
      { id: `${tableId}-e`, table_id: tableId, position: "east", x: centerX + chairDistance, y: centerY, size: chairSize },
      { id: `${tableId}-w`, table_id: tableId, position: "west", x: centerX - chairDistance, y: centerY, size: chairSize }
    ]
  };
}

// Grid square size - make it MUCH bigger to break Leaflet limits and make tiny tables visible
const gridSquareSize = 1200; // 3x bigger than 400 to accommodate tiny tables

// Create 4 LARGE tables in a 2x2 grid layout CENTERED in grid section 1
// Grid section 1 is from (0,0) to (gridSquareSize, gridSquareSize) = 1200x1200
// Center of section 1 is at (600, 600)
const tableRadius = 120; // Large radius to fill space
const tableSpacing = 225; // Distance from center to each table (half-diagonal spacing)

// Position tables symmetrically around the center (600, 600)
const centerX = gridSquareSize / 2; // 600
const centerY = gridSquareSize / 2; // 600

const table1 = createTableWithChairs("table_1", centerX - tableSpacing, centerY - tableSpacing, tableRadius, 50); // top-left
const table2 = createTableWithChairs("table_2", centerX + tableSpacing, centerY - tableSpacing, tableRadius, 50); // top-right
const table3 = createTableWithChairs("table_3", centerX - tableSpacing, centerY + tableSpacing, tableRadius, 50); // bottom-left
const table4 = createTableWithChairs("table_4", centerX + tableSpacing, centerY + tableSpacing, tableRadius, 50); // bottom-right

// Room geometry with 4 tables - 4 cols × 4 rows grid (added sections 9 and 10)
export const defaultRoom = {
  room_id: "default-room",
  name: "Demo Room",
  size: { w: gridSquareSize * 4, h: gridSquareSize * 4 }, // 4×4 grid dimensions (4800×4800)
  tables: [
    table1.table,
    table2.table,
    table3.table,
    table4.table
  ],
  seats: [
    ...table1.chairs,
    ...table2.chairs,
    ...table3.chairs,
    ...table4.chairs
  ]
};

// Mock occupancy data for visualization - 4 tables with varied statuses
export const mockOccupancyData = {
  tables: {
    "table_1": { status: "occupied", confidence: 0.85 },
    "table_2": { status: "free", confidence: 0.92 },
    "table_3": { status: "occupied", confidence: 0.78 },
    "table_4": { status: "free", confidence: 0.88 }
  },
  seats: {}
};
