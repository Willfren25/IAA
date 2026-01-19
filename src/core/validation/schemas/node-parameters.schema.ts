/**
 * Node-specific JSON Schemas
 *
 * Schemas detallados para parámetros de nodos específicos de n8n.
 */

/**
 * Schema para parámetros de Webhook
 */
export const webhookParametersSchema = {
  type: 'object',
  properties: {
    httpMethod: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    path: { type: 'string', minLength: 1 },
    authentication: {
      type: 'string',
      enum: ['none', 'basicAuth', 'headerAuth', 'jwtAuth'],
    },
    responseMode: {
      type: 'string',
      enum: ['onReceived', 'lastNode', 'responseNode'],
    },
    responseData: {
      type: 'string',
      enum: ['allEntries', 'firstEntryJson', 'firstEntryBinary', 'noData'],
    },
    options: {
      type: 'object',
      properties: {
        binaryData: { type: 'boolean' },
        ignoreBots: { type: 'boolean' },
        rawBody: { type: 'boolean' },
        responseHeaders: { type: 'object' },
      },
      additionalProperties: true,
    },
  },
  required: ['httpMethod', 'path'],
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de Cron/Schedule
 */
export const cronParametersSchema = {
  type: 'object',
  properties: {
    rule: {
      type: 'object',
      properties: {
        interval: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'cronExpression'],
              },
              secondsInterval: { type: 'number', minimum: 1 },
              minutesInterval: { type: 'number', minimum: 1, maximum: 59 },
              hoursInterval: { type: 'number', minimum: 1, maximum: 23 },
              daysInterval: { type: 'number', minimum: 1 },
              weeksInterval: { type: 'number', minimum: 1 },
              monthsInterval: { type: 'number', minimum: 1, maximum: 12 },
              triggerAtHour: { type: 'number', minimum: 0, maximum: 23 },
              triggerAtMinute: { type: 'number', minimum: 0, maximum: 59 },
              triggerAtDay: {
                type: 'string',
                enum: [
                  'monday',
                  'tuesday',
                  'wednesday',
                  'thursday',
                  'friday',
                  'saturday',
                  'sunday',
                ],
              },
              triggerAtDayOfMonth: { type: 'number', minimum: 1, maximum: 31 },
              expression: { type: 'string' },
            },
            required: ['field'],
            additionalProperties: true,
          },
        },
      },
      required: ['interval'],
      additionalProperties: true,
    },
  },
  required: ['rule'],
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de HTTP Request
 */
