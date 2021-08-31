import {TextDocument, TextDocumentChangeEvent, TextEditor} from 'vscode';

export class EventHandler {

  public onEditorSelectionChange(textEditor: TextEditor): void {

  }

  public onActiveFileChange(document?: TextDocument): void {

  }

  public onFileChange(event: TextDocumentChangeEvent): void {

  }

}
