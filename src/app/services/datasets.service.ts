import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Dataset } from '../models/jobOfferDB';

@Injectable({
  providedIn: 'root',
})
export class DatasetsService {
  private datasetsSubject: ReplaySubject<Dataset[]> = new ReplaySubject<
    Dataset[]
  >(1);

  constructor(private readonly http: HttpClient) {
    this.http
      .get<Dataset[]>('/assets/datasets.json')
      .subscribe(this.datasetsSubject);
  }

  getDatasets(): Observable<Dataset[]> {
    return this.datasetsSubject.asObservable();
  }
}
