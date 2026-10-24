# Design

<sup>[日本語](ja/design.md)</sup>

The app's look is set by `design/tokens.json` and `src/design/icons.ts`. Screen code and styles refer only to the names defined there.

## Changing colors, type and spacing

Edit the values in `design/tokens.json` and run `pnpm tokens`. It rewrites the three files below, so the web view, Android and iOS screens use the same values. Do not edit the generated files by hand.

- `src/design/tokens.css`
- `src-tauri/plugins/signer/android/.../DesignTokens.kt`
- `src-tauri/plugins/signer/ios/Sources/DesignTokens.swift`

For example, the screen background is `surface`, card outlines are `line`, and the circle behind tile icons is `icon-well`.

- Keep a contrast ratio of at least 4.5:1 between text and its background, and 3:1 for icons and borders.
- States (safe, warning, danger) are shown with an icon and words as well as color. Check that they stay distinct after changing colors.
- The app is used offline, so it loads no fonts from the network. List fonts installed on the device in `font-sans` and `font-mono` under `css`.

## Light and dark themes

Write each color under both `color.light` and `color.dark` in `tokens.json` with the same name. `pnpm tokens` stops if a color exists in only one of them. Settings › Display picks the theme, and "System" follows the device's dark mode. The chosen theme is passed to the Android and iOS screens too (`src/design/theme.ts`).

## Changing icons

Add SVG paths drawn on a 24×24 grid to `icons` in `src/design/icons.ts`. Strokes use `currentColor`, so the color comes from `tokens.json`. Replacing the path under a name changes every screen that uses that icon.

## Changing words

Screen text is in `tr("日本語", "English")` calls in `src/views.ts` and `src/main.ts`, and in `Design.tr` for Android screens. Write the screen in Japanese first, then check that the English also fits.

## Checking

Run `pnpm dev` and open it with `?ui-preview=home`, `ready`, `settings` or `restrictions` to see each screen without a device. The language follows the browser's language setting.

Native screen components are in `Design.kt` on Android and `Design.swift` on iOS. Both use the `DesignTokens` values and the theme chosen in the web view. The Japanese text for cancel and error messages is in each one's `messages` table.
