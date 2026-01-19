# IAA Frontend

Frontend web para **IAA - Generador de Workflows n8n con IA**.

## 🚀 Tecnologías

- **Astro** - Framework web con islas de interactividad
- **React** - Componentes interactivos (islands)
- **TailwindCSS** - Estilos utilitarios
- **TypeScript** - Tipado estático

## 📦 Instalación

```bash
# Desde la raíz del proyecto
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

## 🏗️ Estructura

```
frontend/
├── src/
│   ├── components/          # Componentes React (islands)
│   │   ├── WorkflowGenerator.tsx
│   │   ├── PromptEditor.tsx
│   │   └── WorkflowPreview.tsx
│   ├── layouts/             # Layouts de Astro
│   │   └── Layout.astro
│   ├── lib/                 # Utilidades y clientes
│   │   └── iaa-client.ts
│   ├── pages/               # Rutas de la aplicación
│   │   ├── index.astro      # Dashboard principal
│   │   ├── templates.astro  # Galería de templates
│   │   ├── docs.astro       # Documentación
│   │   └── api/
│   │       └── generate.ts  # API endpoint
│   └── styles/
│       └── global.css       # Estilos globales
├── public/                  # Assets estáticos
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## 🎨 Características

- ✨ **Editor DSL** con syntax highlighting
- 📊 **Preview visual** de nodos y conexiones
- 📋 **Copiar/Descargar** JSON generado
- 📚 **Templates** prediseñados
- 📖 **Documentación** integrada
- 🌙 **Dark mode** por defecto

## 🔧 Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
# URL del backend IAA
PUBLIC_BACKEND_URL=http://localhost:3000
```

## 📜 Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Compila para producción |
| `npm run preview` | Preview del build |

## 🔗 Integración con Backend

El frontend se comunica con el backend IAA a través del endpoint `/api/generate`.

Para desarrollo local:
1. Inicia el backend: `npm run build && npm start` (desde raíz)
2. Inicia el frontend: `cd frontend && npm run dev`
