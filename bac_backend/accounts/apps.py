from django.apps import AppConfig


class AccountsConfig(AppConfig):
    name = 'accounts'

    def ready(self):
        try:
            from .models import User
            u, created = User.objects.get_or_create(
                username="admin",
                defaults={
                    "role": "directeur",
                    "centre": "test",
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            u.set_password("admin123")
            u.is_active = True
            u.is_staff = True
            u.is_superuser = True
            u.role = "directeur"
            u.centre = "test"
            u.save()
        except Exception:
            pass  # DB not ready yet (first migration, etc.)
