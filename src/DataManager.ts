import {get, IncomingMessage} from 'http';
import moment, {MomentInput} from 'moment';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';

export class DataManager {

  private subscriptions: Array<Callback> = [];

  private data: Data|null = null;

  constructor(private settingsManager: SettingsManager) {
    setInterval(() => {
      void this.updateData();
    }, 10000);
    void this.updateData();
  }

  public subscribe(callback: Callback): void {
    this.subscriptions.push(callback);
  }

  public getData(): Data|null {
    return this.data;
  }

  private publish(): void {
    this.subscriptions.forEach(callback => callback(this.data));
  }

  private async updateData(): Promise<void> {
    this.data = await this.getDataForDayRange(moment().format('YYYY-MM-DD'));
    this.publish();
  }

  private async getDataForDayRange(from: MomentInput, to?: MomentInput): Promise<Data> {
    if(!to) to = from;

    const serverUrl = this.settingsManager.getConfiguration().serverUrl;

    const req = get(`${serverUrl}/api/v1/data?from=${from}&to=${to}`);

    req.on('error', Logger.error.bind(this));

    return new Promise((res, rej) => {
      req.on('response', (response: IncomingMessage) => {
        let receivedData = '';
        response.on('data', (data) => {
          // Logger.warn('DataManager received data:', data);
          receivedData += data;
        });
        response.on('end', () => {
          const jsonData = JSON.parse(receivedData);

          if(jsonData.success) res(this.analyzeReponseData(jsonData.data));
        });
      });
    });
  }

  private analyzeReponseData(data: ResponseData): Data {
    const sum = this.getEmptyItem();
    const hourMap = this.getEmptyHourArray();

    const byComputerId: Map<string, ComputerData> = new Map();
    const byLanguageId: Map<string, LanguageData> = new Map();
    const byWorkspaceFolder: Map<string, WorkspaceFolderData> = new Map();
    const byRepo: Map<string, RepoData> = new Map();

    for(const dataItem of data) {
      const hour = moment(dataItem.timestamp).get('hour');
      const hourItem = hourMap[hour];

      // TODO ensure hour items exist or get added
      if(hourItem) this.addDataItem(hourItem, dataItem);
      this.addDataItem(sum, dataItem);

      this.setMapValue(byComputerId, dataItem.computerId, hour, dataItem);
      this.setMapValue(byLanguageId, dataItem.languageId, hour, dataItem);

      this.setMapValue(byWorkspaceFolder, dataItem.workspaceFolder, hour, dataItem, (map) => {
        const byFileMap: Map<string, SumAndHourMap> = map.byFile ?? new Map();
        if(!map.byFile) map.byFile = byFileMap;
        this.setMapValue(byFileMap, dataItem.fileName, hour, dataItem);
      });

      this.setMapValue(byRepo, dataItem.versionControlSystemRepository, hour, dataItem, (map) => {
        const byFileMap: Map<string, SumAndHourMap> = map.byFile ?? new Map();
        if(!map.byFile) map.byFile = byFileMap;
        this.setMapValue(byFileMap, dataItem.fileName, hour, dataItem);
      });
    }

    return {
      sum,
      hourMap: hourMap,
      byComputerId,
      byLanguageId,
      byWorkspaceFolder,
      byRepo
    };
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
    const emptyItem = this.getEmptyItem();

    const array: HourMap = [
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem,
      emptyItem
    ];
    return array;
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
  byWorkspaceFolder: Map<string, WorkspaceFolderData>;
  byRepo: Map<string, RepoData>;
}

type SumAndHourMap = {
  sum: DataValueRecord;
  hourMap: HourMap;
}

type LanguageData = SumAndHourMap

type ComputerData = SumAndHourMap

type WorkspaceFolderData = SumAndHourMap & {
  byFile: Map<string, SumAndHourMap>;
}

type RepoData = SumAndHourMap & {
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

type ResponseData = Array<ResponseDataItem>;

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
