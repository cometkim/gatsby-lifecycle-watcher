import path from 'path';
import timer from 'timers/promises';
import { spawn } from 'child_process';

import killAll from 'tree-kill';
import _dedent from '@cometlib/dedent';

import {
  task,
  exec,
  getLogPath,
  loadLogContent,
  retrieveLatestLogVersion,
} from './utils.mjs';

const dedent = _dedent.default;

const prevVersion = await retrieveLatestLogVersion();
console.log(`The latest recorded version is ${prevVersion}`);

const [prevDevelopLog, prevBuildLog] = await Promise.all([
  loadLogContent({ version: prevVersion, stage: 'development' }),
  loadLogContent({ version: prevVersion, stage: 'production' }),
]);

await task('record gatsby develop...', async () => {
  let devState = { type: 'in_progress', buffer: '' };
  const devProcess = spawn('yarn', ['develop'], { encoding: 'utf8', shell: true });
  devProcess.stdout.on('data', data => {
    const line = data.toString();
    devState.buffer += line;
    console.log(line.trimEnd());
    if (line.search('success Building development bundle') !== -1) {
      devState = { ...devState, type: 'done' };
    }
  });
  devProcess.stderr.on('data', data => {
    const line = data.toString();
    devState = { ...devState, type: 'failed', error: line };
  });

  const MAX_ITERATION_COUNT = 120;
  for (let i = 0; i < MAX_ITERATION_COUNT; i++) {
    if (devState.type === 'in_progress') {
      await timer.setTimeout(1000);
    } else {
      break;
    }
  }

  // finalize
  killAll(devProcess.pid, 'SIGTERM');
  if (devState.type === 'failed') {
    throw new Error(devState.error);
  }
});

await task('record gatsby build...', async () => {
  const { stdout } = await exec('yarn build');
  console.log(stdout.toString());
});

const currentVersion = await retrieveLatestLogVersion();
if (currentVersion === prevVersion) {
  console.log('The version is not changed. skipping');
  process.exit(0);
}

const [currentDevelopLog, currentBuildLog] = await Promise.all([
  loadLogContent({ version: currentVersion, stage: 'development' }),
  loadLogContent({ version: currentVersion, stage: 'production' }),
]);
const hasDevelopChanged = currentDevelopLog !== prevDevelopLog;
const hasBuildChanged = currentBuildLog !== prevBuildLog;
const hasChanged = hasDevelopChanged || hasBuildChanged;
if (!hasChanged) {
  console.log('No diffs found. skipping');
  process.exit(0);
}

await task('generate report...', async () => {
  const render = ({
    diff,
    current,
    prev,
  }) => dedent`
    # Gatsby Node API breaking changes report

    Seems like the Gatsby Node Lifecycle API is changed since version v${current.version}

    See the [changes](https://github.com/gatsbyjs/gatsby/compare/gatsby@${prev.version}...gatsby@${current.version}) and [report an issue](https://github.com/gatsbyjs/gatsby/issues/new?labels=type%3A+bug&template=bug_report.md) if you think this is not intended.

    ${diff.develop && dedent`
    ## Breaking changes on \`gatsby develop\`

    ### Diff

    \`\`\`diff
    ${diff.develop}
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
          <td><pre>${prev.develop}</pre></td>
          <td><pre>${current.develop}</pre></td>
        </tr>
      </tbody>
    </table>
    `}

    ${diff.build && dedent`
    ## Breaking changes on \`gatsby build\`

    ### Diff

    \`\`\`diff
    ${diff.build}
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
          <td><pre>${prev.build}</pre></td>
          <td><pre>${current.build}</pre></td>
        </tr>
      </tbody>
    </table>
    `}

    ${diff.developVsBuild && dedent`
    ## \`gatsby develop\` vs \`gatsby build\` differences

    \`\`\`diff
    ${diff.developVsBuild}
    \`\`\`
    `}
  `;

  const { stdout: developDiff } = await exec(`diff -u ${getLogPath({ version: prevVersion, stage: 'development' })} ${getLogPath({ version: currentVersion, stage: 'development' })} || true`);
  const { stdout: buildDiff } = await exec(`diff -u ${getLogPath({ version: prevVersion, stage: 'production' })} ${getLogPath({ version: currentVersion, stage: 'production' })} || true`);
  const { stdout: developVsBuildDiff } = await exec(`diff -u ${getLogPath({ version: currentVersion, stage: 'develop' })} ${getLogPath({ version: currentVersion, stage: 'production' })} || true`);

  const context = {
    diff: {
      develop: developDiff,
      build: buildDiff,
      developVsBuild: developVsBuildDiff,
    },
    prev: {
      version: prevVersion,
      develop: prevDevelopLog,
      build: prevBuildLog,
    },
    current: {
      version: currentVersion,
      develop: currentDevelopLog,
      build: currentBuildLog,
    },
  };

  const report = render(context);
  await fs.writeFile('report.md', report, { encoding: 'utf8' });
});

process.exit(0);
