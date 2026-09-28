# Replacing Khwanjai menu images

The menu image paths and generation prompts live in `data/menu-images.ts`. Each menu item receives its `image` field when `data/menu.ts` builds the final menu array.

To replace a temporary image with a real Khwanjai photograph:

1. Place the new file in `public/images/menu/` using the same filename as the manifest entry.
2. Keep the image landscape or square with the dish clearly visible in the center.
3. Keep the existing path in `data/menu-images.ts`; no component changes are required.
4. Run `npm run build` and check the menu at 360–430px widths.

The current generated images are temporary editorial placeholders. Confirm dish appearance and portion presentation against the restaurant before treating them as final photography.
