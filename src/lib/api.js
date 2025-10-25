
export async function getOccupancy(roomId) {
    const url = `/mock/occupancy.json`
  
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const raw = await res.json();
  
    if (!raw || raw.room_id !== roomId || !Array.isArray(raw.tables)) {
      throw new Error("Bad occupancy payload");
    }
  
    const transformed = {
      roomId: raw.room_id,
      updatedAt: new Date(raw.updated_at * 1000),
      tableIds: raw.tables.map(t => t.id),
      tablesById: Object.fromEntries(
        raw.tables.map(t => [t.id, { occupied: t.occupied, conf: t.conf }])
      ),
    };
  
    return transformed;
  }
  
