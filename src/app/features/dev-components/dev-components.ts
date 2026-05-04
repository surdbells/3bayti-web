import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  ButtonComponent,
  ContainerComponent,
  HeadingComponent,
  TextComponent,
  StackComponent,
} from '../../shared/ui';
import { SeoService } from '../../core/seo/seo.service';
import { environment } from '../../../environments/environment';

/**
 * /_dev/components — visual showcase of every shared UI primitive.
 *
 * This is our lightweight Storybook substitute. Native to the app, no
 * extra deps, fully SSR-rendered (so we also get to verify primitives
 * don't break under server rendering).
 *
 * The route is noindex'd so search engines never include it.
 *
 * To browse: visit /_dev/components in dev or staging. Production
 * users can technically reach it too — there's no harm in that, the
 * page is purely informational. We could route-guard it if it ever
 * felt necessary.
 */
@Component({
  selector: 'app-dev-components',
  standalone: true,
  imports: [
    ButtonComponent,
    ContainerComponent,
    HeadingComponent,
    TextComponent,
    StackComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dev-components.html',
  styleUrl: './dev-components.scss',
})
export class DevComponentsComponent {
  private seo = inject(SeoService);

  constructor() {
    this.seo.set({
      title: 'Component preview',
      description: 'Internal UI primitive showcase.',
      url: `${environment.SITE_URL}/_dev/components`,
      robots: 'noindex,nofollow',
    });
  }

  /** Variants matrix used by the template — keeps logic out of HTML. */
  readonly buttonVariants = ['primary', 'secondary', 'ghost'] as const;
  readonly buttonSizes = ['sm', 'md', 'lg'] as const;
  readonly headingSizes = ['display', 'xl', 'lg', 'md', 'sm'] as const;
  readonly textSizes = ['xs', 'sm', 'base', 'lg'] as const;
  readonly textTones = ['default', 'secondary', 'tertiary'] as const;
  readonly containerSizes = ['narrow', 'default', 'wide', 'full'] as const;
  readonly stackGaps = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
}
