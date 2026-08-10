export const SERVICE_QUOTE_SERVICES = Object.freeze({
  window_cleaning: Object.freeze({
    label: 'Window Cleaning',
    pagePath: '/services/window-cleaning-gold-coast.html',
    scope: 'Window glass, frames, sills, tracks, screens and pool-fence glass can be confirmed after we review your property.',
  }),
  pressure_cleaning: Object.freeze({
    label: 'Pressure Cleaning',
    pagePath: '/services/pressure-cleaning-gold-coast.html',
    scope: 'Driveways, concrete, paths, patios, pavers and pool areas can be confirmed after we review your property.',
  }),
  house_washing: Object.freeze({
    label: 'House Washing / Soft Washing',
    pagePath: '/services/house-washing-gold-coast.html',
    scope: 'Exterior walls, facades, eaves and entry areas can be confirmed after we review your property.',
  }),
  roof_cleaning: Object.freeze({
    label: 'Roof Cleaning / Roof Soft Washing',
    pagePath: '/services/roof-cleaning-gold-coast.html',
    scope: 'Roof access, surface condition and safe cleaning scope can be confirmed after we review your property.',
  }),
});

export function getServiceQuoteService(serviceId) {
  return SERVICE_QUOTE_SERVICES[String(serviceId || '').trim()] || null;
}
