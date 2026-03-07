import os
import sys
import subprocess
import math

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillow not found, installing...")
    install("Pillow")
    from PIL import Image, ImageDraw

def draw_scanner_corners(draw, margin, size, corner_len, border_width):
    # Top-Left
    draw.line([(margin, margin + corner_len), (margin, margin), (margin + corner_len, margin)], fill="white", width=border_width, joint="curve")
    # Top-Right
    draw.line([(size - margin - corner_len, margin), (size - margin, margin), (size - margin, margin + corner_len)], fill="white", width=border_width, joint="curve")
    # Bottom-Left
    draw.line([(margin, size - margin - corner_len), (margin, size - margin), (margin + corner_len, size - margin)], fill="white", width=border_width, joint="curve")
    # Bottom-Right
    draw.line([(size - margin, size - margin - corner_len), (size - margin, size - margin), (size - margin - corner_len, size - margin)], fill="white", width=border_width, joint="curve")

def draw_checkmark(draw, center_x, center_y, size, border_width):
    # Checkmark logic (scaling based on overall icon size)
    start_x = center_x - size * 0.15
    start_y = center_y + size * 0.05
    
    mid_x = center_x - size * 0.02
    mid_y = center_y + size * 0.18
    
    end_x = center_x + size * 0.18
    end_y = center_y - size * 0.18
    
    draw.line([(start_x, start_y), (mid_x, mid_y), (end_x, end_y)], fill="#10b981", width=border_width + 4, joint="curve") # Green colored check
    draw.line([(start_x, start_y), (mid_x, mid_y), (end_x, end_y)], fill="white", width=border_width, joint="curve")

def create_icon(size, filename):
    # Background
    img = Image.new('RGB', (size, size), color='#2563eb') # Tailwind Blue-600
    draw = ImageDraw.Draw(img)
    
    margin = size // 6
    corner_len = size // 5
    border_width = max(4, size // 15)
    
    # Draw viewfinder (Scan)
    draw_scanner_corners(draw, margin, size, corner_len, border_width)
    
    # Draw horizontal scanning laser line (optional, makes it look like it's scanning)
    laser_y = size // 2 - size // 12
    draw.line([(margin + border_width, laser_y), (size - margin - border_width, laser_y)], fill="#60a5fa", width=border_width // 2)

    # Draw checkmark (Solve)
    draw_checkmark(draw, size // 2, size // 2, size, border_width)
    
    public_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
    if not os.path.exists(public_dir):
        os.makedirs(public_dir)
        
    path = os.path.join(public_dir, filename)
    img.save(path)
    print(f"Created {path}")

if __name__ == "__main__":
    print("Generating refined PWA Icons...")
    create_icon(192, 'icon-192.png')
    create_icon(512, 'icon-512.png')
    print("Done!")
