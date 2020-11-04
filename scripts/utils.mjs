import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';
import childProcess from 'child_process';

import { rsort as sortVersions } from 'es-semver';

export const exec = promisify(childProcess.exec);

export async function task(name, func) {
  console.log(name);
  const scope = `${name} done`;
  console.time(scope);
  const result = await func();
  console.timeEnd(scope);
  return result;
}

export async function retrieveLatestLogVersion() {
  const logs = await fs.readdir(path.resolve('archives'));

  const versions = logs
    .map(log => log.match(/^gatsby-(?<version>\d+\.\d+\.\d+)-lifecycle-(?<stage>development|production)\.log$/))
    .filter(Boolean)
    .map(match => match.groups.version);

  const [latestVersion] = sortVersions([...new Set(versions)]);
  return latestVersion;
}

export function getLogPath({ version, stage }) {
  return path.join('archives', `gatsby-${version}-lifecycle-${stage}.log`);
}

export async function loadLogContent({ version, stage }) {
  return fs.readFile(getLogPath({ version, stage }), 'utf8');
}
