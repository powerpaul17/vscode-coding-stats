import {ChildProcess, fork} from 'child_process';
import {window} from 'vscode';
import {Logger} from './Logger';
import {Configuration, SettingsManager} from './SettingsManager';

export class LocalServer {

  private static CWD = `${__dirname}/../libs/coding-stats-server/out/`;
  private static SCRIPT = 'app.js';

  private localServerProcess: ChildProcess|null = null;

  private subscriptions: Array<StatusCallback> = [];

  private enabled = false;

  constructor(private settingsManager: SettingsManager) {
    settingsManager.subscribe(this.onConfigurationChanged.bind(this));
  }

  public subscribe(callback: StatusCallback): void {
    this.subscriptions.push(callback);
    callback({ running: !!this.localServerProcess });
  }

  public dispose(): void {
    this.stop();
  }

  public start(): void {
    if(this.localServerProcess) return;

    this.localServerProcess = fork(
      LocalServer.SCRIPT,
      [
        '--local',
        '--debug',
        '-p', `${this.settingsManager.getConfiguration().port}`,
        '-o', this.settingsManager.getConfiguration().localServerDataDirectory,
        '-s', 'sqlite'
      ],
      {
        cwd: LocalServer.CWD
      }
    );

    const boundLog = Logger.log.bind(this);

    this.localServerProcess.stdout?.on('data', boundLog);
    this.localServerProcess.stderr?.on('data', Logger.error.bind(this));

    this.localServerProcess.on('error', (error) => {
      Logger.error(error);
      void window.showErrorMessage('local server has errored');
      this.stop();
    });

    this.localServerProcess.on('exit', (code, signal) => {
      Logger.log(code, signal);
      void window.showWarningMessage(`local server has exited: ${code}, ${signal}`);
      this.stop();
    });

    this.localServerProcess.on('close', (code, signal) => {
      Logger.log(code, signal);
      void window.showInformationMessage(`local server has been shut down: ${code}, ${signal}`);
      this.stop();
      this.startIfEnabled();
    });

    this.publishStatus();
  }

  public stop(): void {
    this.localServerProcess?.kill();
    this.localServerProcess = null;
    this.publishStatus();
  }

  public restart(): void {
    this.startIfEnabled(true);
  }

  private publishStatus(): void {
    this.subscriptions.forEach(callback => callback({ running: !!this.localServerProcess }));
  }

  private onConfigurationChanged(configuration: Configuration): void {
    this.enabled = configuration.localServerMode;
    this.startIfEnabled(true);
  }

  private startIfEnabled(restart = false): void {
    if(this.enabled) {
      if(restart) this.stop();
      this.start();
    } else {
      this.stop();
    }
  }

}

type StatusCallback = (status: ServerStatus) => void

export type ServerStatus = {
  running: boolean;
}
