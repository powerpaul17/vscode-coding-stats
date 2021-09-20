import {IncomingMessage, request} from 'http';
import path from 'path';
import {Memento} from 'vscode';
import {DocumentData, TrackingData} from './EventHandler';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';

export class Uploader {

  private uploadQueue: Array<UploadItem> = [];

  private enabled = false;
  private isUploading = false;
  private noConnection = false;

  private subscriptions: Array<StatusCallback> = [];

  private globalState: Memento|null = null;

  constructor(private settingsManager: SettingsManager) {}

  public subscribe(callback: StatusCallback): void {
    this.subscriptions.push(callback);
  }

  public init(globalState: Memento): void {
    this.globalState = globalState;
    this.loadQueue();
  }

  public start(): void {
    this.enabled = true;
    this.publishStatus();

    this.tryUploadingNextItem();
  }

  public stop(): void {
    this.enabled = false;
    this.publishStatus();
  }

  public submitData(type: UploadDataType, documentData: DocumentData, trackingData: TrackingData): void {
    const uploadItem = this.prepareUploadItem(type, documentData, trackingData);
    this.addItemToQueue(uploadItem);
    this.tryUploadingNextItem();
  }

  private prepareUploadItem(type: UploadDataType, documentData: DocumentData, trackingData: TrackingData): UploadItem {
    return {
      type: type,

      fileName: documentData.fileName,

      timestamp: trackingData.openTimestamp,

      readingTime: trackingData.readingTime,
      codingTime: trackingData.codingTime,

      lineCount: documentData.lineCount,
      charCount: documentData.charCount,

      keystrokes: trackingData.keystrokes,

      charsAdded: trackingData.charsAdded,
      charsDeleted: trackingData.charsDeleted,
      linesAdded: trackingData.linesAdded,
      linesDeleted: trackingData.linesDeleted,

      versionControlSystemRepository: documentData.repositoryName ?? '',
      versionControlSystemBranch: documentData.branchName ?? '',

      computerId: this.settingsManager.getConfiguration().computerId,
      workspaceFolder: documentData.workspaceFolder,
      languageId: documentData.languageId
    };
  }

  private addItemToQueue(item: UploadItem, front = false): void {
    if(front) {
      this.uploadQueue.unshift(item);
    } else {
      this.uploadQueue.push(item);
    }
    this.publishStatus();
    this.saveQueue();
  }

  private publishStatus(): void {
    const status: UploaderStatus = {
      enabled: this.enabled,
      pendingItems: this.uploadQueue.length,
      isUploading: this.isUploading,
      noConnection: this.noConnection
    };
    this.subscriptions.forEach(callback => callback(status));
  }

  private tryUploadingNextItem(): void {
    if(this.isUploading) return;
    this.uploadNextItem();
  }

  private uploadNextItem(): void {
    const uploadItem = this.uploadQueue.shift();
    if(uploadItem && this.enabled) {
      this.isUploading = true;
      this.uploadItem(uploadItem);
    } else {
      this.isUploading = false;
    }
    this.publishStatus();
  }

  private uploadItem(uploadItem: UploadItem): void {
    const uploadUrl = path.join(this.settingsManager.getCompleteServerUrl(), 'api/v1/upload');

    const postData = JSON.stringify(uploadItem);

    const req = request(
      uploadUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }
    );

    req.on('response', this.onUploadResponse.bind(this));
    req.on('error', (err) => {
      this.addItemToQueue(uploadItem, true);

      this.isUploading = false;

      if(err.code === 'ECONNREFUSED') {
        Logger.warn(err);

        this.noConnection = true;
        this.publishStatus();

        this.stop();

        setTimeout(() => {
          this.noConnection = false;
          this.start();
        }, 10000);
      } else {
        Logger.error(err);
      }
    });

    req.write(postData);
    req.end();
  }

  private onUploadResponse(response: IncomingMessage): void {
    response.on('data', (data) => {
      Logger.debug('data', data);
    });
    response.on('end', () => {
      Logger.debug('end', response);
      this.isUploading = false;
      this.uploadNextItem();
    });
  }

  private async saveQueue(): Promise<void> {
    Logger.info('save uploader queue...');
    await this.globalState?.update('uploadQueue', this.uploadQueue);
  }

  private loadQueue(): void {
    const queue = this.globalState?.get<Array<UploadItem>>('uploadQueue');
    if(queue) {
      Logger.info('load uploader queue...');
      this.uploadQueue = queue;
      this.publishStatus();
    }
  }

}

export enum UploadDataType {
  FILE = 0
}

type UploadItem = {
  type: UploadDataType;

  timestamp: number;

  readingTime: number;
  codingTime: number;

  languageId: string;

  fileName: string;

  workspaceFolder: string;

  computerId: string;

  versionControlSystemRepository: string;
  versionControlSystemBranch: string;

  lineCount: number;
  charCount: number;

  keystrokes: number;

  linesAdded: number;
  linesDeleted: number;
  charsAdded: number;
  charsDeleted: number;
}

type StatusCallback = (status: UploaderStatus) => void;

export type UploaderStatus = {
  enabled: boolean;
  pendingItems: number;
  isUploading: boolean;
  noConnection: boolean;
}
