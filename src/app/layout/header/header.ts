import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../../features/cart/cart.service';

/**
 * Site-wide header. Persistent across all pages, sticky to the viewport top.
 *
 * Phase 2 adds: cart icon + badge in the top-right. The badge updates
 * reactively as the cart changes via CartService.count signal. SSR
 * always renders the badge as 0 / hidden because CartService starts
 * empty on the server; it lights up after browser hydration when the
 * service hydrates from localStorage.
 *
 * Phase 3+ will add: search bar, account icon, designers nav.
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent {
  private cart = inject(CartService);
  /** Live cart count for the badge. 0 = badge hidden via template. */
  count = this.cart.count;
}
