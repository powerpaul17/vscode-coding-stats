import {IncomingMessage, request} from 'http';
import path from 'path';
import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';

export class RequestHelper {

  constructor(private settingsManager: SettingsManager) {}

  public makeRequest<T>(endpoint: string, method: Method = Method.GET, postData?: any): Promise<T> {
    const serverUrl = this.settingsManager.getCompleteServerUrl();
    const url = path.join(serverUrl, endpoint);

    const username = this.settingsManager.getConfiguration().username;
    const password = this.settingsManager.getConfiguration().password;

    const req = request(
      url,
      {
        method: method,
        auth: `${username}: ${password}`,
        headers: {
          ...postData ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          } : {}
        }
      }
    );

    return new Promise((res, rej) => {
      req.on('error', (err) => {
        Logger.error(err);
        rej(err);
      });

      req.on('response', (response: IncomingMessage) => {
        let receivedData = '';
        response.on('data', (data) => {
          // Logger.warn('DataManager received data:', data);
          receivedData += data;
        });
        response.on('end', () => {
          const jsonData = JSON.parse(receivedData);
          if(jsonData.success) {
            res(jsonData.data);
          } else {
            rej();
          }
        });
      });

      if(postData) {
        req.write(postData);
      }

      req.end();
    });
  }

}

export enum Method {
  GET = 'GET',
  POST = 'POST'
}
