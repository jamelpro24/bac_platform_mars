
from django.db import models
from professeurs.models import Professeur
from salles.models import Salle
from examens.models import Examen

class Surveillance(models.Model):
    professeur = models.ForeignKey(Professeur,on_delete=models.CASCADE)
    salle = models.ForeignKey(Salle,on_delete=models.CASCADE)
    examen = models.ForeignKey(Examen,on_delete=models.CASCADE)
