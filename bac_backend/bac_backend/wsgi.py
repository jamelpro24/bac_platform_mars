import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bac_backend.settings')

application = get_wsgi_application()

# Auto-create admin superuser on startup
try:
    from accounts.models import User
    u, created = User.objects.get_or_create(
        username="admin",
        defaults={"role": "directeur", "centre": "test", "is_staff": True, "is_superuser": True},
    )
    u.set_password("admin123")
    u.is_active = True
    u.is_staff = True
    u.is_superuser = True
    u.role = "directeur"
    u.centre = "test"
    u.save()
except Exception:
    pass
