# CDMI Church Website

Website for Christian Discipleship Ministries International (CDMI), Kololo, Kampala.

A static site with no build step: `index.html`, `styles.css`, `main.js`, and images in `assets/img/`.
No libraries or build step. Animations use IntersectionObserver and one scroll loop in `main.js`. Ministries, events, sermons and testimonies live in `assets/data.js`, so they can be edited without touching the layout. The previous dark design is saved as the git tag `v1-dark`.

## Editing
- **Conference date:** change `CONFERENCE` near the top of `main.js` and the date text in `index.html`.
- **Sermons:** swap the YouTube IDs and thumbnails in the Sermons section of `index.html`.
- **Photos:** stock images come from Unsplash. Sermon thumbnails come from the CDMI YouTube channel.

## Preview locally
```
python3 -m http.server 8000
```
