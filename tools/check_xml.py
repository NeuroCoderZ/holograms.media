import os

filename = "repomix-context.xml"

if not os.path.exists(filename):
    print("❌ File not found")
else:
    size = os.path.getsize(filename)
    print(f"📦 Size: {size} bytes")
    
    try:
        with open(filename, "rb") as f:
            head = f.read(20)
            print(f"🔍 Head (hex): {head.hex()}")
            print(f"🔍 Head (str): {head}")
            
        with open(filename, "r", encoding="utf-8") as f:
            print(f"✅ Text content head: {f.read(50)}")
            
    except Exception as e:
        print(f"❌ Read Error: {e}")
