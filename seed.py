import os
import sys
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from store.models import Category, Subcategory, Product, ProductImage, ProductVariant, DeliveryOption

# ---------------------------------------------------------------------------
# Data definitions
# ---------------------------------------------------------------------------

CATEGORIES = [
    {
        'name': 'Women',
        'slug': 'women',
        'subcategories': [
            {'name': 'Kurtas',     'slug': 'women-kurtas'},
            {'name': 'Dresses',    'slug': 'women-dresses'},
            {'name': 'Lawn Suits', 'slug': 'women-lawn-suits'},
        ],
    },
    {
        'name': 'Men',
        'slug': 'men',
        'subcategories': [
            {'name': 'Formal Shirts',   'slug': 'men-formal-shirts'},
            {'name': 'Shalwar Kameez',  'slug': 'men-shalwar-kameez'},
        ],
    },
    {
        'name': 'Kids',
        'slug': 'kids',
        'subcategories': [
            {'name': 'Girls', 'slug': 'kids-girls'},
            {'name': 'Boys',  'slug': 'kids-boys'},
        ],
    },
    {
        'name': 'Unstitched',
        'slug': 'unstitched',
        'subcategories': [
            {'name': 'Lawn', 'slug': 'unstitched-lawn'},
        ],
    },
]

DELIVERY_OPTIONS = [
    {'country_code': 'PK', 'country_name': 'Pakistan',        'estimated_days_min': 3,  'estimated_days_max': 5,  'flat_fee': '150'},
    {'country_code': 'AE', 'country_name': 'UAE',             'estimated_days_min': 5,  'estimated_days_max': 7,  'flat_fee': '800'},
    {'country_code': 'GB', 'country_name': 'United Kingdom',  'estimated_days_min': 10, 'estimated_days_max': 14, 'flat_fee': '2000'},
    {'country_code': 'US', 'country_name': 'United States',   'estimated_days_min': 12, 'estimated_days_max': 16, 'flat_fee': '2500'},
]