export const httpRequestParametersSchema = {
  type: 'object',
  properties: {
    method: {
      type: 'string',
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    url: { type: 'string' },
    authentication: {
      type: 'string',
      enum: ['none', 'predefinedCredentialType', 'genericCredentialType'],
    },
    sendBody: { type: 'boolean' },
    specifyBody: {
      type: 'string',
      enum: ['json', 'string'],
    },
    bodyParameters: {
      type: 'object',
      properties: {
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['name', 'value'],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    jsonBody: { type: 'string' },
    sendHeaders: { type: 'boolean' },
    headerParameters: {
      type: 'object',
      properties: {
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['name', 'value'],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    sendQuery: { type: 'boolean' },
    queryParameters: {
      type: 'object',
      properties: {
        parameters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'string' },
            },
            required: ['name', 'value'],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    options: {
      type: 'object',
      properties: {
        batching: {
          type: 'object',
          properties: {
            batch: {
              type: 'object',
              properties: {
                batchSize: { type: 'number', minimum: 1 },
                batchInterval: { type: 'number', minimum: 0 },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        redirect: {
          type: 'object',
          properties: {
            redirect: {
              type: 'object',
              properties: {
                followRedirects: { type: 'boolean' },
                maxRedirects: { type: 'number', minimum: 0 },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        response: {
          type: 'object',
          properties: {
            response: {
              type: 'object',
              properties: {
                fullResponse: { type: 'boolean' },
                neverError: { type: 'boolean' },
                responseFormat: { type: 'string' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        timeout: { type: 'number', minimum: 0 },
        lowercaseHeaders: { type: 'boolean' },
      },
      additionalProperties: true,
    },
  },
  required: ['method', 'url'],
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de IF
 */
export const ifParametersSchema = {
  type: 'object',
  properties: {
    conditions: {
      type: 'object',
      properties: {
        options: {
          type: 'object',
          properties: {
            caseSensitive: { type: 'boolean' },
            leftValue: { type: 'string' },
            typeValidation: { type: 'string', enum: ['strict', 'loose'] },
          },
          additionalProperties: true,
        },
        conditions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              leftValue: {},
              rightValue: {},
              operator: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  operation: { type: 'string' },
                  rightType: { type: 'string' },
                  singleValue: { type: 'boolean' },
                },
                required: ['type', 'operation'],
                additionalProperties: true,
              },
            },
            required: ['leftValue', 'operator'],
            additionalProperties: true,
          },
        },
        combinator: { type: 'string', enum: ['and', 'or'] },
      },
      additionalProperties: true,
    },
    looseTypeValidation: { type: 'boolean' },
  },
  required: ['conditions'],
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de Switch
 */
export const switchParametersSchema = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['rules', 'expression'] },
    options: {
      type: 'object',
      properties: {
        fallbackOutput: { type: 'string', enum: ['none', 'extra'] },
      },
      additionalProperties: true,
    },
    rules: {
      type: 'object',
      properties: {
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conditions: {
                type: 'object',
                properties: {
                  options: {
                    type: 'object',
                    properties: {
                      caseSensitive: { type: 'boolean' },
                      leftValue: { type: 'string' },
                      typeValidation: { type: 'string' },
                    },
                    additionalProperties: true,
                  },
                  conditions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                  combinator: { type: 'string', enum: ['and', 'or'] },
                },
                additionalProperties: true,
              },
              outputKey: { type: 'string' },
              renameOutput: { type: 'boolean' },
            },
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
  },
  required: ['mode'],
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de Set
 */
export const setParametersSchema = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['manual', 'raw'] },
    duplicateItem: { type: 'boolean' },
    includeOtherFields: { type: 'boolean' },
    include: { type: 'string', enum: ['all', 'selected', 'except', 'none'] },
    options: {
      type: 'object',
      properties: {
        dotNotation: { type: 'boolean' },
        ignoreConversionErrors: { type: 'boolean' },
        includeBinary: { type: 'boolean' },
      },
      additionalProperties: true,
    },
    assignments: {
      type: 'object',
      properties: {
        assignments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              value: {},
            },
            required: ['name'],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    jsonOutput: { type: 'string' },
  },
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de Code/Function
 */
export const codeParametersSchema = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['runOnceForAllItems', 'runOnceForEachItem'] },
    language: { type: 'string', enum: ['javaScript', 'python'] },
    jsCode: { type: 'string' },
    pythonCode: { type: 'string' },
    notice: { type: 'string' },
  },
  additionalProperties: true,
} as const;

/**
 * Schema para parámetros de Merge
 */
export const mergeParametersSchema = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['append', 'combine', 'chooseBranch', 'multiplex'],
    },
    combinationMode: {
      type: 'string',
      enum: ['mergeByPosition', 'mergeByFields', 'multiplex'],
    },
    mergeByFields: {
      type: 'object',
      properties: {
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field1: { type: 'string' },
              field2: { type: 'string' },
            },
            required: ['field1', 'field2'],
            additionalProperties: true,
          },
        },
      },
      additionalProperties: true,
    },
    joinMode: {
      type: 'string',
      enum: ['keepMatches', 'keepNonMatches', 'enrichInput1', 'enrichInput2', 'keepEverything'],
    },
    outputDataFrom: { type: 'string', enum: ['both', 'input1', 'input2'] },
    options: {
      type: 'object',
      properties: {
        clashHandling: {
          type: 'object',
          properties: {
            values: {
              type: 'object',
              properties: {
                resolveClash: {
                  type: 'string',
                  enum: ['preferInput1', 'preferInput2', 'addSuffix'],
                },
                mergeMode: { type: 'string', enum: ['deepMerge', 'shallowMerge'] },
                overrideEmpty: { type: 'boolean' },
              },
              additionalProperties: true,
            },
          },
          additionalProperties: true,
        },
        multipleMatches: { type: 'string', enum: ['first', 'last', 'all'] },
        disableDotNotation: { type: 'boolean' },
        numberInputs: { type: 'number', minimum: 2 },
      },
      additionalProperties: true,
    },
    chooseBranch: { type: 'string', enum: ['input1', 'input2'] },
  },
  required: ['mode'],
  additionalProperties: true,
} as const;

/**
 * Mapa de schemas por tipo de nodo
 */
export const nodeParameterSchemas: Record<string, object> = {
  'n8n-nodes-base.webhook': webhookParametersSchema,
  'n8n-nodes-base.scheduleTrigger': cronParametersSchema,
  'n8n-nodes-base.httpRequest': httpRequestParametersSchema,
  'n8n-nodes-base.if': ifParametersSchema,
  'n8n-nodes-base.switch': switchParametersSchema,
  'n8n-nodes-base.set': setParametersSchema,
  'n8n-nodes-base.code': codeParametersSchema,
  'n8n-nodes-base.merge': mergeParametersSchema,
};

/**
 * Obtiene el schema de parámetros para un tipo de nodo
 */
export function getNodeParameterSchema(nodeType: string): object | undefined {
  return nodeParameterSchemas[nodeType];
}

/**
 * Verifica si existe un schema para el tipo de nodo
 */
export function hasNodeParameterSchema(nodeType: string): boolean {
  return nodeType in nodeParameterSchemas;
}
