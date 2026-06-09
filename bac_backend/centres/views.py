from rest_framework import viewsets
from .models import Centre
from .serializers import CentreSerializer


class CentreViewSet(viewsets.ModelViewSet):

    queryset = Centre.objects.all()
    serializer_class = CentreSerializer
