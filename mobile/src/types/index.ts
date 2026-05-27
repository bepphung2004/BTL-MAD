export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  age?: number;
  gender?: string;
  password?: string;
  address?: string;
  role: 'USER' | 'HR' | 'ADMIN';
  isLocked?: boolean;
  isApproved?: boolean;
  lockedAt?: string;
  lockedReason?: string;
  company?: {
    _id: string;
    name: string;
    logo?: string;
    isActive: boolean;
  };
  registrationCompany?: {
    name?: string;
    taxCode?: string;
    scale?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ICompanyPendingHr {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  requestedAt: string;
}

export interface ICompany {
  _id: string;
  name: string;
  logo?: string;
  address?: string;
  description?: string;
  taxCode?: string;
  scale?: string;
  isActive: boolean;
  followers?: string[];
  isFollowed?: boolean;
  jobCount?: number;
  pendingHrs?: ICompanyPendingHr[];
  createdAt: string;
  updatedAt: string;
  hr?: IUser;
  hrs?: IUser[];
}

export interface IJob {
  _id: string;
  name: string;
  company: ICompany;
  skills: ISkill[];
  salary: string;
  quantity: number;
  level: string;
  description: string;
  applicationsCount?: number;
  location: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

}

export interface ISkill {
  _id: string;
  name: string;
}

export interface IUserCV {
  _id: string;
  url: string;
  name: string;
  title?: string;
  description?: string;
  isPrimary: boolean;
  onlineCvId?: string; // Optional reference to online CV - if exists, CV was created online
  fileType?: 'pdf' | 'docx' | 'online';
  parsedText?: string;
  skills?: string[];
  education?: string[];
  experience?: string[];
  certificates?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface IApplication {
  _id: string;
  cv?: IUserCV | string;
  cvId?: IUserCV | string;
  user: IUser;
  userId?: IUser | string;
  company?: ICompany | string;
  companyId?: ICompany | string;
  job?: IJob | string;
  jobId?: IJob | string;
  coverLetter?: string;
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED';
  history: {
    status: string;
    updatedAt: string;
    updatedBy: {
      _id: string;
      email: string;
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface IComment {
  _id: string;
  user: IUser | string;
  company: ICompany | string;
  content: string;
  rating?: number;
  parentId?: string;
  parent?: string;
  left: number;
  right: number;
  children?: IComment[];
  replies?: IComment[];
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  _id: string;
  title: string;
  content: string;
  message: string;
  type: 'JOB' | 'RESUME' | 'COMPANY' | 'SYSTEM' | 'APPLICATION';
  targetType?: 'job' | 'company' | 'application' | 'user' | 'none';
  targetId?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface IMeta {
  current: number;
  pageSize: number;
  pages: number;
  total: number;
}

export interface IApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface IPaginatedResponse<T> {
  meta: IMeta;
  result: T[];
}

export interface ILoginRequest {
  username: string;
  password: string;
}

export interface IRegisterRequest {
  name: string;
  email: string;
  password: string;
  age?: number;
  address?: string;
  gender?: string;
}

export interface IRegisterByHrRequest extends IRegisterRequest {
  companyName?: string;
  taxCode?: string;
  companyScale?: string;
}

export interface IAuthResponse {
  access_token: string;
  refresh_token: string;
  user: IUser;
}

export interface IUpdateProfileDto {
  name?: string;
  phone?: string;
  age?: number;
  gender?: string;
  address?: string;
}

export interface ICreateCommentDto {
  companyId: string;
  content: string;
  rating?: number;
  parentId?: string;
}

// AI Matching Types
export interface ICandidateMatchResult {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatar?: string;
  cvId: string;
  cvTitle: string;
  cvUrl: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  shortExplanation: string;
  applicationStatus: string;
  appliedAt: string;
}

export interface IAIRankingResponse {
  jobId: string;
  jobName: string;
  totalApplications: number;
  rankedCandidates: ICandidateMatchResult[];
  processedAt: string;
}

// Subscriber Types
export interface ISubscriber {
  _id: string;
  userId?: string;
  email: string;
  skills: ISkill[];
  isActive: boolean;
  lastEmailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateSubscriberDto {
  email: string;
  skills: string[];
  newSkillNames?: string[];
  isActive?: boolean;
}

// CV Search Types
export interface ICVSearchMatchInfo {
  matchedSkills: string[];
  matchedEducation: string[];
  matchedAddress: boolean;
  matchedCertificates: string[];
  matchedInParsedText: boolean;
}

export interface ICVSearchResultItem extends IApplication {
  matchInfo: ICVSearchMatchInfo;
}

export interface ICVSearchResponse {
  total: number;
  result: ICVSearchResultItem[];
}
