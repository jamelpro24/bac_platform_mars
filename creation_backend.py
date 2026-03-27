import os
import subprocess

PROJECT_NAME = "bac_backend"

apps = [
    "accounts",
    "centres",
    "salles",
    "candidats",
    "examens",
    "professeurs",
    "surveillance",
    "documents",
    "imports"
]

def run(cmd):
    subprocess.run(cmd, shell=True, check=True)

print("Creation du projet Django...")
run(f"django-admin startproject {PROJECT_NAME}")

os.chdir(PROJECT_NAME)

print("Creation des applications...")

for app in apps:
    run(f"python manage.py startapp {app}")

print("Creation des dossiers documents...")

folders = [
    "templates_docs",
    "generated/plan_salle",
    "generated/presence",
    "generated/convocations"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)

print("Structure backend cree avec succes !")