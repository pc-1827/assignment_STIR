import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';

/**
 * Creates a temporary Chrome extension that handles proxy authentication.
 */
export async function createProxyAuthExtension(username, password, host, port) {
  return new Promise((resolve, reject) => {
    // Create temp directory
    const extensionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proxy-auth-'));

    // manifest.json
    const manifest = {
      manifest_version: 2,
      name: 'Proxy Auth Extension',
      version: '1.0',
      permissions: ['proxy', 'tabs', '<all_urls>', 'webRequest', 'webRequestBlocking'],
      background: {
        scripts: ['background.js']
      }
    };
    fs.writeFileSync(path.join(extensionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // background.js
    const backgroundJs = `
      var config = {
        mode: "fixed_servers",
        rules: {
          singleProxy: {
            scheme: "http",
            host: "${host}",
            port: parseInt(${port})
          },
          bypassList: ["localhost"]
        }
      };

      chrome.proxy.settings.set({ value: config, scope: "regular" }, function() {});

      function callbackFn(details) {
        return {
          authCredentials: {
            username: "${username}",
            password: "${password}"
          }
        };
      }

      chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        {urls: ["<all_urls>"]},
        ["blocking"]
      );
    `;
    fs.writeFileSync(path.join(extensionDir, 'background.js'), backgroundJs);

    // Zip it all
    const zipPath = path.join(extensionDir, 'proxy-auth.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(extensionDir, false);
    archive.finalize();
  });
}
