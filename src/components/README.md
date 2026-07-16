# components/

Componentes de React (reimplementación en Tailwind del design system y de las pantallas).

- `ui/` — primitivas del design system: Button, IconButton, Input, Select, Checkbox, Switch,
  Textarea, Badge, Tag, Avatar, ProgressBar, StatCard, Dialog, Toast, Tooltip, Tabs, Card.
  (Ver `design/Pulse CRM Design System.md`.)
- `layout/` — shell de navegación: AppNav (sidebar / bottom-nav), Topbar, AccountMenu.
- Por feature (se crean al construir cada pantalla): `clientes/`, `ventas/`, `interacciones/`,
  `seguimientos/`, `equipo/`.

> Los `.dc.html` de `design/PROY CRM Pulse/` son referencia visual/UX: reimplementar en
> React + Tailwind mapeando los tokens (no copiar HTML/JS).
