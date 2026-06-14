import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SignUpComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.error.set('');
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters.');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.signUp(this.email, this.password, this.name);
      await this.router.navigate(['/join']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('email-already-in-use')) {
        this.error.set('This email is already registered.');
      } else {
        this.error.set('Could not create account. Try again.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
