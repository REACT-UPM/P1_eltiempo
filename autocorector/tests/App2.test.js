import {render, fireEvent, waitFor, screen} from '@testing-library/react'
import App from '../../src/App';
import {mock2} from '../utils/mock2';

//hay un segundo test suite para cambiar la configuración, si lo hago al vuelo así:
//mock per test: https://mikeborozdin.com/post/changing-jest-mocks-between-tests/
//config.default.use_server = true;
//como ya se ha cargado App con el import, si el alumno ha salvado el valor de config en una variable ya no se cambia
//si ha hecho por ejemplo const USE_SERVER = CONFIG.use_server; antes de function App
//la otra opción para hacer esto sería hacer un dynamic import https://www.npmjs.com/package/babel-plugin-dynamic-import-node https://jestjs.io/docs/next/jest-object#jestdomockmodulename-factory-options


const mytestconfig = {
  server_url: "http://nuevoserver.com",
  api_key: "apikeyfake_nohacefaltaporquehagomockdefetch",
  //num_items_query ya no existe: la app fija days=3 porque el plan gratuito de weatherapi
  //no devuelve más de 3 días. num_items_show baja a 2 para que siga habiendo recorte real.
  num_items_show: 2,
  //servidor de tiles distinto del real, para comprobar que la URL se compone desde la config
  tile_server_url: "https://tiles.servidordeprueba.test",
  tile_zoom: 12,
  default_lat: 41.416775,
  default_lon: -4.703790,
  use_server: true,
  force_error: false
};

jest.setTimeout(10000);

jest.mock('../../src/config/config', () => ( {
  __esModule: true,
  default: mytestconfig  
} ));

afterAll(() => jest.resetAllMocks());

let testinfo = {
  name: "La aplicación llama al servidor si se indica así en la configuración y funciona bien con un 200 OK",
  score: 1,
  msg_ok: "La aplicación llama al servidor adecuadamente y funciona bien con un 200 OK",
  msg_error: "La aplicación NO llama al servidor adecuadamente o NO funciona bien con un 200 OK"
}
test(JSON.stringify(testinfo), async () => {
  //mock de fetch. O se pone aquí o en beforeEach, si no no tira
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200,
    json: () => Promise.resolve(mock2)
  }));
  
  render(<App />);
  const buscar = document.querySelector('#buscar');
  fireEvent.click(buscar);
  //espero a que cargue los resultados, para ello uso scren.getAllByText que devuelve una promesa
  await waitFor(() => screen.getAllByText(/Humedad/i), {timeout: 10000});
  const resultado = document.querySelector('#resultados');
  expect(resultado).toBeInTheDocument();
  expect(resultado).toHaveTextContent(/El tiempo/i);
  expect(resultado).toHaveTextContent(/Reutte/);
  //mock2 tiene 8 días y num_items_show es 2, así que solo se pintan los dos primeros
  expect(resultado).toHaveTextContent("23/9/2024");
  expect(resultado).toHaveTextContent("24/9/2024");
  const imagenes = document.querySelectorAll('.tiempoimg');
  expect(imagenes).toHaveLength(mytestconfig.num_items_show);
});

testinfo = {
  name: "La query formada para llamar al servidor es correcta",
  score: 0.5,
  msg_ok: "La query formada para llamar al servidor es correcta",
  msg_error: "La query formada para llamar al servidor NO es correcta"
}
test(JSON.stringify(testinfo), async () => {
  //mock de fetch. O se pone aquí o en beforeEach, si no no tira
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200,
    json: () => Promise.resolve(mock2)
  }));
  render(<App />);
  const lat = document.querySelector('#latitud');
  const lon = document.querySelector('#longitud');
  fireEvent.change(lat, {target: {value: 45.6}});
  fireEvent.change(lon, {target: {value: -15.6}});
  const buscar = document.querySelector('#buscar');
  await fireEvent.click(buscar);
  
  //necesitamos waitFor porque hacemos un re-render asincrono después del fetch en App.js - https://davidwcai.medium.com/react-testing-library-and-the-not-wrapped-in-act-errors-491a5629193b
  //además he tenido que añadir await a fireEvent.click(buscar) para que funcione
  await waitFor(() => {
    const url = global.fetch.mock.calls[0][0];
    expect(url).toMatch(mytestconfig.server_url);
    expect(url).toMatch("key="+mytestconfig.api_key);
    expect(url).toMatch("q=45.6,-15.6");
    //days ya no sale de la config: la app lo fija a 3, el máximo del plan gratuito
    expect(url).toMatch("days=3");});
});


