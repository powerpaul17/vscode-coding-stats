import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';

momentDurationFormatSetup(moment);

export class Utils {

  public static getTimeString(time: number): string {
    if(time >= 60 * 1000) {
      return moment.duration(time, 'milliseconds').format('h [h] mm [min]');
    } else {
      return moment.duration(time, 'milliseconds').format('s [s]');
    }
  }

}
