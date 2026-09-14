import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, UrlTree } from '@angular/router';
import { AuthService, ExitWithoutSavingService, PermissionService } from '@eo4geo/ngx-bok-utils';
import {
  ConfirmationService,
  MenuItem,
  MessageService,
  TreeNode,
} from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { FileUploadModule } from 'primeng/fileupload';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { IftaLabelModule } from 'primeng/iftalabel';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Select, SelectModule } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { StepperModule } from 'primeng/stepper';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import {
  catchError,
  combineLatest,
  filter,
  finalize,
  map,
  of,
  Subscription,
  take,
} from 'rxjs';
import { Filter } from '../../models/filter';
import { FormType } from '../../models/formType';
import { JobOffer } from '../../models/jobOffer';
import { Dataset, Language, Tool } from '../../models/jobOfferDB';
import {
  Competence,
  Field,
  OccupationalProfile,
} from '../../models/occupationalProfile';
import { DatasetsService } from '../../services/datasets.service';
import { ESCOService } from '../../services/esco.service';
import { FieldsService } from '../../services/fields.service';
import { FirebaseService } from '../../services/firebase.service';
import { JobOfferService } from '../../services/jobOffer.service';
import { LanguagesService } from '../../services/languages.service';
import { OccupationalProfileService } from '../../services/occupationalProfile.service';
import { ToolsService } from '../../services/tools.service';
import { BokModalComponent } from '../bokModal/bokModal.component';
import { CustomSelectComponent } from '../customSelect/customSelect.component';
import { MultiselectChipsComponent } from '../multiselectChips/multiselectChips.component';
import { TextChipsComponent } from '../textChips/textChips.component';
import { TreeselectChipsComponent } from '../treeselectChips/treeselectChips.component';

