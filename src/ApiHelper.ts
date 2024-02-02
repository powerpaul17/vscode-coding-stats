import { ResponseData } from './DataManager';
import { Method, RequestHelper } from './RequestHelper';
import { SettingsManager } from './SettingsManager';

export class ApiHelper {
  private requestHelper;

  private authorizationToken: string | null = null;
  private tokenRequestPromise: Promise<string> | null = null;

  constructor(private settingsManager: SettingsManager) {
    this.requestHelper = new RequestHelper(settingsManager);
  }

  public async uploadRecord(postData: string): Promise<void> {
    await this.requestHelper.makeRequest({
      endpoint: 'api/collections/records/records',
      method: Method.POST,
      postData,
      authorizationToken: await this.getAuthorizationToken()
    });
  }

  public async getData(from: number, to: number): Promise<ResponseData> {
    const response = await this.requestHelper.makeRequest<ResponseData>({
      endpoint: `api/collections/records/records?filter=timestamp>=${from}&&timestamp<=${to}&skipTotal=true&perPage=1000`,
      authorizationToken: await this.getAuthorizationToken()
    });

    return response.items;
  }

  private async getAuthorizationToken(): Promise<string> {
    return this.authorizationToken ?? (await this.renewAuthorizationToken());
  }

  private async renewAuthorizationToken(): Promise<string> {
    if (this.tokenRequestPromise) {
      return await this.tokenRequestPromise;
    }

    const username = this.settingsManager.getConfiguration().username;
    const password = this.settingsManager.getConfiguration().password;

    const data = {
      identity: username,
      password
    };

    this.tokenRequestPromise = new Promise((res, rej) => {
      this.requestHelper
        .makeRequest({
          endpoint: 'api/collections/users/auth-with-password',
          method: Method.POST,
          postData: JSON.stringify(data)
        })
        .then((response) => {
          const token = response.token;

          if (token) {
            this.authorizationToken = token;
            res(token);
            return;
          }

          rej('no token received');
        })
        // .catch((e) => {
        //   throw new Error('could not get token');
        // })
        .finally(() => {
          this.tokenRequestPromise = null;
        });
    });

    return this.tokenRequestPromise;
  }
}
