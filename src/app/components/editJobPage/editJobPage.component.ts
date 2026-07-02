import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExitWithoutSavingService } from '@eo4geo/ngx-bok-utils';
import { concatMap, EMPTY, tap } from 'rxjs';
import { JobOffer } from '../../models/jobOffer';
import { FirebaseService } from '../../services/firebase.service';
import { JobOfferService } from '../../services/jobOffer.service';
import { JobFormComponent } from '../jobForm/jobForm.component';

@Component({
  standalone: true,
  selector: 'edit-job-page',
  templateUrl: './editJobPage.component.html',
  imports: [JobFormComponent],
})
export class EditJobPageComponent implements OnInit {
  isDuplicateSignal: WritableSignal<boolean> = signal(false);
  jobSignal: WritableSignal<JobOffer | undefined> = signal(undefined);

  constructor(
    private jobOfferService: JobOfferService,
    private route: ActivatedRoute,
    private router: Router,
    private firebaseService: FirebaseService,
    private exitWithoutSavingService: ExitWithoutSavingService,
  ) {}

  ngOnInit() {
    this.isDuplicateSignal.set(this.router.url.includes('/job/new/'));
    const jobId = this.route.snapshot.paramMap.get('jobId');

    if (!jobId) {
      this.notFound();
      return;
    }

    this.jobOfferService
      .getJobOffer(jobId)
      .pipe(
        concatMap((job) => {
          if (!job) {
            this.notFound();
            return EMPTY;
          }

          return this.firebaseService
            .getUserOrganizationList()
            .pipe(tap((orgs) => this.handleJob(job, orgs)));
        }),
      )
      .subscribe();
  }

  private notFound(): void {
    this.exitWithoutSavingService.bypassGuard.next(true);
    this.router.navigate(['/not_found']);
  }

  private handleJob(
    job: JobOffer,
    organizations: { _id: string; name: string }[],
  ): void {
    if (this.isDuplicateSignal()) {
      this.duplicateJob(job, organizations);
    } else {
      if (this.canEditJob(job, organizations)) {
        this.loadJob(job);
      } else {
        this.notFound();
      }
    }
  }

  private duplicateJob(
    originalJob: JobOffer,
    organizations: { _id: string; name: string }[],
  ): void {
    const job = new JobOffer(originalJob);
    job._id = '';
    job.createdAt = undefined;

    if (!job.eqf.startsWith('EQF ')) {
      job.eqf = `EQF ${job.eqf}`;
    }

    job.lastModified = '';
    job.updatedAt = undefined;
    job.userId = '';

    if (!organizations.some((o) => o._id === job.orgId)) {
      job.orgId = '';
      job.orgName = '';
      job.division = '';
    }

    this.jobSignal.set(job);
  }

  private loadJob(originalJob: JobOffer): void {
    const job = new JobOffer(originalJob);

    if (!job.eqf.startsWith('EQF ')) {
      job.eqf = `EQF ${job.eqf}`;
    }

    this.jobSignal.set(job);
  }

  private canEditJob(
    job: JobOffer,
    organizations: { _id: string; name: string }[],
  ): boolean {
    const belongsToOrg = organizations.some((o) => o._id === job.orgId);
    const userData = this.firebaseService.getUserData();
    const isCreator = userData !== null && job.userId === userData.uid;

    return belongsToOrg || isCreator;
  }
}
