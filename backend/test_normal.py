import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import os

# ------ Setup ------
device = torch.device("cpu")
model = models.resnet18(weights=None)
num_ftrs = model.fc.in_features
model.fc = nn.Linear(num_ftrs, 2)
model.load_state_dict(torch.load("pneumonia_model.pth", map_location=device))
model.eval()

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

# ------ Load a known normal image ------
# Copy any "NORMAL" image from the Kaggle test set into your current folder, or provide the full path
test_normal_path = "test_normal_sample.jpeg"   # Replace with actual path to a NORMAL x-ray

if not os.path.exists(test_normal_path):
    print(f"❌ Please place a normal chest X-ray image at '{test_normal_path}'")
    exit()

image = Image.open(test_normal_path).convert("RGB")
input_tensor = transform(image).unsqueeze(0).to(device)

with torch.no_grad():
    outputs = model(input_tensor)
    probs = torch.softmax(outputs, dim=1)[0]
    print(f"Raw probabilities: Class0 (Normal): {probs[0]:.4f}, Class1 (Pneumonia): {probs[1]:.4f}")
    predicted_class = torch.argmax(probs).item()
    print(f"Predicted: {'Normal' if predicted_class == 0 else 'Pneumonia'}")