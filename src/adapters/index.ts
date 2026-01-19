/**
 * @fileoverview Adapters Module - Main barrel export
 * @module @adapters
 *
 * This module exports all adapters following the hexagonal architecture pattern.
 * Adapters connect ports to external systems, frameworks, and user interfaces.
 *
 * @architecture
 * ```
 *   [External Systems]
 *          ↕
 *   [Adapters Layer]  ← You are here
 *          ↕
 *     [Ports Layer]
 *          ↕
 *   [Domain/Core Layer]
 * ```
 *
 * @categories
 * - Input Adapters: Handle incoming requests (CLI, REST API, etc.)
 * - Output Adapters: Handle outgoing operations (File system, formatters, etc.)
 * - External Adapters: Connect to external services (LLM, n8n API, etc.)
 */

// ============================================================================
// Input Adapters
// ============================================================================

/**
 * Input adapters handle incoming requests and user interactions.
 * They implement input ports and translate external requests to domain operations.
 */
export * from './input/index.js';

// ============================================================================
// Output Adapters
// ============================================================================

/**
 * Output adapters handle outgoing operations and data persistence.
 * They implement output ports and translate domain results to external formats.
 */
export * from './output/index.js';

// ============================================================================
// External Adapters
// ============================================================================

/**
 * External adapters connect to third-party services and APIs.
 * They implement external ports and handle communication with external systems.
 */
export * from './external/index.js';
