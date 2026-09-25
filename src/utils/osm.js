//Utilidades para trabajar con los tiles (baldosas) de OpenStreetMap.
//ESTE FICHERO SE OS DA HECHO, no hay que modificarlo. Solo hay que importarlo y usarlo.

/**
 * Convierte unas coordenadas geográficas en las coordenadas x/y del tile que las contiene.
 *
 * OpenStreetMap (y Google Maps, y casi todos los mapas web) usan la proyección Web Mercator:
 * a un nivel de zoom z el mundo se parte en una rejilla de 2^z por 2^z tiles de 256x256 píxeles,
 * numerados desde la esquina noroeste. A zoom 0 hay un único tile con el mundo entero; a zoom 12
 * hay 4096 x 4096 tiles.
 *
 * La x es una regla de tres, porque la longitud (-180 a 180) se reparte de forma lineal.
 * La y lleva ese logaritmo porque en Mercator los paralelos NO están equiespaciados: es lo que
 * hace que Groenlandia se vea enorme comparada con África.
 *
 * Más detalles: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 *
 * @param {number|string} latitud  Latitud en grados, entre -90 y 90
 * @param {number|string} longitud Longitud en grados, entre -180 y 180
 * @param {number} zoom            Nivel de zoom (0 = mundo entero, 12 = ciudad)
 * @returns {{x: number, y: number}} Coordenadas del tile dentro de la rejilla
 *
 * @example
 *   latLonATile(40.416775, -3.703790, 12)  // -> { x: 2005, y: 1544 }  (centro de Madrid)
 */
export function latLonATile(latitud, longitud, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor((Number(longitud) + 180) / 360 * n);
  const latRad = Number(latitud) * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}
