import { EnvironmentVariable } from '@postty/contracts';

export type VariableMap = Record<string, string>;

export class VariableInterpolator {
  private static dynamicVariables: Record<string, () => string> = {
    '$guid': () => crypto.randomUUID(),
    '$uuid': () => crypto.randomUUID(),
    '$timestamp': () => Math.floor(Date.now() / 1000).toString(),
    '$isoTimestamp': () => new Date().toISOString(),
    '$randomInt': () => Math.floor(Math.random() * 1000).toString(),
  };

  /**
   * Builds a simple key-value lookup dictionary from enabled environment variables
   */
  public static buildLookup(
    variables: EnvironmentVariable[],
    overrides?: Record<string, string>
  ): VariableMap {
    const map: VariableMap = {};
    for (const v of variables) {
      if (v.enabled) {
        map[v.key] = v.value;
      }
    }
    if (overrides) {
      Object.assign(map, overrides);
    }
    return map;
  }

  /**
   * Replaces all `{{variable_name}}` in a string using variables and dynamic generators
   */
  public static interpolate(
    text: string,
    vars: VariableMap,
    maxDepth = 5
  ): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let current = text;
    let depth = 0;
    const regex = /\{\{([a-zA-Z0-9_$.-]+)\}\}/g;

    while (regex.test(current) && depth < maxDepth) {
      current = current.replace(regex, (match, key: string) => {
        // Check dynamic variables first ($guid, $timestamp, etc.)
        if (key in this.dynamicVariables) {
          return this.dynamicVariables[key]();
        }

        // Check user environment variables
        if (key in vars) {
          return vars[key];
        }

        // Leave unreplaced if not found
        return match;
      });
      depth++;
    }

    return current;
  }

  /**
   * Recursively interpolates string values inside an object or array
   */
  public static interpolateDeep<T>(value: T, vars: VariableMap): T {
    if (typeof value === 'string') {
      return this.interpolate(value, vars) as unknown as T;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.interpolateDeep(item, vars)) as unknown as T;
    }
    if (value !== null && typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.interpolateDeep(v, vars);
      }
      return result as unknown as T;
    }
    return value;
  }
}
