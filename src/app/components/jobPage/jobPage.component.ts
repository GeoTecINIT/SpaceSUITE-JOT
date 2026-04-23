import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, SkillTagComponent, Tag } from '@eo4geo/ngx-bok-utils';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PanelModule } from 'primeng/panel';
import { Popover, PopoverModule } from 'primeng/popover';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  catchError,
  combineLatest,
  concatMap,
  defaultIfEmpty,
  filter,
  finalize,
  forkJoin,
  map,
  of,
  retry,
  skip,
  Subscription,
  take,
  tap,
} from 'rxjs';
import { JobOffer } from '../../models/jobOffer';
import { Dataset, Language, Tool } from '../../models/jobOfferDB';
import { Competence } from '../../models/occupationalProfile';
import { FirebaseService } from '../../services/firebase.service';
import { JobOfferService } from '../../services/jobOffer.service';
import { PdfService } from '../../services/pdf.service';
import { RdfService } from '../../services/rdf.service';
import { UtilsService } from '../../services/utils.service';

interface AuthState {
  logged: boolean;
  nameInitial: string;
  uid: string;
}

@Component({
  standalone: true,
  selector: 'job-page',
  templateUrl: './jobPage.component.html',
  styleUrls: ['./jobPage.component.css'],
  imports: [
    CommonModule,
    ProgressSpinnerModule,
    ButtonModule,
    TagModule,
    PanelModule,
    ConfirmDialogModule,
    ToastModule,
    ProgressBarModule,
    PopoverModule,
    TooltipModule,
    SkillTagComponent,
  ],
  providers: [ConfirmationService, MessageService],
})
export class JobPageComponent implements OnInit, AfterViewInit, OnDestroy {
  job?: JobOffer;

  concepts: Tag[] = [];
  allSkills: string[] = [];
  transversalSkills: Competence[] = [];
  applicationDomains: string[] = [];
  datasets: Dataset[] = [];
  tools: Tool[] = [];
  languages: Language[] = [];

  private tagLimit: number = 30;
  knowledgeDistribution: Map<Tag, number> = new Map();

  private userOrgIdsSubscription!: Subscription;
  private organizations: string[] = [];

