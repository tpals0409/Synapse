export type EdgeKind = 'co_occur' | 'semantic';

export type Concept = {
  id: string;
  label: string;
  kind?: string;
  embedding?: number[];
  createdAt: number;
};

export type GraphEdge = {
  fromId: string;
  toId: string;
  kind: EdgeKind;
  weight: number;
};
