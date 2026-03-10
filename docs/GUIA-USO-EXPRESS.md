# Guía express de uso — Basalt

Guía rápida para conectar, explorar y trabajar con PostgreSQL usando Basalt.

---

## 1. Instalación

- **Binarios:** Descarga el instalador para tu SO en [Releases](https://github.com/FernuDev/basalt/releases) (macOS: `.dmg`, Windows: `.msi`/`.exe`, Linux: `.AppImage`/`.deb`).
- **Desde código:** `git clone`, `pnpm install`, `pnpm tauri dev` (ver [README](../README.md#installation)).

---

## 2. Primera conexión

1. Abre Basalt.
2. En la barra lateral, pulsa **New Connection**.
3. Rellena:
   - **URI:** `postgresql://usuario:contraseña@host:puerto/base_de_datos`  
     Ejemplo: `postgresql://postgres:secret@localhost:5432/mydb`
   - **Nombre:** Un alias (ej. "Local Dev").
   - **Color:** Etiqueta para identificar la conexión.
4. Pulsa **Connect**.

---

## 3. Navegar tablas

- En el panel izquierdo verás las tablas del schema.
- Haz clic en una tabla para ver su contenido.
- Puedes ver conteo de filas e información de tamaño.
- Los datos se muestran paginados y ordenables.

---

## 4. Editor SQL

- Abre la pestaña o panel del **Query Editor**.
- Escribe tu SQL y ejecuta (atajo o botón Run).
- Revisa el tiempo de ejecución y los resultados en la tabla inferior.

---

## 5. Relaciones (Foreign Keys)

- Usa la vista **Relations** para ver las relaciones de claves foráneas del schema.
- Útil para entender dependencias entre tablas antes de modificar datos o escribir queries.

---

## 6. Editar datos

- En la vista de datos de una tabla puedes editar celdas **inline**.
- Los cambios se persisten en la base según el flujo de la app (guardar/confirmar cuando aplique).

---

## 7. Varias conexiones

- Todas las conexiones se guardan **localmente** (sin envío a la nube).
- Cambia entre ellas desde la barra lateral.
- Usa el nombre y el color para distinguir entornos (dev, staging, etc.).

---

## Resumen rápido

| Acción           | Dónde / Cómo |
|------------------|---------------|
| Conectar         | Sidebar → New Connection → URI + nombre + color → Connect |
| Ver tablas       | Sidebar → clic en tabla |
| Ejecutar SQL     | Query Editor → escribir SQL → Run |
| Ver relaciones   | Relations view |
| Editar filas     | Vista de datos de la tabla → edición inline |

Para más detalle, requisitos de build y roadmap, consulta el [README principal](../README.md).
