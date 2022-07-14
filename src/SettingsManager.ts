import {env, workspace} from 'vscode';

export class SettingsManager {

  private configuration: Configuration = {
    serverUrl: 'http://localhost',
    username: '',
    password: '',
    debugLogging: false,
    showStatus: true,
    computerId: env.machineId
  }

  private subscriptions: Array<Callback> = [];

  constructor() {
    workspace.onDidChangeConfiguration(this.onConfigurationChanged.bind(this));
    this.onConfigurationChanged();
  }

  public subscribe(callback: Callback): void {
    this.subscriptions.push(callback);
    callback(this.configuration);
  }

  public getConfiguration(): Configuration {
    return this.configuration;
  }

  public getCompleteServerUrl(): string {
    return this.configuration.serverUrl;
  }

  private onConfigurationChanged(): void {
    const configuration = workspace.getConfiguration('codingStats');
    this.configuration = {
      serverUrl: configuration.get('serverUrl') ?? 'http://localhost',
      username: configuration.get('username') ?? '',
      password: configuration.get('password') ?? '',
      debugLogging: configuration.get('debugLogging') ?? false,
      showStatus: configuration.get('showStatus') ?? true,
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
  computerId: string;
  serverUrl: string;
  username: string;
  password: string;
}

type Callback = (configuration: Configuration) => void;
