import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';
import { ToastHostComponent } from './shared/ui/toast';

/**
 * Application root shell. Renders the persistent header + footer around
 * the active route's content. Single instance, server-rendered on every
 * request, hydrated on the client.
 *
 * The ToastHost is mounted here so notifications are available from any
 * route. It SSRs as an empty list (no toasts on the server), so no
 * hydration mismatch.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
