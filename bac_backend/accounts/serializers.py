from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        # informations utiles
        token["user_id"] = user.id
        token["username"] = user.username
        token["role"] = user.role
        token["centre"] = user.centre

        return token