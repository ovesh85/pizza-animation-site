SliceCraft — wood-fired pizza scroll-film site (static, no build step)
=====================================================================

Upload the whole folder to any web host (cPanel, Netlify, Vercel, S3, a WordPress theme folder...).
Open index.html. Everything is plain HTML + CSS + JS.

IMPORTANT: the scroll-scrubbed videos need a server that supports HTTP Range requests
(every real host does). Opening index.html straight from disk or with `python -m http.server`
will NOT scrub smoothly. For local testing use:  npx http-server . -p 8080

Structure
---------
index.html                 page markup (sections: hero, making, anatomy, 360 spin, pull, menu, stats, order, footer)
assets/css/style.css       all styles; brand colours are CSS variables at the top (:root)
assets/js/app.js           scroll-film engine + interactions; edit STEPS (making chapters) and MENU (products) at the top
assets/seq/hero/{d,m}/    hero film as 124 WebP frames drawn on a canvas (smoothest possible scrub)
assets/video/*.mp4         desktop clips (1920w, keyframe every 8 frames for smooth scrubbing) + poster .jpg
assets/video/mobile/*.mp4  mobile clips (1280w), auto-used under 860px width
assets/img/                menu photos, transparent top-down pizza (360 section), og image, favicon

Scroll films
------------
Each <section data-film data-vh="150"> holds stacked <video> tags. data-vh = scroll length (in vh) per clip.
Bigger number = slower scrub. Clips: hero (shop -> table), making-1..7 (dough -> sealed box), anatomy (layers), pull.

Libraries (CDN): GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13 (smooth scroll). Fonts: Google Fonts
(Bricolage Grotesque, Instrument Serif, Manrope). The site still works if the CDNs are blocked (no smooth scroll / reveals).

WooCommerce port
----------------
- Put index.html markup into a page template (e.g. page-slicecraft.php), enqueue style.css and app.js,
  copy assets/ into the theme and prefix paths with get_template_directory_uri().
- MENU in app.js -> output WC products instead (name, short description, price, image, a veg/non-veg tag).
- addToBox() in app.js -> POST to /wc/store/v1/cart/add-item (with the Nonce header) and update #cartCount.
