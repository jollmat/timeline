import { TimelineItemTypeEnum } from "../enum/timeline-item-type.enum";

export interface TimelineItemInterface {
    id?: string;
    date?: Date;
    hour?: string,
    title: string;
    text: string;
    type: TimelineItemTypeEnum;
    links?: string;
    iconClass?: string;
}