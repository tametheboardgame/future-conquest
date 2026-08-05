const spriteParts = import.meta.glob('./sprite-parts/part-*.txt', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

const encodedSprite = Object.entries(spriteParts)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([, content]) => content.trim())
  .join('');

export const MOTION_COMIC_SPRITE = encodedSprite
  ? `data:image/webp;base64,${encodedSprite}`
  : '';
