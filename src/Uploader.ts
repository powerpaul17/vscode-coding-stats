import {IncomingMessage, request} from 'http';
import path = require('path');
import {Memento, TextDocument, workspace} from 'vscode';
import {TrackingData} from './EventHandler';
import {GitHelper} from './GitHelper';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';

export class Uploader {

  private gitHelper: GitHelper;

  private uploadQueue: Array<UploadItem> = [];

  private enabled = false;
  private isUploading = false;
  private noConnection = false;

  private globalState: Memento|null = null;

  constructor(private settingsManager: SettingsManager) {
    this.gitHelper = new GitHelper();
  }

  public init(globalState: Memento): void {
    this.globalState = globalState;
    this.loadQueue();
  }

  public start(): void {
    this.enabled = true;
    this.tryUploadingNextItem();
  }

  public stop(): void {
    this.enabled = false;
  }

  public submitData(type: UploadDataType, document: TextDocument, trackingData: TrackingData): void {
    const uploadItem = this.prepareUploadItem(type, document, trackingData);
    this.addItemToQueue(uploadItem);
  }

  private prepareUploadItem(type: UploadDataType, document: TextDocument, trackingData: TrackingData): UploadItem {
    const gitInfo = this.gitHelper.getGitInfo(document.fileName);
    return {
      type: type,

      fileName: workspace.asRelativePath(document.uri),

      timestamp: trackingData.openTimestamp,

      readingTime: trackingData.readingTime,
      codingTime: trackingData.codingTime,

      lineCount: document.lineCount,
      charCount: document.getText().length,

      keystrokes: trackingData.keystrokes,

      charsAdded: trackingData.charsAdded,
      charsDeleted: trackingData.charsDeleted,
      linesAdded: trackingData.linesAdded,
      linesDeleted: trackingData.linesDeleted,

      versionControlSystemRepository: gitInfo?.repo ?? '',
      versionControlSystemBranch: gitInfo?.branch ?? '',

      computerId: this.settingsManager.getConfiguration().computerId,
      workspaceFolder: this.getWorkspaceFolderOfDocument(document) ?? workspace.workspaceFolders?.[0]?.name ?? 'unknown',
      languageId: this.getLanguageOfDocument(document)
    };
  }

  private addItemToQueue(item: UploadItem, front = false): void {
    if(front) {
      this.uploadQueue.unshift(item);
    } else {
      this.uploadQueue.push(item);
    }
    this.saveQueue();
  }

  private getWorkspaceFolderOfDocument(document: TextDocument): string|void {
    const uri = document.uri;
    if(uri.scheme !== 'file') return;

    const folder = workspace.getWorkspaceFolder(uri);
    if(!folder) return;

    return folder.uri.fsPath;
  }

  private getLanguageOfDocument(document: TextDocument): string {
    switch(document.uri.scheme) {
      case 'file':
      default:
        return document.languageId;
    }
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
