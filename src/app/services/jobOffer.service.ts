import { Injectable } from '@angular/core';
import { BokInformationService } from '@eo4geo/ngx-bok-visualization';
import {
  BehaviorSubject,
  concatMap,
  filter,
  forkJoin,
  map,
  Observable,
  of,
  take,
  tap,
} from 'rxjs';
import { JobOfferAdapter } from '../components/adapters/jobOffer.adapter';
import { JobOffer } from '../models/jobOffer';

@Injectable({
  providedIn: 'root',
})
export class JobOfferService {
  private jobsSubject: BehaviorSubject<Map<string, JobOffer> | undefined> =
    new BehaviorSubject<Map<string, JobOffer> | undefined>(undefined);

  constructor(
    private jobOfferAdapter: JobOfferAdapter,
    private bokInfoService: BokInformationService,
  ) {
    this.jobOfferAdapter
      .getJobOffers()
      .pipe(
        tap((jobOffers) => {
          const formattedJobOffers = this.formatJobOffers(jobOffers);
          const map = new Map(formattedJobOffers.map((j) => [j._id, j]));

          this.jobsSubject.next(map);
        }),
      )
      .subscribe();
  }

  getJobOffers(): Observable<JobOffer[] | undefined> {
    return this.jobsSubject
      .asObservable()
      .pipe(map((map) => (map ? Array.from(map.values()) : undefined)));
  }

  getJobOffer(id: string): Observable<JobOffer | undefined> {
    return this.jobsSubject.asObservable().pipe(
      filter((map) => map !== undefined),
      map((map) => map.get(id)),
    );
  }

  getOrganizations(): Observable<string[]> {
    return this.jobsSubject.asObservable().pipe(
      map((map) => {
        if (map === undefined || map.size === 0) return [];
        return [...new Set(Array.from(map.values()).map((p) => p.orgName))];
      }),
    );
  }

  validateJobOffer(jobOffer: JobOffer): Map<string, string | undefined> {
    const errors: Map<string, string | undefined> = new Map();

    const setError = (field: string, condition: boolean, message: string) => {
      errors.set(field, condition ? message : undefined);
    };

    setError('title', !jobOffer.title.trim(), 'Title is required.');
    setError(
      'description',
      !jobOffer.description.trim(),
      'Description is required.',
    );
    setError('eqf', !jobOffer.eqf.trim(), 'EQF level is required.');
    setError(
      'organization',
      !jobOffer.orgId?.trim(),
      'Organization is required.',
    );
    setError(
      'knowledge',
      jobOffer.knowledge.length === 0,
      'At least one concept is required.',
    );
    setError(
      'skills',
      jobOffer.skills.length === 0 && jobOffer.customSkills.length === 0,
      'At least one skill is required.',
    );

    return errors;
  }

  submitJobOffer(
    jobOffer: JobOffer,
    update: boolean = false,
  ): Observable<string> {
    const newJobOffer = new JobOffer(jobOffer);
    newJobOffer.eqf = newJobOffer.eqf.replace('EQF', '').trim();

    const conceptObservables =
      newJobOffer.knowledge.length > 0
        ? forkJoin(
            newJobOffer.knowledge.map((concept) =>
              this.bokInfoService.getConceptName(concept).pipe(
                take(1),
                map((conceptName) => `[${concept}] ${conceptName}`),
              ),
            ),
          )
        : of([]);
    return conceptObservables.pipe(
      concatMap((formattedConcepts) => {
        newJobOffer.knowledge = formattedConcepts;
        if (update) return this.jobOfferAdapter.updateJobOffer(newJobOffer);
        return this.jobOfferAdapter.setJobOffer(newJobOffer);
      }),
    );
  }

  deleteJobOffer(jobOffer: JobOffer): Observable<void> {
    return this.jobOfferAdapter.deleteJobOffer(jobOffer);
  }

  private formatJobOffers(jobOffers: JobOffer[]): JobOffer[] {
    return jobOffers.map((jobOffer) => {
      const newJobOffer = new JobOffer(jobOffer);

      newJobOffer.knowledge = this.formatFirestoreConcepts(
        newJobOffer.knowledge,
      );
      newJobOffer.customSkills = newJobOffer.customSkills.filter(
        (s) => s !== '',
      );
      newJobOffer.skills = newJobOffer.skills.filter(
        (s) => s !== '' && newJobOffer.customSkills.every((c) => s !== c),
      );
      newJobOffer.customCompetences = newJobOffer.customCompetences.filter(
        (c) => c !== '',
      );

      return newJobOffer;
    });
  }

  private formatFirestoreConcepts(concepts: string[]): string[] {
    return concepts
      .map((c) => /\[(.*?)\]/.exec(c)?.[1])
      .filter((c): c is string => !!c);
  }
}
