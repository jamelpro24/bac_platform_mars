from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenSerializer

class LoginView(TokenObtainPairView):
    serializer_class = MyTokenSerializer