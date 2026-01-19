/**
 * LLM Cache - Sistema de caché para respuestas LLM
 */

import type { CacheEntry, CacheOptions } from './types.js';
import { DEFAULT_CACHE_OPTIONS } from './types.js';

/**
 * Caché LRU simple para respuestas LLM
 */
export class LlmCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  /**
   * Genera hash para key de caché
   */
  private hashKey(input: string): string {
    if (this.options.hashFunction) {
      return this.options.hashFunction(input);
    }
    // Simple hash basado en djb2
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    }
    return `cache_${hash >>> 0}`;
  }

  /**
   * Obtiene valor del caché
   */
  get(key: string): T | undefined {
    if (!this.options.enabled) {
      return undefined;
    }

    const hashedKey = this.hashKey(key);
    const entry = this.cache.get(hashedKey);

    if (!entry) {
      return undefined;
    }

    // Verificar expiración
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hashedKey);
      return undefined;
    }

    // Actualizar hits y mover al final (LRU)
    const updatedEntry: CacheEntry<T> = {
      ...entry,
      hits: entry.hits + 1,
    };
    this.cache.delete(hashedKey);
    this.cache.set(hashedKey, updatedEntry);

    return entry.value;
  }

  /**
   * Guarda valor en caché
   */
  set(key: string, value: T): void {
    if (!this.options.enabled) {
      return;
    }

    const hashedKey = this.hashKey(key);
    const now = Date.now();

    // Evicción si excede máximo
    if (this.cache.size >= this.options.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + this.options.ttlMs,
      hits: 0,
    };

    this.cache.set(hashedKey, entry);
  }

  /**
   * Verifica si existe una key
   */
  has(key: string): boolean {
    if (!this.options.enabled) {
      return false;
    }

    const hashedKey = this.hashKey(key);
    const entry = this.cache.get(hashedKey);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(hashedKey);
      return false;
    }

    return true;
  }

  /**
   * Elimina entrada del caché
   */
  delete(key: string): boolean {
    const hashedKey = this.hashKey(key);
    return this.cache.delete(hashedKey);
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Obtiene tamaño actual
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Limpia entradas expiradas
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): {
    size: number;
    maxEntries: number;
    ttlMs: number;
    enabled: boolean;
    totalHits: number;
  } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
    }

    return {
      size: this.cache.size,
      maxEntries: this.options.maxEntries,
      ttlMs: this.options.ttlMs,
      enabled: this.options.enabled,
      totalHits,
    };
  }

  /**
   * Configura opciones
   */
  configure(options: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Factory para crear caché
 */
export function createLlmCache<T>(options?: Partial<CacheOptions>): LlmCache<T> {
  return new LlmCache<T>(options);
}
