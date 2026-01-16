/**
 * CLI Logger - Sistema de logging para el CLI
 *
 * Provee logging con colores y spinners para mejor UX.
 */

import type { CliLogger } from './types.js';

/**
 * Códigos ANSI para colores
 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

/**
 * Símbolos para mensajes
 */
const SYMBOLS = {
  info: 'ℹ',
  success: '✔',
  warning: '⚠',
  error: '✖',
  arrow: '→',
  bullet: '•',
} as const;

/**
 * Frames para spinner
 */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Estado del spinner
 */
interface SpinnerState {
  isRunning: boolean;
  message: string;
  frameIndex: number;
  intervalId?: ReturnType<typeof setInterval>;
}

/**
 * Opciones del logger
 */
export interface LoggerOptions {
  /** Modo verbose */
  verbose?: boolean;
  /** Modo silencioso */
  quiet?: boolean;
  /** Deshabilitar colores */
  noColor?: boolean;
  /** Stream de salida */
  stdout?: NodeJS.WriteStream;
  /** Stream de errores */
  stderr?: NodeJS.WriteStream;
}

/**
 * Crea un logger para el CLI
 */
export function createCliLogger(options: LoggerOptions = {}): CliLogger {
  const {
    verbose = false,
    quiet = false,
    noColor = false,
    stdout = process.stdout,
    stderr = process.stderr,
  } = options;

  const spinnerState: SpinnerState = {
    isRunning: false,
    message: '',
    frameIndex: 0,
  };

  /**
   * Aplica color si está habilitado
   */
  const colorize = (text: string, color: keyof typeof COLORS): string => {
    if (noColor) {
      return text;
    }
    return `${COLORS[color]}${text}${COLORS.reset}`;
  };

  /**
   * Limpia la línea actual del spinner
   */
  const clearSpinnerLine = (): void => {
    if (stdout.isTTY) {
      stdout.write('\r\x1b[K');
    }
  };

  /**
   * Escribe mensaje al stdout
   */
  const write = (message: string, isError = false): void => {
    const stream = isError ? stderr : stdout;

    if (spinnerState.isRunning) {
      clearSpinnerLine();
    }

    stream.write(message + '\n');

    if (spinnerState.isRunning) {
      renderSpinner();
    }
  };

  /**
   * Renderiza el spinner
   */
  const renderSpinner = (): void => {
    if (!stdout.isTTY) {
      return;
    }

    const frame = SPINNER_FRAMES[spinnerState.frameIndex] ?? '⠋';
    const text = colorize(frame, 'cyan') + ' ' + spinnerState.message;
    stdout.write('\r' + text);
  };

  return {
    info(message: string): void {
      if (quiet) {
        return;
      }
      const symbol = colorize(SYMBOLS.info, 'blue');
      write(`${symbol} ${message}`);
    },

    success(message: string): void {
      if (quiet) {
        return;
      }
      const symbol = colorize(SYMBOLS.success, 'green');
      write(`${symbol} ${colorize(message, 'green')}`);
    },

    warning(message: string): void {
      const symbol = colorize(SYMBOLS.warning, 'yellow');
      write(`${symbol} ${colorize(message, 'yellow')}`);
    },

    error(message: string): void {
      const symbol = colorize(SYMBOLS.error, 'red');
      write(`${symbol} ${colorize(message, 'red')}`, true);
    },

    debug(message: string): void {
      if (!verbose) {
        return;
      }
      const prefix = colorize('[DEBUG]', 'dim');
      write(`${prefix} ${colorize(message, 'dim')}`);
    },

    spinner: {
      start(message: string): void {
        if (quiet || !stdout.isTTY) {
          // En modo quiet o sin TTY, solo mostrar mensaje
          write(message);
          return;
        }

        spinnerState.isRunning = true;
        spinnerState.message = message;
        spinnerState.frameIndex = 0;

        // Ocultar cursor
        stdout.write('\x1b[?25l');

        spinnerState.intervalId = setInterval(() => {
          spinnerState.frameIndex = (spinnerState.frameIndex + 1) % SPINNER_FRAMES.length;
          renderSpinner();
        }, 80);

        renderSpinner();
      },

      stop(success = true, message?: string): void {
        if (!spinnerState.isRunning) {
          return;
        }

        if (spinnerState.intervalId) {
          clearInterval(spinnerState.intervalId);
          spinnerState.intervalId = undefined;
        }

        spinnerState.isRunning = false;
        clearSpinnerLine();

        // Mostrar cursor
        if (stdout.isTTY) {
          stdout.write('\x1b[?25h');
        }

        // Mostrar mensaje final
        const finalMessage = message || spinnerState.message;
        if (success) {
          const symbol = colorize(SYMBOLS.success, 'green');
          write(`${symbol} ${colorize(finalMessage, 'green')}`);
        } else {
          const symbol = colorize(SYMBOLS.error, 'red');
          write(`${symbol} ${colorize(finalMessage, 'red')}`);
        }
      },

      update(message: string): void {
        spinnerState.message = message;
        if (!spinnerState.isRunning && !quiet) {
          write(message);
        }
      },
    },
  };
}

/**
 * Logger por defecto (singleton)
 */
let defaultLogger: CliLogger | null = null;

/**
 * Obtiene el logger por defecto
 */
export function getDefaultLogger(): CliLogger {
  if (!defaultLogger) {
    defaultLogger = createCliLogger();
  }
  return defaultLogger;
}

/**
 * Configura el logger por defecto
 */
export function configureDefaultLogger(options: LoggerOptions): void {
  defaultLogger = createCliLogger(options);
}
