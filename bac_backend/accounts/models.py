from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=200)
    role = models.CharField(max_length=50)
    centre = models.CharField(max_length=100, blank=True, default='')
    annee_scolaire = models.CharField(max_length=20, blank=True, default='')
    delegation = models.CharField(max_length=100, blank=True, default='')
    nombre_candidats = models.IntegerField(default=0)
    nombre_salles = models.IntegerField(default=0)
    nom_admin = models.CharField(max_length=200, blank=True, default='', verbose_name="رئيس مركز الامتحان")

    def set_password(self, raw_password):
        self.password = raw_password
        self._password = raw_password

    def check_password(self, raw_password):
        if self.password == raw_password:
            return True
        try:
            from django.contrib.auth.hashers import check_password
            return check_password(raw_password, self.password)
        except Exception:
            return False