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

# -------------------------------
# App setup
# -------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],   # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# Database Setup
# -------------------------------
DB_NAME = "medical_history.db"

def get_db_connection():
    """Create a new database connection with row factory for dict-like access."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

@app.on_event("startup")
async def startup_event():
    # 1. Initialize SQLite Database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_name TEXT NOT NULL,
            patient_id TEXT NOT NULL,
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

    # 2. Load PyTorch Model (existing logic)
    global model, device, transform
    device = torch.device("cpu")
    model = models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)  # Binary: Normal vs Pneumonia
    
    state_dict = torch.load("pneumonia_model.pth", map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    print("✅ Model loaded successfully on CPU.")

# -------------------------------
# Image preprocessing (kept consistent)
# -------------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# -------------------------------
# POST /predict endpoint (Updated)
# -------------------------------
@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    patient_name: str = Form(...),
    patient_id: str = Form(...)
):
    # 1. Read and preprocess image
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    input_tensor = transform(image).unsqueeze(0).to(device)

    # 2. Inference
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    # 3. Calculate scores (simulate 3-class output from 2-class model)
    normal_conf = round(probabilities[0].item() * 100, 2)
    pneumonia_conf = round(probabilities[1].item() * 100, 2)
    bacterial_conf = round(pneumonia_conf / 2, 2)
    viral_conf = round(pneumonia_conf / 2, 2)

    # Determine primary prediction label
    if normal_conf >= bacterial_conf and normal_conf >= viral_conf:
        prediction_label = "Normal"
    elif bacterial_conf >= viral_conf:
        prediction_label = "Bacterial Pneumonia"
    else:
        prediction_label = "Viral Pneumonia"

    # 4. Save to Database
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scans (patient_name, patient_id, prediction, normal_score, bacterial_score, viral_score)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (patient_name, patient_id, prediction_label, normal_conf, bacterial_conf, viral_conf))
    conn.commit()
    
    # Retrieve the auto-generated ID and timestamp for the response
    scan_id = cursor.lastrowid
    cursor.execute("SELECT scan_date FROM scans WHERE id = ?", (scan_id,))
    scan_date = cursor.fetchone()["scan_date"]
    conn.close()

    # 5. Return JSON response
    return {
        "scan_id": scan_id,
        "scan_date": scan_date,
        "patient_name": patient_name,
        "patient_id": patient_id,
        "prediction": prediction_label,
        "Normal": normal_conf,
        "Bacterial Pneumonia": bacterial_conf,
        "Viral Pneumonia": viral_conf,
        "_note": (
            "Model was trained on a 2‑class dataset (Normal vs Pneumonia). "
            "Bacterial/Viral split is estimated. Retrain on a 3‑class dataset "
            "for true subtype discrimination."
        ),
    }

# -------------------------------
# NEW: GET /history/{patient_id} endpoint
# -------------------------------
@app.get("/history/{patient_id}")
async def get_patient_history(patient_id: str):
    """
    Retrieve all scan history for a specific patient, sorted newest to oldest.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, patient_name, patient_id, scan_date, prediction, 
               normal_score, bacterial_score, viral_score
        FROM scans 
        WHERE patient_id = ? 
        ORDER BY scan_date DESC
    """, (patient_id,))
    
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail=f"No scan history found for patient ID: {patient_id}")

    # Convert rows to list of dictionaries
    history = []
    for row in rows:
        history.append({
            "scan_id": row["id"],
            "patient_name": row["patient_name"],
            "patient_id": row["patient_id"],
            "scan_date": row["scan_date"],
            "prediction": row["prediction"],
            "normal_score": row["normal_score"],
            "bacterial_score": row["bacterial_score"],
            "viral_score": row["viral_score"]
        })

    return {
        "patient_id": patient_id,
        "total_scans": len(history),
        "scan_history": history
    }