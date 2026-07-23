from datetime import date, timedelta

from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from decimal import Decimal

from .models import Category, DeliveryOption, Product
from .serializers import (
    CategorySerializer,
    DeliveryOptionSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


# Helpers

def _product_list_queryset():
    """Base queryset for product listings — avoids N+1 on all list views."""
    return (
        Product.objects
        .select_related('category', 'subcategory')
        .prefetch_related('images', 'variants')
    )

#  GET /api/categories/

class CategoryListView(ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.prefetch_related('subcategories').all()


#  GET /api/products/

class ProductListView(ListAPIView):
    serializer_class = ProductListSerializer

    def get_queryset(self):
        qs = _product_list_queryset()

        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(name__icontains=search)

        category = self.request.query_params.get('category', '').strip()
        if category:
            qs = qs.filter(category__slug=category)

        subcategory = self.request.query_params.get('subcategory', '').strip()
        if subcategory:
            qs = qs.filter(subcategory__slug=subcategory)

        return qs


#  GET /api/products/<int:pk>/

class ProductDetailView(RetrieveAPIView):
    serializer_class = ProductDetailSerializer

    def get_queryset(self):
        return (
            Product.objects
            .select_related('category', 'subcategory')
            .prefetch_related('images', 'variants', 'category__subcategories')
        )


#  GET /api/products/<int:pk>/similar/

class SimilarProductsView(APIView):
    """
    Returns up to 6 products similar to the requested product.

    Primary pass  — same subcategory, in stock, within ±30% price range.
    Fallback pass — if primary returns fewer than 3 results, top up to 6
                    from the same category (different subcategory), in stock.
    Current product is excluded from both passes.
    """

    def get(self, request, pk):
        try:
            product = (
                Product.objects
                .select_related('category', 'subcategory')
                .get(pk=pk)
            )
        except Product.DoesNotExist:
            return Response(
                {'error': 'Product not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        price       = product.base_price
        price_min   = price * Decimal('0.70')
        price_max   = price * Decimal('1.30')
        

        # --- Primary: same subcategory, in-stock, ±30% price ---
        primary_qs = (
            _product_list_queryset()
            .filter(subcategory=product.subcategory)
            .exclude(pk=product.pk)
            .filter(variants__stock_quantity__gt=0)
            .filter(base_price__gte=price_min, base_price__lte=price_max)
            .distinct()
        )
        primary_results = list(primary_qs[:6])

        combined = primary_results

        # --- Fallback: same category, different subcategory, in-stock ---
        # Only runs when primary yields fewer than 3 results.
        if len(primary_results) < 3:
            needed = 6 - len(primary_results)

            # Collect IDs already in combined to exclude them below.
            existing_ids = [p.pk for p in combined] + [product.pk]

            fallback_qs = (
                _product_list_queryset()
                .filter(category=product.category)
                .exclude(subcategory=product.subcategory)
                .exclude(pk__in=existing_ids)
                .filter(variants__stock_quantity__gt=0)
                .distinct()
            )
            fallback_results = list(fallback_qs[:needed])
            combined = combined + fallback_results

        serializer = ProductListSerializer(combined, many=True)
        return Response(serializer.data)

# GET /api/delivery/?country=PK

class DeliveryView(APIView):

    WEEKDAY_NAMES = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday',
    ]
    MONTH_ABBRS = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]

    def _format_date(self, d):
        """Format a date as e.g. 'Monday, Jul 28'."""
        weekday = self.WEEKDAY_NAMES[d.weekday()]
        month   = self.MONTH_ABBRS[d.month]
        return f'{weekday}, {month} {d.day}'

    def _next_business_day(self, d):
        """Shift Saturday or Sunday forward to Monday."""
        if d.weekday() == 5:   # Saturday
            return d + timedelta(days=2)
        if d.weekday() == 6:   # Sunday
            return d + timedelta(days=1)
        return d

    def get(self, request):
        country_code = request.query_params.get('country', '').strip().upper()

        if not country_code:
            return Response(
                {'error': 'country query parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            delivery = DeliveryOption.objects.get(country_code=country_code)
        except DeliveryOption.DoesNotExist:
            return Response(
                {'error': 'Delivery not available for this country'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Compute estimated arrival: today + max days, skip weekends
        arrival = date.today() + timedelta(days=delivery.estimated_days_max)
        arrival = self._next_business_day(arrival)

        data = DeliveryOptionSerializer(delivery).data
        data['estimated_arrival_date'] = self._format_date(arrival)

        return Response(data)