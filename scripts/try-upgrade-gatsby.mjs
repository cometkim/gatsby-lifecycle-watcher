import { task, exec } from './utils.mjs';

await task('Bumping gatsby version...', () => exec('yarn add gatsby -E'));

try {
  const { stdout } = await exec('git diff HEAD package.json | grep "gatsby"');
  console.log('Upgraded to a new version of Gatsby:');
  console.log(stdout.toString());
  process.exit(0);
} catch {
  console.log('No new versions are found');
  process.exit(1);
}
