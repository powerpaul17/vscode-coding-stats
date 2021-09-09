import {ExtensionContext} from 'vscode';
import {EventHandler} from './EventHandler';
import {Logger} from './Logger';
import {Uploader} from './Uploader';

const uploader = new Uploader();
const eventHandler = new EventHandler(uploader);

export function activate(context: ExtensionContext): void {
  const subscriptions = context.subscriptions;

  Logger.setOutputChannel(window.createOutputChannel('Coding Stats'));
}

export function deactivate(): void {
  eventHandler.dispose();
}
