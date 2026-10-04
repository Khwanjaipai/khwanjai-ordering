# Replacing Khwanjai menu images

The 33 menu items each have a separate 960 × 640 WebP illustration. The image paths and dish-specific generation prompts live in `data/menu-images.ts`. Each menu item receives its `image` field when `data/menu.ts` builds the final menu array. The warm ceramic-and-teak visual direction is for Khwanjai and does not reuse Maew Chong Coffee assets.

To replace a temporary image with a real Khwanjai photograph:

1. Place a WebP image in `public/images/menu/` using the same filename as the manifest entry.
2. Keep the image in a 3:2 landscape ratio with the dish clearly visible in the center.
3. Keep the existing path in `data/menu-images.ts`; no component changes are required.
4. Run `npm run build` and check the menu at 360–430px widths.

The generated images are illustrative and are not photographs of food served by Khwanjai. Confirm dish ingredients, appearance, and portion presentation with the restaurant before treating them as exact representations.
