import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import datosLocales from './assets/ofertas.json';
import { GRUPOS, OTROS, grupoDe, sinTildes } from './grupos';
import { guardar, leerGuardadas } from './almacen';

const CLAVE_FAVORITOS = 'favoritos';
const FAVORITOS = 'favoritos'; // id especial del filtro de secciones

// Ofertas publicadas cada mañana (07:00 Ecuador) por GitHub Actions.
// La app las descarga al abrirse y al deslizar hacia abajo; si no hay internet
// usa las últimas guardadas en el móvil y, si nunca descargó, las que trae dentro.
const URL_DATOS =
  'https://raw.githubusercontent.com/aned191195-cloud/PROYECTO-OFERTAS-EC/main/datos/ofertas.json';

// el más reciente de dos conjuntos de datos (las fechas ISO se comparan como texto)
function masReciente(a, b) {
  if (!a) return b;
  if (!b) return a;
  return (b.actualizado ?? '') > (a.actualizado ?? '') ? b : a;
}

const COLORES_TIENDA = {
  Supermaxi: { fondo: '#C8102E', texto: '#FFFFFF' },
  'Akí': { fondo: '#F4B400', texto: '#1A1A1A' },
  'Tía': { fondo: '#0057B8', texto: '#FFFFFF' },
  Coral: { fondo: '#F26B21', texto: '#FFFFFF' },
  Megamaxi: { fondo: '#7A0019', texto: '#FFFFFF' },
  'Mi Comisariato': { fondo: '#D4001A', texto: '#FFFFFF' },
  'Santa María': { fondo: '#00843D', texto: '#FFFFFF' },
};

const ORDENES = [
  { id: 'descuento', nombre: 'Mayor descuento', fn: (a, b) => b.descuento_pct - a.descuento_pct },
  { id: 'ahorro', nombre: 'Mayor ahorro $', fn: (a, b) => b.ahorro - a.ahorro },
  { id: 'precio', nombre: 'Más barato', fn: (a, b) => a.precio - b.precio },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(iso) {
  if (!iso) return null;
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function horaActualizacion(iso) {
  if (!iso) return '';
  const hora = iso.slice(11, 16);
  return `${fechaCorta(iso)}, ${hora}`;
}

function Chip({ etiqueta, activo, onPress, color }) {
  const fondo = activo ? (color?.fondo ?? '#1A1A1A') : '#FFFFFF';
  const texto = activo ? (color?.texto ?? '#FFFFFF') : '#333333';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: fondo, borderColor: activo ? fondo : '#DDDDDD' }]}
    >
      <Text style={[styles.chipTexto, { color: texto }]}>{etiqueta}</Text>
    </Pressable>
  );
}

