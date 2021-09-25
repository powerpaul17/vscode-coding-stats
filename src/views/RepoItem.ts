import {TreeItem, TreeItemCollapsibleState} from 'vscode';

import {RepoData} from '../DataManager';
import {Utils} from '../Utils';

export class RepoItem extends TreeItem {

  public readonly id: string;
  public readonly repoName: string;
  public readonly repoData: RepoData;

  constructor(repoName: string, data: RepoData, options: { collapsibleState?: TreeItemCollapsibleState }) {
    const label = repoName.split('/').pop() || '(no repo)';

    super(label, options.collapsibleState);

    this.id = 'repo::' + repoName;
    this.repoName = repoName;

    this.repoData = data;

    super.description = `${Utils.getTimeString(data.sum.readingTime + data.sum.codingTime)} • ${repoName}`;
    // super.tooltip = options.tooltip;
  }

}
