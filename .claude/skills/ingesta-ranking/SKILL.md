---
name: ingesta-ranking
description: Carga en Supabase los PDFs que la liga de tenis de Rivas manda por mail (contactos, calendario de grupo, ranking, horarios). Usar cuando llegue un mail de ligasmunicipales@rivasciudad.es, cuando Gaston pida "cargar la fase" o "ejecutar la ingesta", o en la tarea programada semanal.
---

# Ingesta del Ranking de Tenis de Rivas

Objetivo: leer los PDFs de la liga y llamar **una vez por mail** a la RPC `public.cargar_ingesta(payload jsonb)`
del proyecto Supabase de Ranking Tenis Rivas. La RPC es transaccional e idempotente: hace los upserts y
devuelve `resumen` y `avisos`. No escribas en las tablas directamente.

## Paso 1. Encontrar mails nuevos

1. Buscar en Gmail: `from:ligasmunicipales@rivasciudad.es has:attachment newer_than:30d`.
   Si Gaston reenvía los mails desde otra cuenta, buscar también `subject:(ranking tenis) has:attachment newer_than:30d`.
2. Para cada mensaje, comprobar si ya se procesó:
   `select 1 from public.ingestas where gmail_message_id = '<id del mensaje>'`.
   Si existe, saltarlo. Usa el `id` del mensaje de Gmail (no el del hilo).
3. Si no hay mensajes nuevos, terminar e informar "sin novedades".

## Paso 2. Leer los PDFs

Cada mail suele traer varios PDFs. Clasificarlos por el título de la primera página:

| Título                                             | Tipo                 | Qué extraer                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RANKING DE TENIS - DATOS DE RANKISTAS`            | **contactos**        | Filas de la tabla: Rankista, Teléfono, Correo electrónico. **Ignorar la columna Grupo**: son los grupos de la fase 1 y no sirven para fases posteriores. **Parar en la sección "EXPARTICIPANTES O PERSONAS INTERESADAS"**: esas filas no se cargan.                                                                                              |
| `RANKING DE TENIS Nª FASE GRUPO X`                 | **calendario_grupo** | Fase `N` y grupo `X` del título. Tabla con columnas V (vuelta), J (jornada), Local, Visitante, Instalación, Fecha, Hora, IdPartido. La Fecha es el **lunes de la semana** en que toca jugar. Los nombres largos ocupan **dos líneas**: la segunda línea (sin V/J/Fecha/IdPartido) continúa el nombre de la fila anterior; únelas con un espacio. |
| `RANKING DE TENIS 2026/2027` (posiciones y puntos) | ranking_general      | No se carga en v1. Solo anotar el nombre del archivo en `archivos`.                                                                                                                                                                                                                                                                              |
| `RANKING DE TENIS - ALQUILER DE PISTAS`            | horarios             | No se carga. Solo anotar el archivo.                                                                                                                                                                                                                                                                                                             |
| Otro                                               | otro                 | No se carga. Anotar el archivo y mencionarlo en el informe.                                                                                                                                                                                                                                                                                      |

Reglas de extracción:

- Copiar los nombres **tal como aparecen**, en mayúsculas y con sus acentos. La base los normaliza
  (quita acentos y signos) para cruzar contactos con calendarios, así que `JUAN JOSE RUIZ VAZQUEZ` y
  `JUAN JOSÉ RUÍZ VÁZQUEZ` son la misma persona. No corrijas ni "mejores" los nombres.
- Teléfonos: pasar los 9 dígitos tal cual (`612345678`); la base los convierte a `+34…`.
- Emails: en minúsculas, sin espacios.
- Fechas como `YYYY-MM-DD`. `26/10/2026` → `2026-10-26`.
- `id_partido` como texto (`"108999"`), `vuelta` y `jornada` como enteros.
- Si un mail trae varios calendarios (varios grupos), van todos en el array `calendarios`.
- Si un PDF no se puede leer, no inventes datos: deja fuera ese archivo y dilo en el informe.

## Paso 3. Armar el payload

```json
{
  "origen": "agente",
  "gmail_message_id": "<id del mensaje de Gmail>",
  "asunto_mail": "<asunto>",
  "recibido_at": "<fecha del mail en ISO 8601>",
  "archivos": ["CONTACTOS_RANKING_TENIS_26-27.pdf", "RANKING_TENIS_FASE_2_GRUPO_H.pdf"],
  "temporada": "2026-27",
  "contactos": [
    {
      "nombre": "ROBERTO GASTÓN CORBALÁN LUGO",
      "telefono": "612345678",
      "email": "alguien@mail.com"
    }
  ],
  "calendarios": [
    {
      "fase": 2,
      "grupo": "H",
      "partidos": [
        {
          "id_partido": "108999",
          "vuelta": 1,
          "jornada": 1,
          "semana": "2026-10-26",
          "local": "ROBERTO GASTÓN CORBALÁN LUGO",
          "visitante": "JOSÉ VILLÉN ALTAMIRANO"
        }
      ]
    }
  ]
}
```

- `temporada`: la del PDF de contactos o del ranking (`26-27` → `"2026-27"`). Si no aparece, `"2026-27"`.
- Si el mail solo trae contactos, `calendarios` va vacío (y al revés).
- Un ejemplo completo construido con PDFs reales está en `agente/ejemplos/fase2.json`.

## Paso 4. Ejecutar la RPC

Con el MCP de Supabase (`execute_sql`) en el proyecto de Ranking Tenis Rivas:

```sql
select public.cargar_ingesta($payload$ { ...json... } $payload$::jsonb);
```

Usa dollar-quoting (`$payload$ … $payload$`) para no tener que escapar comillas. Un mail = una llamada.

La respuesta es `{"estado":"ok","ingesta_id":…,"resumen":{…},"avisos":[…]}` o
`{"estado":"duplicada",…}` si ese `gmail_message_id` ya se cargó.

Comprobación rápida tras cargar: `contactos_leidos` ≈ nº de filas del PDF de contactos (80 en la temporada
2026-27), `partidos_nuevos` = 28 por grupo de 8 jugadores, `jugadores_creados_sin_contacto` = 0 si todos los
del calendario estaban en el directorio.

## Paso 5. Informar

Responder a Gaston en pocas líneas: mails procesados, archivos de cada uno, `resumen` y los `avisos`
(`jugador_sin_contacto`, `telefono_invalido`, `email_invalido`, `partido_modificado`). Recordarle que la
fase nueva queda **sin publicar**: debe revisarla en `/admin/fases` y publicarla.

## Nunca

- Marcar una fase como publicada o actual (eso lo hace Gaston en la app).
- Borrar o modificar filas a mano. Si algo salió mal, informa y espera instrucciones.
- Cargar los exparticipantes, el ranking general ni los horarios como contactos o calendarios.
- Inventar teléfonos, emails o nombres que no estén en los PDFs.
