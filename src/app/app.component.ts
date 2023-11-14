import { Component } from '@angular/core';
import { TimelineService } from './services/timeline.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'timeline';
  backgroundColor: string = '';

  constructor(
    private timelineService: TimelineService
  ) {
    this.timelineService.timelineBgColor$.subscribe((bgColor) => this.backgroundColor = bgColor);
  }
}
