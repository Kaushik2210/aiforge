# ADR 0013: ASCII mode, built in-house

Status: accepted, 2026-11-16

## Decision
The site has an optional **ASCII mode**: a terminal look switched on from the header
(`ASCII mode: off / on`), saved in localStorage and applied before first paint through
`<html data-ascii="on">`, like the theme, Focus mode and the effects level. It is off by default.

It is made only from CSS, fonts and one component, with no copied third-party UI code:
- Fonts: the display and body fonts switch to the already self-hosted JetBrains Mono
  (loaded with `next/font`), so no new font file is added.
- Headings get a `> ` prefix, controls get `[ ... ]` brackets, borders become dashed, corners
  square, shadows and decorative gradients off. Generated text uses the alt-text form
  (`content: "> " / ""`) with a plain fallback, so supporting screen readers skip it.
- `AsciiProgress` draws a text bar `[####------]` as a real `role="progressbar"` (name, min, max,
  now) with the characters hidden from assistive technology. The header XP bar uses it in ASCII mode.
- Colour tokens are unchanged, so contrast, focus rings and the 44 px touch targets are unchanged.

## Why in-house
`research/10-ui-react-bits-and-ascii.md` found that React Bits is MIT plus the Commons Clause, which
forbids redistributing its components, so copying their source into this public MIT repository is not
safe, and several use GSAP (not open source). The effects we want are small to write ourselves.

## Rules for anything added later
- Decorative ASCII art is `aria-hidden` with real text beside it; never put content only in glyphs.
- Anything that moves by itself for over 5 seconds needs a pause control (WCAG 2.2.2), stops under
  reduced motion and Focus mode, and never flashes more than 3 times a second (see ADR 0012).
- Read the saved mode in an effect (`useAsciiMode`), never during render: a first render that differs
  from the server's makes React drop the `<html>` attributes (found on Day 20).
- Test every new page in ASCII mode with axe in both themes and at 375 px width.

## Found while building it
- The header navigation and the home page's realm path already scrolled sideways on a 375 px phone,
  with or without ASCII mode. The nav now wraps and the zig-zag shift applies only from 640 px up.
  A phone-width test now covers four pages in ASCII mode.

## Not done
- A typed boot line, decrypt-in headings, a glyph canvas background, ASCII mini-games (Loss Mountains,
  spell terminal, BPE sorter) and a Settings entry for the mode.
- Real-device and screen-reader testing of generated-content alt text (browser support is TODO-VERIFY).
