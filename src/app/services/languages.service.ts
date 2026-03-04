import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Language } from '../models/jobOfferDB';

@Injectable({
  providedIn: 'root',
})
export class LanguagesService {
  private languagesSubject: ReplaySubject<Language[]> = new ReplaySubject<
    Language[]
  >(1);

  constructor(private readonly http: HttpClient) {
    this.http
      .get<Language[]>('/assets/languages.json')
      .subscribe(this.languagesSubject);
  }

  getLanguages(): Observable<Language[]> {
    return this.languagesSubject.asObservable();
  }
}
