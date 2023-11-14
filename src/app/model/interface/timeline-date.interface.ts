import { TimelineItemInterface } from "./timeline-item.interface";

export interface TimelineDateInterface {
    collectionId: string;
    date: Date;
    items: TimelineItemInterface[];
}