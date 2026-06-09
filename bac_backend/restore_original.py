import zipfile

# Start fresh with the original model_pres.docx
# Copy it to model_pres_v5.docx without any modifications
with zipfile.ZipFile('exam_planning/modeles/model_pres.docx', 'r') as zin:
    with zipfile.ZipFile('exam_planning/modeles/model_pres_v5.docx', 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.namelist():
            zout.writestr(item, zin.read(item))

print('Created model_pres_v5.docx from original model_pres.docx')
print('No modifications - title stays as is')
