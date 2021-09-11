import {env, workspace} from 'vscode';

export class SettingsManager {

  private configuration: Configuration = {
    port: 10333,
    serverUrl: 'http://localhost',
    debugLogging: false,
    showStatus: true,
    localServerMode: true,
    localServerDataDirectory: `${process.env.USERPROFILE || process.env.HOME}/.coding-stats/`,
    computerId: env.machineId
  }

  private subscriptions: Array<Callback> = [];

  constructor() {
    workspace.onDidChangeConfiguration(this.onConfigurationChanged.bind(this));
    this.onConfigurationChanged();
  }

  public subscribe(callback: Callback): void {
    this.subscriptions.push(callback);
  }

  public getConfiguration(): Configuration {
    return this.configuration;
  }

  public getCompleteServerUrl(): string {
    if(this.configuration.localServerMode) {
      return `http://localhost:${this.configuration.port}`;
    }
    return this.configuration.serverUrl;
  }

  private onConfigurationChanged(): void {
    const configuration = workspace.getConfiguration('codingStats');
    this.configuration = {
      port: configuration.get('port') ?? 10333,
      serverUrl: configuration.get('serverUrl') ?? 'http://localhost',
      debugLogging: configuration.get('debugLogging') ?? false,
      showStatus: configuration.get('showStatus') ?? true,
      localServerMode: configuration.get('localServerMode') ?? true,
      localServerDataDirectory: configuration.get('localServerDataDirectory') ?? `${process.env.USERPROFILE || process.env.HOME}/.coding-stats/`,
      computerId: configuration.get('computerId') ?? env.machineId
    };
    this.publish();
  }

  private publish(): void {
    this.subscriptions.forEach(callback => callback(this.configuration));
  }

}

export type Configuration = {
  debugLogging: boolean;
  showStatus: boolean;
  localServerMode: boolean;
  localServerDataDirectory: string;
  computerId: string;
  port: number;
  serverUrl: string;
}

type Callback = (configuration: Configuration) => void;
