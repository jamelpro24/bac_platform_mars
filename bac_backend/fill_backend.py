import os

BASE_DIR = "bac_backend"

files = {

# MODELS

"centres/models.py": """
from django.db import models

class Centre(models.Model):
    nom = models.CharField(max_length=200)
    ville = models.CharField(max_length=200)

    def __str__(self):
        return self.nom
""",

"salles/models.py": """
from django.db import models
from centres.models import Centre

class Salle(models.Model):
    numero = models.CharField(max_length=10)
    capacite = models.IntegerField()
    centre = models.ForeignKey(Centre,on_delete=models.CASCADE)

    def __str__(self):
        return self.numero
""",

"candidats/models.py": """
from django.db import models
from centres.models import Centre

class Serie(models.Model):
    numero = models.CharField(max_length=4)
    centre = models.ForeignKey(Centre,on_delete=models.CASCADE)

class Candidat(models.Model):
    num_ins = models.CharField(max_length=20,unique=True)
    serie = models.ForeignKey(Serie,on_delete=models.CASCADE)
""",

"professeurs/models.py": """
from django.db import models
from centres.models import Centre

class Professeur(models.Model):
    nom = models.CharField(max_length=200)
    specialite = models.CharField(max_length=200)
    telephone = models.CharField(max_length=20)
    centre = models.ForeignKey(Centre,on_delete=models.CASCADE)

    def __str__(self):
        return self.nom
""",

"examens/models.py": """
from django.db import models

class Matiere(models.Model):
    nom = models.CharField(max_length=200)

class Examen(models.Model):
    matiere = models.ForeignKey(Matiere,on_delete=models.CASCADE)
    date = models.DateField()
""",

"surveillance/models.py": """
from django.db import models
from professeurs.models import Professeur
from salles.models import Salle
from examens.models import Examen

class Surveillance(models.Model):
    professeur = models.ForeignKey(Professeur,on_delete=models.CASCADE)
    salle = models.ForeignKey(Salle,on_delete=models.CASCADE)
    examen = models.ForeignKey(Examen,on_delete=models.CASCADE)
""",

# SERIALIZERS

"centres/serializers.py": """
from rest_framework import serializers
from .models import Centre

class CentreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Centre
        fields = '__all__'
""",

"salles/serializers.py": """
from rest_framework import serializers
from .models import Salle

class SalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Salle
        fields = '__all__'
""",

"candidats/serializers.py": """
from rest_framework import serializers
from .models import Serie,Candidat

class SerieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Serie
        fields = '__all__'

class CandidatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidat
        fields = '__all__'
""",

"professeurs/serializers.py": """
from rest_framework import serializers
from .models import Professeur

class ProfSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professeur
        fields = '__all__'
""",

# VIEWS API

"centres/views.py": """
from rest_framework import viewsets
from .models import Centre
from .serializers import CentreSerializer

class CentreViewSet(viewsets.ModelViewSet):
    queryset = Centre.objects.all()
    serializer_class = CentreSerializer
""",

"salles/views.py": """
from rest_framework import viewsets
from .models import Salle
from .serializers import SalleSerializer

class SalleViewSet(viewsets.ModelViewSet):
    queryset = Salle.objects.all()
    serializer_class = SalleSerializer
""",

"candidats/views.py": """
from rest_framework import viewsets
from .models import Serie,Candidat
from .serializers import SerieSerializer,CandidatSerializer

class SerieViewSet(viewsets.ModelViewSet):
    queryset = Serie.objects.all()
    serializer_class = SerieSerializer

class CandidatViewSet(viewsets.ModelViewSet):
    queryset = Candidat.objects.all()
    serializer_class = CandidatSerializer
""",

# ADMIN

"centres/admin.py": """
from django.contrib import admin
from .models import Centre

admin.site.register(Centre)
""",

"salles/admin.py": """
from django.contrib import admin
from .models import Salle

admin.site.register(Salle)
""",

"candidats/admin.py": """
from django.contrib import admin
from .models import Serie,Candidat

admin.site.register(Serie)
admin.site.register(Candidat)
""",

"professeurs/admin.py": """
from django.contrib import admin
from .models import Professeur

admin.site.register(Professeur)
""",

}

for path,content in files.items():

    full=os.path.join(BASE_DIR,path)

    os.makedirs(os.path.dirname(full),exist_ok=True)

    with open(full,"w",encoding="utf-8") as f:
        f.write(content)

print("Backend API généré avec succès")