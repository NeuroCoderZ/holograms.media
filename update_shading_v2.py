
import re

file_path = 'Semitones_Angles.md'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    line = match.group(0)
    # Extract id: X
    id_match = re.search(r'id:\s*(\d+)', line)
    if not id_match: return line
    id_val = int(id_match.group(1))
    # Calculate v = round((id+1)/128 * 255)
    v = round(((id_val + 1) / 128.0) * 255)
    new_z_shade = f'z_shade: "rgb({v},{v},{v})"'
    # Replace ONLY the z_shade part
    return re.sub(r'z_shade:\s*\"rgb\(\d+,\d+,\d+\)\"', new_z_shade, line)

# Match the whole line from { id: to }
new_content = re.sub(r'\{ id: \d+,.*?\}', replacer, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated successfully")
