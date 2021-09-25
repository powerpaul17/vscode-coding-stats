import {ThemeIcon, TreeItem, TreeItemCollapsibleState} from 'vscode';

import {ComputerData} from '../DataManager';
import {Utils} from '../Utils';

export class ComputerItem extends TreeItem {

  public readonly id: string;
  public readonly computerId: string;
  public readonly computerData: ComputerData;

  constructor(computerId: string, data: ComputerData, options: { collapsibleState?: TreeItemCollapsibleState }) {
    super(computerId, options.collapsibleState);

    this.id = 'computer::' + computerId;
    this.computerId = computerId;

    this.computerData = data;

    super.description = `${Utils.getTimeString(data.sum.readingTime + data.sum.codingTime)}`;
    // super.tooltip = options.tooltip;

    this.iconPath = new ThemeIcon('device-desktop');
  }

}
