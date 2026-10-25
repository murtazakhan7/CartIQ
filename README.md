# LAAM — Purchase Confidence Feature

A full-stack take-home assessment for LAAM, a South Asian fashion marketplace.

---

## 1. Problem Understanding

The brief describes a drop-off problem: customers who like a product still leave without buying. The common thread in their hesitation is uncertainty — not about whether they want the product, but about whether it is actually *right for them* at this moment.

Four specific unknowns cause this:

- **Size availability.** Fashion marketplaces often show a product as available when only one or two sizes remain. A customer who doesn't know their size is in stock won't add to cart.
- **Final price.** "Base price" means nothing if delivery to the UAE adds PKR 800. Customers from diaspora markets need to know the landed cost before committing.
- **Delivery reliability.** "5–7 days" is vague. An arrival date ("Arrives by Monday, Jul 28") is a promise. The difference matters for gifting, occasions, and time-sensitive purchases.
- **Better alternatives.** A customer who finds their size is out of stock has no reason to stay if they can't immediately see what else is available.

The solution addresses each of these directly:
- A size selector with three explicit states removes all ambiguity about availability.
- Delivery is fetched live per country and total cost (product + delivery) is shown before checkout.
- The arrival date is a concrete, weekend-aware date, not a range.
- Similar products are surfaced automatically on the detail page.

The listing page supports this by surfacing out-of-stock products visibly but dimmed — they stay discoverable but don't waste the customer's time.

---

## 2. Scope

**Built:**
- Product listing page with search, category/subcategory filtering, pagination
- Product detail page with image gallery, size selector, delivery calculator, total cost, similar products
- 5 read-only REST APIs
- Seed script with 44 realistic products across 4 categories

**Intentionally not built:**
- **Checkout** — a fake checkout with no payment adds nothing to the evaluation
- **Authentication** — out of scope for a purchase confidence feature
- **Admin panel** — the seed script covers all data setup needs
- **Docker** — SQLite requires no containerization; two commands to run
- **Real-time stock** — would require websockets and a real inventory system

---

## 3. User Flow

**Discovery (Listing Page)**

The customer lands on the listing page showing all products in a 3-column grid. They can:
- Type a keyword (debounced 500ms, or immediate on Enter) to filter by name
- Select a category from the dropdown, which populates a subcategory dropdown
- Browse paginated results (12 per page)

Out-of-stock products appear dimmed with a badge — visible but clearly unavailable. All filters sync to URL query params, so pages are shareable and browser back works correctly.

**Decision (Detail Page)**

Clicking a product opens the detail page. From here the customer can:

1. Browse images using the thumbnail strip
2. Select their country — delivery days, flat fee, and a concrete arrival date load instantly
3. Select a size — the selector makes availability unambiguous:
   - Normal border = in stock
   - Amber border = low stock (shows units remaining when selected)
   - Grey strikethrough = out of stock, not selectable
4. See the total cost (product + delivery) update as they change country
5. Add to cart once a valid size is selected

If their size is sold out, a horizontal similar products strip at the bottom offers immediate alternatives from the same subcategory (or broader category if needed).

---

## 4. Technical Approach

### Data Model

`ProductVariant` is the central model — each variant is a product/size pair with its own `stock_quantity`. A flat stock field on `Product` would have made per-size availability impossible. This one decision shapes everything: the size selector, the stock status, the similar products filter, and the add-to-cart logic all derive from variants.

### API Design

Two serializers for `Product`:
- `ProductListSerializer` — id, name, price, thumbnail, has_any_stock. No variants, no full description. Keeps list responses lean.
- `ProductDetailSerializer` — full nested data including all variants and images.

The `status` field on `ProductVariantSerializer` (`in_stock` / `low_stock` / `out_of_stock`) is computed on the backend. The frontend has zero stock business logic — it reads a string and applies a CSS class.

### Query Optimization

Every product queryset uses `select_related('category', 'subcategory')` and `prefetch_related('images', 'variants')`. Serializer methods (`get_thumbnail`, `get_has_any_stock`) iterate over the prefetch cache — no additional DB hits per product. The detail view adds `prefetch_related('category__subcategories')` for the nested category serializer.

