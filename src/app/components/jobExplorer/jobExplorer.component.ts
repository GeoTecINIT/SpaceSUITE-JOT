import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DividerModule } from 'primeng/divider';
import { MenuModule } from 'primeng/menu';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { combineLatest, filter, map, Subscription, take } from 'rxjs';
import { Filter } from '../../models/filter';
import { JobOffer } from '../../models/jobOffer';
import { CardFilterService } from '../../services/cardFilter.service';
import { CardSortingService } from '../../services/cardSorting.service';
import { FirebaseService } from '../../services/firebase.service';
import { JobOfferService } from '../../services/jobOffer.service';
import { FiltersComponent } from '../filters/filters.component';
import { JobCardComponent } from '../jobCard/jobCard.component';

@Component({
  standalone: true,
  selector: 'job-explorer',
  templateUrl: './jobExplorer.component.html',
  styleUrls: ['./jobExplorer.component.css'],
  imports: [
    CommonModule,
    DividerModule,
    PaginatorModule,
    SkeletonModule,
    FiltersComponent,
    JobCardComponent,
    ToastModule,
    ConfirmDialogModule,
    ButtonModule,
    ButtonGroupModule,
    MenuModule,
  ],
  providers: [ConfirmationService, MessageService],
})
export class JobExplorerComponent implements OnInit, AfterViewInit, OnDestroy {
  loading: boolean = true;
  skeletonElements: number[] = [];

  first: number = 0;
  rows: number = 6;
  paginatedJobs: JobOffer[] = [];

  bokConcepts: string[] = [];
  filterOptions: Filter[] = [];
  searchOption: string = 'Title';
  searchValue: string = '';
  hidePrivate: boolean = true;
  visibilityFilter: string = 'all';
  filteredJobs: JobOffer[] = [];

  @ViewChild('container') containerRef!: ElementRef;
  buttonBottom = 32;

  sortOptions: MenuItem[] = [{ label: 'Title' }, { label: 'Last updated' }];
  sortOption: string = 'Title';
  sortAsc: boolean = false;

  private jobs: JobOffer[] = [];
  private organizations: string[] = [];

  private jobOffersSubscription!: Subscription;

  constructor(
    private filterService: CardFilterService,
    private firebaseService: FirebaseService,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private router: Router,
    private ngZone: NgZone,
    private sortingService: CardSortingService,
    private jobOfferService: JobOfferService,
  ) {
    this.skeletonElements = Array(this.rows);
  }

  ngOnInit() {
    this.jobOffersSubscription = combineLatest([
      this.firebaseService
        .getUserOrganizationList()
        .pipe(map((orgs) => orgs.map((o) => o._id))),
      this.filterService.getFilters(),
      this.jobOfferService.getJobOffers().pipe(filter((j) => j !== undefined)),
    ]).subscribe(([orgs, filters, jobs]) => {
      this.organizations = orgs;
      this.filterOptions = filters;
      this.jobs = jobs;

      this.searchOption = this.filterService.searchOption;
      this.searchValue = this.filterService.searchValue;
      this.bokConcepts = this.filterService.bokConcepts;
      this.sortAsc = this.sortingService.sortAsc;
      this.sortOption = this.sortingService.sortOption;
      if (!this.isLogged()) {
        this.visibilityFilter = 'all';
        this.filterService.visibilityFilter = 'all';

        this.hidePrivate = true;
      } else {
        this.visibilityFilter = this.filterService.visibilityFilter;
        this.hidePrivate = this.filterService.hidePrivate;
      }

      this.filterPipeline();

      if (this.filterService.paginatorState) {
        this.onPageChange(this.filterService.paginatorState);
      }

      this.loading = false;
    });
  }

