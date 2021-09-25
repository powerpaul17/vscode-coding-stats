import {EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri} from 'vscode';
import {DataManager} from '../DataManager';
import {FileItem} from './FileItem';
import {ComputerItem} from './ComputerItem';
import {RepoItem} from './RepoItem';
import {BranchItem} from './BranchItem';

export class ReposViewProvider implements TreeDataProvider<RepoItem|BranchItem|FileItem> {

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

  public getChildren(item?: ComputerItem|RepoItem|BranchItem): Array<ComputerItem|RepoItem|BranchItem|FileItem> {
    const data = this.dataManager.getData();
    if(!data) return [];

    if(item) {
      if(item instanceof ComputerItem) {
        return Array.from(item.computerData.byRepo.entries())
          .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return new RepoItem(key, value, { collapsibleState: TreeItemCollapsibleState.Collapsed });
          });
      } else if(item instanceof RepoItem) {
        return Array.from(item.repoData.byBranch.entries())
          .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return new BranchItem(key, value, {
              repoName: item.repoName,
              collapsibleState: TreeItemCollapsibleState.Collapsed
            });
          });
      } else if(item instanceof BranchItem) {
        return Array.from(item.branchData.byFile.entries())
          .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
          .map(([key, value]) => {
            return new FileItem(key, value, {
              resourceUri: Uri.file(key),
              idSuffix: item.branchName + '::' + item.repoName
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