testinfo = {
  name: "La aplicación llama al servidor si se indica así en la configuración y funciona para códigos de error",
  score: 1,
  msg_ok: "La aplicación llama al servidor adecuadamente y funciona bien con códigos de error",
  msg_error: "La aplicación NO llama al servidor adecuadamente o NO funciona bien con códigos de error"
}
test(JSON.stringify(testinfo), async () => {
  //mock de fetch. O se pone aquí o en beforeEach, si no no tira
  global.fetch = jest.fn(() => Promise.resolve({
    status: 400,
    json: () => Promise.resolve({ error: {code: "400", message: "XXX - YYY - ZZZ"}})
  }));
  
  render(<App />);
  const buscar = document.querySelector('#buscar');
  fireEvent.click(buscar);
  //espero a que cargue los resultados, para ello uso scren.getAllByText que devuelve una promesa
  await waitFor(() => screen.getAllByText(/error/i), {timeout: 5000});
  const resultado = document.querySelector('#error');
  expect(resultado).toBeInTheDocument();
  expect(resultado).toHaveTextContent(/error/i);
  expect(resultado).toHaveTextContent(/XXX - YYY - ZZZ/i);
});


testinfo = {
  name: "La aplicación valida la latitud y la longitud e informa al usuario sin llamar al API cuando no son correctas",
  score: 1,
  msg_ok: "La validación de latitud y longitud funciona adecuadamente",
  msg_error: "La aplicación NO valida la latitud y la longitud o llama al API con valores incorrectos"
}
test(JSON.stringify(testinfo), async () => {
  //si la validación funciona este mock no debe llegar a usarse nunca
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200,
    json: () => Promise.resolve(mock2)
  }));

  render(<App />);
  const lat = document.querySelector('#latitud');
  const lon = document.querySelector('#longitud');
  const buscar = document.querySelector('#buscar');

  //1) latitud fuera del rango [-90, 90]
  fireEvent.change(lat, {target: {value: 120}});
  fireEvent.change(lon, {target: {value: 3}});
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/error/i), {timeout: 5000});
  let aviso = document.querySelector('#error');
  expect(aviso).toBeInTheDocument();
  expect(aviso).toHaveTextContent(/latitud/i);
  //no se pintan resultados y, sobre todo, no se ha llamado al API
  expect(document.querySelector('#resultados')).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();

  //2) longitud fuera del rango [-180, 180]
  fireEvent.change(lat, {target: {value: 40.4}});
  fireEvent.change(lon, {target: {value: -200}});
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/error/i), {timeout: 5000});
  aviso = document.querySelector('#error');
  expect(aviso).toBeInTheDocument();
  expect(aviso).toHaveTextContent(/longitud/i);
  expect(global.fetch).not.toHaveBeenCalled();

  //3) campos vacíos
  fireEvent.change(lat, {target: {value: ""}});
  fireEvent.change(lon, {target: {value: ""}});
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/error/i), {timeout: 5000});
  expect(document.querySelector('#error')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();

  //4) con coordenadas válidas SÍ se llama al API y se pintan los resultados
  fireEvent.change(lat, {target: {value: 47.42}});
  fireEvent.change(lon, {target: {value: 10.7}});
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/Humedad/i), {timeout: 5000});
  expect(global.fetch).toHaveBeenCalled();
  expect(document.querySelector('#resultados')).toBeInTheDocument();
});





testinfo = {
  name: "El checkbox de descarga del tile de OSM muestra el mapa de las coordenadas buscadas y solo cuando está marcado",
  score: 1,
  msg_ok: "El tile de OSM se descarga y se muestra adecuadamente",
  msg_error: "El tile de OSM NO se muestra adecuadamente o no respeta el checkbox"
}
test(JSON.stringify(testinfo), async () => {
  global.fetch = jest.fn(() => Promise.resolve({
    status: 200,
    json: () => Promise.resolve(mock2)
  }));

  render(<App />);
  const lat = document.querySelector('#latitud');
  const lon = document.querySelector('#longitud');
  const check = document.querySelector('#descargartile');
  const buscar = document.querySelector('#buscar');

  //el checkbox existe y arranca desmarcado
  expect(check).toBeInTheDocument();
  expect(check.type).toBe('checkbox');
  expect(check).not.toBeChecked();

  //1) sin marcar el checkbox NO debe aparecer el tile
  fireEvent.change(lat, {target: {value: 40.416775}});
  fireEvent.change(lon, {target: {value: -3.703790}});
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/Humedad/i), {timeout: 5000});
  expect(document.querySelector('#tileosm')).not.toBeInTheDocument();

  //2) marcándolo sí aparece, con la URL compuesta desde la configuración
  fireEvent.click(check);
  expect(check).toBeChecked();
  await fireEvent.click(buscar);
  await waitFor(() => document.querySelector('#tileosm'), {timeout: 5000});
  const contenedor = document.querySelector('#tileosm');
  expect(contenedor).toBeInTheDocument();
  const imagen = contenedor.querySelector('img');
  expect(imagen).toBeInTheDocument();
  expect(imagen.getAttribute('src')).toBe(
    mytestconfig.tile_server_url + "/" + mytestconfig.tile_zoom + "/2005/1544.png");

  //la atribución de OpenStreetMap es obligatoria por licencia y debe verse
  expect(contenedor).toHaveTextContent(/OpenStreetMap/i);

  //3) al desmarcarlo y volver a buscar, el tile desaparece
  fireEvent.click(check);
  expect(check).not.toBeChecked();
  await fireEvent.click(buscar);
  await waitFor(() => screen.getAllByText(/Humedad/i), {timeout: 5000});
  expect(document.querySelector('#tileosm')).not.toBeInTheDocument();
});
