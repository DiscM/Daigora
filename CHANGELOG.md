# Changelog

All notable changes to the **Heal the Planet** strategic planetary management card game will be documented in this file.

---

## [1.1.0] - 2026-06-20

### Added
- **Solarpunk Theme Foundations:** Added organic styling variables featuring warm linen-cream day backdrops (`#FAF7F2`), deep pine-forest typography (`#172F22`), and delicate brass/copper gold trims (`rgba(212, 144, 62, 0.28)`).
- **Glassmorphism Panels:** Applied frosted-glass designs (`background: var(--hd-panel); backdrop-filter: blur(16px);`) to start menus, picker interfaces, and board panels.
- **Organic Geometry:** Configured asymmetrical leaf-like rounded corners (`border-radius: var(--radius-leaf-md);` / `16px 4px 16px 4px`) on action cards, HUD consoles, and selector buttons.
- **Textured 3D Planet:** Integrated a high-resolution, seamless equirectangular Earth map texture (`solarpunk_earth_map.jpg`) directly onto the rotating planet sphere.
- **Spherical Shading & Highlight:** Overlayed a z-index shaded vignetting layer (`.planet-ocean`) and reflection glare (`.planet-glow`) on top of the rotating map to simulate realistic 3D volume, shadow, and curvature.
- **Seamless Looping Animation:** Implemented a 3-panel seamless loop alignment (adding a third `.planet-map` element in `src/App.tsx` and updating the `planet-axis-spin` translation keyframe to `-66.6666%` in `styles.css`) to eliminate the visual snap jump when the planet completes a full rotation.
- **Dashboard Material Contrast:** Upgraded panel backdrops in the console to distinct, high-contrast natural textures:
  - *Session Panel:* Polished copper/bronze brushed gradient.
  - *Crisis Panel:* Terracotta red clay theme.
  - *Readiness Meters:* Deep walnut dark wood grain backdrop.
  - *Active Projects:* Shimmering frosted jade-green glass.

### Changed
- **Typography Readability:** Switched the landing page title `"Heal the Planet"` text color from light cream to high-contrast deep forest green (`var(--sp-forest)`) for crisp legibility on the frosted background.
- **Biophilic Sky Scenery:** Converted space-effects (stars, comets, moon) into Solarpunk sky-effects (fluttering leaf drifts/pollen, soft wind gusts, and a radiant golden sun in a daylight gradient sky).
- **Aspect Ratio Correction:** Changed `.planet-map` background-size to `200%` with horizontal repeating offsets (`0%` and `-100%`) to display Earth continents at their correct `2:1` cylindrical scale without vertical or horizontal squishing.
- **Tooltips Contrast:** Updated status and board advisor tooltips to use light frosted glassmorphic backdrops instead of dark overlays.
