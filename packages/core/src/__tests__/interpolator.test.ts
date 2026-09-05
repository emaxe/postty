import { describe, expect, it } from 'vitest';
import { VariableInterpolator } from '../interpolator.js';

describe('VariableInterpolator', () => {
  it('should interpolate simple variables', () => {
    const template = '{{baseUrl}}/users/{{userId}}';
    const vars = { baseUrl: 'https://api.example.com', userId: '42' };

    const result = VariableInterpolator.interpolate(template, vars);
    expect(result).toBe('https://api.example.com/users/42');
  });

  it('should keep unreplaced variables untouched', () => {
    const template = '{{baseUrl}}/users/{{unknown}}';
    const vars = { baseUrl: 'https://api.example.com' };

    const result = VariableInterpolator.interpolate(template, vars);
    expect(result).toBe('https://api.example.com/users/{{unknown}}');
  });

  it('should handle dynamic variables like $guid and $timestamp', () => {
    const template = 'Request-ID: {{$guid}}, Time: {{$timestamp}}';
    const result = VariableInterpolator.interpolate(template, {});

    expect(result).toMatch(/Request-ID: [0-9a-f-]{36}, Time: \d{10}/);
  });

  it('should recursively interpolate deep objects', () => {
    const input = {
      url: '{{baseUrl}}/items',
      headers: {
        'Authorization': 'Bearer {{token}}',
      },
      list: ['{{item1}}', '{{item2}}'],
    };

    const vars = {
      baseUrl: 'https://api.example.com',
      token: 'secret-xyz',
      item1: 'apple',
      item2: 'banana',
    };

    const result = VariableInterpolator.interpolateDeep(input, vars);
    expect(result).toEqual({
      url: 'https://api.example.com/items',
      headers: {
        'Authorization': 'Bearer secret-xyz',
      },
      list: ['apple', 'banana'],
    });
  });

  it('should resolve nested variables up to maxDepth', () => {
    const template = '{{greeting}}';
    const vars = {
      greeting: 'Hello, {{name}}!',
      name: 'Alice',
    };

    const result = VariableInterpolator.interpolate(template, vars);
    expect(result).toBe('Hello, Alice!');
  });
});
