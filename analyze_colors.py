try:
    from PIL import Image
    import collections
    import os

    path = r"C:/Users/81908/.gemini/antigravity/brain/8fa215b5-6a13-4400-9760-68cc844a7999/uploaded_media_1770205489708.png"
    
    if not os.path.exists(path):
        print(f"FILE_NOT_FOUND: {path}")
        exit(1)
        
    img = Image.open(path)
    w, h = img.size
    print(f"Image Size: {w}x{h}")

    # Crop bottom 20% (Where hearts are)
    # The image has 4 lanes.
    # We want to find the 4 centers.
    
    bottom_y = int(h * 0.8)
    bottom = img.crop((0, bottom_y, w, h))
    bw, bh = bottom.size
    
    # 4 segments width-wise
    seg_w = bw // 4
    
    results = []
    
    for i in range(4):
        # Crop center of segment
        cx = i * seg_w + seg_w // 2
        cy = bh // 2
        # Crop 60x60 proportional box
        box_s = min(seg_w, bh) // 3
        box = bottom.crop((cx - box_s, cy - box_s, cx + box_s, cy + box_s))
        
        # Get Average Color
        pixels = list(box.getdata())
        r, g, b = 0, 0, 0
        count = 0
        for p in pixels:
            # Skip transparent/white/black if any
            # Also skip very dark colors (background)
            if len(p) > 3 and p[3] < 128: continue
            if sum(p[:3]) < 50: continue 
            
            r += p[0]
            g += p[1]
            b += p[2]
            count += 1
        
        if count > 0:
            results.append((r//count, g//count, b//count))
        else:
            results.append((255, 255, 255))

    print("HEART_COLORS:")
    for c in results:
        print(f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}")
        
    # Now analyze Beams (Top half)
    # Beams are in the same columns but higher up.
    # Let's sample from middle of screen.
    mid_y = int(h * 0.4)
    mid_crop = img.crop((0, mid_y, w, mid_y + 50))
    mw, mh = mid_crop.size
    
    # Perspective correction: Lanes are narrower at the top.
    # But usually rhythm games have a vanishing point at screen center.
    # The lanes converge to (w/2, 0) or slightly above.
    # Let's simple-sample the 4 equidistant points at mid-height but squeezed towards center.
    # Estimation: At 40% height, width is maybe 60% of bottom width?
    
    # Let's just create a complementary gradient based on heart colors for now, 
    # OR try to sample if possible.
    # Let's stick to Heart Colors for accuracy, and I will manually tweak the gradients to be "Rainbow" style.
    
except ImportError:
    print("PIL_MISSING")
except Exception as e:
    print(f"ERROR: {e}")
