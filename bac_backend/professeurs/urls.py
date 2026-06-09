from rest_framework.routers import DefaultRouter

from .views import ProfesseurViewSet

router = DefaultRouter()
# Included under `/api/professeurs/` in the main urls.py, so we register at root here.
router.register(r"", ProfesseurViewSet, basename="professeur")

urlpatterns = router.urls
