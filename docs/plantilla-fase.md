# AAAA-MM-DD · Nombre de la fase

Pedido por Enoc el …: qué quiere y para qué. ("permitido generar": pendiente / dado el …)

## Qué se va a hacer
- Base: tablas, funciones, triggers (con respaldo `respaldo.tabla_AAAAMMDD` antes).
- Hub: pantallas y botones.
- Glamy: qué tiene que saber o consultar.

## Nada de fotos
- ¿Se guarda algún número, lista o estado? ¿Quién lo mantiene al día cuando la persona cambia?
- ¿Algo de lo nuevo se ve en dos lugares (Hub, Glamy, Glamy BI)? ¿Sale de la misma función?

## ¿Qué pasa si…?
Responder cada uno con lo que hace lo nuevo (o "no le afecta, porque…"):
1. La capturan tarde (después de un cambio de fecha o de un corte).
2. El lead paga y queda inscrita.
3. Su pago no se encontró.
4. Se cambia de curso.
5. Cede su lugar a otra persona.
6. No va, pide reembolso o pierde su anticipo.
7. Su curso cambia de fecha.
8. La misma persona tiene dos cursos o dos teléfonos.
9. Su curso ya pasó.
10. ¿Glamy, Glamy BI, el Embudo y Cobranza lo cuentan igual?

## Vigilante e historias
- ¿Hace falta una regla nueva en el vigilante (`vigilante_calcular`)? ¿Roja o amarilla?
- ¿Cambia o se agrega una historia en `pruebas/historias/historias.sql`?

## Pruebas
- Playwright (capturas 1200/390), fila en `pruebas/README.md`, `correr_todas.js` en verde.
- Historias con `fallas=0` y reglas rojas del vigilante en 0 antes de publicar.
