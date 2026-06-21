# Design System

## Direction

Dark-first product interface inspired by a quiet study space with one warm task light. The layout is compact and structured; thumbnails and topic names provide variety while signal amber marks actions and progression.

## Theme

- Background: `oklch(0.135 0.012 255)`
- Subtle background: `oklch(0.165 0.014 255)`
- Surface: `oklch(0.195 0.016 255)`
- Raised surface: `oklch(0.235 0.018 255)`
- Border: `oklch(0.31 0.018 255)`
- Primary text: `oklch(0.955 0.008 90)`
- Secondary text: `oklch(0.73 0.018 255)`
- Muted text: `oklch(0.62 0.018 255)`
- Accent: `oklch(0.79 0.145 75)`
- Accent hover: `oklch(0.84 0.135 78)`
- Accent ink: `oklch(0.18 0.025 65)`
- Success: `oklch(0.74 0.14 150)`
- Warning: `oklch(0.78 0.15 75)`
- Error: `oklch(0.69 0.17 25)`

The accent is reserved for primary actions, active navigation, focus rings, and progress. It must not be used as decoration. Avoid gradients except for thumbnail readability scrims.

## Typography

Use Geist for all visible UI text. Geist Mono is reserved for technical code only and is not part of the product interface. Use a fixed product scale: 12, 14, 16, 20, 28, 40, and 48px. Headings use 600 weight with no tighter than `-0.03em` tracking. Body copy is limited to 70 characters per line.

## Shape and Depth

- Inputs and buttons: 10px radius
- Content containers: 14px radius
- Tags only: full pill
- Use borders or surface contrast, not border plus wide shadow
- No glass panels or decorative blur

## Layout

Desktop uses a persistent 216px navigation rail and a content width up to 1180px. Mobile uses a compact top brand bar and fixed bottom navigation. Page rhythm uses 8px increments, with 24-32px section gaps. The search and learning path remain single-column at all sizes where reading order matters.

## Components

- Buttons have default, hover, active, focus-visible, disabled, and busy states.
- Form labels sit above controls; helper and error text sit below.
- Video rows use a 16:9 thumbnail, curriculum step, title, metadata, and explicit action.
- Empty states remain inline and always offer a next action.
- Loading uses skeletons matching final component geometry.

## Motion

Use 150-220ms ease-out transitions for hover, focus, disclosure, and navigation state. Do not animate page entry or scrolling. Under `prefers-reduced-motion: reduce`, transitions and smooth scrolling are disabled.
