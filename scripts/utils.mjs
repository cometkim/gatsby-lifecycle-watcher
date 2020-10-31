import { promisify } from 'util';
import childProcess from 'child_process';

export const exec = promisify(childProcess.exec);

export async function task(name, func) {
  console.log(name);
  const scope = `${name} done`;
  console.time(scope);
  const result = await func();
  console.timeEnd(scope);
  return result;
}
