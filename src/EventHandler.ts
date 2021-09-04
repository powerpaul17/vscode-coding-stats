import {Disposable, TextDocument, TextDocumentChangeEvent, TextDocumentContentChangeEvent, TextEditor, TextEditorSelectionChangeEvent, TextEditorVisibleRangesChangeEvent, window, WindowState, workspace} from 'vscode';
import {Logger} from './Logger';
import {UploadDataType, Uploader} from './Uploader';

export class EventHandler {

  private static MAXIMUM_RECORD_LENGTH = 60 * 1000;

  private static MINIMUM_READING_TIME = 5 * 1000;
  private static READING_TIMEOUT = 10 * 1000;

  private static CODING_TIMEOUT = 5 * 1000;

  private static INVALID_CODING_DOCUMENT_SCHEMES = [
    // there are will be a `onDidChangeTextDocument` with document scheme `git-index`
    // emitted when you switch document, so ignore it
    'git-index',
    // since 1.9.0 vscode changed `git-index` to `git`, OK, they are refactoring around source control
    // see more: https://code.visualstudio.com/updates/v1_9#_contributable-scm-providers
    'git',
    // when you just look up output channel content, there will be a `onDidChangeTextDocument`
    'output',
    // This is an edit event emit from you debug console input box
    'input',
    // This scheme appears in vscode global replace diff preview editor
    'private',
    // This scheme is used for markdown preview document
    // It will appear when you edit a markdown with aside preview
    'markdown'
  ];

  private disposable: Disposable;

  private trackingData: TrackingData = {
    openTimestamp: 0,

    readingTime: 0,
    codingTime: 0,

    lastReadingTimestamp: 0,
    lastCodingTimestamp: 0,

    keystrokes: 0,

    charsDeleted: 0,
    charsAdded: 0,
    linesDeleted: 0,
    linesAdded: 0
  };

  private activeDocument: TextDocument|null = null;

  constructor(private uploader: Uploader) {
    this.onActiveFileChange(window.activeTextEditor);

    const subscriptions = [];

    subscriptions.push(window.onDidChangeActiveTextEditor(this.onActiveFileChange.bind(this)));
    subscriptions.push(window.onDidChangeTextEditorSelection(this.onEditorSelectionChange.bind(this)));
    subscriptions.push(window.onDidChangeTextEditorVisibleRanges(this.onEditorVisibleRangesChange.bind(this)));
    subscriptions.push(window.onDidChangeWindowState(this.onWindowStateChange.bind(this)));

    subscriptions.push(workspace.onDidChangeTextDocument(this.onFileChange.bind(this)));

    this.disposable = Disposable.from(...subscriptions);
  }

  public dispose(): void {
    this.onActiveFileChange();
    this.disposable.dispose();
  }

  private onActiveFileChange(textEditor?: TextEditor): void {
    const now = Date.now();

    if(textEditor?.document === this.activeDocument) return;

    this.changeActiveFile(now, textEditor?.document);
  }

  private changeActiveFile(now: number, document?: TextDocument): void {
    const newDocument = document ?? null;

    if(newDocument === this.activeDocument) return;

    if(this.activeDocument && (this.trackingData.codingTime || this.trackingData.readingTime >= EventHandler.MINIMUM_READING_TIME)) {
      this.uploadTrackingData();
    }

    this.resetTrackingData();

    this.activeDocument = newDocument;

    this.trackingData.openTimestamp = now;
    this.trackingData.lastReadingTimestamp = now;
  }

  private onEditorSelectionChange(event: TextEditorSelectionChangeEvent): void {
    const now = Date.now();

    if(event.textEditor.document !== this.activeDocument) {
      this.changeActiveFile(now, event.textEditor.document);
    } else {
      this.updateReadingTime(now);
    }
  }

  private onEditorVisibleRangesChange(event: TextEditorVisibleRangesChangeEvent): void {
    const now = Date.now();

    if(event.textEditor.document !== this.activeDocument) {
      this.changeActiveFile(now, event.textEditor.document);
    } else {
      this.updateReadingTime(now);
    }
  }

  private onWindowStateChange(windowState: WindowState): void {
    if(this.activeDocument && !windowState.focused) {
    //   this.updateReadingTime();
    }
  }

  private updateReadingTime(now: number): void {
    if(this.trackingData.lastReadingTimestamp + EventHandler.READING_TIMEOUT >= now) {
      this.trackingData.readingTime += now - this.trackingData.lastReadingTimestamp;
    } else {
      this.trackingData.readingTime += EventHandler.READING_TIMEOUT;
    }

    this.uploadTrackingDataIfNecessary(now);

    this.trackingData.lastReadingTimestamp = now;
  }