### Similar Products
Primary: same subcategory + in-stock + price ±30% (up to 6)
Fallback: same category, different subcategory + in-stock (fills to 6 if primary < 3)
The price filter uses `Decimal('0.70')` and `Decimal('1.30')` — Python raises `TypeError` when multiplying a `DecimalField` value by a float literal. The fallback ensures the section is rarely empty without showing irrelevant products.

### Delivery Calculation

The backend computes `estimated_arrival_date` from `today + estimated_days_max`, then shifts Saturday → Monday and Sunday → Monday. The frontend receives a formatted string (`"Monday, Jul 28"`) and displays it directly — no date logic in the client.

### URL State (Listing Page)

Filters write to URL query params via `useSearchParams`. On mount, state is initialised from the URL. This makes every filtered view shareable and makes browser back/forward work correctly with no extra state management.

### Frontend

Plain React with `useState`, `useEffect`, `useCallback`. No Redux, no Context, no component library. All styles in a single `index.css` with Google Fonts (Playfair Display for the logo, Inter for everything else). Responsive at 768px (2 columns) and 480px (1 column).

---

## 5. How to Run

**Backend**

```bash
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt
python manage.py migrate
python seed.py                  # enter 'y' to seed fresh data
python manage.py runserver
```

**Frontend** (separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

**Media images**

Images live in the `media/` folder at the project root. Django serves them automatically at `http://localhost:8000/media/` — no additional setup needed.

---

## 6. Tests

No tests were written within the time limit.

**What would be tested first, and why:**

1. **`GET /api/products/{id}/similar/`** — the most complex view. Tests would cover:
   - Current product correctly excluded from both primary and fallback results
   - Fallback triggers when primary returns fewer than 3 results
   - Price boundary conditions (exactly ±30%)
   - Out-of-stock products excluded

2. **`ProductVariantSerializer.get_status`** — boundary conditions at stock 0, 1, 3, and 4. These are the exact values where the `low_stock` / `in_stock` threshold sits.

3. **`DeliveryView` arrival date** — a test that targets known Saturday and Sunday landing dates to verify the Monday shift, plus a weekday to verify no shift occurs.

---

## 7. Tradeoffs

| Decision | Reason |
|---|---|
| SQLite over Postgres | Zero reviewer setup. Sufficient for 44 products and a demo. |
| No Docker | SQLite needs no containerization. Two commands to run vs five. |
| No checkout | A fake checkout with no payment or cart persistence adds no evaluation signal. |
| Local media over S3 | Images always load regardless of external service availability during review. |
| Seed script over fixtures | More readable, self-documenting, and easier to modify than JSON fixtures. |
| `pagination_class = None` on categories | Only 4 categories exist. Paginating them would break the cascading dropdown. |
| No test suite | Time spent on PDP quality and README depth instead. Test plan documented above. |

---

## 8. Future Improvements

1. **Authentication** — JWT-based auth, user profiles, saved delivery addresses
2. **Cart and checkout** — real session-based cart with a payment gateway (Stripe or a local provider)
3. **Real-time stock** — websocket or polling to reflect inventory changes without page refresh
4. **Image storage** — S3 or equivalent; local filesystem does not scale
5. **Postgres** — required for production concurrency and full-text search
6. **Docker Compose** — consistent environments across machines
7. **Test suite** — unit tests for serializers and views, integration tests for the similar products algorithm
8. **Public holiday awareness** — current arrival date skips weekends but not public holidays
9. **Elasticsearch** — fuzzy matching and typo tolerance for product search
10. **Admin panel** — product and inventory management without the seed script
11. **CDN** — for frontend assets and media
12. **Rate limiting** — API throttling to prevent abuse

---

## 9. AI Usage

**Tools used:** Claude (claude.ai)

**How it was used:** The project was built in 7 staged prompts — models, seed script, serializers, views, listing page, PDP, and README. Each stage was a single prompt with full context. Claude generated the first draft of every file.

**What was reviewed manually:** All generated code was read before running. Logic was traced for correctness on the non-trivial parts: similar products fallback, delivery date computation, size selector state, and prefetch cache usage in serializers.

**Three bugs caught during testing:**

1. **Decimal × float TypeError in similar products view.** Claude generated `base_price * 0.70` and `base_price * 1.30` for the price range filter. Python raises `TypeError` when a `DecimalField` value is multiplied by a float. Caught by hitting the `/similar/` endpoint and reading the traceback. Fixed by importing `Decimal` and using `Decimal('0.70')` and `Decimal('1.30')`.

2. **CategoryListView returning paginated response.** `PAGE_SIZE = 12` is set globally in DRF settings, so `CategoryListView` returned `{count, next, previous, results}` instead of a plain array. The frontend dropdown was receiving an object and rendering nothing. Fixed by adding `pagination_class = None` to `CategoryListView`.

3. **Search not clearing on category/subcategory change.** Selecting a category filter left the previous search term in the input and in the URL, causing a combined filter the user didn't intend. Fixed by resetting `searchInput` state and clearing the `search` param from the URL inside `handleCategoryChange` and `handleSubcategoryChange`.
```
laam-assessment
├─ core
│  ├─ asgi.py
│  ├─ settings.py
│  ├─ urls.py
│  ├─ wsgi.py
│  └─ __init__.py
├─ frontend
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ favicon.svg
│  │  └─ icons.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ api.js
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ hero.png
│  │  │  ├─ react.svg
│  │  │  └─ vite.svg
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  └─ pages
│  │     ├─ ProductDetailPage.jsx
│  │     └─ ProductListPage.jsx
│  └─ vite.config.js
├─ manage.py
├─ media
│  ├─ kids
│  │  ├─ boys1.webp
│  │  ├─ boys2.webp
│  │  ├─ boys3.webp
│  │  ├─ boys4.webp
│  │  ├─ boys5.webp
│  │  ├─ boys6.webp
│  │  ├─ boys7.webp
│  │  ├─ boys8.webp
│  │  ├─ girls1.webp
│  │  ├─ girls2.webp
│  │  ├─ girls3.webp
│  │  ├─ girls4.webp
│  │  ├─ girls5.webp
│  │  ├─ girls6.webp
│  │  ├─ girls7.webp
│  │  └─ girls8.webp
│  ├─ men
│  │  ├─ shalwar1.webp
│  │  ├─ shalwar2.webp
│  │  ├─ shalwar3.webp
│  │  ├─ shalwar4.webp
│  │  ├─ shalwar5.webp
│  │  ├─ shalwar6.webp
│  │  ├─ shalwar7.webp
│  │  ├─ shalwar8.webp
│  │  ├─ shirt1.webp
│  │  ├─ shirt2.webp
│  │  ├─ shirt3.webp
│  │  ├─ shirt4.webp
│  │  ├─ shirt5.webp
│  │  ├─ shirt6.webp
│  │  ├─ shirt7.webp
│  │  └─ shirt8.webp
│  ├─ unstitched
│  │  ├─ unstitched1.webp
│  │  ├─ unstitched2.webp
│  │  ├─ unstitched3.webp
│  │  ├─ unstitched4.webp
│  │  ├─ unstitched5.webp
│  │  ├─ unstitched6.webp
│  │  ├─ unstitched7.webp
│  │  └─ unstitched8.webp
│  └─ women
│     ├─ dress1.webp
│     ├─ dress2.webp
│     ├─ dress3.webp
│     ├─ dress4.webp
│     ├─ dress5.webp
│     ├─ dress6.webp
│     ├─ dress7.webp
│     ├─ dress8.webp
│     ├─ kurta1.webp
│     ├─ kurta2.webp
│     ├─ kurta3.webp
│     ├─ kurta4.webp
│     ├─ kurta5.webp
│     ├─ kurta6.webp
│     ├─ kurta7.webp
│     ├─ kurta8.webp
│     ├─ lawn1.webp
│     ├─ lawn2.webp
│     ├─ lawn3.webp
│     ├─ lawn4.webp
│     ├─ lawn5.webp
│     ├─ lawn6.webp
│     ├─ lawn7.webp
│     └─ lawn8.webp
├─ package-lock.json
├─ README.md
├─ requirements.txt
├─ seed.py
└─ store
   ├─ admin.py
   ├─ apps.py
   ├─ migrations
   │  ├─ 0001_initial.py
   │  └─ __init__.py
   ├─ models.py
   ├─ serializers.py
   ├─ tests.py
   ├─ urls.py
   ├─ views.py
   └─ __init__.py

```