// Central theme — Warm Orange & Cream (HomeInTown reference redesign)
// StyleSheet-based (no NativeWind, which crashes production builds).
//
// Palette  (reference: Property Dashboard / Drawer / AI Chat screenshots):
//   brand       #E8731C   primary orange — buttons, active icons/tabs, logo
//   brandDark   #C25A0C   deep orange — pressed / accents
//   brandTint   #E8731C1A ~10% orange tint for active menu / chip backgrounds
//   cream       #FAF3E8   warm cream page background
//   white       #FFFFFF   card / sheet surfaces (near-white)
//   ink         #17233A   primary text (dark navy)
//   night       #17233A   deep navy surface
//   night2      #FBE9D6   pale warm peach — elevated chip / tab track
//   line        #ECE0CE   soft warm-beige border / divider
//   muted       #A89F90   faint / placeholder text
//   muted2      #6B7280   secondary text (navy-grey)
//   sand        #F1E3D0   soft beige — neutral chip / secondary surface
//   slateBg   = #F1E3D0   (re-mapped to beige for consistency)
//
// All key NAMES preserved — components reference the same names, so
// every existing screen automatically picks up the new values.

export const colors = {
  brand:     '#E8731C',
  brandDark: '#C25A0C',
  brandTint: '#E8731C1A',
  cream:     '#FAF3E8',
  ink:       '#17233A',
  night:     '#17233A',
  night2:    '#FBE9D6',
  line:      '#ECE0CE',
  muted:     '#A89F90',
  muted2:    '#6B7280',
  white:     '#FFFFFF',

  // status colours — semantically unchanged, kept accessible on light bg
  red:         '#DC2626',
  redBg:       '#FEF2F2',
  redBorder:   '#FECACA',
  redText:     '#B91C1C',
  amber:        '#D97706',
  amberBg:     '#FFFBEB',
  amberBorder: '#FDE68A',
  amberText:   '#B45309',
  blue:         '#2563EB',
  blueBg:      '#EFF6FF',
  blueBorder:  '#BFDBFE',
  blueText:    '#1D4ED8',
  green:        '#16A34A',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
  greenText:   '#15803D',
  cyan:         '#0891B2',
  cyanBg:      '#ECFEFF',
  cyanBorder:  '#A5F3FC',
  cyanText:    '#0E7490',
  indigo:        '#4F46E5',
  indigoBg:     '#EEF2FF',
  indigoBorder: '#C7D2FE',
  indigoText:   '#4338CA',
  purple:        '#9333EA',
  purpleBg:     '#FAF5FF',
  purpleBorder: '#E9D5FF',
  purpleText:   '#7E22CE',
  pink:         '#DB2777',
  pinkBg:      '#FDF2F8',
  pinkBorder:  '#FBCFE8',
  pinkText:    '#BE185D',

  // neutral chip family — soft beige on cream background
  slate:        '#6B7280',
  slateBg:     '#F1E3D0',   // soft beige
  slateBorder: '#E6D6BF',
  slateText:   '#5B5143',

  yellow: '#EAB308',
};

// Unit-inventory grid colours. Booked stays orange so it never reads as
// a tappable teal button.
export const unitColors = {
  available: colors.green,
  booked:    '#EA580C',
  sold:      colors.slate,
  'on-hold': colors.yellow,
} as const;

export const radius = {
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  '2xl': 24,
  full:  999,
};

export const spacing = {
  xs:    4,
  sm:    8,
  md:    12,
  lg:    16,
  xl:    20,
  '2xl': 24,
};
