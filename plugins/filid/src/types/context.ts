export interface ContextDocumentRef {
  fractalPath: string;
  intentPath: string | null;
  detailPath: string | null;
  intentLines?: number;
  documentStatus: 'valid' | 'violations' | 'missing';
}

export interface ContextResolution {
  targetPath: string;
  ownerFractalPath: string;
  chain: ContextDocumentRef[];
  nearestDetailPath: string | null;
  outputLanguage: string;
}