# (name, description, base_price)
PRODUCTS = {
    ('Women', 'Kurtas'): [
        (
            'Embroidered Lawn Kurta with Trouser',
            'A lightweight lawn kurta featuring intricate machine embroidery on the neckline and sleeves. '
            'Paired with a matching printed trouser, perfect for casual daywear and festive gatherings.',
            3200,
        ),
        (
            'Digital Print Chiffon Kurta',
            'This chiffon kurta showcases a vibrant digital floral print in rich jewel tones. '
            'The flowy silhouette and delicate fabric make it ideal for semi-formal occasions and family events.',
            4500,
        ),
        (
            'Hand Embroidered Cotton Kurta',
            'Crafted from breathable cotton, this kurta is adorned with hand embroidery in traditional motifs. '
            'A timeless piece suitable for Eid celebrations and cultural events.',
            5800,
        ),
        (
            'Printed Karandi Kurta with Dupatta',
            'A warm karandi kurta with an all-over geometric print, paired with a coordinating dupatta. '
            'Designed for winter comfort while maintaining a polished, elegant look.',
            3700,
        ),
        (
            'Plain Linen Long Kurta',
            'A minimalist linen kurta in a relaxed long silhouette, perfect for everyday wear. '
            'The breathable fabric and clean lines offer effortless style for office or casual outings.',
            2700,
        ),
        (
            'Organza Embroidered Kurta Set',
            'A luxurious organza kurta with intricate thread embroidery across the front panel. '
            'This statement piece is designed for formal dinners and wedding events.',
            5500,
        ),
        (
            'Casual Lawn Printed Kurta',
            'A breezy lawn kurta with a contemporary floral print in soft pastel shades. '
            'Easy to style for daywear, brunch, or casual family outings.',
            2600,
        ),
        (
            'Silk Blend Festive Kurta',
            'Made from a luxurious silk blend, this festive kurta features subtle zari work along the hem. '
            'An elegant choice for weddings, mehndis, and special celebrations.',
            5900,
        ),
    ],
    ('Women', 'Dresses'): [
        (
            'Floral Print Chiffon Maxi Dress',
            'A flowing chiffon maxi dress in a romantic floral print, perfect for summer events. '
            'The lightweight fabric and relaxed fit make it comfortable for all-day wear.',
            4200,
        ),
        (
            'Embroidered Organza Formal Dress',
            'A structured organza dress with delicate hand embroidery on the bodice and sleeves. '
            'Designed for formal dinners, walimas, and upscale social gatherings.',
            7500,
        ),
        (
            'Lawn Casual Shirt Dress',
            'A casual shirt dress in printed lawn, featuring a button-front design and relaxed silhouette. '
            'Perfect for everyday wear, weekend outings, and brunch dates.',
            3100,
        ),
        (
            'Digital Print Silk Midi Dress',
            'A midi-length dress in a rich silk-blend fabric with a bold digital print. '
            'Effortlessly transitions from office wear to evening events.',
            6800,
        ),
        (
            'Cotton A-Line Casual Dress',
            'A simple and versatile A-line dress in breathable cotton, available in subtle block prints. '
            'An everyday essential that pairs well with sandals or sneakers.',
            3200,
        ),
        (
            'Karandi Printed Winter Dress',
            'A warm karandi dress featuring an all-over geometric print in earthy tones. '
            'Ideal for winter outings, festivals, and cultural events.',
            4600,
        ),
    ],
    ('Women', 'Lawn Suits'): [
        (
            'Printed Lawn 3-Piece Suit',
            'A classic 3-piece lawn suit with a printed shirt, coordinating trouser, and chiffon dupatta. '
            'Ideal for the summer season and daytime gatherings.',
            4000,
        ),
        (
            'Embroidered Lawn Suit with Chiffon Dupatta',
            'This premium lawn suit features embroidery on the shirt yoke and sleeves, paired with a printed trouser '
            'and sheer chiffon dupatta. Perfect for semi-formal events.',
            6500,
        ),
        (
            'Digital Print Luxury Lawn Suit',
            'A luxury lawn suit with a vibrant digital print on the shirt and a contrasting printed trouser. '
            'The soft fabric ensures comfort throughout the summer.',
            5800,
        ),
        (
            'Hand Embroidered Premium Lawn Suit',
            'Featuring hand embroidery in traditional floral patterns, this premium lawn suit is crafted for special occasions. '
            'Comes with a matching organza dupatta.',
            8500,
        ),
        (
            'Casual Printed Lawn Co-ord Set',
            'A coordinated lawn co-ord set featuring a relaxed-fit printed shirt and matching trouser. '
            'A practical and stylish choice for everyday summer dressing.',
            3600,
        ),
        (
            'Festive Embroidered Lawn 3-Piece',
            'A festive lawn suit with intricate embroidery on the neckline and borders, paired with a printed trouser '
            'and silk-blend dupatta. Designed for Eid and mehndi events.',
            7200,
        ),
    ],
    ('Men', 'Formal Shirts'): [
        (
            "Men's Formal Oxford Shirt",
            'A classic Oxford weave formal shirt with a slim-fit silhouette and button-down collar. '
            'A wardrobe staple for the modern professional, available in crisp white and light blue.',
            2200,
        ),
        (
            "Men's Linen Formal Shirt",
            'A breathable linen formal shirt with a subtle texture and relaxed fit. '
            'Ideal for summer office wear and semi-formal occasions.',
            2800,
        ),
        (
            "Men's Poplin Dress Shirt",
            'A smooth poplin dress shirt with a spread collar and French tuck-friendly length. '
            'Designed for formal meetings, dinners, and business events.',
            1900,
        ),
        (
            "Men's Cotton Slim-Fit Formal Shirt",
            'A slim-fit cotton formal shirt with subtle micro-check pattern and barrel cuffs. '
            'Perfect for the office and semi-formal evening events.',
            2500,
        ),
        (
            "Men's Twill Weave Formal Shirt",
            'A premium twill weave shirt offering a soft hand feel and elegant drape. '
            'Pairs well with dress trousers and waistcoats for formal functions.',
            3600,
        ),
        (
            "Men's Embroidered Panjabi Collar Shirt",
            'A formal shirt with subtle embroidery on the collar and placket, blending eastern and western styles. '
            'Suitable for semi-formal gatherings and cultural events.',
            3900,
        ),
    ],
    ('Men', 'Shalwar Kameez'): [
        (
            'Karandi Shalwar Kameez',
            'A classic karandi shalwar kameez in a subtle self-stripe pattern, perfect for winter wear. '
            'The heavyweight fabric provides warmth while maintaining a formal, polished appearance.',
            3500,
        ),
        (
            'Embroidered Lawn Shalwar Kameez',
            'A summer-ready lawn shalwar kameez with machine embroidery on the kurta yoke and hem. '
            'Lightweight and breathable, ideal for Eid celebrations and casual gatherings.',
            2800,
        ),
        (
            'Printed Cotton Shalwar Kameez',
            'A comfortable cotton shalwar kameez in a clean printed design. '
            'An everyday staple that offers ease of movement and a traditional aesthetic.',
            2600,
        ),
        (
            'Khaddar Embroidered Shalwar Kameez',
            'A premium khaddar shalwar kameez with detailed thread embroidery on the chest and sleeves. '
            'Designed for winter formal events, family functions, and Eid gatherings.',
            5500,
        ),
        (
            "Men's Festive Jamawar Shalwar Kameez",
            'A luxurious jamawar shalwar kameez with a rich woven pattern, ideal for weddings and formal events. '
            'The intricate texture and vibrant colours make it a statement festive outfit.',
            5800,
        ),
        (
            'Linen Plain Shalwar Kameez',
            'A minimalist linen shalwar kameez in earthy neutral tones, offering a clean and contemporary look. '
            'Perfect for casual daywear, office visits, and informal gatherings.',
            2700,
        ),
    ],
    ('Kids', 'Girls'): [
        (
            'Embroidered Gharara Set for Girls',
            'A beautiful embroidered gharara set for girls, featuring intricate thread work on the shirt and flared gharara. '
            'A perfect festive outfit for Eid and family celebrations.',
            2400,
        ),
        (
            'Printed Cotton Shalwar Kameez for Girls',
            'A comfortable cotton shalwar kameez in a bright floral print for everyday wear. '
            'Easy to wear and easy to wash, ideal for school and casual outings.',
            1400,
        ),
        (
            'Festive Organza Frock with Dupatta',
            'A gorgeous organza frock with embroidered borders and a matching dupatta, designed for special occasions. '
            'This festive outfit is perfect for weddings, Eid, and mehndi events.',
            2800,
        ),
        (
            'Casual Lawn Kurta Pajama for Girls',
            'A lightweight lawn kurta pajama set in a fun printed design, perfect for summer daywear. '
            'The breathable fabric keeps girls comfortable throughout the day.',
            1600,
        ),
    ],
    ('Kids', 'Boys'): [
        (
            'Embroidered Waistcoat Shalwar Kameez Set',
            'A classic three-piece shalwar kameez set with an embroidered waistcoat for festive occasions. '
            'Ideal for Eid, weddings, and family gatherings.',
            2600,
        ),
        (
            'Printed Cotton Kurta Pajama for Boys',
            'A comfortable printed cotton kurta pajama set for everyday wear. '
            'The soft fabric and relaxed fit make it a favourite for casual outings and school events.',
            1300,
        ),
        (
            'Festive Karandi Shalwar Kameez',
            'A warm karandi shalwar kameez in a rich colour, perfect for winter celebrations. '
            'Designed for Eid, family dinners, and formal occasions.',
            2200,
        ),
        (
            'Casual Lawn Kameez Shalwar for Boys',
            'A lightweight and breathable lawn kameez shalwar set in a fun printed pattern. '
            'A versatile everyday outfit for school, play, and casual outings.',
            1500,
        ),
    ],
    ('Unstitched', 'Lawn'): [
        (
            'Printed Lawn Unstitched 3-Piece',
            'A premium printed lawn unstitched suit with a printed shirt fabric, printed trouser fabric, '
            'and a printed chiffon dupatta. Ideal for the summer season.',
            3200,
        ),
        (
            'Embroidered Lawn Unstitched 2-Piece',
            'A luxury embroidered lawn 2-piece unstitched suit featuring a heavily embroidered shirt fabric '
            'and a coordinating trouser fabric. Perfect for festive tailoring.',
            4800,
        ),
        (
            'Digital Print Lawn Unstitched Suit',
            'A vibrant digital print lawn unstitched suit with bold floral and geometric patterns. '
            'The soft fabric is easy to stitch and drapes beautifully.',
            3600,
        ),
        (
            'Hand Embroidered Khaddar Unstitched Suit',
            'A premium khaddar unstitched suit with detailed hand embroidery on the shirt fabric. '
            'A winter favourite that can be stitched to your preferred style and fit.',
            4500,
        ),
    ],
}

