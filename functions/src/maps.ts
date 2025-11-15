import { onCall, HttpsError } from 'firebase-functions/v2/https';

/**
 * Cloud Functions for Google Maps Web Services (server-to-server)
 * Secrets: GOOGLE_API_KEY
 * Region: default (us-central1 via project settings)
 */

const BASE = 'https://maps.googleapis.com/maps/api';

async function fetchJson(url: string) {
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<any>;
}

export const geocodeAddressCallable = onCall({ secrets: ['GOOGLE_API_KEY'] }, async (request) => {
  try {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not configured');

    const { address, placeId, language = 'es', region = 'mx', location, radius } = (request.data || {}) as any;

    if (!address && !placeId) {
      throw new HttpsError('invalid-argument', 'Provide either address or placeId');
    }

    console.log('[maps.geocode] start', {
      address,
      placeId,
      language,
      region,
      bias: location ? { lat: location.lat, lng: location.lng, radius } : null,
    });

    let url = '';
    if (placeId) {
      const u = new URL(`${BASE}/place/details/json`);
      u.searchParams.set('place_id', String(placeId));
      u.searchParams.set('fields', 'geometry,formatted_address');
      u.searchParams.set('language', String(language));
      u.searchParams.set('key', key);
      url = u.toString();
    } else {
      const u = new URL(`${BASE}/geocode/json`);
      let addr = String(address || '').trim();
      // Si parece solo calle+numero sin ciudad, agrega San Luis Potosí
      const lower = addr.toLowerCase();
      if (addr.length > 0 && !lower.includes('san luis') && !addr.includes(',') && !lower.includes('slp')) {
        addr = `${addr}, San Luis Potosí`;
      }
      u.searchParams.set('address', addr);
      u.searchParams.set('language', String(language));
      u.searchParams.set('region', String(region));
      // Sesgo geográfico via bounds si se proporciona location+radius
      if (location?.lat && location?.lng && typeof radius === 'number' && radius > 0) {
        const lat = Number(location.lat);
        const lng = Number(location.lng);
        const metersPerDegLat = 111_000; // aprox
        const metersPerDegLng = Math.cos((lat * Math.PI) / 180) * 111_000;
        const dLat = radius / metersPerDegLat;
        const dLng = radius / metersPerDegLng;
        const swLat = lat - dLat;
        const swLng = lng - dLng;
        const neLat = lat + dLat;
        const neLng = lng + dLng;
        u.searchParams.set('bounds', `${swLat},${swLng}|${neLat},${neLng}`);
      }
      u.searchParams.set('key', key);
      url = u.toString();
    }

    const data = await fetchJson(url);
    let status = data.status as string;
    if (status !== 'OK') {
      console.log('[maps.geocode] primary geocode failed', { status, error_message: data?.error_message });
      // Si falló geocode tradicional con address, intenta Places Find Place From Text como fallback
      if (!placeId && (status === 'REQUEST_DENIED' || status === 'ZERO_RESULTS' || status === 'INVALID_REQUEST')) {
        const { address: rawAddr, location, radius } = (request.data || {}) as any;
        let addr2 = String(rawAddr || '').trim();
        const lower2 = addr2.toLowerCase();
        if (addr2.length > 0 && !lower2.includes('san luis') && !addr2.includes(',') && !lower2.includes('slp')) {
          addr2 = `${addr2}, San Luis Potosí`;
        }
        const u2 = new URL(`${BASE}/place/findplacefromtext/json`);
        u2.searchParams.set('input', addr2);
        u2.searchParams.set('inputtype', 'textquery');
        u2.searchParams.set('fields', 'geometry,formatted_address');
        u2.searchParams.set('language', String((request.data || {}).language || 'es'));
        if (location?.lat && location?.lng && typeof radius === 'number' && radius > 0) {
          u2.searchParams.set('locationbias', `circle:${radius}@${location.lat},${location.lng}`);
        } else {
          // Sesgo por IP o círculo por defecto en SLP
          u2.searchParams.set('locationbias', 'ipbias');
        }
        u2.searchParams.set('key', key);
        const data2 = await fetchJson(u2.toString());
        const status2 = data2.status as string;
        console.log('[maps.geocode] fallback findplace status', { status2, error_message: data2?.error_message });
        if (status2 === 'OK' && Array.isArray(data2.candidates) && data2.candidates.length > 0) {
          const candidate = data2.candidates[0];
          const loc2 = candidate.geometry.location;
          const formatted2 = candidate.formatted_address || null;
          console.log('[maps.geocode] fallback success', { lat: loc2?.lat, lng: loc2?.lng, address: formatted2 });
          return { ok: true, location: { lat: loc2.lat, lng: loc2.lng }, address: formatted2 };
        }
        // Si también falla el fallback, continuar con el manejo de error original
      }
      let code: any = 'failed-precondition';
      let msg = `Geocode failed: ${status}`;
      const err = (data && (data.error_message || data.errorMessage)) ? String(data.error_message || data.errorMessage) : '';
      if (status === 'ZERO_RESULTS') { code = 'not-found'; msg = 'No se encontraron resultados para la dirección.'; }
      else if (status === 'OVER_QUERY_LIMIT') { code = 'resource-exhausted'; msg = 'Se excedió la cuota de la API de Maps.'; }
      else if (status === 'REQUEST_DENIED') { code = 'permission-denied'; msg = 'La solicitud fue rechazada por la API de Maps.' + (err ? ` (${err})` : ''); }
      else if (status === 'INVALID_REQUEST') { code = 'invalid-argument'; msg = 'Parámetros inválidos para geocodificación.' + (err ? ` (${err})` : ''); }
      throw new HttpsError(code, msg);
    }

    const result = (data.result || data.results?.[0]);
    const loc = result.geometry.location;
    const formatted = result.formatted_address || null;
    console.log('[maps.geocode] success', { lat: loc?.lat, lng: loc?.lng, address: formatted });
    return { ok: true, location: { lat: loc.lat, lng: loc.lng }, address: formatted };
  } catch (e: any) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', e?.message || 'Unknown error');
  }
});