function TarjetaOferta({ oferta, esFavorito, onFavorito }) {
  const color = COLORES_TIENDA[oferta.tienda] ?? { fondo: '#555', texto: '#FFF' };
  const hasta = fechaCorta(oferta.valido_hasta);
  return (
    <Pressable
      style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.7 }]}
      onPress={() => Linking.openURL(oferta.url)}
    >
      <Pressable
        onPress={() => onFavorito(oferta.id)}
        hitSlop={10}
        style={styles.estrella}
        accessibilityRole="button"
        accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      >
        <Text style={[styles.estrellaTexto, esFavorito && styles.estrellaActiva]}>
          {esFavorito ? '★' : '☆'}
        </Text>
      </Pressable>
      <View style={styles.imagenCaja}>
        {oferta.imagen ? (
          <Image source={{ uri: oferta.imagen }} style={styles.imagen} resizeMode="contain" />
        ) : (
          <Text style={styles.sinImagen}>Sin foto</Text>
        )}
        <View style={styles.descuento}>
          <Text style={styles.descuentoTexto}>-{oferta.descuento_pct}%</Text>
        </View>
      </View>

      <View style={styles.info}>
        <View style={[styles.tienda, { backgroundColor: color.fondo }]}>
          <Text style={[styles.tiendaTexto, { color: color.texto }]}>{oferta.tienda}</Text>
        </View>
        <Text style={styles.nombre} numberOfLines={2}>
          {oferta.nombre}
        </Text>
        <View style={styles.precios}>
          <Text style={styles.precio}>${oferta.precio.toFixed(2)}</Text>
          <Text style={styles.precioNormal}>${oferta.precio_normal.toFixed(2)}</Text>
        </View>
        <Text style={styles.detalle} numberOfLines={1}>
          Ahorras ${oferta.ahorro.toFixed(2)}
          {hasta ? `  ·  Hasta el ${hasta}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

export default function App() {
  const [datos, setDatos] = useState(datosLocales);
  const [tienda, setTienda] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [favoritos, setFavoritos] = useState(() => new Set());
  const [orden, setOrden] = useState('descuento');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const actualizar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const control = new AbortController();
    const limite = setTimeout(() => control.abort(), 20000); // no esperar eternamente
    try {
      const r = await fetch(URL_DATOS, { cache: 'no-store', signal: control.signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      const nuevos = JSON.parse(texto);
      if (!Array.isArray(nuevos.ofertas)) throw new Error('formato inesperado');
      setDatos((actuales) => masReciente(actuales, nuevos));
      await guardar(texto);
    } catch (e) {
      setError('Sin conexión: mostrando las últimas ofertas guardadas.');
    } finally {
      clearTimeout(limite);
      setCargando(false);
    }
  }, []);

  // al abrir: primero lo guardado (rápido, sirve sin internet), luego descargar
  useEffect(() => {
    leerGuardadas().then((guardadas) => {
      if (guardadas?.ofertas) setDatos((actuales) => masReciente(actuales, guardadas));
    });
    actualizar();
  }, [actualizar]);

  // Favoritos: se guardan en el móvil (solo los ids de las ofertas).
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_FAVORITOS)
      .then((texto) => texto && setFavoritos(new Set(JSON.parse(texto))))
      .catch(() => {});
  }, []);

  const cambiarFavorito = useCallback((id) => {
    setFavoritos((previos) => {
      const nuevos = new Set(previos);
      if (nuevos.has(id)) nuevos.delete(id);
      else nuevos.add(id);
      AsyncStorage.setItem(CLAVE_FAVORITOS, JSON.stringify([...nuevos])).catch(() => {});
      return nuevos;
    });
  }, []);

  const tiendas = useMemo(() => Object.keys(datos.por_tienda ?? {}), [datos]);

  // a cada oferta le añadimos su sección (una vez por cada carga de datos)
  const ofertas = useMemo(
    () => datos.ofertas.map((o) => ({ ...o, grupo: grupoDe(o) })),
    [datos],
  );

  const deLaTienda = useMemo(
    () => ofertas.filter((o) => !tienda || o.tienda === tienda),
    [ofertas, tienda],
  );

  // secciones con ofertas en la tienda elegida (la activa se muestra siempre)
  const secciones = useMemo(() => {
    const cuenta = {};
    for (const o of deLaTienda) cuenta[o.grupo] = (cuenta[o.grupo] ?? 0) + 1;
    return [...GRUPOS, OTROS]
      .map((g) => ({ ...g, n: cuenta[g.id] ?? 0 }))
      .filter((g) => g.n > 0 || g.id === grupo);
  }, [deLaTienda, grupo]);

  const nFavoritos = useMemo(
    () => deLaTienda.filter((o) => favoritos.has(o.id)).length,
    [deLaTienda, favoritos],
  );

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    const fnOrden = ORDENES.find((o) => o.id === orden).fn;
    return deLaTienda
      .filter((o) => !grupo || (grupo === FAVORITOS ? favoritos.has(o.id) : o.grupo === grupo))
      .filter((o) => !q || sinTildes(o.nombre).includes(q))
      .sort(fnOrden);
  }, [deLaTienda, grupo, favoritos, orden, busqueda]);

  const textoVacio =
    grupo === FAVORITOS && !busqueda
      ? 'Aún no tienes favoritos aquí. Toca la ☆ de una oferta para guardarla.'
      : 'No hay ofertas que coincidan con tu búsqueda.';

  const cabecera = (
    <View>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>Ofertas del día</Text>
        <Text style={styles.subtitulo}>
          {datos.total} ofertas · actualizado {horaActualizacion(datos.actualizado)}
        </Text>
      </View>

      <TextInput
        style={styles.buscador}
        placeholder="Buscar: arroz, atún, leche…"
        placeholderTextColor="#999"
        value={busqueda}
        onChangeText={setBusqueda}
        clearButtonMode="while-editing"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        <Chip etiqueta={`Todas (${datos.total})`} activo={!tienda} onPress={() => setTienda(null)} />
        {tiendas.map((t) => (
          <Chip
            key={t}
            etiqueta={`${t} (${datos.por_tienda[t]})`}
            activo={tienda === t}
            color={COLORES_TIENDA[t]}
            onPress={() => setTienda(tienda === t ? null : t)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        <Chip etiqueta="Todo" activo={!grupo} onPress={() => setGrupo(null)} />
        <Chip
          etiqueta={`⭐ Favoritos (${nFavoritos})`}
          activo={grupo === FAVORITOS}
          color={{ fondo: '#F4B400', texto: '#1A1A1A' }}
          onPress={() => setGrupo(grupo === FAVORITOS ? null : FAVORITOS)}
        />
        {secciones.map((g) => (
          <Chip
            key={g.id}
            etiqueta={`${g.nombre} (${g.n})`}
            activo={grupo === g.id}
            onPress={() => setGrupo(grupo === g.id ? null : g.id)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {ORDENES.map((o) => (
          <Chip key={o.id} etiqueta={o.nombre} activo={orden === o.id} onPress={() => setOrden(o.id)} />
        ))}
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.contador}>{visibles.length} resultados</Text>
    </View>
  );

  return (
    <View style={styles.pantalla}>
      <StatusBar style="dark" />
      <FlatList
        data={visibles}
        keyExtractor={(o) => o.id}
        renderItem={({ item }) => (
          <TarjetaOferta
            oferta={item}
            esFavorito={favoritos.has(item.id)}
            onFavorito={cambiarFavorito}
          />
        )}
        extraData={favoritos}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<Text style={styles.vacio}>{textoVacio}</Text>}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={actualizar} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#F4F5F7' },
  lista: {
    paddingTop: Platform.OS === 'web' ? 16 : 56,
    paddingBottom: 32,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  cabecera: { marginBottom: 12, paddingHorizontal: 4 },
  titulo: { fontSize: 28, fontWeight: '800', color: '#1A1A1A' },
  subtitulo: { fontSize: 13, color: '#666', marginTop: 2 },
  buscador: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    marginBottom: 10,
  },
  fila: { gap: 8, paddingBottom: 10, paddingHorizontal: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTexto: { fontSize: 14, fontWeight: '600' },
  contador: { fontSize: 13, color: '#666', marginBottom: 8, paddingHorizontal: 4 },
  error: { color: '#B00020', marginBottom: 8, paddingHorizontal: 4 },
  vacio: { textAlign: 'center', color: '#666', marginTop: 40 },
  tarjeta: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  estrella: { position: 'absolute', top: 6, right: 8, zIndex: 1, padding: 4 },
  estrellaTexto: { fontSize: 22, color: '#BBBBBB' },
  estrellaActiva: { color: '#F4B400' },
  imagenCaja: {
    width: 96,
    height: 96,
    borderRadius: 10,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: { width: 96, height: 96 },
  sinImagen: { fontSize: 12, color: '#AAA' },
  descuento: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#1F9D55',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomRightRadius: 8,
  },
  descuentoTexto: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  info: { flex: 1, justifyContent: 'space-between', paddingRight: 26 },
  tienda: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tiendaTexto: { fontSize: 11, fontWeight: '700' },
  nombre: { fontSize: 14, color: '#1A1A1A', marginTop: 4 },
  precios: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  precio: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  precioNormal: { fontSize: 14, color: '#888', textDecorationLine: 'line-through' },
  detalle: { fontSize: 12, color: '#1F9D55', marginTop: 2 },
});
