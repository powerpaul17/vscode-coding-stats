import {EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri} from 'vscode';
import {DataManager} from '../DataManager';
import {ComputerItem} from './ComputerItem';
import {FileItem} from './FileItem';
import {WorkspaceFolderItem} from './WorkspaceFolderItem';

export class WorkspaceFoldersViewProvider implements TreeDataProvider<WorkspaceFolderItem|FileItem> {

  private _onDidChangeTreeData = new EventEmitter<WorkspaceFolderItem|void>();

  constructor(private dataManager: DataManager) {
    dataManager.subscribe(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public onDidChangeTreeData = this._onDidChangeTreeData.event;

  public getTreeItem(workspaceFolderItem: WorkspaceFolderItem): TreeItem {
    return workspaceFolderItem;
  }

  public getChildren(item?: ComputerItem|WorkspaceFolderItem): Array<ComputerItem|WorkspaceFolderItem|FileItem> {
    const data = this.dataManager.getData();
    if(!data) return [];

    if(item) {
      if(item instanceof ComputerItem) {
        return Array.from(item.computerData.byWorkspaceFolder.entries())
          .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return new WorkspaceFolderItem(key, value, {
              collapsibleState: TreeItemCollapsibleState.Collapsed
            });
          });
      } else if(item instanceof WorkspaceFolderItem) {
        return Array.from(item.workspaceFolderData.byFile.entries())
          .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return new FileItem(key, value, {
              resourceUri: Uri.file(key),
              idSuffix: item.folderPath
            });
          });
      }
      return [];
    } else {
      return Array.from(data.byComputerId.entries())
        .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
        .map(([key, value]) => new ComputerItem(key, value, { collapsibleState: TreeItemCollapsibleState.Collapsed }));
    }
  }

}
