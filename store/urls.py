from django.urls import path

from .views import (
    CategoryListView,
    DeliveryView,
    ProductDetailView,
    ProductListView,
    SimilarProductsView,
)

urlpatterns = [
    path('api/categories/',                  CategoryListView.as_view(),    name='category-list'),
    path('api/products/',                    ProductListView.as_view(),     name='product-list'),
    path('api/products/<int:pk>/',           ProductDetailView.as_view(),   name='product-detail'),
    path('api/products/<int:pk>/similar/',   SimilarProductsView.as_view(), name='product-similar'),
    path('api/delivery/',                    DeliveryView.as_view(),        name='delivery'),
]