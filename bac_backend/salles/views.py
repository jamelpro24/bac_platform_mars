
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Salle
from .serializers import SalleSerializer

class SalleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Salle.objects.all()
    serializer_class = SalleSerializer
    
    def get_queryset(self):
        return Salle.objects.all()
    
    def perform_create(self, serializer):
        from centres.models import Centre
        centre = Centre.objects.first()
        if not centre:
            centre = Centre.objects.create(nom="مركز الامتحان", adresse="")
        serializer.save(centre=centre, capacite=30)
