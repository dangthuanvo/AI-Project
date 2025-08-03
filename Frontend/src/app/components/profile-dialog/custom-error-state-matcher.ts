import { ErrorStateMatcher } from '@angular/material/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';

export class ShowOnDirtyOrTouchedErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}

export class DisableOnSuccessErrorStateMatcher implements ErrorStateMatcher {
  constructor(private isSuccess: () => boolean) {}
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    if (this.isSuccess()) return false;
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}