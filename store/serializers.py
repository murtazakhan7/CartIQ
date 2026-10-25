from rest_framework import serializers
from .models import Category, Subcategory, Product, ProductImage, ProductVariant, DeliveryOption, Cart, CartItem

class SubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcategory
        fields = ['id', 'name', 'slug']


class CategorySerializer(serializers.ModelSerializer):
    subcategories = SubcategorySerializer(many=True, read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'subcategories']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image_url', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'stock_quantity', 'status']

    def get_status(self, obj):
        if obj.stock_quantity == 0:
            return 'out_of_stock'
        elif obj.stock_quantity <= 3:
            return 'low_stock'
        return 'in_stock'


# ProductListSerializer
# View must use:
#   select_related('category', 'subcategory')
#   prefetch_related('images', 'variants')
class ProductListSerializer(serializers.ModelSerializer):
    category    = serializers.SerializerMethodField()
    subcategory = serializers.SerializerMethodField()
    thumbnail   = serializers.SerializerMethodField()
    has_any_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'base_price', 'category', 'subcategory',
                  'thumbnail', 'has_any_stock']

    def get_category(self, obj):
        return obj.category.name

    def get_subcategory(self, obj):
        return obj.subcategory.name

    def get_thumbnail(self, obj):
        # images are already prefetched and ordered by 'order' via Meta
        images = obj.images.all()
        for image in images:
            if image.order == 0:
                return image.image_url
        # fall back to first image if no order=0 image exists
        return images[0].image_url if images else None

    def get_has_any_stock(self, obj):
        return any(v.stock_quantity > 0 for v in obj.variants.all())


# ProductDetailSerializer
# View must use:
#   select_related('category', 'subcategory')
#   prefetch_related('images', 'variants', 'category__subcategories')
class ProductDetailSerializer(serializers.ModelSerializer):
    category    = CategorySerializer(read_only=True)
    subcategory = SubcategorySerializer(read_only=True)
    images      = ProductImageSerializer(many=True, read_only=True)
    variants    = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'base_price',
                  'category', 'subcategory', 'images', 'variants']


class DeliveryOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryOption
        fields = ['id', 'country_code', 'country_name',
                  'estimated_days_min', 'estimated_days_max', 'flat_fee']

class CartItemSerializer(serializers.ModelSerializer):
    product  = ProductListSerializer(read_only=True)
    variant  = ProductVariantSerializer(read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model  = CartItem
        fields = ['id', 'product', 'variant', 'quantity', 'subtotal']

    def get_subtotal(self, obj):
        return obj.subtotal


class CartItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity   = serializers.IntegerField(default=1, min_value=1, max_value=10)

    def validate(self, data):
        try:
            variant = ProductVariant.objects.select_related('product').get(
                pk=data['variant_id']
            )
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError('Variant not found.')

        if variant.product_id != data['product_id']:
            raise serializers.ValidationError(
                'This size is not available for this product.'
            )

        if variant.stock_quantity == 0:
            raise serializers.ValidationError(
                'This size is currently out of stock.'
            )

        data['variant'] = variant
        data['product'] = variant.product
        return data


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=10)


class CartSerializer(serializers.ModelSerializer):
    items                  = CartItemSerializer(many=True, read_only=True)
    total_items            = serializers.SerializerMethodField()
    subtotal               = serializers.SerializerMethodField()
    delivery_fee           = serializers.SerializerMethodField()
    estimated_arrival_date = serializers.SerializerMethodField()
    delivery_country_name  = serializers.SerializerMethodField()
    total                  = serializers.SerializerMethodField()

    class Meta:
        model  = Cart
        fields = [
            'id', 'items', 'total_items', 'subtotal',
            'delivery_fee', 'estimated_arrival_date',
            'delivery_country_name', 'total',
        ]

    def get_total_items(self, obj):
        return obj.total_items

    def get_subtotal(self, obj):
        return sum(item.subtotal for item in obj.items.all())

    def _get_delivery(self):
        return self.context.get('delivery')

    def get_delivery_fee(self, obj):
        delivery = self._get_delivery()
        return delivery['flat_fee'] if delivery else None

    def get_estimated_arrival_date(self, obj):
        delivery = self._get_delivery()
        return delivery['estimated_arrival_date'] if delivery else None

    def get_delivery_country_name(self, obj):
        delivery = self._get_delivery()
        return delivery['country_name'] if delivery else None

    def get_total(self, obj):
        delivery = self._get_delivery()
        if delivery is None:
            return None
        return self.get_subtotal(obj) + delivery['flat_fee']

class PromoCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)

    def validate_code(self, value):
        if not value.strip():
            raise serializers.ValidationError('Promo code cannot be empty.')
        return value.strip().upper()