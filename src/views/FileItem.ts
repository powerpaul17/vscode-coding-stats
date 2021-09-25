import {TreeItem, Uri} from 'vscode';

import {SumAndHourMap} from '../DataManager';
import {Utils} from '../Utils';

export class FileItem extends TreeItem {

  public readonly id: string;

  constructor(filePath: string, data: SumAndHourMap, options: { resourceUri?: Uri, idSuffix?: string }) {
    const label = filePath.split('/').pop() || '(no file)';

    super(label);

    this.id = ['file', filePath, options.idSuffix].join('::');

    super.description = `${Utils.getTimeString(data.sum.readingTime + data.sum.codingTime)} • ${filePath}`;
    // super.tooltip = options.tooltip;

    super.resourceUri = options.resourceUri;
  }

}
