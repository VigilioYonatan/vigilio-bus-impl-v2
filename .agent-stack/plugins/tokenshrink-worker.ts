/**
 * TokenShrink Worker — bus-impl
 *
 * Intercepta texto (logs, output de herramientas, archivos grandes)
 * y lo comprime antes de enviarlo al modelo IA.
 *
 * Uso: Headroom invoca este worker automáticamente cuando detecta
 * texto plano o logs en el pipeline de compresión.
 */
export function shrink(input: string): string {
  return (
    input
      // Eliminar líneas vacías consecutivas
      .replace(/(\r?\n){3,}/g, "\n\n")
      // Eliminar comentarios de línea (// ...)
      .replace(/^\s*\/\/.*$/gm, "")
      // Eliminar comentarios de bloque (/* ... */)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Eliminar console.log/debug/info
      .replace(/console\.(log|debug|info|warn)\([\s\S]*?\);?\s*/g, "")
      // Eliminar líneas de import no usadas (type imports vacíos)
      .replace(/^import\s+type\s*\{\s*\}\s+from\s+['"].*?['"];?\s*$/gm, "")
      // Comprimir espacios múltiples (preservar indentación)
      .replace(/[^\S\r\n]{4,}/g, "  ")
      // Eliminar decoradores de NestJS que son metadata pura (no lógica)
      .replace(/@(Module|Injectable|Controller)\(\{[\s\S]*?\}\)/g, (match) => {
        // Mantener solo el nombre del decorador, no el contenido
        const name = match.match(/@(\w+)/)?.[1] ?? "Unknown";
        return `@${name}({...})`;
      })
      .trim()
  );
}

/**
 * Comprime output de AWS CloudWatch logs.
 * Elimina timestamps, request IDs y metadata de Lambda.
 */
export function shrinkAwsLogs(input: string): string {
  return (
    input
      // Eliminar timestamps de CloudWatch
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s*/g, "")
      // Eliminar request IDs de Lambda
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "[REQ_ID]")
      // Eliminar líneas START/END/REPORT de Lambda
      .replace(/^(START|END|REPORT)\s+RequestId:.*$/gm, "")
      .trim()
  );
}
