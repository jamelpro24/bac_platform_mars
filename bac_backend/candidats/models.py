
from django.db import models
from centres.models import Centre

class Serie(models.Model):
    numero = models.CharField(max_length=4)
    centre = models.ForeignKey(Centre, on_delete=models.CASCADE)
    section = models.CharField(max_length=100, blank=True)

class Candidat(models.Model):
    num_ins = models.CharField(max_length=20, unique=True)
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE)
