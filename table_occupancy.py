import argparse
import json
import os
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from ultralytics import YOLO

# =========================
# Config
# =========================
ZONES_FILE = Path("zones.json")
OUTPUT_FILE = Path("occupancy.json")
MODEL_NAME = "yolov8s.pt"    # small & fast; you can upgrade to yolov8s.pt if you want better accuracy
CAM_INDEX = 0               # default webcam (use --camera to override)
FRAME_WIDTH = 1280           # try 1280x720; adjust if needed
FRAME_HEIGHT = 720

# Time-based occupancy thresholds (in seconds)
OCCUPIED_THRESHOLD = 5.0    # Must detect person/object for 5 seconds to mark as occupied
UNOCCUPIED_THRESHOLD = 3.0  # Must be clear for 3 seconds to mark as unoccupied

# Classes we care about (COCO names)
ITEM_CLASSES = {
    "backpack", "handbag", "suitcase",
    "laptop", "cell phone", "book",
    "bottle", "cup", "umbrella"
}
PERSON_CLASS = "person"
ALLOWED_CLASSES = {"person", "backpack", "handbag", "laptop", "bottle", "cup"}


# =========================
# Helpers
# =========================
def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def point_in_polygon(pt, polygon):
    cnt = np.asarray(polygon, dtype=np.int32)
    # Ensure (N,1,2) for OpenCV
    if cnt.ndim == 2 and cnt.shape[1] == 2:
        cnt = cnt.reshape((-1, 1, 2))
    elif cnt.ndim != 3 or cnt.shape[1:] != (1, 2):
        cnt = cnt.reshape((-1, 1, 2))
    return cv2.pointPolygonTest(cnt, pt, False) >= 0
    

def draw_zones(frame, zones, active_zone=None):
    """Draw saved zones and the currently-being-drawn zone."""
    # Saved zones
    for z in zones:
        pts = np.array(z["points"], dtype=np.int32)
        cv2.polylines(frame, [pts], isClosed=True, color=(0, 255, 255), thickness=2)
        # label near centroid
        M = cv2.moments(pts)
        if M["m00"] != 0:
            cx, cy = int(M["m10"]/M["m00"]), int(M["m01"]/M["m00"])
            cv2.putText(frame, z["id"], (cx-20, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,255), 2, cv2.LINE_AA)

    # Active zone (while annotating)
    if active_zone and len(active_zone) > 0:
        pts = np.array(active_zone, dtype=np.int32)
        cv2.polylines(frame, [pts], isClosed=False, color=(0, 165, 255), thickness=2)
        for p in active_zone:
            cv2.circle(frame, p, 4, (0, 165, 255), -1)


def save_zones(zones, frame_w, frame_h, out_path=ZONES_FILE):
    payload = {
        "image_size": {"width": frame_w, "height": frame_h},
        "zones": zones,
        "updated_at": time.time()
    }
    out_path.write_text(json.dumps(payload, indent=2))
    print(f"Saved {len(zones)} zones to {out_path}")

def build_zone_mask(width, height, zones):
    """Return a single-channel uint8 mask with 255 inside any zone, 0 outside."""
    mask = np.zeros((height, width), dtype=np.uint8)
    for z in zones:
        pts = np.array(z["points"], dtype=np.int32)
        cv2.fillPoly(mask, [pts], 255)
    return mask


def load_zones(in_path=ZONES_FILE):
    data = json.loads(in_path.read_text())
    return data["zones"], data.get("image_size")


def coco_names_from_model(model):
    # Ultralytics models expose .names (dict: {class_id: name})
    names = getattr(model, "names", None)
    if names is None:  # older internals
        names = getattr(getattr(model, "model", None), "names", None)
    if not names:
        raise RuntimeError("Could not read class names from YOLO model.")
    return dict(names)  # ensure regular dict



# =========================
# Annotate Mode
# =========================
def _open_camera(index: int):
    """Open a camera index with a Windows-friendly backend if available."""
    cap = None
    # On Windows, DirectShow often works more reliably and faster to open
    if os.name == 'nt':
        try:
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if cap is not None and cap.isOpened():
                return cap
            if cap is not None:
                cap.release()
        except Exception:
            pass
    # Fallback to default backend
    cap = cv2.VideoCapture(index)
    return cap


