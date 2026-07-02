import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { TreeSelectModule } from 'primeng/treeselect';

@Component({
  standalone: true,
  selector: 'treeselect-chips',
  templateUrl: './treeselectChips.component.html',
  styleUrls: ['./treeselectChips.component.css'],
  imports: [
    FloatLabelModule,
    FormsModule,
    IconFieldModule,
    ButtonModule,
    ChipModule,
    CommonModule,
    TreeSelectModule,
  ],
})
export class TreeselectChipsComponent implements OnInit, OnChanges {
  @Input() chips: string[] = [];
  @Input() error: boolean = false;
  @Input() fieldName: string = 'Field Name';
  @Input() treeNodes: TreeNode[] = [];

  @Output() chipsChange: EventEmitter<string[]> = new EventEmitter();

  chipAnimations: Record<string, boolean> = {};
  treeSelection: TreeNode[] = [];

  ngOnInit() {
    this.chips.forEach((chip) => {
      this.chipAnimations[chip] = false;
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['treeNodes']) {
      const currentValue: TreeNode[] = changes['treeNodes'].currentValue;
      this.treeSelection = this.getTreeSelection(currentValue, this.chips);
    }
    if (changes['chips'] && !changes['chips'].firstChange) {
      const currentValue: string[] = changes['chips'].currentValue;

      if (
        this.treeSelection.some(
          (node) => !currentValue.includes(node.label!),
        ) ||
        currentValue.some(
          (chip) => !this.treeSelection.some((node) => node.label === chip),
        )
      ) {
        const seen = new Set<string>();
        const selection = this.getTreeSelection(
          this.treeNodes,
          currentValue,
        ).filter((node) => {
          if (seen.has(node.label!)) return false;

          seen.add(node.label!);
          return true;
        });

        this.treeSelection = this.getTreeSelection(
          this.treeNodes,
          currentValue,
        );
      }
    }
  }

  deleteChip(chip: string): void {
    this.treeSelection = this.treeSelection.filter(
      (node) => node.label !== chip,
    );
    this.chipsChange.emit(this.chips.filter((value) => value !== chip));
  }

  treeselectChange(values: TreeNode[]) {
    this.treeSelection = values || [];
    this.chips = [...new Set(this.treeSelection.map((node) => node.label!))];
    this.chipsChange.emit(this.chips);
  }

  private getTreeSelection(nodes: TreeNode[], chips: string[]): TreeNode[] {
    return nodes.reduce<TreeNode[]>((acc, n) => {
      if (chips.includes(n.label!)) acc.push(n);
      if (n.children) acc.push(...this.getTreeSelection(n.children, chips));

      return acc;
    }, []);
  }
}
