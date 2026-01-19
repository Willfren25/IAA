# IAA - Agente IA Generador de Workflows n8n

IA Agent especializado en generar workflows de n8n desde descripciones en lenguaje natural o JSON parcial.

## Características

- **Precisión Técnica**: Validación estricta de schemas JSON
- **Motor de Reglas**: Garantiza workflows válidos en n8n
- **Arquitectura Hexagonal**: Puertos y adaptadores para máxima modularidad
- **SOLID Ready**: Principios de diseño desde la base

## Quick Start

```bash
# Instalar dependencias
npm install

# Verificar estructura
npm run type-check

# Build
npm run build
```

## Estructura del Proyecto

```
src/
├── core/              # Lógica de negocio pura (sin dependencias)
├── ports/             # Contratos/interfaces (Dependency Inversion)
├── adapters/          # Implementaciones concretas
│   ├── input/         # Adaptadores de entrada (CLI, Parser, API)
│   ├── output/        # Adaptadores de salida (Formatters, Writers)
│   └── external/      # Servicios externos (LLM, n8n APIs)
├── application/       # Casos de uso y orquestación
└── infrastructure/    # Config, logging, DI
```

## Principios de Diseño

- **S**ingle Responsibility: Cada componente, una responsabilidad
- **O**pen/Closed: Abierto a extensión, cerrado a modificación
- **L**iskov Substitution: Implementaciones intercambiables
- **I**nterface Segregation: Interfaces granulares
- **D**ependency Inversion: Depender de abstracciones

## Fases de Desarrollo

- ✅ **Fase 1**: Fundación (Infraestructura, Estructura)
- ⏳ **Fase 2-11**: Core, Puertos, Adaptadores, Testing, Deployment
