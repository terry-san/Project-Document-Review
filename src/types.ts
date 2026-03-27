export interface Config {
  regions: string[];
  models: string[];
  functions: string[];
}

export interface Document {
  id: string;
  title: string;
  fileUrl: string;
  region: string;
  model: string;
  function?: string; // Made optional as per new requirement
  createdAt: any; // Firestore Timestamp
  authorUid: string;
}

export interface Review {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string;
  status: 'agree' | 'disagree';
  timestamp: any; // Firestore Timestamp
  function: string;
}
