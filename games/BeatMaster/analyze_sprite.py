
import sys
import struct

def analyze_png_grid(filepath):
    try:
        with open(filepath, 'rb') as f:
            header = f.read(8)
            if header != b'\x89PNG\r\n\x1a\n':
                print("Not a PNG file")
                return

            width = 0
            height = 0
            pixels = []
            
            while True:
                chunk_length_bytes = f.read(4)
                if not chunk_length_bytes: break
                chunk_length = struct.unpack('>I', chunk_length_bytes)[0]
                chunk_type = f.read(4).decode('ascii')
                chunk_data = f.read(chunk_length)
                f.read(4) # CRC

                if chunk_type == 'IHDR':
                    width = struct.unpack('>I', chunk_data[0:4])[0]
                    height = struct.unpack('>I', chunk_data[4:8])[0]
                    print(f"Image Size: {width}x{height}")
                elif chunk_type == 'IDAT':
                    # Decompressing IDAT is complex without PIL
                    # Fallback: estimate based on file size or try to find simple structure
                    # Since we can't easily decompress without external libs, 
                    # we'll use a simpler heuristic or just PIL if available.
                    pass
                elif chunk_type == 'IEND':
                    break

        # Since we cannot reliably decode PNG pixel data without external libraries (like PIL/Pillow)
        # in a standard environment, and installing them might not be unsafe.
        # However, we can try to use standard library 'zlib' to decompress IDAT
        # but filtering/unfiltering is still complex.
        
        # Let's try to import PIL.
        from PIL import Image
        img = Image.open(filepath)
        w, h = img.size
        print(f"Loaded with PIL: {w}x{h}")
        
        # Scan horizontal profile
        col_counts = [0] * w
        row_counts = [0] * h
        
        pixels = img.load()
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                if a > 10: # Threshold
                    col_counts[x] = 1
                    row_counts[y] = 1
        
        # Count islands in profiles
        def count_islands(arr):
            count = 0
            in_island = False
            for val in arr:
                if val == 1:
                    if not in_island:
                        count += 1
                        in_island = True
                else:
                    in_island = False
            return count

        cols = count_islands(col_counts)
        rows = count_islands(row_counts)
        
        print(f"DETECTED_GRID: {cols}x{rows}")
        
    except ImportError:
        print("PIL not installed. Cannot analyze pixels deeply.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_png_grid(sys.argv[1])
