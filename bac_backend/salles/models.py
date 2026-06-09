
from django.db import models
from centres.models import Centre

class Salle(models.Model):
    numero = models.CharField(max_length=10)
    capacite = models.IntegerField()
    centre = models.ForeignKey(Centre,on_delete=models.CASCADE)

    def __str__(self):
        return self.numero
