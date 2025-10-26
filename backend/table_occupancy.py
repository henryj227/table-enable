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
        center = polygon_center_calculation(points)
        cv2.putText(image, z["id"], tuple(center), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,0,0), 2)

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

def build_zone_mask(width, height, zones):
    mask = np.zeros((height, width), np.uint8) #mask w/ shape height, width
    for z in zones:
        points = np.array(z["points"], np.int32)
        cv2.fillPoly(mask, [points], 255)
    return mask
    # returns a black / white mask to force detection only on zones

def polygon_center_calculation(polygon_points):
    points = np.asarray(polygon_points, dtype=float)
    poly = Polygon(points)
    return int(poly.centroid.x), int(poly.centroid.y) #Shapely center calculation on polygon
    # calculates center of polygon

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
        fps_text = f"'q' to quit"
        cv2.putText(frame, fps_text, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
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
# DETECTION MODE
# =========================

def run_detection(confidence_threshold=0.30, iou_threshold=0.45, camera_index: int = CAM_INDEX):
    if not ZONES_FILE.exists():
        raise FileNotFoundError("zones.json not found. Run annotate mode first.")

    zones, img_meta, camera_id = load_zones(ZONES_FILE)
    model = YOLO(MODEL_NAME)
    class_map = coco_names_from_model(model) #classification names

    capture = open_camera(camera_index) 
    capture.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    capture.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

    opencvstatus, test_frame = capture.read() # read frame from camera
    if not opencvstatus:
        raise RuntimeError("Cannot read from webcam.")

    zone_mask = build_zone_mask(FRAME_WIDTH, FRAME_HEIGHT, zones)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # initialize time-based zone tracking dict
    zone_tracking = {}
    for z in zones:
        zone_tracking[z["id"]] = {
        "currently_detected": False,      # current detection state
        "first_detected_time": None,      # first detection time
        "last_detected_time": None,       # last detection time
        "stable_occupied": False,         # stabilized occupied state
        "last_state_change": current_timestamp()
    }

    while True:
        opencvstatus, frame = capture.read() # read frame from camera
        if not opencvstatus: # if unable to read frame, exit
            break

        masked_image = cv2.bitwise_and(frame, frame, mask=zone_mask) #apply mask

        allowed_class_ids = [] #filter to only allowed classes
        for class_id, class_name in class_map.items():
            if class_name in ALLOWED_CLASSES:
                allowed_class_ids.append(class_id)

        # run YOLO on masked image
        results    = model.predict(
        source     = masked_image,
        conf = confidence_threshold,
        iou        = iou_threshold, #non maximum suppression IoU threshold (greatest conf kept)
        imgsz      = 960,
        classes    = allowed_class_ids,
        verbose    = False
        )
        
        for zone_id in zone_tracking: # reset current detection state
            zone_tracking[zone_id]["currently_detected"] = False

        zone_stats = []
        for z in zones:
            zone_stats.append({
                "id"          : z["id"],
                "person_count": 0,
                "item_counts" : {k: 0 for k in sorted(ALLOWED_CLASSES - {"person"})},
                "occupied"    : False
            })

        # process detections by checking if boxes' centers are in zones
        if results and len(results) > 0: 
            r = results[0]
            if r.boxes is not None and len(r.boxes) > 0:
                boxes = r.boxes.xyxy.cpu().numpy().astype(int)      # pixel coords
                class_ids = r.boxes.cls.cpu().numpy().astype(int)   # class IDs
                confs = r.boxes.conf.cpu().numpy()                  # confidences

                for (x1,y1,x2,y2), class_id, conf in zip(boxes, class_ids, confs): #for each detection
                    class_name = class_map.get(class_id, str(class_id)) #get class name
                    if class_name not in ALLOWED_CLASSES:
                        continue 

                    # draw detection bbox with label and confidence
                    label = f"{class_name} {conf:.2f}"
                    (tw, th), bl = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1) #label background
                    y_text = max(0, y1 - 8)
                    y_bg_top = max(0, y_text - th - 4)
                    cv2.rectangle(frame, (x1, y_bg_top), (x1 + tw + 2, y_text + 2), (0, 0, 0), -1)
                    cv2.putText(frame, label, (x1 + 1, y_text), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1, cv2.LINE_AA)

                    #calculate center of detected box
                    center_x = int((x1 + x2) / 2)
                    center_y = int((y1 + y2) / 2)

                    for idx, z in enumerate(zones): 
                        if point_in_polygon((center_x, center_y), z["points"]):
                            zone_tracking[z["id"]]["currently_detected"] = True
                            if class_name == "person":
                                zone_stats[idx]["person_count"] += 1
                            else:
                                zone_stats[idx]["item_counts"][class_name] += 1
                            break


        last_write = 0.0
        write_interval = 0.5
        current_time = now_seconds()

        # update zone states based on detection timing
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
        for zs, z in zip(zone_stats, zones):
            points = np.array(z["points"], dtype=np.int32)
            tracking = zone_tracking[zs["id"]]
            
            #Green=occupied, Red=unoccupied, Yellow=detecting but not yet occupied
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
            
            cv2.polylines(frame, [points], isClosed=True, color=color, thickness=2)
            center = polygon_center_calculation(points)
            if center is not None:
                cx, cy = center

                # Main status label
                cv2.putText(frame, status_text, (cx-50, cy-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2, cv2.LINE_AA)

                # Detection counts
                count_label = f'Persons = {zs["person_count"]} Items = {sum(zs["item_counts"].values())}'
                cv2.putText(frame, count_label, (cx-50, cy+15),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)

        fps_text = f"'q' to quit"
        cv2.putText(frame, fps_text, (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,255,255), 2)
        cv2.imshow("Table Occupancy", frame) # updates window with frame (live feed)

        # write to JSON
        t = now_seconds()
        if t - last_write >= write_interval:
            payload = {
                "room_id": f"camera_{camera_id}",
                "updated_at": now_seconds(),
                "zones": zone_stats
            }
            OUTPUT_FILE.write_text(json.dumps(payload, indent=2))
            last_write = t

        key = cv2.waitKey(10) & 0xFF 
        if key == ord('q'):
            break

    capture.release()
    cv2.destroyAllWindows()


# =========================
# MAIN
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
        run_detection(confidence_threshold=args.conf, iou_threshold=args.iou, camera_index=cam_idx)
