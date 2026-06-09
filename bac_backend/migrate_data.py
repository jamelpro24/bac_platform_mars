#!/usr/bin/env python
"""Export SQLite data to JSON for importing on Render PostgreSQL"""
import subprocess, sys, os

DB = os.path.join(os.path.dirname(__file__), 'db.sqlite3')
OUT = os.path.join(os.path.dirname(__file__), 'data_export.json')

if not os.path.exists(DB):
    print(f"Base introuvable : {DB}")
    sys.exit(1)

print("Export des donnees SQLite -> data_export.json ...")
subprocess.run([sys.executable, 'manage.py', 'dumpdata', '--natural-foreign',
                '--exclude=contenttypes', '--exclude=auth.Permission',
                '-o', OUT], check=True)
print(f"Fait ! Fichier : {OUT}")
print("\nPour importer sur Render :")
print(f"1. Uploader data_export.json sur Render (via le shell ou SFTP)")
print(f"2. Lancer : python manage.py loaddata data_export.json")
