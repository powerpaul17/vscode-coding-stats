import moment, {MomentInput} from 'moment';

import {SettingsManager} from './SettingsManager';
import {ApiHelper} from './ApiHelper';

export class DataManager {

  private apiHelper: ApiHelper;

  private subscriptions: Array<Callback> = [];

  private data: Data|null = null;

  constructor(settingsManager: SettingsManager) {
    this.apiHelper = new ApiHelper(settingsManager);
    setInterval(() => {
      void this.updateData();
    }, 10000);
    void this.updateData();
  }

  public subscribe(callback: Callback): void {
    this.subscriptions.push(callback);
    callback(this.data);
  }

  public getData(): Data|null {
    return this.data;
  }

  private publish(): void {
    this.subscriptions.forEach(callback => callback(this.data));
  }

  private async updateData(): Promise<void> {
    this.data = await this.getDataForToday();
    this.publish();
  }

  private async getDataForToday(): Promise<Data|null> {
    const todayDate = moment().hours(0).minutes(0).seconds(0);

    try {
      const data = await this.apiHelper.getData(todayDate.unix() * 1000, todayDate.add(1, 'day').unix() * 1000);
      return this.analyzeReponseData(data);
    } catch(error) {
      // TODO
    }

    return null;
  }

  private analyzeReponseData(data: ResponseData): Data {
    const sum = this.getEmptyItem();
    const hourMap = this.getEmptyHourArray();

    const byComputerId: Map<string, ComputerData> = new Map();
    const byLanguageId: Map<string, LanguageData> = new Map();

    for(const dataItem of data) {
      const hour = moment(dataItem.timestamp).get('hour');
      const hourItem = hourMap[hour];

      // TODO ensure hour items exist or get added
      if(hourItem) this.addDataItem(hourItem, dataItem);
      this.addDataItem(sum, dataItem);

      this.setMapValue(byComputerId, dataItem.computerId, hour, dataItem, (map) => {
        const byWorkspaceFolderMap: Map<string, WorkspaceFolderData> = map.byWorkspaceFolder ?? new Map();
        if(!map.byWorkspaceFolder) map.byWorkspaceFolder = byWorkspaceFolderMap;

        this.setMapValue(byWorkspaceFolderMap, dataItem.workspaceFolder ?? '', hour, dataItem, (workspaceFolderMap) => {
          this.workspaceCallback(workspaceFolderMap, hour, dataItem);
        });

        const byRepoMap: Map<string, RepoData> = map.byRepo ?? new Map();
        if(!map.byRepo) map.byRepo = byRepoMap;

        this.setMapValue(byRepoMap, dataItem.versionControlSystemRepository, hour, dataItem, (repoMap) => {
          this.repoCallback(repoMap, hour, dataItem);
        });
      });

      this.setMapValue(byLanguageId, dataItem.languageId, hour, dataItem);
    }

    return {
      sum,
      hourMap: hourMap,
      byComputerId,
      byLanguageId
    };
  }

  private workspaceCallback(map: WorkspaceFolderData, hour: number, dataItem: ResponseDataItem): void {
    const byFileMap: Map<string, SumAndHourMap> = map.byFile ?? new Map();
    if(!map.byFile) map.byFile = byFileMap;
    this.setMapValue(byFileMap, dataItem.fileName, hour, dataItem);
  }

  private repoCallback(map: RepoData, hour: number, dataItem: ResponseDataItem): void {
    const byBranchMap: Map<string, BranchData> = map.byBranch ?? new Map();
    if(!map.byBranch) map.byBranch = byBranchMap;
    this.setMapValue(byBranchMap, dataItem.versionControlSystemBranch, hour, dataItem, (branchMap) => {
      const byFileMap: Map<string, SumAndHourMap> = branchMap.byFile ?? new Map();
      if(!branchMap.byFile) branchMap.byFile = byFileMap;
      this.setMapValue(byFileMap, dataItem.fileName, hour, dataItem);
    });
  }

  private setMapValue<T extends SumAndHourMap>(map: Map<string, T>, key: string, hour: number, dataItem: ResponseDataItem, callback?: (map: T) => void): void {
    const sumAndHourMap = this.getOrCreateSumAndHourMap(map, key);
    this.setHourItemIfPossible(sumAndHourMap.hourMap, hour, dataItem);
    this.addDataItem(sumAndHourMap.sum, dataItem);
    if(callback) callback(sumAndHourMap);
  }

  private getOrCreateSumAndHourMap<T extends SumAndHourMap>(map: Map<string, T>, key: string): T {
    const sumAndHourMap = map.get(key) ?? {
      sum: this.getEmptyItem(),
      hourMap: this.getEmptyHourArray()
    };
    if(!map.has(key)) map.set(key, sumAndHourMap);

    return sumAndHourMap;
  }

  private setHourItemIfPossible(hourMap: HourMap, hour: number, dataItem: ResponseDataItem): void {
    const hourItem = hourMap[hour];
    if(hourItem) this.addDataItem(hourItem, dataItem);
  }

  private addDataItem(item: DataValueRecord, dataItem: ResponseDataItem): void {
    // TODO: fix typing of ResponseDataItem -> Properties can be undefined
    item.readingTime += dataItem.readingTime ?? 0;
    item.codingTime += dataItem.codingTime ?? 0;
    item.keystrokes += dataItem.keystrokes ?? 0;
    item.linesAdded += dataItem.linesAdded ?? 0;
    item.linesDeleted += dataItem.linesDeleted ?? 0;
    item.charsAdded += dataItem.charsAdded ?? 0;
    item.charsDeleted += dataItem.charsDeleted ?? 0;
  }

  private getEmptyHourArray(): HourMap {
    return Array(24).fill(undefined).map(() => this.getEmptyItem());
  }

  private getEmptyItem(): DataValueRecord {
    return {
      readingTime: 0,
      codingTime: 0,
      keystrokes: 0,
      charsAdded: 0,
      charsDeleted: 0,
      linesAdded: 0,
      linesDeleted: 0
    };
  }

}

type Callback = (data: Data|null) => void;

export type Data = {
  sum: DataValueRecord;
  hourMap: HourMap;
  byLanguageId: Map<string, LanguageData>;
  byComputerId: Map<string, ComputerData>;
}

export type SumAndHourMap = {
  sum: DataValueRecord;
  hourMap: HourMap;
}

type LanguageData = SumAndHourMap

export type ComputerData = SumAndHourMap & {
  byWorkspaceFolder: Map<string, WorkspaceFolderData>;
  byRepo: Map<string, RepoData>;
}

export type WorkspaceFolderData = SumAndHourMap & {
  byFile: Map<string, SumAndHourMap>;
}

export type RepoData = SumAndHourMap & {
  byBranch: Map<string, BranchData>;
}

export type BranchData = SumAndHourMap & {
  byFile: Map<string, SumAndHourMap>;
}

type HourMap = [
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord,
  DataValueRecord
];

export type ResponseData = Array<ResponseDataItem>;

// TODO: move into common place
type ResponseDataItem = {
  timestamp: number;

  languageId: string;
  computerId: string;

  workspaceFolder: string;
  versionControlSystemRepository: string;

  readingTime: number;
  codingTime: number;
  keystrokes: number;
  charsAdded: number;
  charsDeleted: number;
  linesAdded: number;
  linesDeleted: number;
};

export type DataValueRecord = {
  readingTime: number;
  codingTime: number;
  keystrokes: number;
  charsAdded: number;
  charsDeleted: number;
  linesAdded: number;
  linesDeleted: number;
}
