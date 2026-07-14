import { Component, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  i18n = inject(I18nService);

  email = '';
  error = signal('');
  sent = signal(false);
  loading = signal(false);

  async onSubmit() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.resetPassword(this.email);
      this.sent.set(true);
    } catch (e) {
      // Show a generic success state even on auth/user-not-found so the
      // form can't be used to check which emails have accounts.
      if (e instanceof Error && e.message.includes('auth/invalid-email')) {
        this.error.set(this.i18n.t('forgotPassword.errorInvalidEmail'));
      } else {
        this.sent.set(true);
      }
    } finally {
      this.loading.set(false);
    }
  }
}
