export function formatAddress(data, fallback = '') {
  const address = data?.address;
  if (!address) return fallback;

  const street = address.road || address.pedestrian || address.footway || address.path;
  const streetWithNumber = [street, address.house_number].filter(Boolean).join(', ');
  const district = address.neighbourhood || address.suburb || address.quarter || address.city_district;
  const city = address.city || address.town || address.municipality || address.village;
  const state = address.state;

  return [...new Set([streetWithNumber, district, city, state].filter(Boolean))].join(' - ') || fallback;
}
