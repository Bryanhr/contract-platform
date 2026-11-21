import { DocumentBlock, Piece } from '../models/document';

export function readTemplate(content: string): DocumentBlock[] {
  return content.split('\n').flatMap((line): DocumentBlock[] => {
    const trimmed = line.trim();
    if (!trimmed || /^N\.º\s+\{\{numero\}\}$/.test(trimmed)) return [];
    if (trimmed.startsWith('## ')) return [{ kind: 'heading', pieces: expand(pieces(trimmed.slice(3))) }];
    if (trimmed.startsWith('# ')) return [{ kind: 'title', pieces: expand(pieces(trimmed.slice(2))) }];
    return [{ kind: 'paragraph', pieces: expand(pieces(trimmed)) }];
  });
}

function pieces(line: string): Piece[] {
  const result: Piece[] = [];
  const pattern = /\{\{([a-z0-9_]+)\}\}/gi;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ kind: 'text', value: line.slice(last, index) });
    result.push({ kind: 'slot', name: match[1] });
    last = index + match[0].length;
  }
  if (last < line.length) result.push({ kind: 'text', value: line.slice(last) });
  return result;
}

function expand(parts: Piece[]): Piece[] {
  return parts.flatMap((part) => {
    if (part.kind !== 'slot') return [part];
    if (part.name === 'representante_frase') {
      return [
        { kind: 'text', value: ', participa a través de ' },
        { kind: 'slot', name: 'representante' },
      ];
    }
    if (part.name === 'contacto') {
      return [
        { kind: 'text', value: ' Domicilio: ' },
        { kind: 'slot', name: 'direccion' },
        { kind: 'text', value: '. Correo: ' },
        { kind: 'slot', name: 'correo' },
        { kind: 'text', value: '. Teléfono: ' },
        { kind: 'slot', name: 'telefono' },
        { kind: 'text', value: '.' },
      ];
    }
    return [part];
  });
}
