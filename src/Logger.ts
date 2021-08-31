export class Logger {

  private static prefix = 'coding-stats';

  public static error(...msg: Array<any>): void {
    console.error(this.prefix, ...msg);
  }

  public static warn(...msg: Array<any>): void {
    console.warn(this.prefix, ...msg);
  }

  public static info(...msg: Array<any>): void {
    console.info(this.prefix, ...msg);
  }

  public static log(...msg: Array<any>): void {
    console.log(this.prefix, ...msg);
  }

  public static debug(...msg: Array<any>): void {
    console.debug(this.prefix, ...msg);
  }

}
