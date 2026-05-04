import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

/**
 * Heading — typographic primitive with decoupled semantic + visual levels.
 *
 * The semantic level (h1..h6) drives accessibility + SEO outline; the
 * visual size is a separate concern. Common pattern: a card title might
 * need to be h3 semantically (it's a sub-section) but look like a
 * "display"-sized headline visually. This component lets you pick both.
 *
 * Usage:
 *   <ui-heading level="h1">Page title</ui-heading>
 *   <ui-heading level="h2" size="display">Hero headline</ui-heading>
 *   <ui-heading level="h3" size="md">Card title</ui-heading>
 *
 * Sizes (matches the type scale in styles.scss):
 *   display  64px  — once-per-page hero headlines
 *   xl       40px  — section titles on landing pages
 *   lg       28px  — primary card / panel titles
 *   md       20px  — secondary headings
 *   sm       16px  — small section labels
 */
@Component({
  selector: 'ui-heading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (level) {
      @case ('h1') { <h1 [class]="cssClass()"><ng-content /></h1> }
      @case ('h2') { <h2 [class]="cssClass()"><ng-content /></h2> }
      @case ('h3') { <h3 [class]="cssClass()"><ng-content /></h3> }
      @case ('h4') { <h4 [class]="cssClass()"><ng-content /></h4> }
      @case ('h5') { <h5 [class]="cssClass()"><ng-content /></h5> }
      @case ('h6') { <h6 [class]="cssClass()"><ng-content /></h6> }
    }
  `,
  styles: [`
    :host { display: block; }

    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
      font-weight: 600;
      letter-spacing: -0.01em;
      line-height: 1.15;
      color: var(--color-brand-700);
    }

    .size-display { font-size: clamp(40px, 5.5vw, 64px); font-weight: 700; }
    .size-xl      { font-size: clamp(28px, 3.5vw, 40px); }
    .size-lg      { font-size: clamp(22px, 2.5vw, 28px); }
    .size-md      { font-size: 20px; }
    .size-sm      { font-size: 16px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
  `],
})
export class HeadingComponent {
  /** Semantic level (h1..h6). Drives accessibility tree + SEO outline. */
  @Input() level: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h2';
  /** Visual size — independent of level. Defaults to 'lg'. */
  @Input() size: 'display' | 'xl' | 'lg' | 'md' | 'sm' = 'lg';

  cssClass(): string {
    return `size-${this.size}`;
  }
}
