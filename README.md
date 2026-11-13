# CDMI Church Website

Website for Christian Discipleship Ministries International (CDMI), Kololo, Kampala.

A static site with no build step: `index.html`, `styles.css`, `main.js`, and images in `assets/img/`.
Animation is done with GSAP + ScrollTrigger and Lenis smooth scroll, loaded from CDNs.

## Editing
- **Conference date:** change `CONFERENCE` near the top of `main.js` and the date text in `index.html`.
- **Sermons:** swap the YouTube IDs and thumbnails in the Sermons section of `index.html`.
- **Photos:** stock images come from Unsplash. Sermon thumbnails come from the CDMI YouTube channel.

## Preview locally
```
python3 -m http.server 8000
```
