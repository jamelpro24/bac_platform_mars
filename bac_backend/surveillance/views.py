from rest_framework import viewsets
from .models import Surveillance
from .serializers import SurveillanceSerializer

class SurveillanceViewSet(viewsets.ModelViewSet):
    queryset = Surveillance.objects.all()
    serializer_class = SurveillanceSerializer
