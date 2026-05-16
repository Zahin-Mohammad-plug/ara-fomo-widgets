// Open-Meteo API — no key required
const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Drizzle',
  61: 'Light rain', 63: 'Rain', 71: 'Light snow', 80: 'Rain showers',
  95: 'Thunderstorm'
};

export async function getWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${SF_LAT}&longitude=${SF_LNG}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America%2FLos_Angeles`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const { temperature_2m, weathercode, windspeed_10m } = data.current;
    const condition = WMO_CODES[weathercode] ?? 'Cloudy';
    return `${Math.round(temperature_2m)}°F, ${condition}`;
  } catch {
    return '62°F, Partly Cloudy';
  }
}
