/**
 * Calcula la distancia en kilómetros entre dos coordenadas geográficas
 * utilizando la fórmula de Haversine (Requisito del proyecto final).
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return null;
  }
  
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Radio de la Tierra en kilómetros

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return Math.round(distanceKm * 100) / 100; // Redondeado a 2 decimales
}

module.exports = { calculateHaversineDistance };
