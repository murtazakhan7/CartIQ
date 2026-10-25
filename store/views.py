from datetime import date, timedelta

from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from decimal import Decimal
from rest_framework.permissions import IsAuthenticated
from django.db import transaction


from .models import Category, DeliveryOption, Product, Cart, CartItem, Order, OrderItem
from .serializers import (
    CategorySerializer,
    DeliveryOptionSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    CartSerializer,
    CartItemCreateSerializer,
    CartItemUpdateSerializer,
    PromoCodeSerializer,
    OrderSerializer,
    OrderCreateSerializer,
)


# Helpers

import hashlib

def calculate_promo_discount(code):
    hash_val = int(hashlib.md5(
        code.strip().upper().encode()
    ).hexdigest(), 16)
    return (hash_val % 16) + 5  # always returns 5 to 20

def _product_list_queryset():
    """Base queryset for product listings — avoids N+1 on all list views."""
    return (
        Product.objects
        .select_related('category', 'subcategory')
        .prefetch_related('images', 'variants')
    )
# ---------------------------------------------------------------------------
# Order helpers
# ---------------------------------------------------------------------------

def _get_delivery_for_country(country_name):
    """
    Fetch DeliveryOption by country name (case-insensitive).
    Falls back to Pakistan if not found.
    """
    delivery = DeliveryOption.objects.filter(
        country_name__iexact=country_name
    ).first()
    if not delivery:
        delivery = DeliveryOption.objects.filter(
            country_code='PK'
        ).first()
    return delivery


def _prefetch_orders(qs):
    return qs.prefetch_related(
        'items__product__images',
        'items__product__category',
        'items__product__subcategory',
        'items__variant',
    )

#  GET /api/categories/

class CategoryListView(ListAPIView):
    serializer_class = CategorySerializer
    pagination_class = None

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
# ---------------------------------------------------------------------------
# Cart helper
# ---------------------------------------------------------------------------

def _get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def _delivery_context(user):
    """
    Build delivery context for CartSerializer.
    Uses user's saved country if available, falls back to PK.
    """
    delivery = None
    try:
        if user.has_country:
            delivery = DeliveryOption.objects.filter(
                country_name__iexact=user.country
            ).first() or DeliveryOption.objects.filter(
                country_code__iexact=user.country
            ).first()
        if not delivery:
            delivery = DeliveryOption.objects.get(country_code='PK')
    except DeliveryOption.DoesNotExist:
        return {}

    arrival = date.today() + timedelta(days=delivery.estimated_days_max)
    # Reuse weekend shift logic from DeliveryView
    if arrival.weekday() == 5:
        arrival = arrival + timedelta(days=2)
    elif arrival.weekday() == 6:
        arrival = arrival + timedelta(days=1)

    month_abbrs = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]
    weekday_names = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday',
    ]
    formatted = f'{weekday_names[arrival.weekday()]}, {month_abbrs[arrival.month]} {arrival.day}'

    return {
        'flat_fee':               delivery.flat_fee,
        'estimated_arrival_date': formatted,
        'country_name':           delivery.country_name,
    }


def _cart_response(user, request):
    cart = _get_or_create_cart(user)
    cart_qs = Cart.objects.prefetch_related(
        'items__product__images',
        'items__product__variants',
        'items__product__category',
        'items__product__subcategory',
        'items__variant',
    ).get(pk=cart.pk)
    delivery = _delivery_context(user)
    serializer = CartSerializer(
        cart_qs,
        context={'request': request, 'delivery': delivery},
    )
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# GET /api/cart/
# ---------------------------------------------------------------------------

class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return _cart_response(request.user, request)


# ---------------------------------------------------------------------------
# POST /api/cart/items/
# ---------------------------------------------------------------------------

class CartItemAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CartItemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        cart    = _get_or_create_cart(request.user)
        variant = serializer.validated_data['variant']
        product = serializer.validated_data['product']
        qty     = serializer.validated_data['quantity']

        existing = CartItem.objects.filter(cart=cart, variant=variant).first()
        if existing:
            existing.quantity = min(existing.quantity + qty, 10)
            existing.save()
        else:
            CartItem.objects.create(
                cart=cart, product=product, variant=variant, quantity=qty
            )

        return _cart_response(request.user, request)


# ---------------------------------------------------------------------------
# DELETE /api/cart/clear/
# ---------------------------------------------------------------------------

