// [PAUSED] OpenCode Go config — descomentar cuando se migre de Antigravity a OpenCode Go
/*
import { defineConfig } from 'oh-my-openagent';
import { TOONSerializer } from '@toon-format/toon';

export default defineConfig({
  provider: 'opencode-go',
  protocol: new TOONSerializer(),

  routing: {
    // Tareas livianas: explorar codebase, buscar archivos, fix de sintaxis
    explorer: {
      model: 'deepseek-v4-flash',
      max_tokens: 2000,
      middleware: ['headroom', 'tokenshrink'],
    },
    // Tareas pesadas: refactoring, arquitectura, nuevos módulos NestJS
    orchestrator: {
      model: 'qwen-3.7-max',
      max_tokens: 8000,
      middleware: ['headroom', 'ponytail-full'],
    },
  },

  // Contexto específico de bus-impl para que el agente conozca la stack
  context: {
    framework: 'nestjs',
    orm: 'drizzle-orm',
    validation: 'zod',
    runtime: 'node-24-esm',
    cloud: 'aws-sdk-pod-identity',
    testing: {
      unit: 'vitest',
      e2e: 'playwright',
      bdd: 'cucumber',
    },
    linter: 'biome',
    pathAliases: {
      '@/*': './src/*',
      '@tests/*': './tests/*',
    },
  },

  memory: {
    engine: 'LCM',
    db_path: './.agent-stack/memory/lcm_context_graph.db',
  },
});
*/
