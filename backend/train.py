import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader
import os

def main():
    # -------------------------------
    # 1. Setup device and paths
    # -------------------------------
    device = torch.device("cpu")
    data_root = "./chest_xray/chest_xray"
    train_dir = os.path.join(data_root, "train")
    val_dir = os.path.join(data_root, "val")

    # Quick existence check (informative)
    if not os.path.isdir(train_dir):
        print(f"Training directory '{train_dir}' not found!")
        return
    if not os.path.isdir(val_dir):
        print(f"Validation directory '{val_dir}' not found!")
        return

    # -------------------------------
    # 2. Data transforms (ResNet18 expects 224x224, normalised with ImageNet stats)
    # -------------------------------
    data_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    # -------------------------------
    # 3. Datasets and DataLoaders
    # -------------------------------
    train_dataset = datasets.ImageFolder(root=train_dir, transform=data_transforms)
    val_dataset = datasets.ImageFolder(root=val_dir, transform=data_transforms)

    class_names = train_dataset.classes
    print(f"Classes: {class_names}")

    # Use small batch size to keep CPU memory low
    batch_size = 16
    train_loader = DataLoader(train_dataset, batch_size=batch_size,
                              shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size,
                            shuffle=False, num_workers=0)

    print(f"Training samples: {len(train_dataset)}")
    print(f"Validation samples: {len(val_dataset)}")

    # -------------------------------
    # 4. Model: ResNet18 pretrained on ImageNet
    # -------------------------------
    model = models.resnet18(pretrained=True)
    # Replace the final fully connected layer for 2 classes
    num_ftrs = model.fc.in_features
    model.fc = nn.Linear(num_ftrs, 2)
    model = model.to(device)

    # -------------------------------
    # 5. Loss function and optimizer
    # -------------------------------
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # -------------------------------
    # 6. Training loop
    # -------------------------------
    num_epochs = 3   # keep low to avoid CPU overload

    for epoch in range(num_epochs):
        print(f"\nEpoch {epoch+1}/{num_epochs}")
        print("-" * 20)

        # ----- Training phase -----
        model.train()
        running_loss = 0.0
        for batch_idx, (inputs, labels) in enumerate(train_loader):
            inputs, labels = inputs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * inputs.size(0)

            # Print progress every 20 batches (or at the end)
            if (batch_idx + 1) % 20 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  Batch {batch_idx+1}/{len(train_loader)} - Loss: {loss.item():.4f}")

        epoch_loss = running_loss / len(train_dataset)

        # ----- Evaluation phase -----
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        epoch_acc = 100.0 * correct / total

        print(f"Epoch {epoch+1} complete - Train Loss: {epoch_loss:.4f} - Val Accuracy: {epoch_acc:.2f}%")

    # -------------------------------
    # 7. Save the trained model
    # -------------------------------
    model_path = "pneumonia_model.pth"
    torch.save(model.state_dict(), model_path)
    print(f"\nFinal model saved to '{model_path}'")
    print(f"Final Validation Accuracy: {epoch_acc:.2f}%")

if __name__ == "__main__":
    main()