import {OutputChannel, workspace} from 'vscode';

export class Logger {

  private static readonly prefix = 'Coding Stats';

  private static outputChannel: OutputChannel|null = null;

  public static setOutputChannel(outputChannel: OutputChannel): void {
    this.outputChannel = outputChannel;
  }

  public static error(...msg: Array<any>): void {
    console.error(this.prefix, ...msg);
    this.writeToOutputChannel([ 'ERROR:', ...msg]);
  }

  public static warn(...msg: Array<any>): void {
    console.warn(this.prefix, ...msg);
    this.writeToOutputChannel([ 'WARN:', ...msg]);
  }

  public static info(...msg: Array<any>): void {
    console.info(this.prefix, ...msg);
    this.writeToOutputChannel([ 'INFO:', ...msg]);
  }

  public static log(...msg: Array<any>): void {
    console.log(this.prefix, ...msg);
    this.writeToOutputChannel([ 'LOG:', ...msg ]);
  }

  public static debug(...msg: Array<any>): void {
    const configuration = workspace.getConfiguration('codingStats');
    if(configuration.get('debugLogging')) {
      console.debug(this.prefix, ...msg);
      this.writeToOutputChannel([ 'DEBUG:', ...msg]);
    }
  }

  private static writeToOutputChannel(msg: Array<any>): void {
    this.outputChannel?.appendLine(msg.join(' '));
  }

}
