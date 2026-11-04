# Hebreo Bíblico I

Aplicación de estudio del hebreo bíblico para Android y navegador, versión **4.9.0**.

Incluye 140 palabras, siete voces verbales, qatal, sufijos pronominales, ejemplos bíblicos, Génesis 1, Génesis 12, Éxodo 20, ejercicios y seguimiento local.

## Publicar en GitHub Pages
1. En este repositorio ve a **Settings → Pages**.
2. En **Build and deployment → Source** elige **Deploy from a branch**.
3. En **Branch** selecciona `main` y `/(root)`; guarda.
4. La aplicación estará en https://job140.github.io/hebreo-biblico-I/
5. Abre ese enlace en Chrome en Android → ⋮ → **Instalar aplicación**.

## Actualizar sin desinstalar
Publica la nueva versión sustituyendo `index.html` y, cuando corresponda, `genesis12.js` en **este mismo repositorio**, y actualiza `CACHE_VERSION` de `sw.js` (p. ej., `4.9.0`). Mantén la ruta de `sw.js`, el `id` y la URL de instalación. La app mostrará **Actualizar ahora** al detectar una versión nueva. No borres los datos del sitio; el progreso local se conserva normalmente.

Para editar los archivos con GitHub, utiliza **Add file → Upload files** o la interfaz de edición. No publiques los ZIP directamente.

> Nota: los datos de progreso residen en el navegador del dispositivo, no en una cuenta en la nube. Cambiar de móvil o borrar datos del navegador requiere una copia de seguridad para conservarlos.

## Preparación para Google Play

Revisa [Google Play / guía y ficha](./google-play/README.md). Política pública: [privacidad.html](./privacidad.html). No hay todavía un Android App Bundle firmado ni publicación aprobada.

## Cuentas, perfiles e instituciones (v4.9.0)

Se incorporó la interfaz de **Mi cuenta** para preparar inicio de sesión con Google/Apple, códigos únicos de estudiantes y sincronización voluntaria de progreso. Las cuentas están **desactivadas hasta que se cree y configure el proyecto Firebase**: `auth/firebase-config.js` contiene campos vacíos. El estudio como invitado permanece intacto.

- [Arquitectura y módulo de autenticación](./auth/README.md)
- [Configurar Firebase, Firestore y Cloud Functions](./firebase/README.md)
- [Reglas de seguridad](./firebase/firestore.rules)
- [Eliminación de cuenta](./eliminar-cuenta.html)

**No se ha desplegado Firebase, ni se han habilitado Google/Apple.** Crear el proyecto y aceptar facturación son pasos del titular de la cuenta Firebase. Antes de usar datos reales hay que probar en emuladores las reglas, las invitaciones y la eliminación.
