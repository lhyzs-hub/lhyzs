# Frontend & Content Style Guidelines

## Scope and Design Direction

These rules apply to every page, component, game, image, sound, and theme override in `docs/` and `overrides/`. The site identity is **“光域之城”**: a restrained dark fantasy interface combining Hextech-inspired machinery, Art Deco geometry, and a precise engineering instrument panel. It may evoke a premium game client, but must not copy game logos, UI screenshots, copyrighted sound effects, or unlicensed character assets. Prefer original CSS/SVG/canvas work and repository-owned media.

Do not replace this direction with generic SaaS cards, soft pastel gradients, excessive glassmorphism, emoji-led navigation, or uniformly rounded components.

## Color, Type, and Geometry

- Reuse tokens from `assets/stylesheets/core.css`: deep navy `#070b12`, surface `#0d1620`, gold `#c99b3d`, pale gold `#f0d58a`, and restrained cyan `#2a6573`.
- Gold communicates hierarchy and selection; cyan communicates energy, hover, links, and active mechanisms. Body text remains off-white with blue-gray secondary text.
- Dark mode is the primary composition. Light mode must retain the same gold/cyan hierarchy using warm ivory surfaces and readable contrast; never merely invert colors.
- Use thin one-pixel rules, clipped or chamfered corners, concentric technical markings, and generous negative space. Rounded corners should be subtle; reserve pills for compact metadata only.
- Use the configured Inter/Roboto family for interface text and JetBrains Mono for codes, counters, dates, and technical labels. Chinese copy is primary, concise, and naturally punctuated.

## Interaction and Motion

Every clickable control needs visible hover, keyboard focus, pressed, disabled, and loading states. Standard navigation uses a restrained cyan flow/glow on hover, gold focus accents, and a darker or desaturated pressed state. PLAY may feel heavier than normal navigation. Reuse licensed audio in `assets/audio/`; do not synthesize harsh “AI-like” squeaks or restart background music during navigation.

Preserve the custom gold-and-cyan cursor and its single gold flowing tail. Do not change its silhouette or attachment point unless explicitly requested. Motion must remain subtle, pause when inactive, and respect `prefers-reduced-motion`.

## Responsive and Feature Requirements

- Verify 390px mobile, common laptop widths, and wide desktop layouts. Navigation must never overlap search or profile controls.
- Keep touch targets near 44px; use contained horizontal scrolling for dense game boards instead of shrinking controls beyond usability.
- Maintain both themes, keyboard access, meaningful labels, visible focus, and sufficient contrast.
- Interactive pages must handle loading, empty, error, offline, and success states. Update `service-worker.js` cache versions when cached assets change.
- Keep page-specific CSS/JS isolated and load it through `overrides/main.html`; avoid increasing every page’s payload.

## Content and Visual Assets

Notes belong under `notes/` and should preserve the established engineering/course taxonomy. Use `scripts/content_pipeline.py sync` for Obsidian links, embeds, metadata, and previous/next navigation. “日常” is photo-oriented; do not mix note archives into it. Optimize raster assets to WebP when practical, keep pixel-art games internally consistent in scale and frame cadence, and provide CSS-native placeholders so first paint never exposes obsolete drafts.

Before delivery, compare the result with the home page and existing PLAY screens, capture desktop and mobile previews, and confirm that new work feels native to the same world rather than attached as a separate template.
