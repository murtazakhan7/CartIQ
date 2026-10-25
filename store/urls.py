from django.urls import path

from .views import (
    CategoryListView,
    ProductListView,
    ProductDetailView,
    SimilarProductsView,
    DeliveryView,
    CartView,
    CartItemAddView,
    CartItemDetailView,
    CartClearView,
    PromoValidateView,
    OrderView,
    OrderDetailView,

)

urlpatterns = [
    path('api/categories/',                  CategoryListView.as_view(),    name='category-list'),
    path('api/products/',                    ProductListView.as_view(),     name='product-list'),
    path('api/products/<int:pk>/',           ProductDetailView.as_view(),   name='product-detail'),
    path('api/products/<int:pk>/similar/',   SimilarProductsView.as_view(), name='product-similar'),
    path('api/delivery/',                    DeliveryView.as_view(),        name='delivery'),
    path('api/cart/',                        CartView.as_view(),           name='cart'),
    path('api/cart/items/',                  CartItemAddView.as_view(),    name='cart-item-add'),
    path('api/promo/validate/', PromoValidateView.as_view(), name='promo-validate'),
    path('api/cart/clear/',                  CartClearView.as_view(),      name='cart-clear'),
    path('api/cart/items/<int:item_id>/', CartItemDetailView.as_view(), name='cart-item-detail'),
    path('api/orders/',                OrderView.as_view(),       name='orders'),
    path('api/orders/<int:order_id>/', OrderDetailView.as_view(), name='order-detail'),
]