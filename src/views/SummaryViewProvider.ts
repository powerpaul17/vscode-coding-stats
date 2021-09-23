import {EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState} from 'vscode';
import {DataManager} from '../DataManager';
import {Utils} from '../Utils';

export class SummaryViewProvider implements TreeDataProvider<SummaryItem> {

  private _onDidChangeTreeData = new EventEmitter<SummaryItem|void>();

  constructor(private dataManager: DataManager) {
    dataManager.subscribe(() => {
      this._onDidChangeTreeData.fire();
    });
  }

  public onDidChangeTreeData = this._onDidChangeTreeData.event;

  public getTreeItem(fileItem: SummaryItem): TreeItem {
    return fileItem;
  }

  public getChildren(fileItem?: SummaryItem): Array<SummaryItem> {
    const data = this.dataManager.getData();
    if(!data) return [];

    if(fileItem) {
      if(fileItem.id === 'computers') {
        return [
          ...Array.from(data.byComputerId.entries())
            .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
            .map(([name, value]) => {
              return {
                label: name,
                description: `${Utils.getTimeString(value.sum.readingTime + value.sum.codingTime)}`
              };
            })
        ];
      } else if(fileItem.id === 'languages') {
        return [
          ...Array.from(data.byLanguageId.entries())
            .sort(([_k1, v1], [_k2, v2]) => v2.sum.readingTime + v2.sum.codingTime - v1.sum.readingTime - v1.sum.codingTime)
            .map(([name, value]) => {
              return {
                label: name,
                description: `${Utils.getTimeString(value.sum.readingTime + value.sum.codingTime)}`
              };
            })
        ];
      }
      return [];
    } else {
      const max = Math.max(...data.hourMap.map(v => v.readingTime + v.codingTime));
      return [
        {
          label: 'Total time',
          description: Utils.getTimeString(data.sum.readingTime + data.sum.codingTime),
          iconPath: new ThemeIcon('clock')
        },
        // {},
        {
          label: 'Total reading time',
          description: Utils.getTimeString(data.sum.readingTime),
          iconPath: new ThemeIcon('book')
        },
        {
          label: 'Total coding time',
          description: Utils.getTimeString(data.sum.codingTime),
          iconPath: new ThemeIcon('file-code')
        },
        // {},
        {
          label: 'Lines',
          description: `+ ${data.sum.linesAdded} • - ${data.sum.linesDeleted} • ∑ ${data.sum.linesAdded - data.sum.linesDeleted}`,
          iconPath: new ThemeIcon('selection')
        },
        {
          label: 'Chars',
          description: `+ ${data.sum.charsAdded} • - ${data.sum.charsDeleted} • ∑ ${data.sum.charsAdded - data.sum.charsDeleted}`,
          iconPath: new ThemeIcon('symbol-key')
        },
        // {},
        {
          label: 'Keystrokes',
          description: `${data.sum.keystrokes}`,
          iconPath: new ThemeIcon('keyboard')
        },
        // {},
        {
          label: 'Computers',
          id: 'computers',
          collapsibleState: TreeItemCollapsibleState.Collapsed,
          iconPath: new ThemeIcon('device-desktop')
        },
        {
          label: 'Languages',
          id: 'languages',
          collapsibleState: TreeItemCollapsibleState.Collapsed,
          iconPath: new ThemeIcon('list-unordered')
        },
        {
          label: data.hourMap.reduce((s, v) => {
            const charNumber = 2581 + Math.round((v.readingTime + v.codingTime) / max * 8);
            s += String.fromCharCode(parseInt(charNumber.toString(), 16));
            return s;
          }, '')
        }
      ];
    }
  }

}

export class SummaryItem extends TreeItem {

  constructor(label: string) {
    super(label);
  }

}
