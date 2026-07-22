import io
import sqlite3
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
import os
import numpy as np
import cv2

# --- 1. NEW IMPORTS for Grad-CAM and Static Files ---
from fastapi.staticfiles import StaticFiles
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image

# ... after all imports ...

# --- NEW: X-Ray Validation Helper Function ---
def is_valid_xray(image_bytes: bytes) -> bool:
    """
    Validates that an uploaded image is likely a grayscale chest X-ray.
    Chest X-rays have very low color saturation (<12).
    Returns True if valid, False if it appears to be a color photo.
    """
    try:
        # Decode image to numpy array
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            return False  # Could not decode image
        
        # Convert BGR (OpenCV default) to HSV color space
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Split channels and calculate mean saturation (S channel)
        _, s_channel, _ = cv2.split(hsv)
        mean_saturation = np.mean(s_channel)
        
        # Grayscale X-rays have very low saturation
        # Threshold of 12.0 filters out most color photos
        return mean_saturation < 12.0
    
    except Exception as e:
        print(f"Error validating X-ray: {e}")
        return False
# -------------------------------
# App setup
# -------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows Vercel frontend to talk to Azure API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)


# --- 2. MOUNT STATIC DIRECTORY ---
# This makes the 'static' folder accessible via URL (e.g. /static/image.jpg)
app.mount("/static", StaticFiles(directory="static"), name="static")

# -------------------------------
# Database and Model Globals
# -------------------------------
DB_NAME = "medical_history.db"
model = None
device = None
transform = None

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.on_event("startup")
async def startup_event():
    global model, device, transform

    # --- 3. CREATE STATIC DIRECTORY ON STARTUP ---
    os.makedirs("static", exist_ok=True)
    print("✅ Static directory ensured.")

    # Initialize SQLite Database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            patient_gender TEXT,
            patient_dob TEXT,
            scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            prediction TEXT,
            normal_score REAL,
            bacterial_score REAL,
            viral_score REAL
        )
    """)
    conn.commit()
    conn.close()
    print("✅ Database initialized.")

    # Load PyTorch Model
    device = torch.device("cpu")
    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    
    state_dict = torch.load("pneumonia_model.pth", map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    print("✅ Model loaded successfully on CPU.")

    # Define transforms
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

# -------------------------------
# POST /predict endpoint (Updated with Grad-CAM)
# -------------------------------
@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    patient_name: str = Form(...),
    patient_id: str = Form(...),
    patient_gender: str = Form(...), # NEW
    patient_dob: str = Form(...)     # NEW
):
    contents = await file.read()

    # --- NEW: Validate that the image is a chest X-ray (grayscale) ---
    if not is_valid_xray(contents):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a chest X-ray image only."
        )
    image = Image.open(io.BytesIO(contents)).convert("RGB")

   # ==========================================================
    # --- Strict Duplicate Patient ID Lockdown ---
    # ==========================================================
    # Allow multiple scans for the SAME person, but block if someone else tries to use the ID
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT patient_name FROM scans WHERE patient_id = ?",
        (patient_id,)
    ).fetchone()
    conn.close()

    if existing is not None:
        stored_name = existing["patient_name"]
        # If the typing name doesn't match the historical name in the database, lock it down
        if patient_name.strip().lower() != stored_name.strip().lower():
            raise HTTPException(
                status_code=400,
                detail="Patient ID already assigned to a different patient name."
            )
    # ████████████████████████████████████████████████
    
    # Preprocess image for the model
    input_tensor = transform(image).unsqueeze(0).to(device)

    

    # --- 4. GRAD-CAM: PREPARE VISUALIZATION & TARGETS ---
    # Prepare image for visualization (un-normalized, resized, 0-1 float)
    vis_transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor()])
    vis_tensor = vis_transform(image)
    rgb_img_float = vis_tensor.permute(1, 2, 0).numpy() # H, W, C

    # Target layer for Grad-CAM
    target_layer = [model.layer4[-1]]
    
    # Inference
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
    
    # Determine the winning class index for the heatmap
    target_category_idx = torch.argmax(probabilities).item()
    targets_for_cam = [ClassifierOutputTarget(target_category_idx)]

    # --- 5. GRAD-CAM: COMPUTE AND SAVE HEATMAP ---
    cam = GradCAM(model=model, target_layers=target_layer)
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets_for_cam)
    grayscale_cam = grayscale_cam[0, :] # Take the first (and only) one

    # Overlay heatmap on the image
    cam_image = show_cam_on_image(rgb_img_float, grayscale_cam, use_rgb=True)

    # Save the heatmap image to the static folder
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    heatmap_filename = f"cam_{patient_id}_{timestamp}.jpg"
    heatmap_path = os.path.join("static", heatmap_filename)
    Image.fromarray(cam_image).save(heatmap_path)

    # Create the public URL for the heatmap
        # Create the public URL for the heatmap
    heatmap_url = f"/static/{heatmap_filename}"

    # --- CORRECTED: Dynamic probability extraction & label mapping ---
    # probabilities already computed above via torch.softmax (sums to 100%)
    normal_conf = round(probabilities[0].item() * 100, 2)
    pneumonia_conf = round(probabilities[1].item() * 100, 2)

    # Map argmax index to correct string (binary model: 0=Normal, 1=Pneumonia)
    predicted_idx = torch.argmax(probabilities).item()
    prediction_label = "Normal" if predicted_idx == 0 else "Pneumonia"

    # Even split of pneumonia confidence for frontend 3-class format
    bacterial_conf = round(pneumonia_conf / 2, 2)
    viral_conf = round(pneumonia_conf / 2, 2)
    
    # Save to Database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO scans (patient_name, patient_id,patient_gender, patient_dob, prediction, normal_score, bacterial_score, viral_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (patient_name, patient_id, patient_gender, patient_dob,prediction_label, normal_conf, bacterial_conf, viral_conf)
    )
    conn.commit()
    scan_id = cursor.lastrowid
    cursor.execute("SELECT scan_date FROM scans WHERE id = ?", (scan_id,))
    scan_date = cursor.fetchone()["scan_date"]
    conn.close()

    # --- 6. ADD HEATMAP URL TO FINAL JSON RESPONSE ---
    return {
        "scan_id": scan_id,
        "scan_date": scan_date,
        "patient_name": patient_name,
        "patient_id": patient_id,
        "patient_gender": patient_gender,
        "patient_dob": patient_dob,
        "prediction": prediction_label,
        "Normal": normal_conf,
        "Bacterial Pneumonia": bacterial_conf,
        "Viral Pneumonia": viral_conf,
        "heatmap_url": heatmap_url,  # New key with the image URL
        "_note": "Model was trained on a 2‑class dataset (Normal vs Pneumonia). Bacterial/Viral split is estimated.",
    }

# -------------------------------
# GET /history/{patient_id} endpoint (Unchanged)
# -------------------------------
@app.get("/history/{patient_id}")
async def get_patient_history(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, patient_name, patient_id, scan_date, prediction, normal_score, bacterial_score, viral_score FROM scans WHERE patient_id = ? ORDER BY scan_date DESC",
        (patient_id,)
    )
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No scan history found for patient ID: {patient_id}")

    history = [dict(row) for row in rows]

    return {
        "patient_id": patient_id,
        "total_scans": len(history),
        "scan_history": history
    }