from django.db import models
from django.conf import settings

SIZE_CHOICES = [
    ('XS', 'XS'),
    ('S', 'S'),
    ('M', 'M'),
    ('L', 'L'),
    ('XL', 'XL'),
    ('XXL', 'XXL'),
]

ORDER_STATUS_CHOICES = [
    ('pending',   'Pending'),
    ('confirmed', 'Confirmed'),
    ('shipped',   'Shipped'),
    ('delivered', 'Delivered'),
]

SIZE_ORDER = {'XS': 0, 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5}


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Subcategory(models.Model):
    category = models.ForeignKey(
        Category,
        related_name='subcategories',
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'subcategories'

    def __str__(self):
        return f'{self.category.name} → {self.name}'


class Product(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(
        Category,
        related_name='products',
        on_delete=models.CASCADE,
    )
    subcategory = models.ForeignKey(
        Subcategory,
        related_name='products',
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='images',
        on_delete=models.CASCADE,
    )
    image_url = models.URLField(max_length=500)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f'{self.product.name} — image #{self.order}'


class ProductVariant(models.Model):
    product = models.ForeignKey(
        Product,
        related_name='variants',
        on_delete=models.CASCADE,
    )
    size = models.CharField(max_length=10, choices=SIZE_CHOICES)
    stock_quantity = models.IntegerField(default=0)

    class Meta:
        ordering = [
            models.Case(
                *[
                    models.When(size=size, then=models.Value(order))
                    for size, order in SIZE_ORDER.items()
                ],
                output_field=models.IntegerField(),
            )
        ]

    def __str__(self):
        return f'{self.product.name} — {self.size} ({self.stock_quantity} in stock)'


class DeliveryOption(models.Model):
    country_code = models.CharField(max_length=3, unique=True)
    country_name = models.CharField(max_length=100)
    estimated_days_min = models.IntegerField()
    estimated_days_max = models.IntegerField()
    flat_fee = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['country_name']

    def __str__(self):
        return f'{self.country_name} ({self.country_code}) — {self.estimated_days_min}–{self.estimated_days_max} days'

class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name='cart',
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Cart of {self.user.email}'

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        related_name='items',
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        related_name='cart_items',
        on_delete=models.CASCADE,
    )
    variant = models.ForeignKey(
        ProductVariant,
        related_name='cart_items',
        on_delete=models.CASCADE,
    )
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'variant')

    def __str__(self):
        return f'{self.quantity}x {self.product.name} ({self.variant.size})'

    @property
    def subtotal(self):
        return self.quantity * self.product.base_price


class Order(models.Model):
    user                  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='orders',
        on_delete=models.CASCADE,
    )
    status                = models.CharField(
        max_length=20,
        choices=ORDER_STATUS_CHOICES,
        default='pending',
    )
    subtotal              = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee          = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount          = models.DecimalField(max_digits=10, decimal_places=2)
    promo_code            = models.CharField(max_length=50, blank=True)
    discount_percent      = models.IntegerField(default=0)
    delivery_country      = models.CharField(max_length=100)
    delivery_province     = models.CharField(max_length=100, blank=True)
    delivery_city         = models.CharField(max_length=100, blank=True)
    delivery_address_line = models.CharField(max_length=255, blank=True)
    delivery_postal_code  = models.CharField(max_length=20, blank=True)
    used_saved_address    = models.BooleanField(default=True)
    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Order #{self.id} by {self.user.email} — {self.status}'


class OrderItem(models.Model):
    order               = models.ForeignKey(
        Order,
        related_name='items',
        on_delete=models.CASCADE,
    )
    product             = models.ForeignKey(
        Product,
        related_name='order_items',
        on_delete=models.CASCADE,
    )
    variant             = models.ForeignKey(
        ProductVariant,
        related_name='order_items',
        on_delete=models.CASCADE,
    )
    quantity            = models.PositiveIntegerField()
    price_at_purchase   = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.quantity}x {self.product.name} ({self.variant.size})'

    @property
    def subtotal(self):
        return self.quantity * self.price_at_purchase

class Wishlist(models.Model):
    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='wishlist',
        on_delete=models.CASCADE,
    )
    product = models.ForeignKey(
        Product,
        related_name='wishlisted_by',
        on_delete=models.CASCADE,
    )
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')
        ordering        = ['-added_at']

    def __str__(self):
        return f'{self.user.email} → {self.product.name}'