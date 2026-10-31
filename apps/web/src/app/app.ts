import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserDto } from '@medical-proj/shared-models';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  template: `
    <div class="web-shell">
      <header class="navbar">
        <div class="logo">CareSync Medical Web Portal</div>
        <div class="user-badge">
          Doctor: {{ currentUser().firstName }} {{ currentUser().lastName }} ({{
            currentUser().role
          }})
        </div>
      </header>
      <main class="content">
        <h1>Welcome to Hospital Operations</h1>
        <p>
          Connected to NestJS backend and sharing types via
          <code>&#64;medical-proj/shared-models</code>.
        </p>
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .web-shell {
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
      }
      .navbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: #0284c7;
        color: white;
      }
      .logo {
        font-size: 1.25rem;
        font-weight: 700;
      }
      .user-badge {
        font-size: 0.9rem;
        background: rgba(255, 255, 255, 0.2);
        padding: 0.4rem 0.8rem;
        border-radius: 9999px;
      }
      .content {
        padding: 2rem;
        max-width: 900px;
        margin: 0 auto;
      }
    `,
  ],
})
export class App {
  protected title = 'web';
  protected currentUser = signal<UserDto>({
    id: 'usr_01',
    email: 'sarah.chen@hospital.org',
    role: 'DOCTOR',
    firstName: 'Sarah',
    lastName: 'Chen',
    createdAt: new Date().toISOString(),
  });
}
