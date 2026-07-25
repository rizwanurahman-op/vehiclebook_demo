import numpy as np
from PIL import Image, ImageFilter

def create_light_theme_logo():
    # Load image
    img = Image.open('frontend/public/images/vbook-logo.png').convert('RGBA')
    data = np.array(img, dtype=np.float32)

    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]

    # Dark background color estimation (smooth corner average)
    bg_color = np.array([9.0, 10.0, 21.0])

    # Calculate distance from background color
    diff = np.sqrt((r - bg_color[0])**2 + (g - bg_color[1])**2 + (b - bg_color[2])**2)
    
    # Smooth alpha mask based on luminance / distance from dark background
    alpha_mask = np.clip((diff - 15.0) / 40.0, 0.0, 1.0)
    
    # 1. Clean transparent background version preserving original colors
    clean_rgba = np.copy(data)
    clean_rgba[:,:,3] = alpha_mask * 255.0

    # Crop tight bounding box
    non_zero = np.where(clean_rgba[:,:,3] > 10)
    ymin, ymax = np.min(non_zero[0]), np.max(non_zero[0])
    xmin, xmax = np.min(non_zero[1]), np.max(non_zero[1])
    
    # Add padding
    pad = 30
    ymin = max(0, ymin - pad)
    ymax = min(clean_rgba.shape[0], ymax + pad)
    xmin = max(0, xmin - pad)
    xmax = min(clean_rgba.shape[1], xmax + pad)

    cropped_clean = clean_rgba[ymin:ymax, xmin:xmax]
    img_clean = Image.fromarray(cropped_clean.astype(np.uint8))
    img_clean.save('frontend/public/images/vbook_logo_transparent.png')

    # 2. Light Theme Version (Charcoal/Dark Text for "BOOK", vibrant Purple/Blue "V")
    # For light theme, the white/silver text "BOOK" should be converted to dark charcoal #1E293B (RGB 30, 41, 59)
    # The V gradient is purple-blue (high blue/red, low green or high blue/purple).
    # Let's identify the text vs the V mark.
    # Text "BOOK" is located on the right side of the image (x > 380 in cropped space).
    # Silver/white text has r,g,b very close to each other (low color saturation) and high brightness.
    
    light_data = np.copy(clean_rgba)
    
    # Saturation = max(r,g,b) - min(r,g,b)
    rgb_max = np.maximum(r, np.maximum(g, b))
    rgb_min = np.minimum(r, np.minimum(g, b))
    sat = rgb_max - rgb_min
    lum = (r + g + b) / 3.0

    # Text pixels are desaturated (low saturation) and bright (high luminance)
    is_text = (sat < 35) & (lum > 70) & (alpha_mask > 0.2)

    # Convert text pixels to dark charcoal #0F172A (rgb: 15, 23, 42) for light theme
    charcoal = np.array([15.0, 23.0, 42.0])
    
    # Smooth blend factor for text
    text_factor = np.clip((lum - 60.0) / 100.0, 0.0, 1.0)
    for c in range(3):
        light_data[:,:,c] = np.where(is_text, charcoal[c] * text_factor + (1 - text_factor) * light_data[:,:,c], light_data[:,:,c])

    cropped_light = light_data[ymin:ymax, xmin:xmax]
    img_light = Image.fromarray(cropped_light.astype(np.uint8))
    img_light.save('frontend/public/images/vbook_logo_light_theme.png')

    # 3. Create a version on crisp white background
    w_bg = np.ones((cropped_light.shape[0], cropped_light.shape[1], 4), dtype=np.uint8) * 255
    bg_img = Image.fromarray(w_bg)
    bg_img.paste(img_light, (0, 0), img_light)
    bg_img.save('frontend/public/images/vbook_logo_light_theme_white_bg.png')
    
    print("Logos processed and saved successfully.")

create_light_theme_logo()