def annotate(camera_index: int = CAM_INDEX):
    cap = _open_camera(camera_index)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    zones = []
    active_pts = []
    zone_counter = 1

    print("Annotation controls:")
    print("  - Left click: add point to current polygon")
    print("  - 'n'       : finish current polygon (creates a new zone)")
    print("  - 'u'       : undo last point")
    print("  - 's'       : save zones.json")
    print("  - 'q'       : quit")

    def on_mouse(event, x, y, flags, param):
        nonlocal active_pts
        if event == cv2.EVENT_LBUTTONDOWN:
            active_pts.append((x, y))

    cv2.namedWindow("Annotate Tables")
    cv2.setMouseCallback("Annotate Tables", on_mouse)

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        draw_zones(frame, zones, active_pts)
        cv2.putText(frame, f"Zone points: {len(active_pts)}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255,255,255), 2)

        cv2.imshow("Annotate Tables", frame)
        key = cv2.waitKey(10) & 0xFF

        if key == ord('n'):
            if len(active_pts) >= 3:
                zones.append({
                    "id": f"table_{zone_counter}",
                    "points": active_pts.copy()
                })
                zone_counter += 1
                active_pts = []
                print(f"Added zone table_{zone_counter-1}")
            else:
                print("Need at least 3 points to make a polygon.")
        elif key == ord('u'):
            if active_pts:
                active_pts.pop()
        elif key == ord('s'):
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            save_zones(zones, w, h, ZONES_FILE)
        elif key == ord('q'):
            break

    # save on exit if any
    if zones:
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        save_zones(zones, w, h, ZONES_FILE)

    cap.release()
    cv2.destroyAllWindows()


# =========================
# Run Mode (Detection)
# =========================
def run_detection(conf_thres=0.30, iou_thres=0.45, camera_index: int = CAM_INDEX):
    if not ZONES_FILE.exists():
        raise FileNotFoundError("zones.json not found. Run annotate mode first.")

    zones, img_meta = load_zones(ZONES_FILE)
    model = YOLO(MODEL_NAME)
    class_map = coco_names_from_model(model)

    # choose allowed classes (filter)
    ALLOWED_CLASSES = {
        "person", "backpack", "handbag", "laptop",
        "bottle", "cup", "book", "cell phone", "suitcase"
    }

    # Open camera consistently with annotate() for better Windows support
    cap = _open_camera(camera_index)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    # Build static ROI mask
    ret, test_frame = cap.read()
    if not ret:
        raise RuntimeError("Cannot read from webcam.")
    H, W = test_frame.shape[:2]

    # Scale zones to current capture size if needed
    zones_scaled = zones
    if img_meta and isinstance(img_meta, dict):
        src_w = int(img_meta.get("width", W))
        src_h = int(img_meta.get("height", H))
        if src_w != W or src_h != H:
            sx = W / max(src_w, 1)
            sy = H / max(src_h, 1)
            zones_scaled = []
            for z in zones:
                pts = [(int(round(x * sx)), int(round(y * sy))) for (x, y) in z["points"]]
                zones_scaled.append({"id": z["id"], "points": pts})

    zone_mask = build_zone_mask(W, H, zones_scaled)

    # Time-based occupancy tracking
    zone_tracking = {}
    for z in zones_scaled:
        zone_tracking[z["id"]] = {
            "currently_detected": False,      # Current frame detection state
            "first_detected_time": None,      # When detection first started
            "last_detected_time": None,       # When detection was last seen
            "stable_occupied": False,        # Final stable state
            "last_state_change": time.time()  # When state last changed
        }

    last_write = 0.0
    write_interval = 0.5

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        # mask outside zones
        masked_frame = cv2.bitwise_and(frame, frame, mask=zone_mask)

        # run YOLO only on masked area, with class filter & TTA
        results = model.predict(
        source=masked_frame,
        conf=conf_thres,
        iou=iou_thres,
        imgsz=960,
        classes=[cid for cid, name in class_map.items() if name in ALLOWED_CLASSES],
        verbose=False
        )

        current_time = time.time()
        
        # Reset detection state for all zones
        for zid in zone_tracking:
            zone_tracking[zid]["currently_detected"] = False

        zone_stats = []
        for z in zones_scaled:
            zone_stats.append({
                "id": z["id"],
                "person_count": 0,
                "item_counts": {k: 0 for k in sorted(ALLOWED_CLASSES - {"person"})},
                "occupied": False
            })

        if results and len(results) > 0:
            r = results[0]
            if r.boxes is not None and len(r.boxes) > 0:
                boxes = r.boxes.xyxy.cpu().numpy().astype(int)
                cls_ids = r.boxes.cls.cpu().numpy().astype(int)
                confs = r.boxes.conf.cpu().numpy()

                for (x1,y1,x2,y2), cid, c in zip(boxes, cls_ids, confs):
                    cls_name = class_map.get(cid, str(cid))
                    if cls_name not in ALLOWED_CLASSES:
                        continue  # skip anything else

                    cx, cy = int((x1+x2)/2), int((y1+y2)/2)

                    for idx, z in enumerate(zones_scaled):
                        if point_in_polygon((cx, cy), z["points"]):
                            zone_tracking[z["id"]]["currently_detected"] = True
                            if cls_name == "person":
                                zone_stats[idx]["person_count"] += 1
                            else:
                                zone_stats[idx]["item_counts"][cls_name] += 1

        # Time-based occupancy logic
        for zs in zone_stats:
            zid = zs["id"]
            zs["conf"] = 1.0
            tracking = zone_tracking[zid]
            
            if tracking["currently_detected"]:
                # Something is detected in this zone
                if tracking["first_detected_time"] is None:
                    # First detection - start timer
                    tracking["first_detected_time"] = current_time
                tracking["last_detected_time"] = current_time
                
                # Check if we've been detecting for long enough to mark as occupied
                detection_duration = current_time - tracking["first_detected_time"]
                if detection_duration >= OCCUPIED_THRESHOLD and not tracking["stable_occupied"]:
                    tracking["stable_occupied"] = True
                    tracking["last_state_change"] = current_time
                    print(f"Zone {zid} marked as OCCUPIED after {detection_duration:.1f}s")
            else:
                # Nothing detected in this zone
                if tracking["first_detected_time"] is not None:
                    # We were detecting something, but now it's gone
                    time_since_last_detection = current_time - tracking["last_detected_time"]
                    
                    if time_since_last_detection >= UNOCCUPIED_THRESHOLD:
                        # Been clear long enough - mark as unoccupied
                        if tracking["stable_occupied"]:
                            tracking["stable_occupied"] = False
                            tracking["last_state_change"] = current_time
                            print(f"Zone {zid} marked as UNOCCUPIED after {time_since_last_detection:.1f}s clear")
                        
                        # Reset detection tracking
                        tracking["first_detected_time"] = None
                        tracking["last_detected_time"] = None
            
            zs["occupied"] = tracking["stable_occupied"]

        # Draw zones overlay again (with status)
        for zs, z in zip(zone_stats, zones_scaled):
            pts = np.array(z["points"], dtype=np.int32)
            tracking = zone_tracking[zs["id"]]
            
            # Color coding: Green=occupied, Red=unoccupied, Yellow=detecting but not yet occupied
            if zs["occupied"]:
                color = (0, 200, 0)  # Green - occupied
                status_text = "OCCUPIED"
            elif tracking["currently_detected"]:
                color = (0, 255, 255)  # Yellow - detecting
                detection_duration = current_time - tracking["first_detected_time"] if tracking["first_detected_time"] else 0
                status_text = f"DETECTING ({detection_duration:.1f}s)"
            else:
                color = (0, 0, 200)  # Red - unoccupied
                status_text = "UNOCCUPIED"
            
            cv2.polylines(frame, [pts], isClosed=True, color=color, thickness=2)
            M = cv2.moments(pts)
            if M["m00"] != 0:
                cx, cy = int(M["m10"]/M["m00"]), int(M["m01"]/M["m00"])
                
                # Main status label
                cv2.putText(frame, status_text, (cx-50, cy-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)
                
                # Detection counts
                count_label = f'P={zs["person_count"]} Items={sum(zs["item_counts"].values())}'
                cv2.putText(frame, count_label, (cx-50, cy+15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)


        # Show
        fps_text = f"Press 'w' to write JSON, 'q' to quit"
        cv2.putText(frame, fps_text, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        cv2.imshow("Table Occupancy", frame)

        # Write JSON periodically
        t = time.time()
        if t - last_write >= write_interval:
            payload = {
                "room_id": "lib_1",
                "updated_at": time.time(),
                "zones": zone_stats
            }
            OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
            last_write = t

        key = cv2.waitKey(1) & 0xFF
        if key == ord('w'):
            payload = {
                "updated_at": time.time(),
                "zones": zone_stats
            }
            OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
            print(f"Wrote {OUTPUT_FILE}")
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


# =========================
# Main
# =========================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Table occupancy from webcam with YOLO")
    parser.add_argument("mode", choices=["annotate", "run"], help="annotate zones or run detection")
    parser.add_argument("--conf", type=float, default=0.25, help="confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45, help="NMS IoU threshold")
    parser.add_argument("--camera", type=int, default=None, help="camera index (0=default internal, 1=external, etc.)")
    args = parser.parse_args()

    cam_idx = args.camera if args.camera is not None else CAM_INDEX

    if args.mode == "annotate":
        annotate(camera_index=cam_idx)
    else:
        run_detection(conf_thres=args.conf, iou_thres=args.iou, camera_index=cam_idx)
