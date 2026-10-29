import { Component, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/angular';
import { AppointmentDto } from '@medical-proj/shared-models';

@Component({
  selector: 'app-home',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar color="primary">
        <ion-title>Medical App</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="ion-padding">
      <ion-card>
        <ion-card-header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <ion-card-subtitle>Patient Portal</ion-card-subtitle>
            <ion-badge color="success">System Online</ion-badge>
          </div>
          <ion-card-title>Welcome to CareSync</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Your secure cross-platform medical companion built with Angular, Ionic, and Capacitor.
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Next Appointment</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-list>
            <ion-item lines="none">
              <ion-label>
                <h3>Status: <strong>{{ nextAppointment().status }}</strong></h3>
                <p>Time: {{ nextAppointment().scheduledAt }}</p>
                <p>Notes: {{ nextAppointment().notes }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
          <ion-button expand="block" color="primary" style="margin-top: 10px;">
            Book New Appointment
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: #f8fafc;
      }
    `,
  ],
})
export class HomePage {
  protected nextAppointment = signal<AppointmentDto>({
    id: 'appt_101',
    patientId: 'pat_01',
    doctorId: 'doc_sarah',
    scheduledAt: 'Tomorrow, 10:30 AM',
    status: 'SCHEDULED',
    notes: 'Routine blood pressure and health checkup',
  });
}
