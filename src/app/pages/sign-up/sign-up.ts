import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

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
  i18n = inject(I18nService);

  name = '';
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    this.error.set('');
    if (this.password.length < 6) {
      this.error.set(this.i18n.t('signup.errorShortPassword'));
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.signUp(this.email, this.password, this.name);
      await this.router.navigate(['/join']);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('email-already-in-use')) {
        this.error.set(this.i18n.t('signup.errorEmailTaken'));
      } else {
        this.error.set(this.i18n.t('signup.errorFailed'));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
