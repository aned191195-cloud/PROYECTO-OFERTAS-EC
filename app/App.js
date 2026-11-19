import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
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
  Supermaxi: '#C8102E',
  'Akí': '#E0A100',
  'Tía': '#0057B8',
  Coral: '#F26B21',
  Megamaxi: '#7A0019',
  'Mi Comisariato': '#D4001A',
  'Santa María': '#00843D',
};
// en modo oscuro algunos colores se leen mal sobre fondo negro
const COLORES_TIENDA_OSCURO = { Megamaxi: '#E0566B', 'Tía': '#5B9BFF', 'Santa María': '#3CC57A' };

// Colores de la app (claro y oscuro)
const TEMAS = {
  claro: {
    fondo: '#F2F4F3',
    tarjeta: '#FFFFFF',
    texto: '#16201C',
    suave: '#5F6B66',
    tenue: '#8C9692',
    borde: '#E1E6E3',
    marca: '#0B7A55',
    marcaTexto: '#FFFFFF',
    ahorro: '#0B7A55',
    circulo: '#FFFFFF',
    activo: '#DDF2E9',
    error: '#B00020',
    barra: 'light',
  },
  oscuro: {
    fondo: '#0E1311',
    tarjeta: '#1A211E',
    texto: '#EEF2F0',
    suave: '#A5B0AB',
    tenue: '#76817C',
    borde: '#2A3430',
    marca: '#0B6B4B',
    marcaTexto: '#FFFFFF',
    ahorro: '#4FD3A0',
    circulo: '#1A211E',
    activo: '#123D2D',
    error: '#FF8A80',
    barra: 'light',
  },
};

const ORDENES = [
  { id: 'descuento', nombre: 'Mayor descuento', fn: (a, b) => b.descuento_pct - a.descuento_pct },
  { id: 'ahorro', nombre: 'Mayor ahorro', fn: (a, b) => b.ahorro - a.ahorro },
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
  return `${fechaCorta(iso)}, ${iso.slice(11, 16)}`;
}

// "🐶 Mascotas" -> { icono: '🐶', texto: 'Mascotas' }
function partirNombre(nombre) {
  const i = nombre.indexOf(' ');
  return { icono: nombre.slice(0, i), texto: nombre.slice(i + 1) };
}

const RELLENO = { id: '__relleno' }; // hueco para cuadrar la última fila

const TarjetaOferta = memo(function TarjetaOferta({ oferta, esFavorito, onFavorito, t, oscuro }) {
  const colorTienda =
    (oscuro && COLORES_TIENDA_OSCURO[oferta.tienda]) || COLORES_TIENDA[oferta.tienda] || t.suave;
  const hasta = fechaCorta(oferta.valido_hasta);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: t.tarjeta, borderColor: t.borde },
        pressed && { opacity: 0.75 },
      ]}
      onPress={() => Linking.openURL(oferta.url)}
    >
      <View style={styles.imagenCaja}>
        {oferta.imagen ? (
          <Image source={{ uri: oferta.imagen }} style={styles.imagen} resizeMode="contain" />
        ) : (
          <Text style={styles.sinImagen}>Sin foto</Text>
        )}
        <View style={styles.descuento}>
          <Text style={styles.descuentoTexto}>-{oferta.descuento_pct}%</Text>
        </View>
        <Pressable
          onPress={() => onFavorito(oferta.id)}
          hitSlop={8}
          style={styles.estrella}
          accessibilityRole="button"
          accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        >
          <Text style={[styles.estrellaTexto, esFavorito && styles.estrellaActiva]}>
            {esFavorito ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.info}>
        <Text style={[styles.nombre, { color: t.texto }]} numberOfLines={2}>
          {oferta.nombre}
        </Text>
        <View style={styles.precios}>
          <Text style={[styles.precio, { color: t.texto }]}>${oferta.precio.toFixed(2)}</Text>
          <Text style={[styles.precioNormal, { color: t.tenue }]}>
            ${oferta.precio_normal.toFixed(2)}
          </Text>
        </View>
        <Text style={[styles.ahorro, { color: t.ahorro }]} numberOfLines={1}>
          Ahorras ${oferta.ahorro.toFixed(2)}
        </Text>
        <View style={styles.pie}>
          <Text style={[styles.tienda, { color: colorTienda }]} numberOfLines={1}>
            {oferta.tienda}
          </Text>
          {hasta && (
            <Text style={[styles.hasta, { color: t.tenue }]} numberOfLines={1}>
              hasta {hasta}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
});

function Seccion({ icono, texto, n, activo, onPress, t }) {
  return (
    <Pressable onPress={onPress} style={styles.seccion} accessibilityRole="button">
      <View
        style={[
          styles.circulo,
          { backgroundColor: activo ? t.activo : t.circulo, borderColor: activo ? t.marca : t.borde },
        ]}
      >
        <Text style={styles.circuloIcono}>{icono}</Text>
      </View>
      <Text
        style={[styles.seccionTexto, { color: activo ? t.texto : t.suave }, activo && styles.negrita]}
        numberOfLines={2}
      >
        {texto}
        {n != null ? ` (${n})` : ''}
      </Text>
    </Pressable>
  );
}

