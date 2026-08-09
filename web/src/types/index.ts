export type UserRole = 'user' | 'moderator' | 'admin';
export type ScriptType = 'free' | 'paid_coming_soon';
export type VisibilityType = 'public' | 'unlisted' | 'private';
export type KeyRequirementType = 'keyless' | 'key_required' | 'unknown';
export type ScriptStatusType = 'published' | 'pending_review' | 'rejected' | 'draft';
export type ReactionType = 'like' | 'dislike';
export type ReportReasonType = 'malicious' | 'copyright' | 'inappropriate' | 'misleading' | 'other';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  role: UserRole;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  author_id: string;
  title: string;
  game_id?: string;
  game_name?: string;
  is_hub_or_universal: boolean;
  script_type: ScriptType;
  supported_games: string[];
  features?: string;
  tags: string[];
  script_content: string;
  commit_message?: string;
  visibility: VisibilityType;
  key_requirement: KeyRequirementType;
  is_patched: boolean;
  is_verified: boolean;
  thumbnail_url?: string;
  slug: string;
  status: ScriptStatusType;
  view_count: number;
  like_count: number;
  dislike_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields from profiles
  author_display_name?: string;
  author_username?: string;
  author_avatar_url?: string;
  author_role?: UserRole;
  // Current user interaction flags
  user_reaction?: ReactionType | null;
  user_favorite?: boolean;
}

export interface ScriptFilterState {
  query: string;
  exactMatch: boolean;
  verifiedOnly: boolean;
  allGames: boolean;
  patchedOnly: boolean;
  keyRequirement?: 'key_required' | 'keyless' | '';
  scriptType?: ScriptType | '';
  gameQuery: string;
  sortBy: 'created_at' | 'updated_at' | 'view_count' | 'like_count' | 'dislike_count' | 'similarity';
  sortOrder: 'new' | 'old';
}

export interface ReportFormValues {
  reason: ReportReasonType;
  details: string;
}

// ======== WEAO API (Exploits section) ========

export interface WeaoExploit {
  _id: string;
  title: string;
  version?: string;
  updatedDate?: string;
  uncStatus?: boolean;
  free?: boolean;
  detected?: boolean;
  rbxversion?: string;
  updateStatus?: boolean;
  websitelink?: string;
  discordlink?: string;
  purchaselink?: string;
  platform?: string;
  extype?: string;
  type?: string;
  cost?: string;
  decompiler?: boolean;
  multiInject?: boolean;
  raknet?: boolean;
  suncPercentage?: number;
  uncPercentage?: number;
  sunc?: {
    suncScrap?: string;
    suncKey?: string;
  };
  hidden?: boolean;
  keysystem?: boolean;
  clientmods?: boolean;
  beta?: boolean;
  elementCertified?: boolean;
}

export interface WeaoVersions {
  Windows?: string;
  WindowsDate?: string;
  Mac?: string;
  MacDate?: string;
  Android?: string;
  AndroidDate?: string;
  iOS?: string;
  iOSDate?: string;
}

export interface WeaoSuncTest {
  name: string;
  description?: string;
  library?: string;
  status: string;
  reason?: string;
}

export interface WeaoSuncData {
  timestamp?: number;
  version?: string;
  timeTaken?: number;
  executor?: string;
  outdated?: boolean;
  tests?: {
    passed?: WeaoSuncTest[];
    failed?: WeaoSuncTest[];
  };
}
