import {request} from 'https';
import path from 'path';

import {Logger} from './Logger';
import {SettingsManager} from './SettingsManager';

export class RequestHelper {

  constructor(private settingsManager: SettingsManager) {}

  public async makeRequest<T>({
    endpoint,
    method = Method.GET,
    postData,
    authorizationToken
  }: {
    endpoint: string;
    method?: Method;
    postData?: any;
    authorizationToken?: string;
  }): Promise<T> {
    const serverUrl = this.settingsManager.getCompleteServerUrl();
    const url = path.join(serverUrl, endpoint);

    const req = request(
      url,
      {
        method: method,
        headers: {
          ...postData ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            ...authorizationToken ? { 'Authorization': authorizationToken } : {}
          } : {}
        }
      }
    );

    return new Promise((res, rej) => {
      req.on('error', (err) => {
        Logger.error(err);
        rej(err);
      });

      req.on('response', (response) => {
        let receivedData = '';
        response.on('data', (data) => {
          // Logger.warn('DataManager received data:', data);
          receivedData += data;
        });
        response.on('end', () => {
          try {
            const jsonData = JSON.parse(receivedData);
            res(jsonData);
          } catch(e) {
            rej(e);
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
