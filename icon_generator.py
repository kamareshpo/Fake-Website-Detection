import os
from PIL import Image, ImageDraw, ImageFont

# Icon sizes
sizes = [16, 32, 48, 128]

# Colors
shield_color = (30, 144, 255, 255)  # Dodger Blue
s_color = (255, 255, 255, 255)       # White
background_color = (0, 0, 0, 0)     # Transparent

# Ensure icons directory exists
os.makedirs('icons', exist_ok=True)

def draw_shield(draw, size):
    w, h = size, size
    # Draw a simple shield shape
    points = [
        (w*0.5, h*0.1),
        (w*0.9, h*0.3),
        (w*0.8, h*0.85),
        (w*0.5, h*0.98),
        (w*0.2, h*0.85),
        (w*0.1, h*0.3)
    ]
    draw.polygon(points, fill=shield_color)

def draw_s(draw, size):
    # Try to use a bold font, fallback to default
    try:
        font = ImageFont.truetype("arialbd.ttf", int(size*0.6))
    except:
        font = ImageFont.load_default()
    text = "S"
    # Use textbbox if available, else fallback to getsize
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    except AttributeError:
        w, h = font.getsize(text)
    x = (size - w) / 2
    y = (size - h) / 2
    draw.text((x, y), text, font=font, fill=s_color)

for sz in sizes:
    img = Image.new('RGBA', (sz, sz), background_color)
    d = ImageDraw.Draw(img)
    draw_shield(d, sz)
    draw_s(d, sz)
    img.save(f'icons/icon{sz}.png')

print("Icons generated in the 'icons' directory.") 