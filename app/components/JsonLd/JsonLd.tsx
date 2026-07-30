// Emits JSON-LD structured data as a <script type="application/ld+json">.
// Deliberately AVOIDS dangerouslySetInnerHTML (K7 / lint-banned): the JSON is the
// script's text child, with <, >, & escaped to \u sequences so React never
// HTML-escapes them and the JSON-LD stays valid + safe. Data is first-party/static,
// never user input.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
  return <script type="application/ld+json">{json}</script>
}
