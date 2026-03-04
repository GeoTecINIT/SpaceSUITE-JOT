import { OccupationalProfile } from './occupationalProfile';

export class JobOfferDB {
  _id: string;
  additionalQuestions: string;
  contactDetails: string;
  createdAt?: any;
  currency: string;
  dataRequired: Dataset[];
  dedication: string;
  division: string;
  isPublic: boolean;
  languages: Language[];
  lastModified: string;
  location: string;
  motivationLetter: boolean;
  occuProf?: OccupationalProfile;
  orgId: string;
  orgName: string;
  salaryMax: number;
  salaryMin: number;
  toolsRequired: Tool[];
  typeContract: string;
  updatedAt?: any;
  userId: string;
  yearsExperience: number;

  constructor(data: Partial<JobOfferDB> = {}) {
    this._id = data._id ?? '';
    this.additionalQuestions = data.additionalQuestions ?? '';
    this.contactDetails = data.contactDetails ?? '';
    this.createdAt = data.createdAt;
    this.currency = data.currency ?? '';
    this.dataRequired = data.dataRequired ?? [];
    this.dedication = data.dedication ?? '';
    this.division = data.division ?? '';
    this.isPublic = data.isPublic ?? false;
    this.languages = data.languages ?? [];
    this.lastModified = data.lastModified ?? '';
    this.location = data.location ?? '';
    this.motivationLetter = data.motivationLetter ?? false;
    this.occuProf = data.occuProf;
    this.orgId = data.orgId ?? '';
    this.orgName = data.orgName ?? '';
    this.salaryMax = data.salaryMax ?? 0;
    this.salaryMin = data.salaryMin ?? 0;
    this.toolsRequired = data.toolsRequired ?? [];
    this.typeContract = data.typeContract ?? '';
    this.updatedAt = data.updatedAt;
    this.userId = data.userId ?? '';
    this.yearsExperience = data.yearsExperience ?? 0;
  }

  toPlain(): Record<string, any> {
    return {
      _id: this._id,
      additionalQuestions: this.additionalQuestions,
      contactDetails: this.contactDetails,
      createdAt: this.createdAt,
      currency: this.currency,
      dataRequired: this.dataRequired,
      dedication: this.dedication,
      division: this.division,
      isPublic: this.isPublic,
      languages: this.languages,
      lastModified: this.lastModified,
      location: this.location,
      motivationLetter: this.motivationLetter,
      occuProf: this.occuProf?.toPlain(),
      orgId: this.orgId,
      orgName: this.orgName,
      salaryMax: this.salaryMax,
      salaryMin: this.salaryMin,
      toolsRequired: this.toolsRequired,
      typeContract: this.typeContract,
      updatedAt: this.updatedAt,
      userId: this.userId,
      yearsExperience: this.yearsExperience,
    };
  }
}

export interface Dataset {
  custom?: boolean;
  name: string;
  opensearch_url?: string;
  url?: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Tool {
  author?: string;
  custom?: boolean;
  format?: string;
  language?: string;
  license?: string;
  lictype?: string;
  name: string;
  platform?: string;
  pluginof?: string;
  scope?: string;
  url?: string;
}
