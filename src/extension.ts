import {ExtensionContext} from 'vscode';
import {EventHandler} from './EventHandler';
import {Uploader} from './Uploader';

const uploader = new Uploader();
const eventHandler = new EventHandler(uploader);

export function activate(context: ExtensionContext): void {
  const subscriptions = context.subscriptions;


}

export function deactivate(): void {
  eventHandler.dispose();
}
