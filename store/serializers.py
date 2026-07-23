from rest_framework import serializers
from .models import Category, Subcategory, Product, ProductImage, ProductVariant, DeliveryOption


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