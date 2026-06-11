# Prospect audit — all available data fields (Outscraper)

This is a **schema-accurate sample** of what an Outscraper scrape returns for one
business, assembled from their published field dictionaries. The business below is a
fictionalized Denver restaurant with realistic values — we have not run a live scrape
yet because that needs an API key from a (free) Outscraper account.

Three endpoints matter for the audit:

1. **Places** — one record per business (profile, photos count, posts, hours, …)
2. **Reviews** — every review individually, including the owner's reply
3. **Photos** (optional) — every photo individually, if we want per-photo detail

---

## 1. Places result (one record per business)

```json
{
  "query": "restaurants, Denver, CO",
  "name": "Highland Tap House",
  "name_for_emails": "Highland Tap House",
  "place_id": "ChIJd3kv8sJ4bIcRlN0AbCdEfGh",
  "google_id": "0x876c78c2f22f7977:0x68a1b2c3d4e5f607",
  "cid": "7539184756201932295",
  "kgmid": "/g/11abc4xyz9",
  "reviews_id": "7539184756201932295",
  "located_in": null,
  "located_google_id": null,

  "site": "https://highlandtaphouse-sample.com",
  "phone": "+1 303-555-0142",
  "type": "Restaurant",
  "category": "restaurants",
  "subtypes": "Restaurant, Bar, American restaurant, Brewpub",
  "description": "Neighborhood tap house pouring 30 Colorado drafts with elevated pub fare.",

  "full_address": "3550 Navajo St, Denver, CO 80211",
  "street": "3550 Navajo St",
  "borough": "Highland",
  "city": "Denver",
  "state": "Colorado",
  "state_code": "CO",
  "postal_code": "80211",
  "country": "United States of America",
  "country_code": "US",
  "latitude": 39.7651234,
  "longitude": -105.0061234,
  "h3": "8826d59513fffff",
  "time_zone": "America/Denver",
  "plus_code": "85FQ2X8V+3H",

  "rating": 4.3,
  "reviews": 487,
  "reviews_link": "https://search.google.com/local/reviews?placeid=ChIJ...",
  "reviews_tags": "happy hour, patio, burgers, craft beer",
  "reviews_per_score": { "1": 21, "2": 14, "3": 38, "4": 109, "5": 305 },
  "reviews_per_score_1": 21,
  "reviews_per_score_2": 14,
  "reviews_per_score_3": 38,
  "reviews_per_score_4": 109,
  "reviews_per_score_5": 305,

  "photos_count": 312,
  "photo": "https://lh5.googleusercontent.com/p/AF1Qip...=w800",
  "logo": "https://lh3.googleusercontent.com/-abc123/logo.jpg",
  "street_view": "https://lh5.googleusercontent.com/p/AF1Qip...=w1600",

  "business_status": "OPERATIONAL",
  "verified": true,
  "owner_id": "102345678901234567890",
  "owner_title": "Highland Tap House",
  "owner_link": "https://www.google.com/maps/contrib/102345678901234567890",

  "working_hours": {
    "Monday": "11AM-10PM",
    "Tuesday": "11AM-10PM",
    "Wednesday": "11AM-10PM",
    "Thursday": "11AM-11PM",
    "Friday": "11AM-12AM",
    "Saturday": "10AM-12AM",
    "Sunday": "10AM-9PM"
  },
  "working_hours_old_format": "Monday:11AM-10PM|Tuesday:11AM-10PM|...",
  "other_hours": [{ "Happy hour": { "Monday": "3-6PM", "Tuesday": "3-6PM" } }],
  "popular_times": [
    {
      "day": "Monday",
      "popular_times": [
        { "hour": 12, "percentage": 45, "title": "Usually not too busy" },
        { "hour": 18, "percentage": 80, "title": "Usually a little busy" }
      ]
    }
  ],
  "typical_time_spent": "People typically spend 1-2 hours here",

  "range": "$$",
  "prices": null,
  "menu_link": "https://highlandtaphouse-sample.com/menu",
  "order_links": ["https://order.toasttab.com/online/highland-tap-house"],
  "reservation_links": ["https://www.opentable.com/r/highland-tap-house"],
  "booking_appointment_link": null,

  "about": {
    "Service options": { "Outdoor seating": true, "Delivery": true, "Takeout": true, "Dine-in": true },
    "Highlights": { "Fast service": true, "Great beer selection": true, "Sports": true },
    "Popular for": { "Lunch": true, "Dinner": true, "Solo dining": true },
    "Accessibility": { "Wheelchair accessible entrance": true, "Wheelchair accessible restroom": true },
    "Offerings": { "Alcohol": true, "Beer": true, "Cocktails": true, "Comfort food": true, "Happy hour drinks": true },
    "Dining options": { "Brunch": true, "Lunch": true, "Dinner": true, "Dessert": true },
    "Amenities": { "Bar onsite": true, "Restroom": true, "Wi-Fi": true },
    "Atmosphere": { "Casual": true, "Cozy": true, "Trendy": true },
    "Crowd": { "Groups": true, "Tourists": true },
    "Planning": { "Accepts reservations": true },
    "Payments": { "Credit cards": true, "Debit cards": true, "NFC mobile payments": true }
  },

  "posts": [
    {
      "title": "Game Day Specials",
      "body": "Join us every Sunday for $5 drafts and half-price wings during Broncos games!",
      "timestamp": 1748563200,
      "link": "https://search.google.com/local/posts?q=..."
    }
  ],

  "location_link": "https://www.google.com/maps/place/Highland+Tap+House/@39.7651,-105.0061,14z/...",
  "location_reviews_link": "https://search.google.com/local/reviews?placeid=ChIJ..."
}
```

