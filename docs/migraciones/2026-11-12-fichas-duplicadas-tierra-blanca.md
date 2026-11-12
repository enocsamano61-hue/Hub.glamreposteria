# Fichas duplicadas de una alumna de Tierra Blanca (12 nov 2026)

"Permitido generar" de Enoc. Corrección de datos (sin cambios en el Hub ni en las funciones).

## Qué pasaba
La misma alumna estaba 3 veces: la ficha buena (teléfono correcto, lead de hoy de Josefina y un lead viejo de septiembre de
otra vendedora) y dos fichas del Excel (una con dos dígitos del teléfono cambiados, con sus notas de cobranza; otra sin
nombre, con un "1" de más). Al buscar su número salían 3 tarjetas y la que traía toda la información tenía el número mal.

## Qué se hizo
Respaldo: `respaldo.personas_20261112`, `respaldo.leads_20261112`, `respaldo.inscripciones_20261112`.
1. La ficha del Excel con notas pasó completa a la ficha buena (su inscripción histórica, con nota "FICHAS JUNTADAS").
2. La ficha sin nombre quedó marcada "DUPLICADO · usar la ficha de …" (su inscripción histórica no se pudo pasar: la
   base no deja dos inscripciones de la misma persona en el mismo curso, y era una copia vacía de la otra). Las dos
   fichas viejas se llaman "DUPLICADO · usar la ficha de …"; no se borró nada.
3. El lead de septiembre se cerró ("No va", comentario "DUPLICADO: la retomó Josefina"); la venta sigue en el lead de Josefina.
   (Ese lead cuenta como 1 "no van" de septiembre en Glamy BI; se dejó así porque no hay un estatus de "duplicado".)
4. En el historial de la ficha buena quedó la nota con el correo anterior y las notas del Excel.

Vigilante 0 rojas después.
