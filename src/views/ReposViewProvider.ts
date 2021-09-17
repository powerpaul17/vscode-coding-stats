import {EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri} from 'vscode';
import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';
import {DataManager, DataValueRecord} from '../DataManager';
import {Utils} from '../Utils';

momentDurationFormatSetup(moment);
export class ReposViewProvider implements TreeDataProvider<RepoItem> {

  private _onDidChangeTreeData = new EventEmitter<RepoItem|void>();

  constructor(private dataManager: DataManager) {
    dataManager.subscribe(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public onDidChangeTreeData = this._onDidChangeTreeData.event;

  public getTreeItem(repoItem: RepoItem): TreeItem {
    return repoItem;
  }

  public getChildren(repoItem?: RepoItem): Array<RepoItem> {
    const data = this.dataManager.getData();
    if(!data) return [];

    if(repoItem) {
      if(repoItem instanceof RepoItem) {
        const repoData = data.byRepo.get(repoItem.id);
        if(!repoData) return [];

        return Array.from(repoData.byFile.entries())
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
      return Array.from(data.byRepo.entries())
        .sort(([k1, v1], [k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
        .map(([key, value]) => new RepoItem({
          id: key,
          label: key.split('/').pop() || '(no repo)',
          description: `${Utils.getTimeString(value.sum.readingTime + value.sum.codingTime)} • ${key}`,
          tooltip: key,
          collapsibleState: TreeItemCollapsibleState.Collapsed
        }));
    }
  }

}

export class RepoItem extends TreeItem {

  constructor(options: { id: string, label: string, description: string, tooltip?: string, collapsibleState?: TreeItemCollapsibleState }) {
    super(options.label);

    super.id = options.id;

    super.description = options.description;
    super.tooltip = options.tooltip;

    super.collapsibleState = options.collapsibleState;
  }

}
