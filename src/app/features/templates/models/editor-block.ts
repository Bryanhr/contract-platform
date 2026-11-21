export type EditorBlockKind = 'title' | 'heading' | 'paragraph';

export type EditorPiece =
  | { kind: 'text'; value: string }
  | { kind: 'field'; name: string };

export interface EditorBlock {
  id: string;
  kind: EditorBlockKind;
  pieces: EditorPiece[];
}
