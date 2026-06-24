from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

from django.db import models
from django.conf import settings
from django.db import models
from accounts.models import User   # ou settings.AUTH_USER_MODEL

# ==================== SECTION ====================
class Section(models.Model):
    nom = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sections")

    def __str__(self):
        return self.nom

# ==================== SERIE ====================
class Serie(models.Model):
    nom = models.CharField(max_length=100)
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="series")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="series")

    def __str__(self):
        return f"{self.nom} ({self.section.nom})"

# ==================== SESSION ====================
class Session(models.Model):
    nom = models.CharField(max_length=50)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    jours = models.JSONField(default=list)

    def __str__(self):
        return self.nom

# ==================== SALLE ====================
class Salle(models.Model):
    numero = models.PositiveSmallIntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='salles')
    
    class Meta:
        unique_together = ('numero', 'user')
    
    def __str__(self):
        return f"قاعة {self.numero}"
        return f"Salle {self.numero}"

# ==================== MATIERE ====================
class Matiere(models.Model):
    nom = models.CharField(max_length=100)

    def __str__(self):
        return self.nom

class MatiereSection(models.Model):
    TYPE_CHOICES = [
        ('obligatoire', 'إجبارية'),
        ('optionnelle', 'اختيارية'),
    ]
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE, related_name='sections_durees')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='matieres_durees')
    heures  = models.FloatField(default=2)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='obligatoire')

    class Meta:
        unique_together = ('matiere', 'section')

    def __str__(self):
        return f"{self.matiere.nom} — {self.section.nom} ({self.heures}h)"

class TemplateMatiere(models.Model):
    matieres = models.JSONField(default=list)
    matiere_sections = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "قالب المواد"
        verbose_name_plural = "قالب المواد"

class TemplateExamen(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    examens = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "قالب الامتحانات"
        verbose_name_plural = "قالب الامتحانات"

class Candidat(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='candidats')
    num_ins    = models.CharField(max_length=20)
    nom_prenom = models.CharField(max_length=255)
    ncin       = models.CharField(max_length=20, blank=True)
    section    = models.CharField(max_length=100, blank=True)
    etablissement = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        unique_together = ('user', 'num_ins')

    def __str__(self):
        return f"{self.num_ins} — {self.nom_prenom}"
# ==================== INSCRIPTION ====================
class Inscription(models.Model):
    serie      = models.ForeignKey(Serie, on_delete=models.CASCADE, related_name='inscriptions')
    num_ins    = models.CharField(max_length=20)
    nom_prenom = models.CharField(max_length=255, verbose_name="الإسم و اللقب")
    cin        = models.CharField(max_length=20, blank=True, null=True, verbose_name="رقم بطاقة التعريف الوطنية")
    section     = models.CharField(max_length=100, verbose_name="الشعبة")
    etablissement = models.CharField(max_length=255, blank=True, default='', verbose_name="المعهد")

    class Meta:
        unique_together = ('serie', 'num_ins')

    def __str__(self):
        return f"{self.num_ins} - {self.nom_prenom} - {self.serie.nom}"

# ==================== EXAMEN ====================
class Examen(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='examens')
    date = models.DateField()
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    matiere = models.ForeignKey(Matiere, on_delete=models.CASCADE)
    salle = models.ForeignKey(Salle, on_delete=models.CASCADE, null=True, blank=True)
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE, null=True, blank=True)
    section = models.ForeignKey(Section, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    candidat_assignments = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.matiere.nom} - {self.date}"

class ExamenSalle(models.Model):
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name='affectations')
    salle = models.ForeignKey(Salle, on_delete=models.CASCADE)
    serie = models.ForeignKey(Serie, on_delete=models.CASCADE, null=True, blank=True)
    layout = models.CharField(max_length=2, default='15', blank=True)
    surveillant_1 = models.ForeignKey('professeurs.Professeur', on_delete=models.SET_NULL, null=True, blank=True, related_name='surveillances_1')
    surveillant_2 = models.ForeignKey('professeurs.Professeur', on_delete=models.SET_NULL, null=True, blank=True, related_name='surveillances_2')

    class Meta:
        unique_together = ('examen', 'salle', 'serie')

    def __str__(self):
        return f"{self.examen} — قاعة {self.salle.numero} — {self.serie.nom if self.serie else '-'}"


class SurveillancePlan(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='surveillance_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    total_profs = models.PositiveIntegerField(default=0)
    group_size = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "خطة الحراسة"
        verbose_name_plural = "خطط الحراسة"

    def __str__(self):
        return f"خطة حراسة - {self.session}"


class SurveillanceAssignment(models.Model):
    TYPE_CHOICES = [
        ('surveillant', 'مراقب'),
        ('suppleant', 'احتياط'),
    ]
    plan = models.ForeignKey(SurveillancePlan, on_delete=models.CASCADE, related_name='assignments')
    professeur = models.ForeignKey('professeurs.Professeur', on_delete=models.CASCADE, related_name='surv_assignments')
    date = models.DateField()
    session_number = models.PositiveSmallIntegerField(help_text="رقم الحصة (1 أو 2)")
    time_start = models.TimeField(null=True, blank=True)
    time_end = models.TimeField(null=True, blank=True)
    salle_numero = models.PositiveIntegerField(null=True, blank=True, help_text="رقم القاعة (بدون FK)")
    salle_label = models.CharField(max_length=50, blank=True, default="")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='surveillant')
    group_number = models.PositiveSmallIntegerField(default=1, help_text="رقم المجموعة (1 أو 2)")
    heures = models.FloatField(default=0, help_text="عدد ساعات هذه الحراسة")

    class Meta:
        verbose_name = "تعيين حراسة"
        verbose_name_plural = "تعيينات الحراسة"
        ordering = ['date', 'session_number', 'salle_numero']

    def __str__(self):
        return f"{self.professeur.nom} - {self.date} ج{self.session_number} - {self.get_type_display()}"

class SurveillanceGroupConfig(models.Model):
    session = models.ForeignKey('Session', on_delete=models.CASCADE, unique=True)
    group1_ids = models.JSONField(default=list)
    group2_ids = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "تكوين المجموعات"
        verbose_name_plural = "تكوينات المجموعات"

    def __str__(self):
        return f"Session {self.session_id} — G1:{len(self.group1_ids)} G2:{len(self.group2_ids)}"


class ProfessorSchedule(models.Model):
    professeur = models.ForeignKey('professeurs.Professeur', on_delete=models.CASCADE, related_name='daily_schedules')
    date = models.DateField()
    session1_type = models.CharField(max_length=20, blank=True, default='', help_text="surveillant / suppleant")
    session1_start = models.TimeField(null=True, blank=True)
    session1_end = models.TimeField(null=True, blank=True)
    session1_salle = models.PositiveIntegerField(null=True, blank=True)
    session2_type = models.CharField(max_length=20, blank=True, default='', help_text="surveillant / suppleant")
    session2_start = models.TimeField(null=True, blank=True)
    session2_end = models.TimeField(null=True, blank=True)
    session2_salle = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "برنامج أستاذ"
        verbose_name_plural = "برامج الأساتذة"
        unique_together = [('professeur', 'date')]
        ordering = ['date', 'professeur']

    def __str__(self):
        return f"{self.professeur.nom} - {self.date}"


class ControleConfig(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='controle_configs')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rooms = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session', 'user')
        verbose_name = "تكوين قاعات المراقبة"
        verbose_name_plural = "تكوينات قاعات المراقبة"

    def __str__(self):
        return f"ControleConfig session={self.session_id} user={self.user_id}"