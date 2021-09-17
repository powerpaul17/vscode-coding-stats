import {EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri} from 'vscode';
import {DataManager} from '../DataManager';
import {Utils} from '../Utils';

export class WorkspaceFoldersViewProvider implements TreeDataProvider<WorkspaceFolderItem> {

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

  public getChildren(workspaceFolderItem?: WorkspaceFolderItem): Array<WorkspaceFolderItem> {
    const data = this.dataManager.getData();
    if(!data) return [];

    if(workspaceFolderItem) {
      if(workspaceFolderItem instanceof WorkspaceFolderItem) {
        const workspaceData = data.byWorkspaceFolder.get(workspaceFolderItem.id);
        if(!workspaceData) return [];

        return Array.from(workspaceData.byFile.entries())
          .sort(([k1, v1], [k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return {
              id: key,
              label: key.split('/').pop() || '(no file)',
              description: `${Utils.getTimeString(value.sum.readingTime + value.sum.codingTime)} • ${key}`,
              tooltip: key,
              resourceUri: Uri.file(key)
            };
          });
      }
      return [];
    } else {
      return Array.from(data.byWorkspaceFolder.entries())
        .sort(([k1, v1], [k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
        .map(([key, value]) => new WorkspaceFolderItem({
          id: key,
          label: key.split('/').pop() || '(no repo)',
          description: `${Utils.getTimeString(value.sum.readingTime + value.sum.codingTime)} • ${key}`,
          tooltip: key,
          collapsibleState: TreeItemCollapsibleState.Collapsed
        }));
    }
  }

}

export class WorkspaceFolderItem extends TreeItem {

  constructor(options: { id: string, label: string, description: string, tooltip?: string, collapsibleState?: TreeItemCollapsibleState }) {
    super(options.label);

    super.id = options.id;

    super.description = options.description;
    super.tooltip = options.tooltip;

    super.collapsibleState = options.collapsibleState;
  }

}
