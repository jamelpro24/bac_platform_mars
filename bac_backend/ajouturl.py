import os

BASE_DIR = "bac_backend"

apps = [
    "centres",
    "salles",
    "candidats",
    "examens",
    "professeurs",
    "surveillance"
]

# contenu du urls.py pour chaque app
app_urls_template = """
from django.urls import path
from . import views

urlpatterns = [
]
"""

for app in apps:

    path = os.path.join(BASE_DIR, app, "urls.py")

    with open(path, "w", encoding="utf-8") as f:
        f.write(app_urls_template)

    print(f"urls.py créé pour {app}")

# urls principal

main_urls = """
from django.contrib import admin
from django.urls import path, include

urlpatterns = [

    path('admin/', admin.site.urls),

    path('api/centres/', include('centres.urls')),
    path('api/salles/', include('salles.urls')),
    path('api/candidats/', include('candidats.urls')),
    path('api/examens/', include('examens.urls')),
    path('api/profs/', include('professeurs.urls')),
    path('api/surveillance/', include('surveillance.urls')),
]
"""

main_path = os.path.join(BASE_DIR, "bac_backend", "urls.py")

with open(main_path, "w", encoding="utf-8") as f:
    f.write(main_urls)

print("Tous les fichiers urls.py sont générés avec succès")
