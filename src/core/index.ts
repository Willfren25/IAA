/**
 * Core Domain
 *
 * Esta capa contiene la lógica de negocio pura sin dependencias externas.
 * Es el corazón de la aplicación y representa conceptos del dominio n8n.
 */

// Domain - Types, Enums, Constants, DTOs
export * from './domain/index.js';

// Rules Engine - Strategy Pattern
export * from './rules/index.js';

// Validation - JSON Schema + AJV
export * from './validation/index.js';
