import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PaginatorState } from 'primeng/paginator';
import { combineLatest, map, Observable, ReplaySubject } from 'rxjs';
import { Filter } from '../models/filter';
import { JobOffer } from '../models/jobOffer';
import { JobOfferService } from './jobOffer.service';

@Injectable({
  providedIn: 'root',
})
export class CardFilterService {
  bokConcepts: string[] = [];
  paginatorState: PaginatorState = {};
  searchOption: string = 'Title';
  searchValue: string = '';
  hidePrivate: boolean = false;
  visibilityFilter: string = 'all';

  private filtersSubject: ReplaySubject<Filter[]> = new ReplaySubject<Filter[]>(
    1,
  );

  constructor(
    private readonly http: HttpClient,
    private readonly jobService: JobOfferService,
  ) {
    combineLatest([
      this.http.get<Filter[]>('/assets/filters.json'),
      this.jobService.getOrganizations(),
    ])
      .pipe(
        map(([filters, organizations]) => {
          const updatedFilters = [...filters];
          updatedFilters[updatedFilters.length - 1].values = organizations;

          return updatedFilters;
        }),
      )
      .subscribe(this.filtersSubject);
  }

  checkJob(job: JobOffer, filter: Filter): boolean {
    switch (filter.label) {
      case 'EQF Level':
        return filter.selection.some((s) => job.eqf === s.slice(-1));

      case 'Organizations':
        return filter.selection.some(
          (s) => job.orgName?.trim().toLowerCase() === s.trim().toLowerCase(),
        );

      default:
        return true;
    }
  }

  getFilters(): Observable<Filter[]> {
    return this.filtersSubject.asObservable();
  }

  getFilter(label: string): Observable<Filter> {
    return this.filtersSubject.asObservable().pipe(
      map(
        (filters) =>
          filters.find((f) => f.label === label) ?? {
            label,
            values: [],
            selection: [],
          },
      ),
    );
  }
}