> Notes on the fields you specifically asked about:
> - `posts` — present as a JSON array, but Outscraper documents it as working "only for
>   some places". Exact object shape needs confirming with a live test.
> - `photos_count` — total photo count (better than official Places API, which caps at 10).
> - `verified` — whether the profile is claimed. The #1 prospecting filter.
> - Per-photo upload dates are **not** in this record — see Photos endpoint below.
> - Photo **views** don't exist anywhere anymore (Google removed the metric entirely).

### Optional email/contacts enrichment (extra columns on the same record)

`domain`, `email_1`, `email_2`, `email_3`, `phone_1`, `phone_2`, `phone_3`,
`facebook`, `instagram`, `twitter`, `linkedin`, `youtube`,
`website_title`, `website_description`, `website_keywords`, `website_generator`,
`website_has_fb_pixel`, `website_has_google_tag`

Useful for outreach (who to email after the audit) and bonus audit checks
("website has no analytics/pixel installed").

---

## 2. Reviews result (one record per review)

```json
{
  "review_id": "ChdDSUhNMG9nS0VJQ0FnSUR...",
  "review_text": "Great patio and solid burger. Service was a little slow on a Friday night.",
  "review_rating": 4,
  "review_timestamp": 1746316800,
  "review_datetime_utc": "05/04/2026 00:00:00",
  "review_link": "https://www.google.com/maps/reviews/...",
  "review_likes": 3,
  "review_img_url": "https://lh5.googleusercontent.com/p/AF1Qip...",

  "owner_answer": "Thanks for the feedback! We've added staff for weekend rushes — hope to see you again soon.",
  "owner_answer_timestamp": 1746489600,
  "owner_answer_timestamp_datetime_utc": "05/06/2026 00:00:00",

  "author_title": "Jordan M.",
  "author_id": "118273645546372819203",
  "author_link": "https://www.google.com/maps/contrib/118273645546372819203",
  "author_image": "https://lh3.googleusercontent.com/a-/profile.jpg",
  "author_reviews_count": 87,
  "author_ratings_count": 112
}
```

`owner_answer` is `null` when the business never replied — that's how we compute the
true reply rate across all 487 reviews, plus reply *speed* from the two timestamps.

---

## 3. Photos endpoint (one record per photo, optional)

Returns a record per photo with the image URL and whatever metadata Google exposes for
that photo (varies per photo; upload dates are not guaranteed). Needs a live test to
confirm date coverage before promising "last photo upload" in reports.

---

## Field → audit check cheat sheet

| Audit signal | Field(s) |
|---|---|
| Profile claimed? | `verified` |
| Rating / volume / distribution | `rating`, `reviews`, `reviews_per_score_1..5` |
| Reply rate & speed | reviews endpoint: `owner_answer`, `owner_answer_timestamp` |
| Review recency | reviews endpoint: `review_datetime_utc` |
| Google Posts activity | `posts` (coverage caveat) |
| Photo volume | `photos_count`, `logo`, `street_view` |
| Hours completeness | `working_hours`, `other_hours` |
| Website / phone present | `site`, `phone` |
| Category & description | `type`, `subtypes`, `category`, `description` |
| Attributes filled in | `about` (count the populated groups) |
| Price level set | `range` |
| Ordering/booking links | `order_links`, `reservation_links`, `menu_link`, `booking_appointment_link` |
| Busy-ness context | `popular_times`, `typical_time_spent` |
| Outreach contact | enrichment: `email_1`, socials |

Sources: Outscraper Google Maps scraper field dictionary, Places API page, Reviews
scraper data dictionary, and the outscraper-python README examples.
