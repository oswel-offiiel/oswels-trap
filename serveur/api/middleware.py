"""CORS minimal : le jeu (une page web) peut appeler l'API depuis une autre adresse."""
from django.conf import settings
from django.http import HttpResponse


class SimpleCors:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith('/api/'):
            return self.get_response(request)
        if request.method == 'OPTIONS':
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        origin = request.headers.get('Origin')
        allowed = settings.CORS_ORIGINS
        if '*' in allowed:
            response['Access-Control-Allow-Origin'] = '*'
        elif origin and origin in allowed:
            response['Access-Control-Allow-Origin'] = origin
            response['Vary'] = 'Origin'
        response['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        response['Access-Control-Max-Age'] = '86400'
        return response
