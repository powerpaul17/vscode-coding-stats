import {workspace, window, ExtensionContext} from 'vscode';
import {EventHandler} from './EventHandler';

const eventHandler = new EventHandler(uploader);

export function activate(context: ExtensionContext): void {
  const subscriptions = context.subscriptions;

  eventHandler.onActiveFileChange(window.activeTextEditor?.document);

  subscriptions.push(workspace.onDidChangeTextDocument(e => eventHandler.onFileChange(e)));
  subscriptions.push(window.onDidChangeActiveTextEditor(e => eventHandler.onActiveFileChange(e?.document)));
  subscriptions.push(window.onDidChangeTextEditorSelection(e => eventHandler.onEditorSelectionChange(e.textEditor)));
}

export function deactivate(): void {
  eventHandler.onActiveFileChange();
}
