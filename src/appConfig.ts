import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideProtractorTestingSupport } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Routes } from '@angular/router';
import {
  AuthGuard,
  exitWithoutSavingGuard,
  NotFoundPageComponent,
  OrganizationPageComponent,
  UserPageComponent,
} from '@eo4geo/ngx-bok-utils';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { EditJobPageComponent } from './app/components/editJobPage/editJobPage.component';
import { JobExplorerComponent } from './app/components/jobExplorer/jobExplorer.component';
import { JobPageComponent } from './app/components/jobPage/jobPage.component';
import { JobFormComponent } from './app/components/jobForm/jobForm.component';
import { environment } from './environments/environment';
import { UserOrgsGuard } from './app/guards/userOrgs.guard';

const routes: Routes = [
  { path: '', component: JobExplorerComponent },
  {
    path: 'userProfile',
    component: UserPageComponent,
    canMatch: [AuthGuard],
  },
  {
    path: 'organizations',
    component: OrganizationPageComponent,
    canMatch: [AuthGuard],
  },
  { path: 'job', redirectTo: '', pathMatch: 'full' },
  {
    path: 'job/new',
    component: JobFormComponent,
    canMatch: [AuthGuard, UserOrgsGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  {
    path: 'job/new/:jobId',
    component: EditJobPageComponent,
    canMatch: [AuthGuard, UserOrgsGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  {
    path: 'job/edit/:jobId',
    component: EditJobPageComponent,
    canMatch: [AuthGuard, UserOrgsGuard],
    canDeactivate: [exitWithoutSavingGuard],
  },
  { path: 'job/:jobId', component: JobPageComponent },
  { path: 'not_found', component: NotFoundPageComponent },
  { path: '**', component: NotFoundPageComponent },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideFirebaseApp(() => initializeApp(environment.FIREBASE)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideProtractorTestingSupport(),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          prefix: 'p',
          darkModeSelector: false,
          cssLayer: false,
        },
      },
    }),
  ],
};
