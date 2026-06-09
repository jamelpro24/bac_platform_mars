import zipfile
import re

# Read the template
with zipfile.ZipFile('exam_planning/modeles/model_pres_v3.docx', 'r') as z:
    content = z.read('word/document.xml')

# Find the title textbox and reduce the font size
idx = content.find('حضور'.encode('utf-8'))
if idx > 0:
    alt_start = content.rfind(b'<mc:AlternateContent', 0, idx)
    alt_end = content.find(b'</mc:AlternateContent>', idx)
    alt = content[alt_start:alt_end]
    
    # Find the runs containing the title (after "حضور")
    # Look for runs with w:sz w:val="52" (26pt) - change to 44 (22pt)
    old_size = b'w:val="52"'
    new_size = b'w:val="44"'
    
    # Count how many times it appears in the alt
    count = alt.count(old_size)
    print(f'Found {count} occurrences of size 52 in title textbox')
    
    # Only replace the first 2 occurrences (title paragraphs)
    if count >= 2:
        # Find first occurrence
        first_pos = alt.find(old_size)
        if first_pos > 0:
            # Replace first occurrence
            alt = alt[:first_pos] + alt[first_pos:].replace(old_size, new_size, 1)
            # Find second occurrence
            second_pos = alt.find(old_size, first_pos + len(new_size))
            if second_pos > 0:
                alt = alt[:second_pos] + alt[second_pos:].replace(old_size, new_size, 1)
    
    # Update the content
    content = content[:alt_start] + alt + content[alt_end+22:]
    
    print('Reduced font size in title to 22pt')

# Save
output = 'exam_planning/modeles/model_pres_v4.docx'
with zipfile.ZipFile('exam_planning/modeles/model_pres_v3.docx', 'r') as zin:
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.namelist():
            if item == 'word/document.xml':
                zout.writestr(item, content)
            else:
                zout.writestr(item, zin.read(item))

print(f'Saved to {output}')
