# 🎨 Paleta C "rosa claro" del Hub y letra nueva del nombre del diploma de gira — 20 oct 2026

Enoc mandó dos imágenes:
- **Una paleta de helado de fresa:** frambuesa `#A62C55`, rosa medio `#CC6B8E`, rosa `#E296B0`, rosa claro `#F1BEC7` y crema `#F8E9E4`.
- **Un diploma de gira** con el nombre en mayúsculas, en letra de palo semicondensada y café.

Pidió:
- la paleta **para el Hub**, cuidando que **no se parezca a la primera** (la de vino y beige);
- en el diploma, **solo cambiar la letra del nombre de la alumna** y **solo en el de gira**, con el mismo color de su certificado.

## Cómo se eligió

**Paleta:**
1. La primera muestra (frambuesa oscuro con fondo crema) se descartó: se parecía a la paleta original de vino con beige.
2. Se mostraron dos opciones sobre el Hub real:
   - **C · Rosa claro:** barra pastel con letra oscura.
   - **D · Rosa vivo:** barra rosa intenso con letra blanca.
3. Enoc eligió la **C**.

**Letra del nombre:** se midieron las proporciones del nombre en su imagen y se compararon 19 letras libres.
- La más parecida fue **Barlow Semi Condensed**: estilo DIN, mismos anchos de letra.
- Enoc la aprobó al verla junto a su diploma, en SemiBold.
- El color es el mismo café de las líneas del diploma: `#774228`.

## Qué cambió

### Hub (`hub/index.html`, solo estilos y colores de gráficas)

**Variables** (se conservaron los nombres para no tocar cientos de reglas):

| Variable | Antes (paleta B) | Ahora (paleta C) |
|---|---|---|
| `--wine` | fucsia `#C2338A` | frambuesa `#B23C6C` (botones, acentos) |
| `--wine-dark` | morado `#5B2C83` | frambuesa oscuro `#8E2F57` |
| `--champagne` | azul `#4AA3F0` | rosa de adorno `#E296B0` |
| `--bg` | lila `#F7F5FF` | rosa muy suave `#FDF5F7` |
| `--ink`, `--ink-soft`, `--border` | tonos morado/gris | tonos ciruela/rosa |
| `--wine-rgb` | 194,51,138 | 178,60,108 |

Variables nuevas:
- `--barra-1` `#FBE6EC` y `--barra-2` `#F1BEC7`: el degradado de la barra.
- `--sobre-barra` `#4A1838` y `--sobre-barra-suave`: la letra de la barra.
- `--fondo-entrada`: el degradado de rosa claro a rosa.

**Dónde se aplica:**
- **Barra lateral y barra del celular:** degradado rosa pastel con letra oscura. La sección abierta resalta en blanco con letra frambuesa.
- **Inicio de sesión, cambio de contraseña y bienvenida:** degradado de rosa claro a rosa. En la bienvenida la letra pasó a oscura.
- **Glamy:** encabezado frambuesa. El cupcake cambió de colores: base frambuesa, betún rosa claro y cereza roja (antes azul).
- **Gráficas de Reportes y colores del calendario:** frambuesa.

**Qué no cambió (a propósito):** los colores de estado, para que el equipo no se confunda:
- ámbar: anticipo, debe, por confirmar, VIP;
- verde: liquidado;
- rojo: debe o error;
- terracota: atención;
- morado: pago reportado 💜.

**Legibilidad (contraste WCAG):**
- menú sobre la barra: 7.6 a 10:1;
- botón frambuesa con letra blanca: 5.6:1;
- texto: 12:1;
- texto suave: 5.4:1.

### Diploma de gira
- **Letra:** `hub/certificados/BarlowSemiCondensed-SemiBold.ttf`, licencia OFL (`OFL-Barlow.txt`), que permite usarla y meterla en los PDF.
- **`pdf-certificado.js`:**
  - letra `barlow` en `CERT_FUENTES`;
  - opción de campo `mayusculas: true` (`textoCert`), que pasa el texto a mayúsculas respetando acentos y ñ.
- **Vistas previas:** las del Hub ("Así sale" y la de la plantilla) y la de la página de diplomas muestran el nombre en mayúsculas con esa letra.
- **Plantilla de gira** (`certificado_plantillas`, tipo `gira`): el campo `nombre` pasó de `nickainley` a `barlow` con `mayusculas: true`. Mismo café `#774228`, misma caja y mismos 3 renglones; el tamaño se ajusta solo.
- **Respaldo:** `respaldo.certificado_plantillas_20261020_letra`.
- **Qué no cambió:** el diploma de **Academia**, y en el de gira el fondo, el mes y los demás textos.
- **Diplomas ya generados:** siguen como estaban. Los nuevos, y los que se regeneren, salen con la letra nueva.
- **Caché:** la versión de `pdf-certificado.js` cambió a `v=20261020c`, en el Hub y en la página de diplomas.

## Pruebas
- **`pruebas/prueba_paleta_y_letra.js` (17/17):**
  - **Paleta:**
    - las variables de la paleta C;
    - que no quede ningún color de las paletas anteriores;
    - la barra rosa pastel;
    - el contraste del menú, del botón y del texto;
    - la sección activa en blanco;
    - inicio de sesión en rosa claro;
    - celular sin scroll de lado.
  - **Diploma:** se arma el PDF real y se revisa que:
    - el nombre lleve Barlow Semi Condensed;
    - quede "MARÍA FERNANDA / LÓPEZ / DE LA GARZA";
    - los demás datos no pasen a mayúsculas;
    - acepte ñ y diéresis;
    - el PDF pese menos de 1.2 MB.
- **Suite completa:** en verde (21 archivos).
- **Capturas:** `paleta-c-hub.png`, `paleta-c-celular.png` y `paleta-c-login.png`.
