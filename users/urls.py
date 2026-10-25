from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    ProfileView,
    ChangePasswordView,
)

urlpatterns = [
    path('api/auth/register/',        RegisterView.as_view(),       name='auth-register'),
    path('api/auth/login/',           LoginView.as_view(),          name='auth-login'),
    path('api/auth/logout/',          LogoutView.as_view(),         name='auth-logout'),
    path('api/auth/me/',              ProfileView.as_view(),        name='auth-profile'),
    path('api/auth/token/refresh/',   TokenRefreshView.as_view(),   name='auth-token-refresh'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
]