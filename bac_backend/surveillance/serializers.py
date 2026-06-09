from rest_framework import serializers
from .models import Surveillance

class SurveillanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Surveillance
        fields = '__all__'
