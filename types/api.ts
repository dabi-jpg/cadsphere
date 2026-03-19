export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string | null;
  organization: string | null;
}

export interface ApiFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    files: number;
  };
}

export interface ApiFile {
  id: string;
  filename: string;
  filetype: string;
  size: number;
  storagePath: string;
  thumbnailPath: string | null;
  folderId: string | null;
  folder: { id: string; name: string } | null;
  tags: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    versions: number;
  };
  isStarred?: boolean;
}

export interface ApiVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  size: number;
  note: string | null;
  uploadedAt: Date;
}

export interface ApiSharedFile {
  id: string;
  fileId: string;
  permission: string;
  createdAt: Date;
  file?: ApiFile;
  sharedBy?: ApiUser;
}

export interface ApiComment {
  id: string;
  fileId: string;
  body: string;
  createdAt: Date;
  user?: ApiUser;
}

export interface ApiStarredFile {
  id: string;
  fileId: string;
  createdAt: Date;
  file?: ApiFile;
}

export interface ApiTrashFile extends ApiFile {
  daysRemaining: number;
  originalLocation: string;
}

export interface ApiActivityLog {
  id: string;
  action: string;
  fileId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  user?: ApiUser;
  file?: { filename: string } | null;
}

export interface ApiStorageSummary {
  totalBytes: number;
  fileCount: number;
  byType: Record<string, number>;
}
