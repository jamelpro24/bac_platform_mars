from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import LoginView

try:
    from surveillance.views import SurveillanceViewSet
    router = DefaultRouter()
    router.register(r'surveillances', SurveillanceViewSet)
except ImportError:
    router = DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/', include(router.urls)),
    path('api/', include('exam_planning.urls')),
    path('api/professeurs/', include('professeurs.urls')),
]
