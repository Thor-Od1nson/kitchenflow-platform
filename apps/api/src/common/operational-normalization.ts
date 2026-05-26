const legacyOutletMap: Record<string, string> = {
  Indiranagar: 'Marina Central Kitchen',
  'Jubilee Hills': 'Yas Operations Hub',
  BKC: 'DIFC Fulfillment Center',
  'Park Street': 'Business Bay Dispatch Center',
  CyberHub: 'Riyadh Digital City Hub',
  Bengaluru: 'Dubai',
  Bangalore: 'Dubai',
  Mumbai: 'Dubai',
  Hyderabad: 'Abu Dhabi',
  Gurgaon: 'Riyadh',
  Gurugram: 'Riyadh',
  Delhi: 'Dubai',
  Chennai: 'Doha',
  Kolkata: 'Kuwait City',
  Pune: 'JLT',
  Noida: 'Abu Dhabi'
};

const legacyCustomerMap: Record<string, string> = {
  'Tara Bose': 'Layla Hassan',
  'Aarav Sharma': 'Omar Al Fahad',
  'Mira Iyer': 'Mariam Al Suwaidi',
  'Anika Sen': 'Noor Al Mansoori',
  'Ishaan Kapoor': 'Faisal Al Harbi',
  'Rhea Nair': 'Zayed Al Mazrouei'
};

const legacyProviderMap: Record<string, string> = {
  swiggy: 'talabat',
  zomato: 'deliveroo',
  blinkit: 'noon_food',
  zepto: 'careem'
};

const legacyPrefixMap: Record<string, string> = {
  BEN: 'DXB',
  BLR: 'DXB',
  BOM: 'DXB',
  MUM: 'DXB',
  HYD: 'AUH',
  DEL: 'DXB',
  NCR: 'RUH',
  GUR: 'RUH',
  CCU: 'KWT',
  KOL: 'KWT',
  MAA: 'DOH',
  PNQ: 'DXB'
};

const cityPrefixes: Record<string, string> = {
  Dubai: 'DXB',
  'Dubai Marina': 'DXB',
  'Business Bay': 'DXB',
  JLT: 'DXB',
  DIFC: 'DXB',
  'Al Barsha': 'DXB',
  'Abu Dhabi': 'AUH',
  'Abu Dhabi Yas': 'AUH',
  Riyadh: 'RUH',
  'Riyadh Olaya': 'RUH',
  'Riyadh Digital City': 'RUH',
  Doha: 'DOH',
  'Doha West Bay': 'DOH',
  'Kuwait City': 'KWT',
  'Kuwait City Marina': 'KWT',
  Jeddah: 'RUH'
};

export function normalizeCurrency(currency?: string | null) {
  return currency === 'INR' || !currency ? 'AED' : currency;
}

export function normalizeProvider(provider: string) {
  return legacyProviderMap[provider.toLowerCase()] ?? provider;
}

export function normalizeCustomerName(name: string) {
  return legacyCustomerMap[name] ?? name;
}

export function normalizeOutletName(name: string) {
  return legacyOutletMap[name] ?? name;
}

export function normalizeCity(city: string) {
  return legacyOutletMap[city] ?? city;
}

export function orderPrefixForLocation(location: string) {
  return cityPrefixes[normalizeCity(location)] ?? cityPrefixes[normalizeOutletName(location)] ?? 'DXB';
}

export function normalizePublicId(publicId: string, location: string) {
  const match = publicId.match(/^#?([A-Z]{3})-(.+)$/);
  if (!match) return `#${orderPrefixForLocation(location)}-${publicId.replace(/^#/, '')}`;
  const prefix = legacyPrefixMap[match[1]] ?? cityPrefixes[match[1]] ?? match[1];
  return `#${prefix}-${match[2]}`;
}

export function normalizeOperationalText(value: string) {
  return Object.entries({
    ...legacyOutletMap,
    Swiggy: 'Talabat',
    Zomato: 'Deliveroo',
    Blinkit: 'Noon Food',
    Zepto: 'Careem',
    INR: 'AED',
    '₹': 'AED ',
    ...legacyCustomerMap
  }).reduce((text, [from, to]) => text.replaceAll(from, to), value);
}
