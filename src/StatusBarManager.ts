import {StatusBarItem, window} from 'vscode';
import {Data, DataManager} from './DataManager';
import {SettingsManager} from './SettingsManager';
import {Uploader, UploaderStatus} from './Uploader';
import {Utils} from './Utils';

export class StatusBarManager {

  private statusBarItem: StatusBarItem|null = null;
  private uploaderStatus: UploaderStatus|null = null;

  private data: Data|null = null;

  constructor(
    private settingsManager: SettingsManager,
    uploader: Uploader,
    dataManager: DataManager
  ) {
    settingsManager.subscribe(this.onConfigurationUpdate.bind(this));
    this.onConfigurationUpdate();

    uploader.subscribe(this.uploaderStatusChanged.bind(this));

    dataManager.subscribe(this.dataChanged.bind(this));
  }

  private uploaderStatusChanged(status: UploaderStatus): void {
    this.uploaderStatus = status;
    this.update();
  }

  private dataChanged(data: Data|null): void {
    this.data = data;
    this.update();
  }

  private onConfigurationUpdate(): void {
    const showStatus = this.settingsManager.getConfiguration().showStatus;
    if(showStatus && !this.statusBarItem) {
      this.statusBarItem = window.createStatusBarItem();
      this.statusBarItem.command = 'codingStats.showReport';
      this.update();
    } else if(!showStatus && this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = null;
    }
  }

  private update(): void {
    this.updateText();
    this.updateTooltip();
  }

  private updateText(): void {
    if(!this.statusBarItem) return;

    this.statusBarItem.text = this.getStatusBarText();
    this.statusBarItem.show();
  }

  private updateTooltip(): void {
    if(!this.statusBarItem) return;

    this.statusBarItem.tooltip = this.getStatusBarTooltip();
    this.statusBarItem.show();
  }

  private getStatusBarText(): string {
    return [
      '$(dashboard)',
      `${this.data ? Utils.getTimeString(this.data.sum.codingTime + this.data.sum.readingTime) : ''}`,
      this.getUploaderStatusIcon(),
      `${this.uploaderStatus?.pendingItems ? `${this.uploaderStatus.pendingItems}` : ''}`
    ].join(' ');
  }

  private getUploaderStatusIcon(): string {
    if(this.uploaderStatus?.isUploading) {
      return '$(sync~spin)';
    } else if(this.uploaderStatus?.noConnection || !this.uploaderStatus?.enabled) {
      return '$(sync-ignored)';
    } else {
      return '$(sync)';
    }
  }

  private getStatusBarTooltip(): string {
    return [
      'Coding Stats',
      `${this.data ? Utils.getTimeString(this.data.sum.codingTime) + ' \u2022 ' + Utils.getTimeString(this.data.sum.readingTime) : ''}`,
      `${this.data ? this.data.sum.keystrokes + ' keystrokes' : ''}`,
      `${this.data ? 'Lines: ' + this.data.sum.linesAdded + ' added \u2022 ' + this.data.sum.linesDeleted + ' deleted' : ''}`,
      `${this.data ? 'Chars: ' + this.data.sum.charsAdded + ' added \u2022 ' + this.data.sum.charsDeleted + ' deleted' : ''}`
    ].join('\n');
  }

}
