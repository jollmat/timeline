import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import html2canvas from 'html2canvas';
import { Toast, ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { SwalTypesEnum } from 'src/app/model/enum/swal-types.enum';
import { TimelineAlignEnum } from 'src/app/model/enum/timeline-align.enum';
import { TimelineItemTypeEnum } from 'src/app/model/enum/timeline-item-type.enum';
import { TimelineDateInterface } from 'src/app/model/interface/timeline-date.interface';
import { TimelineItemInterface } from 'src/app/model/interface/timeline-item.interface';
import { SwalService } from 'src/app/services/swal.service';
import { TimelineService } from 'src/app/services/timeline.service';
import Swal from 'sweetalert2';
import { DeviceDetectorService } from 'ngx-device-detector';
import { TimelineCollectionInterface } from 'src/app/model/interface/timeline-collection.interface';
import { TIMELINE_ITEM_TYPES } from 'src/app/model/constants/timeline-item-types.constant';

declare var jsPDF: any;

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit {

  TimelineAlignEnum = TimelineAlignEnum;
  TimelineItemTypeEnum = TimelineItemTypeEnum;

  timelineFormItemTypes: { value: string, text: string }[] = [];
  timelineFormCollections: { value: string, text: string }[] = [];

  collections!: TimelineCollectionInterface[];

  timeline!: TimelineDateInterface[];
  searchTimeline!: TimelineDateInterface[];

  itemForm!: FormGroup;
  searchForm!: FormGroup;
  collectionForm!: FormGroup;
  collectionEditForm!: FormGroup;

  expandedItems: string[] = [];
  expandedDateItems: number[] = [];

  hoverDateIndex?: number;
  hoverItemId?: string;

  currentItem?: TimelineItemInterface;
  currentCollection!: TimelineCollectionInterface;
  currentEditCollection?: TimelineCollectionInterface;

  alignment: TimelineAlignEnum = TimelineAlignEnum.LEFT;
  alignmentStoreKey: string = 'APP_TIMELINE_ALIGNMENT';

  exporting: boolean = false;

  searchOptions: {
    itemType?: TimelineItemTypeEnum,
    text?: string
  } = {};

  isMobile: boolean = false;

  constructor(
    private timelineService: TimelineService,
    private modalService: NgbModal,
    private swalService: SwalService,
    private toastr: ToastrService,
    private deviceDetector: DeviceDetectorService
  ) { }

  setAlignment(value: TimelineAlignEnum) {
    this.alignment = value;
    localStorage.setItem(this.alignmentStoreKey, this.alignment);
  }

  toggleExpandDate(date: number) {
    if (!this.isExpandedDate(date)) {
      this.expandedDateItems.push(date);
    } else {
      this.expandedDateItems = this.expandedDateItems.filter((_date) => _date!==date)
    }
  }

  isExpandedDate(date: number): boolean {
    return this.expandedDateItems.some((_date) => _date===date);
  }

  toggleExpandItem(id: string) {
    if (!this.isExpandedItem(id)) {
      this.expandedItems.push(id);
    } else {
      this.expandedItems = this.expandedItems.filter((_id) => _id!==id)
    }
  }

  isExpandedItem(id: string): boolean {
    return this.expandedItems.some((_id) => _id===id);
  }

  showNewItem(template: any, date: Date) {
    this.itemForm.patchValue({'date': date});
    this.itemForm.patchValue({'hour': ''});
    this.itemForm.patchValue({'title': ''});
    this.itemForm.patchValue({'text': ''});
    this.itemForm.patchValue({'type': ''});
    this.itemForm.patchValue({'links': ''});
    this.itemForm.patchValue({'iconClass': ''});
    this.modalService.open(template, {
      centered: true
      // backdrop: 'static'
    });
  }

  showEditItem(template: any, timelineItem: TimelineItemInterface) {
    this.currentItem = timelineItem;
    this.itemForm.patchValue({'date': timelineItem.date});
    this.itemForm.patchValue({'hour': timelineItem.hour || ''});
    this.itemForm.patchValue({'title': timelineItem.title});
    this.itemForm.patchValue({'text': timelineItem.text});
    this.itemForm.patchValue({'type': timelineItem.type});
    this.itemForm.patchValue({'links': timelineItem.links});
    this.itemForm.patchValue({'iconClass': timelineItem.iconClass || ''});
    this.modalService.open(template, {
      centered: true
      // backdrop: 'static'
    });
  }

  deleteItem(timelineItem: TimelineItemInterface) {
    this.swalService.openSwal({
      icon: SwalTypesEnum.WARNING,
      title: 'Atenció',
      text: 'S\'eliminarà l\'element indicat. Continuar?',
      showCancelButton: true,
      confirmButtonText: 'Acceptar',
      cancelButtonText: 'Cancel·lar',
      reverseButtons: true
    }).then((_res) => {
      if (_res.isConfirmed) {
        this.expandedItems = this.expandedItems.filter((_itemId) => _itemId!==timelineItem.id );
        const dateItem: TimelineDateInterface | undefined = this.timeline.find((_dateItem) => {
          return _dateItem.date.getTime() === timelineItem.date?.getTime();
        });
        if (dateItem) {
          dateItem.items = dateItem.items.filter((_item) => {
            return _item.id!==timelineItem.id;
          });
          if (dateItem.items.length===0) {
            this.timeline = this.timeline.filter((_dateItem) => {
              return _dateItem.date.getTime()!==timelineItem.date?.getTime()
            });
          }
          this.timelineService.saveTimeline(this.timeline).subscribe(() => {
            this.toastr.success('Item esborrat correctament');
          });
        }
      }
    })
  }

  showNewDateItem(template: any) {
    this.currentItem = undefined;
    this.itemForm.reset();
    this.modalService.open(template, {
      centered: true
      // backdrop: 'static'
    });
  }

  saveItem() {
    const formItem: TimelineItemInterface = (this.itemForm.getRawValue()) as TimelineItemInterface;

    if (this.currentItem) {
      const dateItem: TimelineDateInterface | undefined = this.timeline.find((_dateItem) => _dateItem.date.getTime()===this.currentItem?.date?.getTime());

      if (dateItem) {
        dateItem.collectionId = this.currentCollection.id;
        let timelineItem: TimelineItemInterface | undefined = dateItem.items.find((_item) => _item.id===this.currentItem?.id );
        this.currentItem = undefined;
        if (timelineItem) {
          timelineItem.hour = formItem.hour;
          timelineItem.title = formItem.title;
          timelineItem.text = formItem.text;
          timelineItem.type = formItem.type;
          timelineItem.links = formItem.links;
          timelineItem.iconClass = formItem.iconClass;
          this.timelineService.saveTimeline(this.timeline).subscribe(() => {
            this.toastr.success('Item actualitzat correctament');
          });
        }
      }
      
    } else {
      const dateItem: TimelineDateInterface | undefined = this.timeline.find((_dateItem) => {
        return _dateItem.date.getTime()===formItem.date?.getTime() &&
               _dateItem.collectionId===this.currentCollection.id;
      });
      
      const newItem: TimelineItemInterface = {
        id: this.timelineService.getNewId(),
        date: formItem.date,
        hour: formItem.hour,
        title: formItem.title,
        text: formItem.text,
        type: formItem.type,
        links: formItem.links,
        iconClass: formItem.iconClass
      }

      if (dateItem) {
        dateItem.items.push(newItem);
      } else {
        this.timeline.push({
          collectionId: this.currentCollection.id,
          date: formItem.date || new Date(),
          items: [newItem]
        });
      }
      this.timelineService.saveTimeline(this.timeline).subscribe(() => {
        this.toastr.success('Item creat correctament');
      });

    }
    if (this.filterApplied()) {
      this.doSearch();
    }
  }

  collapseAll() {
    this.expandedDateItems = [];
    this.expandedItems = [];
  }

  expandAll(datesOnly: boolean) {
    if (datesOnly) {
      this.expandedItems = [];
    }
    this.timeline.forEach((_dateItem) => {
      this.expandedDateItems.push(_dateItem.date.getTime());
      if (!datesOnly) {
        _dateItem.items.forEach((_item) => {
          if (_item.id && !this.isExpandedItem(_item.id)) {
            this.expandedItems.push(_item.id);
          }
        })
      }
    });
  }

  isPastDate(d: Date): boolean {
    return d.getTime() < new Date().getTime();
  }

  export() {

    this.exporting = true;

    setTimeout(() => {
      // Extraemos el
      const DATA = document.getElementById('timeline');
      const doc = new jsPDF('p', 'pt', 'a4');
      const options = {
        background: 'white',
        scale: 3
      };
      if (DATA) {

        html2canvas(DATA).then(
          function (canvas) {
             
              var imgData = canvas.toDataURL('image/png');
              var doc = new jsPDF('p', 'mm');
              var position = 10; // give some top padding to first page
              var paddingLeft = 10;
              var paddingTop = 10;
              var imgWidth = 210;
              var pageHeight = 295;
              var imgHeight = canvas.height * imgWidth / canvas.width;
              var heightLeft = imgHeight;
      
              doc.addImage(imgData, 'PNG', paddingLeft, paddingTop, imgWidth, imgHeight);
              heightLeft -= pageHeight;
      
              while (heightLeft >= 0) {
                  position += heightLeft - imgHeight; // top padding for other pages
                  doc.addPage();
                  doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                  heightLeft -= pageHeight;
              }
              
              doc.save(`${new Date().toISOString()}_timeline.pdf`);
      
      
          })

      }
    }, 1000);
    
  }

  filterApplied(): boolean {
    return this.searchForm.get('text')?.value || 
    (this.searchForm.get('type')?.value && this.searchForm.get('type')?.value.length>0);
  }

  matchesSearch(obj: any) {
    if (!this.filterApplied()) {
      return true;
    }
    let found: boolean = false;
    const formValue: {type?: TimelineItemTypeEnum, text?: string} = this.searchForm.getRawValue() as {type?: TimelineItemTypeEnum, text?: string};
    if (formValue.type && formValue.type.length>0) {
      found = JSON.stringify(obj).includes(formValue.type);
    }
    if (formValue.text && formValue.text.trim().length>0) {
      found = JSON.stringify(obj).toLowerCase().includes(formValue.text.toLowerCase());
    }
    return found;
  }

  doSearch() {
    if (this.filterApplied()) {
      this.expandAll(false);
      let results: TimelineDateInterface[] = this.timeline.filter((_timelineDate) => {
        return _timelineDate.collectionId===this.currentCollection.id && this.matchesSearch(_timelineDate);
      });
      this.searchTimeline = results;
    } else {
      this.searchTimeline = this.timeline.filter((_timelineDate) => {
        return _timelineDate.collectionId===this.currentCollection.id;
      });
    }
  }

  updateCollection() {
    const selectedCollectionId: string = this.collectionForm.get('collectionId')?.value;
    if (selectedCollectionId) {
      localStorage.setItem(this.timelineService.storeKeyTimelineCurrentCollectionId, selectedCollectionId);

      const selectedCollection: TimelineCollectionInterface | undefined = this.collections.find((_collection) => _collection.id===selectedCollectionId);
      if (selectedCollection) this.currentCollection = selectedCollection; 

      this.searchTimeline = this.timeline.filter((_timelineDate) => {
        return _timelineDate.collectionId===this.currentCollection.id;
      });

      this.timelineService.timelineBgColor$.next(selectedCollection?.color || 'white');
    }
  }

  editCollection(editCollectionTemplate: any) {
    this.currentEditCollection = {
      id: this.currentCollection.id,
      name: this.currentCollection.name,
      color: this.currentCollection.color || 'white'
    }
    this.collectionEditForm = new FormGroup({
      id: new FormControl(this.currentEditCollection.id, Validators.required),
      name: new FormControl(this.currentEditCollection.name, Validators.required),
      color: new FormControl(this.currentEditCollection.color, Validators.required)
    });
    this.modalService.open(editCollectionTemplate, {
      centered: true
      // backdrop: 'static'
    });
  }

  newCollection(newCollectionTemplate: any) {
    this.currentEditCollection = {
      id: this.timelineService.getNewId(),
      name: '',
      color: 'white',
    }
    this.collectionEditForm = new FormGroup({
      id: new FormControl(this.currentEditCollection.id, Validators.required),
      name: new FormControl(this.currentEditCollection.name, Validators.required),
      color: new FormControl(this.currentEditCollection.color, Validators.required)
    });
    this.modalService.open(newCollectionTemplate, {
      centered: true
      // backdrop: 'static'
    });
  }

  removeCollection() {
    this.swalService.openSwal({
      icon: SwalTypesEnum.WARNING,
      title: 'Atenció',
      text: 'S\'eliminarà la col·lecció sel·leccionada i toi el seu contingut. Continuar?',
      showCancelButton: true,
      confirmButtonText: 'Acceptar',
      cancelButtonText: 'Cancel·lar',
      reverseButtons: true
    }).then((_res) => {
      if (_res.isConfirmed) {
        this.expandedDateItems = [];
        this.expandedItems = [];

        this.timeline = this.timeline.filter((_timelineDate) => {
          return _timelineDate.collectionId!==this.currentCollection.id;
        });

        this.collections = this.collections.filter((_collection) => _collection.id!==this.currentCollection.id );
        let timelineFormCollections: { text: string, value: string }[] = this.collections.map((_collection) => {
          return { value: _collection.id, text: _collection.name };
        });
        this.timelineFormCollections = timelineFormCollections;
        this.currentCollection = this.collections[0];
        this.collectionForm.patchValue({'collectionId': this.currentCollection.id});

        this.timelineService.saveCollections(this.collections);
        this.timelineService.saveTimeline(this.timeline);

        this.toastr.success('Col·lecció esborrada correctament!');
      }
    })
  }

  saveCollection() {
    const collectionForm: TimelineCollectionInterface = this.collectionEditForm.getRawValue() as TimelineCollectionInterface;
    if (this.currentEditCollection) {
      if (this.currentEditCollection.id===this.currentCollection.id) {
        this.currentEditCollection.name = collectionForm.name;
        this.currentCollection.name = collectionForm.name;
        this.currentCollection.color = collectionForm.color;
        this.collections = this.collections.map((_collection) => {
          if (this.currentCollection.id===_collection.id) {
            _collection.name = collectionForm.name;
          }
          return _collection;
        });
        this.currentEditCollection = undefined;
        this.timelineService.saveCollections(this.collections);
        this.toastr.success('Col·lecció desada correctament!');
      } else {
        const newCollection: TimelineCollectionInterface = {
          id: this.timelineService.getNewId(),
          name: collectionForm.name,
          color: collectionForm.color
        };
        this.collections.push(newCollection);
        this.currentCollection = newCollection;
        this.currentEditCollection = undefined;
        this.timelineService.saveCollections(this.collections);
        this.toastr.success('Col·lecció creada correctament!');
      }
      this.collectionForm.patchValue({'collectionId': this.currentCollection.id});
    }
  }

  getCollectionTimelineItems(collectionId: string): TimelineItemInterface[] {
    let items: TimelineItemInterface[] = [];
    const timelineDates: TimelineDateInterface[] = this.getCollectionTimelineDates(collectionId);
    timelineDates.forEach((_timelineDate) => items = items.concat(_timelineDate.items) );
    return items;
  }

  private getCollectionTimelineDates(collectionId: string): TimelineDateInterface[] {
    return this.timeline.filter((_timelineDate) => _timelineDate.collectionId === collectionId );
  }

  ngOnInit(): void {

    this.isMobile = this.deviceDetector.isMobile();

    // Current collection from storage
    let currentCollectionId: string | null = localStorage.getItem(this.timelineService.storeKeyTimelineCurrentCollectionId);
    let currentCollection: TimelineCollectionInterface | undefined;
    if (currentCollectionId==null) {
      currentCollection = this.timelineService.collections$.getValue()[0];
      localStorage.setItem(this.timelineService.storeKeyTimelineCurrentCollectionId, currentCollection.id);
    } else {
      currentCollection = this.timelineService.collections$.getValue().find((_collection) => { 
        return _collection.id===currentCollectionId;
      })
      if (!currentCollection) { 
        currentCollection = this.timelineService.collections$.getValue()[0]; 
      }
      localStorage.setItem(this.timelineService.storeKeyTimelineCurrentCollectionId, currentCollection.id);
    }

    this.currentCollection = currentCollection;
    currentCollectionId = currentCollection.id;
    this.timelineService.timelineBgColor$.next(this.currentCollection.color || 'white');

    // Alignment from storage
    const alignmentStored: string | null = localStorage.getItem(this.alignmentStoreKey);
    if (alignmentStored && !this.isMobile) {
      this.alignment = (alignmentStored === TimelineAlignEnum.CENTER) ? TimelineAlignEnum.CENTER : TimelineAlignEnum.LEFT;
    } else {
      this.alignment = TimelineAlignEnum.LEFT;
    }

    // Setup timeline item types
    Object.keys(TimelineItemTypeEnum).forEach((_key) => {
      const labelObj: {key: string, text: string} | undefined = TIMELINE_ITEM_TYPES.find((_type) => {
        return _type.key===_key;
      });
      this.timelineFormItemTypes.push({
        value: _key,
        text: labelObj ? labelObj.text : _key
      });
    });

    this.timelineFormItemTypes.sort((a, b) => {
      return a.text<b.text ? -1 : 1;
    });

    // Timeline collections subscription
    this.timelineService.collections$.subscribe((_collections) => {
      this.collections = _collections;
      console.log('Collections', this.collections);

      let timelineFormCollections: { text: string, value: string }[] = this.collections.map((_collection) => {
        return { value: _collection.id, text: _collection.name };
      });
      this.timelineFormCollections = timelineFormCollections;
    });
    
    // Timeline dates subscription
    this.timelineService.timelineDates$.subscribe((_timeline) => {
      this.timeline = _timeline;
      this.searchTimeline = _timeline.filter((_timelineDate) => {
        return _timelineDate.collectionId===this.currentCollection.id;
      });
      this.expandAll(true);
      console.log('Timeline', this.timeline);
    });

    this.itemForm = new FormGroup({
      date: new FormControl(new Date(), Validators.required),
      hour: new FormControl(''),
      title: new FormControl('', Validators.required),
      text: new FormControl('', Validators.required),
      type: new FormControl('', Validators.required),
      links: new FormControl(''),
      iconClass: new FormControl('')
    });

    this.searchForm = new FormGroup({
      type: new FormControl(),
      text: new FormControl()
    });

    this.collectionForm = new FormGroup({
      collectionId: new FormControl(currentCollectionId, Validators.required)
    });

    this.collectionEditForm = new FormGroup({
      id: new FormControl(this.currentCollection.id, Validators.required),
      name: new FormControl(this.currentCollection.name, Validators.required)
    });
  }

}
