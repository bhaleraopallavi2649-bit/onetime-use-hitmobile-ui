// Bundled stock property photos (Unsplash licence, free for commercial use).
//
// Used ONLY where a listing / card has no real cover image of its own, so the UI
// never shows an empty grey box. photoFor() is deterministic: the same key
// (project id, message id, ...) always gets the same photo, and different keys
// spread across the set, so a list of photo-less cards shows different pictures.
import type { ImageSourcePropType } from 'react-native';

export const PROPERTY_PHOTOS: ImageSourcePropType[] = [
  require('../../assets/properties/p1.jpg'),
  require('../../assets/properties/p2.jpg'),
  require('../../assets/properties/p3.jpg'),
  require('../../assets/properties/p4.jpg'),
  require('../../assets/properties/p5.jpg'),
  require('../../assets/properties/p6.jpg'),
  require('../../assets/properties/p7.jpg'),
  require('../../assets/properties/p8.jpg'),
];

export function photoFor(key?: string | number | null): ImageSourcePropType {
  const str = String(key ?? '');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return PROPERTY_PHOTOS[h % PROPERTY_PHOTOS.length];
}
