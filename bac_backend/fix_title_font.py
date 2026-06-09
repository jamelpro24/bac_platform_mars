import zipfile
import re

# Read the template
with zipfile.ZipFile('exam_planning/modeles/model_pres_v3.docx', 'r') as z:
    content = z.read('word/document.xml').decode('utf-8', errors='replace')

# Find the title run (containing بكالوريا)
idx = content.find('بكالوريا')
print(f'بكالوريا at {idx}')

# Find the run containing it
# The run starts with <w:r and contains the text
run_pattern = r'<w:r[^>]*><w:rPr>.*?<w:sz w:val="52"/><w:szCs w:val="52"/>.*?<w:t>.*?</w:t></w:r>'

# Search for the pattern that includes بكالوريا
matches = list(re.finditer(run_pattern, content, re.DOTALL))
for m in matches:
    if m.start() < idx < m.end():
        print(f'Found title run at {m.start()}-{m.end()}')
        print('Before:', content[m.start():m.start()+50])
        print('After:', content[m.end()-50:m.end()])
        
        # Replace the font size in this run only
        old_run = m.group()
        new_run = old_run.replace('w:val="52"', 'w:val="44"')
        content = content[:m.start()] + new_run + content[m.end():]
        print('Replaced font size in title run')
        break

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