@Component({
  standalone: true,
  selector: 'job-form',
  templateUrl: './jobForm.component.html',
  styleUrls: ['./jobForm.component.css'],
  imports: [
    InputTextModule,
    FloatLabelModule,
    FormsModule,
    InputIconModule,
    IconFieldModule,
    TextareaModule,
    SelectModule,
    CommonModule,
    DividerModule,
    StepperModule,
    ButtonModule,
    DatePickerModule,
    MultiSelectModule,
    TextChipsComponent,
    InputNumberModule,
    BokModalComponent,
    ToastModule,
    FileUploadModule,
    TooltipModule,
    MultiselectChipsComponent,
    CustomSelectComponent,
    ConfirmDialog,
    SelectButton,
    IftaLabelModule,
    TreeselectChipsComponent,
    ChipModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class JobFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() pageName: string = 'Create New Job Offer';
  @Input() inputJob?: JobOffer;

  job: JobOffer = new JobOffer();

  organizationSelector = {
    label: 'Organization',
    values: [] as any[],
    selection: [],
  };

  divisionSelector: Filter = {
    label: 'Division',
    values: [],
    selection: [],
  };

  errorMap: Map<string, string | undefined> = new Map();

  visibilityFieldOptions: MenuItem[] = [
    { label: 'Public', value: true },
    { label: 'Private', value: false },
  ];

  currency: MenuItem[] = [
    { label: 'US Dollars', value: '$' },
    { label: 'Euros', value: '€' },
    { label: 'British Pounds', value: '£' },
  ];

  contractType: MenuItem[] = [
    { label: 'Fixed' },
    { label: 'Internship' },
    { label: 'Scholarship' },
    { label: 'Temporal' },
  ];

  dedication: MenuItem[] = [{ label: 'Full Time' }, { label: 'Part Time' }];

  motivationLetterOptions: MenuItem[] = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];

  fieldNames: string[] = [];
  competenceLabels: string[] = [];
  datasetNames: string[] = [];
  toolNames: string[] = [];
  languageNames: string[] = [];

  competenceTree: TreeNode[] = [];
  customCompetences: string[] = [];

  showCustomCompetences: boolean = false;

  profiles: OccupationalProfile[] = [];
  selectedProfile?: OccupationalProfile;
  selectedProfiles: OccupationalProfile[] = [];

  chipAnimations: Record<string, boolean> = {};

  selectedOrgCanPublish: WritableSignal<boolean> = signal(false);

  private authSubscription!: Subscription;
  private userOrgsSubscription!: Subscription;

  private fields: Field[] = [];
  private competences: Competence[] = [];
  private datasets: Dataset[] = [];
  private tools: Tool[] = [];
  private languages: Language[] = [];

  private formType: FormType = FormType.Create;

  private previousNavigationUrl?: UrlTree;

  private profileSubscription!: Subscription;

  constructor(
    private exitWithoutSavingService: ExitWithoutSavingService,
    private firebaseService: FirebaseService,
    private messageService: MessageService,
    private jobOfferService: JobOfferService,
    private router: Router,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private fieldsService: FieldsService,
    private escoService: ESCOService,
    private datasetService: DatasetsService,
    private toolService: ToolsService,
    private languageService: LanguagesService,
    private occupationalProfileService: OccupationalProfileService,
    private permissionService: PermissionService
  ) {}

  ngOnInit() {
    this.formType = this.detectFormType(this.inputJob);

    this.job = new JobOffer(
      this.formType === FormType.Create ? undefined : this.inputJob,
    );

    this.authSubscription = this.authService
      .getUserState()
      .subscribe((state) => {
        if (state?.logged) {
          if (
            this.formType === FormType.Create ||
            this.formType === FormType.Duplicate
          ) {
            this.job.userId = state.uid;
          }
        } else {
          this.exitWithoutSavingService.bypassGuard.next(true);
          this.router.navigate(['job']);
        }
      });

    this.profileSubscription = combineLatest([
      this.firebaseService
        .getUserOrganizationList()
        .pipe(map((orgs) => orgs.map((o) => o._id))),
      this.occupationalProfileService
        .getOccupationalProfiles()
        .pipe(filter((profiles) => profiles !== undefined)),
    ]).subscribe(([orgs, profiles]) => {
      this.filterProfiles(profiles, orgs);
    });

    this.userOrgsSubscription = this.firebaseService
      .getUserOrganizationList()
      .subscribe((organizations) => {
        this.organizationSelector.values = organizations.map((org) => ({
          label: org.name,
          value: org._id,
        }));
      });

    this.fieldsService
      .getFields()
      .subscribe((fields) => (this.fields = fields));

    this.datasetService
      .getDatasets()
      .subscribe((datasets) => (this.datasets = datasets));

    this.toolService.getTools().subscribe((tools) => (this.tools = tools));

    this.languageService
      .getLanguages()
      .subscribe((languages) => (this.languages = languages));

    this.escoService.getTransversalSkillsFromJson().subscribe((tree) => {
      this.competenceTree = tree;
      this.competences = this.extractCompetencesFromTree(tree);

      this.manageJobCompetences();

      if (this.job.orgId) {
        this.firebaseService
          .getOrganizationDivisions(this.job.orgId)
          .pipe(take(1))
          .subscribe((divisions) => (this.divisionSelector.values = divisions));
        this.permissionService.organizationHasPermission(this.job.orgId, 'jot').pipe(take(1)).subscribe(hasPermission => this.selectedOrgCanPublish.set(hasPermission));
      }

      this.fieldNames = this.job.fields.map((field) => field.name);
      this.datasetNames = this.job.dataRequired.map((d) => d.name);
      this.toolNames = this.job.toolsRequired.map((t) => t.name);
      this.languageNames = this.job.languages.map((l) => l.name);
    });

    this.exitWithoutSavingService.showModalSubject.subscribe((value) => {
      if (value) this.confirmExitWithoutSaving();
    });

    this.previousNavigationUrl =
      this.router.lastSuccessfulNavigation?.previousNavigation?.initialUrl;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  ngOnDestroy() {
    this.authSubscription.unsubscribe();
    this.userOrgsSubscription.unsubscribe();
    this.profileSubscription.unsubscribe();
  }

  onOrganizationChange(newValue: { label: string; value: string }): void {
    this.job.orgId = newValue.value;
    this.job.orgName = newValue.label;
    this.job.division = '';
    this.firebaseService
      .getOrganizationDivisions(this.job.orgId!)
      .subscribe((divisions) => (this.divisionSelector.values = divisions));
    this.permissionService.organizationHasPermission(this.job.orgId, 'jot').pipe(take(1)).subscribe(hasPermission => {
      this.selectedOrgCanPublish.set(hasPermission);
      if (!hasPermission) {
        this.job.isPublic = false;
      }
    });
  }

  onConceptsChange(concepts: string[]): void {
    this.job.knowledge = concepts;
  }

  onSkillsChange(skills: string[]): void {
    this.job.skills = skills;
  }

  onDeletedConcept(label: string): void {
    const matchedSkills = this.job.skills.filter((skill) =>
      skill.startsWith(`[${label}]`),
    );

    if (matchedSkills.length > 0) this.confirmDeleteConcept(matchedSkills);
  }

  returnToHomepage(): void {
    if (this.previousNavigationUrl)
      this.router.navigateByUrl(this.previousNavigationUrl);
    else this.router.navigate(['']);
  }

  submitJob(): void {
    this.job.dataRequired = this.datasetNames.map(
      (name) =>
        this.datasets.find((dataset) => dataset.name === name) ?? {
          name: name,
          custom: true,
        },
    );

    this.job.toolsRequired = this.toolNames.map(
      (name) =>
        this.tools.find((tool) => tool.name === name) ?? {
          name: name,
          custom: true,
        },
    );

    this.job.languages = this.languageNames.map(
      (name) =>
        this.languages.find((language) => language.name === name) ?? {
          code: '',
          name: name,
        },
    );

    this.job.competences = this.competences.filter((c) =>
      this.competenceLabels.includes(c.preferredLabel),
    );
    this.job.customCompetences = this.customCompetences;

    this.job.fields = this.fields.filter((field) =>
      this.fieldNames.includes(field.name),
    );

    this.errorMap = this.jobOfferService.validateJobOffer(this.job);
    const allValid: boolean = Array.from(this.errorMap.values()).every(
      (value) => value === undefined,
    );

    if (allValid) {
      this.exitWithoutSavingService.bypassGuard.next(true);

      const isUpdate = this.formType === FormType.Edit;

      this.jobOfferService
        .submitJobOffer(this.job, isUpdate)
        .pipe(
          take(1),
          catchError((error) => {
            console.log(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail:
                'Something went wrong. Try again later or contact the administrator.',
              life: 3000,
              closable: true,
            });
            return of(null);
          }),
          finalize(() => {
            if (this.job._id !== '') {
              this.router.navigate(['job/' + this.job._id], {
                queryParams: {
                  submitted: true,
                  mode: isUpdate ? 'update' : 'create',
                },
              });
            }
          }),
        )
        .subscribe((actionId) => {
          this.job._id = actionId || '';
        });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail:
          'There are incomplete mandatory fields. Please review the form and try to submit again.',
        life: 3000,
        closable: true,
      });
    }
  }

  onProfileChange(
    selectedProfile: OccupationalProfile,
    profileSelect: Select,
  ): void {
    if (!selectedProfile) return;
    if (this.selectedProfiles.includes(selectedProfile)) {
      this.chipAnimations[selectedProfile._id] = true;

      setTimeout(() => {
        this.chipAnimations[selectedProfile._id] = false;
      }, 800);
      profileSelect.clear();
      return;
    }

    this.selectedProfiles.push(selectedProfile);

    this.job.title === ''
      ? (this.job.title = selectedProfile.title)
      : (this.job.title += ' ' + selectedProfile?.title);

    this.job.eqf = 'EQF ' + selectedProfile.eqf;

    this.job.description === ''
      ? (this.job.description = selectedProfile.description)
      : (this.job.description += '\n' + selectedProfile.description);

    this.fieldNames = [
      ...new Set([
        ...this.fieldNames,
        ...selectedProfile.fields.map((field) => field.name),
      ]),
    ];

    this.job.knowledge = [
      ...new Set([...this.job.knowledge, ...selectedProfile.knowledge]),
    ];

    this.job.skills = [
      ...new Set([...this.job.skills, ...selectedProfile.skills]),
    ];

    this.job.customSkills = [
      ...new Set([...this.job.customSkills, ...selectedProfile.customSkills]),
    ];

    const labels = selectedProfile.competences
      .map((c) => c.preferredLabel)
      .filter((label) => this.labelInTree(this.competenceTree, label));

    this.competenceLabels = [...new Set([...this.competenceLabels, ...labels])];

    this.customCompetences = [
      ...new Set([
        ...this.customCompetences,
        ...selectedProfile!.customCompetences,
      ]),
    ];
    this.showCustomCompetences = this.customCompetences.length > 0;

    this.chipAnimations[selectedProfile._id] = false;

    profileSelect.clear();
  }

  private labelInTree(tree: TreeNode[], label: string): boolean {
    return tree.some((node) => {
      if (node.label === label) return true;

      return node.children?.length && this.labelInTree(node.children, label);
    });
  }

  private detectFormType(job?: JobOffer): FormType {
    if (!job) return FormType.Create;

    if (job._id === '' && job.userId === '') return FormType.Duplicate;

    return FormType.Edit;
  }

  private extractCompetencesFromTree(
    tree: any[],
    seen = new Set<string>(),
  ): Competence[] {
    return tree.reduce((acc: Competence[], node) => {
      const label = node.label ?? '';

      if (!seen.has(label)) {
        seen.add(label);

        acc.push({
          preferredLabel: label,
          altLabels: node.altLabels ?? [],
          description: node.description ?? '',
          reuseLevel: node.reuseLevel ?? '',
          skillType: node.skillType ?? '',
          uri: node.uri ?? '',
        });
      }

      if (node.children?.length) {
        acc.push(...this.extractCompetencesFromTree(node.children, seen));
      }

      return acc;
    }, []);
  }

  private manageJobCompetences(): void {
    if (!this.inputJob) return;

    const labels = this.competences.map((c) => c.preferredLabel);

    const legacyLabels = this.job.competences
      .filter((c) => !labels.includes(c.preferredLabel))
      .map((c) => c.preferredLabel);

    this.job.competences = this.job.competences.filter((c) =>
      labels.includes(c.preferredLabel),
    );

    this.customCompetences = legacyLabels.filter(
      (c) => !this.job.customCompetences.includes(c),
    );

    this.competenceLabels = this.job.competences.map((c) => c.preferredLabel);

    this.customCompetences.push(...this.job.customCompetences);
    this.showCustomCompetences = this.customCompetences.length > 0;
  }

  private confirmExitWithoutSaving(): void {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to exit without saving?',
      header: 'Exit Without Saving',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: 'Exit',
        severity: 'primary',
      },
      accept: () => this.exitWithoutSavingService.exitSubject.next(true),
      reject: () => this.exitWithoutSavingService.exitSubject.next(false),
    });
  }

  private confirmDeleteConcept(skills: string[]): void {
    const isSingle = skills.length === 1;

    const message = isSingle
      ? 'There is 1 skill associated with the knowledge you deleted. Do you want to also delete it?'
      : `There are ${skills.length} skills associated with the knowledge you deleted. Do you want to also delete them?`;
    const acceptLabel = isSingle ? 'Yes, delete it.' : 'Yes, delete them.';
    const rejectLabel = isSingle ? 'No, keep it.' : 'No, keep them.';

    this.confirmationService.confirm({
      message: message,
      header: 'Deleted Knowledge',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: rejectLabel,
        severity: 'secondary',
      },
      acceptButtonProps: {
        label: acceptLabel,
        severity: 'primary',
      },
      accept: () =>
        (this.job.skills = this.job.skills.filter(
          (skill) => !skills.includes(skill),
        )),
      reject: () => {},
    });
  }

  private filterProfiles(
    profiles: OccupationalProfile[],
    orgs: string[],
  ): void {
    const userId = this.firebaseService.getUserData()?.uid;
    if (userId) {
      this.profiles = profiles.filter((profile) => {
        return (
          profile.isPublic ||
          profile.userId === userId ||
          orgs.includes(profile.orgId)
        );
      });
    }
  }
}
