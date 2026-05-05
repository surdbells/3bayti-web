import { Component, ChangeDetectionStrategy, inject } from '@angular/core';

import { ToastService } from './toast.service';

/**
 * ToastHostComponent — renders the global toast queue.
 *
 * Mounted once in app.html. Sits position:fixed in the top-right
 * corner of the viewport. Each toast has its own auto-dismiss timer
 * scheduled by ToastService.
 *
 * SSR-safety: ToastService starts with an empty signal value, so on
 * the server this component renders an empty <ul>. No hydration
 * mismatch.
 *
 * Accessibility:
 *   - The list has aria-live="polite" so screen readers announce new
 *     toasts without interrupting the user's current focus.
 *   - role="status" on each toast makes individual additions discrete
 *     announcements rather than the whole list re-reading every time.
 *   - Dismiss buttons have aria-labels.
 */
@Component({
  selector: 'ui-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="toast-host" aria-live="polite" aria-label="Notifications">
      @for (toast of toasts(); track toast.id) {
        <li
          class="toast"
          [class.toast--success]="toast.tone === 'success'"
          [class.toast--info]="toast.tone === 'info'"
          [class.toast--error]="toast.tone === 'error'"
          role="status"
        >
          @if (toast.tone === 'success') {
            <svg class="toast__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M20 6L9 17l-5-5"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          }
          <span class="toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="toast__dismiss"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </li>
      }
    </ul>
  `,
  styleUrl: './toast.scss',
})
export class ToastHostComponent {
  toastService = inject(ToastService);
  /* Bind directly to the signal — Angular's signal-aware change
     detection re-renders only this component when the queue changes. */
  toasts = this.toastService.toasts;
}