// Panel que sube desde abajo para elegir la tienda
function PanelTiendas({ visible, onCerrar, tiendas, porTienda, total, tienda, onElegir, t, oscuro }) {
  const opciones = [{ nombre: null, n: total }, ...tiendas.map((x) => ({ nombre: x, n: porTienda[x] }))];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable style={styles.velo} onPress={onCerrar} />
      <View style={[styles.panel, { backgroundColor: t.tarjeta }]}>
        <View style={[styles.asa, { backgroundColor: t.borde }]} />
        <Text style={[styles.panelTitulo, { color: t.texto }]}>Elige una tienda</Text>
        {opciones.map((o) => {
          const activa = tienda === o.nombre;
          const color = o.nombre
            ? (oscuro && COLORES_TIENDA_OSCURO[o.nombre]) || COLORES_TIENDA[o.nombre]
            : t.marca;
          return (
            <Pressable
              key={o.nombre ?? 'todas'}
              onPress={() => onElegir(o.nombre)}
              style={[styles.opcion, activa && { backgroundColor: t.activo }]}
            >
              <View style={[styles.punto, { backgroundColor: color }]} />
              <Text style={[styles.opcionTexto, { color: t.texto }, activa && styles.negrita]}>
                {o.nombre ?? 'Todas las tiendas'}
              </Text>
              <Text style={[styles.opcionN, { color: t.suave }]}>{o.n}</Text>
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

export default function App() {
  const oscuro = useColorScheme() === 'dark';
  const t = oscuro ? TEMAS.oscuro : TEMAS.claro;

  const [datos, setDatos] = useState(datosLocales);
  const [tienda, setTienda] = useState(null);
  const [grupo, setGrupo] = useState(null);
  const [favoritos, setFavoritos] = useState(() => new Set());
  const [orden, setOrden] = useState('descuento');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);

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

  const maxDescuento = useMemo(
    () => deLaTienda.reduce((m, o) => Math.max(m, o.descuento_pct), 0),
    [deLaTienda],
  );

  // secciones con ofertas en la tienda elegida (la activa se muestra siempre)
  const secciones = useMemo(() => {
    const cuenta = {};
    for (const o of deLaTienda) cuenta[o.grupo] = (cuenta[o.grupo] ?? 0) + 1;
    return [...GRUPOS, OTROS]
      .map((g) => ({ ...g, ...partirNombre(g.nombre), n: cuenta[g.id] ?? 0 }))
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

  // con un número impar de ofertas, un hueco invisible evita que la última se estire
  const celdas = useMemo(
    () => (visibles.length % 2 ? [...visibles, RELLENO] : visibles),
    [visibles],
  );

  const textoVacio =
    grupo === FAVORITOS && !busqueda
      ? 'Aún no tienes favoritos aquí. Toca la ☆ de una oferta para guardarla.'
      : 'No hay ofertas que coincidan con tu búsqueda.';

  const elegirGrupo = (id) => setGrupo(grupo === id ? null : id);

  const cabecera = (
    <View>
      {/* Banda de marca con buscador */}
      <View style={[styles.banda, { backgroundColor: t.marca }]}>
        <Text style={[styles.marca, { color: t.marcaTexto }]}>Ofertas EC</Text>
        <Text style={[styles.lema, { color: t.marcaTexto }]}>
          {maxDescuento > 0 ? `Hoy ahorras hasta ${maxDescuento}%` : 'Las ofertas del día'}
        </Text>
        <Text style={[styles.actualizado, { color: t.marcaTexto }]}>
          {datos.total} ofertas · actualizado {horaActualizacion(datos.actualizado)}
        </Text>
        <TextInput
          style={styles.buscador}
          placeholder="Buscar: arroz, atún, leche…"
          placeholderTextColor="#8C9692"
          value={busqueda}
          onChangeText={setBusqueda}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {error && <Text style={[styles.error, { color: t.error }]}>{error}</Text>}

      {/* Secciones en círculos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filaSecciones}
      >
        <Seccion icono="🛒" texto="Todo" activo={!grupo} onPress={() => setGrupo(null)} t={t} />
        <Seccion
          icono="⭐"
          texto="Favoritos"
          n={nFavoritos}
          activo={grupo === FAVORITOS}
          onPress={() => elegirGrupo(FAVORITOS)}
          t={t}
        />
        {secciones.map((g) => (
          <Seccion
            key={g.id}
            icono={g.icono}
            texto={g.texto}
            activo={grupo === g.id}
            onPress={() => elegirGrupo(g.id)}
            t={t}
          />
        ))}
      </ScrollView>

      {/* Tienda + número de resultados */}
      <View style={styles.filaTienda}>
        <Pressable
          onPress={() => setPanelAbierto(true)}
          style={[
            styles.botonTienda,
            { backgroundColor: tienda ? t.activo : t.tarjeta, borderColor: tienda ? t.marca : t.borde },
          ]}
          accessibilityRole="button"
        >
          <Text style={[styles.botonTiendaTexto, { color: t.texto }]} numberOfLines={1}>
            {tienda ?? 'Todas las tiendas'} ▾
          </Text>
        </Pressable>
        <Text style={[styles.contador, { color: t.suave }]}>{visibles.length} resultados</Text>
      </View>

      {/* Orden: pestañas */}
      <View style={[styles.pestanas, { backgroundColor: t.borde }]}>
        {ORDENES.map((o) => {
          const activa = orden === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => setOrden(o.id)}
              style={[styles.pestana, activa && { backgroundColor: t.tarjeta }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
            >
              <Text
                style={[
                  styles.pestanaTexto,
                  { color: activa ? t.texto : t.suave },
                  activa && styles.negrita,
                ]}
                numberOfLines={1}
              >
                {o.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={[styles.pantalla, { backgroundColor: t.fondo }]}>
      <StatusBar style={t.barra} backgroundColor={t.marca} />
      <View style={[styles.franja, { backgroundColor: t.marca }]} />
      <FlatList
        data={celdas}
        keyExtractor={(o) => o.id}
        numColumns={2}
        columnWrapperStyle={styles.columnas}
        renderItem={({ item }) =>
          item === RELLENO ? (
            <View style={styles.hueco} />
          ) : (
            <TarjetaOferta
              oferta={item}
              esFavorito={favoritos.has(item.id)}
              onFavorito={cambiarFavorito}
              t={t}
              oscuro={oscuro}
            />
          )
        }
        extraData={favoritos}
        ListHeaderComponent={cabecera}
        ListEmptyComponent={<Text style={[styles.vacio, { color: t.suave }]}>{textoVacio}</Text>}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={cargando}
            onRefresh={actualizar}
            colors={[t.marca]}
            tintColor={t.marca}
          />
        }
      />
      <PanelTiendas
        visible={panelAbierto}
        onCerrar={() => setPanelAbierto(false)}
        tiendas={tiendas}
        porTienda={datos.por_tienda ?? {}}
        total={datos.total}
        tienda={tienda}
        onElegir={(x) => {
          setTienda(x);
          setPanelAbierto(false);
        }}
        t={t}
        oscuro={oscuro}
      />
    </View>
  );
}

const ARRIBA = Platform.OS === 'web' ? 0 : 44; // espacio de la barra de estado

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  franja: { height: ARRIBA },
  lista: {
    paddingBottom: 32,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  banda: {
    marginHorizontal: -12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  marca: { fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  lema: { fontSize: 15, fontWeight: '600', marginTop: 2 },
  actualizado: { fontSize: 12, opacity: 0.85, marginTop: 2 },
  buscador: {
    backgroundColor: '#FFFFFF',
    color: '#16201C',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginTop: 12,
  },
  error: { marginTop: 10, paddingHorizontal: 4 },
  filaSecciones: { gap: 6, paddingTop: 14, paddingBottom: 6, paddingHorizontal: 2 },
  seccion: { width: 74, alignItems: 'center' },
  circulo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloIcono: { fontSize: 24 },
  seccionTexto: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 14 },
  negrita: { fontWeight: '700' },
  filaTienda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  botonTienda: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 1,
  },
  botonTiendaTexto: { fontSize: 14, fontWeight: '600' },
  contador: { fontSize: 13 },
  pestanas: { flexDirection: 'row', borderRadius: 12, padding: 3, marginTop: 10, marginBottom: 12 },
  pestana: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  pestanaTexto: { fontSize: 13 },
  columnas: { gap: 10 },
  hueco: { flex: 1 },
  vacio: { textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  tarjeta: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
    overflow: 'hidden',
  },
  imagenCaja: {
    height: 140,
    backgroundColor: '#FFFFFF', // las fotos de las tiendas tienen fondo blanco
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagen: { width: '86%', height: 124 },
  sinImagen: { fontSize: 12, color: '#AAA' },
  descuento: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0B7A55',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  descuentoTexto: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  estrella: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  estrellaTexto: { fontSize: 20, color: '#9AA39F', lineHeight: 24 },
  estrellaActiva: { color: '#F4B400' },
  info: { padding: 10, paddingTop: 8, flex: 1 },
  nombre: { fontSize: 13, lineHeight: 17, minHeight: 34 },
  precios: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  precio: { fontSize: 19, fontWeight: '800' },
  precioNormal: { fontSize: 13, textDecorationLine: 'line-through' },
  ahorro: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  pie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  tienda: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  hasta: { fontSize: 11 },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 24 : 48, // deja sitio a la barra de gestos
    paddingTop: 8,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  asa: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  panelTitulo: { fontSize: 17, fontWeight: '700', marginBottom: 6, paddingHorizontal: 4 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
  },
  punto: { width: 12, height: 12, borderRadius: 6 },
  opcionTexto: { fontSize: 16, flex: 1 },
  opcionN: { fontSize: 14 },
});
