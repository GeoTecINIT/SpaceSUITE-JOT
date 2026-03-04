import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { JobOffer } from '../models/jobOffer';
import { JobOfferDB } from '../models/jobOfferDB';
import { OccupationalProfile } from '../models/occupationalProfile';
import { FirebaseService } from '../services/firebase.service';

@Injectable({
  providedIn: 'root',
})
export class JobOfferAdapter {
  constructor(private firebaseService: FirebaseService) {}

  getJobOffers(): Observable<JobOffer[]> {
    return this.firebaseService
      .getJobOffers()
      .pipe(map((jobs) => jobs.map((job) => this.convertToLocal(job))));
  }

  updateJobOffer(job: JobOffer): Observable<string> {
    return this.firebaseService.updateJobOffer(this.convertToDB(job));
  }

  setJobOffer(job: JobOffer): Observable<string> {
    return this.firebaseService.setJobOffer(this.convertToDB(job));
  }

  deleteJobOffer(job: JobOffer): Observable<void> {
    return this.firebaseService.deleteJobOffer(this.convertToDB(job));
  }

  private convertToLocal(job: JobOfferDB): JobOffer {
    const newJob = new JobOffer(job);

    if (job.occuProf) {
      newJob.competences = job.occuProf.competences;
      newJob.customCompetences = job.occuProf.customCompetences;
      newJob.customSkills = job.occuProf.customSkills;
      newJob.description = job.occuProf.description;
      newJob.eqf = job.occuProf.eqf;
      newJob.fields = job.occuProf.fields;
      newJob.knowledge = job.occuProf.knowledge;
      newJob.skills = job.occuProf.skills;
      newJob.title = job.occuProf.title;

      if (job.occuProf._id !== '') newJob.profiles.push(job.occuProf._id);
    }

    return newJob;
  }

  private convertToDB(job: JobOffer): JobOfferDB {
    const newJob = new JobOfferDB(job);

    newJob.occuProf = new OccupationalProfile();
    newJob.occuProf.competences = job.competences;
    newJob.occuProf.customCompetences = job.customCompetences;
    newJob.occuProf.customSkills = job.customSkills;
    newJob.occuProf.description = job.description;
    newJob.occuProf.eqf = job.eqf;
    newJob.occuProf.fields = job.fields;
    newJob.occuProf.knowledge = job.knowledge;
    newJob.occuProf.skills = job.skills;
    newJob.occuProf.title = job.title;

    return newJob;
  }
}
