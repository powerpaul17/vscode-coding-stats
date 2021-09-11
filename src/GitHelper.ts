import {extensions, Uri} from 'vscode';

import {Logger} from './Logger';
import {API, GitExtension} from './git';

export class GitHelper {

  private gitApi: API|null = null;

  constructor() {
    extensions.onDidChange(this.onUpdateExtensions);
    this.onUpdateExtensions();
  }

  public getGitInfo(filePath: string): GitInfo|null {
    const repoPath = this.getRepoPath(filePath);
    if(!repoPath) return null;

    const branch = this.getBranch(repoPath);
    if(!branch) return null;

    return {
      repo: repoPath,
      branch: branch
    };
  }

  private getRepoPath(filePath: string): string|null {
    return this.gitApi?.getRepository(Uri.parse(filePath))?.rootUri.path ?? null;
  }

  private getBranch(repoPath: string): string|null {
    return this.gitApi?.getRepository(Uri.parse(repoPath))?.state.HEAD?.name ?? null;
  }

  private onUpdateExtensions(): void {
    const gitExtension = extensions.getExtension<GitExtension>('vscode.git')?.exports;
    this.gitApi = gitExtension?.getAPI(1) ?? null;
    // Logger.debug('set git api:', this.gitApi);
  }

}

type GitInfo = {
  repo: string;
  branch: string;
}
