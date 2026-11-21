---
name: Saga Cafe Design System
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#3e4a3f'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#6d7a6f'
  outline-variant: '#bdcabc'
  surface-tint: '#006d3a'
  primary: '#006a39'
  on-primary: '#ffffff'
  primary-container: '#008649'
  on-primary-container: '#f6fff4'
  inverse-primary: '#64dd91'
  secondary: '#575e70'
  on-secondary: '#ffffff'
  secondary-container: '#d9dff5'
  on-secondary-container: '#5c6274'
  tertiary: '#a23546'
  on-tertiary: '#ffffff'
  tertiary-container: '#c24d5e'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#82faab'
  primary-fixed-dim: '#64dd91'
  on-primary-fixed: '#00210e'
  on-primary-fixed-variant: '#00522b'
  secondary-fixed: '#dce2f7'
  secondary-fixed-dim: '#c0c6db'
  on-secondary-fixed: '#141b2b'
  on-secondary-fixed-variant: '#404758'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b8'
  on-tertiary-fixed: '#40000f'
  on-tertiary-fixed-variant: '#851f33'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style
The design system for Saga Cafe embodies a "Premium Playful" personality. It targets urban professionals and social groups who value high-quality dining combined with an engaging, interactive atmosphere. 

The aesthetic is a fusion of **High-End Minimalism** and **Tactile Modernism**. It prioritizes extreme clarity and expansive white space to showcase food photography, while using soft elevation and generous rounding to evoke a sense of comfort and approachability. The UI should feel airy, expensive, yet fundamentally "playable"—encouraging exploration through smooth transitions and high-quality tactile feedback.

## Colors
The palette is intentionally restrained to allow the vibrant colors of fresh ingredients to stand out. 

- **Primary Emerald**: Used for brand moments, primary actions, and "play" elements. It represents freshness and vitality.
- **Deep Slate (Primary Text)**: Used for high-contrast headers and essential information to ensure maximum legibility.
- **Cool Gray (Secondary Text)**: Reserved for supporting metadata, descriptions, and placeholder states.
- **Pure White**: The foundation of the UI, used to create a "gallery" feel for the menu items.
- **Subtle Border**: A light, cool-toned gray used sparingly for structural separation where elevation is not required.

## Typography
The system utilizes **Inter** for its systematic, utilitarian precision, which balances the playful nature of the brand with a sense of professional reliability. 

- **Display & Headlines**: Use tight letter-spacing and bold weights to create a strong visual anchor.
- **Body Text**: Standard weights with generous line-height ensure readability during fast-paced browsing.
- **Labels**: Small-caps or increased letter-spacing should be used for categories (e.g., "APPETIZERS") to provide structural hierarchy without adding visual weight.
- **Mobile Scaling**: Headlines automatically scale down on mobile devices to prevent awkward text wrapping in card-based layouts.

## Layout & Spacing
The design system follows a **Fluid Mobile-First** philosophy. Since this is a PWA, the layout prioritizes the vertical thumb-zone.

- **Grid**: A flexible 4-column grid for mobile, expanding to 12 columns for desktop.
- **Margins**: A 20px "safe zone" margin is maintained on the left and right edges of the screen to prevent content from feeling cramped.
- **Rhythm**: All spacing is based on a 4px baseline. Use `lg` (24px) for vertical separation between distinct sections and `md` (16px) for internal component padding.
- **Touch Targets**: All interactive elements (buttons, toggles, list items) must maintain a minimum height of 48px to ensure accessibility for mobile users.

## Elevation & Depth
This design system uses **Tonal Layering** combined with **Ambient Shadows** to create a sense of physical presence.

- **Level 0 (Base)**: Pure White (#FFFFFF) for the background.
- **Level 1 (Cards)**: Elevated with a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.05)`. 
- **Level 2 (Floating Elements)**: Components like the "Floating Cart Bar" use a more pronounced shadow to indicate they sit above the scrollable content: `0px 10px 30px rgba(0, 0, 0, 0.08)`.
- **Level 3 (Modals/Overlays)**: Highest elevation with a backdrop blur (10px) on the underlying content to maintain focus.

## Shapes
The shape language is defined by **High-Radius Corners**, specifically 20px (`rounded-xl` logic) for primary containers.

- **Standard Containers**: 20px radius to create a friendly, organic feel.
- **Small Components**: Buttons and input fields use 12px or 16px to maintain proportional harmony.
- **Images**: All food photography must feature the same 20px rounding to integrate seamlessly into the card structures.
- **Buttons**: Use fully pill-shaped (999px) or 16px rounded corners depending on the context of the action.

## Components
- **Menu Cards**: Feature high-resolution imagery at the top, 20px rounding, and a subtle 1px border (#E5E7EB) combined with the Level 1 shadow. Prices are highlighted in Emerald Green.
- **Primary Buttons**: Emerald Green background with White text. Use a slight scale-down transform (0.98) on tap to provide tactile feedback.
- **Floating Cart Bar**: A sticky element at the bottom of the viewport with a blur backdrop, Level 2 elevation, and a pill-shaped button for "Checkout."
- **Category Chips**: Horizontal scrolling labels with a 1px border. When active, they fill with Emerald Green and use white text.
- **Input Fields**: Minimalist style with 1px border. On focus, the border transitions to Emerald Green with a subtle glow (2px spread shadow).
- **Sticky Header**: Translucent white background with a backdrop blur effect to ensure content remains visible but readable as it scrolls underneath.