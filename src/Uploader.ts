import {TextDocument} from 'vscode';
import {TrackingData} from './EventHandler';

export class Uploader {

  public submitData(type: UploadDataType, document: TextDocument, trackingData: TrackingData): void {

  }

}

export enum UploadDataType {
  FILE = 0
}
