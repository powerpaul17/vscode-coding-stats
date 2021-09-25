import {ThemeIcon, TreeItem, TreeItemCollapsibleState} from 'vscode';

import {BranchData} from '../DataManager';
import {Utils} from '../Utils';

export class BranchItem extends TreeItem {

  public readonly id: string;
  public readonly branchName: string;
  public readonly repoName: string;
  public readonly branchData: BranchData;

  constructor(branchName: string, data: BranchData, options: { repoName: string, collapsibleState?: TreeItemCollapsibleState }) {
    const label = branchName || '(no branch name)';

    super(label, options.collapsibleState);

    this.id = 'branch::' + branchName + '::' + options.repoName;
    this.branchName = branchName;
    this.repoName = options.repoName;

    this.branchData = data;

    super.description = `${Utils.getTimeString(data.sum.readingTime + data.sum.codingTime)} • ${branchName}`;
    // super.tooltip = options.tooltip;

    super.iconPath = new ThemeIcon('git-branch');
  }

}
