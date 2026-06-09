from django.db import models

class Centre(models.Model):
    nom = models.CharField(max_length=200)
    adresse = models.TextField(blank=True)
    ville = models.CharField(max_length=100, blank=True)
    telephone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.nom
