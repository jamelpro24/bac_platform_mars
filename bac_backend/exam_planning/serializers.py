from rest_framework import serializers
from .models import Section, Session, Salle, Matiere, Serie, MatiereSection, Examen, Inscription, Candidat, ExamenSalle, SurveillancePlan, SurveillanceAssignment, ControleConfig

class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = '__all__'

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = ['id', 'nom', 'jours']

class SalleSerializer(serializers.ModelSerializer):
    # user is set server-side in the viewset; don't require it in POST bodies
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Salle
        fields = '__all__'

class MatiereSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matiere
        fields = '__all__'

class SerieSerializer(serializers.ModelSerializer):
    section_nom = serializers.CharField(source='section.nom', read_only=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    inscription_count = serializers.SerializerMethodField()
    class Meta:
        model = Serie
        fields = ['id', 'nom', 'section', 'section_nom', 'user', 'inscription_count']

    def get_inscription_count(self, obj):
        return obj.inscriptions.count()

class MatiereSectionSerializer(serializers.ModelSerializer):
    matiere_nom = serializers.CharField(source='matiere.nom', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    section_nom = serializers.CharField(source='section.nom', read_only=True)

    class Meta:
        model = MatiereSection
        fields = '__all__'

class ExamenSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True, default=serializers.CurrentUserDefault())
    class Meta:
        model = Examen
        fields = '__all__'

class ExamenSalleSerializer(serializers.ModelSerializer):
    salle_numero = serializers.IntegerField(source='salle.numero', read_only=True)
    serie_nom = serializers.CharField(source='serie.nom', read_only=True, allow_null=True)

    class Meta:
        model = ExamenSalle
        fields = '__all__'

class InscriptionSerializer(serializers.ModelSerializer):
    serie_nom = serializers.CharField(source='serie.nom', read_only=True)
    class Meta:
        model = Inscription
        fields = ['id', 'num_ins', 'nom_prenom', 'cin', 'section', 'etablissement', 'serie', 'serie_nom', 'resultat']

class CandidatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidat
        fields = '__all__'


class SurveillancePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveillancePlan
        fields = '__all__'


class SurveillanceAssignmentSerializer(serializers.ModelSerializer):
    professeur_nom = serializers.CharField(source='professeur.nom', read_only=True)
    professeur_specialite = serializers.CharField(source='professeur.specialite', read_only=True)
    class Meta:
        model = SurveillanceAssignment
        fields = '__all__'


class ControleConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControleConfig
        fields = '__all__'
        read_only_fields = ['user']