  private authStateSubscription!: Subscription;
  private authState: AuthState | undefined = undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobOfferService: JobOfferService,
    private utilsService: UtilsService,
    private authService: AuthService,
    private firebaseService: FirebaseService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private pdfService: PdfService,
    private rdfService: RdfService,
  ) {}

  ngOnInit() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);

    const routeData$ = combineLatest([
      this.route.paramMap,
      this.route.queryParams,
    ]).pipe(
      map(([paramMap, queryParams]) => {
        const jobId = paramMap.get('jobId') || '';
        const submitted =
          queryParams['submitted'] === 'true' ||
          queryParams['submitted'] === true;
        return { jobId: jobId, submitted };
      }),
      concatMap(({ jobId: jobId, submitted }) =>
        this.jobOfferService.getJobOffer(jobId).pipe(
          tap((job) => {
            if (submitted && !job) throw new Error('Job not found');
          }),
          retry({ count: 1, delay: 500 }),
          catchError(() => of(undefined)),
        ),
      ),
      filter((job) => job?.updatedAt !== null),
      take(1),
    );

    const orgIds$ = this.firebaseService.getUserOrganizationList().pipe(
      map((orgs) => orgs.map((o) => o._id)),
      tap((orgIds) => (this.organizations = orgIds)),
      take(1),
    );

    const userState$ = this.authService.getUserState().pipe(
      tap((authState) => (this.authState = authState)),
      take(1),
    );

    forkJoin([routeData$, orgIds$, userState$]).subscribe(
      ([newJob, _, userData]) => {
        const isJobMissing = !newJob;
        const isNotPublic = newJob && !newJob.isPublic;
        const belongsToUserOrg =
          newJob?.orgId && this.organizations.includes(newJob.orgId);
        const belongsToUser =
          newJob && userData && newJob.userId === userData.uid;

        if (
          isJobMissing ||
          (isNotPublic && !(belongsToUserOrg || belongsToUser))
        ) {
          this.router.navigate(['not_found']);
        } else this.loadJob(newJob);
      },
    );

    this.userOrgIdsSubscription = this.firebaseService
      .getUserOrganizationList()
      .pipe(
        skip(1),
        map((orgs) => orgs.map((o) => o._id)),
      )
      .subscribe((ids) => {
        this.organizations = ids;
      });

    this.authStateSubscription = this.authService
      .getUserState()
      .pipe(skip(1))
      .subscribe((authState) => (this.authState = authState));
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params) => {
      const submitted: boolean = params['submitted'];
      const mode: string = params['mode'];
      if (submitted) {
        switch (mode) {
          case 'update':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Job successfully updated!`,
              life: 3000,
              closable: true,
            });
            break;
          case 'create':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Job successfully created!`,
              life: 3000,
              closable: true,
            });
            break;
        }
      }
    });
  }

  ngOnDestroy() {
    this.authStateSubscription.unsubscribe();
    this.userOrgIdsSubscription.unsubscribe();
  }

  private loadJob(newJob: JobOffer) {
    this.job = newJob;
    this.concepts = [];
    this.allSkills = [];
    this.transversalSkills = [];
    this.applicationDomains = [];
    this.datasets = [];
    this.tools = [];
    this.languages = [];

    this.utilsService
      .stringToTag(this.job.knowledge, 'bok')
      .pipe(defaultIfEmpty([]))
      .subscribe((results) => {
        this.concepts = [...this.concepts, ...results];
        this.concepts.sort((a, b) => a.label.localeCompare(b.label));
        this.getConcept(this.concepts);
      });

    this.job.skills.forEach((skill) => {
      if (skill !== '') this.allSkills.push(skill);
    });

    this.job.customSkills.forEach((customSkill) => {
      if (customSkill !== '') this.allSkills.push(customSkill);
    });

    this.job.competences.forEach((competence) => {
      if (competence.preferredLabel !== '') {
        this.transversalSkills.push(competence);
      }
    });

    this.job.customCompetences.forEach((customCompetence) => {
      if (
        customCompetence !== '' &&
        this.transversalSkills.every(
          (competence) => competence.preferredLabel !== customCompetence,
        )
      ) {
        this.transversalSkills.push({ preferredLabel: customCompetence });
      }
    });

    this.job.fields.forEach((field) => {
      this.applicationDomains.push(`${field.name} (${field.grandparent})`);
    });

    this.datasets = this.job.dataRequired.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.tools = this.job.toolsRequired.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.languages = this.job.languages.sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  goToMainPage() {
    this.router.navigate(['job']);
  }

  editJob() {
    this.router.navigate([`job/edit/${this.job?._id}`], {
      queryParams: { origin: 'details' },
    });
  }

  duplicateJob() {
    this.router.navigate([`job/new/${this.job?._id}`], {
      queryParams: { origin: 'details' },
    });
  }

  deleteModal(event: Event) {
    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: 'Do you want to delete this job offer?',
      header: 'Delete Job',
      icon: 'pi pi-info-circle',
      rejectLabel: 'Cancel',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'primary',
      },

      accept: () => {
        this.deleteJob();
      },
      reject: () => {},
    });
  }

  deleteJob() {
    let deleteError = false;
    this.jobOfferService
      .deleteJobOffer(this.job!)
      .pipe(
        take(1),
        catchError((error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.message ??
              'Something went wrong. Try again later or contact the administrator.',
            life: 3000,
            closable: true,
          });
          deleteError = true;
          return of(null);
        }),
        finalize(() => {
          if (!deleteError)
            this.router.navigate(['job'], {
              queryParams: { submitted: true, mode: 'delete' },
            });
        }),
      )
      .subscribe();
  }

  checkUser() {
    return (
      this.authState?.uid == this.job?.userId ||
      (this.job && this.organizations.includes(this.job.orgId))
    );
  }

  onClickConcept(code: string) {
    window.open(`https://geospacebok.eu/${code}`);
  }

  onClickSkill(uri: string) {
    window.open(uri);
  }

  overTagLimit(length: number): boolean {
    return length > this.tagLimit;
  }

  getConcept(concepts: Tag[]) {
    const conceptsAreas = concepts.map((concept) => {
      if (concept.label === 'GIST') return concept.label;
      return concept.label.substring(0, 2).toUpperCase();
    });
    this.utilsService
      .stringToTag(conceptsAreas, 'bok')
      .subscribe((areasTags) => {
        const allAreas = new Map<string, Tag>();
        const counts = new Map<string, number>();
        const total = concepts.length;

        areasTags.flat().forEach((area) => {
          allAreas.set(area.label, area);
          counts.set(area.label, (counts.get(area.label) || 0) + 1);
        });

        if (total > 0) {
          this.knowledgeDistribution = new Map(
            Array.from(counts.entries()).map(([label, count]) => [
              allAreas.get(label)!,
              Math.round((count / total) * 100),
            ]),
          );
        }
      });
  }

  get knowledgeDistributionArray() {
    return Array.from(this.knowledgeDistribution.entries());
  }

  isLogged(): boolean {
    return this.authState?.logged ?? false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(window.location.href);

    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: `You copied the job url to clipboard!`,
      life: 3000,
      closable: true,
    });
  }

  downloadPDF(op: Popover): void {
    document.body.style.cursor = 'wait';
    op.hide();

    this.pdfService
      .generatePortfolioPdf(new JobOffer(this.job))
      .subscribe((pdf) => {
        this.downloadURI(pdf.url, pdf.filename);
        document.body.style.cursor = '';
      });
  }

  downloadRDF(format: 'ttl' | 'xml' | 'rdfa', op: Popover): void {
    document.body.style.cursor = 'wait';
    op.hide();

    const fileName = (this.job?.title || 'default_name')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w_-]/g, '')
      .toLowerCase();
    const newProfile = new JobOffer(this.job);

    switch (format) {
      case 'ttl':
        const ttlUrl = this.rdfService.getRdfTtlUrl(newProfile);
        this.downloadURI(ttlUrl, fileName + '_profile.ttl');

        break;

      case 'xml':
        const xmlUrl = this.rdfService.getRdfXmlUrl(newProfile);
        this.downloadURI(xmlUrl, fileName + '_profile.rdf.xml');

        break;

      case 'rdfa':
        const rdfaUrl = this.rdfService.getRdfaUrl(newProfile);
        this.downloadURI(rdfaUrl, fileName + '_profile.html');

        break;
    }

    document.body.style.cursor = '';
  }

  private downloadURI(uri: string, name: string): void {
    const link = document.createElement('a');
    link.download = name;
    link.href = uri;
    link.click();
  }

  get validSalary(): boolean {
    return !!(
      this.job &&
      this.job.salaryMin != null &&
      this.job.salaryMax != null &&
      this.job.salaryMin > 0 &&
      this.job.salaryMax > 0
    );
  }
}
