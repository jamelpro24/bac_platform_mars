from rest_framework import serializers

from .models import Professeur


class ProfSerializer(serializers.ModelSerializer):
    centre_name = serializers.CharField(source="centre.centre", read_only=True)

    class Meta:
        model = Professeur
        fields = "__all__"
        extra_kwargs = {
            # Centre is resolved server-side in the viewset.
            "centre": {"read_only": True},
        }
