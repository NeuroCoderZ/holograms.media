import os
import re

def check_css_file(filepath):
    print(f"Checking {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"  Error reading file: {e}")
        return
    
    # Remove comments to avoid false positives
    content_no_comments = re.sub(r'/\*.*?\*/', '', f.read() if not content else content, flags=re.DOTALL)
    
    # Simple brace balance check
    open_braces = content_no_comments.count('{')
    close_braces = content_no_comments.count('}')
    
    if open_braces != close_braces:
        print(f"  !!! ERROR: Brace imbalance in {filepath}: {open_braces} vs {close_braces}")
    
    # More detailed nesting check
    stack = 0
    lines = content_no_comments.split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        if not line: continue
        
        if '{' in line:
            if stack > 0:
                # If we have a selector start while already inside a block
                # ignore @media, @keyframes, and radial-gradient values (which have braces inside property values but usually not like this)
                potential_selector = line.split('{')[0].strip()
                if potential_selector and not potential_selector.startswith('@') and ':' not in potential_selector:
                    print(f"  WARNING: Potential nesting at line {i+1}: {line}")
            stack += line.count('{')
        if '}' in line:
            stack -= line.count('}')

def find_css_files(root_dir):
    css_files = []
    for root, dirs, files in os.walk(root_dir):
        if '.git' in root or 'node_modules' in (root.split(os.sep)):
            continue
        for file in files:
            if file.endswith('.css'):
                css_files.append(os.path.join(root, file))
    return css_files

c_dir = r"c:\holograms.media"
for f in find_css_files(c_dir):
    check_css_file(f)
