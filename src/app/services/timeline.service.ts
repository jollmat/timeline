import { Injectable } from '@angular/core';
import { TimelineDateInterface } from '../model/interface/timeline-date.interface';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { TimelineItemTypeEnum } from '../model/enum/timeline-item-type.enum';
import * as moment from 'moment';
import { TimelineItemInterface } from '../model/interface/timeline-item.interface';

import { v4 as uuidv4 } from 'uuid';
import { TimelineCollectionInterface } from '../model/interface/timeline-collection.interface';

@Injectable({
  providedIn: 'root'
})
export class TimelineService {

  storeKeyTimeline: string = 'APP_TIMELINE';
  storeKeyTimelineCollections: string = 'APP_TIMELINE_COLLECTIONS';
  storeKeyTimelineCurrentCollectionId: string = 'APP_TIMELINE_CURRENT_COLLECTION_ID';

  timelineDates$ = new BehaviorSubject<TimelineDateInterface[]>([]);

  timelineDefault: TimelineDateInterface[] = [];

  collections$ = new BehaviorSubject<TimelineCollectionInterface[]>([]);

  timelineBgColor$ = new BehaviorSubject<string>('white');

  constructor() {
    this.loadCollections();
    this.loadTimeline();
  }

  getNewId(): string {
    return uuidv4();
  }

  loadCollections() {
    // Collections
    const storedCollections: string | null = localStorage.getItem(this.storeKeyTimelineCollections);
    this.collections$.next(storedCollections ? JSON.parse(storedCollections) : [
      { id: this.getNewId(), name: 'Default collection' }
    ]);
    if (!storedCollections) {
      this.saveCollections(this.collections$.getValue());
    }
  }

  loadTimeline() {

    // Timeline
    const storedTimeline: string | null = localStorage.getItem(this.storeKeyTimeline);
    let timeline: TimelineDateInterface[] = storedTimeline ? JSON.parse(storedTimeline) : this.timelineDefault;

    // Set items date and collection
    timeline.map((timelineDate) => {
      if (storedTimeline) {
        timelineDate.date = new Date(timelineDate.date);
      }
      if (!timelineDate.collectionId || this.collections$.getValue().length===0) {
        timelineDate.collectionId = this.collections$.getValue()[0].id;
      }
      timelineDate.items.map((timelineItem) => {
          if (!timelineItem.id) { timelineItem.id = this.getNewId() };
          timelineItem.date = timelineDate.date;
      });
    });

    // Sort by date
    timeline.sort((a, b) => {
      return a.date.getTime()>b.date.getTime() ? 1 : -1;
    });

    if (!storedTimeline) {
      this.saveTimeline(timeline);
    }

    this.timelineDates$.next(timeline);
  }

  getTimeline(): TimelineDateInterface[] {
    return this.timelineDates$.getValue();
  }

  saveTimeline(timeline: TimelineDateInterface[]): Observable<TimelineDateInterface[]> {
    localStorage.setItem(this.storeKeyTimeline, JSON.stringify(timeline));
    this.loadTimeline();
    return of(this.getTimeline());
  }

  saveCollections(collections: TimelineCollectionInterface[]) {
    collections.sort((a, b) => {
      return a.name>b.name ? 1 : -1;
    });
    localStorage.setItem(this.storeKeyTimelineCollections, JSON.stringify(collections));
    this.loadCollections();
  }
}
