import os
from PIL import Image
import torch
import torchvision.transforms as transforms

# 1. Point to your train dataset folder
dataset_path = "./chest_xray/chest_xray/train/PNEUMONIA"

print("Checking dataset path...")
if not os.path.exists(dataset_path):
    print(f"❌ Error: Could not find the path: {dataset_path}")
    print("Please double check where you extracted the Kaggle files.")
else:
    # 2. Grab the first image file found
    files = [f for f in os.listdir(dataset_path) if f.endswith(('.jpeg', '.png', '.jpg'))]
    if not files:
        print("❌ Error: No images found in the folder!")
    else:
        sample_img_path = os.path.join(dataset_path, files[0])
        print(f"✅ Found sample image: {files[0]}")
        
        # 3. Simulate our preprocessing pipeline (Resize to 224x224 and convert to a Tensor matrix)
        try:
            img = Image.open(sample_img_path).convert('RGB')
            preprocess = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
            ])
            img_tensor = preprocess(img)
            
            print(f"✅ Preprocessing successful!")
            print(f"📷 Image Matrix Shape: {img_tensor.shape} (Channels, Height, Width)")
            print("🚀 Your environment is 100% ready for the hackathon!")
        except Exception as e:
            print(f"❌ Something went wrong processing the image: {e}")