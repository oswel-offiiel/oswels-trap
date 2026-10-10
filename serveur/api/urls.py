from django.urls import path

from . import views

urlpatterns = [
    path('ping/', views.ping),
    path('scores/', views.scores),
    path('scores/top/', views.top),
    path('bugs/', views.bugs),
    path('saves/', views.saves),
    path('saves/<str:code>/', views.save_detail),
]