# Image URL patterns per (category_name, subcategory_name)
IMAGE_CONFIG = {
    ('Women', 'Kurtas'): {
        'base_url': 'http://localhost:8000/media/women/kurta{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Women', 'Dresses'): {
        'base_url': 'http://localhost:8000/media/women/dress{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Women', 'Lawn Suits'): {
        'base_url': 'http://localhost:8000/media/women/lawn{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Men', 'Formal Shirts'): {
        'base_url': 'http://localhost:8000/media/men/shirt{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Men', 'Shalwar Kameez'): {
        'base_url': 'http://localhost:8000/media/men/shalwar{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Kids', 'Girls'): {
        'base_url': 'http://localhost:8000/media/kids/girls{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Kids', 'Boys'): {
        'base_url': 'http://localhost:8000/media/kids/boys{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
    ('Unstitched', 'Lawn'): {
        'base_url': 'http://localhost:8000/media/unstitched/unstitched{n}.webp',
        'pairs': [(1, 2), (3, 4), (5, 6), (7, 8)],
    },
}

SIZE_MAP = {
    'Women':      ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    'Men':        ['S', 'M', 'L', 'XL', 'XXL'],
    'Kids':       ['S', 'M', 'L'],
    'Unstitched': ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
}


# ---------------------------------------------------------------------------
# Stock quantity helper
# ---------------------------------------------------------------------------

def random_stock():
    roll = random.random()
    if roll < 0.20:
        return 0
    elif roll < 0.35:
        return random.randint(1, 3)
    else:
        return random.randint(5, 20)


def stock_for_product(sizes):
    """Return a list of stock quantities, guaranteeing at least one > 0."""
    quantities = [random_stock() for _ in sizes]
    if all(q == 0 for q in quantities):
        quantities[random.randint(0, len(quantities) - 1)] = random.randint(5, 10)
    return quantities


# ---------------------------------------------------------------------------
# Clear helper
# ---------------------------------------------------------------------------

def clear_data():
    print('Clearing existing data...')
    ProductImage.objects.all().delete()
    ProductVariant.objects.all().delete()
    Product.objects.all().delete()
    Subcategory.objects.all().delete()
    Category.objects.all().delete()
    DeliveryOption.objects.all().delete()
    print('✓ All existing records deleted.\n')


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

def seed():
    answer = input('Clear existing data? (y/n): ').strip().lower()
    if answer == 'y':
        clear_data()

    random.seed(42)  # reproducible stock quantities

    # --- Delivery options ---
    print('Creating delivery options...')
    for opt in DELIVERY_OPTIONS:
        obj, created = DeliveryOption.objects.get_or_create(
            country_code=opt['country_code'],
            defaults={
                'country_name':        opt['country_name'],
                'estimated_days_min':  opt['estimated_days_min'],
                'estimated_days_max':  opt['estimated_days_max'],
                'flat_fee':            opt['flat_fee'],
            },
        )
        status = 'Created' if created else 'Already exists'
        print(f'  ✓ {status}: {obj}')

    print()

    # --- Categories, subcategories, products ---
    print('Creating categories...')
    total_products = 0

    for cat_data in CATEGORIES:
        cat, created = Category.objects.get_or_create(
            slug=cat_data['slug'],
            defaults={'name': cat_data['name']},
        )
        status = 'Created' if created else 'Already exists'
        print(f'  ✓ {status} category: {cat.name}')

        sizes = SIZE_MAP[cat.name]

        for sub_data in cat_data['subcategories']:
            sub, created = Subcategory.objects.get_or_create(
                slug=sub_data['slug'],
                defaults={'name': sub_data['name'], 'category': cat},
            )

            key = (cat.name, sub.name)
            products_data = PRODUCTS.get(key, [])
            img_cfg = IMAGE_CONFIG.get(key, {})
            pairs = img_cfg.get('pairs', [])
            base_url = img_cfg.get('base_url', '')

            print(f'\n  Creating products for {cat.name} > {sub.name}...')

            for idx, (name, description, base_price) in enumerate(products_data):
                product, p_created = Product.objects.get_or_create(
                    name=name,
                    defaults={
                        'description': description,
                        'base_price':  base_price,
                        'category':    cat,
                        'subcategory': sub,
                    },
                )

                # Variants
                if p_created:
                    stock_quantities = stock_for_product(sizes)
                    for size, qty in zip(sizes, stock_quantities):
                        ProductVariant.objects.get_or_create(
                            product=product,
                            size=size,
                            defaults={'stock_quantity': qty},
                        )

                # Images
                if p_created and pairs:
                    pair = pairs[idx % len(pairs)]
                    for order, n in enumerate(pair):
                        url = base_url.replace('{n}', str(n))
                        ProductImage.objects.get_or_create(
                            product=product,
                            order=order,
                            defaults={'image_url': url},
                        )

                variant_count = product.variants.count()
                image_count   = product.images.count()
                action = 'Created' if p_created else 'Already exists'
                print(f'    ✓ {action}: {product.name} ({variant_count} variants, {image_count} images)')
                if p_created:
                    total_products += 1

    print(f'\nDone. {Product.objects.count()} products in database.')


if __name__ == '__main__':
    seed()