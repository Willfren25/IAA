/**
 * Type declarations for ajv-formats
 */
declare module 'ajv-formats' {
  import { type Ajv } from 'ajv';

  interface FormatsPluginOptions {
    mode?: 'full' | 'fast';
    keywords?: boolean;
    formats?: string[];
  }

  function addFormats(ajv: Ajv, opts?: FormatsPluginOptions | string[]): Ajv;

  export default addFormats;
}