  private onFileChange(event: TextDocumentChangeEvent): void {
    // vscode bug:
    // Event `onDidChangeActiveTextEditor` be emitted with empty document when you open "Settings" editor.
    // Then Event `onDidChangeTextDocument` be emitted even if you has not edited anything in setting document.
    // I ignore empty activeDocument to keeping tracker up and avoiding exception like follow:
    //    TypeError: Cannot set property 'lineCount' of null  // activeDocument.lineCount = ...
    if(!this.activeDocument) return;

    if(EventHandler.INVALID_CODING_DOCUMENT_SCHEMES.indexOf(event.document.uri.scheme) >= 0 ) return;

    this.analyzeDocumentContentChanges(event.contentChanges.slice());

    Logger.debug('active document: lineCount:', this.activeDocument.lineCount, '; length:', this.activeDocument.getText().length);
    // this.activeDocument.lineCount = event.document.lineCount;

    this.updateCodingTime();
  }

  private analyzeDocumentContentChanges(contentChanges: Array<TextDocumentContentChangeEvent>): void {
    if(contentChanges.length) this.trackingData.keystrokes++;

    for(const change of contentChanges) {
      const linesDeleted = change.range.end.line - change.range.start.line;
      this.trackingData.linesDeleted += linesDeleted;

      const linesAdded = change.text.match(/[\n\r]/g)?.length || 0;
      this.trackingData.linesAdded += linesAdded;

      this.trackingData.charsAdded += change.text.length - linesAdded;
      this.trackingData.charsDeleted += change.rangeLength - linesDeleted;
    }

    // const nettoCharDifference = this.trackingData.charsAdded - this.trackingData.charsDeleted;
    // const nettoLineChange = this.trackingData.linesAdded - this.trackingData.linesDeleted;

    Logger.debug(
      'tracking data: chars:',
      '+', this.trackingData.charsAdded,
      '-', this.trackingData.charsDeleted,
      '; lines:',
      '+', this.trackingData.linesAdded,
      '-', this.trackingData.linesDeleted,
      '; keystrokes:',
      this.trackingData.keystrokes
    );
  }

  private updateCodingTime(): void {
    const now = Date.now();

    if(this.trackingData.lastCodingTimestamp + EventHandler.CODING_TIMEOUT >= now) {
      this.trackingData.codingTime += now - this.trackingData.lastCodingTimestamp;
    }

    this.uploadTrackingDataIfNecessary(now);

    this.trackingData.lastCodingTimestamp = now;

    // coding also counts as reading? ;)
    this.trackingData.lastReadingTimestamp = now;
  }

  private uploadTrackingDataIfNecessary(now: number): void {
    if(this.trackingData.openTimestamp + EventHandler.MAXIMUM_RECORD_LENGTH <= now && (this.trackingData.codingTime || this.trackingData.readingTime >= EventHandler.MINIMUM_READING_TIME)) {
      this.uploadTrackingData();
      this.trackingData.openTimestamp = now;
    }
  }

  private uploadTrackingData(): void {
    if(this.activeDocument && this.shouldUploadDocument()) {
      this.uploader.submitData(
        UploadDataType.FILE,
        this.activeDocument,
        this.trackingData
      );
    }
    this.resetTrackingData();
  }

  private resetTrackingData(): void {
    this.trackingData.openTimestamp = 0;

    this.trackingData.readingTime = 0;
    this.trackingData.codingTime = 0;

    this.trackingData.lastReadingTimestamp = 0;
    this.trackingData.lastCodingTimestamp = 0;

    this.trackingData.keystrokes = 0;

    this.trackingData.charsAdded = 0;
    this.trackingData.charsDeleted = 0;
    this.trackingData.linesAdded = 0;
    this.trackingData.linesDeleted = 0;
  }

  private shouldUploadDocument(): boolean {
    Logger.debug('isIgnoreDocument:', this.activeDocument);
    return !!this.activeDocument && this.activeDocument.uri.scheme !== 'inmemory';
  }

}

export type TrackingData = {
  openTimestamp: number;

  readingTime: number;
  codingTime: number;

  lastReadingTimestamp: number;
  lastCodingTimestamp: number;

  keystrokes: number;

  charsDeleted: number;
  charsAdded: number;
  linesDeleted: number;
  linesAdded: number;
}
