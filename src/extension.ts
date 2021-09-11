import {ExtensionContext} from 'vscode';
import {EventHandler} from './EventHandler';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';
import {Uploader} from './Uploader';

const settingsManager = new SettingsManager();

const uploader = new Uploader(settingsManager);
const eventHandler = new EventHandler(uploader);

export function activate(context: ExtensionContext): void {
  const subscriptions = context.subscriptions;

  Logger.setOutputChannel(window.createOutputChannel('Coding Stats'));

  uploader.init(context.globalState);
  uploader.start();
}

export function deactivate(): void {
  eventHandler.dispose();
}
