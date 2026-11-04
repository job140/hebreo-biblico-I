# Hebreo Bíblico I — Guía de publicación en Google Play

Actualizada: 4 de noviembre de 2026.

## 0. Estado y decisiones

- Sitio actual: **https://job140.github.io/hebreo-biblico-I/** (PWA, versión web 4.8.1 tras publicar estos cambios).
- Repositorio del código: **job140/hebreo-biblico-I**.
- Nombre en tienda: **Hebreo Bíblico I**.
- ID de paquete propuesto: **com.job140.hebreobiblicoi**. Es provisional; confirma que está disponible ANTES de crear el primer lanzamiento en Play Console. **No podrás cambiarlo después de publicar.**
- Modo: aplicación **Trusted Web Activity (TWA)** generada a partir de la PWA, para conservar las actualizaciones de contenidos por HTTPS.
- Versión Android inicial sugerida: 1.0.0, **versionCode: 1**. Este número es distinto de la versión de contenidos web (4.8.1).

## 1. Verificación de dominio: paso obligatorio (leer antes de generar AAB)

PWABuilder usa TWA y exige `https://HOST/.well-known/assetlinks.json`, en **la raíz del host**. Tu aplicación está en la subcarpeta `/hebreo-biblico-I/` del host `job140.github.io`. Por ello:

**No basta con subir `.well-known/assetlinks.json` a este repositorio:** se publicaría en `https://job140.github.io/hebreo-biblico-I/.well-known/assetlinks.json`, que NO es la ruta requerida.

Tienes dos opciones:
- **Recomendada sin comprar dominio:** crear un repositorio de sitio personal llamado exactamente `job140.github.io`, activar GitHub Pages en `main / (root)` y colocar allí `.well-known/assetlinks.json`. La app puede seguir en su URL actual.
- **Alternativa:** adquirir un dominio propio y publicar tu PWA allí, con control sobre su raíz y HTTPS. Este cambio afectaría el origen del almacenamiento y la instalación existente; planifica migración del progreso antes de cambiar de URL.

El archivo `assetlinks.json` solo podrá completarse cuando tengas el **paquete Android definitivo** y la **huella SHA-256 del certificado de firma de aplicación de Play Console**, en **Setup → App integrity → App signing**. Un marcador de posición no valida nada.

Documentación: https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/android.md

## 2. Confirma que Play Console pueda registrarte

- Abre https://play.google.com/console/signup
- Necesitas una cuenta de desarrollador verificada y pagar el registro único de **USD 25**, además de cumplir las condiciones de mayoría de edad y verificación de identidad.
- Si todavía no cumples la edad mínima para registrar una cuenta personal, debe figurar como titular un adulto autorizado, con sus propios datos, responsabilidades y consentimiento.
- Completa los datos reales de titular y contacto. No compartas aquí contraseñas ni documentos de identidad.

## 3. Genera la versión Android con PWABuilder

1. Abre https://www.pwabuilder.com/
2. Introduce la URL: `https://job140.github.io/hebreo-biblico-I/`
3. Comprueba el manifiesto, el icono, HTTPS y la PWA.
4. Ve a **Package for stores → Android → Generate package → Google Play**.
5. Configura:
    - Package ID: `com.job140.hebreobiblicoi` (si está disponible).
    - Nombre: `Hebreo Bíblico I`
    - Version name: `1.0.0`; version code: `1`
    - Start URL: `/hebreo-biblico-I/index.html` (verifica el valor que propone el generador).
    - Notificaciones, ubicación, compras y otras opciones: desactivadas si no las necesitas.
    - Elige **New signing key** para el primer paquete, y guarda el archivo de firma y su contraseña en un lugar privado con respaldo.
