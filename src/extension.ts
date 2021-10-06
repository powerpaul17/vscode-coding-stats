import {ExtensionContext, commands, window} from 'vscode';
import {DataManager} from './DataManager';
import {EventHandler} from './EventHandler';
import {LocalServer} from './LocalServer';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';
import {StatusBarManager} from './StatusBarManager';
import {Uploader} from './Uploader';
import {ReposViewProvider} from './views/ReposViewProvider';
import {SummaryViewProvider} from './views/SummaryViewProvider';
import {WorkspaceFoldersViewProvider} from './views/WorkspaceFoldersViewProvider';

const settingsManager = new SettingsManager();

const dataManager = new DataManager(settingsManager);

const uploader = new Uploader(settingsManager);
const eventHandler = new EventHandler(uploader);
const localServer = new LocalServer(settingsManager);

const statusBarManager = new StatusBarManager(settingsManager, uploader, dataManager);

export function activate(context: ExtensionContext): void {
  const subscriptions = context.subscriptions;

  Logger.setOutputChannel(window.createOutputChannel('Coding Stats'));

  subscriptions.push(window.registerTreeDataProvider(
    'codingStats.summaryView',
    new SummaryViewProvider(dataManager)
  ));

  subscriptions.push(window.registerTreeDataProvider(
    'codingStats.reposView',
    new ReposViewProvider(dataManager)
  ));

  subscriptions.push(window.registerTreeDataProvider(
    'codingStats.workspaceFoldersView',
    new WorkspaceFoldersViewProvider(dataManager)
  ));

  subscriptions.push(commands.registerCommand('codingStats.restartLocalServer', () => {
    localServer.restart();
  }));

  uploader.init(context.globalState);
  uploader.start();
}

export function deactivate(): void {
  eventHandler.dispose();
  localServer.dispose();
}
