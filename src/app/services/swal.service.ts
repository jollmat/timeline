import {Injectable} from "@angular/core";
import swal, {SweetAlertOptions, SweetAlertResult} from 'sweetalert2';


@Injectable({
  providedIn: 'root'
})
export class SwalService {

  private staticParams: SweetAlertOptions = {
    buttonsStyling: false,
    customClass: {
      cancelButton: 'btn btn-sm cancel mx-1',
      confirmButton: 'btn btn-sm btn-primary mx-1'
    }
  };

  openSwal(params: SweetAlertOptions): Promise<SweetAlertResult> {
    const _params = Object.assign({}, params);
    return swal.fire(Object.assign({}, this.staticParams, _params));
  }

}
