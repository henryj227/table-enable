import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from shapely.geometry import Point, Polygon
import cv2
import numpy as np
from ultralytics import YOLO



# =========================
# CONFIG
# =========================

# base directories (backend/ and frontend/)
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_PUBLIC_DIR = BASE_DIR.parent / "frontend" / "public"

ZONES_FILE = BASE_DIR / "zones.json" # backend saved zones
OUTPUT_FILE = FRONTEND_PUBLIC_DIR / "occupancy.json" # frontend read occupancy info

MODEL_NAME = "yolov8s.pt"
CAM_INDEX = 1                 # default webcam (use --camera to override)
FRAME_WIDTH = 1280           # try 1280x720; adjust if needed
FRAME_HEIGHT = 720

# time thresholds (seconds) to activate occupied / unoccupied
OCCUPIED_THRESHOLD = 5.0
UNOCCUPIED_THRESHOLD = 3.0

# COCO item classes to detect occupancy
ALLOWED_CLASSES = {"person", "backpack", "handbag", "laptop", "cell phone", "book", "bottle", "cup"}



# =========================
# HELPERS
# =========================

def current_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # returns current timestamp as string

def now_seconds():
    return datetime.now().timestamp()
    # returns current timestamp as float

def point_in_polygon(point, polygon):
    point = Point(point)
    polygon = Polygon(polygon)
    return polygon.contains(point)
    # returns True/False for point in polygon
    # used later for if detected object is in zone

def draw_zones(image, zones, active_zone=None):
    # draw all saved zones from file and currently active (being drawn) zone
    for z in zones:
        points = np.array(z["points"], np.int32)
        cv2.polylines(image, [points], isClosed=True, color=(255, 0, 0), thickness=2)
        cv2.putText(image, z["id"], tuple(points[0]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,0), 2)

    # active zone (being drawn)
    if active_zone and len(active_zone) > 0:
        points = np.array(active_zone, np.int32)
        cv2.polylines(image, [points], isClosed=True, color=(0, 255, 0), thickness=2)
        for p in active_zone:
            cv2.circle(image, tuple(p), radius=5, color=(0, 255, 0), thickness=-1)


def save_zones(zones, image_w, image_h, camera_id, output_file=ZONES_FILE):
    payload = {
        "camera_id": camera_id,
        "image_size": {"width": image_w, "height": image_h},
        "zones": zones,
        "timestamp": current_timestamp()
    }
    output_file.write_text(json.dumps(payload, indent=2))
    print(f"Saved {len(zones)} zones from camera {camera_id} to {output_file}")
    # saves annotated zones to file

def build_zone_mask(image_h, image_w, zones):
    mask = np.zeros((image_h, image_w), np.uint8)
    for z in zones:
        points = np.array(z["points"], np.int32)
        cv2.fillPoly(mask, [points], 255)
    return mask
    # returns a black / white mask to force detection only on zones

def load_zones(input_file = ZONES_FILE):
    data = json.loads(input_file.read_text())
    return data["zones"], data.get("image_size"), data.get("camera_id")
    # loads zones from file

def coco_names_from_model(model):
    names = getattr(model, "names", None)
    return names
    # returns COCO class names from model as dict: {class_id: name}



# =========================
# ANNOTATION MODE
# =========================

def open_camera(index: int):
    capture = None
    if os.name == 'nt': # if Windows OS, use DSHOW backend first
        try:
            capture = cv2.VideoCapture(index, cv2.CAP_DSHOW)
            if capture is not None and capture.isOpened():
                return capture
            if capture is not None:
                capture.release()
        except Exception:
            pass
    # fallback to default backend (takes FOREVER :sob:)
    capture = cv2.VideoCapture(index)
    return capture


def annotate(camera_index: int = CAM_INDEX):
    capture = open_camera(camera_index)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    zones = []
    active_points = []
    zone_counter = 1

    print("----------------------------------------")
    print("")
    print("Annotation controls:")
    print("   - Left click: add point to current polygon")
    print("   - n       : finish current polygon (creating new zone)")
    print("   - u       : undo last point")
    print("   - s       : save zones to zones.json")
    print("   - q       : exit)")
    print("-----------------------------------------")

    def on_mouse(event, x, y, flags, param):
        nonlocal active_points
        if event == cv2.EVENT_LBUTTONDOWN:
            active_points.append((x, y))

    cv2.namedWindow("Annotate Tables") # create window
    cv2.setMouseCallback("Annotate Tables", on_mouse) # set mouse to window

    while True:
        opencvstatus, frame = capture.read() # read frame from camera
        if opencvstatus == False: # if unable to read frame, exit
            break

        draw_zones(frame, zones, active_points) # draw zones

        cv2.imshow("Annotate Tables", frame) # updates window with frame (live feed)

        key = cv2.waitKey(10) & 0xFF # wait for key press (10ms), masked to 8 bits

        if key == ord('n'): # finish current polygon
            if len(active_points) >= 3:
                zones.append({
                    "id": f"zone_{zone_counter}",
                    "points": active_points.copy()
                })
                zone_counter += 1
                active_points = []
                print(f"Added zone zone_{zone_counter-1}")
            else:
                print("Need at least 3 points to make a polygon.")
        elif key == ord('u'): # undo last point
            if active_points:
                active_points.pop()
        elif key == ord('s'): # save zones to file
            h = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            w = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            save_zones(zones, w, h, 1, ZONES_FILE)
        elif key == ord('q'): # quit
            break

    capture.release() 
    cv2.destroyAllWindows()


# =========================
# Run Mode (Detection)
# =========================
def run_detection(conf_thres=0.30, iou_thres=0.45, camera_index: int = CAM_INDEX):
    if not ZONES_FILE.exists():
        raise FileNotFoundError("zones.json not found. Run annotate mode first.")

    zones, img_meta, camera_id = load_zones(ZONES_FILE)
    model = YOLO(MODEL_NAME)
    class_map = coco_names_from_model(model)

    # choose allowed classes (filter)
    ALLOWED_CLASSES = {
        "person", "backpack", "handbag", "laptop",
        "bottle", "cup", "book", "cell phone", "suitcase"
    }

    # Open camera consistently with annotate() for better Windows support
    capture = open_camera(camera_index)
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    # Build static ROI mask
    ret, test_frame = capture.read()
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

    zone_mask = build_zone_mask(H, W, zones_scaled)

    # Time-based occupancy tracking
    zone_tracking = {}
    for z in zones_scaled:
        zone_tracking[z["id"]] = {
            "currently_detected": False,      # Current frame detection state
            "first_detected_time": None,      # When detection first started
            "last_detected_time": None,       # When detection was last seen
            "stable_occupied": False,        # Final stable state
            "last_state_change": current_timestamp()  # When state last changed (string for metadata)
        }

    last_write = 0.0
    write_interval = 0.5
    # Ensure output directory exists
    try:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    while True:
        ok, frame = capture.read()
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

        # use monotonic seconds for all arithmetic
        current_time = now_seconds()
        
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
                    tracking["last_state_change"] = current_timestamp()
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
                            tracking["last_state_change"] = current_timestamp()
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
        t = now_seconds()
        if t - last_write >= write_interval:
            payload = {
                "room_id": "lib_1",
                "updated_at": current_timestamp(),
                "zones": zone_stats
            }
            OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
            last_write = t

        key = cv2.waitKey(1) & 0xFF
        if key == ord('w'):
            payload = {
                "updated_at": current_timestamp(),
                "zones": zone_stats
            }
            OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
            print(f"Wrote {OUTPUT_FILE}")
        elif key == ord('q'):
            break

    capture.release()
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
