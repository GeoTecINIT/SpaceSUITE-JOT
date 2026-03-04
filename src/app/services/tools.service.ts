import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { Tool } from '../models/jobOfferDB';

@Injectable({
  providedIn: 'root',
})
export class ToolsService {
  private toolsSubject: ReplaySubject<Tool[]> = new ReplaySubject<Tool[]>(1);

  constructor(private readonly http: HttpClient) {
    this.http.get<Tool[]>('/assets/tools.json').subscribe(this.toolsSubject);
  }

  getTools(): Observable<Tool[]> {
    return this.toolsSubject.asObservable();
  }
}
