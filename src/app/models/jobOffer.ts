import { Dataset, Language, Tool } from './jobOfferDB';
import { OccupationalProfile } from './occupationalProfile';

export class JobOffer extends OccupationalProfile {
  additionalQuestions: string;
  contactDetails: string;
  currency: string;
  dataRequired: Dataset[];
  dedication: string;
  languages: Language[];
  location: string;
  motivationLetter: boolean;
  profiles: string[];
  salaryMax: number;
  salaryMin: number;
  toolsRequired: Tool[];
  typeContract: string;
  yearsExperience: number;

  constructor(data: Partial<JobOffer> = {}) {
    super(data);
    if (Array.isArray(data.additionalQuestions)) {
      this.additionalQuestions = '';
    } else {
      this.additionalQuestions = data.additionalQuestions ?? '';
    }
    this.contactDetails = data.contactDetails ?? '';
    this.currency = data.currency ?? '';
    this.dataRequired = data.dataRequired ?? [];
    this.dedication = data.dedication ?? '';
    this.languages = data.languages ?? [];
    this.location = data.location ?? '';
    this.motivationLetter = data.motivationLetter ?? false;
    this.profiles = data.profiles ?? [];
    this.salaryMax = data.salaryMax ?? 0;
    this.salaryMin = data.salaryMin ?? 0;
    this.toolsRequired = data.toolsRequired ?? [];
    this.typeContract = data.typeContract ?? '';
    this.yearsExperience = data.yearsExperience ?? 0;
  }
}
