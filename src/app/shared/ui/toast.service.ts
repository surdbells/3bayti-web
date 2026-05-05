import { Injectable, signal } from '@angular/core';

/**
 * A single toast notification.
 */
export interface Toast {
  /** Unique id (epoch ms + random) for trackBy and programmatic dismiss. */
  id: number;
  /** Message displayed to the user. Plain text — keep short (≤80 chars). */
  message: string;
  /** Tone of the toast — controls colour treatment. */
  tone: 'success' | 'info' | 'error';
  /** Auto-dismiss timeout in ms. Set to 0 to keep until manually dismissed. */
  duration: number;
}

/**
 * Toast notification service.
 *
 * Lightweight, in-memory queue. Components dispatch via `show()`;
 * the global ToastHostComponent (mounted once in app.html) renders
 * the queue and auto-dismisses after each toast's duration.
 *
 * Why not a full library (ngx-toastr, hot-toast):
 *   - We need exactly 3 tones and a slide-in animation. The 30 lines
 *     of code below cover the brief.
 *   - Every dependency we add is bytes shipped to every visitor.
 *
 * Phase 2 use cases:
 *   - "Added to cart" confirmation
 * Phase 3+ adds:
 *   - "Saved to wishlist"
 *   - "Sign-in failed"
 *   - "Order placed"
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Active toasts queue. Newest first. */
  readonly toasts = signal<Toast[]>([]);

  /** Show a toast. Returns the toast id so callers can dismiss
   *  programmatically (rare). */
  show(
    message: string,
    tone: Toast['tone'] = 'info',
    duration: number = 3000,
  ): number {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: Toast = { id, message, tone, duration };
    this.toasts.set([toast, ...this.toasts()]);

    if (duration > 0) {
      /* setTimeout is the right tool here — we want exactly one
         scheduled dismissal per toast. */
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  /** Convenience for the most common cart/wishlist confirmations. */
  success(message: string, duration: number = 3000): number {
    return this.show(message, 'success', duration);
  }

  /** Manually dismiss a toast by id. Idempotent — a toast that has
   *  already auto-dismissed is a no-op. */
  dismiss(id: number): void {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }
}
