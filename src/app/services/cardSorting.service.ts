import { Injectable } from '@angular/core';
import { JobOffer } from '../models/jobOffer';

@Injectable({
  providedIn: 'root',
})
export class CardSortingService {
  sortOption: string = 'Title';
  sortAsc: boolean = false;

  sortJobs(inputJobs: JobOffer[]): JobOffer[] {
    let sortedJobs = [...inputJobs];

    switch (this.sortOption) {
      case 'Title':
        if (this.sortAsc) {
          sortedJobs = sortedJobs.sort((a, b) =>
            b.title.localeCompare(a.title),
          );
        } else {
          sortedJobs = sortedJobs.sort((a, b) =>
            a.title.localeCompare(b.title),
          );
        }

        break;

      case 'Last updated':
        if (this.sortAsc) {
          sortedJobs = sortedJobs.sort(
            (a, b) =>
              new Date(a.lastModified).getTime() -
              new Date(b.lastModified).getTime(),
          );
        } else {
          sortedJobs = sortedJobs.sort(
            (a, b) =>
              new Date(b.lastModified).getTime() -
              new Date(a.lastModified).getTime(),
          );
        }

        break;
    }

    return sortedJobs;
  }
}
