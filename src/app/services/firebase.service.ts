import { inject, Injectable } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  CollectionReference,
  deleteDoc,
  doc,
  docData,
  Firestore,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { concatMap, from, map, Observable, of } from 'rxjs';
import { JobOfferDB } from '../models/jobOfferDB';
import { OccupationalProfile } from '../models/occupationalProfile';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  userId: string = '';

  private orgCollection: CollectionReference;
  private profileCollection: CollectionReference<OccupationalProfile>;
  private jobCollection: CollectionReference<JobOfferDB>;

  constructor(
    private auth: Auth = inject(Auth),
    private db: Firestore = inject(Firestore),
  ) {
    this.orgCollection = collection(this.db, 'Organizations');
    this.profileCollection = collection(
      this.db,
      'OcuProfiles',
    ) as CollectionReference<OccupationalProfile>;
    this.jobCollection = collection(
      this.db,
      'JobOffers',
    ) as CollectionReference<JobOfferDB>;

    authState(this.auth).subscribe((user) => (this.userId = user?.uid ?? ''));
  }

  getJobOffers(): Observable<JobOfferDB[]> {
    return collectionData(this.jobCollection, { idField: '_id' }).pipe(
      map((items) =>
        items.map(
          (data) =>
            ({
              ...data,
              occuProf: OccupationalProfile.fromFirestore(data.occuProf),
            }) as JobOfferDB,
        ),
      ),
    );
  }

  getOccupationalProfiles(): Observable<OccupationalProfile[]> {
    return collectionData(this.profileCollection, { idField: '_id' }).pipe(
      map((items) =>
        items.map((data) => OccupationalProfile.fromFirestore(data)),
      ),
    );
  }

  getOrganizationDivisions(orgId: string): Observable<string[]> {
    const orgDocRef = doc(this.orgCollection, orgId);
    const organizationUsersSnapshot = docData(orgDocRef) as Observable<{
      divisions: string[];
    }>;

    return organizationUsersSnapshot.pipe(map((data) => data.divisions));
  }

  getUserData(): User | null {
    return this.auth.currentUser;
  }

  getUserOrganizationList(): Observable<{ _id: string; name: string }[]> {
    let uid = '';

    return authState(this.auth).pipe(
      concatMap((user) => {
        if (!user) return of([]);
        uid = user.uid;

        return collectionData(this.orgCollection) as Observable<
          { _id: string; name: string; regular: string[]; admin: string[] }[]
        >;
      }),
      map((orgs) =>
        orgs
          .filter((org) => org.regular.includes(uid) || org.admin.includes(uid))
          .map((org) => ({
            _id: org._id,
            name: org.name,
          })),
      ),
    );
  }

  updateJobOffer(job: JobOfferDB): Observable<string> {
    const newDocRef = doc(this.jobCollection, job._id);

    job.updatedAt = serverTimestamp();
    job.lastModified = new Date().toDateString();

    return from(setDoc(newDocRef, job.toPlain())).pipe(map(() => job._id));
  }

  updateOccupationalProfile(profile: OccupationalProfile): Observable<string> {
    const newDocRef = doc(this.profileCollection, profile._id);

    profile.updatedAt = serverTimestamp();
    profile.lastModified = new Date().toDateString();

    return from(setDoc(newDocRef, profile.toPlain())).pipe(
      map(() => profile._id),
    );
  }

  setJobOffer(job: JobOfferDB): Observable<string> {
    const newDocRef = doc(this.jobCollection);

    job.createdAt = serverTimestamp();
    job.updatedAt = serverTimestamp();
    job.lastModified = new Date().toDateString();
    job._id = newDocRef.id;

    return of(setDoc(newDocRef, job.toPlain())).pipe(map(() => job._id));
  }

  setOccupationalProfile(profile: OccupationalProfile): Observable<string> {
    const newDocRef = doc(this.profileCollection);

    profile.createdAt = serverTimestamp();
    profile.updatedAt = serverTimestamp();
    profile.lastModified = new Date().toDateString();
    profile._id = newDocRef.id;

    return of(setDoc(newDocRef, profile.toPlain())).pipe(
      map(() => profile._id),
    );
  }

  deleteJobOffer(job: JobOfferDB): Observable<void> {
    const docRef = doc(this.jobCollection, job._id);

    return from(deleteDoc(docRef)).pipe(
      concatMap(() => {
        return of();
      }),
    );
  }

  deleteOccupationalProfile(profile: OccupationalProfile): Observable<void> {
    const docRef = doc(this.profileCollection, profile._id);

    return from(deleteDoc(docRef)).pipe(
      concatMap(() => {
        return of();
      }),
    );
  }
}
