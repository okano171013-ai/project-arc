import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { createServer } from 'node:http';
import { exec } from 'node:child_process';
import { readEncryptedToken, writeEncryptedToken } from '../security/tokenStore.js';
import { loadEnv } from '../config/env.js';

/**
 * googleAuthClient
 *
 * ADR 0004に基づくOAuth 2.0認証。初回のみブラウザでの許可操作が必要で、
 * 以降はリフレッシュトークン（暗号化保存済み）から自動的に
 * アクセストークンを再取得する。
 */

const REDIRECT_PORT = 53682;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/tasks.readonly',
];

export async function getAuthorizedClient(): Promise<OAuth2Client> {
  const env = loadEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません。' +
        'docs/setup/google-api-setup.md の手順に従って .env を設定してください。',
    );
  }

  const client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI,
  );

  const savedRefreshToken = await readEncryptedToken();
  if (savedRefreshToken) {
    client.setCredentials({ refresh_token: savedRefreshToken });
    return client;
  }

  const refreshToken = await runFirstTimeAuthFlow(client);
  await writeEncryptedToken(refreshToken);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function runFirstTimeAuthFlow(client: OAuth2Client): Promise<string> {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n初回認証が必要です。ブラウザで以下のURLを開いて、');
  console.log('Googleアカウントでログイン・許可してください。');
  console.log(authUrl + '\n');
  tryOpenBrowser(authUrl);

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? '/', REDIRECT_URI);
          const code = url.searchParams.get('code');
          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('認証コードが見つかりませんでした。');
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body>認証が完了しました。このタブは閉じて構いません。</body></html>');
          server.close();

          const { tokens } = await client.getToken(code);
          if (!tokens.refresh_token) {
            reject(
              new Error(
                'refresh_tokenを取得できませんでした。Googleアカウントの「サードパーティ製アプリと' +
                  'サービス」の設定でProject ARCへのアクセスを一度取り消してから、再度お試しください。',
              ),
            );
            return;
          }
          resolve(tokens.refresh_token);
        } catch (error) {
          reject(error as Error);
        }
      })();
    });

    server.listen(REDIRECT_PORT);
  });
}

function tryOpenBrowser(url: string): void {
  const command =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.log('（ブラウザを自動で開けませんでした。上記URLを手動で開いてください）');
    }
  });
}
