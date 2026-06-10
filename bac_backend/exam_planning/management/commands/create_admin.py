from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = "Create or update admin superuser"

    def handle(self, *args, **options):
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
        self.stdout.write(self.style.SUCCESS(f"admin {'created' if created else 'updated'}"))