export const directionsRouteCallable = onCall({ secrets: ['GOOGLE_API_KEY'] }, async (request) => {
  try {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not configured');

    const { origin, destination, mode = 'driving', language = 'es' } = (request.data || {}) as any;
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
      throw new HttpsError('invalid-argument', 'origin and destination must include lat/lng');
    }

    const u = new URL(`${BASE}/directions/json`);
    u.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    u.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    u.searchParams.set('mode', String(mode));
    u.searchParams.set('language', String(language));
    u.searchParams.set('key', key);

    console.log('[maps.directions] start', { origin, destination, mode });
    const data = await fetchJson(u.toString());
    const status = data.status as string;
    if (status !== 'OK') {
      console.log('[maps.directions] failed', { status, error_message: data?.error_message });
      let code: any = 'failed-precondition';
      let msg = `Directions failed: ${status}`;
      if (status === 'ZERO_RESULTS') { code = 'not-found'; msg = 'No hay ruta disponible entre origen y destino.'; }
      else if (status === 'OVER_QUERY_LIMIT') { code = 'resource-exhausted'; msg = 'Se excedió la cuota de la API de Maps.'; }
      else if (status === 'REQUEST_DENIED') { code = 'permission-denied'; msg = 'La solicitud fue rechazada por la API de Maps.'; }
      else if (status === 'INVALID_REQUEST') { code = 'invalid-argument'; msg = 'Parámetros inválidos para la ruta.'; }
      throw new HttpsError(code, msg);
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const polyline = route.overview_polyline.points as string;
    const distanceMeters = Number(leg.distance.value);
    const durationSeconds = Number(leg.duration.value);

    const result = {
      ok: true,
      polyline,
      distanceKm: distanceMeters / 1000,
      durationMin: Math.round(durationSeconds / 60),
      startAddress: leg.start_address || null,
      endAddress: leg.end_address || null,
    };
    console.log('[maps.directions] success', { distanceKm: result.distanceKm, durationMin: result.durationMin });
    return result;
  } catch (e: any) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', e?.message || 'Unknown error');
  }
});

export const placesAutocompleteCallable = onCall({ secrets: ['GOOGLE_API_KEY'] }, async (request) => {
  try {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) throw new Error('GOOGLE_API_KEY not configured');

    const { input, sessiontoken, language = 'es', components = 'country:mx', location, radius } = (request.data || {}) as any;
    if (!input || String(input).trim().length === 0) return { ok: true, suggestions: [] };

    const u = new URL(`${BASE}/place/autocomplete/json`);
    u.searchParams.set('input', String(input));
    if (sessiontoken) u.searchParams.set('sessiontoken', String(sessiontoken));
    u.searchParams.set('language', String(language));
    if (components) u.searchParams.set('components', String(components));
    if (location?.lat && location?.lng) {
      u.searchParams.set('location', `${location.lat},${location.lng}`);
    }
    if (typeof radius === 'number' && radius > 0) {
      u.searchParams.set('radius', String(radius));
    }
    u.searchParams.set('key', key);

    console.log('[maps.autocomplete] start', { q: input, bias: location ? { lat: location.lat, lng: location.lng, radius } : null });
    const data = await fetchJson(u.toString());
    const status = data.status as string;
    if (status !== 'OK' && status !== 'ZERO_RESULTS') {
      console.log('[maps.autocomplete] failed', { status, error_message: data?.error_message });
      let code: any = 'failed-precondition';
      let msg = `Autocomplete failed: ${status}`;
      if (status === 'OVER_QUERY_LIMIT') { code = 'resource-exhausted'; msg = 'Se excedió la cuota de la API de Maps.'; }
      else if (status === 'REQUEST_DENIED') { code = 'permission-denied'; msg = 'La solicitud fue rechazada por la API de Maps.'; }
      else if (status === 'INVALID_REQUEST') { code = 'invalid-argument'; msg = 'Parámetros inválidos para autocomplete.'; }
      throw new HttpsError(code, msg);
    }

    const predictions = (data.predictions || []) as any[];
    const suggestions = predictions.map(p => ({ placeId: p.place_id, description: p.description }));
    console.log('[maps.autocomplete] success', { count: suggestions.length });
    return { ok: true, suggestions };
  } catch (e: any) {
    throw new HttpsError('internal', e?.message || 'Unknown error');
  }
});
