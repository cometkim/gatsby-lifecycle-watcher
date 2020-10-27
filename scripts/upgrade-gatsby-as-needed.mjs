import { promisify } from 'util';
import childProcess from 'child_process';

const spawn = promisify(childProcess.spawn);
const exec = promisify(childProcess.exec)

await exec('yarn up gatsby -E');
