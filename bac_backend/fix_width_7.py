import zipfile

# Read v4
with zipfile.ZipFile('exam_planning/modeles/model_pres_v4.docx', 'r') as z:
    content = z.read('word/document.xml').decode('utf-8', errors='replace')

# Increase width to 7 inches (7 * 914400 = 6400800 EMUs)
# Keep height at 1.64"
old_extent = 'cx="3200000" cy="1500000"'
new_extent = 'cx="6400000" cy="1500000"'

if old_extent in content:
    content = content.replace(old_extent, new_extent)
    print(f'Updated: 3.5" -> 7"')
else:
    print('Pattern not found')

# Save
output = 'exam_planning/modeles/model_pres_v5.docx'
with zipfile.ZipFile('exam_planning/modeles/model_pres_v4.docx', 'r') as zin:
    content_bytes = content.encode('utf-8')
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.namelist():
            if item == 'word/document.xml':
                zout.writestr(item, content_bytes)
            else:
                zout.writestr(item, zin.read(item))

print(f'Saved to {output}')
print('New width: 7 inches')
