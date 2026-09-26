# NeoGoat Pro · 20 perfiles de Octubre 2026

Estos son los **20 mazos predeterminados de NeoGoat Pro 0.3.2 beta.60**, en el mismo orden del selector del cliente. Cada perfil contiene Main, Extra y Side, una guía de uso en español y planes concretos de entradas y salidas para el Side Deck.

- [Biblioteca de los 20 perfiles](https://neogoat-platform.vercel.app/decks.html?collection=defaults)
- [Catálogo de perfiles](neogoat-pro-oct-2026.json)
- [YDK originales](oct_2026/)
- [Manifiesto de procedencia y SHA-256](source-manifest-oct-2026.json)

Los YDK corresponden al paquete final Windows beta.60, SHA-256 `d2906d2ac46495156f765d8404d5f690b9c94bf76745c01908c51a1fdb8343df`, y coinciden con las entradas de distribución Android. Se conservan sus bytes, incluidas las terminaciones de línea. No incluyen listas personales adicionales.

## Guías y formato

El catálogo usa `oct_2026`, las 2.229 entradas del pool web de Octubre y los límites de la banlist activa. Su equivalente nativo de NeoGoat Pro es `neogoat_october_2026`, hash de formato `8A84D6ED`.

Las guías de uso están en `play-guides-oct-2026.json`. Las funciones de las cartas del Side y los 105 planes están en `side-guides-oct-2026.json`. Parten de la revisión de los veinte Side del 25 de septiembre y se ajustan a las listas finales de beta.60: en particular, Armed Dragon lleva una Level Up! y tres Flying Kamakiri #1; Insect Normal lleva Nobleman of Crossout en Main y dos 4-Starred Ladybug of Doom en Side. El manifiesto detalla las adaptaciones.

Cada plan se aplica por separado sobre la lista original. Las comprobaciones verifican que las cartas existen en la zona de origen, se intercambia la misma cantidad y se conservan tamaño, inventario y legalidad. Esto no mide el rendimiento en Matches humanos ni establece una clasificación competitiva.

## Regenerar y comprobar

Desde la raíz del repositorio, sin acceso a los archivos privados de NeoGoat Pro:

```sh
node tools/build-default-profiles.js
node tools/build-default-profiles.js --check
node tests/default-profiles.test.js
node tests/formats.test.js
node tests/ydke.test.js
```

La prueba opcional de navegación necesita Playwright y Chromium disponibles:

```sh
node tests/profiles-ui.test.js
```

Comprueba los veinte perfiles, descargas YDK exactas, apertura en el editor, guías, filtros, perfiles históricos, disponibilidad sin la base de datos comunitaria y vista móvil. Sustituye las peticiones comunitarias por fixtures locales y nunca publica datos de prueba.

Los perfiles predeterminados se versionan en GitHub y se sirven como datos estáticos. Los perfiles y comentarios de la comunidad conservan su almacenamiento existente; esta publicación no modifica esos registros.
