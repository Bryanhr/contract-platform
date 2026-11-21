import { EditorBlock, EditorPiece } from '../models/editor-block';

let blockSeq = 0;

export function newBlockId() {
  blockSeq += 1;
  return `b${blockSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyBlock(kind: EditorBlock['kind'] = 'paragraph'): EditorBlock {
  return { id: newBlockId(), kind, pieces: [{ kind: 'text', value: '' }] };
}

/** Turn stored markdown-like content into editable blocks. */
export function parseTemplateContent(content: string | null | undefined): EditorBlock[] {
  const lines = String(content ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const blocks: EditorBlock[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || /^N\.º\s+\{\{numero\}\}$/.test(trimmed)) continue;

    if (trimmed.startsWith('## ')) {
      blocks.push({ id: newBlockId(), kind: 'heading', pieces: parsePieces(trimmed.slice(3)) });
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ id: newBlockId(), kind: 'title', pieces: parsePieces(trimmed.slice(2)) });
      continue;
    }
    blocks.push({ id: newBlockId(), kind: 'paragraph', pieces: parsePieces(trimmed) });
  }

  return blocks.length ? blocks : [emptyBlock('title'), emptyBlock('paragraph')];
}

/** Serialize editor blocks back to the API content format. */
export function serializeTemplateContent(blocks: EditorBlock[]): string {
  return blocks
    .map((block) => {
      const line = serializePieces(block.pieces).trim();
      if (!line) return '';
      if (block.kind === 'title') return `# ${line}`;
      if (block.kind === 'heading') return `## ${line}`;
      return line;
    })
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Backend keeps content as-is only when it contains `# CONTRATO`.
 * Otherwise it wraps the text inside the default contract shell.
 * Full documents always include `N.º {{numero}}` (with blank lines around it)
 * so the backend can fill the id. Preview and editor hide that line.
 */
export function contentForApi(content: string, mode: 'full' | 'clause'): string {
  // Backend fill() only knows {{direccion}}, not {{domicilio}}.
  const text = content.trim().replaceAll(/\{\{domicilio\}\}/gi, '{{direccion}}');
  if (mode === 'clause') return text;
  const withTitle = text.includes('# CONTRATO') ? text : `# CONTRATO\n\n${text}`;
  return withContractNumber(withTitle);
}

/** Place `N.º {{numero}}` after the title, with blank lines before and after. */
function withContractNumber(content: string): string {
  const lines = content
    .split('\n')
    .filter((line) => !/^N\.º\s+\{\{numero\}\}$/.test(line.trim()));

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  const titleIndex = lines.findIndex((line) => /^\s*#\s/.test(line) && !/^\s*##\s/.test(line));
  if (titleIndex < 0) {
    return ['N.º {{numero}}', '', ...lines].join('\n');
  }

  const before = lines.slice(0, titleIndex + 1);
  const after = lines.slice(titleIndex + 1);
  while (after.length && !after[0].trim()) after.shift();

  return [...before, '', 'N.º {{numero}}', '', ...after].join('\n');
}

export function emptyFullDocument(): EditorBlock[] {
  return [
    {
      id: newBlockId(),
      kind: 'title',
      pieces: [{ kind: 'text', value: 'CONTRATO DE PRESTACIÓN DE SERVICIOS DE SOPORTE' }],
    },
    emptyBlock('paragraph'),
  ];
}

function parsePieces(line: string): EditorPiece[] {
  const result: EditorPiece[] = [];
  const pattern = /\{\{([a-z0-9_]+)\}\}/gi;
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) result.push({ kind: 'text', value: line.slice(last, index) });
    result.push({ kind: 'field', name: normalizeFieldName(match[1].toLowerCase()) });
    last = index + match[0].length;
  }
  if (last < line.length) result.push({ kind: 'text', value: line.slice(last) });
  return result.length ? result : [{ kind: 'text', value: '' }];
}

function serializePieces(pieces: EditorPiece[]): string {
  return pieces
    .map((piece) => (piece.kind === 'field' ? `{{${normalizeFieldName(piece.name)}}}` : piece.value))
    .join('');
}

/** Backend fill() expects {{direccion}}; older templates may still say {{domicilio}}. */
function normalizeFieldName(name: string): string {
  return name === 'domicilio' ? 'direccion' : name;
}
