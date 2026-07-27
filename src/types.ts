export type Role = 'parent' | 'child';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  familyId: string | null;
  /** Points balance — only meaningful for children. */
  points: number;
  expoPushToken?: string | null;
  createdAt?: string;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  /** 6-char code teens use to join. */
  inviteCode: string;
  createdAt?: string;
}

export type ChoreStatus = 'assigned' | 'submitted' | 'approved' | 'declined';

export interface Chore {
  id: string;
  familyId: string;
  title: string;
  description: string;
  points: number;
  assignedTo: string; // child uid
  assignedToName: string;
  assignedBy: string; // parent uid
  status: ChoreStatus;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  /** Parent's note when a submission is declined. */
  declineNote: string | null;
  /** How many times the teen has submitted (for resubmission tracking). */
  submissionCount: number;
  dueDate: string | null;
  createdAt?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
}

export interface Reward {
  id: string;
  familyId: string;
  title: string;
  description: string;
  cost: number;
  createdBy: string;
  active: boolean;
  createdAt?: string;
}

export type RedemptionStatus = 'requested' | 'fulfilled' | 'denied';

export interface Redemption {
  id: string;
  familyId: string;
  rewardId: string;
  rewardTitle: string;
  childUid: string;
  childName: string;
  cost: number;
  status: RedemptionStatus;
  createdAt?: string;
}
