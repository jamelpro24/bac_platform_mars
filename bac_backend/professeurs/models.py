from django.conf import settings
from django.db import models


class Professeur(models.Model):
    # Table columns in the ministry PDF:
    # - identifiant_unique (10 digits)
    # - nom (nom et prenom)
    # - specialite (matiere d'enseignement)
    # - institution (etablissement)
    identifiant_unique = models.CharField(max_length=20, blank=True, default="")
    nom = models.CharField(max_length=200)
    specialite = models.CharField(max_length=200)
    institution = models.CharField(max_length=255, blank=True, default="")
    telephone = models.CharField(max_length=20, blank=True, default="")
    sexe = models.CharField(max_length=1, choices=[('M', 'ذكر'), ('F', 'أنثى')], blank=True, default='')
    centre = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="superviseurs",
        limit_choices_to={"role": "directeur"},
    )

    class Meta:
        unique_together = ("centre", "identifiant_unique")
        ordering = ["nom", "id"]

    def __str__(self):
        return self.nom
