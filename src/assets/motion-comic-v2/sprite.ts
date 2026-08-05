const spriteParts = import.meta.glob('./sprite-parts/part-*.txt', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

function partNumber(path: string): number {
  const match = path.match(/part-(\d+)\.txt$/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

const encodedSprite = Object.entries(spriteParts)
  .sort(([left], [right]) => partNumber(left) - partNumber(right))
  .map(([, content]) => content.trim())
  .join('');

export const MOTION_COMIC_SPRITE = encodedSprite
  ? `data:image/webp;base64,${encodedSprite}`
  : '';
