
from django.db import models

class Matiere(models.Model):
    nom = models.CharField(max_length=200)

class Examen(models.Model):
    matiere = models.ForeignKey(Matiere,on_delete=models.CASCADE)
    date = models.DateField()
