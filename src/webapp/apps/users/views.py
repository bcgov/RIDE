from django.middleware.csrf import get_token
from rest_framework.views import APIView
from django.http import JsonResponse

class session(APIView):
    def get(self, request, format=None):
        if request.user.is_authenticated:
            response = JsonResponse({
                "username": request.user.username,
                "email": request.user.email,
            })

        else:
            response = JsonResponse({"username": None})

        response.set_cookie('csrftoken', get_token(request, ))
        return response
