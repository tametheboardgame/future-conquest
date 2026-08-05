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

function createSpriteUrl(encoded: string): string {
  if (!encoded) return '';

  try {
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return window.URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
  } catch (error) {
    console.error('Unable to reconstruct the Motion Comic V2 artwork sprite.', error);
    return '';
  }
}

export const MOTION_COMIC_SPRITE = createSpriteUrl(encodedSprite);
