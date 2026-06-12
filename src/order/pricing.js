/**
 * Product options and pricing for the business card configurator.
 *
 * Prices are computed as:
 *   (base[quantity] * size * paper * color * coating + roundedCornerFee) * production
 *
 * The default configuration (500 / U.S. Standard / 14 pt. Gloss / Full Color
 * Both Sides / High Gloss UV Both Sides / Regular) prices at $31.50.
 */

export const SIZES = [
  { id: 'us-standard', label: '2" x 3.5" U.S. Standard', multiplier: 1 },
  { id: 'slim', label: '1.75" x 3.5" Slim', multiplier: 0.95 },
  { id: 'square', label: '2.5" x 2.5" Square', multiplier: 1.1 },
];

export const ORIENTATIONS = [
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
];

export const PAPERS = [
  { id: '14pt-gloss', label: '14 pt. Gloss', multiplier: 1 },
  { id: '16pt-matte', label: '16 pt. Matte', multiplier: 1.15 },
  { id: '18pt-gloss', label: '18 pt. Gloss', multiplier: 1.25 },
  { id: '32pt-ultra', label: '32 pt. Ultra Thick', multiplier: 1.8 },
];

export const COLORS = [
  { id: 'both-sides', label: 'Full Color Both Sides', multiplier: 1 },
  { id: 'front-only', label: 'Full Color Front Only', multiplier: 0.85 },
];

export const QUANTITIES = [
  { id: '100', label: '100', base: 12.5 },
  { id: '250', label: '250', base: 21.0 },
  { id: '500', label: '500', base: 31.5 },
  { id: '1000', label: '1,000', base: 49.0 },
  { id: '2500', label: '2,500', base: 94.5 },
  { id: '5000', label: '5,000', base: 157.5 },
];

export const ROUNDED_CORNERS = [
  { id: 'none', label: 'None', fee: 0 },
  { id: 'radius-1-8', label: '1/8" Radius', fee: 6 },
  { id: 'radius-1-4', label: '1/4" Radius', fee: 6 },
];

export const COATINGS = [
  {
    id: 'uv-both',
    label: 'High Gloss UV Coating Both Sides',
    multiplier: 1,
    help: 'Shiny, vibrant finish. Not writable with pen.',
  },
  {
    id: 'matte-both',
    label: 'Matte Finish Both Sides',
    multiplier: 1.05,
    help: 'Smooth, glare-free finish that is easy to write on.',
  },
  {
    id: 'no-coating',
    label: 'No Coating',
    multiplier: 0.95,
    help: 'Uncoated stock — fully writable, more natural look.',
  },
];

export const PRODUCTION_TIMES = [
  { id: 'regular', label: 'Regular', sublabel: '2-4 Business Days', multiplier: 1 },
  { id: 'rush', label: 'Rush', sublabel: '2 Business Days', multiplier: 1.3 },
];

export const DEFAULT_CONFIG = {
  size: 'us-standard',
  orientation: 'horizontal',
  paper: '14pt-gloss',
  color: 'both-sides',
  quantity: '500',
  roundedCorner: 'none',
  coating: 'uv-both',
  production: 'regular',
};

const find = (options, id) => options.find((o) => o.id === id);

export const calculateSubtotal = (config) => {
  const base = find(QUANTITIES, config.quantity).base;
  const beforeProduction =
    base *
      find(SIZES, config.size).multiplier *
      find(PAPERS, config.paper).multiplier *
      find(COLORS, config.color).multiplier *
      find(COATINGS, config.coating).multiplier +
    find(ROUNDED_CORNERS, config.roundedCorner).fee;

  return Math.round(beforeProduction * find(PRODUCTION_TIMES, config.production).multiplier * 100) / 100;
};