class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id):
        try:
            item = CartItem.objects.get(pk=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CartItemUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        item.quantity = serializer.validated_data['quantity']
        item.save()
        return _cart_response(request.user, request)

    def delete(self, request, item_id):
        try:
            item = CartItem.objects.get(pk=item_id, cart__user=request.user)
        except CartItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

        item.delete()
        return _cart_response(request.user, request)
    
class CartClearView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        cart = _get_or_create_cart(request.user)
        cart.items.all().delete()
        return _cart_response(request.user, request)

# ---------------------------------------------------------------------------
# POST /api/promo/validate/
# ---------------------------------------------------------------------------

class PromoValidateView(APIView):

    def post(self, request):
        serializer = PromoCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code             = serializer.validated_data['code']
        discount_percent = calculate_promo_discount(code)

        discount_amount      = None
        discounted_subtotal  = None

        if request.user.is_authenticated:
            try:
                cart     = Cart.objects.prefetch_related('items__product').get(
                    user=request.user
                )
                subtotal = sum(item.subtotal for item in cart.items.all())
                discount_amount     = round(subtotal * discount_percent / 100, 2)
                discounted_subtotal = round(subtotal - discount_amount, 2)
            except Cart.DoesNotExist:
                pass

        return Response({
            'code':                 code,
            'discount_percent':     discount_percent,
            'discount_amount':      discount_amount,
            'discounted_subtotal':  discounted_subtotal,
        })

# ---------------------------------------------------------------------------
# POST /api/orders/
# ---------------------------------------------------------------------------

class OrderView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = _prefetch_orders(Order.objects.filter(user=request.user))
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user             = request.user
        promo_code       = serializer.validated_data.get('promo_code', '').strip()
        override_address = serializer.validated_data.get('override_address')

        cart  = _get_or_create_cart(user)
        items = list(cart.items.select_related('product', 'variant').all())
        if not items:
            return Response(
                {'error': 'Your cart is empty'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if override_address:
            delivery_country      = override_address.get('country', '')
            delivery_province     = override_address.get('province', '')
            delivery_city         = override_address.get('city', '')
            delivery_address_line = override_address.get('address_line', '')
            delivery_postal_code  = override_address.get('postal_code', '')
            used_saved_address    = False
        elif user.has_complete_address:
            delivery_country      = user.country
            delivery_province     = user.province
            delivery_city         = user.city
            delivery_address_line = user.address_line
            delivery_postal_code  = user.postal_code
            used_saved_address    = True
        else:
            return Response(
                {'error': 'Please add a delivery address to your profile before placing an order'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delivery_option  = _get_delivery_for_country(delivery_country)
        delivery_fee     = delivery_option.flat_fee if delivery_option else 0
        subtotal         = sum(item.quantity * item.product.base_price for item in items)
        discount_percent = 0
        discount_amount  = 0

        if promo_code:
            discount_percent = calculate_promo_discount(promo_code)
            discount_amount  = round(subtotal * discount_percent / 100, 2)

        total_amount = subtotal + delivery_fee - discount_amount

        with transaction.atomic():
            order = Order.objects.create(
                user                  = user,
                subtotal              = subtotal,
                delivery_fee          = delivery_fee,
                discount_amount       = discount_amount,
                discount_percent      = discount_percent,
                promo_code            = promo_code,
                total_amount          = total_amount,
                delivery_country      = delivery_country,
                delivery_province     = delivery_province,
                delivery_city         = delivery_city,
                delivery_address_line = delivery_address_line,
                delivery_postal_code  = delivery_postal_code,
                used_saved_address    = used_saved_address,
            )
            for item in items:
                OrderItem.objects.create(
                    order             = order,
                    product           = item.product,
                    variant           = item.variant,
                    quantity          = item.quantity,
                    price_at_purchase = item.product.base_price,
                )
            cart.items.all().delete()

        order = _prefetch_orders(Order.objects.filter(pk=order.pk)).first()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

# ---------------------------------------------------------------------------
# GET /api/orders/{order_id}/
# ---------------------------------------------------------------------------

class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        try:
            order = _prefetch_orders(
                Order.objects.filter(pk=order_id, user=request.user)
            ).first()
            if not order:
                raise Order.DoesNotExist
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(OrderSerializer(order).data)