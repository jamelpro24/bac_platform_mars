import zipfile

# Read original file
with zipfile.ZipFile('exam_planning/modeles/model_pres_v2.docx', 'r') as z:
    content = z.read('word/document.xml')

# Increase height from 871538 to 1200000 EMUs (0.95" to 1.31")
if b'cy="871538"' in content:
    content = content.replace(b'cy="871538"', b'cy="1200000"')
    print('Replaced height 871538 -> 1200000')
else:
    print('Pattern not found, trying 581025')
    content = content.replace(b'cy="581025"', b'cy="1200000"')
    print('Replaced height 581025 -> 1200000')

# Save
output = 'exam_planning/modeles/model_pres_v3.docx'
with zipfile.ZipFile('exam_planning/modeles/model_pres_v2.docx', 'r') as zin:
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.namelist():
            if item == 'word/document.xml':
                zout.writestr(item, content)
            else:
                zout.writestr(item, zin.read(item))

print(f'Saved to {output}')
print('New height: 1.31 inches (1200000 EMUs)')
