# actor-booking-hotels

Apify actor for extracting data about hotels from Booking.com.

This actor extracts hotel data from Booking.com, it can either extract directly from  
the hotel list page or navigate to the detail page to get more detailed information.  
The results can be ordered by any criteria supported by Booking.com.  
  
Since Booking.com allows only 1000 search results, in case you need to download more,  
you will need to utilize the `useFilters` attribute to tell the crawler to enqueue all the criteria  
filtered pages. This will overcome the limit, but will significantly increase the crawling time.

## Input attributes

Input is a JSON object with the following properties:

```javascript
{
    "search": SEARCH_QUERY,
    "simple": EXTRACT_FROM_LIST,
    "useFilters": USE_CRITERIA_FILTERING,
    "minScore": MINIMUM_HOTEL_RATING,
    "maxPages": MAXIMUM_PAGINATION_PAGES,
    "concurrency": MAXIMUM_CONCURRENT_PAGES,
    "checkIn": CHECK_IN_DATE, 
    "checkOut": CHECK_OUT_DATE, 
    "rooms": NUMBER_OF_ROOMS,
    "adults": NUMBER_OF_ADULTS,
    "children": NUMBER_OF_CHILDREN,
    "currency": PREFERRED_CURRENCY,
    "language": PREFERRED_LANGUAGE,
    "sortBy": BOOKING_SORT_TYPE,
    "proxyConfig": APIFY_PROXY_CONFIG
}
```

* `search` is the only required attribute. This is the Booking.com search query.  
* `simple` defines if the data should be extracted just from the list page, default is `false`.  
* `useFilters` sets if the crawler should utilize criteria filters to overcome the limit for 1000 results.  
* `minScore` specifies the minimum allowed rating of the hotel to be included in results, default is `8.4`.  
* `maxPages` sets maximum number of pagination pages to be crawled.  
* `checkIn` check-in date in the mm-dd-yyyy format.  
* `checkOut` check-out date in the mm-dd-yyyy format.  
* `rooms` number of rooms to be set for the search.  
* `adults` number of adults to be set for the search.  
* `children` number of children to be set for the search.  
* `currency` preferred currency code to be set on the site.  
* `language` preferred language code to be set on the site.  
* `proxyConfig` defines Apify proxy configuration, it should respect this format:  
```javascript
"proxyConfig": {
    "useApifyProxy": true,
    "apifyProxyGroups": [
        "RESIDENTIAL",
        ...
    ]
}
```  
* `sortBy` sets a hotel attribute by which the results will be ordered, must be one of the following.
```javascript
[
    "bayesian_review_score",    // Rating
    "popularity",               // Popularity
    "price",                    // Price
    "review_score_and_price",   // Rating and price
    "class",                    // Stars
    "class_asc",                // Stars ascending
    "distance_from_landmark"    // Distance from city centre
]
```
  
## Starting with URLs

Instead of `search` INPUT attribute, it is also possible to start the crawler with an array of `startUrls`.  
In such case all the other attributes modifying the URLs will still be applied, it is therefore suggested to  
use simple urls and set all the other options using INPUT attributes instead of leaving them in the URL to  
avoid URL parameter clashing.  
In case the startUrl is a hotel detail page, it will be scraped. In case it is a hotel list page, the result  
will depend on the `simple` attribute. If it's `true`, the page will be scraped, otherwise all the links to  
detail pages will be added to the queue and scraped afterwards.  
The `startUrls` attribute should cotain an array of URLs as follows:

```javascript
{
    "startUrls": [
        "https://www.booking.com/hotel/fr/ariane-montparnasse.en-gb.html",
        "https://www.booking.com/hotel/fr/heliosopera.en-gb.html",
        "https://www.booking.com/hotel/fr/ritz-paris-paris.en-gb.html",
        ...
    ],
    "simple": false,
    "minScore": 8.4,
    ...
}
```
