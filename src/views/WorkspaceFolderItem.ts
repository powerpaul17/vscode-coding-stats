import {TreeItem, TreeItemCollapsibleState} from 'vscode';
import {WorkspaceFolderData} from '../DataManager';
import {Utils} from '../Utils';


export class WorkspaceFolderItem extends TreeItem {

  public readonly folderPath: string;
  public readonly workspaceFolderData: WorkspaceFolderData;

  constructor(folderPath: string, data: WorkspaceFolderData, options: { collapsibleState?: TreeItemCollapsibleState }) {
    const label = folderPath.split('/').pop() || '(no folder)';

    super(label, options.collapsibleState);

    super.id = 'folder::' + folderPath;
    this.folderPath = folderPath;

    this.workspaceFolderData = data;

    super.description = `${Utils.getTimeString(data.sum.readingTime + data.sum.codingTime)} • ${folderPath}`;
    // super.tooltip = options.tooltip;
  }

}
