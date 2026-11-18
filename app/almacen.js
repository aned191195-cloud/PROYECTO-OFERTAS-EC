// Guarda en el dispositivo las últimas ofertas descargadas, para poder
// mostrarlas sin internet.
// - Móvil: un archivo en la carpeta de documentos de la app (expo-file-system).
//   No usamos AsyncStorage porque en Android falla con textos de más de ~2 MB.
// - Web: AsyncStorage (localStorage del navegador), porque expo-file-system no
//   funciona en web.
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

const NOMBRE = 'ofertas.json';

export async function leerGuardadas() {
  try {
    if (Platform.OS === 'web') {
      const texto = await AsyncStorage.getItem(NOMBRE);
      return texto ? JSON.parse(texto) : null;
    }
    const archivo = new File(Paths.document, NOMBRE);
    if (!archivo.exists) return null;
    return JSON.parse(await archivo.text());
  } catch {
    return null; // archivo dañado o ilegible: como si no hubiera nada guardado
  }
}

export async function guardar(texto) {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(NOMBRE, texto);
      return;
    }
    const archivo = new File(Paths.document, NOMBRE);
    if (!archivo.exists) archivo.create();
    await archivo.write(texto);
  } catch {
    // si no se puede guardar, la app sigue funcionando con lo descargado
  }
}
