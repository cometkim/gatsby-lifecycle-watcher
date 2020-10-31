import path from 'path';
import fs from 'fs/promises';
import timer from 'timers/promises';
import { spawn } from 'child_process';
import { task, exec } from './utils.mjs';

async function retrieveLatestLogVersion() {
  const logs = fs.readdir(path.resolve('archives'));
  return logs
}

const prevVersion = await retrieveLatestLogVersion();
console.log(prevVersion)

await task('record gatsby develop...', async () => {
  let done = false;
  let buffer = '';

  const devProcess = spawn('yarn', ['develop'], { encoding: 'utf8' });
  devProcess.stdout.on('data', data => {
    const line = data.toString();
    buffer += line;
    if (line.search('success Building development bundle') !== -1) {
      done = true;
    }
  });
  devProcess.stderr.on('data', data => {
    const line = data.toString();
    throw new Error(line);
    done = true;
  });

  const MAX_ITERATION_COUNT = 120;
  for (let i = 0; i < MAX_ITERATION_COUNT; i++) {
    if (done) break;
    await timer.setTimeout(1000);
  }

  devProcess.kill();
  return buffer;
});

await task('record gatsby build...', () => exec('yarn build'));

await task('generate report...', () => {
  const render = ({
    diff,
    current,
    prev,
  }) => `
# Gatsby Node API breaking changes report

Seems like the Gatsby Node Lifecycle API is changed since version v${current.version}

See the [changes](https://github.com/gatsbyjs/gatsby/compare/gatsby@${prev.version}...gatsby@${current.version}) and [report an issue](https://github.com/gatsbyjs/gatsby/issues/new?labels=type%3A+bug&template=bug_report.md) if you think this is not intended.

${diff.hasDevelopChanged && `
## Breaking changes on \`gatsby develop\`

### Diff

\`\`\`diff
${diff.unified}
\`\`\`

### Side-by-Side

<table>
  <thead>
    <tr>
      <th>v${prev.version}</th>
      <th>v${current.version}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><pre>${prev.buildLog}</pre></td>
      <td><pre>${current.buildLog}</pre></td>
    </tr>
  </tbody>
</table>
`}

${diff.hasBuildChanged && `
## Breaking changes on \`gatsby build\`

### Diff

\`\`\`diff
${diff.unified}
\`\`\`

### Side-by-Side

<table>
  <thead>
    <tr>
      <th>v${prev.version}</th>
      <th>v${current.version}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><pre>${prev.buildLog}</pre></td>
      <td><pre>${current.buildLog}</pre></td>
    </tr>
  </tbody>
</table>
`}

${(diff.hasDevelopChanged || diff.hasBuildChanged) && `
## \`gatsby develop\` vs \`gatsby build\` differences

\`\`\`diff
${current.developVsBuildDiff}
\`\`\`
`}
`;

  const context = {
    diff: {
    },
    prev: {
      version: '',
    },
    current: {
      version: '',
    },
  }
});

process.exit(0);
