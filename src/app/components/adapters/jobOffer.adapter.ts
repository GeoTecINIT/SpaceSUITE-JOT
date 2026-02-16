import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { JobOffer } from '../../models/jobOffer';
import { JobOfferDB } from '../../models/jobOfferDB';
import { OccupationalProfile } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';

@Injectable({
  providedIn: 'root',
})
export class JobOfferAdapter {
  constructor(private firebaseService: FirebaseService) {}

  getJobOffers(): Observable<JobOffer[]> {
    return this.firebaseService
      .getJobOffers()
      .pipe(
        map((jobOffers) =>
          jobOffers.map((jobOffer) => this.convertToLocal(jobOffer)),
        ),
      );
  }

  updateJobOffer(jobOffer: JobOffer): Observable<string> {
    return this.firebaseService.updateJobOffer(this.convertToDB(jobOffer));
  }

  setJobOffer(jobOffer: JobOffer): Observable<string> {
    return this.firebaseService.setJobOffer(this.convertToDB(jobOffer));
  }

  deleteJobOffer(jobOffer: JobOffer): Observable<void> {
    return this.firebaseService.deleteJobOffer(this.convertToDB(jobOffer));
  }

  private convertToLocal(jobOffer: JobOfferDB): JobOffer {
    const newJobOffer = new JobOffer(jobOffer);

    if (jobOffer.occuProf) {
      newJobOffer.competences = jobOffer.occuProf.competences;
      newJobOffer.customCompetences = jobOffer.occuProf.customCompetences;
      newJobOffer.customSkills = jobOffer.occuProf.customSkills;
      newJobOffer.description = jobOffer.occuProf.description;
      newJobOffer.eqf = jobOffer.occuProf.eqf;
      newJobOffer.fields = jobOffer.occuProf.fields;
      newJobOffer.knowledge = jobOffer.occuProf.knowledge;
      newJobOffer.profiles.push(jobOffer.occuProf._id);
      newJobOffer.skills = jobOffer.occuProf.skills;
      newJobOffer.title = jobOffer.occuProf.title;
    }

    return newJobOffer;
  }

  private convertToDB(jobOffer: JobOffer): JobOfferDB {
    const newJobOffer = new JobOfferDB(jobOffer);

    newJobOffer.occuProf = new OccupationalProfile();
    newJobOffer.occuProf.competences = jobOffer.competences;
    newJobOffer.occuProf.customCompetences = jobOffer.customCompetences;
    newJobOffer.occuProf.customSkills = jobOffer.customSkills;
    newJobOffer.occuProf.description = jobOffer.description;
    newJobOffer.occuProf.eqf = jobOffer.eqf;
    newJobOffer.occuProf.fields = jobOffer.fields;
    newJobOffer.occuProf.knowledge = jobOffer.knowledge;
    newJobOffer.occuProf.skills = jobOffer.skills;
    newJobOffer.occuProf.title = jobOffer.title;

    return newJobOffer;
  }
}
