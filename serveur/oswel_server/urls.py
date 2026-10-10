from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),   # pour voir les scores, les bugs et les sauvegardes
    path('api/', include('api.urls')),
]
