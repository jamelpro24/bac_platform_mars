import zipfile
import re

# Read v3
with zipfile.ZipFile('exam_planning/modeles/model_pres_v3.docx', 'r') as z:
    content = z.read('word/document.xml').decode('utf-8', errors='replace')

# Increase textbox width from 2247900 to 3200000 EMUs (2.46" -> 3.5")
# and height from 1200000 to 1500000 EMUs (1.31" -> 1.64")
old_extent = 'cx="2247900" cy="1200000"'
new_extent = 'cx="3200000" cy="1500000"'

if old_extent in content:
    content = content.replace(old_extent, new_extent)
    print(f'Updated extent: {old_extent} -> {new_extent}')
else:
    print('Extent not found')

# Save
output = 'exam_planning/modeles/model_pres_v4.docx'
with zipfile.ZipFile('exam_planning/modeles/model_pres_v3.docx', 'r') as zin:
    content_bytes = content.encode('utf-8')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.namelist():
            if item == 'word/document.xml':
                zout.writestr(item, content_bytes)
            else:
                zout.writestr(item, zin.read(item))

print(f'Saved to {output}')
print('New size: 3.5" x 1.64" (was 2.46" x 1.31")')