  ngAfterViewInit() {
    this.route.queryParams.subscribe((params) => {
      const submitted: boolean = params['submitted'];
      const mode: string = params['mode'];
      if (submitted) {
        switch (mode) {
          case 'delete':
            this.messageService.add({
              severity: 'info',
              summary: 'Info',
              detail: `Job deleted without problems.`,
              life: 3000,
              closable: true,
            });
            break;
        }
      }
    });

    window.addEventListener('scroll', this.updateButtonPosition);
    window.addEventListener('resize', this.updateButtonPosition);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.updateButtonPosition);
    window.removeEventListener('resize', this.updateButtonPosition);
    this.jobOffersSubscription.unsubscribe();
  }

  isLogged(): boolean {
    return this.firebaseService.getUserData() !== null;
  }

  onPageChange(event: PaginatorState): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? 6;
    this.filterService.paginatorState = event;

    this.updatePaginatedJobs();
  }

  switchSortOrientation(): void {
    this.sortAsc = !this.sortAsc;
    this.sortingService.sortAsc = this.sortAsc;

    this.filterPipeline();
  }

  setSortOption(option: string): void {
    this.sortOption = option;
    this.sortingService.sortOption = option;

    this.filterPipeline();
  }

  setBoKConcepts(concepts: string[]): void {
    this.bokConcepts = concepts;
    this.filterService.bokConcepts = concepts;

    this.filterPipeline();
  }

  setSearchOption(option: string): void {
    this.searchOption = option;
    this.filterService.searchOption = option;

    this.filterPipeline();
  }

  setSearchValue(value: string): void {
    this.searchValue = value;
    this.filterService.searchValue = value;

    this.filterPipeline();
  }

  setPrivateFilter(filter: boolean): void {
    this.hidePrivate = filter;
    if (this.isLogged()) this.filterService.hidePrivate = filter;

    this.filterPipeline();
  }

  setVisibilityFilter(filter: string): void {
    setTimeout(() => {
      this.visibilityFilter = filter;
      this.filterService.visibilityFilter = filter;
      this.filterService.paginatorState.first = 0;

      this.filterPipeline();
    });
  }

  filterPipeline(): void {
    this.first = 0;

    const changed = this.handlePrivateJobs(this.jobs);
    const sorted = this.sortJobs(changed);
    const searched = this.searchJobs(sorted);
    const filtered = this.filterJobs(searched);
    this.filteredJobs = this.filterByBoKConcept(filtered);

    this.updatePaginatedJobs();
    this.ngZone.onStable.pipe(take(1)).subscribe(() => {
      this.updateButtonPosition();
    });
  }

  createJobOffer(): void {
    this.router.navigate(['job/new']);
  }

  scrollToTop(): void {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  private updateButtonPosition = () => {
    const element = this.containerRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const bottomOverlap = window.innerHeight - rect.bottom;
    const newButtonBottom = Math.max(bottomOverlap, 32);
    if (this.buttonBottom !== newButtonBottom) {
      this.buttonBottom = newButtonBottom;
    }
  };

  private updatePaginatedJobs(): void {
    this.paginatedJobs = this.filteredJobs.slice(
      this.first,
      this.first + this.rows,
    );
  }

  private handlePrivateJobs(jobs: JobOffer[]): JobOffer[] {
    return this.hidePrivate
      ? jobs.filter((job) => job.isPublic === true)
      : jobs;
  }

  private sortJobs(jobs: JobOffer[]): JobOffer[] {
    return this.sortingService.sortJobs(jobs);
  }

  private searchJobs(jobs: JobOffer[]): JobOffer[] {
    const searchedJobs: JobOffer[] = [];
    const value = this.searchValue.trim().toLowerCase();

    switch (this.searchOption) {
      case 'Title':
        jobs.forEach((job) => {
          if (job.title.trim().toLowerCase().includes(value))
            searchedJobs.push(job);
        });

        break;

      case 'Description':
        jobs.forEach((job) => {
          if (job.description.trim().toLowerCase().includes(value))
            searchedJobs.push(job);
        });

        break;

      case 'Skills':
        if (value === '') {
          searchedJobs.push(...jobs);
          break;
        }

        jobs.forEach((job) => {
          if (
            job.skills.some((skill) =>
              skill.trim().toLowerCase().includes(value),
            ) ||
            job.customSkills.some((skill) =>
              skill.trim().toLowerCase().includes(value),
            )
          )
            searchedJobs.push(job);
        });

        break;

      case 'Transversal Skills':
        if (value === '') {
          searchedJobs.push(...jobs);
          break;
        }

        jobs.forEach((job) => {
          if (
            job.competences.some((competence) =>
              competence.preferredLabel.trim().toLowerCase().includes(value),
            ) ||
            job.customCompetences.some((competence) =>
              competence.trim().toLowerCase().includes(value),
            )
          )
            searchedJobs.push(job);
        });

        break;

      default:
        console.log('Invalid Search Option');
    }

    return searchedJobs;
  }

  private filterJobs(jobs: JobOffer[]): JobOffer[] {
    const userId = this.firebaseService.getUserData()?.uid;

    let filteredJobs = jobs.filter((job) => {
      switch (this.visibilityFilter) {
        case 'mine':
          return userId ? job.userId === userId : false;

        case 'organization':
          return this.organizations.includes(job.orgId);

        case 'all':
        default:
          if (userId)
            return (
              job.isPublic ||
              job.userId === userId ||
              this.organizations.includes(job.orgId)
            );
          return job.isPublic;
      }
    });

    filteredJobs = filteredJobs.filter((job) =>
      this.filterOptions.every(
        (filter) =>
          !filter.selection ||
          filter.selection.length === 0 ||
          this.filterService.checkJob(job, filter),
      ),
    );

    return filteredJobs;
  }

  private filterByBoKConcept(jobs: JobOffer[]): JobOffer[] {
    if (this.bokConcepts.length === 0) return jobs;

    return jobs.filter((job) =>
      this.bokConcepts.some((concept) => job.knowledge.includes(concept)),
    );
  }
}
