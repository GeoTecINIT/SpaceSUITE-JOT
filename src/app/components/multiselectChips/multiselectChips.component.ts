import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { MultiSelect, MultiSelectModule } from 'primeng/multiselect';
import { DatasetsService } from '../../services/datasets.service';
import { FieldsService } from '../../services/fields.service';
import { LanguagesService } from '../../services/languages.service';
import { ToolsService } from '../../services/tools.service';

@Component({
  standalone: true,
  selector: 'multiselect-chips',
  templateUrl: './multiselectChips.component.html',
  styleUrls: ['./multiselectChips.component.css'],
  imports: [
    FloatLabelModule,
    FormsModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    MultiSelectModule,
  ],
})
export class MultiselectChipsComponent implements OnInit {
  @Input() optionsSource: string = 'filters';
  @Input() allowCustom: boolean = true;
  @Input() chips: string[] = [];
  @Input() fieldName: string = 'Field Name';
  @Input() fieldNameSingular: string = 'field name';
  @Input() error: boolean = false;

  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter();

  @ViewChild('pmulti', { read: MultiSelect }) multiSelectEl!: MultiSelect;

  currentText: string = '';
  multiSelection: string[] = [];
  multiselectOptions: any[] = [];
  chipAnimations: Record<string, boolean> = {};

  constructor(
    private fieldsService: FieldsService,
    private datasetsService: DatasetsService,
    private toolsService: ToolsService,
    private languagesService: LanguagesService,
  ) {}

  ngOnInit() {
    switch (this.optionsSource) {
      case 'fields':
        this.fieldsService.getFields().subscribe((fields) => {
          const groups = new Map<string, any[]>();

          fields.forEach((field) => {
            if (!groups.has(field.grandparent)) {
              groups.set(field.grandparent, []);
            }

            groups.get(field.grandparent)!.push({
              label: field.name,
              value: field.name,
            });
          });

          this.multiselectOptions = Array.from(groups, ([label, items]) => ({
            label,
            items,
          }));
        });

        break;

      case 'datasets':
        this.datasetsService.getDatasets().subscribe(
          (datasets) =>
            (this.multiselectOptions = datasets.map((d) => ({
              label: d.name,
              value: d.name,
            }))),
        );

        break;

      case 'tools':
        this.toolsService.getTools().subscribe(
          (tools) =>
            (this.multiselectOptions = tools.map((t) => ({
              label: t.name,
              value: t.name,
            }))),
        );

        break;

      case 'languages':
        this.languagesService.getLanguages().subscribe(
          (languages) =>
            (this.multiselectOptions = languages.map((l) => ({
              label: l.name,
              value: l.name,
            }))),
        );

        break;
    }

    this.chips.forEach((chip) => {
      this.chipAnimations[chip] = false;
    });
  }

  onDropdownOpen(): void {
    setTimeout(() => {
      const input = document.querySelector(
        '.p-multiselect-filter-container .p-inputtext',
      ) as HTMLInputElement | null;

      if (input) {
        const keyHandler = (event: KeyboardEvent) => {
          if (event.key === 'Enter' && this.allowCustom) {
            input.removeEventListener('keyup', keyHandler);
            this.clickButton();
          }
        };

        input.addEventListener('keyup', keyHandler);
      }
    }, 20);
  }

  clickButton(): void {
    if (!this.allowCustom) return;

    const inputValue = this.currentText.trim();

    if (inputValue !== '' && !this.chips.includes(inputValue)) {
      this.chipsChange.emit(this.chips.concat(inputValue));
    } else if (inputValue !== '') {
      this.chipAnimations[inputValue] = true;

      setTimeout(() => {
        this.chipAnimations[inputValue] = false;
      }, 800);
    }

    this.currentText = '';
    this.multiSelectEl.hide();
  }

  deleteChip(chip: string): void {
    this.multiSelection = this.multiSelection.filter((value) => value !== chip);
    this.chipsChange.emit(this.chips.filter((c) => c !== chip));
  }

  multiselectChange(values: string[]): void {
    this.multiSelection = values || [];
    const include = this.multiSelection.filter(
      (value) => !this.chips.includes(value),
    );
    let exclude: string[] = [];

    if (this.optionsSource === 'fields') {
      exclude = this.chips.filter(
        (value) =>
          !this.multiSelection.includes(value) &&
          this.multiselectOptions
            .map((x) => x.items)
            .some((array) => array.map((y: any) => y.value).includes(value)),
      );
    } else {
      exclude = this.chips.filter(
        (value) =>
          !this.multiSelection.includes(value) &&
          this.multiselectOptions.map((x) => x.value).includes(value),
      );
    }

    this.chipsChange.emit(
      this.chips.concat(include).filter((value) => !exclude.includes(value)),
    );
  }

  clear(): void {
    this.multiSelectEl.hide();
    this.chipsChange.emit([]);
  }

  get filterPlaceholder(): string {
    const base = `Choose a ${this.fieldNameSingular}`;

    return this.allowCustom ? `${base} or specify a custom value` : base;
  }

  get isFieldsSource(): boolean {
    return this.optionsSource === 'fields';
  }

  get showCustomButton(): boolean {
    return this.allowCustom && !!this.multiSelectEl.filterValue?.trim();
  }
}