6. Descarga el ZIP del generador. Debe contener un archivo **.aab** firmado (para la tienda) y normalmente un APK para pruebas.
7. **Comprueba en Android Studio / inspección del bundle que targetSdkVersion sea 36 o superior**, exigido para apps nuevas desde el 31 de agosto de 2026. Si PWABuilder produce una versión menor, actualiza la plantilla Android y vuelve a compilar antes de subirlo.
8. Nunca publiques el keystore `.jks`, contraseñas, claves privadas o archivos de servicio de Google en GitHub.

## 4. Firma y verificación después de subir AAB

1. Crea la app en Play Console (tipo **App**, idioma **español**, categoría **Educación**).
2. Configura **Play App Signing** cuando te lo soliciten.
3. Sube el AAB a **prueba interna** o al canal que corresponda; esto no publica automáticamente al público.
4. Copia el **SHA-256 del certificado de firma de aplicación** de Play Console. Esta huella puede ser distinta de la de la *upload key* con la que construiste el AAB.
5. Completa la plantilla `assetlinks.EJEMPLO.json` con el nombre real del paquete y esa huella, y guárdala en el repositorio de sitio personal `job140.github.io` bajo `.well-known/assetlinks.json` (no en la subcarpeta del proyecto).
6. Verifica que `https://job140.github.io/.well-known/assetlinks.json` responda HTTPS/200 con JSON válido y sin redirección inesperada.
7. Instala desde Play/internal testing y confirma que se abre en pantalla completa, **sin barra de dirección**.
8. Si hay barra de dirección, comprueba la huella, el package ID y la ruta de assetlinks.

## 5. Ficha de Play, privacidad y pruebas

- Ficha en español: consulta [FICHA_TIENDA.md](./FICHA_TIENDA.md).
- Icono de alta resolución 512×512 PNG; gráfico destacado 1024×500; al menos 2 capturas reales del celular.
- Política pública: `https://job140.github.io/hebreo-biblico-I/privacidad.html`. Revisa y actualiza el texto antes de enviarlo a Google; añade tu correo de soporte real en Play Console.
- Completa **Data safety**, anuncios, acceso, público objetivo, clasificación por edades y formularios pertinentes de la consola, según las funcionalidades reales y componentes del AAB.
- Prueba lectura de hebreo RTL, vocales, ejercicios, audio, funcionamiento sin conexión y avance guardado al cerrar/reabrir.
- Las **cuentas personales creadas después del 13 de noviembre de 2023** suelen necesitar una prueba cerrada de **12 testers inscritos durante al menos 14 días continuos** antes de solicitar acceso a producción.

Requisitos actuales:
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/10144311
- https://support.google.com/googleplay/android-developer/answer/9866151

## 6. Actualizaciones sin reinstalar

**Contenido de la PWA:** seguimos editando `index.html` o los archivos de lecciones del MISMO repositorio, cambiamos la versión del caché `CACHE_VERSION` en `sw.js` y el estudiante acepta «Actualizar ahora» en su app, con conexión a internet. Esto no modifica el AAB y no requiere nueva revisión para simples cambios de contenido.

**Aplicación Android:** si cambias el ID del paquete, icono Android, código nativo, permisos, target SDK, certificado o componente del contenedor, generas un NUEVO AAB con versionCode más alto y lo subes a Play Console para revisión. Mantén las claves de firma y el package ID originales.

**Progreso local:** una PWA instalada desde Chrome y el contenedor TWA de Google Play usan el origen web, pero no asumas que un cambio de instalación o datos del navegador preservará todo automáticamente. Haz pruebas de migración y ofrece exportación de respaldo antes de distribuir públicamente.

## 7. Tareas que no se pueden completar sin tu acceso personal

- Aceptar las condiciones y pagar el registro de Play Console.
- Crear o aprobar el perfil de desarrollador y verificar identidad.
- Generar y custodiar tu contraseña y clave privada de firma.
- Obtener el SHA-256 de Play App Signing.
- Completar declaraciones legales de Play Console, invitar a testers y aprobar el lanzamiento.

Estos pasos quedan bajo tu control como titular. **Este repositorio aún no contiene un AAB firmado ni una publicación de tienda.**
