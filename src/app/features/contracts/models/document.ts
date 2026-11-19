export type Piece = { kind: 'text'; value: string } | { kind: 'slot'; name: string };

export interface DocumentBlock {
  kind: 'title' | 'heading' | 'paragraph';
  pieces: Piece[];
}
