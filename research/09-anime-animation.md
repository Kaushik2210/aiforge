---
verifiedOn: 2026-11-12
topic: Anime-grade animation in the AIForge stack (Phaser 4, CSS/Canvas, React)
---

# Research notes: anime-style animation for AIForge

Fetched 2026-11-12. Paraphrased. Items we could not confirm are `TODO-VERIFY`.

## Sources
1. Installed `phaser@4.2.1` (MIT): `types/phaser.d.ts`, `src/filters/*` (primary; filter list below).
2. https://github.com/phaserjs/phaser/blob/master/changelog/v4/4.0/MIGRATION-GUIDE.md
3. https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html and https://www.w3.org/TR/WCAG22/ (2.3.1, 2.3.3)
4. https://trace.umd.edu/peat/ (PEAT; broadcast/game content points to Harding FPA, Cambridge Research Systems)
5. https://wavemotioncannon.com/2016/12/31/an-introduction-to-framerate-modulation/ (anime frame-rate modulation)
6. Web search only (secondary, tutorial quality): smear frames / impact frames / on twos (prolificstudio.co, Wikipedia "Limited animation"); hit-stop and shake numbers (blog posts about Vlambeer's "Art of Screenshake"; the talk itself NOT fetched, TODO-VERIFY numbers).
7. Licences: https://esotericsoftware.com/spine-runtimes-license ; https://gsap.com/community/standard-license/ ; https://www.live2d.com/en/sdk/license/ ; https://rive.app/docs/runtimes/web/web-js ; GitHub LICENSE files for motion (MIT, Motion B.V.), lottie-web (MIT), rive-wasm (MIT), DragonBonesJS (MIT), Aseprite EULA.
8. https://www.copyright.gov/ai/ (Part 2 on copyrightability, published 2025-01-29; its conclusions were NOT read, TODO-VERIFY).

## 1. Craft techniques that translate to code
- Limited animation / on twos or threes: each drawing held 2-3 frames (12 or 8 new poses per second at 24 fps). Not a defect; it is the look. Code: step the pose clock (`t = floor(t*12)/12`) for characters while effects run at full rate.
- Frame-rate modulation (source 5): hold a pose at the moment of a blow, run bursts of full-rate motion for key actions, let effects run at a different rate than characters to steer the eye. Code: per-object `timeStep` plus short "sakuga bursts" (ones) around key beats.
- Smear frames: one frame of stretched or distorted shape along the motion path on fast moves. Code: scale-stretch along velocity for 1-2 frames, or 2-3 fading ghost copies (afterimages).
- Impact frames: a single stylised frame at contact, angular and graphic (high contrast, ink lines, flat colour). Code: 1-3 frame overlay with inverted/threshold look, radial lines. See accessibility: do NOT use full-screen white flashes.
- Hit-stop: brief freeze when a hit lands, both attacker and target frozen together. Sources disagree on length (about 30-150 ms); tune by feel.
- Speed lines / radial focus lines: lines streaking along motion or radiating from a focal point; drawn as polygons, re-randomised on twos.
- Camera shake, push-in, zoom punch: trauma-style shake (offset = trauma squared, decays fast); restraint advised, and a reduce-shake option.
- 12 principles (anticipation, overshoot, follow-through, squash and stretch, ease in/out, arcs): implement as tween presets (back-out easing for overshoot, short wind-up before action).
- Key-pose motion: author 3-6 key poses and hold/snap between them rather than smooth interpolation.
- Screen-space: shockwave ring (expanding ring + Displacement), bloom, chromatic aberration (3 channel-offset draws or shader), halftone/cel banding (Quantize / GradientMap), outlines (Glow with hard edge or Shadow offset).

## 2. Tooling, licences, web fit
Phaser 4.2.1 (MIT, verified in package) ships `addBarrel, addBlend, addBlur, addColorMatrix, addDisplacement, addGlow, addGradientMap, addImageLight, addKey, addMask, addParallelFilters, addPixelate, addQuantize, addSampler, addShadow, addThreshold, addVignette, addWipe` on `obj.filters.internal` / `.external` (also on cameras; also `Blocky`, `Bokeh` sources exist, TODO-VERIFY their public add* names). `enableFilters()` exists on objects/cameras. FX and masks were unified; preFX/postFX are gone. Actions `AddEffectBloom` and `AddEffectShine` exist. Particle emitter has `timeScale`. Custom effects = RenderNode (v3 pipelines removed). Filters cost fill-rate: low-end phones need quality tiers (TODO-VERIFY perf numbers; measure).

| Tool | Licence | MIT-compatible? | Notes |
|---|---|---|---|
| Phaser 4 | MIT | yes | built-in filters, particles, tweens, camera shake/zoom |
| Motion | MIT (Motion B.V.) | yes | React/DOM UI animation |
| GSAP | custom Webflow licence, free incl. commercial, not open source; bans use in tools competing with Webflow's animation builder | no (not OSI); usable but avoid in an MIT lib | prefer Motion/WAAPI/Phaser tweens |
| Lottie (lottie-web) | MIT | yes | needs After Effects-style authoring (not free) or LottieFiles tools; TODO-VERIFY dotLottie licence |
| Rive web runtime | MIT (rive-wasm) | runtime yes | editor pricing and asset format terms not confirmed, TODO-VERIFY |
| DragonBones JS | MIT, no maintenance promise | runtime yes | stale risk |
| Spine | runtimes under custom Esoteric licence; each end user of the integration must own a Spine editor licence | no | paid; skip |
| Live2D Cubism | proprietary; free for small-scale, licence needed at release (agreement a month ahead) | no | skip |
| Aseprite | EULA, source viewable, no redistribution of builds | no for pipeline dependency | output ownership not stated in EULA, TODO-VERIFY; use LibreSprite/Krita/Pixelorama (licences TODO-VERIFY) |
| PixiJS filters / Three.js toon+outline | MIT (TODO-VERIFY) | yes | extra renderer = bundle cost; not needed |
CSS/SVG/Canvas: no licence issue, zero dependency; best for UI screens.

## 3. Original art at low cost
- Safest: hand-made SVG/vector key poses and procedural effects (shaders, particles, polygons). Zero licence ambiguity; we are the author.
- SVG morph between key shapes (CSS `d:` path or tween of points) gives anime-ish smear/pop for icons and mascots.
- AI-generated assets: US Copyright Office Part 2 report (2025-01-29) covers copyrightability of AI output; we did not read its conclusions (TODO-VERIFY), but the risk is that purely AI output may not be ownable, so CC BY-SA / MIT grants could be hollow; style-mimicry of existing franchises conflicts with ADR 0002; character consistency is poor. Recommendation: do not ship raw AI art; at most use for private mood boards, and record any use in `docs/assets.md`.

## 4. Constraints
- WCAG 2.3.1 (A): no more than 3 general or red flashes per second, unless below thresholds. General flash = opposing luminance change of at least 10% of max relative luminance (darker state under 0.80). Area threshold about 0.006 sr, roughly 341x256 px at 1024x768 (87,296 CSS px). Red flash = saturated red transitions. Small areas are below threshold but zoom/close viewing may still harm.
- 2.3.3 (AAA): motion animation from interaction must be disable-able unless essential. We target it anyway.
- PEAT (TRACE) tests web content; for games Harding FPA is the named tool (paid, not run).
- Our rules: impact frames never white full-screen; use dark/ink or tinted frames, max 1 per second, never repeated; shockwave and shake are motion, so reduced-motion drops to a static ring or opacity fade; `prefers-reduced-motion` plus an in-app setting; focus mode removes speed lines/particles; colour-blind-safe palette with shape and luminance cues, not hue alone; text contrast over art keeps AA.
- Perf: quality tiers (high/low), cap particles, one full-screen filter at a time, lazy-load Phaser chunks per game, canvas DPR cap on phones.

## 5. Ranked recommendations (wow per effort)
1. Hit-stop + camera zoom punch + shake (Phaser camera + `time`/`tweens.timeScale`). 0.5 day. Reduced: no shake/zoom, keep 80 ms highlight. First: Gradient Hiker goal/boss moment.
2. Speed lines and radial focus lines (Graphics polygons on twos; CSS conic/repeating-gradient for UI). 0.5-1 day. Reduced: static lines. Quest page headers, level-up.
3. Anime cut-in banner (angled panel slides in, held on twos, overshoot, text). CSS/Motion. 1 day. Reduced: crossfade. Boss and streak milestones.
4. Shockwave ring + sparkle particles (ring sprite + `addDisplacement`/ring Graphics; Phaser particles). 1 day. Reduced: static ring fade. Level-up, world map node unlock.
5. Smear/afterimage on fast moves (stretch along velocity, 3 ghost copies). 0.5 day. Reduced: off. Gradient Hiker hiker dash.
6. Cel look: `addQuantize`/`addGradientMap` plus hard outline via `addGlow`/`addShadow` on key sprites; halftone via tiled pattern. 1-2 days. Reduced: unaffected (static). World map.
7. Impact frame (dark ink inverted 2-frame overlay, tinted, no white). 0.5 day after FX kit. Reduced: skipped. Boss defeat only.
8. Twos/threes pose stepping for mascots (SVG key-pose swaps, 8-12 fps). 2-3 days incl. art. Reduced: static pose. Dashboard guide character.

### FX kit API (packages/games, pure options + Phaser adapter)
```ts
type Level = 0 | 1 | 2 | 3;            // 0 = off/reduced-motion
interface FxKit {
  setMode(m: { level: Level; reducedMotion: boolean; focus: boolean }): void;
  hitStop(ms: number, opts?: { level?: Level }): void;
  screenShake(trauma: number, opts?: { ms?: number }): void;
  zoomPunch(amount: number, ms: number): void;
  speedLines(o: { angle: number | "radial"; ms: number; step?: 2 | 3 }): void;
  shockwave(x: number, y: number, o?: { size?: number; ms?: number }): void;
  smear(target: GameObject, o?: { ghosts?: number }): void;
  impactFrame(o?: { tint?: number; ms?: number }): void; // never white, rate-limited
  cutIn(o: { title: string; side: "left" | "right" }): Promise<void>;
}
```
Rules: when `reducedMotion` or `focus` or `level 0`, every call resolves immediately with a static/no-op equivalent; a global limiter enforces max 2 luminance-flashing events per second; all timings go through one scaled clock so tests can fake time.
